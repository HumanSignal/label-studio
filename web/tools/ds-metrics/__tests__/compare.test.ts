import { describe, expect, test } from "bun:test";
import { MARKER, compare, renderComparison } from "../compare";
import type { Snapshot } from "../snapshot";

const base: Snapshot = {
  version: 1,
  commit: "base000",
  date: "2026-11-01T00:00:00Z",
  pr: null,
  totals: { violations: 100, files_with_violations: 20 },
  rules: { "raw-control": 10, "color-literal": 90 },
  clusters: { Dropdown: { paths_remaining: 4, importers: 50 }, Spinner: { paths_remaining: 1, importers: 3 } },
  areas: { "lse/app": { violations: 100 } },
  goals: { raw_controls_lse_app: { value: 10, target: 0 }, ds_components: { value: 96, target: 30 } },
};

const head: Snapshot = {
  ...base,
  commit: "head000",
  pr: 42,
  totals: { violations: 93, files_with_violations: 19 },
  rules: { "raw-control": 10, "color-literal": 82, "legacy-icon": 1 },
  clusters: { Dropdown: { paths_remaining: 4, importers: 48 } },
  areas: { "lse/app": { violations: 93 } },
  goals: { raw_controls_lse_app: { value: 10, target: 0 }, ds_components: { value: 95, target: 30 } },
};

describe("compare", () => {
  test("computes deltas for totals, rules, clusters, areas and goals", () => {
    const d = compare(head, base);
    expect(d.totals.violations).toEqual({ base: 100, head: 93, delta: -7 });
    expect(d.rules["color-literal"]).toEqual({ base: 90, head: 82, delta: -8 });
    expect(d.rules["legacy-icon"]).toEqual({ base: 0, head: 1, delta: 1 });
    expect(d.clusters.Spinner).toEqual({ base: 1, head: 0, delta: -1, importers: { base: 3, head: 0, delta: -3 } });
    expect(d.clusters.Dropdown.importers.delta).toBe(-2);
    expect(d.goals.ds_components).toEqual({
      base: 96,
      head: 95,
      delta: -1,
      target: 30,
      isNew: false,
      isRemoved: false,
    });
    expect(d.areas["lse/app"].violations.delta).toBe(-7);
  });
});

describe("renderComparison", () => {
  test("starts with the marker and shows the direction of the change", () => {
    const md = renderComparison(head, base);
    expect(md.startsWith(MARKER)).toBe(true);
    expect(md).toContain("93");
    expect(md).toContain("-7");
    expect(md).toContain("color-literal");
    expect(md).toContain("legacy-icon");
    expect(md).toContain("+1");
    expect(md).toContain("Spinner");
    expect(md).toContain("removed");
  });

  test("tolerates a base from an older checkout that lacks keys", () => {
    const old = {
      version: 0,
      commit: "old",
      date: "",
      pr: null,
      totals: { violations: 93, files_with_violations: 19 },
    } as Snapshot;
    const md = renderComparison(head, old);
    expect(md.startsWith(MARKER)).toBe(true);
    expect(md).toContain("schema v0");
    expect(md).toContain("legacy-icon");
    expect(compare(head, {} as Snapshot).totals.violations).toEqual({ base: 0, head: 93, delta: 93 });
  });

  test("says when the total holds but rules shifted, and separates thousands", () => {
    const big: Snapshot = { ...base, totals: { violations: 1234567, files_with_violations: 20 } };
    const shifted: Snapshot = { ...big, rules: { "raw-control": 11, "color-literal": 89 } };
    const md = renderComparison(shifted, big);
    expect(md).toContain("**1 new violation** (no net change: rules shifted");
    expect(md).toContain("of 1,234,567 total violations");
    expect(md).toContain("| raw-control | 10 | 11 | +1 |");
    expect(md).not.toContain("0 more");
  });

  test("leads with the new violations, then the net change and the total", () => {
    const md = renderComparison(head, base);
    const [, , , headline, , total] = md.split("\n");
    expect(headline).toBe("**1 new violation** (-7 net against the base branch `" + base.commit.slice(0, 10) + "`)");
    expect(total).toBe("of 93 total violations, in 19 files (-1).");
  });

  test("says there are none when the PR only removes violations", () => {
    const cleaner: Snapshot = {
      ...base,
      rules: { ...base.rules, "color-literal": 80 },
      totals: { violations: 90, files_with_violations: 20 },
    };
    expect(renderComparison(cleaner, base)).toContain("**No new violations** (-10 net against the base branch");
  });

  test("a goal only one side has shows as new or no longer measured, never as a full-size change", () => {
    const withGoal: Snapshot = { ...base, goals: { ...base.goals, legacy_icons: { value: 780, target: 0 } } };
    expect(compare(withGoal, base).goals.legacy_icons.isNew).toBe(true);
    expect(renderComparison(withGoal, base)).toContain("| legacy icons | 780 | new | 0 |");
    expect(compare(base, withGoal).goals.legacy_icons.isRemoved).toBe(true);
    const md = renderComparison(base, withGoal);
    expect(md).not.toContain("| legacy icons |");
    expect(md).toContain("no longer measured: legacy icons");
  });

  test("says so when nothing changed", () => {
    const md = renderComparison(base, base);
    expect(md.startsWith(MARKER)).toBe(true);
    expect(md).toContain("**No new violations** (no change against the base branch");
    expect(md).not.toContain("| legacy-icon");
  });
});
