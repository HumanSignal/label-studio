/**
 * Pure helpers for the Accept/Reject actions. Extracted so the stage
 * overlay (keyboard shortcuts) and the bottombar toolbar (button clicks)
 * share one implementation — no risk of drifting between them.
 *
 * Track is still hook-based (`useTrackForward`) because it owns an async
 * polling loop plus abort controller lifecycle; exposed via a tiny hook
 * wrapper below.
 */

import { getNativeDimensions } from "./primitives/utils";
import { maskToBBox, maskToBitmapDataURL, maskToLargestShape } from "./primitives/mask-output";
import type { InteractiveBinding } from "./types";

function suppressDrawingNotification(region: any) {
  if (region?.drawingTimeout) {
    clearTimeout(region.drawingTimeout);
    region.drawingTimeout = null;
  }
}

export function acceptInteractiveMask(control: any, binding: InteractiveBinding, labelSource?: any) {
  const maskData: Uint8Array | null = control.interactiveMaskData;
  if (!maskData) return;
  const annotation = control.annotation;
  const imageTag = annotation?.names?.get(control.toname) ?? null;
  if (!imageTag) return;

  // The drawing control's own result value. For self-labeled controls
  // (VideoVectorLabels, BitmaskLabels, ...) this carries the selected label.
  // For label-less controls (VideoRectangle) it's empty, and the label gets
  // attached after the region is created via `area.setValue(labelSource)` —
  // mirrors the DrawingTool's `applyActiveStates` pattern so regions
  // behave identically to user-drawn ones.
  const resultValue = control.getResultValue?.() ?? {};

  const applyLabelSource = (area: any) => {
    if (!area) return;
    if (!labelSource || labelSource === control) return;
    area.setValue?.(labelSource);
  };
  const maskWidth = control.interactiveMaskWidth;
  const maskHeight = control.interactiveMaskHeight;
  const isVideo = (imageTag?.type ?? "").toLowerCase().startsWith("video");

  // Rectangle / video-rectangle output — emit a bbox (keyframed for video).
  if (binding.output === "bbox") {
    const bbox = maskToBBox(maskData, maskWidth, maskHeight);
    if (!bbox) {
      control.clearInteractiveMask();
      return;
    }
    try {
      let region;
      if (isVideo) {
        const frame = imageTag.frame ?? imageTag.currentFrame ?? 1;
        region = annotation.createResult(
          { sequence: [{ frame, enabled: true, ...bbox }] },
          resultValue,
          control,
          imageTag,
          true,
        );
      } else {
        region = annotation.createResult(bbox, resultValue, control, imageTag);
      }
      suppressDrawingNotification(region);
      applyLabelSource(region);
    } catch (err: any) {
      console.error("InteractiveML: failed to create bbox region", err);
    }
    control.clearInteractiveMask();
    return;
  }

  // BitmaskLabels — raster mask as PNG data URL.
  if (binding.output === "mask") {
    const nd = getNativeDimensions(imageTag, isVideo);
    const dataURL = maskToBitmapDataURL(maskData, maskWidth, maskHeight, nd.width, nd.height);
    if (!dataURL) {
      control.clearInteractiveMask();
      return;
    }
    try {
      const region = annotation.createResult({ imageDataURL: dataURL }, resultValue, control, imageTag);
      suppressDrawingNotification(region);
      applyLabelSource(region);
    } catch (err: any) {
      console.error("InteractiveML: failed to create bitmask region", err);
    }
    control.clearInteractiveMask();
    return;
  }

  // polygon / vector output — one mask → exactly one region. We pick the
  // dominant contour (largest connected component, outer boundary only) so
  // fragmented or Swiss-cheese SAM output can't produce hundreds of tiny
  // regions on Accept.
  // Trace the region boundary; `closable` decides closed polygon vs open path
  // (BROS-1221 — a non-closable vector is the boundary left open, never a
  // medial-axis skeleton).
  const closed = control.closable === true;
  // Respect the control's `maxPoints` cap (VideoVector / VideoVectorLabels) so
  // accepted SAM2 vectors don't exceed the configured budget (BROS-1222).
  const maxPoints = control.maxpoints ? Number(control.maxpoints) : null;
  const shapeData = maskToLargestShape(
    maskData,
    maskWidth,
    maskHeight,
    control.interactiveTraceResolution,
    control.interactiveSmoothing,
    closed,
    maxPoints,
  );
  if (!shapeData) {
    control.clearInteractiveMask();
    return;
  }
  try {
    let region;
    if (isVideo) {
      const frame = imageTag.frame ?? imageTag.currentFrame ?? 1;
      region = annotation.createResult(
        { sequence: [{ frame, enabled: true, ...shapeData }] },
        resultValue,
        control,
        imageTag,
        true,
      );
    } else {
      region = annotation.createResult(shapeData, resultValue, control, imageTag);
    }
    suppressDrawingNotification(region);
    applyLabelSource(region);
  } catch (err: any) {
    console.error("InteractiveML: failed to create region", err);
  }
  control.clearInteractiveMask();
}

export function rejectInteractiveMask(control: any) {
  control.clearInteractiveMask();
}
