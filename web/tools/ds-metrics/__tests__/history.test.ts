import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { appendSnapshot, readHistory, staleCommits, upsertSnapshot } from "../history";
import type { Snapshot } from "../snapshot";

let dir: string;
const snap = (commit: string, violations: number): Snapshot => ({
  version: 1,
  commit,
  date: `2026-11-0${violations % 9}T00:00:00Z`,
  pr: null,
  totals: { violations, files_with_violations: 1 },
  rules: {},
  clusters: {},
  areas: {},
  goals: {},
});

beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "ds-metrics-history-"));
});
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

describe("history", () => {
  test("append writes one line per commit and read returns them in order", () => {
    const file = path.join(dir, "history.ndjson");
    expect(appendSnapshot(file, snap("a", 10))).toBe(true);
    expect(appendSnapshot(file, snap("b", 9))).toBe(true);
    expect(fs.readFileSync(file, "utf-8").split("\n").filter(Boolean)).toHaveLength(2);
    expect(readHistory(file).map((s) => [s.commit, s.totals.violations])).toEqual([
      ["a", 10],
      ["b", 9],
    ]);
  });

  test("the same commit is not appended twice", () => {
    const file = path.join(dir, "history.ndjson");
    expect(appendSnapshot(file, snap("b", 9))).toBe(false);
    expect(readHistory(file)).toHaveLength(2);
  });

  test("a missing file reads as an empty series", () => {
    expect(readHistory(path.join(dir, "nope.ndjson"))).toEqual([]);
  });

  test("a corrupt line fails instead of reading as a shorter series", () => {
    const file = path.join(dir, "corrupt.ndjson");
    fs.writeFileSync(file, `${JSON.stringify(snap("a", 1))}\n{not json\n`);
    expect(() => readHistory(file)).toThrow(/line 2/);
  });

  test("upsert replaces the line of the same commit in place and appends a new one", () => {
    const file = path.join(dir, "upsert.ndjson");
    appendSnapshot(file, snap("a", 10));
    appendSnapshot(file, snap("b", 9));
    expect(upsertSnapshot(file, snap("a", 4))).toBe("replaced");
    expect(upsertSnapshot(file, snap("c", 2))).toBe("appended");
    expect(readHistory(file).map((s) => [s.commit, s.totals.violations])).toEqual([
      ["a", 4],
      ["b", 9],
      ["c", 2],
    ]);
  });

  test("stale: the points measured without one of the rules, or before the field existed, oldest first", () => {
    const rules = ["color-literal", "control-size"];
    const history = [
      { ...snap("new", 3), measured_rules: ["color-literal", "control-size", "raw-control"] },
      { ...snap("partial", 2), measured_rules: ["color-literal"] },
      snap("legacy", 1),
    ];
    expect(staleCommits(history, rules)).toEqual(["legacy", "partial"]);
  });
});
