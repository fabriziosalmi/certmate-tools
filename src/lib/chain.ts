/**
 * Chain Builder & Validator.
 *
 * Accepts a paste of one or more PEM "CERTIFICATE" blocks (in any order) and
 * produces:
 *   - the unique cert list, with their subject/issuer pair and SKI/AKI
 *   - the longest valid leaf → ... → root chain we can stitch together
 *   - per-link verification (signature actually verifies, dates align)
 *   - missing-intermediate notice (AIA URL if available, otherwise just the
 *     issuer DN you should look up)
 *
 * Entirely client-side: signature verification uses Web Crypto via
 * @peculiar/x509's `cert.verify({ publicKey })`.
 */

import {
  AuthorityInfoAccessExtension,
  AuthorityKeyIdentifierExtension,
  SubjectKeyIdentifierExtension,
  X509Certificate,
} from "@peculiar/x509";
import {
  bufToHexColon,
  extractPemBlocks,
  MAX_INPUT_BYTES,
  parseDN,
  safeHttpUrl,
  sha,
} from "./util";

export interface ChainNode {
  index: number;
  subject: string;
  issuer: string;
  commonName?: string;
  issuerCommonName?: string;
  selfSigned: boolean;
  isCA: boolean;
  notBefore: string;
  notAfter: string;
  expired: boolean;
  notYetValid: boolean;
  ski?: string;
  aki?: string;
  fingerprintSha256: string;
}

export interface ChainLink {
  childIndex: number;
  parentIndex: number;
  signatureValid: boolean;
  validityOk: boolean;
  signatureError?: string;
}

export interface ChainResult {
  nodes: ChainNode[];
  ordered: number[];
  links: ChainLink[];
  missingIssuer?: {
    forIndex: number;
    issuerCN?: string;
    aiaUrl?: string;
  };
  rootSelfSigned: boolean;
  rootIndex?: number;
  allValid: boolean;
}

export type ChainOutcome =
  | { ok: true; result: ChainResult }
  | { ok: false; error: string };

function makeNode(idx: number, cert: X509Certificate, fp: string): ChainNode {
  const subDN = parseDN(cert.subject);
  const isuDN = parseDN(cert.issuer);
  const ski = cert
    .getExtension<SubjectKeyIdentifierExtension>(SubjectKeyIdentifierExtension)
    ?.keyId?.toUpperCase();
  const aki = cert
    .getExtension<AuthorityKeyIdentifierExtension>(AuthorityKeyIdentifierExtension)
    ?.keyId?.toUpperCase();
  const now = Date.now();
  return {
    index: idx,
    subject: cert.subject,
    issuer: cert.issuer,
    commonName: subDN["CN"]?.[0],
    issuerCommonName: isuDN["CN"]?.[0],
    selfSigned: cert.subject === cert.issuer,
    isCA: cert.getExtension("2.5.29.19") != null,
    notBefore: cert.notBefore.toISOString(),
    notAfter: cert.notAfter.toISOString(),
    expired: cert.notAfter.getTime() < now,
    notYetValid: cert.notBefore.getTime() > now,
    ski,
    aki,
    fingerprintSha256: fp,
  };
}

function aiaIssuersOf(cert: X509Certificate): string[] {
  const ext = cert.getExtension<AuthorityInfoAccessExtension>(
    AuthorityInfoAccessExtension
  );
  if (!ext) return [];
  return (ext.caIssuers ?? [])
    .map((g) => safeHttpUrl(g.value))
    .filter((u): u is string => Boolean(u));
}

export async function buildChain(pemInput: string): Promise<ChainOutcome> {
  try {
    const t = pemInput.trim();
    if (!t) return { ok: false, error: "Input is empty." };
    if (t.length > MAX_INPUT_BYTES)
      return { ok: false, error: "Input too large (max 2 MB)." };
    const blocks = extractPemBlocks(t, "CERTIFICATE");
    if (blocks.length === 0)
      return { ok: false, error: "No -----BEGIN CERTIFICATE----- block found." };

    const certs: X509Certificate[] = [];
    const nodes: ChainNode[] = [];
    for (const pem of blocks) {
      const c = new X509Certificate(pem);
      const fp = bufToHexColon(await sha("SHA-256", c.rawData));
      // De-duplicate by fingerprint
      if (nodes.some((n) => n.fingerprintSha256 === fp)) continue;
      nodes.push(makeNode(nodes.length, c, fp));
      certs.push(c);
    }

    // Find the leaf: a cert whose subject is NOT used as issuer by any other.
    const subjectsUsedAsIssuer = new Set(certs.map((c) => c.issuer));
    let leafIdx = certs.findIndex(
      (c) => !subjectsUsedAsIssuer.has(c.subject) && c.subject !== c.issuer
    );
    if (leafIdx === -1) {
      // Fall back: pick the cert with the soonest notAfter (likely the leaf).
      let best = 0;
      for (let i = 1; i < certs.length; i++) {
        if (certs[i]!.notAfter.getTime() < certs[best]!.notAfter.getTime()) {
          best = i;
        }
      }
      leafIdx = best;
    }

    // Walk up: at each step, find the cert whose subject == current.issuer.
    const ordered: number[] = [leafIdx];
    const used = new Set<number>([leafIdx]);
    let cursor = leafIdx;
    while (true) {
      const cur = certs[cursor]!;
      if (cur.subject === cur.issuer) break; // self-signed root
      const parentIdx = certs.findIndex(
        (c, i) => !used.has(i) && c.subject === cur.issuer
      );
      if (parentIdx === -1) break;
      ordered.push(parentIdx);
      used.add(parentIdx);
      cursor = parentIdx;
    }

    // Verify each link.
    const links: ChainLink[] = [];
    let allValid = true;
    for (let i = 0; i < ordered.length - 1; i++) {
      const childIdx = ordered[i]!;
      const parentIdx = ordered[i + 1]!;
      const child = certs[childIdx]!;
      const parent = certs[parentIdx]!;
      const childNode = nodes[childIdx]!;
      const parentNode = nodes[parentIdx]!;
      let signatureValid = false;
      let signatureError: string | undefined;
      try {
        signatureValid = await child.verify({ publicKey: parent.publicKey });
      } catch (err) {
        signatureError = err instanceof Error ? err.message : String(err);
      }
      const validityOk =
        !childNode.expired &&
        !childNode.notYetValid &&
        !parentNode.expired &&
        !parentNode.notYetValid;
      links.push({
        childIndex: childIdx,
        parentIndex: parentIdx,
        signatureValid,
        validityOk,
        signatureError,
      });
      if (!signatureValid || !validityOk) allValid = false;
    }

    // If the final cert in ordered chain is not self-signed, we are missing
    // its issuer.
    const tail = certs[ordered[ordered.length - 1]!]!;
    const rootSelfSigned = tail.subject === tail.issuer;
    let missingIssuer: ChainResult["missingIssuer"];
    if (!rootSelfSigned) {
      const aias = aiaIssuersOf(tail);
      missingIssuer = {
        forIndex: ordered[ordered.length - 1]!,
        issuerCN: parseDN(tail.issuer)["CN"]?.[0],
        aiaUrl: aias[0],
      };
      allValid = false;
    }

    return {
      ok: true,
      result: {
        nodes,
        ordered,
        links,
        missingIssuer,
        rootSelfSigned,
        rootIndex: rootSelfSigned ? ordered[ordered.length - 1] : undefined,
        allValid,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg.split("\n")[0]!.slice(0, 240) };
  }
}

/** Serialize the ordered chain back to a single PEM bundle (leaf first). */
export function chainToBundle(blocks: string[], ordered: number[]): string {
  return ordered.map((i) => blocks[i]).join("\n");
}
