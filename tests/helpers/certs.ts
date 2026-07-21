/**
 * Test-certificate factory.
 *
 * The six modules that produce this project's verdicts had no tests at all
 * (#66), largely because there were no fixtures to test them with. Generating
 * certificates at run time beats committing PEM blobs: the dates stay relative
 * to "now", so an expiry test cannot rot into a false pass in six months.
 *
 * @peculiar/x509 needs a crypto provider under happy-dom; Node's webcrypto is
 * the same implementation the browser uses for these operations.
 */

import { webcrypto } from "node:crypto";
import * as x509 from "@peculiar/x509";

x509.cryptoProvider.set(webcrypto as unknown as Crypto);

const ALG: RsaHashedKeyGenParams = {
  name: "RSASSA-PKCS1-v1_5",
  hash: "SHA-256",
  publicExponent: new Uint8Array([1, 0, 1]),
  modulusLength: 2048,
};

export const DAY = 86_400_000;

export interface CertOptions {
  /** Subject CN, e.g. "example.com". */
  cn: string;
  notBefore?: Date;
  notAfter?: Date;
  /** Omit to produce a self-signed certificate. */
  issuer?: { cert: x509.X509Certificate; keys: CryptoKeyPair };
  /** basicConstraints CA flag. Omit for no basicConstraints extension at all. */
  ca?: boolean;
  /** subjectAltName DNS entries. */
  dns?: string[];
  /** subjectAltName IP entries. */
  ip?: string[];
}

export interface GeneratedCert {
  cert: x509.X509Certificate;
  keys: CryptoKeyPair;
  pem: string;
}

export async function makeCert(opts: CertOptions): Promise<GeneratedCert> {
  const keys = (await webcrypto.subtle.generateKey(ALG, true, [
    "sign",
    "verify",
  ])) as CryptoKeyPair;

  const extensions: x509.Extension[] = [];
  if (opts.ca !== undefined) {
    extensions.push(new x509.BasicConstraintsExtension(opts.ca, undefined, true));
  }
  if (opts.dns?.length || opts.ip?.length) {
    extensions.push(
      new x509.SubjectAlternativeNameExtension([
        ...(opts.dns ?? []).map((value) => ({ type: "dns" as const, value })),
        ...(opts.ip ?? []).map((value) => ({ type: "ip" as const, value })),
      ]),
    );
  }

  const now = Date.now();
  const cert = await x509.X509CertificateGenerator.create({
    serialNumber: Math.floor(now % 1_000_000).toString(16).padStart(8, "0"),
    subject: `CN=${opts.cn}`,
    issuer: opts.issuer ? opts.issuer.cert.subject : `CN=${opts.cn}`,
    notBefore: opts.notBefore ?? new Date(now - DAY),
    notAfter: opts.notAfter ?? new Date(now + 90 * DAY),
    signingKey: opts.issuer ? opts.issuer.keys.privateKey : keys.privateKey,
    publicKey: keys.publicKey,
    extensions,
  });

  return { cert, keys, pem: cert.toString("pem") };
}

/** An expired self-signed certificate — the shape that used to read "valid". */
export function expiredWindow(): { notBefore: Date; notAfter: Date } {
  const now = Date.now();
  return {
    notBefore: new Date(now - 400 * DAY),
    notAfter: new Date(now - 200 * DAY),
  };
}
