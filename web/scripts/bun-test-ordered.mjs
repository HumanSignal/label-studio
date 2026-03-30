#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

/**
 * Ordered Bun test runner.
 *
 * - Discovers test files under provided roots
 * - Sorts files lexicographically for deterministic order
 * - Runs Bun with discovered files in that order
 *
 * Usage:
 *   node scripts/bun-test-ordered.mjs [roots...] -- [bun test args...]
 *
 * Examples:
 *   node scripts/bun-test-ordered.mjs libs/editor/src
 *   node scripts/bun-test-ordered.mjs libs/editor/src -- --bail=1 --only-failures
 *   node scripts/bun-test-ordered.mjs libs/editor/src -- --max-concurrency=20
 */

const rawArgs = process.argv.slice(2);

if (rawArgs.includes("-h") || rawArgs.includes("--help")) {
  console.log(`Ordered Bun test runner

Usage:
  node scripts/bun-test-ordered.mjs [roots...] -- [bun args...]

Notes:
  - roots default to "." when omitted
  - file order is deterministic (sorted path list)
  - concurrency is controlled by Bun args; not overridden here
`);
  process.exit(0);
}

const separatorIndex = rawArgs.indexOf("--");
const targets = separatorIndex >= 0 ? rawArgs.slice(0, separatorIndex) : rawArgs;
const bunArgs = separatorIndex >= 0 ? rawArgs.slice(separatorIndex + 1) : [];

const roots = targets.length > 0 ? targets : ["."];
const skipDirs = new Set(["node_modules", ".git", "coverage", "dist", "build", ".nx", ".turbo"]);

const isTestFile = (filePath) => {
  const normalized = filePath.split(path.sep).join("/");
  const isInTestsDir = normalized.includes("/__tests__/");
  const hasTestLikeName = /\.(test|spec)\.(js|jsx|ts|tsx)$/.test(normalized);
  const hasSupportedExt = /\.(js|jsx|ts|tsx)$/.test(normalized);
  return hasTestLikeName || (isInTestsDir && hasSupportedExt);
};

const collectFiles = (entryPath, out) => {
  const absPath = path.resolve(entryPath);
  if (!fs.existsSync(absPath)) return;

  const stat = fs.statSync(absPath);
  if (stat.isFile()) {
    if (isTestFile(absPath)) out.push(absPath);
    return;
  }

  if (!stat.isDirectory()) return;

  for (const entry of fs.readdirSync(absPath, { withFileTypes: true })) {
    if (entry.isDirectory() && skipDirs.has(entry.name)) continue;
    collectFiles(path.join(absPath, entry.name), out);
  }
};

const files = [];
for (const root of roots) collectFiles(root, files);

const uniqueSortedFiles = [...new Set(files)]
  .map((absPath) => path.relative(process.cwd(), absPath))
  .sort((a, b) => a.localeCompare(b));

if (!uniqueSortedFiles.length) {
  console.error("No test files found for provided paths.");
  process.exit(1);
}

const bunBin = path.resolve("node_modules/.bin/bun");
const args = ["test", "--dom", ...bunArgs, ...uniqueSortedFiles];
const result = spawnSync(bunBin, args, { stdio: "inherit" });

process.exit(result.status ?? 1);
