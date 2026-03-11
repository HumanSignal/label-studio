#!/usr/bin/env node
/**
 * Discover e2e Cypress specs and split into N chunks for parallel CI.
 * Prints a JSON matrix for GitHub Actions: { "include": [ { "chunk": "chunk_1", "specs": "path1,path2,..." }, ... ] }
 *
 * Usage (from repo root or web/): node scripts/cypress-spec-chunks.js [--dir <e2e-dir>] [--chunks N]
 * Default: --dir libs/editor/tests/integration/e2e, --chunks 2
 * Paths in output are relative to cwd (run from web/ in CI).
 */
const path = require("node:path");
const fs = require("node:fs");

function parseArgs() {
  const args = process.argv.slice(2);
  let dir = "libs/editor/tests/integration/e2e";
  let chunks = 2;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--dir" && args[i + 1]) dir = args[++i];
    else if (args[i] === "--chunks" && args[i + 1]) chunks = Math.max(1, Number.parseInt(args[++i], 10) || 2);
  }
  return { dir, chunks };
}

function findSpecs(dir, cwd) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    const rel = path.relative(cwd, full).replace(/\\/g, "/");
    if (e.isDirectory()) {
      results.push(...findSpecs(full, cwd));
    } else if (e.isFile() && e.name.endsWith(".cy.ts")) {
      results.push(rel);
    }
  }
  return results;
}

function main() {
  const { dir, chunks } = parseArgs();
  const cwd = process.cwd();
  const resolvedDir = path.resolve(cwd, dir);
  const specs = findSpecs(resolvedDir, cwd).sort();
  if (specs.length === 0) {
    console.error("No *.cy.ts specs found under", resolvedDir);
    process.exit(1);
  }
  const perChunk = Math.ceil(specs.length / chunks);
  const include = [];
  for (let i = 0; i < chunks; i++) {
    const start = i * perChunk;
    const end = Math.min(start + perChunk, specs.length);
    if (start >= specs.length) break;
    const slice = specs.slice(start, end);
    include.push({
      chunk: `chunk_${i + 1}`,
      specs: slice.join(","),
    });
  }
  console.log(JSON.stringify({ include }));
}

main();
