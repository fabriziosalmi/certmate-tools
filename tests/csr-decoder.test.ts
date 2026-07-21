/**
 * CSR decoder.
 *
 * Part of #66 — the last of the six verdict-producing modules that had no
 * tests. A CSR is what someone sends to a CA, so "which names am I actually
 * requesting?" is the question this answers, and getting it wrong means
 * discovering a missing SAN after issuance.
 */

import { describe, expect, it } from "vitest";

import { decodeCSRInput, SAMPLE_CSR } from "~/lib/csr-decoder";

async function decodeOne(input: string) {
  const out = await decodeCSRInput(input);
  expect(out.ok).toBe(true);
  if (!out.ok) throw new Error(out.error);
  return out.csrs[0]!;
}

describe("decodeCSRInput", () => {
  it("decodes the committed sample CSR", async () => {
    const csr = await decodeOne(SAMPLE_CSR);

    expect(csr.subject).toBeTruthy();
    expect(csr.publicKey.algorithm).toBeTruthy();
  });

  it("verifies the self-signature on the request", async () => {
    const csr = await decodeOne(SAMPLE_CSR);

    // A CSR is self-signed by the key it requests a certificate for; a false
    // here means the request would be rejected by the CA.
    expect(csr.signatureValid).toBe(true);
  });

  it("reports a non-CSR input as an error rather than throwing", async () => {
    const out = await decodeCSRInput("hello, this is not a CSR");
    expect(out.ok).toBe(false);
  });

  it("reports an empty input", async () => {
    const out = await decodeCSRInput("   ");
    expect(out.ok).toBe(false);
  });

  it("rejects a bundle above the block limit instead of truncating it (#67)", async () => {
    const many = Array.from({ length: 20 }, () => SAMPLE_CSR).join("\n");

    const out = await decodeCSRInput(many);

    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.error).toMatch(/too many/i);
  });
});
