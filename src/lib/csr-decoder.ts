import {
  Pkcs10CertificateRequest,
  SubjectAlternativeNameExtension,
  BasicConstraintsExtension,
  KeyUsagesExtension,
  ExtendedKeyUsageExtension,
  ChallengePasswordAttribute,
  ExtensionsAttribute,
} from "@peculiar/x509";
import {
  bufToHexColon,
  extractPemBlocks,
  MAX_INPUT_BYTES,
  parseDN,
  sha,
  wrapAsPem,
} from "./util";
import type { SanEntry } from "./cert-decoder";

export interface DecodedCSR {
  subject: string;
  subjectDN: Record<string, string[]>;
  signatureAlgorithm: string;
  publicKey: {
    algorithm: string;
    keySize?: number;
    namedCurve?: string;
  };
  san: SanEntry[];
  isCA: boolean;
  pathLenConstraint?: number;
  keyUsage: string[];
  extendedKeyUsage: string[];
  challengePassword?: string;
  unhandledOidAttrs: string[];
  signatureValid?: boolean;
  signatureCheckError?: string;
  spkiFingerprintSha256: string;
  pem: string;
}

export type CSRDecodeResult =
  | { ok: true; csrs: DecodedCSR[] }
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

interface KeyAlg {
  name: string;
  modulusLength?: number;
  namedCurve?: string;
}

async function decodeOne(pem: string): Promise<DecodedCSR> {
  const csr = new Pkcs10CertificateRequest(pem);

  let san: SanEntry[] = [];
  let isCA = false;
  let pathLenConstraint: number | undefined;
  let keyUsage: string[] = [];
  let extendedKeyUsage: string[] = [];
  let challengePassword: string | undefined;
  const unhandledOidAttrs: string[] = [];

  for (const attr of csr.attributes) {
    if (attr instanceof ExtensionsAttribute) {
      for (const ext of attr.items) {
        if (ext instanceof SubjectAlternativeNameExtension) {
          san = ext.names.items.map((n) => ({
            type: SAN_TYPE_LABEL[n.type] ?? "Other",
            value: n.value,
          }));
        } else if (ext instanceof BasicConstraintsExtension) {
          isCA = ext.ca;
          pathLenConstraint = ext.pathLength;
        } else if (ext instanceof KeyUsagesExtension) {
          const u = ext.usages;
          keyUsage = KEY_USAGE_FLAGS.filter(([bit]) => (u & bit) === bit).map(
            ([, label]) => label
          );
        } else if (ext instanceof ExtendedKeyUsageExtension) {
          extendedKeyUsage = ext.usages.map((oid) => {
            const key = String(oid);
            return EKU_LABELS[key] ?? key;
          });
        }
      }
    } else if (attr instanceof ChallengePasswordAttribute) {
      challengePassword = attr.password;
    } else {
      unhandledOidAttrs.push(attr.type);
    }
  }

  const alg = csr.publicKey.algorithm as KeyAlg;
  let publicKey = {
    algorithm: alg.name ?? "unknown",
    keySize: alg.modulusLength,
    namedCurve: alg.namedCurve,
  };

  if (!publicKey.keySize && !publicKey.namedCurve) {
    const spki = csr.publicKey.rawData;
    const probes: Array<
      AlgorithmIdentifier | RsaHashedImportParams | EcKeyImportParams
    > = [
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" } as RsaHashedImportParams,
      { name: "ECDSA", namedCurve: "P-256" } as EcKeyImportParams,
      { name: "ECDSA", namedCurve: "P-384" } as EcKeyImportParams,
      { name: "ECDSA", namedCurve: "P-521" } as EcKeyImportParams,
      { name: "Ed25519" },
    ];
    for (const a of probes) {
      try {
        const k = await crypto.subtle.importKey("spki", spki, a, true, [
          "verify",
        ]);
        const got = k.algorithm as KeyAlg;
        if (got.modulusLength) {
          publicKey = {
            algorithm: "RSA",
            keySize: got.modulusLength,
            namedCurve: undefined,
          };
        } else if (got.namedCurve) {
          publicKey = {
            algorithm: "EC",
            keySize: undefined,
            namedCurve: got.namedCurve,
          };
        } else {
          publicKey = {
            algorithm: got.name,
            keySize: undefined,
            namedCurve: undefined,
          };
        }
        break;
      } catch {
        // try next
      }
    }
  }

  const sig = csr.signatureAlgorithm as {
    name?: string;
    hash?: { name: string } | string;
  };
  const sigHash =
    typeof sig?.hash === "string" ? sig.hash : sig?.hash?.name;
  const signatureAlgorithm = sigHash
    ? `${sig.name ?? "unknown"} with ${sigHash}`
    : (sig?.name ?? "unknown");

  let signatureValid: boolean | undefined;
  let signatureCheckError: string | undefined;
  try {
    signatureValid = await csr.verify();
  } catch (err) {
    signatureCheckError = err instanceof Error ? err.message : String(err);
  }

  const spkiHash = await sha("SHA-256", csr.publicKey.rawData);
  const spkiFingerprintSha256 = bufToHexColon(spkiHash);

  return {
    subject: csr.subject,
    subjectDN: parseDN(csr.subject),
    signatureAlgorithm,
    publicKey,
    san,
    isCA,
    pathLenConstraint,
    keyUsage,
    extendedKeyUsage,
    challengePassword,
    unhandledOidAttrs,
    signatureValid,
    signatureCheckError,
    spkiFingerprintSha256,
    pem,
  };
}

export async function decodeCSRInput(
  input: string | ArrayBuffer
): Promise<CSRDecodeResult> {
  try {
    let blocks: string[] = [];
    if (input instanceof ArrayBuffer) {
      if (input.byteLength > MAX_INPUT_BYTES) {
        return { ok: false, error: "File too large (max 2 MB)." };
      }
      const text = new TextDecoder().decode(input).trim();
      if (text.includes("-----BEGIN")) {
        blocks =
          extractPemBlocks(text, "CERTIFICATE REQUEST")
            .concat(extractPemBlocks(text, "NEW CERTIFICATE REQUEST"));
      } else {
        // assume DER → wrap
        const csr = new Pkcs10CertificateRequest(input);
        blocks = [csr.toString("pem")];
      }
    } else {
      const trimmed = input.trim();
      if (!trimmed) return { ok: false, error: "Input is empty." };
      if (trimmed.length > MAX_INPUT_BYTES) {
        return { ok: false, error: "Input too large (max 2 MB)." };
      }
      if (trimmed.includes("-----BEGIN")) {
        blocks = extractPemBlocks(trimmed, "CERTIFICATE REQUEST").concat(
          extractPemBlocks(trimmed, "NEW CERTIFICATE REQUEST")
        );
      } else if (/^[A-Za-z0-9+/=\s]+$/.test(trimmed)) {
        blocks = [wrapAsPem("CERTIFICATE REQUEST", trimmed)];
      }
    }

    if (blocks.length === 0) {
      return {
        ok: false,
        error:
          "No CSR block found. Paste content starting with -----BEGIN CERTIFICATE REQUEST-----.",
      };
    }

    const csrs = await Promise.all(blocks.map(decodeOne));
    return { ok: true, csrs };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      error: `Could not parse CSR: ${msg.split("\n")[0]!.slice(0, 240)}`,
    };
  }
}

export const SAMPLE_CSR = `-----BEGIN CERTIFICATE REQUEST-----
MIIDFTCCAf0CAQAwgY0xCzAJBgNVBAYTAklUMQ4wDAYDVQQIDAVMYXppbzENMAsG
A1UEBwwEUm9tZTERMA8GA1UECgwIQ2VydE1hdGUxFDASBgNVBAsMC0VuZ2luZWVy
aW5nMRUwEwYDVQQDDAxleGFtcGxlLnRlc3QxHzAdBgkqhkiG9w0BCQEWEG9wc0Bj
ZXJ0bWF0ZS5vcmcwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQDegWZs
VOOcG/Arm2PPGWT9+FJAquhGeUzZXvp2UT9ajBpo6fh3BF2gCjORdHiC3mejSCji
49S/RgwIzES2hRd6aYJI0JAMzsGTXj9iGGyLjHmsQLrLGkfbyxnlJUxxkg8Dz6eL
Mawl3fN8eWiSSDXoUiNLdyh5mZPedsMz5w1JYSWrQw8dqV/G+H5W+4rF6x/qe0dX
r9o+A6kZQZ6Ha6KIV/mlgIZwWYS11kriSUoHHaxKOpc6YL8/7F7AdqDGDPF1zFiz
V2gdag5OMevV0jdSriPH5zDU77aXAd1sgu8ZAW5tPG6L7eGNc3ot+EQabByxCFyl
Wiecll49s8YFiMTjAgMBAAGgQjBABgkqhkiG9w0BCQ4xMzAxMC8GA1UdEQQoMCaC
DGV4YW1wbGUudGVzdIIQd3d3LmV4YW1wbGUudGVzdIcExjNkATANBgkqhkiG9w0B
AQsFAAOCAQEASYR2GJ/75feQn6f5/euapmv8gFc91Bo2qjiTCsayvurT9AQteoWI
qQeN27m0ZzulTreN7il/oqP98RkXHWfpIo9IMWNHNKUlgMFIQ2yVZlxUmaUu31KD
2dy9JsLPBHEkUrxOil1t2xVLYVpXShl5/gEOCOogCgpIRjdZyCtdjhe2GXhT1E0L
bkx0QlsC0W8NZaQ1V1a1YdUB9WFSTz7l4YjoSAD1WYaCkLijgwb4eOoSaZXoQLEB
b4k/PYTfgyu0+CzPU8XAMscmHYm7L24MCcgm7P2LPvuAIVNeR38Tfm2hybZPn6lQ
n+ftrn5jSPzhq5xJbsXx2VF9oxWhRoNhpQ==
-----END CERTIFICATE REQUEST-----`;
