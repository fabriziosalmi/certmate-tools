# Contributing to certmate-tools

Thanks for stopping by. This repository is a collection of static, fully
client-side TLS / certificate / ACME tools that act as the SEO front door for
[CertMate](https://www.certmate.org). Contributions are very welcome —
bug-fixes, new tools, translations, copy polish, accessibility tweaks.

## TL;DR

```bash
git clone https://github.com/fabriziosalmi/certmate-tools.git
cd certmate-tools
npm install
./node_modules/.bin/astro dev          # http://localhost:4321
./node_modules/.bin/astro check        # type-check
./node_modules/.bin/astro build        # static build → dist/
```

Use the local binary (`./node_modules/.bin/astro …`) rather than `npx astro`
to avoid pulling a different Astro version.

## What you'll find

```
src/
  components/     reusable .astro pieces
  layouts/        page shell with i18n + dark mode + hreflang
  pages/          one folder per tool URL, plus [lang]/... for locale mirrors
  lib/            client-side parsers: cert, csr, chain, key-match, hostnames, acme
  data/tools.ts   tool registry (internal + curated external)
  i18n/index.ts   message bundles (en, it, de, fr)
  styles/         global.css with @theme tokens and the <dialog> backdrop
```

Each tool has three pieces:

1. A lib module in `src/lib/<tool>.ts` (pure logic, no DOM).
2. A `src/components/<Tool>Tool.astro` component (UI + the `<script>` that
   wires the form to the lib).
3. A thin `src/pages/<slug>/index.astro` wrapper (English) plus
   `src/pages/[lang]/<slug>/index.astro` for the other locales.

## Ground rules

- **No tracking, no analytics, no ads.** Ever.
- **No file the user pastes or drops can leave the browser.** Cryptography
  goes through `crypto.subtle` and `@peculiar/x509` exclusively.
- **One URL = one keyword.** Tool slugs match SEO intent.
- **Above-the-fold first.** Tool pages have no marketing hero; the input
  card is the page.
- **Auto-decode on paste.** Don't make people hunt for a button.
- **Results render in a `<dialog>` modal.** Use the shared `Modal.astro`.

## Adding a new tool

1. Add the slug to `src/data/tools.ts` with `status: "soon"` first.
2. Add localized title/tagline keys in `src/i18n/index.ts` (`<camelSlug>Title`,
   `<camelSlug>Tagline`) for at least English.
3. Write the lib at `src/lib/<slug>.ts`. Reuse helpers from `src/lib/util.ts`
   (`escapeHtml`, `safeHttpUrl`, `bufToHexColon`, `sha`, etc.) and respect
   `MAX_INPUT_BYTES`.
4. Build the component as `src/components/<Slug>Tool.astro`. Mirror the
   structure of `CertificateDecoderTool.astro`: a single card, the shared
   `Modal` for results, and the `ToolNav` component at the top.
5. Add the two page wrappers under `src/pages/` and `src/pages/[lang]/`.
6. Flip the status to `"live"` in `src/data/tools.ts` once you are happy.
7. `astro check` and `astro build` should both pass with zero errors.

## Translations

Open `src/i18n/index.ts` and edit the relevant locale bundle. Untouched keys
fall back to English via spread in the `de` and `fr` bundles, so partial
translations are fine. Italian is fully translated and is the second-tier
target language for the project.

## Filing issues

- Bugs: a minimal repro link to the deployed site is gold.
- Feature requests: explain the user problem first, the proposed UI second.
- Security: read [SECURITY.md](SECURITY.md) first — please do not open a
  public issue for security bugs.

## Pull requests

- One concern per PR. Smaller diffs ship faster.
- Make `astro check` happy. No `any` casts unless commented.
- If you touch the UI, please verify both light and dark modes look right.
- Update [CHANGELOG.md](CHANGELOG.md) under `## [Unreleased]` for anything
  user-visible.

By contributing, you agree your work is licensed under the project's
[MIT License](LICENSE).
