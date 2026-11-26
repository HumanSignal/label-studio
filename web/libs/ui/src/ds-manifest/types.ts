/**
 * The contract every component folder fulfils with its `<name>.manifest.ts`.
 * `bun run ds:manifest` collects the fragments into `libs/ui/components.manifest.json` and renders
 * the design-system skill from them; `--check` is the lint gate.
 */
import type { ControlSizing } from "./control-sizes";

export type Tier = 1 | 2;

/**
 * The groups the components are listed under, in display order: the Storybook sidebar (one section
 * heading per category), the skill and the docs. Grouping lives here, not in folders, so no import path depends on it.
 * `Product` holds components that only make sense in Label Studio.
 */
export const CATEGORIES = [
  "Inputs",
  "Data display",
  "Feedback",
  "Surfaces",
  "Navigation",
  "Layout",
  "Utilities",
  "Product",
] as const;
export type Category = (typeof CATEGORIES)[number];

export type Deprecation = {
  /** Name of the manifest entry that takes over. Must exist and must not be deprecated itself. */
  replaced_by: string;
  reason: string;
};

export type ComponentManifest = {
  /** Entry name; must be one of `exports`. */
  name: string;
  /** 1 = canonical primitive (the lookup answer), 2 = pattern composed from tier 1. */
  tier: Tier;
  /** The group the component is listed under; every story of the folder is titled `<category>/…`. */
  category: Category;
  /** Every capitalised export of the folder that `@humansignal/ui` re-exports. */
  exports: string[];
  /** What a caller needs, in their words. Each intent resolves to exactly one component. Empty when deprecated. */
  intent: string[];
  use_when: string;
  never_when: string[];
  props_rules?: string[];
  /**
   * How the component takes part in the control size scale (`CONTROL_SIZES`): `control` takes `size` with the
   * three shared values, `fixed` has one size and fits a row of any of them, `none` is not a row control
   * (an editor, a drop area, a label). Required in the Inputs category.
   */
  sizing?: "control" | "fixed" | "none";
  /** Repo paths (from the monorepo root) or `jsx:`/`css:` patterns of the local look-alikes this replaces. */
  replaces: string[];
  /**
   * Repo paths of local look-alikes a finished migration deleted. When a migration deletes a copy, its path moves
   * here from `replaces`: `ds:metrics` still counts it on older commits, so the adoption history keeps the
   * cluster and its drop to zero. A retired path must no longer exist.
   */
  retired?: string[];
  notes?: string;
  /** A deprecated entry keeps its exports but never answers a lookup; lint bans new imports of it. */
  deprecated?: Deprecation;
};

export type GapManifest = {
  intent: string[];
  use_when: string;
  replaces: string[];
  notes?: string;
};

export type ManifestConfig = {
  package: string;
  /** Components the library should have but does not export yet. */
  gaps: Record<string, GapManifest>;
  /** Exported names that are implementation details, with the reason. */
  internal: Record<string, string>;
  /** Capitalised exports that are not React components (constants, enums, symbols). */
  nonComponents: string[];
};

export type RegistryComponent = ComponentManifest & { dir: string };

export type Manifest = {
  version: number;
  package: string;
  controlSizes: ControlSizing;
  components: Record<string, RegistryComponent>;
  gaps: Record<string, GapManifest>;
  internal: Record<string, string>;
  nonComponents: string[];
};

export const defineManifest = (manifest: ComponentManifest | ComponentManifest[]) => manifest;
