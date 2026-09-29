/**
 * RSA & EC key inspector: 100% client-side via Web Crypto + @peculiar/x509.
 *
 * Accepts PKCS#8 private keys, SPKI public keys, X.509 certificates (inspects
 * the embedded public key) and bare base64/DER of either. Reports algorithm,
 * size/curve, RSA exponent and the SPKI SHA-256 thumbprint: the same value
 * the decoder and the key matcher show, so the three tools agree.
 *
 * Traditional formats Web Crypto cannot import (PKCS#1 "RSA PRIVATE KEY",
 * SEC1 "EC PRIVATE KEY", encrypted keys, OpenSSH) are rejected with the exact
 * `openssl` command that converts them, same policy as key-match.
 */

import { X509Certificate } from "@peculiar/x509";
import {
  bufToHexColon,
  extractPemBlocks,
  MAX_INPUT_BYTES,
  parseDN,
  sha,
} from "./util";

export interface InspectedKey {
  kind: "private" | "public";
  source: "PKCS#8" | "SPKI" | "certificate";
  algorithm: string;
  keySize?: number;
  namedCurve?: string;
  /** RSA public exponent as decimal (almost always 65537). */
  exponent?: string;
  spkiSha256: string;
  /** Certificate subject CN when the key was read from a certificate. */
  certCommonName?: string;
}

export type KeyInspectOutcome =
  | { ok: true; key: InspectedKey }
  | { ok: false; error: string };

type ImportCandidate = {
  algo: RsaHashedImportParams | EcKeyImportParams | AlgorithmIdentifier;
  format: "pkcs8" | "spki";
  usages: KeyUsage[];
};

const PKCS8_CANDIDATES: ImportCandidate[] = [
  { algo: { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, format: "pkcs8", usages: ["sign"] },
  { algo: { name: "RSA-PSS", hash: "SHA-256" }, format: "pkcs8", usages: ["sign"] },
  { algo: { name: "RSA-OAEP", hash: "SHA-256" }, format: "pkcs8", usages: ["decrypt"] },
  { algo: { name: "ECDSA", namedCurve: "P-256" }, format: "pkcs8", usages: ["sign"] },
  { algo: { name: "ECDSA", namedCurve: "P-384" }, format: "pkcs8", usages: ["sign"] },
  { algo: { name: "ECDSA", namedCurve: "P-521" }, format: "pkcs8", usages: ["sign"] },
  { algo: { name: "Ed25519" }, format: "pkcs8", usages: ["sign"] },
];

const SPKI_CANDIDATES: ImportCandidate[] = [
  { algo: { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, format: "spki", usages: ["verify"] },
  { algo: { name: "RSA-PSS", hash: "SHA-256" }, format: "spki", usages: ["verify"] },
  { algo: { name: "RSA-OAEP", hash: "SHA-256" }, format: "spki", usages: ["encrypt"] },
  { algo: { name: "ECDSA", namedCurve: "P-256" }, format: "spki", usages: ["verify"] },
  { algo: { name: "ECDSA", namedCurve: "P-384" }, format: "spki", usages: ["verify"] },
  { algo: { name: "ECDSA", namedCurve: "P-521" }, format: "spki", usages: ["verify"] },
  { algo: { name: "Ed25519" }, format: "spki", usages: ["verify"] },
];

const CURVE_BITS: Record<string, number> = {
  "P-256": 256,
  "P-384": 384,
  "P-521": 521,
  Ed25519: 256,
  Ed448: 456,
};

function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/\s+/g, "");
  const bin = atob(clean);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function pemBody(pem: string, label: string): Uint8Array | null {
  const blocks = extractPemBlocks(pem, label);
  if (blocks.length === 0) return null;
  const body = blocks[0]!
    .split(/\r?\n/)
    .filter((l) => !l.startsWith("-----"))
    .join("");
  try {
    return base64ToBytes(body);
  } catch {
    return null;
  }
}

async function tryImport(
  der: Uint8Array,
  candidates: ImportCandidate[]
): Promise<CryptoKey | null> {
  for (const c of candidates) {
    try {
      return await crypto.subtle.importKey(
        c.format,
        der as BufferSource,
        c.algo,
        true,
        c.usages
      );
    } catch {
      // try next algorithm
    }
  }
  return null;
}

/**
 * Derive the public SPKI from a private CryptoKey by re-importing the JWK
 * with private material stripped. Shared with key-match so the thumbprint
 * logic lives in exactly one place.
 */
export async function spkiFromPrivateKey(key: CryptoKey): Promise<ArrayBuffer> {
  const jwk = await crypto.subtle.exportKey("jwk", key);
  const pub: Record<string, unknown> = { ...jwk };
  delete pub.d;
  delete pub.p;
  delete pub.q;
  delete pub.dp;
  delete pub.dq;
  delete pub.qi;
  delete pub.oth;
  pub.key_ops = ["verify"];

  const algo: RsaHashedImportParams | EcKeyImportParams | AlgorithmIdentifier =
    key.algorithm.name === "RSASSA-PKCS1-v1_5" ||
    key.algorithm.name === "RSA-PSS" ||
    key.algorithm.name === "RSA-OAEP"
      ? {
          name: key.algorithm.name,
          hash:
            (key.algorithm as RsaHashedKeyAlgorithm).hash?.name ?? "SHA-256",
        }
      : key.algorithm.name === "ECDSA"
        ? {
            name: "ECDSA",
            namedCurve: (key.algorithm as EcKeyAlgorithm).namedCurve,
          }
        : { name: key.algorithm.name };

  const verifyUsage: KeyUsage[] =
    key.algorithm.name === "RSA-OAEP" ? ["encrypt"] : ["verify"];
  const pubKey = await crypto.subtle.importKey(
    "jwk",
    pub as JsonWebKey,
    algo,
    true,
    verifyUsage
  );
  return crypto.subtle.exportKey("spki", pubKey);
}

function base64UrlToBigInt(b64u: string): bigint {
  const b64 = b64u.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  let hex = "";
  for (let i = 0; i < bin.length; i++) {
    hex += bin.charCodeAt(i).toString(16).padStart(2, "0");
  }
  return BigInt("0x" + hex);
}

async function describe(
  key: CryptoKey,
  kind: "private" | "public",
  source: InspectedKey["source"],
  certCommonName?: string
): Promise<InspectedKey> {
  const alg = key.algorithm as {
    name: string;
    modulusLength?: number;
    namedCurve?: string;
  };
  const jwk = await crypto.subtle.exportKey("jwk", key);
  const spki =
    kind === "private"
      ? await spkiFromPrivateKey(key)
      : await crypto.subtle.exportKey("spki", key);

  let keySize = alg.modulusLength;
  let namedCurve = alg.namedCurve ?? (jwk.crv as string | undefined);
  if (!keySize && namedCurve && CURVE_BITS[namedCurve]) {
    keySize = CURVE_BITS[namedCurve];
  }
  // RSA modulus bit length from JWK when the provider omits it.
  if (!keySize && jwk.n) {
    try {
      keySize = base64UrlToBigInt(jwk.n).toString(2).length;
    } catch {
      // leave undefined
    }
  }

  let exponent: string | undefined;
  if (jwk.e) {
    try {
      exponent = base64UrlToBigInt(jwk.e).toString(10);
    } catch {
      // leave undefined
    }
  }

  return {
    kind,
    source,
    algorithm: namedCurve && alg.name === "ECDSA" ? "EC" : alg.name,
    keySize,
    namedCurve: alg.name === "ECDSA" || jwk.crv ? (namedCurve as string) : undefined,
    exponent,
    spkiSha256: bufToHexColon(await sha("SHA-256", spki)),
    certCommonName,
  };
}

function traditionalFormatError(input: string): string | null {
  if (input.includes("-----BEGIN ENCRYPTED PRIVATE KEY-----")) {
    return "Encrypted private key: decrypt first: openssl pkcs8 -in key.pem -out key.pkcs8.pem";
  }
  if (input.includes("-----BEGIN RSA PRIVATE KEY-----")) {
    return "PKCS#1 (RSA PRIVATE KEY) is not importable by Web Crypto. Convert: openssl pkcs8 -topk8 -nocrypt -in key.pem -out key.pkcs8.pem";
  }
  if (input.includes("-----BEGIN EC PRIVATE KEY-----")) {
    return "SEC1 (EC PRIVATE KEY) is not importable by Web Crypto. Convert: openssl pkcs8 -topk8 -nocrypt -in key.pem -out key.pkcs8.pem";
  }
  if (input.includes("-----BEGIN DSA PRIVATE KEY-----")) {
    return "DSA keys are not supported by Web Crypto. Generate RSA or ECDSA instead.";
  }
  if (input.includes("-----BEGIN OPENSSH PRIVATE KEY-----")) {
    return "OpenSSH keys are not supported. Convert: ssh-keygen -p -m PEM -f key && openssl pkcs8 -topk8 -nocrypt -in key -out key.pkcs8.pem";
  }
  if (input.includes("-----BEGIN") && input.includes("EC PARAMETERS")) {
    return "Bare EC parameters carry no key material. Paste the PRIVATE KEY or PUBLIC KEY block.";
  }
  return null;
}

export async function inspectKey(
  input: string | ArrayBuffer
): Promise<KeyInspectOutcome> {
  try {
    let text: string | null = null;
    let rawDer: Uint8Array | null = null;

    if (input instanceof ArrayBuffer) {
      if (input.byteLength === 0) return { ok: false, error: "Input is empty." };
      if (input.byteLength > MAX_INPUT_BYTES) {
        return { ok: false, error: "Input is too large (max 2 MB)." };
      }
      const head = new TextDecoder().decode(input.slice(0, 64));
      if (head.includes("-----BEGIN")) {
        text = new TextDecoder().decode(input);
      } else {
        rawDer = new Uint8Array(input);
      }
    } else {
      const trimmed = input.trim();
      if (!trimmed) return { ok: false, error: "Input is empty." };
      if (trimmed.length > MAX_INPUT_BYTES) {
        return { ok: false, error: "Input is too large (max 2 MB)." };
      }
      text = trimmed;
    }

    if (text !== null) {
      const traditional = traditionalFormatError(text);
      if (traditional) return { ok: false, error: traditional };

      if (text.includes("-----BEGIN CERTIFICATE-----")) {
        const blocks = extractPemBlocks(text, "CERTIFICATE");
        const cert = new X509Certificate(blocks[0]!);
        const spki = new Uint8Array(cert.publicKey.rawData);
        const key = await tryImport(spki, SPKI_CANDIDATES);
        if (!key) return { ok: false, error: "Could not parse the certificate's public key." };
        const dn = parseDN(cert.subject);
        return {
          ok: true,
          key: await describe(key, "public", "certificate", dn["CN"]?.[0]),
        };
      }

      if (text.includes("-----BEGIN PRIVATE KEY-----")) {
        const der = pemBody(text, "PRIVATE KEY");
        if (!der) return { ok: false, error: "PRIVATE KEY block is not valid base64." };
        const key = await tryImport(der, PKCS8_CANDIDATES);
        if (!key) {
          return {
            ok: false,
            error: "Could not import private key. Supported: RSA, ECDSA (P-256/384/521), Ed25519 in PKCS#8.",
          };
        }
        return { ok: true, key: await describe(key, "private", "PKCS#8") };
      }

      if (text.includes("-----BEGIN PUBLIC KEY-----")) {
        const der = pemBody(text, "PUBLIC KEY");
        if (!der) return { ok: false, error: "PUBLIC KEY block is not valid base64." };
        const key = await tryImport(der, SPKI_CANDIDATES);
        if (!key) {
          return {
            ok: false,
            error: "Could not import public key. Supported: RSA, ECDSA (P-256/384/521), Ed25519 in SPKI.",
          };
        }
        return { ok: true, key: await describe(key, "public", "SPKI") };
      }

      // Bare base64 → raw DER, SPKI first then PKCS#8.
      if (/^[A-Za-z0-9+/=\s]+$/.test(text)) {
        try {
          rawDer = base64ToBytes(text);
        } catch {
          return { ok: false, error: "Input is not valid base64." };
        }
      } else {
        return {
          ok: false,
          error: "Unrecognized input. Paste PKCS#8 (PRIVATE KEY), SPKI (PUBLIC KEY) or a CERTIFICATE PEM block.",
        };
      }
    }

    const spkiKey = await tryImport(rawDer!, SPKI_CANDIDATES);
    if (spkiKey) {
      return { ok: true, key: await describe(spkiKey, "public", "SPKI") };
    }
    const pkcs8Key = await tryImport(rawDer!, PKCS8_CANDIDATES);
    if (pkcs8Key) {
      return { ok: true, key: await describe(pkcs8Key, "private", "PKCS#8") };
    }
    return {
      ok: false,
      error: "DER input matches no supported key type (RSA / ECDSA P-256/384/521 / Ed25519).",
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg.split("\n")[0]!.slice(0, 240) };
  }
}
