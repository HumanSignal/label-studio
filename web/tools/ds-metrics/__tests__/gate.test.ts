import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, test } from "bun:test";
import { ACCEPT_LABEL, renderComparison, ruleIncreases } from "../compare";

const lsoWebRoot = path.resolve(import.meta.dir, "../../..");
const snap = (commit: string, rules: Record<string, number>) => ({
  version: 2,
  commit,
  date: "2026-11-13T00:00:00Z",
  pr: null,
  totals: { violations: Object.values(rules).reduce((a, b) => a + b, 0), files_with_violations: 1 },
  rules,
  clusters: {},
  areas: {},
  goals: {},
});

describe("rule count gate", () => {
  test("a new rule with findings in untouched code is an increase", () => {
    const base = snap("base000000", { "badge-props": 4 });
    const head = snap("head000000", { "badge-props": 4, "button-look": 16 });
    expect(ruleIncreases(head, base)).toEqual([{ rule: "button-look", base: 0, head: 16, delta: 16 }]);
  });

  test("fewer findings, or the same count, is not an increase", () => {
    const base = snap("base000000", { "badge-props": 4, "button-look": 16 });
    expect(ruleIncreases(snap("head000000", { "badge-props": 3, "button-look": 16 }), base)).toEqual([]);
  });

  test("a rule going up while another goes down still blocks", () => {
    const base = snap("base000000", { "badge-props": 4, "button-look": 2 });
    const head = snap("head000000", { "badge-props": 1, "button-look": 3 });
    expect(ruleIncreases(head, base).map((r) => r.rule)).toEqual(["button-look"]);
  });

  test("the PR comment says what blocks the merge and how to accept it", () => {
    const md = renderComparison(snap("head000000", { "button-look": 16 }), snap("base000000", {}));
    expect(md).toContain("**Blocks the merge:** `button-look` +16");
    expect(md).toContain(ACCEPT_LABEL);
    expect(renderComparison(snap("head000000", {}), snap("base000000", { "button-look": 2 }))).not.toContain(
      "Blocks the merge",
    );
  });

  test("--gate exits 1 on an increase and 0 otherwise", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ds-metrics-gate-"));
    const write = (name: string, s: object) => {
      const file = path.join(dir, name);
      fs.writeFileSync(file, JSON.stringify(s));
      return file;
    };
    const base = write("base.json", snap("base000000", { "button-look": 0 }));
    const up = write("up.json", snap("head000000", { "button-look": 16 }));
    const same = write("same.json", snap("head000000", { "button-look": 0 }));
    const run = (head: string) =>
      Bun.spawnSync(["bun", "tools/ds-metrics/cli.ts", "--from", head, "--gate", base], {
        cwd: lsoWebRoot,
        stdout: "pipe",
        stderr: "pipe",
      });

    const blocked = run(up);
    expect(blocked.exitCode).toBe(1);
    expect(blocked.stderr.toString()).toContain("button-look");
    expect(run(same).exitCode).toBe(0);
  });
});
