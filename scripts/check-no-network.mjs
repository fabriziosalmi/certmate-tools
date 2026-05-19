#!/usr/bin/env node
/**
 * Verify the built site contains no network egress primitives.
 *
 * This tool is sold on "your data never leaves the browser". The CSP enforces
 * that at runtime (connect-src 'none'), this check enforces it at build time
 * so a regression fails CI before deploy.
 *
 * Scans dist/**\/*.{html,js,mjs,css} for the obvious sinks. The patterns are
 * deliberately broad — false positives are cheap (allowlist with the marker),
 * a false negative would mean a silent data leak.
 */
import { readdir, readFile } from "node:fs/promises";
import { join, resolve, extname } from "node:path";

const DIST = resolve(process.argv[2] ?? "dist");

// Allowlist marker. If a file legitimately mentions one of these patterns
// (e.g. documentation strings), add `// no-network-ok` near the match.
const ALLOW_MARKER = "no-network-ok";

const PATTERNS = [
  { name: "fetch(",            re: /\bfetch\s*\(/ },
  { name: "XMLHttpRequest",    re: /\bXMLHttpRequest\b/ },
  { name: "new WebSocket",     re: /\bnew\s+WebSocket\b/ },
  { name: "new EventSource",   re: /\bnew\s+EventSource\b/ },
  { name: "navigator.sendBeacon", re: /\bsendBeacon\b/ },
  { name: "import(http(s):)",  re: /\bimport\s*\(\s*["'`]https?:/ },
  { name: "RTCPeerConnection", re: /\bRTCPeerConnection\b/ },
  { name: "navigator.connection", re: /\bnavigator\.connection\b/ },
];

const SCAN_EXTS = new Set([".html", ".js", ".mjs", ".css"]);

async function walk(dir) {
  const out = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (e.isFile() && SCAN_EXTS.has(extname(p))) out.push(p);
  }
  return out;
}

const files = await walk(DIST);
let violations = 0;

for (const file of files) {
  const txt = await readFile(file, "utf8");
  for (const { name, re } of PATTERNS) {
    if (!re.test(txt)) continue;
    // Cheap line-level allowlist
    const lines = txt.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      if (!re.test(lines[i])) continue;
      if (lines[i].includes(ALLOW_MARKER)) continue;
      // Check the immediately previous/next line too, for minified code
      // splits.
      const ctx = (lines[i - 1] || "") + lines[i] + (lines[i + 1] || "");
      if (ctx.includes(ALLOW_MARKER)) continue;
      console.error(
        `check-no-network: ${file}:${i + 1} contains "${name}" — breaks the no-upload promise`
      );
      violations++;
    }
  }
}

if (violations > 0) {
  console.error(
    `check-no-network: ${violations} violation(s). Either remove the call, or annotate with "${ALLOW_MARKER}" if it is genuinely safe.`
  );
  process.exit(1);
}

console.log(`check-no-network: ${files.length} file(s) scanned, no network egress found`);
