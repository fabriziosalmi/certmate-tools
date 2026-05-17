/**
 * Hostname matching per RFC 6125 §6.4 with the common practice rules used by
 * the browser CA/B Forum: a wildcard label may appear only as the left-most
 * label and only with a single asterisk; CN fallback is only honored when the
 * certificate has no SAN entries (legacy behaviour browsers no longer accept,
 * but useful as a diagnostic).
 */

import { X509Certificate, SubjectAlternativeNameExtension } from "@peculiar/x509";
import { extractPemBlocks, parseDN, wrapAsPem } from "./util";

export interface HostnameMatchResult {
  hostname: string;
  matched: boolean;
  matchedEntry?: { type: string; value: string };
  reason: string;
  notes: string[];
  rules: HostnameRuleResult[];
}

export interface HostnameRuleResult {
  rule: string;
  ok: boolean;
  detail: string;
}

export interface HostnameValidationInput {
  pem: string;
  hostname: string;
}

export type HostnameValidationResult =
  | { ok: true; results: HostnameMatchResult[] }
  | { ok: false; error: string };

function loadCertificate(input: string): X509Certificate {
  const trimmed = input.trim();
  if (!trimmed) throw new Error("Certificate is empty.");
  let pem = trimmed;
  if (!trimmed.includes("-----BEGIN CERTIFICATE-----")) {
    if (/^[A-Za-z0-9+/=\s]+$/.test(trimmed)) {
      pem = wrapAsPem("CERTIFICATE", trimmed);
    } else {
      throw new Error("Certificate input is not PEM.");
    }
  }
  const blocks = extractPemBlocks(pem, "CERTIFICATE");
  if (blocks.length === 0) throw new Error("No certificate block found.");
  return new X509Certificate(blocks[0]!);
}

function normalizeHostname(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/\.$/, "");
}

function matchesWildcardLabel(pattern: string, label: string): boolean {
  // RFC 6125 §6.4.3 — wildcard must be the left-most label.
  // The asterisk MUST NOT match domain labels that themselves contain a dot.
  // We don't enforce ≥2 labels right of the wildcard here; the caller does.
  if (!pattern.includes("*")) return pattern === label;
  if (pattern === "*") return label.length > 0;
  // Only a single wildcard allowed.
  if ((pattern.match(/\*/g) ?? []).length !== 1) return false;
  // Browsers reject embedded wildcards inside the label like 'a*b'.
  if (pattern !== "*" && pattern.indexOf("*") !== 0) return false;
  const tail = pattern.slice(1);
  if (!label.endsWith(tail)) return false;
  // The asterisk must consume at least one character.
  return label.length > tail.length;
}

interface PatternMatch {
  ok: boolean;
  reason: string;
}

function matchesPattern(pattern: string, hostname: string): PatternMatch {
  const pat = pattern.toLowerCase().replace(/\.$/, "");
  const host = hostname.toLowerCase().replace(/\.$/, "");

  if (pat === host) return { ok: true, reason: "exact match" };

  // Wildcard rule: pat starts with "*." and only one asterisk; wildcard label
  // must contain only the asterisk; pat must have at least two domain labels
  // right of the wildcard (e.g. *.example.com is OK, *.com is rejected per
  // browser policy / RFC 6125 advice).
  if (!pat.startsWith("*.")) return { ok: false, reason: "no wildcard at left-most label" };
  if ((pat.match(/\*/g) ?? []).length !== 1)
    return { ok: false, reason: "multiple wildcards not allowed" };
  const patRest = pat.slice(2);
  const labels = patRest.split(".");
  if (labels.length < 2)
    return { ok: false, reason: "wildcard right of fewer than 2 labels (e.g. *.com is rejected)" };
  const hostLabels = host.split(".");
  if (hostLabels.length !== labels.length + 1)
    return { ok: false, reason: "label-count mismatch" };
  if (hostLabels.slice(1).join(".") !== patRest)
    return { ok: false, reason: "right-of-wildcard suffix mismatch" };
  // Wildcard label can match only a single label and only if non-empty.
  if (!matchesWildcardLabel("*", hostLabels[0]!))
    return { ok: false, reason: "wildcard could not match the host's left-most label" };

  return { ok: true, reason: `wildcard "${pat}" matches "${host}"` };
}

function checkIDN(hostname: string): HostnameRuleResult {
  // RFC 6125 only allows xn-- (Punycode) for A-labels in cert SAN.
  // Reject U-label / mixed input that contains non-ASCII.
  const ascii = /^[\x00-\x7f]*$/.test(hostname);
  return {
    rule: "IDN must be A-label (Punycode)",
    ok: ascii,
    detail: ascii
      ? "hostname is ASCII / Punycode"
      : "hostname contains non-ASCII Unicode — convert to xn-- form before matching",
  };
}

function checkLength(hostname: string): HostnameRuleResult {
  // Each label ≤ 63 octets, full name ≤ 253 octets (DNS rule).
  const labels = hostname.split(".");
  const tooLong = labels.find((l) => l.length > 63);
  const totalOk = hostname.length <= 253;
  return {
    rule: "DNS length",
    ok: !tooLong && totalOk,
    detail: tooLong
      ? `label "${tooLong}" exceeds 63 octets`
      : !totalOk
        ? `full hostname is ${hostname.length} octets (> 253)`
        : "label and total length within DNS limits",
  };
}

export async function validateHostname(
  input: HostnameValidationInput
): Promise<HostnameValidationResult> {
  try {
    const cert = loadCertificate(input.pem);

    const sanExt = cert.getExtension<SubjectAlternativeNameExtension>(
      SubjectAlternativeNameExtension
    );
    const dnsSans = (sanExt?.names.items ?? [])
      .filter((n) => n.type === "dns")
      .map((n) => n.value);
    const ipSans = (sanExt?.names.items ?? [])
      .filter((n) => n.type === "ip")
      .map((n) => n.value);

    const subjectDN = parseDN(cert.subject);
    const cn = subjectDN["CN"]?.[0];

    const hostnames = input.hostname
      .split(/[\s,;]+/)
      .map(normalizeHostname)
      .filter(Boolean);

    if (hostnames.length === 0) {
      return { ok: false, error: "No hostnames to test." };
    }

    const results: HostnameMatchResult[] = hostnames.map((h) => {
      const notes: string[] = [];
      const rules: HostnameRuleResult[] = [
        checkIDN(h),
        checkLength(h),
      ];

      let matched = false;
      let matchedEntry: { type: string; value: string } | undefined;
      let reason = "no SAN entry covers this hostname";

      // IP exact match (no wildcards)
      if (/^[\d.:a-fA-F]+$/.test(h) && ipSans.includes(h)) {
        matched = true;
        matchedEntry = { type: "IP", value: h };
        reason = `IP SAN exact match (${h})`;
      } else {
        for (const san of dnsSans) {
          const r = matchesPattern(san, h);
          if (r.ok) {
            matched = true;
            matchedEntry = { type: "DNS", value: san };
            reason = `DNS SAN: ${r.reason}`;
            break;
          }
        }
      }

      if (!matched && dnsSans.length === 0 && cn) {
        // Legacy CN fallback — browsers reject this since ~2017 but cert may be old.
        const r = matchesPattern(cn, h);
        if (r.ok) {
          matched = true;
          matchedEntry = { type: "CN", value: cn };
          reason = `CN fallback (${r.reason})`;
          notes.push(
            "Modern browsers reject CN fallback for TLS. Add SAN entries."
          );
        }
      }

      if (dnsSans.length === 0 && ipSans.length === 0) {
        notes.push(
          "Certificate has no SAN extension — modern TLS clients will reject it regardless of CN."
        );
      }

      rules.push({
        rule: "SAN entry covers hostname",
        ok: matched,
        detail: reason,
      });

      return { hostname: h, matched, matchedEntry, reason, notes, rules };
    });

    return { ok: true, results };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg.split("\n")[0]!.slice(0, 240) };
  }
}

export function certificateAsPem(input: string): string | null {
  try {
    const cert = loadCertificate(input);
    return cert.toString("pem");
  } catch {
    return null;
  }
}

export const SAMPLE_BADSSL_HOSTNAMES = [
  "example.com",
  "www.example.com",
  "api.example.com",
  "foo.bar.example.com",
];
