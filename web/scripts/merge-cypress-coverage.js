#!/usr/bin/env node
/**
 * Merge multiple Cypress chunk coverage JSONs (Istanbul format) into one.
 * Usage: node merge-cypress-coverage.js [--chunks-dir <path>] [--out <path>]
 * Default: --chunks-dir coverage-chunks, --out libs/editor/.nyc_output/out.json
 */
const path = require("node:path");
const fs = require("node:fs");

function parseArgs() {
  const args = process.argv.slice(2);
  let chunksDir = path.resolve(process.cwd(), "coverage-chunks");
  let out = path.resolve(process.cwd(), "libs/editor/.nyc_output/out.json");
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--chunks-dir" && args[i + 1]) chunksDir = path.resolve(process.cwd(), args[++i]);
    else if (args[i] === "--out" && args[i + 1]) out = path.resolve(process.cwd(), args[++i]);
  }
  return { chunksDir, out };
}

function mergeChunkEntries(entries) {
  if (entries.length === 0) return null;
  if (entries.length === 1) return entries[0];
  const merged = {
    statementMap: {},
    s: {},
    branchMap: entries[0].branchMap || {},
    b: {},
    fnMap: entries[0].fnMap || {},
    f: {},
  };
  const allS = new Set();
  const allB = new Set();
  const allF = new Set();
  for (const e of entries) {
    for (const k of Object.keys(e.statementMap ?? {})) allS.add(k);
    for (const k of Object.keys(e.branchMap ?? {})) allB.add(k);
    for (const k of Object.keys(e.fnMap ?? {})) allF.add(k);
  }
  for (const id of allS) {
    let stmt = null;
    let maxCount = 0;
    for (const e of entries) {
      if (e.statementMap?.[id]) stmt = e.statementMap[id];
      const c = e.s?.[id] ?? 0;
      if (c > maxCount) maxCount = c;
    }
    if (stmt) {
      merged.statementMap[id] = stmt;
      merged.s[id] = maxCount;
    }
  }
  for (const id of allB) {
    let map = null;
    const counts = [];
    for (const e of entries) {
      if (e.branchMap?.[id]) map = e.branchMap[id];
      const arr = e.b?.[id];
      counts.push(Array.isArray(arr) ? arr : [0]);
    }
    if (map) {
      merged.branchMap[id] = map;
      const len = Math.max(...counts.map((c) => c.length));
      merged.b[id] = Array.from({ length: len }, (_, i) =>
        Math.max(...counts.map((c) => (c[i] !== undefined ? c[i] : 0))),
      );
    }
  }
  for (const id of allF) {
    let fn = null;
    let maxCount = 0;
    for (const e of entries) {
      if (e.fnMap?.[id]) fn = e.fnMap[id];
      const c = e.f?.[id] ?? 0;
      if (c > maxCount) maxCount = c;
    }
    if (fn) {
      merged.fnMap[id] = fn;
      merged.f[id] = maxCount;
    }
  }
  return merged;
}

function mergeCoverage(chunkPaths) {
  const byPath = {};
  for (const p of chunkPaths) {
    if (!fs.existsSync(p)) {
      console.error("Chunk file not found:", p);
      process.exit(1);
    }
    const cov = JSON.parse(fs.readFileSync(p, "utf8"));
    for (const [file, entry] of Object.entries(cov)) {
      if (!byPath[file]) byPath[file] = [];
      byPath[file].push(entry);
    }
  }
  const merged = {};
  for (const [file, entries] of Object.entries(byPath)) {
    const m = mergeChunkEntries(entries);
    if (m) merged[file] = m;
  }
  return merged;
}

function main() {
  const { chunksDir, out } = parseArgs();
  if (!fs.existsSync(chunksDir)) {
    console.error("Chunks dir not found:", chunksDir);
    process.exit(1);
  }
  const files = fs.readdirSync(chunksDir).filter((f) => f.endsWith(".json"));
  const chunkPaths = files.map((f) => path.join(chunksDir, f));
  if (chunkPaths.length === 0) {
    console.error("No chunk JSONs in", chunksDir);
    process.exit(1);
  }
  const merged = mergeCoverage(chunkPaths);
  const outDir = path.dirname(out);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(out, JSON.stringify(merged));
  console.log("Merged", chunkPaths.length, "chunks ->", out);
}

main();
