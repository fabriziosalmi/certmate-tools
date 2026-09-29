import { describe, expect, it } from "vitest";

import { diffCertificates } from "~/lib/cert-diff";
import { makeCert } from "./helpers/certs";

describe("diffCertificates", () => {
  it("reports identical certificates as all-same", async () => {
    const { pem } = await makeCert({ cn: "same.example.com" });
    const out = await diffCertificates(pem, pem);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.rows.length).toBeGreaterThan(5);
    expect(out.rows.every((r) => r.same)).toBe(true);
  });

  it("flags subject and SAN differences between two certs", async () => {
    const a = await makeCert({ cn: "a.example.com", dns: ["a.example.com"] });
    const b = await makeCert({ cn: "b.example.com", dns: ["b.example.com"] });
    const out = await diffCertificates(a.pem, b.pem);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    const byField = Object.fromEntries(out.rows.map((r) => [r.field, r]));
    expect(byField["Subject"]!.same).toBe(false);
    expect(byField["SAN"]!.same).toBe(false);
    expect(byField["SHA-256"]!.same).toBe(false);
  });

  it("returns a scoped error for bad input", async () => {
    const { pem } = await makeCert({ cn: "ok.example.com" });
    const out = await diffCertificates("garbage", pem);
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.error).toMatch(/Certificate A/);
  });
});
