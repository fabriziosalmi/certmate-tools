/**
 * Compute the ACME (RFC 8555) DNS-01 challenge response.
 *
 *   key authorization = token + "." + base64url(JWK thumbprint(account key))
 *   TXT record value  = base64url(SHA-256(key authorization))
 *
 * The JWK thumbprint follows RFC 7638: a canonical JSON representation of
 * the public key's required members, hashed with SHA-256. We compute it
 * entirely client-side — the account key never leaves the browser.
 */

import { bufToBase64Url, sha } from "./util";

export interface AcmeDns01Result {
  thumbprintB64Url: string;
  keyAuthorization: string;
  txtValue: string;
  recordName: string; // _acme-challenge.<domain>
}

export type AcmeDns01Outcome =
  | { ok: true; result: AcmeDns01Result }
  | { ok: false; error: string };

interface MinJwk {
  kty: string;
  // RSA
  n?: string;
  e?: string;
  // EC
  crv?: string;
  x?: string;
  y?: string;
  // OKP (Ed25519/Ed448)
  [k: string]: unknown;
}

/**
 * Canonical JSON per RFC 7638: minimum required JWK members, no whitespace,
 * keys lex-sorted, UTF-8 encoded.
 */
function canonicalJwk(jwk: MinJwk): string {
  if (!jwk.kty) throw new Error("JWK is missing the 'kty' member.");
  const requiredByKty: Record<string, string[]> = {
    RSA: ["e", "kty", "n"],
    EC: ["crv", "kty", "x", "y"],
    OKP: ["crv", "kty", "x"],
  };
  const keys = requiredByKty[jwk.kty];
  if (!keys) throw new Error(`Unsupported JWK 'kty': ${jwk.kty}`);
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    const v = (jwk as Record<string, unknown>)[k];
    if (v === undefined || v === null || v === "") {
      throw new Error(`JWK is missing required member "${k}" for kty=${jwk.kty}.`);
    }
    out[k] = v;
  }
  return JSON.stringify(out);
}

export async function jwkThumbprint(jwk: MinJwk): Promise<string> {
  const canon = canonicalJwk(jwk);
  const digest = await sha("SHA-256", new TextEncoder().encode(canon));
  return bufToBase64Url(digest);
}

export interface AcmeDns01Input {
  /** Account key as a JSON Web Key. */
  jwk: MinJwk | string;
  /** ACME challenge token. */
  token: string;
  /** Domain being validated (for record-name display). */
  domain?: string;
}

const TOKEN_RE = /^[A-Za-z0-9_-]{16,200}$/;

export async function computeDns01(input: AcmeDns01Input): Promise<AcmeDns01Outcome> {
  try {
    const jwk =
      typeof input.jwk === "string" ? (JSON.parse(input.jwk) as MinJwk) : input.jwk;
    const token = input.token.trim();
    if (!token) throw new Error("Challenge token is empty.");
    if (!TOKEN_RE.test(token)) {
      throw new Error(
        "Challenge token must be 16–200 base64url characters (A–Z, a–z, 0–9, -, _)."
      );
    }
    const thumb = await jwkThumbprint(jwk);
    const keyAuth = `${token}.${thumb}`;
    const digest = await sha("SHA-256", new TextEncoder().encode(keyAuth));
    const txt = bufToBase64Url(digest);

    const domain = (input.domain ?? "").trim().toLowerCase().replace(/\.$/, "");
    const recordName = domain
      ? `_acme-challenge.${domain}`
      : "_acme-challenge.<your-domain>";

    return {
      ok: true,
      result: {
        thumbprintB64Url: thumb,
        keyAuthorization: keyAuth,
        txtValue: txt,
        recordName,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg.split("\n")[0]!.slice(0, 240) };
  }
}

/**
 * Generate a fresh RSA-2048 account key in the browser (no transport).
 * Useful for users who want to *try* the helper without copying their real
 * production account key.
 */
export async function generateSampleAccountKey(): Promise<{
  jwk: JsonWebKey;
  pkcs8Pem: string;
}> {
  const key = await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    } as RsaHashedKeyGenParams,
    true,
    ["sign", "verify"]
  );
  const pair = key as CryptoKeyPair;
  const jwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
  const pkcs8 = await crypto.subtle.exportKey("pkcs8", pair.privateKey);
  const b64 = btoa(
    String.fromCharCode(...new Uint8Array(pkcs8))
  ).match(/.{1,64}/g);
  const pkcs8Pem = `-----BEGIN PRIVATE KEY-----\n${b64?.join("\n") ?? ""}\n-----END PRIVATE KEY-----`;
  return { jwk, pkcs8Pem };
}
