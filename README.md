# certmate-tools

Free online tools for TLS, SSL certificates, ACME, domain & DNS — privacy-first, client-side, zero upload.

Companion to [CertMate](https://github.com/fabriziosalmi/certmate) — open-source SSL certificate management.

## Security

See the full policy and operational hardening checklist in [SECURITY.md](./SECURITY.md).

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:4321](http://localhost:4321).

## Stack

- Astro 5 (SSG, file-based routing, one URL per tool)
- Tailwind v4 (CSS-first, Oxide engine)
- TypeScript strict
- `@peculiar/x509` + Web Crypto API for client-side X.509 parsing

## Project layout

```
src/
  layouts/        shared page shells
  components/     Header, Footer, Tool primitives
  pages/          one folder per tool (= one URL = one keyword)
  lib/            client-side parsers and crypto helpers
  data/           tool registry + external curated links
  styles/         global.css with Tailwind import + design tokens
```

## Adding a new tool

1. Create `src/pages/<tool-slug>/index.astro`
2. Register it in `src/data/tools.ts`
3. Use `Layout.astro` and existing components — keep the "above-the-fold" + "no upload" pattern.
