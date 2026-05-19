#!/usr/bin/env node
/**
 * Finalize Content-Security-Policy in built HTML files.
 *
 * Reads dist/**\/*.html, computes sha256-<base64> for every inline <script>
 * and <style> block, then substitutes the unique hash list for the
 * __CSP_SCRIPT_HASHES__ and __CSP_STYLE_HASHES__ tokens in the CSP meta tag.
 *
 * Runs after `astro build`. See package.json "build" script.
 *
 * Invariants checked:
 *   - Every HTML file must contain both tokens (otherwise CSP wasn't templated).
 *   - Every HTML file must contain a Content-Security-Policy meta tag.
 *   - Fails the build (exit 1) on any deviation so misconfiguration cannot ship.
 */
import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const DIST = resolve(process.argv[2] ?? "dist");

async function walk(dir) {
  const out = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (e.isFile() && p.endsWith(".html")) out.push(p);
  }
  return out;
}

function sha256(content) {
  return "'sha256-" + createHash("sha256").update(content, "utf8").digest("base64") + "'";
}

function collectInline(html, tag) {
  // Match the EXACT byte content between <tag ...> and </tag>. The browser
  // hashes the literal characters, so we must hash the same bytes — no
  // trimming, no normalization. Empty bodies are ignored.
  const re = new RegExp(`<${tag}\\b([^>]*)>([\\s\\S]*?)</${tag}>`, "gi");
  const hashes = new Set();
  let match;
  while ((match = re.exec(html))) {
    const attrs = match[1] || "";
    const body = match[2];
    // Skip blocks that are sourced externally — they aren't inline.
    if (/\bsrc\s*=/.test(attrs) || /\bhref\s*=/.test(attrs)) continue;
    if (!body) continue;
    hashes.add(sha256(body));
  }
  return [...hashes];
}

const SCRIPT_TOKEN = "__CSP_SCRIPT_HASHES__";
const STYLE_TOKEN = "__CSP_STYLE_HASHES__";

const files = await walk(DIST);
if (files.length === 0) {
  console.error(`inject-csp: no HTML files found in ${DIST}`);
  process.exit(1);
}

let errors = 0;
let scriptHashes = 0;
let styleHashes = 0;

for (const file of files) {
  let html = await readFile(file, "utf8");

  if (!/Content-Security-Policy/i.test(html)) {
    console.error(`inject-csp: ${file} is missing the CSP meta tag`);
    errors++;
    continue;
  }
  if (!html.includes(SCRIPT_TOKEN) || !html.includes(STYLE_TOKEN)) {
    console.error(`inject-csp: ${file} is missing CSP placeholder tokens`);
    errors++;
    continue;
  }

  const scripts = collectInline(html, "script");
  const styles = collectInline(html, "style");
  scriptHashes += scripts.length;
  styleHashes += styles.length;

  html = html
    .replaceAll(SCRIPT_TOKEN, scripts.join(" "))
    .replaceAll(STYLE_TOKEN, styles.join(" "));

  await writeFile(file, html, "utf8");
}

if (errors > 0) {
  console.error(`inject-csp: ${errors} file(s) failed validation — refusing to ship`);
  process.exit(1);
}

console.log(
  `inject-csp: ${files.length} HTML file(s) processed, ${scriptHashes} script hash(es), ${styleHashes} style hash(es) injected`
);
