/**
 * One design-system snapshot per checkout, built from the component manifest and `ds:check --all --json` of both
 * webs. Pure: the CLI gathers the inputs, this file only derives numbers, so a commit always yields the same object.
 */
import type { AnnotatedFinding } from "../ds-check/findings";

export type Web = "lso" | "lse";

export type Manifest = {
  /** `retired`: copies a finished migration deleted; they still count where a commit has them. */
  components: { name: string; exports: string[]; replaces: string[]; retired?: string[] }[];
  nonComponents: string[];
};

/** The `ds:check --all --json` output of one web. */
export type CheckAll = {
  web: Web;
  scope: "all";
  totals: { violations: number; files: number; scanned: number };
  rules: Record<string, number>;
  files: Record<string, Record<string, number>>;
  findings: AnnotatedFinding[];
};

/** One dashboard area: the violations of its files. */
export type AreaMetrics = { violations: number };

export type SnapshotInput = {
  commit: string;
  date: string;
  pr: number | null;
  prs: PrRef[];
  manifest: Manifest;
  webs: Record<Web, CheckAll>;
  /** Whether a repo-relative path (file or directory) exists in this checkout. */
  exists: (repoRelativePath: string) => boolean;
  /**
   * The built-in Custom Interface templates, measured apart from the webs: their raw controls are their own area
   * and goal, and stay out of the rule counts the PR gate compares.
   */
  templates?: TemplateMeasure;
  /** The rules the tool measured this checkout with (`DS_RULES` of ds-check). */
  measuredRules: readonly string[];
};

/** The raw controls found in the template sources. */
export type TemplateMeasure = { rawControls: number };

/** The dashboard area of the template catalog. */
export const TEMPLATES_AREA = "lse/templates";

export type Goal = { value: number; target: number };
/** A pull request merged into main by (or since the previous point before) the snapshot's commit. */
export type PrRef = { number: number; title: string; commit: string };
export type Snapshot = {
  version: 1;
  commit: string;
  date: string;
  pr: number | null;
  prs: PrRef[];
  totals: { violations: number; files_with_violations: number };
  rules: Record<string, number>;
  clusters: Record<string, { paths_remaining: number; importers: number }>;
  areas: Record<string, AreaMetrics>;
  goals: Record<string, Goal>;
  /**
   * The rules this snapshot was measured with. A rule missing here was not measured, which is not a count of 0: the
   * point is stale and the backfill remeasures it. Points written before the field existed have none.
   */
  measured_rules?: string[];
};

/**
 * The scoreboard targets (Design System Adoption Report, board 07). Adoption is measured by violations only: every
 * place that does not use the design system is a violation, so zero violations is full adoption.
 */
export const TARGETS = {
  primitive_implementations_outside_ds: 10,
  ds_components: 30,
  raw_controls_lse_app: 0,
  legacy_icons: 0,
  /** Total violations on main 90 days after the gates went live. */
  total_90d: 1000,
  /** Raw controls left in the built-in Custom Interface templates. */
  raw_controls_templates: 0,
} as const;

/** The dashboard area a web-relative file belongs to. */
export function areaOf(web: Web, file: string): string {
  const [kind, name] = file.split("/");
  if (kind === "apps") return name === "labelstudio" ? `${web}/app` : `${web}/apps/${name}`;
  if (web === "lso" && (name === "editor" || name === "datamanager")) return name;
  return `${web}/libs/${name}`;
}

const sorted = <T>(record: Record<string, T>): Record<string, T> =>
  Object.fromEntries(Object.entries(record).sort(([a], [b]) => a.localeCompare(b)));

export function buildSnapshot(input: SnapshotInput): Snapshot {
  const findings = (["lso", "lse"] as Web[]).flatMap((web) => input.webs[web].findings.map((f) => ({ web, ...f })));

  const rules: Record<string, number> = {};
  for (const f of findings) rules[f.rule] = (rules[f.rule] ?? 0) + 1;

  const clusters: Snapshot["clusters"] = {};
  for (const component of input.manifest.components) {
    const paths = [...component.replaces, ...(component.retired ?? [])].filter((p) => !p.startsWith("jsx:"));
    if (!paths.length) continue;
    const remaining = paths.filter((p) => input.exists(p)).length;
    if (!remaining) continue;
    const importers = new Set(
      findings
        .filter((f) => f.rule === "replaced-import" && f.component === component.name)
        .map((f) => `${f.web}:${f.file}`),
    ).size;
    clusters[component.name] = { paths_remaining: remaining, importers };
  }

  const areas: Snapshot["areas"] = {};
  for (const f of findings) {
    const name = areaOf(f.web, f.file);
    areas[name] = { violations: (areas[name]?.violations ?? 0) + 1 };
  }
  const templates = input.templates;
  if (templates) areas[TEMPLATES_AREA] = { violations: templates.rawControls };

  const goals: Snapshot["goals"] = {
    primitive_implementations_outside_ds: {
      value: input.manifest.components
        .flatMap((c) => [...c.replaces, ...(c.retired ?? [])])
        .filter((p) => !p.startsWith("jsx:") && input.exists(p)).length,
      target: TARGETS.primitive_implementations_outside_ds,
    },
    // One per manifest entry: sub-parts (AccordionItem, AvatarStack) count with their parent, not as components.
    ds_components: { value: input.manifest.components.length, target: TARGETS.ds_components },
    // Every raw tag the rule flags (button, select, table, checkbox): each has a design-system replacement.
    raw_controls_lse_app: {
      value: findings.filter((f) => f.web === "lse" && f.rule === "raw-control" && areaOf("lse", f.file) === "lse/app")
        .length,
      target: TARGETS.raw_controls_lse_app,
    },
    legacy_icons: { value: rules["legacy-icon"] ?? 0, target: TARGETS.legacy_icons },
    ...(templates
      ? { raw_controls_templates: { value: templates.rawControls, target: TARGETS.raw_controls_templates } }
      : {}),
  };

  return {
    version: 1,
    commit: input.commit,
    date: input.date,
    pr: input.pr,
    prs: input.prs,
    totals: {
      violations: findings.length,
      files_with_violations: new Set(findings.map((f) => `${f.web}:${f.file}`)).size,
    },
    rules: sorted(rules),
    clusters: sorted(clusters),
    areas: sorted(areas),
    goals,
    measured_rules: [...input.measuredRules].sort((a, b) => a.localeCompare(b)),
  };
}
