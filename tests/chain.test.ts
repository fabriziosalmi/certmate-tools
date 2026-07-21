/**
 * Chain Builder verdicts.
 *
 * Regression tests for #63: `allValid` started at `true` and was only
 * falsified inside the per-link loop or by a missing issuer. A single
 * self-signed certificate has zero links and is its own root, so nothing ever
 * cleared the flag — an expired self-signed certificate from an internal
 * appliance was reported as a valid chain.
 */

import { describe, expect, it } from "vitest";

import { buildChain } from "~/lib/chain";
import { DAY, expiredWindow, makeCert } from "./helpers/certs";

describe("buildChain — single self-signed certificate", () => {
  it("reports an expired self-signed certificate as NOT valid", async () => {
    const { pem } = await makeCert({ cn: "appliance.internal", ...expiredWindow() });

    const result = await buildChain(pem);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { result: chain } = result;
    expect(chain.nodes[0]!.expired).toBe(true);
    expect(chain.allValid).toBe(false); // the green pill was the bug
  });

  it("reports a not-yet-valid self-signed certificate as NOT valid", async () => {
    const now = Date.now();
    const { pem } = await makeCert({
      cn: "future.internal",
      notBefore: new Date(now + 10 * DAY),
      notAfter: new Date(now + 100 * DAY),
    });

    const result = await buildChain(pem);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { result: chain } = result;
    expect(chain.nodes[0]!.notYetValid).toBe(true);
    expect(chain.allValid).toBe(false);
  });

  it("still reports a currently-valid self-signed certificate as valid", async () => {
    const { pem } = await makeCert({ cn: "good.internal" });

    const result = await buildChain(pem);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { result: chain } = result;
    expect(chain.allValid).toBe(true);
  });
});

describe("buildChain — leaf + issuer", () => {
  it("validates a well-formed two-cert chain", async () => {
    const root = await makeCert({ cn: "Test Root CA", ca: true });
    const leaf = await makeCert({
      cn: "app.example.com",
      issuer: { cert: root.cert, keys: root.keys },
      ca: false,
    });

    const result = await buildChain(`${leaf.pem}\n${root.pem}`);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { result: chain } = result;
    expect(chain.links).toHaveLength(1);
    expect(chain.links[0]!.signatureValid).toBe(true);
    expect(chain.allValid).toBe(true);
  });

  it("fails the chain when the leaf has expired", async () => {
    const root = await makeCert({ cn: "Test Root CA", ca: true });
    const leaf = await makeCert({
      cn: "old.example.com",
      issuer: { cert: root.cert, keys: root.keys },
      ca: false,
      ...expiredWindow(),
    });

    const result = await buildChain(`${leaf.pem}\n${root.pem}`);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { result: chain } = result;
    expect(chain.allValid).toBe(false);
  });

  it("flags a missing issuer when only the leaf is pasted", async () => {
    const root = await makeCert({ cn: "Test Root CA", ca: true });
    const leaf = await makeCert({
      cn: "lonely.example.com",
      issuer: { cert: root.cert, keys: root.keys },
      ca: false,
    });

    const result = await buildChain(leaf.pem);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { result: chain } = result;
    expect(chain.missingIssuer).toBeDefined();
    expect(chain.allValid).toBe(false);
  });
});

describe("buildChain — isCA", () => {
  it("does not call a leaf a CA (#67)", async () => {
    // Let's Encrypt leaves carry basicConstraints with CA:FALSE, critical.
    // Testing the extension's *presence* made every one of them a CA.
    const { pem } = await makeCert({ cn: "leaf.example.com", ca: false });

    const result = await buildChain(pem);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { result: chain } = result;
    expect(chain.nodes[0]!.isCA).toBe(false);
  });

  it("recognises a real CA", async () => {
    const { pem } = await makeCert({ cn: "Test Root CA", ca: true });

    const result = await buildChain(pem);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { result: chain } = result;
    expect(chain.nodes[0]!.isCA).toBe(true);
  });

  it("treats a certificate with no basicConstraints as not a CA", async () => {
    const { pem } = await makeCert({ cn: "plain.example.com" });

    const result = await buildChain(pem);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { result: chain } = result;
    expect(chain.nodes[0]!.isCA).toBe(false);
  });
});

describe("buildChain — input limits (#67)", () => {
  it("refuses an oversized bundle instead of silently analysing a subset", async () => {
    // 20 certificates, above MAX_PEM_BLOCKS (16). Truncating used to drop the
    // last four and then report "missing intermediate" — a confident
    // diagnosis of a problem the user did not have.
    const certs = await Promise.all(
      Array.from({ length: 20 }, (_, i) => makeCert({ cn: `c${i}.example.com` })),
    );

    const result = await buildChain(certs.map((c) => c.pem).join("\n"));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/too many/i);
    expect(result.error).toContain("20");
  });
});
