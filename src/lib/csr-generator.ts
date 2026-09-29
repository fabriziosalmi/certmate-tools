/**
 * CSR generator — 100% client-side.
 *
 * Generates the keypair with Web Crypto and builds the PKCS#10 request with
 * @peculiar/x509's `Pkcs10CertificateRequestGenerator` — the same library the
 * CSR decoder uses, so a generated request is guaranteed to parse (dogfooded
 * in tests via `decodeCSRInput` + `signatureValid`).
 *
 * The private key is exported as PKCS#8 PEM for the user to save. It is shown
 * once and never transmitted — there is nowhere to transmit it to
 * (`connect-src 'none'`).
 */

import {
  Pkcs10CertificateRequestGenerator,
  SubjectAlternativeNameExtension,
} from "@peculiar/x509";
import { bufToBase64, bufToHexColon, sha, wrapAsPem } from "./util";

export interface CsrSubject {
  CN: string;
  O?: string;
  OU?: string;
  L?: string;
  ST?: string;
  C?: string;
  emailAddress?: string;
}

export interface CsrGenOptions {
  keyType: "rsa" | "ecdsa";
  rsaBits?: 2048 | 3072 | 4096;
  curve?: "P-256" | "P-384" | "P-521";
  subject: CsrSubject;
  sanDns?: string[];
  sanIp?: string[];
}

export interface GeneratedCsr {
  csrPem: string;
  privateKeyPem: string;
  publicKeyPem: string;
  algorithm: string;
  keySize?: number;
  namedCurve?: string;
  spkiSha256: string;
}

export type CsrGenOutcome =
  | { ok: true; csr: GeneratedCsr }
  | { ok: false; error: string };

// Mirrors the hostname rule in inventory.ts: DNS labels, optional leading *.
const HOST_RE =
  /^(?=.{1,253}$)(\*\.)?([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/i;
const IPV4_RE = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
// Hextets with a single :: compression.
const IPV6_RE =
  /^(([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}|:((:[0-9a-fA-F]{0,4}){1,7}|:)|([0-9a-fA-F]{0,4}:){7}[0-9a-fA-F]{0,4})$/;

function splitList(raw: string | string[] | undefined): string[] {
  if (!raw) return [];
  const arr = Array.isArray(raw) ? raw : raw.split(/[\s,;]+/);
  return arr.map((s) => s.trim()).filter((s) => s.length > 0);
}

/** Escape DN metacharacters so `CN=a,b` stays one RDN value. */
function escapeDnValue(v: string): string {
  return v.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/=/g, "\\=");
}

function checkSubject(s: CsrSubject): string | null {
  const cn = s.CN.trim();
  if (!cn) return "Common Name (CN) is required.";
  if (cn.length > 64) return "Common Name must be ≤ 64 characters.";
  if (s.C !== undefined && s.C.trim() !== "" && !/^[A-Za-z]{2}$/.test(s.C.trim())) {
    return "Country (C) must be exactly 2 letters (e.g. IT).";
  }
  if (
    s.emailAddress !== undefined &&
    s.emailAddress.trim() !== "" &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.emailAddress.trim())
  ) {
    return "emailAddress does not look like an email address.";
  }
  return null;
}

function buildDn(s: CsrSubject): string {
  const parts: Array<[string, string | undefined]> = [
    ["C", s.C?.trim() || undefined],
    ["ST", s.ST?.trim() || undefined],
    ["L", s.L?.trim() || undefined],
    ["O", s.O?.trim() || undefined],
    ["OU", s.OU?.trim() || undefined],
    ["CN", s.CN.trim()],
    ["emailAddress", s.emailAddress?.trim() || undefined],
  ];
  return parts
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${k}=${escapeDnValue(v!)}`)
    .join(",");
}

export async function generateCsr(
  opts: CsrGenOptions
): Promise<CsrGenOutcome> {
  try {
    const subjectErr = checkSubject(opts.subject);
    if (subjectErr) return { ok: false, error: subjectErr };

    const dns = [...new Set(splitList(opts.sanDns))];
    const ips = [...new Set(splitList(opts.sanIp))];
    for (const h of dns) {
      if (!HOST_RE.test(h)) {
        return { ok: false, error: `Invalid DNS SAN "${h.slice(0, 64)}".` };
      }
    }
    for (const ip of ips) {
      const v4 = IPV4_RE.exec(ip);
      const v6 = ip.includes(":") && IPV6_RE.test(ip);
      const v4ok = v4 !== null && v4.slice(1).every((n) => Number(n) <= 255);
      if (!v4ok && !v6) {
        return { ok: false, error: `Invalid IP SAN "${ip.slice(0, 64)}".` };
      }
    }

    const keys =
      opts.keyType === "rsa"
        ? ((await crypto.subtle.generateKey(
            {
              name: "RSASSA-PKCS1-v1_5",
              modulusLength: opts.rsaBits ?? 2048,
              publicExponent: new Uint8Array([1, 0, 1]),
              hash: "SHA-256",
            },
            true,
            ["sign", "verify"]
          )) as CryptoKeyPair)
        : ((await crypto.subtle.generateKey(
            { name: "ECDSA", namedCurve: opts.curve ?? "P-256" },
            true,
            ["sign", "verify"]
          )) as CryptoKeyPair);

    const extensions =
      dns.length || ips.length
        ? [
            new SubjectAlternativeNameExtension([
              ...dns.map((value) => ({ type: "dns" as const, value })),
              ...ips.map((value) => ({ type: "ip" as const, value })),
            ]),
          ]
        : [];

    const csr = await Pkcs10CertificateRequestGenerator.create(
      {
        name: buildDn(opts.subject),
        extensions,
        signingAlgorithm:
          opts.keyType === "rsa"
            ? { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }
            : { name: "ECDSA", hash: "SHA-256" },
        keys,
      },
      crypto as unknown as Crypto
    );

    const [pkcs8, spki] = await Promise.all([
      crypto.subtle.exportKey("pkcs8", keys.privateKey),
      crypto.subtle.exportKey("spki", keys.publicKey),
    ]);

    const alg = keys.publicKey.algorithm as {
      name: string;
      modulusLength?: number;
      namedCurve?: string;
    };
    const spkiHash = await sha("SHA-256", spki);

    return {
      ok: true,
      csr: {
        csrPem: csr.toString("pem"),
        privateKeyPem: wrapAsPem("PRIVATE KEY", bufToBase64(pkcs8)),
        publicKeyPem: wrapAsPem("PUBLIC KEY", bufToBase64(spki)),
        algorithm: opts.keyType === "rsa" ? "RSA" : "EC",
        keySize: alg.modulusLength,
        namedCurve: alg.namedCurve,
        spkiSha256: bufToHexColon(spkiHash),
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg.split("\n")[0]!.slice(0, 240) };
  }
}
