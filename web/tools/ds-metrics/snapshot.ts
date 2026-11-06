/**
 * One design-system snapshot per checkout, built from the component manifest and `ds:check --all --json` of both
 * webs. Pure: the CLI gathers the inputs, this file only derives numbers, so a commit always yields the same object.
 */
import type { AnnotatedFinding } from "../ds-check/findings";

export type Web = "lso" | "lse";

export type Manifest = {
  components: { name: string; exports: string[]; replaces: string[] }[];
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

/** A file the scan covers that can render UI (tsx or jsx), and whether it imports from @humansignal/ui. */
export type RenderFile = { web: Web; file: string; importsDs: boolean };

export type SnapshotInput = {
  commit: string;
  date: string;
  pr: number | null;
  manifest: Manifest;
  webs: Record<Web, CheckAll>;
  renderFiles: RenderFile[];
  /** Whether a repo-relative path (file or directory) exists in this checkout. */
  exists: (repoRelativePath: string) => boolean;
};

export type Goal = { value: number; target: number };
export type Snapshot = {
  version: 1;
  commit: string;
  date: string;
  pr: number | null;
  totals: { violations: number; files_with_violations: number };
  rules: Record<string, number>;
  clusters: Record<string, { paths_remaining: number; importers: number }>;
  areas: Record<string, { violations: number; render_files: number; ds_import_share: number | null }>;
  goals: Record<string, Goal>;
};

/** The scoreboard targets (Design System Adoption Report, board 07). Shares are fractions of render files. */
export const TARGETS = {
  primitive_implementations_outside_ds: 10,
  ds_exports: 30,
  raw_buttons_lse_app: 0,
  legacy_icons: 0,
  ds_render_share_lse: 0.95,
  ds_render_share_lso: 0.7,
  /** Total violations on main 90 days after the gates went live. */
  total_90d: 1000,
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

const round = (n: number) => Math.round(n * 1000) / 1000;

export function buildSnapshot(input: SnapshotInput): Snapshot {
  const findings = (["lso", "lse"] as Web[]).flatMap((web) => input.webs[web].findings.map((f) => ({ web, ...f })));

  const rules: Record<string, number> = {};
  for (const f of findings) rules[f.rule] = (rules[f.rule] ?? 0) + 1;

  const clusters: Snapshot["clusters"] = {};
  for (const component of input.manifest.components) {
    const paths = component.replaces.filter((p) => !p.startsWith("jsx:"));
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
  const area = (name: string) => (areas[name] ??= { violations: 0, render_files: 0, ds_import_share: 0 });
  for (const f of findings) area(areaOf(f.web, f.file)).violations += 1;
  const dsFiles: Record<string, number> = {};
  for (const r of input.renderFiles) {
    const name = areaOf(r.web, r.file);
    area(name).render_files += 1;
    if (r.importsDs) dsFiles[name] = (dsFiles[name] ?? 0) + 1;
  }
  for (const [name, a] of Object.entries(areas)) {
    a.ds_import_share = a.render_files ? round((dsFiles[name] ?? 0) / a.render_files) : null;
  }

  const share = (web: Web) => {
    const files = input.renderFiles.filter((r) => r.web === web);
    return files.length ? round(files.filter((r) => r.importsDs).length / files.length) : 0;
  };
  const nonComponents = new Set(input.manifest.nonComponents);
  const goals: Snapshot["goals"] = {
    primitive_implementations_outside_ds: {
      value: input.manifest.components
        .flatMap((c) => c.replaces)
        .filter((p) => !p.startsWith("jsx:") && input.exists(p)).length,
      target: TARGETS.primitive_implementations_outside_ds,
    },
    // The manifest's exports are index.ts minus nonComponents and the entries marked internal (contexts, helpers).
    ds_exports: {
      value: input.manifest.components
        .flatMap((c) => c.exports)
        .filter((e) => /^[A-Z]/.test(e) && !nonComponents.has(e)).length,
      target: TARGETS.ds_exports,
    },
    raw_buttons_lse_app: {
      value: findings.filter(
        (f) =>
          f.web === "lse" && f.rule === "raw-control" && f.element === "button" && areaOf("lse", f.file) === "lse/app",
      ).length,
      target: TARGETS.raw_buttons_lse_app,
    },
    legacy_icons: { value: rules["legacy-icon"] ?? 0, target: TARGETS.legacy_icons },
    ds_render_share_lse: { value: share("lse"), target: TARGETS.ds_render_share_lse },
    ds_render_share_lso: { value: share("lso"), target: TARGETS.ds_render_share_lso },
  };

  return {
    version: 1,
    commit: input.commit,
    date: input.date,
    pr: input.pr,
    totals: {
      violations: findings.length,
      files_with_violations: new Set(findings.map((f) => `${f.web}:${f.file}`)).size,
    },
    rules: sorted(rules),
    clusters: sorted(clusters),
    areas: sorted(areas),
    goals,
  };
}
