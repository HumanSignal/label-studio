#!/usr/bin/env bun
/**
 * Design-system metrics for one checkout (both webs), from the manifest and `ds:check --all --json`.
 *
 *   bun run ds:metrics                       human summary
 *   bun run ds:metrics --json                the snapshot (schema in snapshot.ts)
 *   bun run ds:metrics --compare base.json   the PR comment markdown: this checkout vs a base snapshot
 *   bun run ds:metrics --gate base.json      exit 1 when a rule's whole-repo count rose against the base snapshot
 *   bun run ds:metrics --append history.ndjson   add this checkout to the series (one line per commit)
 *   bun run ds:metrics --upsert history.ndjson   the same, replacing the line of the same commit (a remeasure)
 *   bun run ds:metrics --stale history.ndjson    the commits measured without one of today's rules, oldest first,
 *                                                one per line: the points to remeasure; no snapshot
 *   bun run ds:metrics --series history.ndjson   the dashboard data (points, clusters, goals, week delta); no snapshot
 *   --pr <n> --commit <sha> --date <iso>     identity of the snapshot (defaults: null, HEAD, now)
 *   --since <sha>                            the PRs merged after that commit up to --commit that changed web code
 *                                            go in the snapshot (default: the PR of the commit itself)
 *   --repo <path>                            another checkout of hs-platform, measured with this tool's rules
 *                                            and manifest (the history backfill)
 *   --out <file>                             write the snapshot there as well
 *   --from <file>                            reuse a snapshot written with --out instead of computing one
 */
import fs from "node:fs";
import path from "node:path";
import { DS_RULES } from "../ds-check/rules";
import { TEMPLATE_RULE, listTemplateFiles, scanTemplateSource } from "../ds-check/templates";
import { renderComparison, ruleIncreases } from "./compare";
import { appendSnapshot, readHistory, staleCommits, upsertSnapshot } from "./history";
import { mergedPrs } from "./prs";
import { buildSeries } from "./series";
import { type CheckAll, type Manifest, type Snapshot, type TemplateMeasure, type Web, buildSnapshot } from "./snapshot";

const lsoWebRoot = path.resolve(import.meta.dir, "../..");

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

const repoRoot = valueOf("--repo") ? path.resolve(valueOf("--repo") as string) : path.resolve(lsoWebRoot, "../../..");
if (!fs.existsSync(path.join(repoRoot, "services/lso/web"))) fail(`not an hs-platform checkout: ${repoRoot}`);
const webRoot = (web: Web) => path.join(repoRoot, "services", web, "web");

function checkAll(web: Web): CheckAll {
  const result = Bun.spawnSync(
    ["bun", path.join(lsoWebRoot, "tools/ds-check/cli.ts"), "--web", web, "--repo", repoRoot, "--all", "--json"],
    {
      cwd: webRoot(web),
      stdout: "pipe",
      stderr: "pipe",
    },
  );
  if (result.exitCode !== 0) fail(`ds:check --all failed for ${web}:\n${result.stderr.toString().slice(0, 2000)}`);
  return JSON.parse(result.stdout.toString()) as CheckAll;
}

const readRegistry = () =>
  JSON.parse(fs.readFileSync(path.join(lsoWebRoot, "libs/ui/components.manifest.json"), "utf-8")) as {
    components: Record<string, Manifest["components"][number]>;
    nonComponents?: string[];
  };

function measureTemplates(): TemplateMeasure {
  const files = listTemplateFiles(repoRoot);
  return {
    rawControls: files.reduce(
      (sum, file) =>
        sum +
        scanTemplateSource(file, fs.readFileSync(path.join(repoRoot, file), "utf-8")).filter(
          (finding) => finding.rule === TEMPLATE_RULE,
        ).length,
      0,
    ),
  };
}

const git = (...cmd: string[]) => Bun.spawnSync(["git", ...cmd], { cwd: repoRoot, stdout: "pipe", stderr: "pipe" });
const gitRunner = (args: string[]) => {
  const r = git(...args);
  return { exitCode: r.exitCode, stdout: r.stdout.toString(), stderr: r.stderr.toString() };
};
const prsOf = (commit: string, since: string | undefined) => {
  try {
    return mergedPrs(commit, since, gitRunner);
  } catch (error) {
    return fail((error as Error).message);
  }
};

function snapshot(): Snapshot {
  const registry = readRegistry();
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
    prs: prsOf(commit, valueOf("--since")),
    manifest,
    webs: { lso: checkAll("lso"), lse: checkAll("lse") },
    exists: (p) => fs.existsSync(path.join(repoRoot, p)),
    templates: measureTemplates(),
    measuredRules: DS_RULES,
  });
}

const seriesFile = valueOf("--series");
if (seriesFile) {
  if (!fs.existsSync(seriesFile)) fail(`history not found: ${seriesFile}`);
  console.log(JSON.stringify(buildSeries(readHistory(seriesFile)), null, 2));
  process.exit(0);
}

const staleFile = valueOf("--stale");
if (staleFile) {
  if (!fs.existsSync(staleFile)) fail(`history not found: ${staleFile}`);
  for (const commit of staleCommits(readHistory(staleFile), DS_RULES)) console.log(commit);
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

const gateFile = valueOf("--gate");
if (gateFile) {
  if (!fs.existsSync(gateFile)) fail(`base snapshot not found: ${gateFile}`);
  const base = JSON.parse(fs.readFileSync(gateFile, "utf-8")) as Snapshot;
  const increases = ruleIncreases(snap, base);
  if (!increases.length) {
    console.log(`[ds-metrics] no rule count rose against ${base.commit.slice(0, 10)}.`);
    process.exit(0);
  }
  console.error(`[ds-metrics] rule counts rose against ${base.commit.slice(0, 10)}:`);
  for (const r of increases) console.error(`  ${r.rule.padEnd(22)} ${r.base} -> ${r.head} (+${r.delta})`);
  process.exit(1);
}

const historyFile = valueOf("--append");
if (historyFile) {
  const written = appendSnapshot(historyFile, snap);
  console.log(
    `[ds-metrics] ${written ? "appended" : "already present"}: ${snap.commit.slice(0, 10)} in ${historyFile}`,
  );
  process.exit(0);
}

const upsertFile = valueOf("--upsert");
if (upsertFile) {
  console.log(`[ds-metrics] ${upsertSnapshot(upsertFile, snap)}: ${snap.commit.slice(0, 10)} in ${upsertFile}`);
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
