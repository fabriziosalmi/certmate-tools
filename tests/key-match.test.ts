/**
 * Key ↔ certificate matching.
 *
 * Part of #66. The verdict here is binary and consequential — "this key does
 * not belong to this certificate" is what stops someone deploying a mismatched
 * pair — and it had no tests.
 *
 * Also pins the PKCS#1 behaviour (#67): the module docstring claimed support
 * for "traditional RSA private key PEM via wrapping" while the code throws on
 * it. `openssl genrsa` still emits PKCS#1 by default, so a user following the
 * docstring hits a hard rejection; the message must at least tell them how to
 * convert.
 */

import { webcrypto } from "node:crypto";
import { describe, expect, it } from "vitest";

import { matchKeyAndCert } from "~/lib/key-match";
import { makeCert } from "./helpers/certs";

async function pkcs8Pem(key: CryptoKey): Promise<string> {
  const der = await webcrypto.subtle.exportKey("pkcs8", key);
  const b64 = Buffer.from(new Uint8Array(der)).toString("base64");
  const lines = b64.match(/.{1,64}/g) ?? [];
  return `-----BEGIN PRIVATE KEY-----\n${lines.join("\n")}\n-----END PRIVATE KEY-----\n`;
}

describe("matchKeyAndCert", () => {
  it("confirms a key that belongs to the certificate", async () => {
    const { cert, keys, pem } = await makeCert({ cn: "match.example.com" });
    const keyPem = await pkcs8Pem(keys.privateKey);

    const out = await matchKeyAndCert(pem, keyPem);

    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.result.match).toBe(true);
    expect(cert.subject).toContain("match.example.com");
  });

  it("rejects a key from a different certificate", async () => {
    const a = await makeCert({ cn: "a.example.com" });
    const b = await makeCert({ cn: "b.example.com" });
    const keyPem = await pkcs8Pem(b.keys.privateKey);

    const out = await matchKeyAndCert(a.pem, keyPem);

    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.result.match).toBe(false);
  });

  it("compares SPKI thumbprints, and reports both", async () => {
    const { keys, pem } = await makeCert({ cn: "spki.example.com" });
    const keyPem = await pkcs8Pem(keys.privateKey);

    const out = await matchKeyAndCert(pem, keyPem);

    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.result.certSpkiSha256).toBe(out.result.derivedSpkiSha256);
    expect(out.result.certSpkiSha256).toMatch(/^[0-9A-F]{2}(:[0-9A-F]{2})+$/i);
  });

  it("tells a PKCS#1 user how to convert instead of failing opaquely (#67)", async () => {
    const { pem } = await makeCert({ cn: "pkcs1.example.com" });
    const pkcs1 =
      "-----BEGIN RSA PRIVATE KEY-----\nMIIBOgIBAAJBAK...\n-----END RSA PRIVATE KEY-----";

    const out = await matchKeyAndCert(pem, pkcs1);

    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.error).toMatch(/pkcs8/i);
  });

  it("reports an unusable certificate rather than throwing", async () => {
    const { keys } = await makeCert({ cn: "x.example.com" });
    const keyPem = await pkcs8Pem(keys.privateKey);

    const out = await matchKeyAndCert("not a certificate", keyPem);

    expect(out.ok).toBe(false);
  });

  it("reports an unusable key rather than throwing", async () => {
    const { pem } = await makeCert({ cn: "x.example.com" });

    const out = await matchKeyAndCert(pem, "not a key");

    expect(out.ok).toBe(false);
  });
});
