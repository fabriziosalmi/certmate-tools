import { describe, expect, it } from "vitest";

import { pemToDer, derToPem, pemRoundTrip } from "~/lib/format-converter";
import { SAMPLE_CERT_ISRG_X1 } from "~/lib/cert-decoder";

describe("format-converter", () => {
  it("converts PEM to DER bytes", () => {
    const out = pemToDer(SAMPLE_CERT_ISRG_X1);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.bytes.length).toBeGreaterThan(1000);
    expect(out.label).toBe("CERTIFICATE");
    // DER X.509 starts with SEQUENCE tag 0x30.
    expect(out.bytes[0]).toBe(0x30);
  });

  it("round-trips DER -> PEM -> DER without byte loss", () => {
    const first = pemToDer(SAMPLE_CERT_ISRG_X1);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const repem = derToPem(first.bytes, first.label);
    expect(repem).toContain("-----BEGIN CERTIFICATE-----");
    const second = pemToDer(repem);
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.bytes).toEqual(first.bytes);
  });

  it("pemRoundTrip helper preserves bytes", () => {
    const out = pemRoundTrip(SAMPLE_CERT_ISRG_X1);
    const ref = pemToDer(SAMPLE_CERT_ISRG_X1);
    expect(out.ok).toBe(true);
    expect(ref.ok).toBe(true);
    if (!out.ok || !ref.ok) return;
    expect(out.bytes).toEqual(ref.bytes);
  });

  it("rejects garbage", () => {
    expect(pemToDer("!!! not pem !!!").ok).toBe(false);
    expect(pemToDer("").ok).toBe(false);
  });
});
