/**
 * React hooks for the ML-interactive capability store.
 *
 * Phase-1 scaffolding only: these expose the data the rest of the stack
 * will consume in later phases. Nothing here touches the DOM or the
 * editor yet — components opt in by calling the hooks.
 */

import { useEffect, useMemo } from "react";

import { interactiveCapabilityStore } from "./store";
import type { InteractiveBackend, InteractiveBinding } from "./types";

/**
 * Kick off the capability load for a project on mount. Safe to call from
 * multiple components — the store dedups concurrent loads.
 *
 * Returns a loading-status snapshot useful for debug / dev panels. In a
 * mobx-`observer` context the returned `bindings` and `backends` will
 * re-render when the store populates.
 */
export function useInteractiveCapabilities(projectId: number | null | undefined, taskId: number | null | undefined) {
  useEffect(() => {
    if (projectId == null || taskId == null) return;
    interactiveCapabilityStore.load(projectId, taskId);
  }, [projectId, taskId]);

  return useMemo(
    () => ({
      status: projectId != null ? interactiveCapabilityStore.getStatus(projectId) : "idle",
      backends: projectId != null ? interactiveCapabilityStore.getBackends(projectId) : ([] as InteractiveBackend[]),
      bindings: projectId != null ? interactiveCapabilityStore.getBindings(projectId) : ([] as InteractiveBinding[]),
    }),
    // Snapshot is computed from the mobx store, so `observer` callers re-run
    // this memo on store changes; the deps keep the identity stable when
    // projectId doesn't change.
    [projectId],
  );
}

/**
 * Filter bindings to the ones that target a specific control-tag type —
 * e.g. "BitmaskLabels" or "VideoRectangle". Use inside a mobx `observer`
 * component so updates flow through.
 */
export function useBindingsForControl(projectId: number | null | undefined, controlTag: string): InteractiveBinding[] {
  if (projectId == null) return [];
  return interactiveCapabilityStore.getBindings(projectId).filter((b) => b.controlTag === controlTag);
}
