#!/usr/bin/env bun
/**
 * Design-system metrics for one checkout (both webs), from the manifest and `ds:check --all --json`.
 *
 *   bun run ds:metrics                       human summary
 *   bun run ds:metrics --json                the snapshot (schema in snapshot.ts)
 *   bun run ds:metrics --compare base.json   the PR comment markdown: this checkout vs a base snapshot
 *   bun run ds:metrics --append history.ndjson   add this checkout to the series (one line per commit)
 *   bun run ds:metrics --series history.ndjson   the dashboard data (points, clusters, goals, week delta); no snapshot
 *   --pr <n> --commit <sha> --date <iso>     identity of the snapshot (defaults: null, HEAD, now)
 *   --out <file>                             write the snapshot there as well
 *   --from <file>                            reuse a snapshot written with --out instead of computing one
 */
import fs from "node:fs";
import path from "node:path";
import { listScanFiles } from "../ds-check/scan";
import { renderComparison } from "./compare";
import { appendSnapshot, readHistory } from "./history";
import { buildSeries } from "./series";
import { type CheckAll, type Manifest, type RenderFile, type Snapshot, type Web, buildSnapshot } from "./snapshot";

const lsoWebRoot = path.resolve(import.meta.dir, "../..");
const repoRoot = path.resolve(lsoWebRoot, "../../..");
const webRoot = (web: Web) => path.join(repoRoot, "services", web, "web");

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(name);
const valueOf = (name: string) => {
  if (!flag(name)) return undefined;
  const value = args[args.indexOf(name) + 1];
  if (value === undefined || value === "" || value.startsWith("--")) fail(`${name} needs a value`);
  return value;
};

const fail = (message: string): never => {
  console.error(`[ds-metrics] ${message}`);
  process.exit(2);
};

function checkAll(web: Web): CheckAll {
  const result = Bun.spawnSync(
    ["bun", path.join(lsoWebRoot, "tools/ds-check/cli.ts"), "--web", web, "--all", "--json"],
    {
      cwd: webRoot(web),
      stdout: "pipe",
      stderr: "pipe",
    },
  );
  if (result.exitCode !== 0) fail(`ds:check --all failed for ${web}:\n${result.stderr.toString().slice(0, 2000)}`);
  return JSON.parse(result.stdout.toString()) as CheckAll;
}

const DS_IMPORT = /from\s+["']@humansignal\/ui(?:\/[^"']*)?["']/;
function renderFiles(web: Web): RenderFile[] {
  const root = webRoot(web);
  return listScanFiles(root)
    .filter((file) => /\.(tsx|jsx)$/.test(file))
    .map((file) => ({ web, file, importsDs: DS_IMPORT.test(fs.readFileSync(path.join(root, file), "utf-8")) }));
}

const git = (...cmd: string[]) => Bun.spawnSync(["git", ...cmd], { cwd: repoRoot, stdout: "pipe", stderr: "pipe" });

function snapshot(): Snapshot {
  const registry = JSON.parse(fs.readFileSync(path.join(lsoWebRoot, "libs/ui/components.manifest.json"), "utf-8"));
  const manifest: Manifest = {
    components: Object.values(registry.components),
    nonComponents: registry.nonComponents ?? [],
  };
  const commit = valueOf("--commit") ?? git("rev-parse", "HEAD").stdout.toString().trim();
  if (!commit) fail("cannot read HEAD; pass --commit <sha>");
  const pr = valueOf("--pr");
  if (pr !== undefined && !/^\d+$/.test(pr)) fail(`--pr must be a number, got ${pr}`);
  return buildSnapshot({
    commit,
    date: valueOf("--date") ?? new Date().toISOString(),
    pr: pr ? Number(pr) : null,
    manifest,
    webs: { lso: checkAll("lso"), lse: checkAll("lse") },
    renderFiles: [...renderFiles("lso"), ...renderFiles("lse")],
    exists: (p) => fs.existsSync(path.join(repoRoot, p)),
  });
}

const seriesFile = valueOf("--series");
if (seriesFile) {
  if (!fs.existsSync(seriesFile)) fail(`history not found: ${seriesFile}`);
  console.log(JSON.stringify(buildSeries(readHistory(seriesFile)), null, 2));
  process.exit(0);
}

const from = valueOf("--from");
if (from && !fs.existsSync(from)) fail(`snapshot not found: ${from}`);
const snap: Snapshot = from ? JSON.parse(fs.readFileSync(from, "utf-8")) : snapshot();
const out = valueOf("--out");
if (out) fs.writeFileSync(out, `${JSON.stringify(snap, null, 2)}\n`);

const baseFile = valueOf("--compare");
if (baseFile) {
  if (!fs.existsSync(baseFile)) fail(`base snapshot not found: ${baseFile}`);
  const base = JSON.parse(fs.readFileSync(baseFile, "utf-8")) as Snapshot;
  console.log(renderComparison(snap, base));
  process.exit(0);
}

const historyFile = valueOf("--append");
if (historyFile) {
  const written = appendSnapshot(historyFile, snap);
  console.log(
    `[ds-metrics] ${written ? "appended" : "already present"}: ${snap.commit.slice(0, 10)} in ${historyFile}`,
  );
  process.exit(0);
}

if (flag("--json")) {
  console.log(JSON.stringify(snap, null, 2));
  process.exit(0);
}

console.log(
  `[ds-metrics] ${snap.commit.slice(0, 10)}: ${snap.totals.violations} violations in ${snap.totals.files_with_violations} files.`,
);
for (const [rule, count] of Object.entries(snap.rules)) console.log(`  ${rule.padEnd(22)} ${count}`);
console.log("  goals");
for (const [goal, g] of Object.entries(snap.goals))
  console.log(`    ${goal.padEnd(38)} ${g.value}  (target ${g.target})`);
console.log(`  clusters: ${Object.keys(snap.clusters).length} with local copies remaining`);
