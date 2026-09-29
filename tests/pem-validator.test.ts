import { describe, expect, it } from "vitest";

import { validatePem } from "~/lib/pem-validator";
import { SAMPLE_CERT_ISRG_X1 } from "~/lib/cert-decoder";

describe("validatePem", () => {
  it("accepts a well-formed certificate PEM", () => {
    const out = validatePem(SAMPLE_CERT_ISRG_X1);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.blocks).toHaveLength(1);
    expect(out.blocks[0]!.label).toBe("CERTIFICATE");
    expect(out.blocks[0]!.derBytes).toBeGreaterThan(1000);
  });

  it("rejects input with no PEM envelope", () => {
    const out = validatePem("hello world, not a pem");
    expect(out.ok).toBe(false);
  });

  it("rejects unbalanced BEGIN/END", () => {
    const out = validatePem("-----BEGIN CERTIFICATE-----\nQUJD\n");
    expect(out.ok).toBe(false);
  });

  it("rejects non-base64 body", () => {
    const out = validatePem(
      "-----BEGIN CERTIFICATE-----\n!!!not-base64!!!\n-----END CERTIFICATE-----"
    );
    expect(out.ok).toBe(false);
  });

  it("accepts multi-block bundles and reports each label", () => {
    const out = validatePem(`${SAMPLE_CERT_ISRG_X1}\n${SAMPLE_CERT_ISRG_X1}`);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.blocks).toHaveLength(2);
  });
});
