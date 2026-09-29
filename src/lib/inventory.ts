/**
 * Certificate inventory CSV validator — pure string parsing, client-side.
 *
 * Expected columns (header required, case-insensitive): at least `hostname`
 * (aliases: host, domain, cn, dns) and optionally `not_after` / `expiry` /
 * `expires` (aliases: notafter, valid_to, end). Extra columns are ignored so
 * existing spreadsheets validate without reformatting.
 */

import { diffDays } from "./util";

export interface InventoryRow {
  line: number;
  hostname: string;
  notAfter?: string;
  daysLeft?: number;
  issues: string[];
}

export interface InventorySummary {
  rows: number;
  withExpiry: number;
  expired: number;
  expiringIn30Days: number;
  invalid: number;
}

export type InventoryOutcome =
  | { ok: true; rows: InventoryRow[]; summary: InventorySummary }
  | { ok: false; error: string };

const HOST_ALIASES = new Set(["hostname", "host", "domain", "cn", "dns"]);
const EXPIRY_ALIASES = new Set([
  "not_after",
  "notafter",
  "expiry",
  "expires",
  "valid_to",
  "validto",
  "end",
  "not_after_utc",
]);

function splitCsvLine(line: string): string[] {
  // Minimal RFC-4180: quoted fields with "" escapes, comma separator.
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!;
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      out.push(cur.trim());
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur.trim());
  return out;
}

const HOST_RE = /^(?=.{1,253}$)(\*\.)?([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/i;

export function validateInventoryCsv(
  text: string,
  now = new Date()
): InventoryOutcome {
  const trimmed = text.replace(/^\uFEFF/, "").trim();
  if (!trimmed) return { ok: false, error: "CSV is empty." };
  if (trimmed.length > 2 * 1024 * 1024) {
    return { ok: false, error: "CSV is too large (max 2 MB)." };
  }
  const lines = trimmed.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    return { ok: false, error: "CSV needs a header row plus at least one data row." };
  }
  if (lines.length > 5001) {
    return { ok: false, error: "Too many rows (limit 5000 plus header)." };
  }

  const header = splitCsvLine(lines[0]!).map((h) => h.toLowerCase());
  const hostIdx = header.findIndex((h) => HOST_ALIASES.has(h));
  if (hostIdx === -1) {
    return {
      ok: false,
      error: `Header must contain a hostname column (${[...HOST_ALIASES].join(", ")}). Found: ${header.join(", ")}.`,
    };
  }
  const expiryIdx = header.findIndex((h) => EXPIRY_ALIASES.has(h));

  const rows: InventoryRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]!);
    const hostname = (cells[hostIdx] ?? "").trim();
    const issues: string[] = [];
    if (!hostname) {
      issues.push("missing hostname");
    } else if (!HOST_RE.test(hostname)) {
      issues.push(`invalid hostname "${hostname.slice(0, 64)}"`);
    }

    let notAfter: string | undefined;
    let daysLeft: number | undefined;
    if (expiryIdx !== -1) {
      const raw = (cells[expiryIdx] ?? "").trim();
      if (raw) {
        const d = new Date(raw);
        if (Number.isNaN(d.getTime())) {
          issues.push(`unparseable date "${raw.slice(0, 32)}"`);
        } else {
          notAfter = d.toISOString();
          daysLeft = diffDays(d, now);
          if (d.getTime() <= now.getTime()) issues.push("expired");
          else if (daysLeft <= 30) issues.push(`expires in ${daysLeft} days`);
        }
      }
    }

    rows.push({ line: i + 1, hostname, notAfter, daysLeft, issues });
  }

  const summary: InventorySummary = {
    rows: rows.length,
    withExpiry: rows.filter((r) => r.notAfter).length,
    expired: rows.filter((r) => r.issues.includes("expired")).length,
    expiringIn30Days: rows.filter((r) =>
      r.issues.some((x) => x.startsWith("expires in"))
    ).length,
    invalid: rows.filter((r) => r.issues.length > 0).length,
  };
  return { ok: true, rows, summary };
}

export const SAMPLE_INVENTORY_CSV = `hostname,not_after
example.com,2026-12-01T00:00:00Z
api.example.com,2026-10-15T00:00:00Z
expired.example.com,2020-01-01T00:00:00Z
`;
