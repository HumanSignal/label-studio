/**
 * Active-binding resolution — shared by the stage overlay (mounted inside
 * each object tag) and the bottombar toolbar (mounted once per annotation).
 * Both surfaces need to agree on which control + backend is currently
 * "driving" interactive ML.
 */

import { interactiveCapabilityStore } from "./store";
import type { InteractiveBinding } from "./types";

const CONTROL_TAG_MAP: Record<string, string> = {
  // Note: `control.type` lowercased can differ from the XML tag name. e.g.
  // BitmaskLabels' MST type is "bitmaskregion" (see Labels/Bitmask model).
  bitmasklabels: "BitmaskLabels",
  bitmaskregion: "BitmaskLabels",
  rectanglelabels: "RectangleLabels",
  polygonlabels: "PolygonLabels",
  vectorlabels: "VectorLabels",
  videorectangle: "VideoRectangle",
  videovectorlabels: "VideoVectorLabels",
  // `<VideoVector>` (separated, paired with a sibling `<Labels>`) drives the
  // same vector capability the backend advertises as "VideoVectorLabels".
  // It carries no labels of its own (`SeparatedControlMixin.isSeparated`), so
  // it resolves via Pattern 2 below rather than Pattern 1.
  videovector: "VideoVectorLabels",
};

export function controlTagTypeFor(control: any): string | null {
  if (!control) return null;
  return CONTROL_TAG_MAP[(control.type ?? "").toLowerCase()] ?? null;
}

export function controlHasSelectedLabel(control: any): boolean {
  return (control?.selectedLabels?.length ?? 0) > 0;
}

/**
 * Each drawing control registers one or more tools under `control.tools`
 * (map of toolName → ToolModel). Each tool carries `.selected`, managed by
 * the ToolsManager on the object tag. When multiple drawing controls are
 * valid candidates for the same (object, label), the currently-selected
 * tool is the tiebreaker — it reflects the user's explicit choice from the
 * toolbar's smart-tool dropdown.
 */
function controlHasSelectedTool(control: any): boolean {
  const tools = control?.tools;
  if (!tools) return false;
  for (const key of Object.keys(tools)) {
    if (tools[key]?.selected) return true;
  }
  return false;
}

/** Pick the first candidate whose tool is selected; fall back to the first. */
function pickByActiveTool<T extends { control: any }>(candidates: T[]): T | null {
  if (candidates.length === 0) return null;
  const active = candidates.find((c) => controlHasSelectedTool(c.control));
  return active ?? candidates[0];
}

export interface ResolvedBinding {
  control: any;
  binding: InteractiveBinding;
  /**
   * When the drawing control doesn't own its labels (e.g., `<VideoRectangle>`
   * paired with a sibling `<Labels>`), this carries the Labels control so
   * callers can read `getResultValue()` / `selectedLabels` from the right
   * source at Accept time.
   */
  labelSource?: any;
}

/**
 * Pick the control whose type matches a registered capability binding and
 * has an associated label selection. Two patterns are supported:
 *
 *   1. **Self-labeled controls** (VideoVectorLabels, BitmaskLabels,
 *      RectangleLabels, ...): the control itself holds the selected label.
 *   2. **Sibling-Labels controls** (VideoRectangle): a `<Labels>` tag
 *      targeting the same object holds the selection; the drawing control
 *      is otherwise unlabeled.
 *
 * First match wins, iteration order follows `annotation.names` (XML order).
 */
export function resolveActiveBinding(
  annotation: any,
  projectId: number | null,
  restrictToObjectName?: string,
): ResolvedBinding | null {
  if (!annotation || projectId == null) return null;
  const bindings = interactiveCapabilityStore.getBindings(projectId);
  if (bindings.length === 0) return null;

  const names = annotation.names;
  if (!names) return null;
  const controls: any[] = [];
  for (const v of (names as any).values?.() ?? []) {
    controls.push(v);
  }

  // Pattern 1: control carries its own selected label.
  const selfLabeled: ResolvedBinding[] = [];
  for (const c of controls) {
    if (!controlHasSelectedLabel(c)) continue;
    if (restrictToObjectName && c.toname && c.toname !== restrictToObjectName) continue;
    const tagType = controlTagTypeFor(c);
    if (!tagType) continue;
    const binding = bindings.find((b) => b.controlTag === tagType);
    if (binding) selfLabeled.push({ control: c, binding });
  }
  const selfPick = pickByActiveTool(selfLabeled);
  if (selfPick) return selfPick;

  // Pattern 2: Labels sibling. Find a `<Labels>` tag with a selected label,
  // then look for all compatible drawing controls targeting the same object.
  // If several drawing controls qualify (e.g. <VideoRectangle> AND
  // <VideoVectorLabels> both target the video), the user's active toolbar
  // tool breaks the tie — we pick the control that owns the selected tool.
  for (const labelsCtl of controls) {
    if ((labelsCtl?.type ?? "").toLowerCase() !== "labels") continue;
    if (!controlHasSelectedLabel(labelsCtl)) continue;
    const objectName = labelsCtl.toname;
    if (!objectName) continue;
    if (restrictToObjectName && objectName !== restrictToObjectName) continue;

    const candidates: ResolvedBinding[] = [];
    for (const drawCtl of controls) {
      if (drawCtl === labelsCtl) continue;
      if (drawCtl.toname !== objectName) continue;
      // Skip self-labeled controls (VideoVectorLabels, BitmaskLabels, ...):
      // they have their own labels and should be driven by Pattern 1,
      // not by an external <Labels> tag. Their mapped capability name
      // ends with "Labels" by convention. Separated drawing controls
      // (`isSeparated`, e.g. `<VideoVector>`) are exempt — they keep no
      // labels of their own even when their capability tag ends in "Labels",
      // so they remain valid Pattern-2 candidates.
      const tagType = controlTagTypeFor(drawCtl);
      if (!tagType) continue;
      if (tagType.endsWith("Labels") && !drawCtl.isSeparated) continue;
      const binding = bindings.find((b) => b.controlTag === tagType);
      if (binding) candidates.push({ control: drawCtl, binding, labelSource: labelsCtl });
    }
    const picked = pickByActiveTool(candidates);
    if (picked) return picked;
  }

  return null;
}
