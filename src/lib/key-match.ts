/**
 * Match a private key against a certificate, fully client-side, using Web
 * Crypto and @peculiar/x509. We compare SubjectPublicKeyInfo SHA-256
 * thumbprints — both the cert's SPKI and the SPKI derived from the private
 * key. If the bytes match, the key produced the public key in the cert.
 *
 * Supports: RSA (PKCS#8 and traditional RSA private key PEM via wrapping),
 * ECDSA P-256 / P-384 / P-521 (PKCS#8), Ed25519 (PKCS#8).
 */

import { X509Certificate } from "@peculiar/x509";
import {
  bufToBase64,
  bufToHexColon,
  extractPemBlocks,
  MAX_INPUT_BYTES,
  parseDN,
  sha,
  wrapAsPem,
} from "./util";

export interface KeyMatchResult {
  match: boolean;
  certSubject: string;
  certCommonName?: string;
  certSpkiSha256: string;
  keyAlgorithm: string;
  keyKeySize?: number;
  keyNamedCurve?: string;
  derivedSpkiSha256: string;
  reason: string;
}

export type KeyMatchOutcome =
  | { ok: true; result: KeyMatchResult }
  | { ok: false; error: string };

function decodeBase64(b64: string): ArrayBuffer {
  const clean = b64.replace(/\s+/g, "");
  const bin = atob(clean);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}

function pemBody(pem: string, label: string): string | null {
  const blocks = extractPemBlocks(pem, label);
  if (blocks.length === 0) return null;
  return blocks[0]!
    .replace(`-----BEGIN ${label}-----`, "")
    .replace(`-----END ${label}-----`, "")
    .trim();
}

function loadCertificate(pemInput: string): X509Certificate {
  const t = pemInput.trim();
  if (!t) throw new Error("Certificate is empty.");
  if (t.length > MAX_INPUT_BYTES) throw new Error("Certificate too large.");
  let pem = t;
  if (!t.includes("-----BEGIN CERTIFICATE-----")) {
    if (/^[A-Za-z0-9+/=\s]+$/.test(t)) {
      pem = wrapAsPem("CERTIFICATE", t);
    } else {
      throw new Error("Certificate input is not PEM.");
    }
  }
  const blocks = extractPemBlocks(pem, "CERTIFICATE");
  if (!blocks.length) throw new Error("No certificate block found.");
  return new X509Certificate(blocks[0]!);
}

async function importPrivateKey(pemInput: string): Promise<{
  cryptoKey: CryptoKey;
  algorithm: { name: string; modulusLength?: number; namedCurve?: string };
}> {
  const t = pemInput.trim();
  if (!t) throw new Error("Private key is empty.");
  if (t.length > MAX_INPUT_BYTES) throw new Error("Private key too large.");

  // We accept PKCS#8 ("PRIVATE KEY") and traditional RSA ("RSA PRIVATE KEY").
  // EC PRIVATE KEY (SEC1) and ENCRYPTED PRIVATE KEY are not supported via
  // WebCrypto natively; we reject with a hint.
  if (t.includes("-----BEGIN ENCRYPTED PRIVATE KEY-----")) {
    throw new Error(
      "Encrypted private key — decrypt it first (openssl pkey -in ... -out unencrypted.pem)."
    );
  }
  if (t.includes("-----BEGIN EC PRIVATE KEY-----")) {
    throw new Error(
      "EC PRIVATE KEY (SEC1) is not supported by Web Crypto. Convert with: openssl pkcs8 -topk8 -nocrypt -in key.pem -out key.pkcs8.pem"
    );
  }
  if (t.includes("-----BEGIN RSA PRIVATE KEY-----")) {
    throw new Error(
      "RSA PRIVATE KEY (PKCS#1) is not supported by Web Crypto. Convert with: openssl pkcs8 -topk8 -nocrypt -in key.pem -out key.pkcs8.pem"
    );
  }

  const body = pemBody(t, "PRIVATE KEY");
  if (!body) {
    throw new Error(
      "Private key must be PEM with -----BEGIN PRIVATE KEY----- (PKCS#8)."
    );
  }
  const der = decodeBase64(body);

  const candidates: Array<{
    algo: RsaHashedImportParams | EcKeyImportParams | AlgorithmIdentifier;
    usages: KeyUsage[];
  }> = [
    {
      algo: { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      usages: ["sign"],
    },
    {
      algo: { name: "RSA-PSS", hash: "SHA-256" },
      usages: ["sign"],
    },
    { algo: { name: "ECDSA", namedCurve: "P-256" }, usages: ["sign"] },
    { algo: { name: "ECDSA", namedCurve: "P-384" }, usages: ["sign"] },
    { algo: { name: "ECDSA", namedCurve: "P-521" }, usages: ["sign"] },
    { algo: { name: "Ed25519" }, usages: ["sign"] },
  ];

  for (const c of candidates) {
    try {
      const k = await crypto.subtle.importKey(
        "pkcs8",
        der,
        c.algo,
        true,
        c.usages
      );
      const alg = k.algorithm as {
        name: string;
        modulusLength?: number;
        namedCurve?: string;
      };
      return { cryptoKey: k, algorithm: alg };
    } catch {
      // try next
    }
  }
  throw new Error(
    "Could not import private key. Make sure it's PKCS#8 PEM and the algorithm is one of RSA, ECDSA (P-256/384/521) or Ed25519."
  );
}

async function derivedSpki(cryptoKey: CryptoKey): Promise<ArrayBuffer> {
  // Web Crypto only exports the *public* SPKI from a public key, not a
  // private one. We derive the public key by re-importing a JWK exported
  // from the private key with the "d" field removed (RSA / EC) or using
  // crypto.subtle.exportKey("jwk") + re-import as public.
  const jwk = await crypto.subtle.exportKey("jwk", cryptoKey);

  // Strip private parts to derive the public JWK.
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
    cryptoKey.algorithm.name === "RSASSA-PKCS1-v1_5" ||
    cryptoKey.algorithm.name === "RSA-PSS"
      ? {
          name: cryptoKey.algorithm.name,
          hash:
            (cryptoKey.algorithm as RsaHashedKeyAlgorithm).hash?.name ??
            "SHA-256",
        }
      : cryptoKey.algorithm.name === "ECDSA"
        ? {
            name: "ECDSA",
            namedCurve: (cryptoKey.algorithm as EcKeyAlgorithm).namedCurve,
          }
        : { name: cryptoKey.algorithm.name };

  const pubKey = await crypto.subtle.importKey(
    "jwk",
    pub as JsonWebKey,
    algo,
    true,
    ["verify"]
  );
  return crypto.subtle.exportKey("spki", pubKey);
}

export async function matchKeyAndCert(
  certPem: string,
  keyPem: string
): Promise<KeyMatchOutcome> {
  try {
    const cert = loadCertificate(certPem);
    const { cryptoKey, algorithm } = await importPrivateKey(keyPem);

    const certSpki = cert.publicKey.rawData;
    const derived = await derivedSpki(cryptoKey);

    const [certHash, derHash] = await Promise.all([
      sha("SHA-256", certSpki),
      sha("SHA-256", derived),
    ]);

    const certHashHex = bufToHexColon(certHash);
    const derHashHex = bufToHexColon(derHash);
    const certBase64 = bufToBase64(certSpki);
    const derBase64 = bufToBase64(derived);
    // Compare both hash and bytes to avoid hash-collision edge case (effectively zero).
    const match = certHashHex === derHashHex && certBase64 === derBase64;

    const dn = parseDN(cert.subject);
    return {
      ok: true,
      result: {
        match,
        certSubject: cert.subject,
        certCommonName: dn["CN"]?.[0],
        certSpkiSha256: certHashHex,
        keyAlgorithm: algorithm.name,
        keyKeySize: algorithm.modulusLength,
        keyNamedCurve: algorithm.namedCurve,
        derivedSpkiSha256: derHashHex,
        reason: match
          ? "SPKI SHA-256 of the certificate equals the SPKI SHA-256 derived from the private key."
          : "SPKI SHA-256 of the certificate does NOT equal the one derived from the private key.",
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg.split("\n")[0]!.slice(0, 240) };
  }
}
