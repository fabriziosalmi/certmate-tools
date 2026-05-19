export const LOCALES = ["en", "it"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  it: "Italiano",
};

export function isLocale(
  s: string | number | undefined | null
): s is Locale {
  return typeof s === "string" && (LOCALES as readonly string[]).includes(s);
}

/**
 * Read the locale segment from a pathname like "/it/csr-decoder/" → "it".
 * Returns the default locale when there is no prefix.
 */
export function detectLocale(pathname: string): Locale {
  const first = pathname.split("/").filter(Boolean)[0];
  return isLocale(first) ? first : DEFAULT_LOCALE;
}

/**
 * Strip the locale prefix from a pathname so we can build alternate URLs.
 * "/it/csr-decoder/" → "/csr-decoder/"
 */
export function stripLocale(pathname: string): string {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return "/";
  if (isLocale(parts[0])) parts.shift();
  const cleaned = "/" + parts.join("/");
  return parts.length === 0 ? "/" : `${cleaned}/`;
}

/**
 * Build the public path for `slug` in `locale`. `slug` is a leading-slash path
 * like "/" or "/certificate-decoder/".
 */
export function localizedPath(locale: Locale, slug: string): string {
  const cleaned = slug.startsWith("/") ? slug : `/${slug}`;
  if (locale === DEFAULT_LOCALE) return cleaned;
  return `/${locale}${cleaned}`;
}

export interface Messages {
  // shared chrome
  brandTagline: string;
  navAllTools: string;
  navSite: string;
  navGithub: string;
  starOnGithub: string;
  footerBuiltWithPrivacy: string;
  footerNoTracking: string;
  footerNoUpload: string;
  footerOpenSource: string;
  footerCopyright: string;
  privacyBadgeInline: string;
  privacyBadgeTitleBlock: string;
  privacyBadgeBodyBlock: string;
  externalBadge: string;
  soonBadge: string;
  openSourceBadge: string;
  reportBug: string;

  // category labels
  catDecodeLabel: string;
  catDecodeBlurb: string;
  catValidateLabel: string;
  catValidateBlurb: string;
  catInspectLabel: string;
  catInspectBlurb: string;
  catMonitorLabel: string;
  catMonitorBlurb: string;
  catAcmeLabel: string;
  catAcmeBlurb: string;
  catComplianceLabel: string;
  catComplianceBlurb: string;

  // home page
  homeBadge: (live: number) => string;
  homeHeadlineL1: string;
  homeHeadlineL2a: string;
  homeHeadlineL2b: string;
  homeIntro: string;
  homeCtaBrowse: string;
  homeCtaTry: string;
  homeOurTools: string;
  homeOurToolsClaim: string;
  homeOurToolsLead: string;
  homeExternal: string;
  homeExternalCurated: string;
  homeExternalLead: string;
  homeBottomTitle: string;
  homeBottomBody: string;
  homeBottomCta: string;

  // common tool UI
  toolPrivacyHint: string;
  toolBackToTools: string;
  toolOtherTools: string;
  decodeButton: string;
  decodingButton: string;
  tryWithSample: string;
  clear: string;
  inputEmpty: string;
  inputTooLarge: string;
  decodedSuccess: (n: number) => string;
  resultsHeader: string;
  closeModal: string;
  copy: string;
  copied: string;
  pasteHint: string;
  dropHint: string;
  invalidSignature: string;
  validSignature: string;
  signatureCheckErrored: string;

  // tool-specific (titles + taglines + placeholders)
  certDecoderTitle: string;
  certDecoderTagline: string;
  certDecoderPlaceholder: string;
  csrDecoderTitle: string;
  csrDecoderTagline: string;
  csrDecoderPlaceholder: string;
  chainBuilderTitle: string;
  chainBuilderTagline: string;
  keyMatcherTitle: string;
  keyMatcherTagline: string;
  hostnameValidatorTitle: string;
  hostnameValidatorTagline: string;
  acmeDns01Title: string;
  acmeDns01Tagline: string;
  nis2ReadinessTitle: string;
  nis2ReadinessTagline: string;

  // chain builder + key matcher chrome
  chainBuilderHint: string;
  chainBuilderRunButton: string;
  chainBuilderStatusEmpty: string;
  chainBuilderDownloadBundle: string;
  keyMatcherCertLabel: string;
  keyMatcherKeyLabel: string;
  keyMatcherRunButton: string;
  keyMatcherStatusEmpty: string;

  // shared result panel labels
  commonSubject: string;
  commonIssuer: string;
  commonValidity: string;
  commonExpired: string;
  commonNotYetValid: string;
  commonPublicKey: string;
  commonAlgorithm: string;
  commonKeySize: string;
  commonCurve: string;
  commonSignature: string;
  commonCommonName: string;
  commonKeyAlgorithm: string;
  commonNamedCurve: string;
  commonSAN: string;
  commonNoSAN: string;
  commonKeyUsage: string;
  commonEKU: string;
  commonSpkiHash: string;
  commonSki: string;
  commonAki: string;
  commonSelfSigned: string;
  commonCaRequested: string;
  commonYes: string;
  commonNo: string;
  commonIssuedBy: string;

  // chain builder result panel
  chainRoleLeaf: string;
  chainRoleRoot: string;
  chainRoleIntermediate: string;
  chainOrder: string;
  chainOverallValid: string;
  chainOverallIssues: string;
  chainLinkOk: string;
  chainLinkFailed: string;
  chainPerLink: string;
  chainNoLinks: string;
  chainMissingParentPrefix: string;
  chainExpectedIssuer: string;
  chainFetchAia: string;
  chainSubtitle: (n: number) => string;

  // key matcher result panel
  keyMatcherMatch: string;
  keyMatcherNoMatch: string;
  keyMatcherMatches: string;
  keyMatcherDoesNotMatch: string;
  keyMatcherCertSpkiSha: string;
  keyMatcherDerivedSpkiSha: string;

  // csr result panel
  csrChallengePassword: string;
  csrOtherAttributes: string;
  csrNoSAN: string;
  csrSubtitle: string;
  csrSectionRequestedUsage: string;
  csrSectionIdentifiers: string;
  csrSectionPublicKey: string;
  csrSectionRequestedSAN: string;

  // cert decoder result panel
  certNotBefore: string;
  certNotAfter: string;
  certTotalValidity: (days: number) => string;
  certStatus: string;
  certStatusExpiredDaysAgo: (days: number) => string;
  certStatusNotYetValid: string;
  certStatusExpiresInDays: (days: number) => string;
  certStatusValidDaysLeft: (days: number) => string;
  certIdxOfTotal: (idx: number, total: number) => string;
  certSerialHex: string;
  certSerialDec: string;
  certBasicConstraints: string;
  certCaTrue: string;
  certCaFalse: string;
  certCertificatePolicies: string;
  certCaIssuersAia: string;
  certOcsp: string;
  certCrlDistribution: string;
  certNoExtensions: string;
  certSectionPublicKeySignature: string;
  certSectionIdentifiersFingerprints: string;
  certSectionDistributionPolicies: string;
  certSectionKeyUsage: string;
  certEmptyDn: string;
  certNone: string;

  // hostname validator + acme dns01 chrome
  hostnameValidatorRunButton: string;
  hostnameValidatorStatusEmpty: string;
  acmeDns01RunButton: string;
  acmeDns01StatusEmpty: string;
}

const en: Messages = {
  brandTagline: "Free, privacy-first SSL & certificate tools",
  navAllTools: "All tools",
  navSite: "certmate.org",
  navGithub: "GitHub",
  starOnGithub: "★ Star on GitHub",
  footerBuiltWithPrivacy: "Built with privacy",
  footerNoTracking: "No tracking, no analytics scripts.",
  footerNoUpload: "No file ever leaves your browser.",
  footerOpenSource: "Open source — auditable end to end.",
  footerCopyright: "MIT licensed.",
  privacyBadgeInline: "Runs in your browser. Nothing uploaded.",
  privacyBadgeTitleBlock: "100% client-side",
  privacyBadgeBodyBlock:
    "Parsing happens in your browser with Web Crypto and @peculiar/x509. We never see your data.",
  externalBadge: "external",
  soonBadge: "soon",
  openSourceBadge: "open source",
  reportBug: "Report a bug",

  catDecodeLabel: "Decode & inspect",
  catDecodeBlurb:
    "Parse certificates, CSRs and keys in your browser — never uploaded.",
  catValidateLabel: "Validate",
  catValidateBlurb:
    "Chains, hostnames, key/cert pairs — formal checks against RFC 5280 / 6125.",
  catInspectLabel: "Probe & scan",
  catInspectBlurb:
    "Live TLS handshakes, security headers, OCSP / CRL revocation status.",
  catMonitorLabel: "Monitor",
  catMonitorBlurb:
    "Certificate transparency search, expiry inventory, alerting.",
  catAcmeLabel: "ACME helpers",
  catAcmeBlurb:
    "External account binding, DNS-01 challenge math, provider quick-refs.",
  catComplianceLabel: "Compliance EU",
  catComplianceBlurb:
    "NIS2, DORA, eIDAS 2.0 — TLS posture mapped to the articles.",

  homeBadge: (live) => `${live} tools · 100% client-side · MIT`,
  homeHeadlineL1: "The certificate toolbox",
  homeHeadlineL2a: "you can",
  homeHeadlineL2b: "actually trust",
  homeIntro:
    "Decode, validate and inspect TLS certificates without ever uploading them. Everything runs in your browser. No accounts, no ads, no analytics.",
  homeCtaBrowse: "Browse the toolbox",
  homeCtaTry: "Try the certificate decoder →",
  homeOurTools: "Our tools",
  homeOurToolsClaim:
    "100% client-side. Built with Web Crypto + @peculiar/x509.",
  homeOurToolsLead:
    "Single-purpose tools, one URL each, no upsell. Open source — read the code.",
  homeExternal: "Trusted external tools",
  homeExternalCurated: "Curated, opens in a new tab.",
  homeExternalLead:
    "Some jobs need infrastructure we cannot replicate in a static site — live TLS handshakes, transparency log indexing, OCSP queries. These are the ones we trust.",
  homeBottomTitle: "Managing dozens of certificates?",
  homeBottomBody:
    "Public TLS certificate lifetimes are on a published path down — the CA/Browser Forum ballot SC-081v3 caps maximum validity at 200 days from March 2026, 100 days from 2027, and 47 days by 2029. CertMate is the open-source manager built for that automation reality.",
  homeBottomCta: "Get CertMate on GitHub →",

  toolPrivacyHint: "Nothing uploaded — runs locally.",
  toolBackToTools: "← All tools",
  toolOtherTools: "Other tools:",
  decodeButton: "Decode",
  decodingButton: "Working…",
  tryWithSample: "Try with sample",
  clear: "Clear",
  inputEmpty: "Paste input first.",
  inputTooLarge: "Input is too large.",
  decodedSuccess: (n) => `Decoded ${n} item${n === 1 ? "" : "s"} locally.`,
  resultsHeader: "Result",
  closeModal: "Close",
  copy: "copy",
  copied: "copied",
  pasteHint: "Paste a PEM block. Auto-decodes on paste.",
  dropHint: "… or drop a file anywhere on this card.",
  invalidSignature: "Signature does not verify against the embedded public key.",
  validSignature: "Signature verified against the embedded public key.",
  signatureCheckErrored: "Could not verify signature",

  certDecoderTitle: "Certificate Decoder",
  certDecoderTagline:
    "Paste a PEM or DER certificate and see every X.509 field — Subject, SAN, validity, key, signature, fingerprints.",
  certDecoderPlaceholder:
    "-----BEGIN CERTIFICATE-----\nMIIFazCCA1OgAwIBAgIRAIIQz7DSQONZRGPgu2OCiwAw...\n-----END CERTIFICATE-----",
  csrDecoderTitle: "CSR Decoder",
  csrDecoderTagline:
    "Paste a PKCS#10 Certificate Signing Request and see CN, SAN, key parameters and challenge attributes.",
  csrDecoderPlaceholder:
    "-----BEGIN CERTIFICATE REQUEST-----\nMIIDFTCCAf0CAQAwgY0xCzAJBgNVBAYTAklUMQ4w...\n-----END CERTIFICATE REQUEST-----",
  chainBuilderTitle: "Chain Builder & Validator",
  chainBuilderTagline:
    "Paste a bundle of PEM blocks. Reorder them into a valid leaf → root chain, spot what's missing and export a clean fullchain.pem.",
  keyMatcherTitle: "Key ↔ Cert Matcher",
  keyMatcherTagline:
    "Confirm a private key and certificate match. Both stay in your browser — Web Crypto only.",
  hostnameValidatorTitle: "Hostname / SAN Validator",
  hostnameValidatorTagline:
    "Test which hostnames a certificate covers under RFC 6125 — wildcards, IDN, CN fallback.",
  acmeDns01Title: "ACME DNS-01 Helper",
  acmeDns01Tagline:
    "Compute the TXT record value an ACME server expects from your account key (JWK) and the challenge token.",
  nis2ReadinessTitle: "NIS2 TLS Readiness Check",
  nis2ReadinessTagline:
    "An interactive checklist that maps your TLS / cert posture to NIS2 Art. 21(2)(h) and Italian D.Lgs. 138/2024.",

  chainBuilderHint: "Paste leaf, intermediates and (optionally) root — any order",
  chainBuilderRunButton: "Build & validate chain",
  chainBuilderStatusEmpty: "Paste one or more PEM blocks.",
  chainBuilderDownloadBundle: "Download fullchain.pem",

  commonSubject: "Subject",
  commonIssuer: "Issuer",
  commonValidity: "Validity",
  commonExpired: "EXPIRED",
  commonNotYetValid: "NOT YET VALID",
  commonPublicKey: "Public key",
  commonAlgorithm: "Algorithm",
  commonKeySize: "Key size",
  commonCurve: "Curve",
  commonSignature: "Signature",
  commonCommonName: "Common name",
  commonKeyAlgorithm: "Key algorithm",
  commonNamedCurve: "Named curve",
  commonSAN: "Subject Alternative Names",
  commonNoSAN: "No SAN.",
  commonKeyUsage: "Key Usage",
  commonEKU: "Extended Key Usage",
  commonSpkiHash: "Public key SHA-256",
  commonSki: "Subject Key Identifier",
  commonAki: "Authority Key Identifier",
  commonSelfSigned: "self-signed",
  commonCaRequested: "CA requested",
  commonYes: "yes",
  commonNo: "no",
  commonIssuedBy: "issued by",

  chainRoleLeaf: "leaf",
  chainRoleRoot: "root",
  chainRoleIntermediate: "intermediate",
  chainOrder: "Chain order: leaf → root",
  chainOverallValid: "chain valid",
  chainOverallIssues: "issues found",
  chainLinkOk: "link OK",
  chainLinkFailed: "link failed",
  chainPerLink: "Per-link verification",
  chainNoLinks: "No links to verify (single cert).",
  chainMissingParentPrefix: "Missing parent for cert",
  chainExpectedIssuer: "expected issuer",
  chainFetchAia: "Fetch from AIA:",
  chainSubtitle: (n) => `${n} certificate${n === 1 ? "" : "s"} ordered.`,

  keyMatcherMatch: "match",
  keyMatcherNoMatch: "no match",
  keyMatcherMatches: "Private key matches the certificate.",
  keyMatcherDoesNotMatch: "Private key does NOT match the certificate.",
  keyMatcherCertSpkiSha: "Cert SPKI SHA-256",
  keyMatcherDerivedSpkiSha: "Derived SPKI SHA-256",

  csrChallengePassword: "Challenge password",
  csrOtherAttributes: "Other attribute OIDs",
  csrNoSAN: "No SAN requested.",
  csrSubtitle: "PKCS#10 Certificate Signing Request",
  csrSectionRequestedUsage: "Requested Usage",
  csrSectionIdentifiers: "Identifiers",
  csrSectionPublicKey: "Public Key",
  csrSectionRequestedSAN: "Requested SAN",
  keyMatcherCertLabel: "Certificate (PEM)",
  keyMatcherKeyLabel: "Private key (PKCS#8 PEM)",
  keyMatcherRunButton: "Match",
  keyMatcherStatusEmpty: "Paste both a certificate and a private key.",

  certNotBefore: "Not Before",
  certNotAfter: "Not After",
  certTotalValidity: (d) => `${d} day${d === 1 ? "" : "s"}`,
  certStatus: "Status",
  certStatusExpiredDaysAgo: (d) => `Expired ${d} day${d === 1 ? "" : "s"} ago`,
  certStatusNotYetValid: "Not yet valid",
  certStatusExpiresInDays: (d) => `Expires in ${d} day${d === 1 ? "" : "s"}`,
  certStatusValidDaysLeft: (d) => `Valid · ${d} day${d === 1 ? "" : "s"} left`,
  certIdxOfTotal: (i, t) => `${i} of ${t}`,
  certSerialHex: "Serial (hex)",
  certSerialDec: "Serial (decimal)",
  certBasicConstraints: "Basic Constraints",
  certCaTrue: "CA: TRUE",
  certCaFalse: "CA: false",
  certCertificatePolicies: "Certificate Policies",
  certCaIssuersAia: "CA Issuers (AIA)",
  certOcsp: "OCSP",
  certCrlDistribution: "CRL Distribution",
  certNoExtensions: "No AIA / CRL / Policy extensions.",
  certSectionPublicKeySignature: "Public Key & Signature",
  certSectionIdentifiersFingerprints: "Identifiers & Fingerprints",
  certSectionDistributionPolicies: "Distribution & Policies",
  certSectionKeyUsage: "Key Usage",
  certEmptyDn: "empty",
  certNone: "none",

  hostnameValidatorRunButton: "Check coverage",
  hostnameValidatorStatusEmpty: "Paste a certificate first.",
  acmeDns01RunButton: "Compute TXT value",
  acmeDns01StatusEmpty: "Paste a JWK and a token.",
};

const it: Messages = {
  brandTagline: "Strumenti gratuiti per SSL e certificati — privacy-first",
  navAllTools: "Tutti gli strumenti",
  navSite: "certmate.org",
  navGithub: "GitHub",
  starOnGithub: "★ Star su GitHub",
  footerBuiltWithPrivacy: "Costruito con la privacy",
  footerNoTracking: "Niente tracking, niente analytics.",
  footerNoUpload: "Nessun file lascia il tuo browser.",
  footerOpenSource: "Open source — verificabile da cima a fondo.",
  footerCopyright: "Licenza MIT.",
  privacyBadgeInline: "Tutto in locale. Niente upload.",
  privacyBadgeTitleBlock: "100% client-side",
  privacyBadgeBodyBlock:
    "Il parsing avviene nel tuo browser con Web Crypto e @peculiar/x509. I tuoi dati non li vediamo mai.",
  externalBadge: "esterno",
  soonBadge: "in arrivo",
  openSourceBadge: "open source",
  reportBug: "Segnala un bug",

  catDecodeLabel: "Decodifica & ispeziona",
  catDecodeBlurb:
    "Parser per certificati, CSR e chiavi nel tuo browser — niente upload.",
  catValidateLabel: "Valida",
  catValidateBlurb:
    "Catene, hostname, accoppiate chiave/cert — verifiche formali su RFC 5280 / 6125.",
  catInspectLabel: "Sonda & scansiona",
  catInspectBlurb:
    "Handshake TLS live, security header, stato di revoca OCSP / CRL.",
  catMonitorLabel: "Monitora",
  catMonitorBlurb:
    "Ricerca su Certificate Transparency, inventario scadenze, alert.",
  catAcmeLabel: "ACME",
  catAcmeBlurb:
    "External account binding, math della challenge DNS-01, quick-ref per provider.",
  catComplianceLabel: "Compliance EU",
  catComplianceBlurb:
    "NIS2, DORA, eIDAS 2.0 — posture TLS mappata articolo per articolo.",

  homeBadge: (live) => `${live} tool · 100% client-side · MIT`,
  homeHeadlineL1: "La cassetta degli attrezzi",
  homeHeadlineL2a: "per i certificati,",
  homeHeadlineL2b: "di cui ti puoi fidare",
  homeIntro:
    "Decodifica, valida e ispeziona certificati TLS senza mai caricarli. Tutto gira nel tuo browser. Niente account, niente pubblicità, niente analytics.",
  homeCtaBrowse: "Esplora gli strumenti",
  homeCtaTry: "Prova il decoder certificato →",
  homeOurTools: "I nostri strumenti",
  homeOurToolsClaim:
    "100% client-side. Costruiti con Web Crypto + @peculiar/x509.",
  homeOurToolsLead:
    "Strumenti a singolo scopo, una URL ciascuno, nessun upsell. Open source — leggi il codice.",
  homeExternal: "Strumenti esterni di fiducia",
  homeExternalCurated: "Selezionati, si aprono in una nuova scheda.",
  homeExternalLead:
    "Alcune cose richiedono infrastruttura che un sito statico non può replicare — handshake TLS live, indicizzazione CT, query OCSP. Questi sono quelli di cui ci fidiamo.",
  homeBottomTitle: "Gestisci decine di certificati?",
  homeBottomBody:
    "La validità dei certificati TLS pubblici è in calo programmato — il CA/Browser Forum ha approvato il ballot SC-081v3 che fissa il massimo a 200 giorni da marzo 2026, 100 giorni dal 2027 e 47 giorni dal 2029. CertMate è il manager open-source pensato per questa realtà di automazione.",
  homeBottomCta: "Vai a CertMate su GitHub →",

  toolPrivacyHint: "Tutto in locale.",
  toolBackToTools: "← Tutti gli strumenti",
  toolOtherTools: "Altri strumenti:",
  decodeButton: "Decodifica",
  decodingButton: "In lavorazione…",
  tryWithSample: "Prova con un esempio",
  clear: "Pulisci",
  inputEmpty: "Incolla un input.",
  inputTooLarge: "Input troppo grande.",
  decodedSuccess: (n) =>
    `Decodificati ${n} elementi in locale.`,
  resultsHeader: "Risultato",
  closeModal: "Chiudi",
  copy: "copia",
  copied: "copiato",
  pasteHint: "Incolla un blocco PEM. Decodifica automatica al paste.",
  dropHint: "… oppure trascina un file su questa scheda.",
  invalidSignature:
    "La firma non verifica contro la public key inclusa.",
  validSignature: "Firma verificata contro la public key inclusa.",
  signatureCheckErrored: "Impossibile verificare la firma",

  certDecoderTitle: "Decoder Certificati",
  certDecoderTagline:
    "Incolla un certificato PEM o DER e leggi ogni campo X.509 — Subject, SAN, validità, chiave, firma, fingerprint.",
  certDecoderPlaceholder:
    "-----BEGIN CERTIFICATE-----\nMIIFazCCA1OgAwIBAgIRAIIQz7DSQONZRGPgu2OCiwAw...\n-----END CERTIFICATE-----",
  csrDecoderTitle: "Decoder CSR",
  csrDecoderTagline:
    "Incolla una Certificate Signing Request PKCS#10 e vedi CN, SAN, parametri chiave e attributi.",
  csrDecoderPlaceholder:
    "-----BEGIN CERTIFICATE REQUEST-----\nMIIDFTCCAf0CAQAwgY0xCzAJBgNVBAYTAklUMQ4w...\n-----END CERTIFICATE REQUEST-----",
  chainBuilderTitle: "Chain Builder & Validator",
  chainBuilderTagline:
    "Incolla un bundle PEM. Riordina in catena valida leaf → root, individua cosa manca ed esporta un fullchain.pem pulito.",
  keyMatcherTitle: "Match Chiave ↔ Certificato",
  keyMatcherTagline:
    "Verifica che chiave privata e certificato corrispondano. Tutto resta nel browser — solo Web Crypto.",
  hostnameValidatorTitle: "Validatore Hostname / SAN",
  hostnameValidatorTagline:
    "Verifica quali hostname un certificato copre secondo RFC 6125 — wildcard, IDN, fallback CN.",
  acmeDns01Title: "ACME DNS-01 Helper",
  acmeDns01Tagline:
    "Calcola il valore TXT atteso dal server ACME a partire dalla tua account key (JWK) e dal token della challenge.",
  nis2ReadinessTitle: "NIS2 TLS Readiness",
  nis2ReadinessTagline:
    "Checklist interattiva che mappa la tua postura TLS / cert all'art. 21(2)(h) NIS2 e al D.Lgs. 138/2024.",

  chainBuilderHint: "Incolla leaf, intermediate ed (opzionale) root — in qualsiasi ordine",
  chainBuilderRunButton: "Costruisci e valida la catena",
  chainBuilderStatusEmpty: "Incolla uno o più blocchi PEM.",
  chainBuilderDownloadBundle: "Scarica fullchain.pem",
  keyMatcherCertLabel: "Certificato (PEM)",
  keyMatcherKeyLabel: "Chiave privata (PKCS#8 PEM)",
  keyMatcherRunButton: "Verifica",
  keyMatcherStatusEmpty: "Incolla sia un certificato che una chiave privata.",

  commonSubject: "Subject",
  commonIssuer: "Issuer",
  commonValidity: "Validità",
  commonExpired: "SCADUTO",
  commonNotYetValid: "NON ANCORA VALIDO",
  commonPublicKey: "Chiave pubblica",
  commonAlgorithm: "Algoritmo",
  commonKeySize: "Lunghezza chiave",
  commonCurve: "Curva",
  commonSignature: "Firma",
  commonCommonName: "Common name",
  commonKeyAlgorithm: "Algoritmo chiave",
  commonNamedCurve: "Curva nominata",
  commonSAN: "Subject Alternative Names",
  commonNoSAN: "Nessun SAN.",
  commonKeyUsage: "Key Usage",
  commonEKU: "Extended Key Usage",
  commonSpkiHash: "SHA-256 chiave pubblica",
  commonSki: "Subject Key Identifier",
  commonAki: "Authority Key Identifier",
  commonSelfSigned: "auto-firmato",
  commonCaRequested: "CA richiesto",
  commonYes: "sì",
  commonNo: "no",
  commonIssuedBy: "emesso da",

  chainRoleLeaf: "leaf",
  chainRoleRoot: "root",
  chainRoleIntermediate: "intermediate",
  chainOrder: "Ordine catena: leaf → root",
  chainOverallValid: "catena valida",
  chainOverallIssues: "problemi rilevati",
  chainLinkOk: "link OK",
  chainLinkFailed: "link fallito",
  chainPerLink: "Verifica per link",
  chainNoLinks: "Nessun link da verificare (cert singolo).",
  chainMissingParentPrefix: "Manca il parent del cert",
  chainExpectedIssuer: "issuer atteso",
  chainFetchAia: "Recupera da AIA:",
  chainSubtitle: (n) => `${n} certificat${n === 1 ? "o" : "i"} in ordine.`,

  keyMatcherMatch: "match",
  keyMatcherNoMatch: "no match",
  keyMatcherMatches: "La chiave privata corrisponde al certificato.",
  keyMatcherDoesNotMatch: "La chiave privata NON corrisponde al certificato.",
  keyMatcherCertSpkiSha: "SHA-256 SPKI certificato",
  keyMatcherDerivedSpkiSha: "SHA-256 SPKI derivato",

  csrChallengePassword: "Challenge password",
  csrOtherAttributes: "Altri attributi OID",
  csrNoSAN: "Nessun SAN richiesto.",
  csrSubtitle: "Certificate Signing Request PKCS#10",
  csrSectionRequestedUsage: "Utilizzi richiesti",
  csrSectionIdentifiers: "Identificatori",
  csrSectionPublicKey: "Chiave pubblica",
  csrSectionRequestedSAN: "SAN richiesti",

  certNotBefore: "Valido dal",
  certNotAfter: "Valido fino al",
  certTotalValidity: (d) => `${d} giorn${d === 1 ? "o" : "i"}`,
  certStatus: "Stato",
  certStatusExpiredDaysAgo: (d) => `Scaduto da ${d} giorn${d === 1 ? "o" : "i"}`,
  certStatusNotYetValid: "Non ancora valido",
  certStatusExpiresInDays: (d) => `Scade tra ${d} giorn${d === 1 ? "o" : "i"}`,
  certStatusValidDaysLeft: (d) => `Valido · ${d} giorn${d === 1 ? "o" : "i"} restant${d === 1 ? "e" : "i"}`,
  certIdxOfTotal: (i, t) => `${i} di ${t}`,
  certSerialHex: "Seriale (hex)",
  certSerialDec: "Seriale (decimale)",
  certBasicConstraints: "Basic Constraints",
  certCaTrue: "CA: TRUE",
  certCaFalse: "CA: false",
  certCertificatePolicies: "Policy del certificato",
  certCaIssuersAia: "CA Issuers (AIA)",
  certOcsp: "OCSP",
  certCrlDistribution: "Distribuzione CRL",
  certNoExtensions: "Nessuna estensione AIA / CRL / Policy.",
  certSectionPublicKeySignature: "Chiave pubblica e firma",
  certSectionIdentifiersFingerprints: "Identificatori e fingerprint",
  certSectionDistributionPolicies: "Distribuzione e policy",
  certSectionKeyUsage: "Key Usage",
  certEmptyDn: "vuoto",
  certNone: "nessuno",

  hostnameValidatorRunButton: "Verifica copertura",
  hostnameValidatorStatusEmpty: "Incolla prima un certificato.",
  acmeDns01RunButton: "Calcola valore TXT",
  acmeDns01StatusEmpty: "Incolla una JWK e un token.",
};

export const messages: Record<Locale, Messages> = { en, it };

export function getMessages(locale: Locale | undefined): Messages {
  return messages[locale ?? DEFAULT_LOCALE] ?? messages[DEFAULT_LOCALE];
}

/**
 * Slug → localized title/tagline lookup for internal tools, by reading the
 * Messages object key conventions: `<camelSlug>Title` and `<camelSlug>Tagline`.
 */
export function toolLabels(
  m: Messages,
  slug: string
): { title: string; tagline: string } {
  const camel = slug.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  const title = (m as unknown as Record<string, string>)[`${camel}Title`];
  const tagline = (m as unknown as Record<string, string>)[`${camel}Tagline`];
  return {
    title: title ?? slug,
    tagline: tagline ?? "",
  };
}
