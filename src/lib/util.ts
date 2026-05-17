/**
 * Tiny shared helpers used across every tool.
 * No DOM imports here — keep this safe to call from any layer.
 */

export const MAX_INPUT_BYTES = 2 * 1024 * 1024; // 2 MB hard cap
export const MAX_PEM_BLOCKS = 16;

export function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function bufToHexColon(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0"))
    .join(":")
    .toUpperCase();
}

export function bufToBase64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

export function bufToBase64Url(buf: ArrayBuffer | Uint8Array): string {
  return bufToBase64(buf).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function sha(
  algo: "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512",
  data: ArrayBuffer | Uint8Array
): Promise<ArrayBuffer> {
  // crypto.subtle.digest accepts BufferSource directly.
  return crypto.subtle.digest(algo, data as BufferSource);
}

/**
 * Convert a hex string (with or without colons) to its big-int decimal form.
 * Treats the input as unsigned. Returns "0" on any parse error.
 */
export function hexToBigIntDecimal(hex: string): string {
  const clean = hex.replace(/[^0-9a-fA-F]/g, "");
  if (!clean) return "0";
  try {
    return BigInt("0x" + clean).toString(10);
  } catch {
    return "0";
  }
}

export function diffDays(a: Date, b: Date): number {
  const ms = a.getTime() - b.getTime();
  return Math.round(ms / 86_400_000);
}

export function formatDate(iso: string | Date): string {
  const d = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toUTCString();
}

/**
 * Hardened HTTP(S) URL filter for hrefs derived from untrusted certificate
 * extensions (AIA, CRL, etc.). Anything that is not http(s) is dropped.
 */
export function safeHttpUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

const RDN_SHORT_NAMES: Record<string, string> = {
  // OID → short name fallback if the underlying parser only gave us OIDs.
  "2.5.4.3": "CN",
  "2.5.4.6": "C",
  "2.5.4.7": "L",
  "2.5.4.8": "ST",
  "2.5.4.10": "O",
  "2.5.4.11": "OU",
  "2.5.4.5": "serialNumber",
  "1.2.840.113549.1.9.1": "emailAddress",
  "0.9.2342.19200300.100.1.25": "DC",
};

/**
 * Parses a DN string emitted by @peculiar/x509 in @peculiar/x509 default
 * RFC 4514-ish format ("CN=foo, O=bar"). Handles escaped commas / equals.
 */
export function parseDN(dn: string): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  if (!dn) return out;
  const parts = dn.split(/(?<!\\),/);
  for (const raw of parts) {
    const eq = raw.indexOf("=");
    if (eq === -1) continue;
    const rawKey = raw.slice(0, eq).trim();
    const k = RDN_SHORT_NAMES[rawKey] ?? rawKey;
    const v = raw
      .slice(eq + 1)
      .trim()
      .replace(/\\,/g, ",")
      .replace(/\\=/g, "=");
    if (!out[k]) out[k] = [];
    out[k].push(v);
  }
  return out;
}

/**
 * Read PEM blocks of the given label from input. Returns an empty array if no
 * block is found. Limits the number of blocks to MAX_PEM_BLOCKS.
 */
export function extractPemBlocks(input: string, label: string): string[] {
  const re = new RegExp(
    `-----BEGIN ${label}-----[\\s\\S]*?-----END ${label}-----`,
    "g"
  );
  const matches = input.match(re) ?? [];
  return matches.slice(0, MAX_PEM_BLOCKS);
}

export function wrapAsPem(label: string, base64: string): string {
  const clean = base64.replace(/\s+/g, "");
  const chunks = clean.match(/.{1,64}/g) ?? [];
  return [`-----BEGIN ${label}-----`, ...chunks, `-----END ${label}-----`].join(
    "\n"
  );
}

/**
 * Try to coerce arbitrary text into one or more PEM blocks of a given label.
 * Accepts:
 *  - Multiple existing PEM blocks (returns them in order)
 *  - A single base64 blob (wrapped as one block)
 */
export function coercePem(input: string, label: string): string[] {
  const trimmed = input.trim();
  if (!trimmed) return [];
  if (trimmed.includes(`-----BEGIN ${label}-----`)) {
    return extractPemBlocks(trimmed, label);
  }
  if (/^[A-Za-z0-9+/=\s]+$/.test(trimmed)) {
    return [wrapAsPem(label, trimmed)];
  }
  return [];
}

export function approximateByteSize(s: string): number {
  // Approximation: assume ASCII for PEM input. Good enough for size capping.
  return s.length;
}
