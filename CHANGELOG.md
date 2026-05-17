# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
  French — with hreflang alternates emitted in `<head>` and a locale
  switcher in the header.
- Automatic light/dark theme via `prefers-color-scheme`.
- Compact toolbox UX pattern: no marketing hero on tool pages; results
  rendered in a native `<dialog>` modal; auto-decode on paste.
- Shared `Modal.astro`, `PrivacyBadge.astro`, `ToolCard.astro` components.
- **7 client-side tools (all live)**:
  - `/certificate-decoder/` — X.509 PEM/DER inspector with fingerprints,
    SAN, issuer/subject, multi-cert bundles.
  - `/csr-decoder/` — PKCS#10 inspector with requested SAN, key parameters,
    challenge attributes and signature verification.
  - `/chain-builder/` — re-orders an arbitrary PEM bundle into a leaf→root
    chain, verifies each signature link, flags missing intermediates with
    the AIA URL when present.
  - `/key-matcher/` — confirms a PKCS#8 private key matches a certificate
    by comparing SPKI SHA-256 (Web Crypto only).
  - `/hostname-validator/` — RFC 6125 / 6125-bis matching with wildcard
    rules, IDN checks and a CN-fallback diagnostic.
  - `/acme-dns-01/` — RFC 8555 §8.4 + RFC 7638 JWK thumbprint TXT-record
    helper with an in-browser sample RSA-2048 account key generator.
  - `/nis2-tls-readiness/` — interactive checklist mapped to NIS2
    Art. 21(2)(h), Italian D.Lgs. 138/2024 / ACN det. 379907/2025 and
    DORA, exports a Markdown evidence pack.
- Directory home page with curated external tools (Qualys SSL Labs,
  Hardenize, internet.nl, Mozilla HTTP Observatory, testssl.sh, crt.sh,
  SSLMate Cert Spotter, RevocationCheck, HSTS Preload, ENISA guidance).
- Brand assets imported from the official CertMate logo.

[Unreleased]: https://github.com/fabriziosalmi/certmate-tools/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/fabriziosalmi/certmate-tools/releases/tag/v0.1.0
