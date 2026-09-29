/**
 * Certificate format converter — PEM ↔ DER, 100% client-side.
 *
 * Pure base64 transforms, no parsing, no network. DER output is offered as a
 * download via a Blob URL created in the component (no `fetch`, no upload).
 */

import {
  bufToBase64,
  extractPemBlocks,
  MAX_INPUT_BYTES,
  wrapAsPem,
} from "./util";

export type ConverterOutcome =
  | { ok: true; bytes: Uint8Array; label: string }
  | { ok: false; error: string };

function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/\s+/g, "");
  const bin = atob(clean);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** PEM (first block) → raw DER bytes. Accepts bare base64 as well. */
export function pemToDer(input: string): ConverterOutcome {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, error: "Input is empty." };
  if (trimmed.length > MAX_INPUT_BYTES) {
    return { ok: false, error: "Input is too large (max 2 MB)." };
  }
  try {
    if (trimmed.includes("-----BEGIN")) {
      const m = /-----BEGIN ([A-Z0-9 ]+)-----/.exec(trimmed);
      const label = m?.[1] ?? "CERTIFICATE";
      const blocks = extractPemBlocks(trimmed, label);
      if (blocks.length === 0) {
        return { ok: false, error: "No PEM block found in the input." };
      }
      const body = blocks[0]!
        .split(/\r?\n/)
        .filter((l) => !l.startsWith("-----"))
        .join("");
      return { ok: true, bytes: base64ToBytes(body), label };
    }
    if (/^[A-Za-z0-9+/=\s]+$/.test(trimmed)) {
      return { ok: true, bytes: base64ToBytes(trimmed), label: "CERTIFICATE" };
    }
    return { ok: false, error: "Input is not PEM or base64." };
  } catch {
    return { ok: false, error: "PEM body is not valid base64." };
  }
}

/** Raw DER bytes → PEM text with the given label. */
export function derToPem(der: ArrayBuffer | Uint8Array, label: string): string {
  const clean = label.trim() || "CERTIFICATE";
  return wrapAsPem(clean, bufToBase64(der));
}

/** Round-trip helper used by tests: DER → PEM → DER preserves bytes. */
export function pemRoundTrip(pem: string): ConverterOutcome {
  const first = pemToDer(pem);
  if (!first.ok) return first;
  const repem = derToPem(first.bytes, first.label);
  return pemToDer(repem);
}
