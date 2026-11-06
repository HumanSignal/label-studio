#!/usr/bin/env bun
/**
 * The design-system gate every moment calls (edit-time hook, pre-push, CI, review).
 *
 *   bun run ds:check                 files changed against the merge base with origin/main
 *   bun run ds:check <files…>        only those files, against their version at the merge base
 *   bun run ds:check --all           report the whole web (totals for the metrics); never fails
 *   --base <ref>                     compare with another branch (default: $DS_CHECK_BASE, else origin/main)
 *   --json                           machine-readable counts and deltas
 *
 * The baseline is the target branch itself, so there is nothing to update or commit: a file fails when a rule's
 * count rises against its merge-base version (a new file must be clean), and improvements are locked in on merge.
 * Run from services/lso/web or services/lse/web (LSE calls this file with `--web lse`).
 */
import fs from "node:fs";
import path from "node:path";
import { countFindings } from "./baseline";
import { runBiomePlugins } from "./biome";
import { checkChanges, removeStaleMirrors } from "./check";
import { type Change, changedFiles, mergeBase, prefetchBaseBlobs, readAtBase } from "./git";
import { buildContext, inScope, listScanFiles, loadTokenNames, scanSource } from "./scan";
import type { Finding, ManifestSlice } from "./types";

const lsoWebRoot = path.resolve(import.meta.dir, "../..");
const repoRoot = path.resolve(lsoWebRoot, "../../..");

const fail = (message: string): never => {
  console.error(`[ds-check] ${message}`);
  process.exit(2);
};
// Exit 1 means regressions and nothing else; anything unexpected is a tool error (2).
process.on("uncaughtException", (error) => fail(error.message));

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(name);
const valueOf = (name: string) => (flag(name) ? args[args.indexOf(name) + 1] : undefined);
const web = valueOf("--web") ?? (process.cwd().includes(`${path.sep}lse${path.sep}`) ? "lse" : "lso");
if (web !== "lso" && web !== "lse") fail(`--web must be lso or lse, got ${web}`);
const webRoot = path.join(repoRoot, "services", web, "web");
const positional = args.filter((arg, i) => !arg.startsWith("--") && !["--web", "--base"].includes(args[i - 1]));

const manifest = JSON.parse(
  fs.readFileSync(path.join(lsoWebRoot, "libs/ui/components.manifest.json"), "utf-8"),
) as ManifestSlice;
const tokenNames = loadTokenNames(
  fs.readFileSync(path.join(lsoWebRoot, "libs/ui/src/tokens/tokens.prefix.css"), "utf-8"),
);
const ctx = buildContext({ repoRoot, webRoot, tokenNames, manifest });
const readCurrent = (file: string) => fs.readFileSync(path.join(webRoot, file), "utf-8");

const byRule = (findings: Finding[]) => {
  const rules: Record<string, number> = {};
  for (const f of findings) rules[f.rule] = (rules[f.rule] ?? 0) + 1;
  return Object.fromEntries(Object.entries(rules).sort(([a], [b]) => a.localeCompare(b)));
};

if (flag("--all")) {
  const files = listScanFiles(webRoot);
  const findings = files.flatMap((file) => scanSource(path.join(webRoot, file), readCurrent(file), ctx));
  const roots = ["apps", "libs"].filter((dir) => fs.existsSync(path.join(webRoot, dir)));
  findings.push(...runBiomePlugins(webRoot, roots).filter((f) => inScope(f.file)));
  const counts = countFindings(findings);
  if (flag("--json")) {
    const totals = { violations: findings.length, files: Object.keys(counts).length, scanned: files.length };
    console.log(JSON.stringify({ web, scope: "all", totals, rules: byRule(findings), files: counts }, null, 2));
  } else {
    console.log(
      `[ds-check] ${web}: ${findings.length} violations in ${Object.keys(counts).length} of ${files.length} files.`,
    );
    for (const [rule, count] of Object.entries(byRule(findings))) console.log(`  ${rule.padEnd(20)} ${count}`);
  }
  process.exit(0);
}

const baseRef = valueOf("--base") || process.env.DS_CHECK_BASE || "origin/main";
if (/^0+$/.test(baseRef)) {
  console.log("[ds-check] new branch with no previous commit to compare with: nothing to check.");
  process.exit(0);
}
let base = "";
let changes: Change[] = [];
try {
  base = mergeBase(repoRoot, baseRef);
  changes = changedFiles(repoRoot, webRoot, base);
} catch (error) {
  fail((error as Error).message);
}

if (positional.length) {
  const toWebRelative = (file: string) =>
    path.relative(webRoot, path.resolve(process.cwd(), file)).split(path.sep).join("/");
  const missing = positional.filter((file) => !fs.existsSync(path.join(webRoot, toWebRelative(file))));
  if (missing.length) {
    fail(
      `not found: ${missing.join(", ")}. Paths are relative to services/${web}/web (bun run starts there) or absolute.`,
    );
  }
  const requested = new Set(positional.map(toWebRelative));
  changes = changes.filter((change) => requested.has(change.file));
}

const prefetched = prefetchBaseBlobs(
  repoRoot,
  webRoot,
  base,
  changes.filter((c) => c.baseFile && inScope(c.file)).map((c) => c.baseFile as string),
);
if (prefetched) console.log(`[ds-check] fetched ${prefetched} base version(s) in one request (partial clone).`);
for (const name of removeStaleMirrors(webRoot))
  console.log(`[ds-check] removed a mirror left by an interrupted run: ${name}`);
const result = checkChanges({
  webRoot,
  changes,
  ctx,
  readCurrent,
  readBase: (file) => readAtBase(repoRoot, webRoot, base, file),
  lint: runBiomePlugins,
});
const { regressions, improvements, findings } = result;

if (flag("--json")) {
  console.log(
    JSON.stringify(
      {
        web,
        scope: "changes",
        base: { ref: baseRef, sha: base },
        totals: { files: result.files.length, violations: findings.length },
        rules: byRule(findings),
        files: result.current,
        regressions,
        improvements,
      },
      null,
      2,
    ),
  );
  process.exit(regressions.length ? 1 : 0);
}

if (regressions.length) {
  console.error(
    `[ds-check] ${web}: ${regressions.length} design-system regression(s) against ${baseRef}; a file's count may only go down.\n`,
  );
  for (const delta of regressions) {
    console.error(`  ${delta.file}  ${delta.rule} ${delta.was} → ${delta.now}`);
    for (const f of findings.filter((x) => x.file === delta.file && x.rule === delta.rule)) {
      console.error(`    ${f.file}:${f.line}  ${f.message}`);
    }
  }
  console.error("\n  Fix the new violations. The component to use is in each message and in the design-system skill.");
  process.exit(1);
}

console.log(
  `[ds-check] ${web}: no regressions in ${result.files.length} changed file(s) against ${baseRef} (${findings.length} known violations).`,
);
if (improvements.length) {
  const dropped = improvements.reduce((sum, d) => sum + (d.was - d.now), 0);
  console.log(`[ds-check] ${dropped} violation(s) fewer than ${baseRef}; they are locked in when this merges.`);
}
