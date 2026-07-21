/**
 * Certificate decoder verdicts.
 *
 * Regression tests for #64: `expired` was derived from
 * `diffDays(notAfter, now) < 0`, and `diffDays` used `Math.round`. For a
 * certificate that expired between one and twelve hours ago the quotient
 * rounds to `-0`, and `-0 < 0` is `false` in JavaScript — so at noon, a
 * certificate that died at 06:00 showed the amber "Expires in 0 days" badge
 * instead of the red "Expired" one.
 *
 * That is precisely the window in which someone is staring at a live outage
 * asking whether the certificate is the cause.
 */

import { describe, expect, it } from "vitest";

import { decodeCertificateInput } from "~/lib/cert-decoder";
import { diffDays } from "~/lib/util";
import { DAY, makeCert } from "./helpers/certs";

const HOUR = 3_600_000;

async function decodeOne(pem: string) {
  const out = await decodeCertificateInput(pem);
  expect(out.ok).toBe(true);
  if (!out.ok) throw new Error("decode failed");
  return out.certs[0]!;
}

describe("diffDays", () => {
  it("never returns -0 for an elapsed interval", () => {
    const now = new Date("2026-07-21T12:00:00Z");
    const sixHoursAgo = new Date("2026-07-21T06:00:00Z");
    const days = diffDays(sixHoursAgo, now);

    expect(Object.is(days, -0)).toBe(false); // -0 < 0 is false: the bug
    expect(days).toBeLessThan(0);
  });

  it("floors rather than rounds, so a partial day is not counted early", () => {
    const now = new Date("2026-07-21T00:00:00Z");
    // 20 hours away is not "one day left" — it is zero full days.
    expect(diffDays(new Date("2026-07-21T20:00:00Z"), now)).toBe(0);
    expect(diffDays(new Date("2026-07-22T00:00:00Z"), now)).toBe(1);
  });

  it("counts whole days in the future", () => {
    const now = new Date("2026-07-21T00:00:00Z");
    expect(diffDays(new Date("2026-08-20T00:00:00Z"), now)).toBe(30);
  });
});

describe("decodeCertificateInput — expiry", () => {
  it("reports a certificate that expired hours ago as expired", async () => {
    const now = Date.now();
    const { pem } = await makeCert({
      cn: "outage.example.com",
      notBefore: new Date(now - 90 * DAY),
      notAfter: new Date(now - 6 * HOUR),
    });

    const decoded = await decodeOne(pem);

    expect(decoded.expired).toBe(true);
    expect(decoded.daysUntilExpiry).toBeLessThan(0);
  });

  it("reports a certificate that expired a minute ago as expired", async () => {
    const now = Date.now();
    const { pem } = await makeCert({
      cn: "just-died.example.com",
      notBefore: new Date(now - 90 * DAY),
      notAfter: new Date(now - 60_000),
    });

    expect((await decodeOne(pem)).expired).toBe(true);
  });

  it("does not call a certificate expiring later today expired", async () => {
    const now = Date.now();
    const { pem } = await makeCert({
      cn: "today.example.com",
      notBefore: new Date(now - 90 * DAY),
      notAfter: new Date(now + 6 * HOUR),
    });

    const decoded = await decodeOne(pem);

    expect(decoded.expired).toBe(false);
    expect(decoded.daysUntilExpiry).toBe(0); // "expires today", not "expired"
  });

  it("reports a healthy certificate with its remaining days", async () => {
    const now = Date.now();
    const { pem } = await makeCert({
      cn: "healthy.example.com",
      notBefore: new Date(now - DAY),
      notAfter: new Date(now + 30 * DAY),
    });

    const decoded = await decodeOne(pem);

    expect(decoded.expired).toBe(false);
    // 29, not 30: the certificate has 30 days minus the milliseconds spent
    // generating it, and flooring never overstates remaining life. For an
    // expiry warning, under-reporting by less than a day is the safe
    // direction — rounding up is what tells someone they have another day.
    expect(decoded.daysUntilExpiry).toBe(29);
  });

  it("flags a not-yet-valid certificate", async () => {
    const now = Date.now();
    const { pem } = await makeCert({
      cn: "future.example.com",
      notBefore: new Date(now + 2 * DAY),
      notAfter: new Date(now + 90 * DAY),
    });

    const decoded = await decodeOne(pem);

    expect(decoded.notYetValid).toBe(true);
    expect(decoded.expired).toBe(false);
  });
});

describe("decodeCertificateInput — basics", () => {
  it("reads the subject CN and the SANs", async () => {
    const { pem } = await makeCert({
      cn: "app.example.com",
      dns: ["app.example.com", "www.example.com"],
    });

    const decoded = await decodeOne(pem);

    expect(decoded.subjectDN["CN"]?.[0]).toBe("app.example.com");
    expect(decoded.san.map((s) => s.value)).toContain("www.example.com");
  });

  it("decodes every certificate in a bundle", async () => {
    const a = await makeCert({ cn: "one.example.com" });
    const b = await makeCert({ cn: "two.example.com" });

    const out = await decodeCertificateInput(`${a.pem}\n${b.pem}`);

    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.certs).toHaveLength(2);
  });
});
