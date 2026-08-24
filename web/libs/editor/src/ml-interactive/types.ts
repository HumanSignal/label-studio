/**
 * ML-backend capability types.
 *
 * Phase-1 scaffolding for the auto-bind flow that will replace the
 * <SegmentAnything> tag. A backend declares what kinds of prompts it
 * accepts (`point`, `box`) and which control tags it can drive. LS
 * matches those `targets` against the project's annotation config and
 * produces a flat list of `InteractiveBinding`s — one per (backend ×
 * control-tag) pair — which UI layers can query at render time.
 */

export type PromptKind = "point" | "box";
export type OutputKind = "mask" | "bbox" | "polygon";

/** One control-tag that a backend advertises support for. */
export interface CapabilityTarget {
  /** Control-tag type string, e.g. "BitmaskLabels" or "VideoRectangle". */
  tag: string;
  /** Shape the FE should build from the backend's mask output. */
  output: OutputKind;
  /** Optional per-target capabilities. Known today: "track". */
  features?: string[];
}

/** Raw capabilities blob returned by a single ML backend. */
export interface Capabilities {
  prompts: PromptKind[];
  targets: CapabilityTarget[];
  model_info?: { name?: string; version?: string };
}

/** A backend + its capabilities, as cached by the FE store. */
export interface InteractiveBackend {
  id: number;
  title?: string;
  capabilities: Capabilities;
}

/**
 * Flattened binding: one per (backend × control-tag) pair present in the
 * project. Consumed by the runtime — e.g. a BitmaskLabels control tag
 * looks up its own bindings to decide whether SAM interactions are
 * available for it, which prompt kinds to expose, and whether the
 * floating region toolbar should show a "Track Forward" button.
 */
export interface InteractiveBinding {
  backendId: number;
  /** User's title for the ML backend in LS settings. May be missing. */
  backendTitle?: string;
  /** Model's self-reported identity from the capabilities endpoint. */
  modelInfo?: { name?: string; version?: string };
  controlTag: string;
  output: OutputKind;
  prompts: PromptKind[];
  features: Set<string>;
}

/**
 * Minimal shape of the globals the interactive layer reads from `window`.
 * Narrows the `window as any` dance in one place so call sites can say
 * `window.DM?.project?.id` directly. APP_SETTINGS is injected by LS's
 * server-rendered bootstrap; DM is attached by the DataManager mount.
 */
declare global {
  interface Window {
    APP_SETTINGS?: {
      hostname?: string;
      feature_flags?: Record<string, boolean>;
      feature_flags_default_value?: boolean;
    };
    DM?: {
      project?: { id?: number };
    };
  }
}
