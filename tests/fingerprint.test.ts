import { describe, expect, it } from "vitest";

import { fingerprintInput } from "~/lib/fingerprint";
import { decodeCertificateInput, SAMPLE_CERT_ISRG_X1 } from "~/lib/cert-decoder";

describe("fingerprintInput", () => {
  it("hashes the DER bytes of a PEM certificate (matches the decoder)", async () => {
    const [fp, dec] = await Promise.all([
      fingerprintInput(SAMPLE_CERT_ISRG_X1),
      decodeCertificateInput(SAMPLE_CERT_ISRG_X1),
    ]);
    expect(fp.ok).toBe(true);
    expect(dec.ok).toBe(true);
    if (!fp.ok || !dec.ok) return;
    expect(fp.result.kind).toBe("certificate-der");
    // Same DER bytes in, same digest out — the definition of a fingerprint.
    expect(fp.result.sha256).toBe(dec.certs[0]!.fingerprintSha256);
    expect(fp.result.sha1).toBe(dec.certs[0]!.fingerprintSha1);
  });

  it("hashes arbitrary text as UTF-8 (known vector for 'abc')", async () => {
    const out = await fingerprintInput("abc");
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.result.kind).toBe("raw-bytes");
    expect(out.result.sha256.replaceAll(":", "").toLowerCase()).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
    );
  });

  it("rejects empty input", async () => {
    const out = await fingerprintInput("   ");
    expect(out.ok).toBe(false);
  });
});
