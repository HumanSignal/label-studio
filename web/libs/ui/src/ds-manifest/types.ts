/**
 * The contract every component folder fulfils with its `<name>.manifest.ts`.
 * `bun run ds:manifest` collects the fragments into `libs/ui/components.manifest.json` and renders
 * the design-system skill from them; `--check` is the lint gate.
 */
export type Tier = 1 | 2;

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
  /** Every capitalised export of the folder that `@humansignal/ui` re-exports. */
  exports: string[];
  /** What a caller needs, in their words. Each intent resolves to exactly one component. Empty when deprecated. */
  intent: string[];
  use_when: string;
  never_when: string[];
  props_rules?: string[];
  /** Repo paths (from the monorepo root) or `jsx:`/`css:` patterns of the local look-alikes this replaces. */
  replaces: string[];
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
  components: Record<string, RegistryComponent>;
  gaps: Record<string, GapManifest>;
  internal: Record<string, string>;
  nonComponents: string[];
};

export const defineManifest = (manifest: ComponentManifest | ComponentManifest[]) => manifest;
