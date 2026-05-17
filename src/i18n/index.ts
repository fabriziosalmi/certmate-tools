export const LOCALES = ["en", "it", "de", "fr"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  it: "Italiano",
  de: "Deutsch",
  fr: "Français",
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

  homeBadge: (live) => `${live} live · more landing weekly`,
  homeHeadlineL1: "The certificate toolbox",
  homeHeadlineL2a: "you can",
  homeHeadlineL2b: "actually trust",
  homeIntro:
    "Decode, validate, inspect and monitor TLS certificates without ever uploading them. Everything runs in your browser. No accounts, no ads, no analytics.",
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
    "Paste a bundle of PEM blocks. Reorder them into a valid leaf → root chain and spot what's missing.",
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

  homeBadge: (live) => `${live} attivi · altri ogni settimana`,
  homeHeadlineL1: "La cassetta degli attrezzi",
  homeHeadlineL2a: "per i certificati,",
  homeHeadlineL2b: "di cui ti puoi fidare",
  homeIntro:
    "Decodifica, valida, ispeziona e monitora certificati TLS senza mai caricarli. Tutto gira nel tuo browser. Niente account, niente pubblicità, niente analytics.",
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
    "Incolla un bundle PEM. Riordina in catena valida leaf → root e individua cosa manca.",
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
};

const de: Messages = {
  ...en,
  brandTagline: "Kostenlose, datenschutzfreundliche SSL- und Zertifikat-Tools",
  navAllTools: "Alle Tools",
  homeBadge: (live) => `${live} aktiv · weitere kommen wöchentlich`,
  homeHeadlineL1: "Die Zertifikat-Toolbox",
  homeHeadlineL2a: "der man",
  homeHeadlineL2b: "wirklich vertrauen kann",
  homeIntro:
    "TLS-Zertifikate dekodieren, validieren, prüfen und überwachen — ohne jemals etwas hochzuladen. Alles läuft im Browser. Keine Konten, keine Werbung, kein Tracking.",
  homeCtaBrowse: "Toolbox öffnen",
  homeCtaTry: "Certificate Decoder testen →",
  homeOurTools: "Unsere Tools",
  homeBottomTitle: "Verwalten Sie Dutzende von Zertifikaten?",
  homeBottomBody:
    "Die maximale Laufzeit öffentlicher TLS-Zertifikate sinkt planmäßig — das CA/Browser Forum Ballot SC-081v3 senkt das Limit auf 200 Tage ab März 2026, 100 Tage ab 2027 und 47 Tage ab 2029. CertMate ist der Open-Source-Manager für diese Automatisierungsrealität.",
  homeBottomCta: "CertMate auf GitHub →",
  decodeButton: "Dekodieren",
  decodingButton: "Verarbeitung…",
  tryWithSample: "Mit Beispiel ausprobieren",
  clear: "Leeren",
  closeModal: "Schließen",
  copy: "kopieren",
  copied: "kopiert",
};

const fr: Messages = {
  ...en,
  brandTagline: "Outils SSL & certificats gratuits, sans collecte de données",
  navAllTools: "Tous les outils",
  homeBadge: (live) => `${live} en ligne · d'autres chaque semaine`,
  homeHeadlineL1: "La boîte à outils certificats",
  homeHeadlineL2a: "à laquelle vous pouvez",
  homeHeadlineL2b: "vraiment faire confiance",
  homeIntro:
    "Décodez, validez, inspectez et surveillez vos certificats TLS sans jamais les téléverser. Tout s'exécute dans votre navigateur. Aucun compte, aucune pub, aucun tracker.",
  homeCtaBrowse: "Explorer la boîte à outils",
  homeCtaTry: "Essayer le décodeur de certificat →",
  homeOurTools: "Nos outils",
  homeBottomTitle: "Vous gérez des dizaines de certificats ?",
  homeBottomBody:
    "Les durées de validité des certificats TLS publics baissent — le ballot CA/Browser Forum SC-081v3 plafonne la validité à 200 jours dès mars 2026, 100 jours dès 2027 et 47 jours dès 2029. CertMate est le gestionnaire open-source pensé pour cette automatisation.",
  homeBottomCta: "CertMate sur GitHub →",
  decodeButton: "Décoder",
  decodingButton: "En cours…",
  tryWithSample: "Essayer avec un exemple",
  clear: "Effacer",
  closeModal: "Fermer",
  copy: "copier",
  copied: "copié",
};

export const messages: Record<Locale, Messages> = { en, it, de, fr };

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
