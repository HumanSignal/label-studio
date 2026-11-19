import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "bun:test";
import { MARKER } from "../compare";

const lsoWebRoot = path.resolve(import.meta.dir, "../../..");
const repoRoot = path.resolve(lsoWebRoot, "../../..");
// The snapshot covers both webs; the LSO unit job checks out only services/lso/web.
const bothWebs = fs.existsSync(path.join(repoRoot, "services/lse/web/package.json"));
const templateCatalog = fs.existsSync(
  path.join(repoRoot, "services/lse/label_studio_enterprise/lse_interfaces/system_template_catalog"),
);

const run = (...args: string[]) =>
  Bun.spawnSync(["bun", "tools/ds-metrics/cli.ts", ...args], { cwd: lsoWebRoot, stdout: "pipe", stderr: "pipe" });

describe.skipIf(!bothWebs)("ds:metrics", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ds-metrics-cli-"));
  const head = path.join(dir, "head.json");

  test("--json prints one deterministic snapshot of the checkout with the schema", () => {
    const r = run("--json", "--commit", "test0000", "--date", "2026-11-06T00:00:00Z", "--pr", "7", "--out", head);
    expect(r.exitCode).toBe(0);
    const snap = JSON.parse(r.stdout.toString());
    expect(Object.keys(snap)).toEqual([
      "version",
      "commit",
      "date",
      "pr",
      "prs",
      "totals",
      "rules",
      "clusters",
      "areas",
      "goals",
    ]);
    expect(snap).toMatchObject({ version: 1, commit: "test0000", pr: 7 });
    expect(snap.totals.violations).toBe(Object.values(snap.rules as Record<string, number>).reduce((a, b) => a + b, 0));
    expect(Object.keys(snap.goals)).toEqual([
      "primitive_implementations_outside_ds",
      "ds_components",
      "raw_controls_lse_app",
      "legacy_icons",
      "raw_controls_templates",
    ]);
    expect(snap.areas["lse/app"]).toEqual({ violations: expect.any(Number) });
    expect(snap.areas["lse/app"].violations).toBeGreaterThan(0);
    if (templateCatalog) expect(snap.areas["lse/templates"].violations).toBe(snap.goals.raw_controls_templates.value);
    expect(fs.existsSync(head)).toBe(true);
  }, 90_000);

  test("--from with --compare renders the comment without recomputing", () => {
    const r = run("--from", head, "--compare", head);
    expect(r.exitCode).toBe(0);
    expect(r.stdout.toString().startsWith(MARKER)).toBe(true);
    expect(r.stdout.toString()).toContain("no change");
  });

  test("--append writes the line once", () => {
    const history = path.join(dir, "history.ndjson");
    expect(run("--from", head, "--append", history).stdout.toString()).toContain("appended");
    expect(run("--from", head, "--append", history).stdout.toString()).toContain("already present");
    expect(fs.readFileSync(history, "utf-8").trim().split("\n")).toHaveLength(1);
  });

  test("a missing base snapshot is a tool error", () => {
    const r = run("--from", head, "--compare", path.join(dir, "missing.json"));
    expect(r.exitCode).toBe(2);
    expect(r.stderr.toString()).toContain("not found");
  });
});
