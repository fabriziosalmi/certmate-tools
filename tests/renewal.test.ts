import { describe, expect, it } from "vitest";

import { planRenewal, maxValidityOn } from "~/lib/renewal";

describe("maxValidityOn (SC-081v3)", () => {
  it("returns 398 before the first cap", () => {
    expect(maxValidityOn(new Date("2025-01-01T00:00:00Z"))).toBe(398);
  });
  it("returns 200 between Mar 2026 and Mar 2027", () => {
    expect(maxValidityOn(new Date("2026-06-01T00:00:00Z"))).toBe(200);
  });
  it("returns 100 between Mar 2027 and Mar 2029", () => {
    expect(maxValidityOn(new Date("2028-01-01T00:00:00Z"))).toBe(100);
  });
  it("returns 47 from Mar 2029", () => {
    expect(maxValidityOn(new Date("2030-01-01T00:00:00Z"))).toBe(47);
  });
});

describe("planRenewal", () => {
  it("computes renew-by 30 days before expiry", () => {
    const out = planRenewal("2026-12-01T00:00:00Z", {
      now: new Date("2026-06-01T00:00:00Z"),
      renewBeforeDays: 30,
    });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.plan.renewBy.toISOString()).toBe("2026-11-01T00:00:00.000Z");
    expect(out.plan.expired).toBe(false);
    expect(out.plan.daysLeft).toBeGreaterThan(180);
  });

  it("flags expired certificates", () => {
    const out = planRenewal("2020-01-01T00:00:00Z", {
      now: new Date("2026-01-01T00:00:00Z"),
    });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.plan.expired).toBe(true);
    expect(out.plan.daysLeft).toBeLessThan(0);
  });

  it("rejects unparseable dates", () => {
    expect(planRenewal("not-a-date").ok).toBe(false);
  });
});
