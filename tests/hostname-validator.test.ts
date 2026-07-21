/**
 * Hostname / SAN coverage verdicts.
 *
 * Regression tests for #65: the IP branch only fired when the literal was
 * *also* present in the iPAddress SANs; otherwise control fell through to the
 * dNSName loop, where an IP literal could string-match a DNS entry. Browsers
 * require an iPAddress SAN for an IP literal and reject a dNSName one, so the
 * tool answered "hostname covered" for a certificate Chrome refuses with
 * ERR_CERT_COMMON_NAME_INVALID.
 *
 * Also covers the expiry note (#67): the validator answered "covered" for a
 * long-dead certificate with nothing to say about it.
 */

import { describe, expect, it } from "vitest";

import { validateHostname } from "~/lib/hostname-validator";
import { expiredWindow, makeCert } from "./helpers/certs";

async function check(pem: string, hostname: string) {
  const out = await validateHostname({ pem, hostname });
  expect(out.ok).toBe(true);
  if (!out.ok) throw new Error(out.error);
  return out.results[0]!;
}

describe("IP literals", () => {
  it("does NOT accept an IP covered only by a dNSName SAN", async () => {
    // `openssl ... -addext "subjectAltName=DNS:192.0.2.1"` is a common
    // mistake when generating a certificate for an appliance.
    const { pem } = await makeCert({ cn: "appliance", dns: ["192.0.2.1"] });

    const res = await check(pem, "192.0.2.1");

    expect(res.matched).toBe(false);
    expect(res.reason.toLowerCase()).toContain("ipaddress");
  });

  it("accepts an IP covered by an iPAddress SAN", async () => {
    const { pem } = await makeCert({ cn: "appliance", ip: ["192.0.2.1"] });

    const res = await check(pem, "192.0.2.1");

    expect(res.matched).toBe(true);
    expect(res.matchedEntry?.type).toBe("IP");
  });

  it("does not accept an IP that no SAN covers", async () => {
    const { pem } = await makeCert({ cn: "appliance", ip: ["192.0.2.1"] });

    const res = await check(pem, "198.51.100.7");

    expect(res.matched).toBe(false);
  });

  it("does not fall back to the CN for an IP literal", async () => {
    // No SANs at all: the CN fallback must not rescue an IP either.
    const { pem } = await makeCert({ cn: "192.0.2.1" });

    const res = await check(pem, "192.0.2.1");

    expect(res.matched).toBe(false);
  });
});

describe("DNS names", () => {
  it("matches an exact DNS SAN", async () => {
    const { pem } = await makeCert({
      cn: "app.example.com",
      dns: ["app.example.com"],
    });

    const res = await check(pem, "app.example.com");

    expect(res.matched).toBe(true);
    expect(res.matchedEntry?.type).toBe("DNS");
  });

  it("matches a wildcard SAN one label deep, and no deeper", async () => {
    const { pem } = await makeCert({ cn: "wild", dns: ["*.example.com"] });

    expect((await check(pem, "api.example.com")).matched).toBe(true);
    expect((await check(pem, "a.b.example.com")).matched).toBe(false);
    // A wildcard does not cover the bare domain.
    expect((await check(pem, "example.com")).matched).toBe(false);
  });
});

describe("validity", () => {
  it("says so when the certificate that covers the hostname has expired (#67)", async () => {
    const { pem } = await makeCert({
      cn: "old.example.com",
      dns: ["old.example.com"],
      ...expiredWindow(),
    });

    const res = await check(pem, "old.example.com");

    // The SAN does cover it — but answering only that is misleading.
    expect(res.matched).toBe(true);
    expect(
      res.notes.some((n) => n.toLowerCase().includes("expired")) ||
        res.rules.some((r) => !r.ok && r.rule.toLowerCase().includes("valid")),
    ).toBe(true);
  });

  it("has nothing to say about a current certificate", async () => {
    const { pem } = await makeCert({
      cn: "fresh.example.com",
      dns: ["fresh.example.com"],
    });

    const res = await check(pem, "fresh.example.com");

    expect(res.matched).toBe(true);
    expect(res.notes.some((n) => n.toLowerCase().includes("expired"))).toBe(false);
  });
});
