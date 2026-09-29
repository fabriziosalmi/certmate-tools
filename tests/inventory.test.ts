import { describe, expect, it } from "vitest";

import { validateInventoryCsv, SAMPLE_INVENTORY_CSV } from "~/lib/inventory";

describe("validateInventoryCsv", () => {
  it("accepts the sample CSV and counts expirations", () => {
    const out = validateInventoryCsv(SAMPLE_INVENTORY_CSV, new Date("2026-01-01T00:00:00Z"));
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.summary.rows).toBe(3);
    expect(out.summary.withExpiry).toBe(3);
    expect(out.summary.expired).toBe(1);
  });

  it("flags invalid hostnames without failing the whole file", () => {
    const out = validateInventoryCsv(
      "hostname,not_after\nnot a hostname!,2026-12-01\ngood.example.com,2026-12-01",
      new Date("2026-01-01T00:00:00Z")
    );
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.summary.invalid).toBe(1);
    expect(out.rows[0]!.issues.join()).toMatch(/invalid hostname/);
  });

  it("flags unparseable dates", () => {
    const out = validateInventoryCsv("hostname,not_after\nx.example.com,not-a-date");
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.rows[0]!.issues.join()).toMatch(/unparseable date/);
  });

  it("requires a hostname column", () => {
    expect(validateInventoryCsv("foo,bar\na,b").ok).toBe(false);
  });

  it("rejects empty CSV", () => {
    expect(validateInventoryCsv("   ").ok).toBe(false);
  });
});
