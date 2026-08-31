/**
 * Hook: video auto-tracking — propagates Segment Anything mask across subsequent frames
 * with optical-flow-adjusted prompts and drift detection.
 */

import { useCallback } from "react";
import { computeCentroidFromMask, findVideoElement, getNativeDimensions } from "./utils";
import { maskToLargestShape, maskToBBox } from "./mask-output";
import type { InteractiveController } from "../controller";
import type { TrackFn } from "./useBackendInference";
import {
  backendFrameToDisplayFrame,
  finalizeTrackSequence,
  getTrackLifespanCutoffs,
  isValidTrackKeyframe,
  type TrackDirection,
} from "./trackFinalize";

async function decodePngToMaskLocal(
  dataURL: string,
): Promise<{ data: Uint8Array; width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      const mask = new Uint8Array(img.width * img.height);
      for (let i = 0; i < mask.length; i++) {
        mask[i] = imageData.data[i * 4] > 127 ? 1 : 0;
      }
      resolve({ data: mask, width: img.width, height: img.height });
    };
    img.onerror = () => resolve(null);
    img.src = dataURL;
  });
}

export type { TrackDirection };
export { backendFrameToDisplayFrame, getTrackLifespanCutoffs, finalizeTrackSequence, isValidTrackKeyframe };

export function useInteractiveTrack(
  item: InteractiveController | null,
  trackFn: TrackFn | null | undefined,
  direction: TrackDirection = "forward",
  /**
   * When the drawing control is label-less (Pattern 2: `<VideoRectangle>`
   * paired with a sibling `<Labels>` tag), pass the Labels control here
   * so the tracker can `area.setValue(labelSource)` after the region is
   * created — same step `acceptInteractiveMask` takes for non-tracked
   * single-frame regions. Without it, VideoRectangle tracked regions
   * come out unlabeled.
   */
  labelSource?: any,
): () => Promise<void> {
  return useCallback(async () => {
    if (!item || !item.isVideo || !item.maskData || !item.imageTag) return;
    if (!trackFn) return;

    const control = item.selectedControl;
    const imageTag = item.imageTag;
    if (!control) return;

    const videoEl = findVideoElement(imageTag);
    if (!videoEl) return;

    const fps = Number(imageTag.framerate) || 30;
    const duration = videoEl.duration;
    const currentFrame = imageTag.frame ?? imageTag.currentFrame ?? 1;
    const totalFrames = Math.floor(duration * fps);
    // Per-direction horizons. "both" uses the larger of the two so the BE
    // has headroom in either direction; each BE producer independently
    // auto-stops when its side loses the object.
    const forwardRemaining = totalFrames - currentFrame;
    const backwardRemaining = Math.max(0, currentFrame - 1);
    const remainingFrames =
      direction === "backward"
        ? backwardRemaining
        : direction === "both"
          ? Math.max(forwardRemaining, backwardRemaining)
          : forwardRemaining;

    if (remainingFrames <= 0) return;

    const rawCentroid = computeCentroidFromMask(item.maskData, item.maskWidth, item.maskHeight);
    if (rawCentroid.length === 0) return;
    const centroidPrompts = rawCentroid.map((p) => ({
      ...p,
      x: (p.x / item.maskWidth) * videoEl.videoWidth,
      y: (p.y / item.maskHeight) * videoEl.videoHeight,
    }));

    // Bounding box of the accepted mask, in video-pixel space. Preferred
    // tracking prompt: SAM2 uses the box as spatial anchor and segments
    // the whole object inside it, which is what the user actually sees
    // on screen. A single centroid point is ambiguous for masks spanning
    // multiple touching objects (e.g. rider + scooter) — it lands on one
    // part and SAM2 then tracks just that part.
    //
    // NB: `maskToBBox` returns coords as *percent* (0..100), not pixel
    // offsets — scale accordingly.
    const maskBBoxPct = maskToBBox(item.maskData, item.maskWidth, item.maskHeight);
    const trackBox = maskBBoxPct
      ? {
          x: (maskBBoxPct.x / 100) * videoEl.videoWidth,
          y: (maskBBoxPct.y / 100) * videoEl.videoHeight,
          width: (maskBBoxPct.width / 100) * videoEl.videoWidth,
          height: (maskBBoxPct.height / 100) * videoEl.videoHeight,
        }
      : undefined;

    item.startTracking(remainingFrames);

    const shapeConstraints = {
      closable: control.closable === true,
      minPoints: control.minpoints ? Number(control.minpoints) : undefined,
    };

    const getShape = (maskData?: Uint8Array, mw?: number, mh?: number) => {
      const data = maskData ?? item.maskData;
      const width = mw ?? item.maskWidth;
      const height = mh ?? item.maskHeight;
      if (!data) return null;
      if (item.isRectangle) {
        return maskToBBox(data, width, height);
      }
      // Boundary contour; `closable` controls closed polygon vs open path
      // (BROS-1221). Keep this in sync with `acceptInteractiveMask`.
      const closed = item.selectedControl?.closable === true;
      // Cap every tracked keyframe to the control's `maxPoints` budget so
      // tracked SAM2 vectors respect the config the same way Accept does
      // (BROS-1222).
      const maxPoints = item.selectedControl?.maxpoints ? Number(item.selectedControl.maxpoints) : null;
      return maskToLargestShape(data, width, height, item.traceResolution, item.smoothing, closed, maxPoints);
    };

    // ── Create the region on the FIRST frame ──
    const firstShape = getShape();
    if (!firstShape) {
      item.setState("stopped");
      return;
    }

    // Mirror `acceptInteractiveMask`: default to `{}` when the drawing
    // control doesn't own labels (VideoRectangle + sibling Labels). The
    // label result is added separately via `setValue(labelSource)` below.
    // Previously we fell back to `{ [valueType ?? type]: selectedLabels }`
    // which for a label-less control produced a bogus `{videorectangle: []}`
    // shape and broke the region's initial x/y/width/height normalization.
    const resultValue = control.getResultValue?.() ?? {};

    let trackedRegion: any = null;
    try {
      // `firstShape.closed` already mirrors the control's `closable` attribute
      // (closed polygon when closable, open boundary otherwise — BROS-1221),
      // so no closed-flag override is needed here.
      const firstKeyframe: Record<string, any> = {
        frame: currentFrame,
        enabled: true,
        ...firstShape,
      };
      const areaValue = { sequence: [firstKeyframe] };
      trackedRegion = item.annotation.createResult(areaValue, resultValue, control, imageTag, true);
    } catch (err: any) {
      console.error("SegmentAnything: Failed to create tracking region", err);
    }
    item.clearMask();

    if (!trackedRegion) {
      item.setState("stopped");
      return;
    }

    // Pattern 2 (VideoRectangle + sibling <Labels>): the drawing control
    // doesn't carry its own label, so `createResult` produces an unlabeled
    // region. Mirror `acceptInteractiveMask`'s post-create step and attach
    // the label from the sibling tag.
    if (labelSource && labelSource !== control && typeof trackedRegion.setValue === "function") {
      try {
        trackedRegion.setValue(labelSource);
      } catch (err: any) {
        console.error("Interactive track: failed to apply label source", err);
      }
    }

    // Regions created via `createResult` bypass the tool's drawing lifecycle,
    // so the region stays in an `isDrawing`-adjacent state that keeps the
    // Outliner flagging it as in-progress. Signal completion explicitly so
    // the UI reflects the done-and-ready state immediately after Accept.
    trackedRegion.setDrawing?.(false);
    trackedRegion.notifyDrawingFinished?.();

    // ── Backend track: poll-based SAM2 video propagation with live progress ──
    if (trackFn) {
      const nd = getNativeDimensions(imageTag, true);
      // Track the last applied *display* frame and the earliest applied
      // display frame in FE frame-space across all batches. For one-sided
      // tracking only `last` matters; for "both" we cap the region's
      // lifespan on both sides using `first - 1` and `last + 1`.
      let lastAppliedDisplayFrame: number | null = null;
      let firstAppliedDisplayFrame: number | null = null;
      let appliedCount = 0;

      const videoCurrentTime = videoEl && Number.isFinite(videoEl.currentTime) ? videoEl.currentTime : null;
      // Per-direction time horizon. For "both" we use the larger side so
      // either direction has room to run; the BE applies the limit per
      // producer thread.
      const remainingSeconds =
        videoCurrentTime != null
          ? direction === "backward"
            ? videoCurrentTime
            : direction === "both"
              ? Math.max(videoCurrentTime, duration - videoCurrentTime)
              : duration - videoCurrentTime
          : null;

      await trackFn(
        {
          prompts: centroidPrompts,
          box: trackBox,
          width: nd.width,
          height: nd.height,
          frame: currentFrame,
          timeMs: videoCurrentTime != null ? videoCurrentTime * 1000 : undefined,
          maxFrames: remainingFrames,
          maxDurationMs: remainingSeconds != null ? remainingSeconds * 1000 : undefined,
          direction,
        },
        async (newFrames, _produced, total) => {
          item.setTrackingTotal(total);

          let batchLastApplied: number | null = null;

          for (const fm of newFrames) {
            if (item.trackingCancelled) break;

            // Prefer time_ms (fps-agnostic) — FE's configured framerate can
            // differ from the video's actual fps, so fm.frame in BE space
            // doesn't translate 1:1 to FE frame space. Fall back to frame+1
            // only for older backends that don't send time_ms.
            const displayFrame = backendFrameToDisplayFrame(fm, fps);

            const mask = await decodePngToMaskLocal(fm.imageDataURL);
            if (!mask || mask.data.every((v: number) => v === 0)) continue;

            // Compute shape directly from the decoded bytes — never round-trip
            // through item.maskData during tracking, which would re-render the
            // whole observer view on every frame.
            const shape = getShape(mask.data, mask.width, mask.height);
            if (!shape) continue;

            // Skip incomplete geometry before it lands in the sequence
            // (BROS-1511). Rectangle tracks use bbox props, not vertices.
            if (!item.isRectangle) {
              const candidate = { frame: displayFrame, enabled: true, ...shape };
              if (!isValidTrackKeyframe(candidate, shapeConstraints)) continue;
            }

            try {
              // updateShape replaces the keyframe at `displayFrame`, so the
              // prompt-frame keyframe is rewritten with the backend's mask
              // instead of staying on the local image-predictor mask.
              trackedRegion.updateShape(shape, displayFrame);
              if (lastAppliedDisplayFrame == null || displayFrame > lastAppliedDisplayFrame) {
                lastAppliedDisplayFrame = displayFrame;
              }
              if (firstAppliedDisplayFrame == null || displayFrame < firstAppliedDisplayFrame) {
                firstAppliedDisplayFrame = displayFrame;
              }
              batchLastApplied = displayFrame;
              appliedCount += 1;
              item.setTrackingProgress(appliedCount);
            } catch (err: any) {
              console.error("[SAM track] updateShape failed", displayFrame, err);
            }
          }

          // Seek once per batch so the UI reflects the last applied frame.
          // For bidirectional tracking we'd be alternating between low and
          // high frames as forward / backward batches arrive — that yanks
          // the playhead back and forth. Leave the playhead alone when
          // tracking both ways and let the timeline keyframes show progress.
          if (batchLastApplied !== null && direction !== "both") {
            imageTag.setFrame(batchLastApplied);
            await new Promise((r) => setTimeout(r, 16));
          }
        },
      );

      // Finalize after cancel or completion: drop malformed keyframes, keep
      // valid shapes + the original prompt frame when valid, delete if empty
      // (BROS-1511). Always run — cancel and natural stop share this path.
      try {
        if (!item.isRectangle && Array.isArray(trackedRegion.sequence)) {
          const finalized = finalizeTrackSequence(trackedRegion.sequence, shapeConstraints);

          if (finalized.shouldDelete) {
            trackedRegion.deleteRegion?.();
            item.setEncodedFrame(imageTag.frame ?? imageTag.currentFrame ?? -1);
            item.setState("stopped");
            return;
          }

          trackedRegion.replaceSequence(finalized.retained);

          firstAppliedDisplayFrame = finalized.firstValidFrame;
          lastAppliedDisplayFrame = finalized.lastValidFrame;
        }

        trackedRegion.setDrawing?.(false);
        if (
          shapeConstraints.closable &&
          trackedRegion.closed === false &&
          typeof trackedRegion.setClosed === "function"
        ) {
          trackedRegion.setClosed(true);
        }
      } catch (err: any) {
        console.error("Interactive track: failed to finalize region after tracking", err);
      }

      // Terminate the region's lifespan after tracking stops so the region
      // doesn't visually persist past the last tracked frame. We compute
      // cutoffs entirely in FE display-frame space (using the first /
      // last retained valid keyframes) so fps mismatch between FE config and the
      // video file doesn't scatter terminators across the timeline.
      //   forward:  disable one frame after the last tracked keyframe
      //   backward: disable one frame before the earliest tracked keyframe
      //   both:     both of the above
      // (Single-frame Accept has no tracking loop and no applied frames,
      //  so the region keeps its default "continues forever" lifespan —
      //  matches the user's expectation for non-tracked regions.)
      if (typeof trackedRegion.setLifespanAt === "function") {
        const cutoffs = getTrackLifespanCutoffs(
          direction,
          firstAppliedDisplayFrame,
          lastAppliedDisplayFrame,
          totalFrames,
        );
        try {
          if (cutoffs.right !== undefined) trackedRegion.setLifespanAt(cutoffs.right, false);
          if (cutoffs.left !== undefined) trackedRegion.setLifespanAt(cutoffs.left, false);
        } catch (err: any) {
          console.error("Interactive track: failed to terminate region lifespan", err);
        }
      }

      item.setEncodedFrame(imageTag.frame ?? imageTag.currentFrame ?? -1);
      item.setState("stopped");
    }
  }, [item, trackFn, direction, labelSource]);
}
