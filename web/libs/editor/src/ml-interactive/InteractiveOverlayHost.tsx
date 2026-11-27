/**
 * Host that sits inside an object tag (Image/Video) and decides whether an
 * InteractiveStageOverlay should be rendered.
 *
 * Rules:
 *   - Iterate the object tag's controls (annotation.toNames[objectTag.name]).
 *   - For each, look up capability bindings matching the control's type.
 *   - Pick the control that currently has a label selected (the user
 *     "activated" it by choosing a label). If none, don't mount an overlay.
 *   - If the picked control has a binding, write the backendId onto it via
 *     the mixin so the primitives can reach the backend immediately.
 *
 * Also triggers capability auto-load on mount — no other code needs to know
 * about the store beyond this host.
 */

import { observer } from "mobx-react";
import { useEffect } from "react";

import { InteractiveStageOverlay } from "./InteractiveStageOverlay";
import { useInteractiveCapabilities } from "./hooks";
import { resolveActiveBinding } from "./resolve";

interface InteractiveOverlayHostProps {
  objectTag: any;
}

export const InteractiveOverlayHost = observer(({ objectTag }: InteractiveOverlayHostProps) => {
  const annotation = objectTag?.annotation;
  const store = annotation?.store;
  // In the DataManager flow `store.project` is often null — the SAM tag
  // used to reach into `window.DM.project.id` for the same reason; do the
  // same here so capability discovery can proceed.
  const projectId: number | null = store?.project?.id ?? window.DM?.project?.id ?? null;
  const taskId: number | null = store?.task?.id ?? null;

  useInteractiveCapabilities(projectId, taskId);

  // Scope resolution to controls targeting this specific object tag — the
  // bottombar uses the same helper unrestricted so both views stay in sync
  // on which control is "driving".
  const resolved = resolveActiveBinding(annotation, projectId, objectTag?.name);
  const activeControl = resolved?.control ?? null;
  const activeBinding = resolved?.binding ?? null;

  // Propagate backendId to the active control's mixin state; clear on
  // siblings so stale backendIds don't linger.
  const siblingControls: any[] = annotation?.toNames?.get(objectTag?.name) ?? [];
  useEffect(() => {
    for (const c of siblingControls) {
      if (typeof c.setInteractiveBackend !== "function") continue;
      if (c === activeControl) {
        c.setInteractiveBackend(activeBinding?.backendId ?? null);
      } else {
        c.setInteractiveBackend(null);
      }
    }
  }, [activeControl, activeBinding?.backendId, siblingControls.length]);

  if (!activeControl || !activeBinding) return null;
  return (
    <InteractiveStageOverlay control={activeControl} binding={activeBinding} labelSource={resolved?.labelSource} />
  );
});
