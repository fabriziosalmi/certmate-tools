/**
 * ACME DNS-01 key authorization and TXT value.
 *
 * Part of #66. This helper had no tests, and it is the one where a wrong byte
 * is not a cosmetic problem: the operator publishes the TXT record, the CA
 * fetches it, validation fails, and nothing in the output says which side is
 * wrong. The RFC 7638 thumbprint vector is committed here precisely so a
 * refactor of the canonicalisation cannot pass silently.
 *
 * Vectors: RFC 7638 §3.1 (the JWK thumbprint example) and RFC 8555 §8.4
 * (key authorization = token "." thumbprint, TXT = base64url(SHA-256(keyAuth))).
 */

import { describe, expect, it } from "vitest";

import { computeDns01, jwkThumbprint } from "~/lib/acme-dns01";

// RFC 7638 §3.1 — the canonical example key and its documented thumbprint.
const RFC7638_JWK = {
  kty: "RSA",
  n:
    "0vx7agoebGcQSuuPiLJXZptN9nndrQmbXEps2aiAFbWhM78LhWx4cbbfAAtVT86zwu1RK7aPFFxuhDR1L6tSoc_BJECPebWKRXjBZCiFV4n3oknjhMs" +
    "tn64tZ_2W-5JsGY4Hc5n9yBXArwl93lqt7_RN5w6Cf0h4QyQ5v-65YGjQR0_FDW2QvzqY368QQMicAtaSqzs8KJZgnYb9c7d0zgdAZHzu6qMQvRL5hajr" +
    "n1n91CbOpbISD08qNLyrdkt-bFTWhAI4vMQFh6WeZu0fM4lFd2NcRwr3XPksINHaQ-G_xBniIqbw0Ls1jF44-csFCur-kEgU8awapJzKnqDKgw",
  e: "AQAB",
};
const RFC7638_THUMBPRINT = "NzbLsXh8uDCcd-6MNwXF4W_7noWXFZAfHkxZsRGC9Xs";

describe("jwkThumbprint", () => {
  it("matches the RFC 7638 test vector", async () => {
    expect(await jwkThumbprint(RFC7638_JWK)).toBe(RFC7638_THUMBPRINT);
  });

  it("ignores member order — canonicalisation is by name, not by input", async () => {
    const reordered = { e: RFC7638_JWK.e, n: RFC7638_JWK.n, kty: RFC7638_JWK.kty };
    expect(await jwkThumbprint(reordered)).toBe(RFC7638_THUMBPRINT);
  });

  it("ignores members outside the required set", async () => {
    const noisy = { ...RFC7638_JWK, alg: "RS256", kid: "2011-04-29", use: "sig" };
    expect(await jwkThumbprint(noisy)).toBe(RFC7638_THUMBPRINT);
  });

  it("rejects a JWK missing a required member", async () => {
    await expect(jwkThumbprint({ kty: "RSA", e: "AQAB" } as never)).rejects.toThrow(
      /missing required member/i,
    );
  });
});

describe("computeDns01", () => {
  const token = "evaGxfADs6pSRb2LAv9IZf17Dt3juxGJ-PCt92wr-oA";

  it("builds the key authorization and TXT value per RFC 8555", async () => {
    const out = await computeDns01({ jwk: RFC7638_JWK, token, domain: "example.com" });

    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.result.thumbprintB64Url).toBe(RFC7638_THUMBPRINT);
    expect(out.result.keyAuthorization).toBe(`${token}.${RFC7638_THUMBPRINT}`);
    // base64url of a SHA-256 digest: 43 characters, no padding, no +/.
    expect(out.result.txtValue).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(out.result.recordName).toBe("_acme-challenge.example.com");
  });

  it("accepts the JWK as a JSON string, as the textarea supplies it", async () => {
    const out = await computeDns01({ jwk: JSON.stringify(RFC7638_JWK), token });

    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.result.thumbprintB64Url).toBe(RFC7638_THUMBPRINT);
  });

  it("normalises the domain and strips a trailing dot", async () => {
    const out = await computeDns01({ jwk: RFC7638_JWK, token, domain: "EXAMPLE.com." });

    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.result.recordName).toBe("_acme-challenge.example.com");
  });

  it("falls back to a placeholder record name without a domain", async () => {
    const out = await computeDns01({ jwk: RFC7638_JWK, token });

    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.result.recordName).toContain("_acme-challenge.");
  });

  it("reports a malformed token instead of computing a wrong record", async () => {
    const out = await computeDns01({ jwk: RFC7638_JWK, token: "short" });

    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.error).toMatch(/token/i);
  });

  it("reports an empty token", async () => {
    const out = await computeDns01({ jwk: RFC7638_JWK, token: "   " });
    expect(out.ok).toBe(false);
  });

  it("reports unparseable JWK JSON", async () => {
    const out = await computeDns01({ jwk: "{not json", token });
    expect(out.ok).toBe(false);
  });

  it("produces a different TXT value for a different token", async () => {
    const a = await computeDns01({ jwk: RFC7638_JWK, token });
    const b = await computeDns01({
      jwk: RFC7638_JWK,
      token: "Zm9vYmFyYmF6cXV4MTIzNDU2Nzg5MEFCQ0RFRg",
    });

    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(a.result.txtValue).not.toBe(b.result.txtValue);
  });
});
