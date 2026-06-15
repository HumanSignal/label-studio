/**
 * Pure functions to convert Segment Anything binary masks into various output formats:
 * polygon vertices, bitmask PNG data URLs, and bounding boxes.
 */

import { maskToClosedVectors } from "./MaskConverter";

/**
 * Downsample + trace the mask, returning contour shape data for all detected shapes.
 *
 * Always traces the region's boundary contour (marching squares) so the
 * vector reflects the detected region. `closed` mirrors the control's
 * `closable` attribute: a closable vector becomes a closed polygon, a
 * non-closable one is the same boundary left open. We intentionally do NOT
 * derive a medial-axis skeleton here — a centerline doesn't reflect the
 * region, and skeletonising a SAM mask produces noisy spur branches
 * (BROS-1221).
 */
export function maskToShapes(
  maskData: Uint8Array,
  maskWidth: number,
  maskHeight: number,
  traceResolution: number,
  smoothing: number,
  closed: boolean,
): Array<{ vertices: any[]; closed: boolean }> {
  const downscale = Math.min(1, traceResolution / Math.max(maskWidth, maskHeight));
  let traceMask = maskData;
  let traceW = maskWidth;
  let traceH = maskHeight;

  if (downscale < 1) {
    traceW = Math.round(maskWidth * downscale);
    traceH = Math.round(maskHeight * downscale);
    traceMask = new Uint8Array(traceW * traceH);
    const sx = maskWidth / traceW;
    const sy = maskHeight / traceH;
    for (let y = 0; y < traceH; y++) {
      const srcY = Math.min(Math.floor(y * sy), maskHeight - 1);
      for (let x = 0; x < traceW; x++) {
        traceMask[y * traceW + x] = maskData[srcY * maskWidth + Math.min(Math.floor(x * sx), maskWidth - 1)];
      }
    }
  }

  const contours = maskToClosedVectors(traceMask, traceW, traceH, smoothing);

  if (contours.length === 0) return [];

  const coordScaleX = maskWidth / traceW;
  const coordScaleY = maskHeight / traceH;

  return contours.map((path) => {
    const ts = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const vertices = path.map((p: { x: number; y: number }, i: number) => ({
      id: `sa-${ts}-${i}`,
      x: ((p.x * coordScaleX) / maskWidth) * 100,
      y: ((p.y * coordScaleY) / maskHeight) * 100,
      prevPointId: i === 0 ? null : `sa-${ts}-${i - 1}`,
      isBezier: false,
    }));
    return { vertices, closed };
  });
}

/**
 * Evenly downsample a contour's vertices to at most `maxPoints`, rebuilding
 * the `prevPointId` linked-list chain so the result is a valid polyline.
 *
 * SAM2 traces emit one vertex per contour step (often hundreds), ignoring the
 * `maxPoints` cap declared by VideoVector / VideoVectorLabels. Manual drawing
 * enforces that cap in KonvaVector, but the Accept / track paths bypass it
 * entirely (BROS-1222). This brings them back in line by sampling the contour
 * down to the configured budget.
 *
 * Open lines (skeletons) keep their first and last vertex; closed contours are
 * sampled evenly around the loop. No-op when `maxPoints` is unset or the input
 * already fits.
 */
export function resampleVerticesToMax<T extends { id: string; prevPointId: string | null }>(
  vertices: T[],
  maxPoints: number | null | undefined,
  closed: boolean,
): T[] {
  if (!maxPoints || maxPoints <= 0) return vertices;
  const n = vertices.length;
  if (n <= maxPoints) return vertices;

  const indices: number[] = [];
  if (maxPoints === 1) {
    indices.push(0);
  } else if (closed) {
    // Evenly spaced around the loop; no duplicated wrap-around vertex.
    const step = n / maxPoints;
    for (let i = 0; i < maxPoints; i++) indices.push(Math.round(i * step) % n);
  } else {
    // Keep both endpoints of an open polyline.
    for (let i = 0; i < maxPoints; i++) indices.push(Math.round((i * (n - 1)) / (maxPoints - 1)));
  }

  // Guard against rounding collisions producing duplicate indices.
  const unique = Array.from(new Set(indices)).sort((a, b) => a - b);

  return unique.map((srcIdx, i) => ({
    ...vertices[srcIdx],
    prevPointId: i === 0 ? null : vertices[unique[i - 1]].id,
  }));
}

/**
 * Returns shape data for the single largest contour (by vertex count).
 *
 * When `maxPoints` is provided, the chosen contour is downsampled to that
 * budget (after the largest-contour pick, so selection still uses the original
 * vertex counts).
 */
export function maskToLargestShape(
  maskData: Uint8Array,
  maskWidth: number,
  maskHeight: number,
  traceResolution: number,
  smoothing: number,
  closed: boolean,
  maxPoints?: number | null,
): { vertices: any[]; closed: boolean } | null {
  const shapes = maskToShapes(maskData, maskWidth, maskHeight, traceResolution, smoothing, closed);
  if (shapes.length === 0) return null;
  const best = shapes.reduce((acc, s) => (s.vertices.length > acc.vertices.length ? s : acc));
  return { ...best, vertices: resampleVerticesToMax(best.vertices, maxPoints, best.closed) };
}

/**
 * Convert Segment Anything binary mask to a PNG data URL for BitmaskRegion.
 * Output: black opaque (0,0,0,255) for foreground, transparent for background.
 */
export function maskToBitmapDataURL(
  maskData: Uint8Array,
  maskWidth: number,
  maskHeight: number,
  nativeWidth: number,
  nativeHeight: number,
): string | null {
  if (!nativeWidth || !nativeHeight) return null;

  const canvas = document.createElement("canvas");
  canvas.width = nativeWidth;
  canvas.height = nativeHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const imgData = ctx.createImageData(nativeWidth, nativeHeight);
  const sx = maskWidth / nativeWidth;
  const sy = maskHeight / nativeHeight;

  for (let y = 0; y < nativeHeight; y++) {
    const srcY = Math.min(Math.floor(y * sy), maskHeight - 1);
    for (let x = 0; x < nativeWidth; x++) {
      if (maskData[srcY * maskWidth + Math.min(Math.floor(x * sx), maskWidth - 1)]) {
        const idx = (y * nativeWidth + x) * 4;
        imgData.data[idx + 3] = 255;
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL("image/png");
}

/**
 * Compute the bounding box of foreground pixels in percentages (0-100).
 */
export function maskToBBox(
  maskData: Uint8Array,
  maskWidth: number,
  maskHeight: number,
): { x: number; y: number; width: number; height: number } | null {
  let minX = maskWidth;
  let maxX = 0;
  let minY = maskHeight;
  let maxY = 0;
  let found = false;

  for (let y = 0; y < maskHeight; y++) {
    for (let x = 0; x < maskWidth; x++) {
      if (maskData[y * maskWidth + x]) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        found = true;
      }
    }
  }

  if (!found) return null;

  return {
    x: (minX / maskWidth) * 100,
    y: (minY / maskHeight) * 100,
    width: ((maxX - minX + 1) / maskWidth) * 100,
    height: ((maxY - minY + 1) / maskHeight) * 100,
  };
}
