/** Head vs base of two snapshots, and the markdown the PR comment carries. */
import type { Snapshot } from "./snapshot";

/** The comment is found and edited by this marker, so a PR has one for its whole life. */
export const MARKER = "<!-- ds-metrics -->";

export type Delta = { base: number; head: number; delta: number };
export type Comparison = {
  totals: Record<"violations" | "files_with_violations", Delta>;
  rules: Record<string, Delta>;
  clusters: Record<string, Delta & { importers: Delta }>;
  areas: Record<string, { violations: Delta; ds_import_share: Delta }>;
  goals: Record<string, Delta & { target: number }>;
};

const delta = (head: number, base: number): Delta => ({ base, head, delta: Math.round((head - base) * 1000) / 1000 });
const keys = (...records: Record<string, unknown>[]) =>
  [...new Set(records.flatMap((r) => Object.keys(r)))].sort((a, b) => a.localeCompare(b));

/** A snapshot from an older checkout may lack keys; every record defaults so the comment still renders. */
function complete(s: Partial<Snapshot>): Snapshot {
  return {
    version: s.version ?? 0,
    commit: s.commit ?? "unknown",
    date: s.date ?? "",
    pr: s.pr ?? null,
    totals: { violations: s.totals?.violations ?? 0, files_with_violations: s.totals?.files_with_violations ?? 0 },
    rules: s.rules ?? {},
    clusters: s.clusters ?? {},
    areas: s.areas ?? {},
    goals: s.goals ?? {},
  };
}

export function compare(headIn: Partial<Snapshot>, baseIn: Partial<Snapshot>): Comparison {
  const head = complete(headIn);
  const base = complete(baseIn);
  const rules: Comparison["rules"] = {};
  for (const k of keys(head.rules, base.rules)) rules[k] = delta(head.rules[k] ?? 0, base.rules[k] ?? 0);
  const clusters: Comparison["clusters"] = {};
  for (const k of keys(head.clusters, base.clusters)) {
    const h = head.clusters[k] ?? { paths_remaining: 0, importers: 0 };
    const b = base.clusters[k] ?? { paths_remaining: 0, importers: 0 };
    clusters[k] = { ...delta(h.paths_remaining, b.paths_remaining), importers: delta(h.importers, b.importers) };
  }
  const areas: Comparison["areas"] = {};
  for (const k of keys(head.areas, base.areas)) {
    const h = head.areas[k] ?? { violations: 0, ds_import_share: 0 };
    const b = base.areas[k] ?? { violations: 0, ds_import_share: 0 };
    areas[k] = {
      violations: delta(h.violations, b.violations),
      ds_import_share: delta(h.ds_import_share ?? 0, b.ds_import_share ?? 0),
    };
  }
  const goals: Comparison["goals"] = {};
  for (const k of keys(head.goals, base.goals)) {
    const h = head.goals[k];
    const b = base.goals[k];
    goals[k] = { ...delta(h?.value ?? 0, b?.value ?? 0), target: (h ?? b)?.target ?? 0 };
  }
  return {
    totals: {
      violations: delta(head.totals.violations, base.totals.violations),
      files_with_violations: delta(head.totals.files_with_violations, base.totals.files_with_violations),
    },
    rules,
    clusters,
    areas,
    goals,
  };
}

const num = (n: number) => n.toLocaleString("en-US");
const signed = (n: number) => (n > 0 ? `+${num(n)}` : num(n));
const paren = (n: number) => (n === 0 ? "" : ` (${signed(n)})`);
const pct = (n: number) => `${Math.round(n * 100)}%`;
const isShare = (goal: string) => goal.startsWith("ds_render_share");

export function renderComparison(headIn: Partial<Snapshot>, baseIn: Partial<Snapshot>): string {
  const head = complete(headIn);
  const base = complete(baseIn);
  const c = compare(head, base);
  const total = c.totals.violations;
  const baseId = base.commit.slice(0, 10);
  const files = `${num(c.totals.files_with_violations.head)} files${paren(c.totals.files_with_violations.delta)}`;
  const lines = [MARKER, "## Design-system metrics", ""];
  const rulesMoved = Object.values(c.rules).some((r) => r.delta !== 0);
  if (total.delta === 0 && !rulesMoved) {
    lines.push(`**${num(total.head)} violations, no change** against the base branch (\`${baseId}\`).`);
  } else if (total.delta === 0) {
    lines.push(
      `**${num(total.head)} violations, same total as the base branch (\`${baseId}\`), with rules shifted**, in ${files}.`,
    );
  } else {
    const verb = total.delta < 0 ? "fewer" : "more";
    lines.push(
      `**${num(total.head)} violations (${signed(total.delta)}, ${num(Math.abs(total.delta))} ${verb} than the base branch \`${baseId}\`)**, in ${files}.`,
    );
  }
  if (base.version !== head.version) {
    lines.push(
      "",
      `<sub>the base snapshot is schema v${base.version}, this one v${head.version}; rows missing on one side count as 0</sub>`,
    );
  }
  lines.push("");

  const changedRules = Object.entries(c.rules).filter(([, d]) => d.delta !== 0);
  if (changedRules.length) {
    lines.push("| Rule | Base | Head | Delta |", "|---|---:|---:|---:|");
    for (const [rule, d] of changedRules)
      lines.push(`| ${rule} | ${num(d.base)} | ${num(d.head)} | ${signed(d.delta)} |`);
    lines.push("");
  }

  const changedClusters = Object.entries(c.clusters).filter(([, d]) => d.delta !== 0 || d.importers.delta !== 0);
  if (changedClusters.length) {
    lines.push("| Cluster | Local copies | Importers |", "|---|---:|---:|");
    for (const [name, d] of changedClusters) {
      const copies =
        d.head === 0 && d.base > 0
          ? "removed"
          : d.base === 0 && d.head > 0
            ? `${num(d.head)} (new)`
            : `${num(d.head)}${paren(d.delta)}`;
      lines.push(`| ${name} | ${copies} | ${num(d.importers.head)}${paren(d.importers.delta)} |`);
    }
    lines.push("");
  }

  lines.push("| Goal | Head | Delta | Target |", "|---|---:|---:|---:|");
  for (const [goal, d] of Object.entries(c.goals)) {
    const f = isShare(goal) ? pct : num;
    lines.push(
      `| ${goal.replace(/_/g, " ")} | ${f(d.head)} | ${isShare(goal) ? signed(Math.round(d.delta * 100)) + "%" : signed(d.delta)} | ${f(d.target)} |`,
    );
  }
  lines.push(
    "",
    `<sub>head \`${head.commit.slice(0, 10)}\` vs base \`${baseId}\` · \`bun run ds:metrics --compare base.json\`</sub>`,
  );
  return lines.join("\n");
}
