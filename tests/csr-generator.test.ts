/**
 * CSR generator — dogfooded through the CSR decoder.
 *
 * A generated request must parse with `decodeCSRInput` and carry
 * `signatureValid === true`: that single assertion covers DN encoding,
 * extensionRequest/SAN encoding, the signatureAlgorithm OID and the
 * signature itself — i.e. everything we could get wrong in PKCS#10.
 */
import "./helpers/certs"; // side effect: sets @peculiar/x509 crypto provider
import { describe, expect, it } from "vitest";

import { generateCsr } from "~/lib/csr-generator";
import { decodeCSRInput } from "~/lib/csr-decoder";

describe("generateCsr — RSA", () => {
  it("produces a verifiable CSR with subject, DNS SANs and IP SAN", async () => {
    const gen = await generateCsr({
      keyType: "rsa",
      rsaBits: 2048,
      subject: { CN: "www.example.com", O: "Acme", C: "IT" },
      sanDns: ["www.example.com", "example.com"],
      sanIp: ["10.0.0.1"],
    });

    expect(gen.ok).toBe(true);
    if (!gen.ok) return;
    expect(gen.csr.csrPem).toContain("-----BEGIN CERTIFICATE REQUEST-----");
    expect(gen.csr.privateKeyPem).toContain("-----BEGIN PRIVATE KEY-----");
    expect(gen.csr.publicKeyPem).toContain("-----BEGIN PUBLIC KEY-----");
    expect(gen.csr.algorithm).toBe("RSA");
    expect(gen.csr.keySize).toBe(2048);

    const dec = await decodeCSRInput(gen.csr.csrPem);
    expect(dec.ok).toBe(true);
    if (!dec.ok) return;
    const csr = dec.csrs[0]!;
    expect(csr.subjectDN["CN"]?.[0]).toBe("www.example.com");
    expect(csr.subjectDN["O"]?.[0]).toBe("Acme");
    expect(csr.san.map((s) => `${s.type}:${s.value}`)).toEqual(
      expect.arrayContaining(["DNS:www.example.com", "DNS:example.com", "IP:10.0.0.1"])
    );
    expect(csr.signatureValid).toBe(true);
  }, 30000);
});

describe("generateCsr — ECDSA", () => {
  it("produces a verifiable P-256 CSR", async () => {
    const gen = await generateCsr({
      keyType: "ecdsa",
      curve: "P-256",
      subject: { CN: "ec.example.com" },
      sanDns: ["ec.example.com"],
    });

    expect(gen.ok).toBe(true);
    if (!gen.ok) return;
    expect(gen.csr.namedCurve).toBe("P-256");

    const dec = await decodeCSRInput(gen.csr.csrPem);
    expect(dec.ok).toBe(true);
    if (!dec.ok) return;
    expect(dec.csrs[0]!.signatureValid).toBe(true);
    expect(dec.csrs[0]!.publicKey.namedCurve).toBe("P-256");
  }, 30000);
});

describe("generateCsr — validation", () => {
  it("rejects a missing CN", async () => {
    const out = await generateCsr({ keyType: "rsa", subject: { CN: "  " } });
    expect(out.ok).toBe(false);
  });

  it("rejects a bad country code", async () => {
    const out = await generateCsr({
      keyType: "rsa",
      subject: { CN: "x.example.com", C: "ITA" },
    });
    expect(out.ok).toBe(false);
  });

  it("rejects invalid DNS and IP SANs", async () => {
    expect(
      (await generateCsr({
        keyType: "rsa",
        subject: { CN: "x.example.com" },
        sanDns: ["not a hostname!"],
      })).ok
    ).toBe(false);
    expect(
      (await generateCsr({
        keyType: "rsa",
        subject: { CN: "x.example.com" },
        sanIp: ["999.1.1.1"],
      })).ok
    ).toBe(false);
  });
});
