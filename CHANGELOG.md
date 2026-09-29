# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.3] - 2026-09-29

### Added

- 6 network-checker guides (EN+IT) with copy-paste OpenSSL/dig/curl
  recipes: CAA + TLSA/DANE DNS records, OCSP/CRL revocation, Certificate
  Transparency search, TLS versions/ciphers probing, HSTS + preload, live
  server expiry checks. Each links to the closest CTA: a live internal
  tool where one exists, a curated external checker otherwise, none for
  dig-only guides. Guide CTAs now support external destinations
  (`externalTool`) instead of assuming an internal tool.

## [0.2.2] - 2026-09-29

### Fixed

- Homepage cards for `certificate-decoder`, `acme-dns-01` and
  `nis2-tls-readiness` rendered the raw slug with an empty tagline. Root
  cause: convention-based `toolLabels()` lookup (digit-blind regex plus two
  keys off-convention). Fixed with digit-aware matching, an explicit alias
  map, and a registry fallback so a slug can never render as UI copy again.
  Guarded by `tests/i18n-labels.test.ts`.
- Homepage omitted the whole Monitor category: `renewal-calculator` and
  `inventory-validator` were live but invisible on home. Added `monitor` to
  the homepage category order.
- Hero headline rendered "you canactually trust" (collapsed JSX
  whitespace). Explicit space added.
- Footer bottom-bar links ran together on narrow screens. Spacing fixed.

### Added

- Homepage FAQ section (5 entries, EN+IT) with `FAQPage` structured data.
- Homepage JSON-LD (`WebSite` + `ItemList` of live tools + `FAQPage`).
- Client-side tool filter on the homepage (pure DOM, no network).
- "Do not trust us. Verify." trust strip: privacy notice, no-network gate
  source, open-source repo.
- "New" badges on the 8 tools added in 0.2.1 (remove after one release).
- Category anchor chips on the homepage tool index.

## [0.2.1] - 2026-09-29

### Added

- **8 new client-side tools (all live, EN+IT, no upload, no network):**
  15 live tools total:
  - `/fingerprint-calculator/`: SHA-1/256/512 over certificate DER bytes
    or arbitrary UTF-8 text via Web Crypto.
  - `/pem-validator/`: PEM envelope checks (BEGIN/END pairing, strict
    base64, block inventory).
  - `/format-converter/`: PEM ↔ DER conversion with Blob-download for DER
    output.
  - `/renewal-calculator/`: renew-by dates plus SC-081v3 readiness
    (200 d → 100 d → 47 d caps).
  - `/certificate-diff/`: field-by-field diff of two certificates.
  - `/inventory-validator/`: certificate inventory CSV validation
    (hostnames, dates, expirations; 5000-row cap).
  - `/key-inspector/`: RSA and EC key inspector (PKCS#8, SPKI, embedded
    cert keys, bare DER) with SPKI thumbprints matching the decoder.
  - `/csr-generator/`: private key (RSA/ECDSA) plus PKCS#10 CSR with
    SANs, built with `@peculiar/x509` and dogfooded through the decoder
    (`signatureValid === true`).
- Chain visualizer in `/chain-builder/`: compact leaf → root strip with
  per-link outcome coloring and a dashed terminator for missing parents.

### Changed

- `key-match` reuses `spkiFromPrivateKey()` from `key-inspector`: one
  owner for the SPKI-derivation logic, no behavior change.
- Decode-category blurb now reads "Parse and create …" since the
  category hosts the CSR generator.

### Deferred (not shippable without breaking the no-upload promise or the crypto bar)

- CAA / TLSA / OCSP / CRL / CT-log / TLS-version / cipher / HSTS live
  checkers, all requiring network egress and blocked by `connect-src 'none'`
  and `check-no-network`. Covered by curated external links + guides.
- PKCS#12 inspector/builder and JKS inspector: not planned. No PFX support
  in `@peculiar/x509`, no 3DES in Web Crypto (classic P12 PBE), and the
  value does not justify hand-rolled PBE crypto. Use `openssl pkcs12`
  and `keytool` locally instead.

### Added

- LICENSE (MIT) at the project root.
- SECURITY.md with private-disclosure process via GitHub Security Advisories
  and a dedicated email contact.
- CONTRIBUTING.md describing the project structure, the ground rules
  (no tracking, no upload, one URL per keyword) and how to add a new tool.
- CODE_OF_CONDUCT.md based on Contributor Covenant 2.1.
- This CHANGELOG.

## [0.1.0] - 2026-05-17

### Added

- Astro 5 + Tailwind v4 + TypeScript scaffolding.
- Native Astro i18n for English (default, unprefixed), Italian, German and
  French, with hreflang alternates emitted in `<head>` and a locale
  switcher in the header.
- Automatic light/dark theme via `prefers-color-scheme`.
- Compact toolbox UX pattern: no marketing hero on tool pages; results
  rendered in a native `<dialog>` modal; auto-decode on paste.
- Shared `Modal.astro`, `PrivacyBadge.astro`, `ToolCard.astro` components.
- **7 client-side tools (all live)**:
  - `/certificate-decoder/`: X.509 PEM/DER inspector with fingerprints,
    SAN, issuer/subject, multi-cert bundles.
  - `/csr-decoder/`: PKCS#10 inspector with requested SAN, key parameters,
    challenge attributes and signature verification.
  - `/chain-builder/`: re-orders an arbitrary PEM bundle into a leaf→root
    chain, verifies each signature link, flags missing intermediates with
    the AIA URL when present.
  - `/key-matcher/`: confirms a PKCS#8 private key matches a certificate
    by comparing SPKI SHA-256 (Web Crypto only).
  - `/hostname-validator/`: RFC 6125 / 6125-bis matching with wildcard
    rules, IDN checks and a CN-fallback diagnostic.
  - `/acme-dns-01/`: RFC 8555 §8.4 + RFC 7638 JWK thumbprint TXT-record
    helper with an in-browser sample RSA-2048 account key generator.
  - `/nis2-tls-readiness/`: interactive checklist mapped to NIS2
    Art. 21(2)(h), Italian D.Lgs. 138/2024 / ACN det. 379907/2025 and
    DORA, exports a Markdown evidence pack.
- Directory home page with curated external tools (Qualys SSL Labs,
  Hardenize, internet.nl, Mozilla HTTP Observatory, testssl.sh, crt.sh,
  SSLMate Cert Spotter, RevocationCheck, HSTS Preload, ENISA guidance).
- Brand assets imported from the official CertMate logo.

[Unreleased]: https://github.com/fabriziosalmi/certmate-tools/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/fabriziosalmi/certmate-tools/releases/tag/v0.1.0
