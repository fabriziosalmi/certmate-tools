<!-- Thanks for the PR. Keep the summary short — link to issues / context instead of duplicating. -->

## Summary

-

## Security checklist

Tick what applies. CI enforces some of this, but humans catch what greps miss.

- [ ] No new `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `sendBeacon`,
      `RTCPeerConnection`, or cross-origin dynamic `import()`. The site sells a
      "your data never leaves the browser" promise — the build will fail if any
      of these reach `dist/`, but please confirm here too.
- [ ] No new `innerHTML` / `outerHTML` / `insertAdjacentHTML` sink, or, if one
      is unavoidable, every interpolation passes through `escapeHtml(...)` or
      is a `Node`.
- [ ] No new inline `<script>` or `<style>` block — and if one was added, the
      build's `inject-csp.mjs` step picked it up and the hash list in the CSP
      meta tag is non-empty for the affected pages. (Run `npm run build`
      locally; it logs `script hash(es) injected`.)
- [ ] No third-party CDN, font, image, or analytics added to any page.
- [ ] No secret, token, key, or credential committed.
- [ ] Dependencies added/upgraded? Lockfile reviewed; `npm audit --omit=dev
      --audit-level=high` clean.
- [ ] GitHub Actions changed? All third-party actions pinned to a full commit
      SHA with `# vX.Y.Z` comment; job-level `permissions` is least-privilege;
      `persist-credentials: false` on checkout where applicable.

## Test plan

-
