import { webcrypto } from "node:crypto";
import { describe, expect, it } from "vitest";

import { inspectKey } from "~/lib/key-inspector";
import { makeCert } from "./helpers/certs";

function toPem(label: string, buf: ArrayBuffer): string {
  const b64 = Buffer.from(new Uint8Array(buf)).toString("base64");
  const lines = b64.match(/.{1,64}/g) ?? [];
  return `-----BEGIN ${label}-----\n${lines.join("\n")}\n-----END ${label}-----\n`;
}

describe("inspectKey: RSA", () => {
  it("describes a PKCS#8 private key and its SPKI public key consistently", async () => {
    const keys = (await webcrypto.subtle.generateKey(
      {
        name: "RSASSA-PKCS1-v1_5",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["sign", "verify"]
    )) as CryptoKeyPair;

    const privPem = toPem("PRIVATE KEY", await webcrypto.subtle.exportKey("pkcs8", keys.privateKey));
    const pubPem = toPem("PUBLIC KEY", await webcrypto.subtle.exportKey("spki", keys.publicKey));

    const priv = await inspectKey(privPem);
    const pub = await inspectKey(pubPem);

    expect(priv.ok).toBe(true);
    expect(pub.ok).toBe(true);
    if (!priv.ok || !pub.ok) return;

    expect(priv.key.kind).toBe("private");
    expect(priv.key.source).toBe("PKCS#8");
    expect(priv.key.algorithm).toBe("RSASSA-PKCS1-v1_5");
    expect(priv.key.keySize).toBe(2048);
    expect(priv.key.exponent).toBe("65537");

    expect(pub.key.kind).toBe("public");
    expect(pub.key.source).toBe("SPKI");
    // Same key → same thumbprint from both sides.
    expect(pub.key.spkiSha256).toBe(priv.key.spkiSha256);
  });
});

describe("inspectKey: EC", () => {
  it("reports curve and bit size for a P-256 private key", async () => {
    const keys = (await webcrypto.subtle.generateKey(
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["sign", "verify"]
    )) as CryptoKeyPair;
    const privPem = toPem("PRIVATE KEY", await webcrypto.subtle.exportKey("pkcs8", keys.privateKey));

    const out = await inspectKey(privPem);

    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.key.kind).toBe("private");
    expect(out.key.namedCurve).toBe("P-256");
    expect(out.key.keySize).toBe(256);
    expect(out.key.exponent).toBeUndefined();
  });
});

describe("inspectKey: certificates and rejections", () => {
  it("inspects the public key embedded in a certificate", async () => {
    const { pem } = await makeCert({ cn: "key.example.com" });
    const out = await inspectKey(pem);

    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.key.kind).toBe("public");
    expect(out.key.source).toBe("certificate");
    expect(out.key.certCommonName).toBe("key.example.com");
    expect(out.key.spkiSha256).toMatch(/^[0-9A-F:]+$/);
  });

  it("rejects PKCS#1 with the openssl conversion hint", async () => {
    const out = await inspectKey(
      "-----BEGIN RSA PRIVATE KEY-----\nQUJD\n-----END RSA PRIVATE KEY-----"
    );
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.error).toMatch(/openssl pkcs8 -topk8/);
  });

  it("rejects garbage", async () => {
    expect((await inspectKey("hello")).ok).toBe(false);
    expect((await inspectKey("   ")).ok).toBe(false);
  });
});
