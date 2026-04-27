/**
 * Hook: attaches event listeners for click capture (add/subtract points),
 * cursor management, and keyboard shortcuts on the annotation canvas.
 */

import { useEffect } from "react";
import { getNativeDimensions } from "./utils";
import type { InteractiveController } from "../controller";
import type { PredictBoxFn, PredictFn } from "./useBackendInference";

export function redecode(item: InteractiveController, predictFn?: PredictFn | null) {
  if (item.state !== "prompting") return;
  if (item.prompts.length === 0) {
    item.clearMaskPreview();
    return;
  }
  if (!predictFn) return;
  const tag = item.imageTag;
  if (!tag) return;
  const nd = getNativeDimensions(tag, item.isVideo);
  predictFn(item.prompts, nd.width, nd.height);
}

export function useInputHandlers(
  item: InteractiveController,
  overlayRef: React.RefObject<HTMLDivElement | null>,
  handleAccept: () => void,
  predictFn?: PredictFn | null,
  predictBoxFn?: PredictBoxFn | null,
) {
  const imageTag = item.imageTag;
  const isVideo = item.isVideo;

  // ─── Click capture on the stage / overlay ──────────────────────────────
  // Video: capture phase on stageRef.content so we run before Konva.
  // Image: bubble phase on the overlay div covering the image.
  useEffect(() => {
    const target = isVideo ? imageTag?.stageRef?.content : overlayRef.current;
    if (!target) return;

    const useCapture = isVideo;

    const isInBounds = (e: MouseEvent): boolean => {
      if (!isVideo) return true;
      const wa = imageTag?.workingArea;
      if (!wa) return false;
      const rect = target.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      return cx >= wa.x && cx <= wa.x + wa.width && cy >= wa.y && cy <= wa.y + wa.height;
    };

    // When the auto-annotation toggle owns activation, the SAM tag must own
    // the stage the whole time the toggle is on — otherwise clicks that land
    // during startup (resolving / downloading / stopped-but-not-yet-started)
    // fall through to Konva and draw a regular region.
    const shouldIntercept = () => (item.useAutoAnnotationToggle ? item.autoAnnotationEnabled : item.isActive);

    // True when the pointer is over an existing Konva region or one of its
    // editable handles (e.g. polygon vertex). Used to opt OUT of intercept
    // for that specific event so the user can still select / drag / edit
    // existing regions while AA is on. Without this, the overlay swallows
    // every pointer event, making vertex grabs feel "clunky" — clicks on a
    // vertex were being read as new SAM prompts. The `shift+alt+a` hotkey
    // remains as an explicit "release the stage entirely" override.
    const hitExistingRegion = (e: MouseEvent): boolean => {
      const stage = imageTag?.stageRef;
      const content = stage?.content as HTMLElement | undefined;
      if (!stage || !content || typeof stage.getIntersection !== "function") return false;
      const rect = content.getBoundingClientRect();
      const pos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      if (pos.x < 0 || pos.y < 0 || pos.x > rect.width || pos.y > rect.height) return false;
      // getIntersection returns the topmost shape on a *listening* layer.
      // Background image / our mask preview layer are non-listening, so a
      // non-null result is always "real region under the cursor".
      return !!stage.getIntersection(pos);
    };

    const canHandle = () => item.isActive && !!predictFn;

    const eventCoords = (e: MouseEvent) => {
      const nat = getNativeDimensions(imageTag, isVideo);
      let pixelX: number;
      let pixelY: number;
      if (isVideo) {
        const wa = imageTag.workingArea!;
        const rect = target.getBoundingClientRect();
        pixelX = ((e.clientX - rect.left - wa.x) / wa.width) * nat.width;
        pixelY = ((e.clientY - rect.top - wa.y) / wa.height) * nat.height;
      } else {
        const rect = target.getBoundingClientRect();
        pixelX = ((e.clientX - rect.left) / rect.width) * nat.width;
        pixelY = ((e.clientY - rect.top) / rect.height) * nat.height;
      }
      return { pixelX, pixelY, nat };
    };

    const blockAndHandle = (e: MouseEvent) => {
      if (!shouldIntercept()) return;
      if ((e.target as HTMLElement)?.closest?.("[data-sa-point]")) return;
      if (!isInBounds(e)) return;
      // Pointer is over an existing region / vertex — let Konva handle it.
      if (hitExistingRegion(e)) return;
      // Right-click / middle-click are intentionally left unhandled so
      // the browser's context menu (and Konva's region context menu)
      // still works. Bail BEFORE stopping propagation — calling it on a
      // right-click mousedown was suppressing the downstream defaults
      // even though we never added a prompt. Negative points use
      // Alt / Option (or Cmd / Ctrl on macOS) + left-click; see below.
      if (e.button !== 0) return;

      e.stopPropagation();
      e.stopImmediatePropagation();
      e.preventDefault();

      if (!canHandle()) return;
      if (!imageTag?.stageRef) return;

      const { pixelX, pixelY, nat } = eventCoords(e);

      if (item.isBoxMode) {
        // Don't wipe the existing mask on mousedown — a click without
        // movement shouldn't throw away a mask the user just previewed.
        // `onDragMove` clears it once we see the first real drag pixel.
        item.startBoxDrag(pixelX, pixelY);
        return;
      }

      const positive = !(e.altKey || e.metaKey || e.ctrlKey);
      item.addPrompt(pixelX, pixelY, positive);

      if (!predictFn) return;
      item.setState("encoding");
      predictFn(item.prompts, nat.width, nat.height);
    };

    const block = (e: Event) => {
      if (!shouldIntercept()) return;
      if (e instanceof MouseEvent && (e.target as HTMLElement)?.closest?.("[data-sa-point]")) return;
      if (e instanceof MouseEvent && !isInBounds(e)) return;
      if (e instanceof MouseEvent && hitExistingRegion(e)) return;
      // Same reason as `blockAndHandle`: don't intercept non-left-button
      // mouse / pointer events, otherwise right-click pointerdown / up
      // is silently consumed.
      if (e instanceof MouseEvent && e.button !== 0) return;
      e.stopPropagation();
      e.stopImmediatePropagation();
    };

    // Cursor hint — over a region: `default` (Konva will swap to grab/move
    // when over a vertex / handle); over empty space inside the video /
    // image working area: `crosshair` (a SAM prompt will land here);
    // outside the working area (letterbox around a zoomed-out video):
    // clear the cursor so the browser / Konva restore whatever they'd
    // normally show. During resolve / encode show `wait`.
    const onCursorMove = (e: MouseEvent) => {
      if (!shouldIntercept()) return;
      const cursorTarget = (
        isVideo ? (imageTag?.stageRef?.content as HTMLElement | undefined) : overlayRef.current
      ) as HTMLElement | null;
      if (!cursorTarget) return;
      if (!isInBounds(e)) {
        cursorTarget.style.cursor = "";
        return;
      }
      const overRegion = hitExistingRegion(e);
      cursorTarget.style.cursor = overRegion ? "default" : item.isActive ? "crosshair" : "wait";
    };

    const onDragMove = (e: MouseEvent) => {
      if (!item.isBoxMode || !item.boxDragStart) return block(e);
      if (!shouldIntercept()) return;
      e.stopPropagation();
      e.stopImmediatePropagation();
      // First move after mousedown — now we know it's a real drag, so
      // drop any previously-previewed mask.
      if (item.maskData) item.clearMaskPreview();
      const { pixelX, pixelY } = eventCoords(e);
      item.updateBoxDrag(pixelX, pixelY);
    };

    const onDragEnd = (e: MouseEvent) => {
      if (!item.isBoxMode || !item.boxDragStart) return block(e);
      if (!shouldIntercept()) return;
      e.stopPropagation();
      e.stopImmediatePropagation();
      const final = item.endBoxDrag();
      if (!final) return;
      if (!canHandle() || !predictBoxFn) return;
      const nat = getNativeDimensions(imageTag, isVideo);
      item.setState("encoding");
      predictBoxFn(final, nat.width, nat.height);
    };

    // We deliberately don't bind a contextmenu handler — right-click
    // belongs to the browser / Konva region context menu, not to SAM
    // prompt entry. (Negative points use Alt/⌘/Ctrl + left-click; see
    // `blockAndHandle`.)

    // Cursor updater registered in the same phase as `onDragMove` (capture
    // for video, bubble for image) and BEFORE it — so even when `block`
    // calls `stopImmediatePropagation` we've already computed and applied
    // the cursor. Listeners in the same phase fire in registration order.
    target.addEventListener("mousemove", onCursorMove as (e: Event) => void, useCapture);
    target.addEventListener("mousedown", blockAndHandle, useCapture);
    target.addEventListener("mouseup", onDragEnd as (e: Event) => void, useCapture);
    target.addEventListener("mousemove", onDragMove as (e: Event) => void, useCapture);
    target.addEventListener("pointerdown", block, useCapture);
    target.addEventListener("pointerup", block, useCapture);
    target.addEventListener("pointermove", block, useCapture);
    target.addEventListener("click", block, useCapture);

    return () => {
      target.removeEventListener("mousemove", onCursorMove as (e: Event) => void, useCapture);
      target.removeEventListener("mousedown", blockAndHandle, useCapture);
      target.removeEventListener("mouseup", onDragEnd as (e: Event) => void, useCapture);
      target.removeEventListener("mousemove", onDragMove as (e: Event) => void, useCapture);
      target.removeEventListener("pointerdown", block, useCapture);
      target.removeEventListener("pointerup", block, useCapture);
      target.removeEventListener("pointermove", block, useCapture);
      target.removeEventListener("click", block, useCapture);
    };
    // `imageTag?.stageRef` is mobx-observable (declared in the Video/Image
    // tag's .volatile({})), so it fires observer re-renders when Konva
    // mounts. We must list it here too, otherwise the effect closure from
    // the first render (when stageRef is still null) never re-runs and
    // listeners never attach on page reload with auto-annotation ON — the
    // user would have to toggle the switch to force other deps to change.
  }, [item, item.isActive, item.state, predictFn, predictBoxFn, isVideo, imageTag, imageTag?.stageRef]);

  // ─── Cursor baseline for video ─────────────────────────────────────────
  // Per-mousemove handling (see `onCursorMove` in the effect above) paints
  // the crosshair / default / wait cursor based on where the pointer is.
  // This effect just clears any stale cursor value on mount / unmount so
  // the baseline is "no style, browser decides" instead of a stuck
  // crosshair from a previous session.
  const reserving = item.useAutoAnnotationToggle ? item.autoAnnotationEnabled : item.isActive;
  useEffect(() => {
    if (!isVideo || !reserving) return;
    const container = imageTag?.stageRef?.content as HTMLElement | undefined;
    if (!container) return;
    const prev = container.style.cursor;
    container.style.cursor = "";
    return () => {
      container.style.cursor = prev;
    };
  }, [isVideo, reserving, item.isActive, imageTag?.stageRef]);

  // ─── Keyboard shortcuts: Enter=accept, Escape=reject/stop, Ctrl/Cmd+Z=undo, Ctrl/Cmd+Shift+Z=redo ─
  useEffect(() => {
    if (!item.isActive) return;

    const handler = (e: KeyboardEvent) => {
      let handled = false;
      if (e.key === "Enter" && item.maskData) {
        handled = true;
        handleAccept();
      } else if (e.key === "Escape") {
        // Escape is layered: clear an in-flight mask first, otherwise let
        // the event fall through so the editor's default handler can
        // deselect the active label. Swallowing Escape unconditionally
        // trapped the user — with AA on and no mask, they had no way to
        // drop the selected label without clicking it off manually.
        if (item.maskData) {
          handled = true;
          item.clearMask();
        }
      } else if (e.key === "z" && (e.ctrlKey || e.metaKey) && e.shiftKey) {
        handled = true;
        if (item.redoPrompt()) {
          redecode(item, predictFn);
        }
      } else if (e.key === "z" && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        handled = true;
        if (item.undoPrompt()) {
          redecode(item, predictFn);
        } else if (item.maskData) {
          item.clearMask();
        }
      }
      if (handled) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // Capture phase so we intercept before the editor's keymaster handler on document
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [item.isActive, item.maskData, item.prompts, handleAccept]);
}
