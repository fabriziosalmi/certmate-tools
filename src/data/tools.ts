export type Category =
  | "decode"
  | "validate"
  | "inspect"
  | "monitor"
  | "compliance"
  | "acme";

export interface InternalTool {
  slug: string;
  title: string;
  tagline: string;
  category: Category;
  keywords: string[];
  status: "live" | "soon";
}

export interface ExternalTool {
  name: string;
  url: string;
  why: string;
  category: Category;
  openSource?: string;
}

export const categories: Record<Category, { label: string; blurb: string }> = {
  decode: {
    label: "Decode & inspect",
    blurb: "Parse certificates, CSRs and keys in your browser — never uploaded.",
  },
  validate: {
    label: "Validate",
    blurb: "Chains, hostnames, key/cert pairs — formal checks against RFC 5280 / 6125.",
  },
  inspect: {
    label: "Probe & scan",
    blurb: "Live TLS handshakes, security headers, OCSP / CRL revocation status.",
  },
  monitor: {
    label: "Monitor",
    blurb: "Certificate transparency search, expiry inventory, alerting.",
  },
  acme: {
    label: "ACME helpers",
    blurb: "External account binding, DNS-01 challenge math, provider quick-refs.",
  },
  compliance: {
    label: "Compliance EU",
    blurb: "NIS2, DORA, eIDAS 2.0 — TLS posture mapped to the articles.",
  },
};

export const internalTools: InternalTool[] = [
  {
    slug: "certificate-decoder",
    title: "Certificate Decoder",
    tagline:
      "Paste a PEM or DER certificate and inspect every field — Subject, SAN, validity, key, signature, fingerprints.",
    category: "decode",
    keywords: ["certificate decoder", "pem decoder", "x509 parser"],
    status: "live",
  },
  {
    slug: "csr-decoder",
    title: "CSR Decoder",
    tagline:
      "Paste a Certificate Signing Request and see CN, SAN, key parameters and challenge attributes.",
    category: "decode",
    keywords: ["csr decoder", "csr parser", "pkcs10 decoder"],
    status: "live",
  },
  {
    slug: "chain-builder",
    title: "Chain Builder & Validator",
    tagline:
      "Drag-drop PEM blocks, fetch intermediates by AIA, validate order and export a clean fullchain.pem.",
    category: "validate",
    keywords: ["certificate chain", "chain validator", "intermediate fetcher"],
    status: "live",
  },
  {
    slug: "key-matcher",
    title: "Key ↔ Cert Matcher",
    tagline:
      "Confirm that a private key and a certificate belong together. Files never leave your browser.",
    category: "validate",
    keywords: ["certificate key matcher", "private key match", "modulus check"],
    status: "live",
  },
  {
    slug: "hostname-validator",
    title: "Hostname / SAN Validator",
    tagline:
      "Test which hostnames a certificate covers under RFC 6125 — IDN, wildcards, CN fallback.",
    category: "validate",
    keywords: ["hostname validator", "san matcher", "wildcard certificate test"],
    status: "live",
  },
  {
    slug: "ct-search",
    title: "CT Log Search",
    tagline:
      "A fast, modern frontend over certificate transparency logs. Filter by issuer, date, wildcard.",
    category: "monitor",
    keywords: ["crt.sh alternative", "certificate transparency search"],
    status: "soon",
  },
  {
    slug: "bulk-expiry",
    title: "Bulk Expiry Checker",
    tagline:
      "Paste a list of hostnames — get a sortable table of issuer, expiry and a heads-up against the CA/B Forum validity schedule.",
    category: "monitor",
    keywords: [
      "bulk ssl expiry",
      "certificate expiry checker",
      "sc-081v3",
      "ca browser forum 47 day",
    ],
    status: "soon",
  },
  {
    slug: "acme-dns-01",
    title: "DNS-01 Challenge Helper",
    tagline:
      "Generate the exact TXT record an ACME server expects from your account key and token.",
    category: "acme",
    keywords: ["acme dns-01", "letsencrypt dns challenge", "txt record helper"],
    status: "live",
  },
  {
    slug: "nis2-tls-readiness",
    title: "NIS2 TLS Readiness Check",
    tagline:
      "Scan a domain and map TLS findings to NIS2 Art. 21(2)(h) and Det. ACN 379907/2025. Export evidence pack.",
    category: "compliance",
    keywords: ["nis2 tls", "audit certificati nis2", "nis2 compliance check"],
    status: "live",
  },
];

export const externalTools: ExternalTool[] = [
  {
    name: "Qualys SSL Labs",
    url: "https://www.ssllabs.com/ssltest/",
    why: "The reference TLS server grader. Slow but authoritative.",
    category: "inspect",
  },
  {
    name: "Hardenize",
    url: "https://www.hardenize.com/",
    why: "Fast multi-protocol scan: TLS, DNSSEC, HSTS, email security.",
    category: "inspect",
  },
  {
    name: "internet.nl",
    url: "https://internet.nl/",
    why: "EU benchmark for internet standards. Operated by the Dutch Internet Standards Platform.",
    category: "compliance",
    openSource: "https://github.com/internetstandards/Internet.nl",
  },
  {
    name: "Mozilla HTTP Observatory",
    url: "https://observatory.mozilla.org/",
    why: "Open-source security headers + cookies + TLS analyzer by Mozilla.",
    category: "inspect",
    openSource: "https://github.com/mozilla/http-observatory",
  },
  {
    name: "testssl.sh",
    url: "https://testssl.sh/",
    why: "The gold-standard self-hosted TLS scanner. CLI, no telemetry.",
    category: "inspect",
    openSource: "https://github.com/drwetter/testssl.sh",
  },
  {
    name: "crt.sh",
    url: "https://crt.sh/",
    why: "Comodo / Sectigo certificate transparency search. UI from 1998, data is unmatched.",
    category: "monitor",
  },
  {
    name: "SSLMate Cert Spotter",
    url: "https://sslmate.com/certspotter/",
    why: "CT monitor with reliable alerts. Open core.",
    category: "monitor",
    openSource: "https://github.com/SSLMate/certspotter",
  },
  {
    name: "Revocation Check",
    url: "https://certificate.revocationcheck.com/",
    why: "The only OCSP / CRL checker that still works well.",
    category: "inspect",
  },
  {
    name: "HSTS Preload",
    url: "https://hstspreload.org/",
    why: "Official Chromium HSTS preload submission and status check.",
    category: "validate",
  },
  {
    name: "ENISA NIS2 Guidance",
    url: "https://www.enisa.europa.eu/publications/implementation-guidance-on-nis-2-security-measures",
    why: "Official ENISA technical implementation guidance (June 2025).",
    category: "compliance",
  },
];
