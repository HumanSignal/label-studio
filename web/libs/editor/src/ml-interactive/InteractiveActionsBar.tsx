/**
 * Per-object-tag toolbar for interactive ML. Mounts inline with the
 * specific Image / Video it serves (under the image canvas, between the
 * video and its timeline) so model controls live with the annotation
 * target rather than in the global bottombar.
 *
 * Shows:
 *   - status dot + model title + state label
 *   - prompt-mode toggle (Points / Box) when the backend supports both
 *   - context actions (Reject / Accept / Track Backward / Track Forward)
 *     when a mask is ready
 *   - tracking progress + Stop while propagating
 *
 * Resolution is scoped to this object tag via `resolveActiveBinding(annotation,
 * projectId, objectTag.name)` so a task with multiple images / videos gets
 * an independent bar per target — the one you're prompting on stays active,
 * the others render nothing.
 */

import { observer } from "mobx-react";
import { useCallback, useMemo } from "react";
import { Button, MultiStateToggle, Typography } from "@humansignal/ui";

import { useInteractiveCapabilities } from "./hooks";
import { resolveActiveBinding } from "./resolve";
import { interactiveCapabilityStore } from "./store";
import { acceptInteractiveMask, rejectInteractiveMask } from "./actions";
import { makeInteractiveController } from "./controller";
import { useBackendInference } from "./primitives/useBackendInference";
import { useInteractiveTrack } from "./primitives/useTrackForward";

type PromptMode = "points" | "box";

/**
 * Build the status string shown next to the model name. Box and points
 * modes get different verbs ("Click" / "Drag") and different hints,
 * because the gesture the user actually performs differs.
 */
function statusFor(args: { state: string; promptMode: PromptMode; hasMask: boolean }): string {
  const { state, promptMode, hasMask } = args;

  if (hasMask) {
    return promptMode === "box"
      ? "Mask ready — drag to redraw or Accept"
      : "Mask ready — click to refine, alt-click to exclude, or Accept";
  }

  switch (state) {
    case "idle":
      return "Connecting…";
    case "resolving":
      return "Resolving model…";
    case "stopped":
      return "Ready";
    case "encoding":
      return "Processing…";
    case "error":
      return "Error";
    case "started":
    case "prompting":
      // Points mode lets users add negative prompts via Alt-click —
      // surface that here so the affordance is discoverable without
      // hovering over a tooltip.
      return promptMode === "box" ? "Drag a box around the object" : "Click on the object, alt-click to exclude";
    default:
      return state;
  }
}

interface InteractiveActionsBarProps {
  objectTag: any;
}

export const InteractiveActionsBar = observer(({ objectTag }: InteractiveActionsBarProps) => {
  const annotation = objectTag?.annotation;
  const store = annotation?.store;
  const projectId: number | null = store?.project?.id ?? window.DM?.project?.id ?? null;
  const taskId: number | null = store?.task?.id ?? null;

  useInteractiveCapabilities(projectId, taskId);

  // Scoped to this specific object tag. A task with two videos would
  // otherwise render the same bar in both places.
  const resolved = resolveActiveBinding(annotation, projectId, objectTag?.name);

  // Build a controller + backend hooks against the (maybe-null) resolved
  // control. Hooks must be called unconditionally every render — when
  // there's no binding we pass a null controller and let the hooks bail
  // internally.
  const controller = useMemo(
    () => (resolved ? makeInteractiveController(resolved.control, resolved.binding) : null),
    [resolved?.control, resolved?.binding],
  );
  const { track: trackFn } = useBackendInference(controller);
  // Pass `labelSource` so Pattern 2 flows (label-less drawing control +
  // sibling `<Labels>`) attach the selected label to the tracked region
  // after creation — without it, the tracked region comes out unlabeled.
  const handleTrackForward = useInteractiveTrack(controller, trackFn ?? null, "forward", resolved?.labelSource);
  const handleTrackBackward = useInteractiveTrack(controller, trackFn ?? null, "backward", resolved?.labelSource);
  const handleTrackBoth = useInteractiveTrack(controller, trackFn ?? null, "both", resolved?.labelSource);

  const handleAccept = useCallback(() => {
    if (!resolved) return;
    acceptInteractiveMask(resolved.control, resolved.binding, resolved.labelSource);
  }, [resolved?.control, resolved?.binding, resolved?.labelSource]);

  const handleReject = useCallback(() => {
    if (!resolved) return;
    rejectInteractiveMask(resolved.control);
  }, [resolved?.control]);

  const handlePromptModeChange = useCallback(
    (mode: string) => {
      if (!resolved) return;
      if (mode !== "points" && mode !== "box") return;
      // Switching modes in the middle of a prompt is ambiguous; drop any
      // in-flight prompt/mask so the next interaction starts fresh.
      resolved.control.clearInteractiveMask();
      resolved.control.setInteractivePromptMode(mode);
    },
    [resolved?.control],
  );

  // Matches the editor's bottombar aesthetic (single top border, neutral
  // background) so the bar feels like an integral part of the tag's chrome
  // rather than a foreign panel bolted between video and timeline.
  // `h-1100` (44px) locks the bar's exact height so the toggle (taller
  // than plain text) doesn't grow / shrink the bar between states, and
  // action buttons appearing / disappearing don't jump the timeline
  // below. `flex items-center` vertically centres the row regardless of
  // content height — keeps the text baseline stable across states.
  // `justify-between` puts the toggle + message cluster on the left
  // and the action buttons on the right.
  const wrapperClass =
    "box-border flex items-center justify-between px-tighter py-tighter h-1100 border-t border-neutral-border bg-neutral-background";

  // Idle state: backend is connected, auto-annotation is on, but no compatible
  // label is selected yet. Render a muted hint so the user knows the feature
  // is live — without a hint, it looks like nothing happened when they
  // toggled Auto-Annotation.
  if (!resolved || !controller) {
    const autoOn = store?.autoAnnotation ?? false;
    const bindings = projectId != null ? interactiveCapabilityStore.getBindings(projectId) : [];
    // Filter bindings by what's compatible with this object tag's sibling
    // controls — otherwise a task with an image + video would show the
    // hint on both even if only one is SAM-capable.
    const hasAnyBinding = bindings.length > 0;
    if (!autoOn || !hasAnyBinding) return null;

    return (
      <div className={wrapperClass}>
        <Typography
          variant="body"
          size="small"
          className="text-neutral-content-subtler whitespace-nowrap overflow-hidden text-ellipsis"
        >
          Select a label to start
        </Typography>
      </div>
    );
  }

  const { binding } = resolved;

  const supportsPoint = binding.prompts.includes("point");
  const supportsBox = binding.prompts.includes("box");
  const showPromptToggle = supportsPoint && supportsBox;
  const promptMode = controller.prompt; // "points" | "box"

  const state = controller.state;
  const hasMask = !!controller.maskData;
  const tracking = controller.isTracking;
  const trackable = binding.features.has("track") && controller.isVideo;

  // Errors surface via a standardized toast from useBackendInference —
  // the bar stays presentational and falls through to the normal status
  // text because the mixin has already reset to a usable state.
  const statusText = tracking
    ? controller.trackingTotal > 0
      ? `Tracking ${controller.trackingProgress}/${controller.trackingTotal}`
      : "Processing video…"
    : statusFor({ state, promptMode, hasMask });

  return (
    <div className={wrapperClass}>
      {/* Left: prompt-mode toggle + status message. The message slot is
          a fixed 28rem so the longest copy ("Mask ready — click to
          refine, alt-click to exclude, or Accept") fits without
          truncation, and so the message's left edge doesn't drift as
          the text changes. */}
      <div className="flex items-center gap-base">
        {showPromptToggle && !tracking && (
          <MultiStateToggle
            selectedOption={promptMode}
            options={[
              { value: "points", label: "Points" },
              { value: "box", label: "Box" },
            ]}
            onChange={handlePromptModeChange}
          />
        )}
        <Typography
          variant="body"
          size="small"
          className="text-neutral-content-subtler whitespace-nowrap overflow-hidden text-ellipsis w-[28rem]"
        >
          {statusText}
        </Typography>
      </div>

      {/* Right: contextual actions (Reject / Accept / Track / Stop). */}
      <div className="flex items-center gap-tight">
        {tracking && (
          <Button variant="negative" look="string" size="small" onClick={() => controller.cancelTracking()}>
            Stop
          </Button>
        )}

        {!tracking && hasMask && (
          <>
            <Button variant="negative" look="string" size="small" onClick={handleReject} tooltip="Reject (Esc)">
              Reject
            </Button>
            <Button variant="positive" look="filled" size="small" onClick={handleAccept} tooltip="Accept (Enter)">
              Accept
            </Button>
            {trackable && (
              <>
                <Button
                  variant="primary"
                  look="outlined"
                  size="small"
                  onClick={handleTrackBackward}
                  tooltip="Propagate mask to earlier frames"
                  disabled={(controller.currentVideoFrame ?? 1) <= 1}
                >
                  Track Backward
                </Button>
                <Button
                  variant="primary"
                  look="outlined"
                  size="small"
                  onClick={handleTrackBoth}
                  tooltip="Propagate mask in both directions"
                >
                  Track Both
                </Button>
                <Button
                  variant="primary"
                  look="outlined"
                  size="small"
                  onClick={handleTrackForward}
                  tooltip="Propagate mask to later frames"
                >
                  Track Forward
                </Button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
});
