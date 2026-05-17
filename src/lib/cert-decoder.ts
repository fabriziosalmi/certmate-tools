import {
  X509Certificate,
  SubjectAlternativeNameExtension,
  BasicConstraintsExtension,
  KeyUsagesExtension,
  ExtendedKeyUsageExtension,
  AuthorityKeyIdentifierExtension,
  SubjectKeyIdentifierExtension,
  CertificatePolicyExtension,
  AuthorityInfoAccessExtension,
  CRLDistributionPointsExtension,
} from "@peculiar/x509";
import {
  bufToHexColon,
  diffDays,
  extractPemBlocks,
  hexToBigIntDecimal,
  MAX_INPUT_BYTES,
  MAX_PEM_BLOCKS,
  parseDN,
  safeHttpUrl,
  sha,
  wrapAsPem,
} from "./util";

export interface DecodedPublicKey {
  algorithm: string;
  keySize?: number;
  namedCurve?: string;
}

export interface DecodedCertificate {
  subject: string;
  subjectDN: Record<string, string[]>;
  issuer: string;
  issuerDN: Record<string, string[]>;
  serial: string;
  serialDec: string;
  selfSigned: boolean;

  notBefore: string;
  notAfter: string;
  validityDays: number;
  daysUntilExpiry: number;
  expired: boolean;
  notYetValid: boolean;

  signatureAlgorithm: string;
  publicKey: DecodedPublicKey;

  san: SanEntry[];
  isCA: boolean;
  pathLenConstraint?: number;
  keyUsage: string[];
  extendedKeyUsage: string[];
  authorityKeyId?: string;
  subjectKeyId?: string;
  policies: string[];
  aiaIssuers: string[];
  aiaOcsp: string[];
  crlUrls: string[];

  fingerprintSha1: string;
  fingerprintSha256: string;
  fingerprintSha512: string;

  pem: string;
}

export interface SanEntry {
  type: "DNS" | "IP" | "Email" | "URI" | "DirName" | "Other";
  value: string;
}

export type DecodeResult =
  | { ok: true; certs: DecodedCertificate[] }
  | { ok: false; error: string };

const SAN_TYPE_LABEL: Record<string, SanEntry["type"]> = {
  dns: "DNS",
  ip: "IP",
  email: "Email",
  url: "URI",
  dn: "DirName",
};

const KEY_USAGE_FLAGS: Array<[number, string]> = [
  [0x80, "Digital Signature"],
  [0x40, "Non Repudiation"],
  [0x20, "Key Encipherment"],
  [0x10, "Data Encipherment"],
  [0x08, "Key Agreement"],
  [0x04, "Certificate Sign"],
  [0x02, "CRL Sign"],
  [0x01, "Encipher Only"],
];

const EKU_LABELS: Record<string, string> = {
  "1.3.6.1.5.5.7.3.1": "TLS Web Server Authentication",
  "1.3.6.1.5.5.7.3.2": "TLS Web Client Authentication",
  "1.3.6.1.5.5.7.3.3": "Code Signing",
  "1.3.6.1.5.5.7.3.4": "Email Protection",
  "1.3.6.1.5.5.7.3.8": "Time Stamping",
  "1.3.6.1.5.5.7.3.9": "OCSP Signing",
};

function parseKeyUsage(usages: number): string[] {
  const result: string[] = [];
  for (const [bit, label] of KEY_USAGE_FLAGS) {
    if ((usages & bit) === bit) result.push(label);
  }
  return result;
}

interface PeculiarKeyAlgorithm {
  name: string;
  modulusLength?: number;
  namedCurve?: string;
  hash?: { name: string } | string;
}

async function inspectPublicKey(
  cert: X509Certificate
): Promise<DecodedPublicKey> {
  const alg = cert.publicKey.algorithm as PeculiarKeyAlgorithm;
  let name = alg.name ?? "unknown";
  let keySize = alg.modulusLength;
  let namedCurve = alg.namedCurve;

  // If runtime didn't populate modulusLength / namedCurve, fall back to a probe
  // via SubtleCrypto.importKey on the SPKI bytes — gives us proper algorithm
  // metadata for the few algorithms the browser exposes.
  if (!keySize && !namedCurve) {
    const spki = cert.publicKey.rawData;
    const probes: Array<{
      algo: AlgorithmIdentifier | RsaHashedImportParams | EcKeyImportParams;
      label?: string;
    }> = [
      { algo: { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" } as RsaHashedImportParams, label: "RSA" },
      { algo: { name: "ECDSA", namedCurve: "P-256" } as EcKeyImportParams, label: "EC P-256" },
      { algo: { name: "ECDSA", namedCurve: "P-384" } as EcKeyImportParams, label: "EC P-384" },
      { algo: { name: "ECDSA", namedCurve: "P-521" } as EcKeyImportParams, label: "EC P-521" },
      { algo: { name: "Ed25519" } as AlgorithmIdentifier },
      { algo: { name: "Ed448" } as AlgorithmIdentifier },
    ];

    for (const probe of probes) {
      try {
        const key = await crypto.subtle.importKey(
          "spki",
          spki,
          probe.algo,
          true,
          ["verify"]
        );
        const probed = key.algorithm as PeculiarKeyAlgorithm;
        if (probed.modulusLength) {
          name = "RSA";
          keySize = probed.modulusLength;
        } else if (probed.namedCurve) {
          name = "EC";
          namedCurve = probed.namedCurve;
        } else {
          name = probed.name;
        }
        break;
      } catch {
        // try the next algorithm
      }
    }
  }

  return { algorithm: name, keySize, namedCurve };
}

async function decodeOne(pemBlock: string): Promise<DecodedCertificate> {
  const cert = new X509Certificate(pemBlock);
  const raw = cert.rawData;

  const now = new Date();
  const notBefore = cert.notBefore;
  const notAfter = cert.notAfter;
  const validityDays = diffDays(notAfter, notBefore);
  const daysUntilExpiry = diffDays(notAfter, now);

  let san: SanEntry[] = [];
  let isCA = false;
  let pathLenConstraint: number | undefined;
  let keyUsage: string[] = [];
  let extendedKeyUsage: string[] = [];
  let authorityKeyId: string | undefined;
  let subjectKeyId: string | undefined;
  let policies: string[] = [];
  const aiaIssuers: string[] = [];
  const aiaOcsp: string[] = [];
  const crlUrls: string[] = [];

  for (const ext of cert.extensions) {
    if (ext instanceof SubjectAlternativeNameExtension) {
      san = ext.names.items.map((n) => ({
        type: SAN_TYPE_LABEL[n.type] ?? "Other",
        value: n.value,
      }));
    } else if (ext instanceof BasicConstraintsExtension) {
      isCA = ext.ca;
      pathLenConstraint = ext.pathLength;
    } else if (ext instanceof KeyUsagesExtension) {
      keyUsage = parseKeyUsage(ext.usages);
    } else if (ext instanceof ExtendedKeyUsageExtension) {
      extendedKeyUsage = ext.usages.map((oid) => {
        const key = String(oid);
        return EKU_LABELS[key] ?? key;
      });
    } else if (ext instanceof AuthorityKeyIdentifierExtension) {
      if (ext.keyId) authorityKeyId = ext.keyId.toUpperCase();
    } else if (ext instanceof SubjectKeyIdentifierExtension) {
      subjectKeyId = ext.keyId.toUpperCase();
    } else if (ext instanceof CertificatePolicyExtension) {
      policies = [...ext.policies];
    } else if (ext instanceof AuthorityInfoAccessExtension) {
      for (const gn of ext.caIssuers ?? []) {
        const safe = safeHttpUrl(gn?.value);
        if (safe) aiaIssuers.push(safe);
      }
      for (const gn of ext.ocsp ?? []) {
        const safe = safeHttpUrl(gn?.value);
        if (safe) aiaOcsp.push(safe);
      }
    } else if (ext instanceof CRLDistributionPointsExtension) {
      for (const dp of ext.distributionPoints) {
        const fullName = dp.distributionPoint?.fullName ?? [];
        for (const gn of fullName) {
          const safe = safeHttpUrl(gn.uniformResourceIdentifier);
          if (safe) crlUrls.push(safe);
        }
      }
    }
  }

  const publicKey = await inspectPublicKey(cert);

  const serial = cert.serialNumber.toUpperCase();
  const serialDec = hexToBigIntDecimal(serial);

  const sigAlg = cert.signatureAlgorithm as {
    name?: string;
    hash?: { name: string } | string;
  };
  const sigName = sigAlg?.name ?? "unknown";
  const sigHash =
    typeof sigAlg?.hash === "string"
      ? sigAlg.hash
      : sigAlg?.hash?.name;
  const signatureAlgorithm = sigHash ? `${sigName} with ${sigHash}` : sigName;

  const [s1, s256, s512] = await Promise.all([
    sha("SHA-1", raw),
    sha("SHA-256", raw),
    sha("SHA-512", raw),
  ]);

  return {
    subject: cert.subject,
    subjectDN: parseDN(cert.subject),
    issuer: cert.issuer,
    issuerDN: parseDN(cert.issuer),
    serial,
    serialDec,
    selfSigned: cert.subject === cert.issuer,
    notBefore: notBefore.toISOString(),
    notAfter: notAfter.toISOString(),
    validityDays,
    daysUntilExpiry,
    expired: daysUntilExpiry < 0,
    notYetValid: notBefore.getTime() > now.getTime(),
    signatureAlgorithm,
    publicKey,
    san,
    isCA,
    pathLenConstraint,
    keyUsage,
    extendedKeyUsage,
    authorityKeyId,
    subjectKeyId,
    policies,
    aiaIssuers,
    aiaOcsp,
    crlUrls,
    fingerprintSha1: bufToHexColon(s1),
    fingerprintSha256: bufToHexColon(s256),
    fingerprintSha512: bufToHexColon(s512),
    pem: pemBlock,
  };
}

export async function decodeCertificateInput(
  input: string | ArrayBuffer
): Promise<DecodeResult> {
  try {
    let pemBlocks: string[] = [];

    if (input instanceof ArrayBuffer) {
      if (input.byteLength > MAX_INPUT_BYTES) {
        return { ok: false, error: "File is too large (max 2 MB)." };
      }
      const text = new TextDecoder().decode(input).trim();
      if (text.includes("-----BEGIN CERTIFICATE-----")) {
        pemBlocks = extractPemBlocks(text, "CERTIFICATE");
      } else {
        // Treat as DER (binary).
        const cert = new X509Certificate(input);
        pemBlocks = [cert.toString("pem")];
      }
    } else {
      const trimmed = input.trim();
      if (!trimmed) {
        return { ok: false, error: "Input is empty." };
      }
      if (trimmed.length > MAX_INPUT_BYTES) {
        return { ok: false, error: "Input is too large (max 2 MB)." };
      }
      if (trimmed.includes("-----BEGIN CERTIFICATE-----")) {
        pemBlocks = extractPemBlocks(trimmed, "CERTIFICATE");
      } else if (/^[A-Za-z0-9+/=\s]+$/.test(trimmed)) {
        pemBlocks = [wrapAsPem("CERTIFICATE", trimmed)];
      } else {
        return {
          ok: false,
          error:
            "Input does not look like a PEM certificate or base64 DER. Paste a block starting with -----BEGIN CERTIFICATE-----.",
        };
      }
    }

    if (pemBlocks.length === 0) {
      return { ok: false, error: "No certificate block found in the input." };
    }
    if (pemBlocks.length > MAX_PEM_BLOCKS) {
      return {
        ok: false,
        error: `Too many certificate blocks (limit ${MAX_PEM_BLOCKS}).`,
      };
    }

    const certs = await Promise.all(pemBlocks.map(decodeOne));
    return { ok: true, certs };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Avoid leaking internal stack traces — keep messages crisp and short.
    const short = msg.split("\n")[0]!.slice(0, 240);
    return { ok: false, error: `Could not parse certificate: ${short}` };
  }
}

export const SAMPLE_CERT_ISRG_X1 = `-----BEGIN CERTIFICATE-----
MIIFazCCA1OgAwIBAgIRAIIQz7DSQONZRGPgu2OCiwAwDQYJKoZIhvcNAQELBQAw
TzELMAkGA1UEBhMCVVMxKTAnBgNVBAoTIEludGVybmV0IFNlY3VyaXR5IFJlc2Vh
cmNoIEdyb3VwMRUwEwYDVQQDEwxJU1JHIFJvb3QgWDEwHhcNMTUwNjA0MTEwNDM4
WhcNMzUwNjA0MTEwNDM4WjBPMQswCQYDVQQGEwJVUzEpMCcGA1UEChMgSW50ZXJu
ZXQgU2VjdXJpdHkgUmVzZWFyY2ggR3JvdXAxFTATBgNVBAMTDElTUkcgUm9vdCBY
MTCCAiIwDQYJKoZIhvcNAQEBBQADggIPADCCAgoCggIBAK3oJHP0FDfzm54rVygc
h77ct984kIxuPOZXoHj3dcKi/vVqbvYATyjb3miGbESTtrFj/RQSa78f0uoxmyF+
0TM8ukj13Xnfs7j/EvEhmkvBioZxaUpmZmyPfjxwv60pIgbz5MDmgK7iS4+3mX6U
A5/TR5d8mUgjU+g4rk8Kb4Mu0UlXjIB0ttov0DiNewNwIRt18jA8+o+u3dpjq+sW
T8KOEUt+zwvo/7V3LvSye0rgTBIlDHCNAymg4VMk7BPZ7hm/ELNKjD+Jo2FR3qyH
B5T0Y3HsLuJvW5iB4YlcNHlsdu87kGJ55tukmi8mxdAQ4Q7e2RCOFvu396j3x+UC
B5iPNgiV5+I3lg02dZ77DnKxHZu8A/lJBdiB3QW0KtZB6awBdpUKD9jf1b0SHzUv
KBds0pjBqAlkd25HN7rOrFleaJ1/ctaJxQZBKT5ZPt0m9STJEadao0xAH0ahmbWn
OlFuhjuefXKnEgV4We0+UXgVCwOPjdAvBbI+e0ocS3MFEvzG6uBQE3xDk3SzynTn
jh8BCNAw1FtxNrQHusEwMFxIt4I7mKZ9YIqioymCzLq9gwQbooMDQaHWBfEbwrbw
qHyGO0aoSCqI3Haadr8faqU9GY/rOPNk3sgrDQoo//fb4hVC1CLQJ13hef4Y53CI
rU7m2Ys6xt0nUW7/vGT1M0NPAgMBAAGjQjBAMA4GA1UdDwEB/wQEAwIBBjAPBgNV
HRMBAf8EBTADAQH/MB0GA1UdDgQWBBR5tFnme7bl5AFzgAiIyBpY9umbbjANBgkq
hkiG9w0BAQsFAAOCAgEAVR9YqbyyqFDQDLHYGmkgJykIrGF1XIpu+ILlaS/V9lZL
ubhzEFnTIZd+50xx+7LSYK05qAvqFyFWhfFQDlnrzuBZ6brJFe+GnY+EgPbk6ZGQ
3BebYhtF8GaV0nxvwuo77x/Py9auJ/GpsMiu/X1+mvoiBOv/2X/qkSsisRcOj/KK
NFtY2PwByVS5uCbMiogziUwthDyC3+6WVwW6LLv3xLfHTjuCvjHIInNzktHCgKQ5
ORAzI4JMPJ+GslWYHb4phowim57iaztXOoJwTdwJx4nLCgdNbOhdjsnvzqvHu7Ur
TkXWStAmzOVyyghqpZXjFaH3pO3JLF+l+/+sKAIuvtd7u+Nxe5AW0wdeRlN8NwdC
jNPElpzVmbUq4JUagEiuTDkHzsxHpFKVK7q4+63SM1N95R1NbdWhscdCb+ZAJzVc
oyi3B43njTOQ5yOf+1CceWxG1bQVs5ZufpsMljq4Ui0/1lvh+wjChP4kqKOJ2qxq
4RgqsahDYVvTH9w7jXbyLeiNdd8XM2w9U/t7y0Ff/9yi0GE44Za4rF2LN9d11TPA
mRGunUHBcnWEvgJBQl9nJEiU0Zsnvgc/ubhPgXRR4Xq37Z0j4r7g1SgEEzwxA57d
emyPxgcYxn/eR44/KJ4EBs+lVDR3veyJm+kXQ99b21/+jh5Xos1AnX5iItreGCc=
-----END CERTIFICATE-----`;
