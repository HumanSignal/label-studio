/**
 * Collects every `<folder>/<name>.manifest.ts` under libs/ui/src/lib into the registry and validates
 * the contract: a folder exported from index.ts has a manifest and a story, names and exports are
 * unique, intents resolve to one component, deprecations point at live entries, replaced paths exist.
 */
import fs from "node:fs";
import path from "node:path";
import { manifestConfig } from "../../libs/ui/src/ds-manifest/config";
import type { ComponentManifest, Manifest, RegistryComponent } from "../../libs/ui/src/ds-manifest/types";

export const REGISTRY_VERSION = 2;
export const webRoot = path.resolve(import.meta.dir, "../..");
export const repoRoot = path.resolve(webRoot, "../../..");
export const uiSrc = path.join(webRoot, "libs/ui/src");
export const libDir = path.join(uiSrc, "lib");
export const registryPath = path.join(webRoot, "libs/ui/components.manifest.json");
export const skillPath = path.join(repoRoot, ".agents/skills/design-system/SKILL.md");

const TREES = ["services/lso/web", "services/lse/web"];

export function listFiles(dir: string, keep: (file: string) => boolean): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(full, keep));
    else if (keep(entry.name)) out.push(full);
  }
  return out.sort();
}

export const fragmentFiles = () => listFiles(libDir, (f) => f.endsWith(".manifest.ts"));
export const hasStory = (dir: string) => listFiles(dir, (f) => /\.stories\.tsx$/.test(f)).length > 0;

/** `lib/<folder>` for every module index.ts re-exports from. */
export function indexModuleDirs(): string[] {
  const index = fs.readFileSync(path.join(uiSrc, "index.ts"), "utf-8");
  const dirs = new Set<string>();
  for (const match of index.matchAll(/from\s+"\.\/lib\/([^"/]+)[^"]*"/g)) dirs.add(`lib/${match[1]}`);
  return [...dirs].sort();
}

const isPathLike = (replaced: string) => !replaced.startsWith("jsx:") && !replaced.startsWith("css:");
const treeOf = (relative: string) => TREES.find((tree) => relative.startsWith(`${tree}/`));
const checkedOut = (relative: string) => {
  const tree = treeOf(relative);
  return tree === undefined || fs.existsSync(path.join(repoRoot, tree));
};

export type LoadResult = { manifest: Manifest; problems: string[]; skippedPaths: string[] };

export async function loadManifest(): Promise<LoadResult> {
  const problems: string[] = [];
  const skippedPaths: string[] = [];
  const components: Record<string, RegistryComponent> = {};
  const fragmentDirs = new Set<string>();

  for (const file of fragmentFiles()) {
    const dir = path.relative(uiSrc, path.dirname(file)).split(path.sep).join("/");
    const label = path.relative(uiSrc, file);
    fragmentDirs.add(dir);
    const mod = (await import(file)) as { default?: ComponentManifest | ComponentManifest[] };
    const entries = Array.isArray(mod.default) ? mod.default : mod.default ? [mod.default] : [];
    if (!entries.length) problems.push(`${label}: default export must be defineManifest(...)`);
    if (!hasStory(path.dirname(file))) problems.push(`${dir}: no *.stories.tsx; every component ships with a story`);
    for (const entry of entries) {
      if (components[entry.name]) problems.push(`${label}: ${entry.name} is defined twice`);
      components[entry.name] = { ...entry, dir };
      if (!entry.exports.includes(entry.name))
        problems.push(`${entry.name}: the entry name must be one of its exports`);
      if (![1, 2].includes(entry.tier)) problems.push(`${entry.name}: tier must be 1 or 2`);
      if (entry.deprecated) {
        if (entry.intent.length)
          problems.push(`${entry.name}: a deprecated entry must have no intent (it never answers a lookup)`);
      } else {
        if (!entry.use_when.trim()) problems.push(`${entry.name}: use_when is empty`);
        if (entry.tier === 1 && !entry.intent.length) problems.push(`${entry.name}: tier 1 needs at least one intent`);
        if (entry.tier === 1 && !entry.never_when.length) problems.push(`${entry.name}: tier 1 needs never_when`);
      }
    }
  }

  // one folder that index.ts exports, one manifest; one manifest, one exported folder
  const exportedDirs = indexModuleDirs();
  const fragmentTop = new Set([...fragmentDirs].map((d) => d.split("/").slice(0, 2).join("/")));
  for (const dir of exportedDirs) {
    if (!fragmentTop.has(dir)) problems.push(`${dir}: exported from index.ts but has no *.manifest.ts`);
  }
  for (const dir of fragmentTop) {
    if (!exportedDirs.includes(dir)) problems.push(`${dir}: has a manifest but index.ts does not export it`);
  }

  // exports claimed once; deprecations resolve; intents unique
  const owners = new Map<string, string>();
  const claim = (name: string, owner: string) => {
    if (owners.has(name)) problems.push(`${name} is claimed by ${owners.get(name)} and ${owner}`);
    owners.set(name, owner);
  };
  for (const c of Object.values(components)) for (const exp of c.exports) claim(exp, c.name);
  for (const name of Object.keys(manifestConfig.internal)) claim(name, "internal");
  for (const name of manifestConfig.nonComponents) claim(name, "nonComponents");
  for (const name of Object.keys(manifestConfig.gaps)) {
    if (owners.has(name)) problems.push(`gap ${name} is already exported: move it from gaps to a manifest`);
  }
  for (const c of Object.values(components)) {
    const target = c.deprecated?.replaced_by;
    if (!target) continue;
    if (!components[target]) problems.push(`${c.name}: replaced_by ${target} is not a manifest entry`);
    else if (components[target].deprecated) problems.push(`${c.name}: replaced_by ${target} is deprecated too`);
  }
  const byIntent = new Map<string, string[]>();
  for (const c of Object.values(components)) {
    if (c.tier !== 1 || c.deprecated) continue;
    for (const intent of c.intent) byIntent.set(intent, [...(byIntent.get(intent) ?? []), c.name]);
  }
  for (const [name, gap] of Object.entries(manifestConfig.gaps)) {
    for (const intent of gap.intent) byIntent.set(intent, [...(byIntent.get(intent) ?? []), `gap:${name}`]);
  }
  for (const [intent, names] of byIntent) {
    if (names.length > 1) problems.push(`intent "${intent}" resolves to ${names.join(", ")}: one component per intent`);
  }

  // replaced paths exist until the look-alike is deleted
  const seen = new Map<string, string>();
  const checkReplaces = (owner: string, list: readonly string[]) => {
    for (const replaced of list) {
      if (seen.has(replaced)) problems.push(`${replaced} listed twice (${seen.get(replaced)}, ${owner})`);
      seen.set(replaced, owner);
      if (!isPathLike(replaced)) continue;
      if (!checkedOut(replaced)) skippedPaths.push(replaced);
      else if (!fs.existsSync(path.join(repoRoot, replaced)))
        problems.push(`${owner}: replaced path ${replaced} no longer exists`);
    }
  };
  for (const c of Object.values(components)) checkReplaces(c.name, c.replaces);
  for (const [name, gap] of Object.entries(manifestConfig.gaps)) checkReplaces(`gaps.${name}`, gap.replaces);

  const sorted = Object.fromEntries(Object.entries(components).sort(([a], [b]) => a.localeCompare(b)));
  const manifest: Manifest = {
    version: REGISTRY_VERSION,
    package: manifestConfig.package,
    components: sorted,
    gaps: manifestConfig.gaps,
    internal: manifestConfig.internal,
    nonComponents: manifestConfig.nonComponents,
  };
  return { manifest, problems, skippedPaths };
}

export const renderRegistry = (manifest: Manifest) =>
  `${JSON.stringify(
    {
      $comment:
        "Generated by `bun run ds:manifest` from libs/ui/src/lib/**/*.manifest.ts and libs/ui/src/ds-manifest/config.ts. Edit those, not this file.",
      ...manifest,
    },
    null,
    2,
  )}\n`;
