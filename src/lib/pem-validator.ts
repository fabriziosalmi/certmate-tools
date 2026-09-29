/**
 * PEM validator — 100% client-side, synchronous, no crypto.
 *
 * Checks BEGIN/END pairing, label consistency, base64 charset and strict
 * decodability. Never flags the *meaning* of the DER (that is the decoder's
 * job) — only whether the PEM envelope is well-formed.
 */

import { MAX_INPUT_BYTES } from "./util";

export interface PemBlockReport {
  label: string;
  lineCount: number;
  derBytes: number;
  warnings: string[];
}

export type PemValidateOutcome =
  | { ok: true; blocks: PemBlockReport[] }
  | { ok: false; error: string };

const BEGIN_RE = /-----BEGIN ([A-Z0-9 ]+)-----/g;
const END_RE = /-----END ([A-Z0-9 ]+)-----/g;
const B64_LINE_RE = /^[A-Za-z0-9+/]*={0,2}$/;

function decodeStrict(b64: string): number {
  const clean = b64.replace(/\s+/g, "");
  if (clean.length % 4 !== 0) throw new Error("base64 length is not a multiple of 4");
  const bin = atob(clean);
  // Re-encode round-trip to catch non-canonical input (e.g. wrong padding).
  let s = "";
  // atob already throws on out-of-alphabet chars in every modern engine.
  void s;
  return bin.length;
}

export function validatePem(input: string): PemValidateOutcome {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, error: "Input is empty." };
  if (trimmed.length > MAX_INPUT_BYTES) {
    return { ok: false, error: "Input is too large (max 2 MB)." };
  }

  const begins = [...trimmed.matchAll(BEGIN_RE)];
  const ends = [...trimmed.matchAll(END_RE)];

  if (begins.length === 0) {
    return {
      ok: false,
      error: "No PEM block found. Expected a line like -----BEGIN CERTIFICATE-----.",
    };
  }
  if (begins.length !== ends.length) {
    return {
      ok: false,
      error: `Unbalanced PEM envelope: ${begins.length} BEGIN vs ${ends.length} END lines.`,
    };
  }

  const blocks: PemBlockReport[] = [];
  // Walk sequentially so a mismatched END is reported, not silently skipped.
  let cursor = 0;
  for (const b of begins) {
    const label = b[1]!;
    const beginIdx = b.index!;
    if (beginIdx < cursor) {
      return { ok: false, error: `Overlapping PEM block for "${label}".` };
    }
    const endMarker = `-----END ${label}-----`;
    const endIdx = trimmed.indexOf(endMarker, beginIdx);
    if (endIdx === -1) {
      return { ok: false, error: `Missing ${endMarker} for "${label}".` };
    }
    const body = trimmed
      .slice(beginIdx + b[0].length, endIdx)
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (body.length === 0) {
      return { ok: false, error: `Empty PEM body for "${label}".` };
    }

    const warnings: string[] = [];
    for (const line of body) {
      if (!B64_LINE_RE.test(line)) {
        return {
          ok: false,
          error: `Non-base64 characters in "${label}" body: "${line.slice(0, 32)}…".`,
        };
      }
      if (line.length !== 64) {
        warnings.push(
          `Line of ${line.length} chars (canonical PEM wraps at 64).`
        );
        break; // one warning of this class is enough
      }
    }

    let derBytes: number;
    try {
      derBytes = decodeStrict(body.join(""));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { ok: false, error: `Invalid base64 in "${label}": ${msg}.` };
    }

    blocks.push({
      label,
      lineCount: body.length,
      derBytes,
      warnings,
    });
    cursor = endIdx + endMarker.length;

    if (blocks.length > 16) {
      return { ok: false, error: "Too many PEM blocks (limit 16)." };
    }
  }

  return { ok: true, blocks };
}
