import { describe, expect, it } from "vitest";
import {
  bufToBase64Url,
  bufToHexColon,
  coercePem,
  escapeHtml,
  extractPemBlocks,
  hexToBigIntDecimal,
  parseDN,
  safeHttpUrl,
  wrapAsPem,
} from "~/lib/util";

describe("escapeHtml", () => {
  it("escapes the standard XSS-sensitive characters", () => {
    expect(escapeHtml("<script>alert('x')</script>")).toBe(
      "&lt;script&gt;alert(&#039;x&#039;)&lt;/script&gt;"
    );
  });

  it("escapes ampersand before any other entity", () => {
    expect(escapeHtml("Tom & Jerry")).toBe("Tom &amp; Jerry");
    expect(escapeHtml("a &amp; b")).toBe("a &amp;amp; b");
  });

  it("coerces non-string inputs without throwing", () => {
    expect(escapeHtml(123 as unknown as string)).toBe("123");
  });
});

describe("bufToHexColon", () => {
  it("returns colon-separated upper-case bytes", () => {
    const bytes = new Uint8Array([0x12, 0x34, 0xab, 0xcd, 0x00, 0xff]);
    expect(bufToHexColon(bytes)).toBe("12:34:AB:CD:00:FF");
  });

  it("pads single-digit bytes to two hex characters", () => {
    expect(bufToHexColon(new Uint8Array([0x01, 0x0f]))).toBe("01:0F");
  });

  it("handles ArrayBuffer input identically to Uint8Array", () => {
    const buf = new Uint8Array([1, 2, 3]).buffer;
    expect(bufToHexColon(buf)).toBe("01:02:03");
  });
});

describe("bufToBase64Url", () => {
  it("encodes without padding and with URL-safe characters", () => {
    const bytes = new TextEncoder().encode("hello world");
    expect(bufToBase64Url(bytes)).toBe("aGVsbG8gd29ybGQ");
  });

  it("uses '-' and '_' instead of '+' and '/'", () => {
    // bytes that force + and / in standard base64
    const bytes = new Uint8Array([0xfb, 0xff, 0xbf]);
    const std = btoa(String.fromCharCode(...bytes));
    expect(std).toContain("/");
    expect(bufToBase64Url(bytes)).not.toContain("/");
    expect(bufToBase64Url(bytes)).not.toContain("+");
    expect(bufToBase64Url(bytes)).not.toMatch(/=+$/);
  });
});

describe("hexToBigIntDecimal", () => {
  it("converts colon-formatted hex to decimal string", () => {
    expect(hexToBigIntDecimal("FF:FF")).toBe("65535");
    expect(hexToBigIntDecimal("01:00:00")).toBe("65536");
  });

  it("handles arbitrarily long values via BigInt", () => {
    // 0xDEADBEEFCAFEBABE
    expect(hexToBigIntDecimal("DEAD:BEEF:CAFE:BABE")).toBe(
      "16045690984503098046"
    );
  });

  it("returns '0' on bad input rather than throwing", () => {
    expect(hexToBigIntDecimal("")).toBe("0");
    expect(hexToBigIntDecimal("ZZZ")).toBe("0");
  });
});

describe("parseDN", () => {
  it("splits a simple RFC 4514 DN into known short names", () => {
    const dn = parseDN("CN=example.com, O=Acme, C=US");
    expect(dn["CN"]).toEqual(["example.com"]);
    expect(dn["O"]).toEqual(["Acme"]);
    expect(dn["C"]).toEqual(["US"]);
  });

  it("does not split on escaped commas inside values", () => {
    const dn = parseDN(String.raw`CN=Big\, Inc., O=Acme`);
    expect(dn["CN"]).toEqual(["Big, Inc."]);
    expect(dn["O"]).toEqual(["Acme"]);
  });

  it("maps the emailAddress OID to its short form", () => {
    const dn = parseDN("1.2.840.113549.1.9.1=ops@example.com");
    expect(dn["emailAddress"]).toEqual(["ops@example.com"]);
  });
});

describe("safeHttpUrl", () => {
  it("accepts plain http and https", () => {
    expect(safeHttpUrl("http://example.com/")).toBe("http://example.com/");
    expect(safeHttpUrl("https://example.com/")).toBe("https://example.com/");
  });

  it("rejects every non-HTTP scheme used in XSS payloads", () => {
    expect(safeHttpUrl("javascript:alert(1)")).toBeNull();
    expect(safeHttpUrl("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(safeHttpUrl("file:///etc/passwd")).toBeNull();
    expect(safeHttpUrl("ldap://example.com")).toBeNull();
  });

  it("rejects garbage that cannot be parsed", () => {
    expect(safeHttpUrl("not a url")).toBeNull();
    expect(safeHttpUrl("")).toBeNull();
    expect(safeHttpUrl(undefined)).toBeNull();
    expect(safeHttpUrl(42)).toBeNull();
  });
});

describe("PEM helpers", () => {
  const oneBlock = `-----BEGIN CERTIFICATE-----
MIIBkTCB+wIJAJxzZxxxxxxx
-----END CERTIFICATE-----`;

  it("extracts a single PEM block back verbatim", () => {
    const blocks = extractPemBlocks(oneBlock, "CERTIFICATE");
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toContain("-----BEGIN CERTIFICATE-----");
    expect(blocks[0]).toContain("-----END CERTIFICATE-----");
  });

  it("extracts every block when several are concatenated", () => {
    const bundle = `${oneBlock}\n${oneBlock}\n${oneBlock}`;
    expect(extractPemBlocks(bundle, "CERTIFICATE")).toHaveLength(3);
  });

  it("ignores the wrong label", () => {
    expect(extractPemBlocks(oneBlock, "CERTIFICATE REQUEST")).toEqual([]);
  });

  it("caps the number of returned blocks at MAX_PEM_BLOCKS", () => {
    const many = Array.from({ length: 200 }, () => oneBlock).join("\n");
    expect(extractPemBlocks(many, "CERTIFICATE").length).toBeLessThanOrEqual(16);
  });

  it("wraps raw base64 into a PEM block of the chosen label", () => {
    const pem = wrapAsPem("CERTIFICATE", "MIIBdummybase64");
    expect(pem).toMatch(/^-----BEGIN CERTIFICATE-----/);
    expect(pem).toMatch(/-----END CERTIFICATE-----$/);
  });

  it("coercePem returns existing blocks when present", () => {
    expect(coercePem(oneBlock, "CERTIFICATE")).toHaveLength(1);
  });

  it("coercePem wraps bare base64 as a single block", () => {
    expect(coercePem("aGVsbG8=", "CERTIFICATE")).toHaveLength(1);
  });

  it("coercePem returns no blocks for non-PEM non-base64 text", () => {
    expect(coercePem("not pem at all !!!", "CERTIFICATE")).toEqual([]);
  });
});
