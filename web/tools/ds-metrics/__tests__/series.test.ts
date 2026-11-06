import { describe, expect, test } from "bun:test";
import { buildSeries } from "../series";
import type { Snapshot } from "../snapshot";

const snap = (commit: string, date: string, violations: number, extra: Partial<Snapshot> = {}): Snapshot => ({
  version: 1,
  commit,
  date,
  pr: null,
  totals: { violations, files_with_violations: Math.round(violations / 5) },
  rules: { "raw-control": Math.round(violations / 10), "color-literal": violations - Math.round(violations / 10) },
  clusters: { Dropdown: { paths_remaining: 5, importers: 50 }, Spinner: { paths_remaining: 5, importers: 54 } },
  areas: {
    "lse/app": { violations: violations - 100, render_files: 800, ds_import_share: 0.7 },
    editor: { violations: 100, render_files: 200, ds_import_share: 0.4 },
  },
  goals: {
    raw_buttons_lse_app: { value: Math.round(violations / 40), target: 0 },
    ds_exports: { value: 96, target: 30 },
  },
  ...extra,
});

// written out of order on purpose: the series sorts by date
const history = [
  snap("c3", "2026-11-06T10:00:00Z", 4688, {
    clusters: { Dropdown: { paths_remaining: 5, importers: 48 } },
    areas: {
      "lse/app": { violations: 4588, render_files: 810, ds_import_share: 0.72 },
      editor: { violations: 100, render_files: 200, ds_import_share: 0.4 },
    },
  }),
  snap("a1", "2026-10-26T10:00:00Z", 4800),
  snap("b2", "2026-11-02T10:00:00Z", 4700, {
    clusters: { Dropdown: { paths_remaining: 5, importers: 48 }, Spinner: { paths_remaining: 5, importers: 54 } },
  }),
];

describe("buildSeries", () => {
  const series = buildSeries(history);

  test("points: one row per snapshot in date order, rules and goals as columns", () => {
    expect(series.points.map((p) => [p.commit, p.violations])).toEqual([
      ["a1", 4800],
      ["b2", 4700],
      ["c3", 4688],
    ]);
    expect(series.points[2]["rule_raw-control"]).toBe(469);
    expect(series.points[2].goal_raw_buttons_lse_app).toBe(117);
    expect(series.points[2].files_with_violations).toBe(938);
  });

  test("clusters: every cluster ever seen has a row per point, zero once its paths are gone", () => {
    const spinner = series.clusters.filter((r) => r.cluster === "Spinner").map((r) => r.importers);
    expect(spinner).toEqual([54, 54, 0]);
    expect(series.clusters.filter((r) => r.commit === "c3").map((r) => r.cluster)).toEqual(["Dropdown", "Spinner"]);
    expect(series.clusters.at(-1)).toEqual({
      date: "2026-11-06T10:00:00Z",
      commit: "c3",
      cluster: "Spinner",
      importers: 0,
      paths_remaining: 0,
    });
  });

  test("areas: one row per area per point", () => {
    expect(series.areas.filter((r) => r.commit === "c3")).toEqual([
      {
        date: "2026-11-06T10:00:00Z",
        commit: "c3",
        area: "editor",
        violations: 100,
        render_files: 200,
        ds_import_share: 0.4,
      },
      {
        date: "2026-11-06T10:00:00Z",
        commit: "c3",
        area: "lse/app",
        violations: 4588,
        render_files: 810,
        ds_import_share: 0.72,
      },
    ]);
  });

  test("targets carry the scoreboard values and the 90-day total", () => {
    expect(series.targets.raw_buttons_lse_app).toBe(0);
    expect(series.targets.ds_render_share_lse).toBe(0.95);
    expect(series.targets.total_90d).toBe(1000);
  });

  test("the week delta compares the latest point with the last one at least seven days older", () => {
    expect(series.week.latest?.commit).toBe("c3");
    expect(series.week.since?.commit).toBe("a1");
    expect(series.week.violations).toBe(-112);
    expect(series.week.rules["raw-control"]).toBe(469 - 480);
  });

  test("snapshots are ordered by time, whatever timezone offset their dates carry", () => {
    // 17:10+01:00 is 16:10Z, earlier than 16:34Z, although it sorts later as text
    const mixed = buildSeries([
      snap("bbbb", "2026-11-06T16:34:41Z", 200),
      snap("aaaa", "2026-11-06T17:10:00+01:00", 100),
    ]);
    expect(mixed.points.map((p) => p.commit)).toEqual(["aaaa", "bbbb"]);
    expect(mixed.week.latest?.commit).toBe("bbbb");
  });

  test("a single point has no week delta and an empty history is empty", () => {
    const one = buildSeries([history[0]]);
    expect(one.week.since).toBeNull();
    expect(one.week.violations).toBe(0);
    const none = buildSeries([]);
    expect(none.points).toEqual([]);
    expect(none.week.latest).toBeNull();
  });
});
