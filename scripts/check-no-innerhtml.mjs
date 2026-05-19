#!/usr/bin/env node
/**
 * Fail the build if any source file introduces an HTML-injection sink.
 *
 * Tool render code is required to use `el()` / `frag()` / `mount()` from
 * src/lib/dom.ts. The DOM helpers funnel every interpolation through
 * createTextNode/setAttribute, which makes the XSS class structurally
 * impossible regardless of caller discipline. This guard preserves that
 * invariant against drift.
 *
 * Allowlist: a line containing `// innerhtml-ok` is exempt — use sparingly
 * and only for documentation/comments that mention the API name.
 */
import { readdir, readFile } from "node:fs/promises";
import { join, resolve, extname } from "node:path";

const ROOT = resolve(process.argv[2] ?? "src");

const SINKS = [
  { name: "innerHTML",          re: /\.innerHTML\s*=/ },
  { name: "outerHTML",          re: /\.outerHTML\s*=/ },
  { name: "insertAdjacentHTML", re: /\.insertAdjacentHTML\b/ },
  { name: "set:html",           re: /\bset:html\b/ },
  { name: "document.write",     re: /\bdocument\.write\s*\(/ },
];

const ALLOW = "innerhtml-ok";
const EXTS = new Set([".astro", ".ts", ".tsx", ".js", ".mjs"]);

async function walk(dir) {
  const out = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name === "node_modules" || e.name.startsWith(".")) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (e.isFile() && EXTS.has(extname(p))) out.push(p);
  }
  return out;
}

const files = await walk(ROOT);
let violations = 0;
for (const file of files) {
  const lines = (await readFile(file, "utf8")).split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    for (const { name, re } of SINKS) {
      if (!re.test(lines[i])) continue;
      if (lines[i].includes(ALLOW)) continue;
      console.error(
        `check-no-innerhtml: ${file}:${i + 1} introduces "${name}" — use el()/mount() from src/lib/dom.ts instead`
      );
      violations++;
    }
  }
}

if (violations > 0) {
  console.error(
    `check-no-innerhtml: ${violations} violation(s). If a use is genuinely safe, annotate with "${ALLOW}".`
  );
  process.exit(1);
}
console.log(`check-no-innerhtml: ${files.length} source file(s) scanned, no HTML-injection sinks found`);
