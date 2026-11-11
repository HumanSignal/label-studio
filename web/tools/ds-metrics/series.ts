/**
 * The dashboard's data: the history as three row tables (one file each on the dashboard), the targets, and the
 * change over the last week for the weekly note.
 */
import { type PrRef, TARGETS, type Snapshot } from "./snapshot";

export type PointRow = {
  date: string;
  commit: string;
  violations: number;
  files_with_violations: number;
  prs: PrRef[];
} & Record<string, number | string | PrRef[]>;
export type ClusterRow = { date: string; commit: string; cluster: string; importers: number; paths_remaining: number };
export type AreaRow = {
  date: string;
  commit: string;
  area: string;
  violations: number;
  render_files: number;
  ds_import_share: number;
};

export type Series = {
  points: PointRow[];
  clusters: ClusterRow[];
  areas: AreaRow[];
  targets: Record<string, number | null>;
  week: { since: PointRow | null; latest: PointRow | null; violations: number; rules: Record<string, number> };
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const toPoint = (s: Snapshot): PointRow => ({
  date: s.date,
  commit: s.commit,
  violations: s.totals.violations,
  files_with_violations: s.totals.files_with_violations,
  // points written before the field existed have none
  prs: s.prs ?? [],
  ...Object.fromEntries(Object.entries(s.rules).map(([rule, n]) => [`rule_${rule}`, n])),
  ...Object.fromEntries(Object.entries(s.goals).map(([goal, g]) => [`goal_${goal}`, g.value])),
});

export function buildSeries(history: Snapshot[]): Series {
  // by time, not as text: commit dates keep their committer's timezone offset
  const ordered = [...history].sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  const points = ordered.map(toPoint);

  const clusterNames = [...new Set(ordered.flatMap((s) => Object.keys(s.clusters)))].sort((a, b) => a.localeCompare(b));
  const clusters: ClusterRow[] = ordered.flatMap((s) =>
    clusterNames.map((cluster) => ({
      date: s.date,
      commit: s.commit,
      cluster,
      importers: s.clusters[cluster]?.importers ?? 0,
      paths_remaining: s.clusters[cluster]?.paths_remaining ?? 0,
    })),
  );

  const areas: AreaRow[] = ordered.flatMap((s) =>
    Object.entries(s.areas)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([area, a]) => ({ date: s.date, commit: s.commit, area, ...a })),
  );

  const targets: Series["targets"] = { ...TARGETS };

  const latest = ordered.at(-1) ?? null;
  const week: Series["week"] = { since: null, latest: latest ? toPoint(latest) : null, violations: 0, rules: {} };
  if (latest) {
    const cutoff = new Date(latest.date).getTime() - WEEK_MS;
    const since = [...ordered].reverse().find((s) => s !== latest && new Date(s.date).getTime() <= cutoff) ?? null;
    if (since) {
      week.since = toPoint(since);
      week.violations = latest.totals.violations - since.totals.violations;
      for (const rule of new Set([...Object.keys(latest.rules), ...Object.keys(since.rules)])) {
        week.rules[rule] = (latest.rules[rule] ?? 0) - (since.rules[rule] ?? 0);
      }
    }
  }
  return { points, clusters, areas, targets, week };
}
