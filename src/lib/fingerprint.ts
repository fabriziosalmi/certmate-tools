/**
 * Fingerprint calculator — 100% client-side.
 *
 * Hashes either the DER bytes of a pasted certificate (standard definition of
 * a certificate fingerprint: digest over the DER encoding) or, for arbitrary
 * text, the UTF-8 bytes. Uses Web Crypto only, so nothing leaves the browser.
 */

import {
  bufToHexColon,
  extractPemBlocks,
  MAX_INPUT_BYTES,
} from "./util";

export type FingerprintInputKind = "certificate-der" | "raw-bytes";

export interface FingerprintResult {
  kind: FingerprintInputKind;
  /** DER / input byte length. */
  byteLength: number;
  sha1: string;
  sha256: string;
  sha512: string;
}

export type FingerprintOutcome =
  | { ok: true; result: FingerprintResult }
  | { ok: false; error: string };

function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/\s+/g, "");
  const bin = atob(clean);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function pemBlockToDerBytes(block: string): Uint8Array {
  const lines = block.split(/\r?\n/).filter(
    (l) => !l.startsWith("-----BEGIN") && !l.startsWith("-----END")
  );
  return base64ToBytes(lines.join(""));
}

export async function fingerprintInput(
  input: string | ArrayBuffer
): Promise<FingerprintOutcome> {
  try {
    let bytes: Uint8Array;
    let kind: FingerprintInputKind = "raw-bytes";

    if (input instanceof ArrayBuffer) {
      if (input.byteLength === 0) return { ok: false, error: "Input is empty." };
      if (input.byteLength > MAX_INPUT_BYTES) {
        return { ok: false, error: "Input is too large (max 2 MB)." };
      }
      const head = new TextDecoder().decode(input.slice(0, 64));
      if (head.includes("-----BEGIN")) {
        const text = new TextDecoder().decode(input);
        const blocks = extractPemBlocks(text, "CERTIFICATE");
        if (blocks.length > 0) {
          bytes = pemBlockToDerBytes(blocks[0]!);
          kind = "certificate-der";
        } else {
          bytes = new Uint8Array(input);
        }
      } else {
        // Assume raw DER file.
        bytes = new Uint8Array(input);
        kind = "certificate-der";
      }
    } else {
      const trimmed = input.trim();
      if (!trimmed) return { ok: false, error: "Input is empty." };
      if (trimmed.length > MAX_INPUT_BYTES) {
        return { ok: false, error: "Input is too large (max 2 MB)." };
      }
      const blocks = extractPemBlocks(trimmed, "CERTIFICATE");
      if (blocks.length > 0) {
        try {
          bytes = pemBlockToDerBytes(blocks[0]!);
          kind = "certificate-der";
        } catch {
          return { ok: false, error: "PEM block is not valid base64." };
        }
      } else {
        bytes = new TextEncoder().encode(input);
      }
    }

    const [s1, s256, s512] = await Promise.all([
      crypto.subtle.digest("SHA-1", bytes as BufferSource),
      crypto.subtle.digest("SHA-256", bytes as BufferSource),
      crypto.subtle.digest("SHA-512", bytes as BufferSource),
    ]);

    return {
      ok: true,
      result: {
        kind,
        byteLength: bytes.byteLength,
        sha1: bufToHexColon(s1),
        sha256: bufToHexColon(s256),
        sha512: bufToHexColon(s512),
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg.split("\n")[0]!.slice(0, 240) };
  }
}
