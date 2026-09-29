/**
 * Certificate diff: decode two certificates locally and compare
 * field-by-field. Reuses the decoder so semantics stay identical.
 */

import { decodeCertificateInput, type DecodedCertificate } from "./cert-decoder";

export interface DiffRow {
  field: string;
  a: string;
  b: string;
  same: boolean;
}

export type CertDiffOutcome =
  | { ok: true; rows: DiffRow[]; cnA: string; cnB: string }
  | { ok: false; error: string };

function fmtList(xs: string[]): string {
  return xs.length ? xs.join(", ") : "none";
}

function rowsFor(a: DecodedCertificate, b: DecodedCertificate): DiffRow[] {
  const pairs: Array<[string, string, string]> = [
    ["Subject", a.subject, b.subject],
    ["Issuer", a.issuer, b.issuer],
    ["Serial (hex)", a.serial, b.serial],
    ["Not Before", a.notBefore, b.notBefore],
    ["Not After", a.notAfter, b.notAfter],
    ["Validity (days)", String(a.validityDays), String(b.validityDays)],
    [
      "SAN",
      a.san.map((s) => `${s.type}:${s.value}`).join(" ") || "none",
      b.san.map((s) => `${s.type}:${s.value}`).join(" ") || "none",
    ],
    [
      "Public key",
      `${a.publicKey.algorithm}${a.publicKey.keySize ? ` ${a.publicKey.keySize}` : ""}${a.publicKey.namedCurve ? ` ${a.publicKey.namedCurve}` : ""}`,
      `${b.publicKey.algorithm}${b.publicKey.keySize ? ` ${b.publicKey.keySize}` : ""}${b.publicKey.namedCurve ? ` ${b.publicKey.namedCurve}` : ""}`,
    ],
    ["Signature", a.signatureAlgorithm, b.signatureAlgorithm],
    ["SHA-256", a.fingerprintSha256, b.fingerprintSha256],
    ["CA", a.isCA ? "TRUE" : "false", b.isCA ? "TRUE" : "false"],
    ["Key Usage", fmtList(a.keyUsage), fmtList(b.keyUsage)],
    ["Ext. Key Usage", fmtList(a.extendedKeyUsage), fmtList(b.extendedKeyUsage)],
  ];
  return pairs.map(([field, av, bv]) => ({
    field,
    a: av,
    b: bv,
    same: av === bv,
  }));
}

export async function diffCertificates(
  pemA: string,
  pemB: string
): Promise<CertDiffOutcome> {
  const [ra, rb] = await Promise.all([
    decodeCertificateInput(pemA),
    decodeCertificateInput(pemB),
  ]);
  if (!ra.ok) return { ok: false, error: `Certificate A: ${ra.error}` };
  if (!rb.ok) return { ok: false, error: `Certificate B: ${rb.error}` };
  const a = ra.certs[0]!;
  const b = rb.certs[0]!;
  return {
    ok: true,
    rows: rowsFor(a, b),
    cnA: a.subjectDN["CN"]?.[0] ?? a.subject,
    cnB: b.subjectDN["CN"]?.[0] ?? b.subject,
  };
}
