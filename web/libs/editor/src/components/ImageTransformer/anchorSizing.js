/**
 * Anchor sizing utilities for transformer resize handles.
 *
 * Solves the problem of small bounding boxes (e.g. baseball detections
 * at <1% of image area) being nearly impossible to resize because the
 * hardcoded 8px anchor handles are too small to grab consistently.
 *
 * The fix:
 * 1. Scale anchor size inversely with zoom so handles stay constant on screen
 * 2. Add an invisible hit margin around each anchor for easier grabbing
 * 3. Enforce minimum sizes so handles never become unusably small
 *
 * Related issues:
 * - https://github.com/HumanSignal/label-studio/issues/4558
 * - https://github.com/HumanSignal/label-studio/issues/4452
 */

// Base visual size for transformer anchors (resize handles) in stage-space pixels at 1x zoom
const BASE_ANCHOR_SIZE = 10;

// Minimum rendered anchor size in screen pixels (ensures handles stay grabbable at any zoom)
const MIN_ANCHOR_SCREEN_SIZE = 10;

// Extra invisible hit margin around each anchor in screen pixels
const ANCHOR_HIT_MARGIN = 8;

/**
 * Compute the anchor (resize handle) size in stage-space coordinates.
 *
 * At zoom=1, returns BASE_ANCHOR_SIZE.
 * At zoom>1, shrinks proportionally so the anchor appears the same size on screen.
 * Enforces a minimum screen size of MIN_ANCHOR_SCREEN_SIZE.
 *
 * @param {number} zoomScale - Current zoom/stage scale factor
 * @returns {number} Anchor size in stage-space coordinates
 */
export function computeAnchorSize(zoomScale) {
  const scale = Math.max(zoomScale, 0.01); // guard against zero/negative
  // Ensure the anchor is at least MIN_ANCHOR_SCREEN_SIZE pixels on screen
  const minStageSize = MIN_ANCHOR_SCREEN_SIZE / scale;
  return Math.max(BASE_ANCHOR_SIZE / scale, minStageSize);
}

/**
 * Compute the invisible hit area size for an anchor in stage-space coordinates.
 *
 * Adds ANCHOR_HIT_MARGIN (in screen pixels) around the visible anchor,
 * converted to stage-space coordinates.
 *
 * @param {number} anchorSize - The visual anchor size (from computeAnchorSize)
 * @param {number} zoomScale - Current zoom/stage scale factor
 * @returns {number} Hit area size in stage-space coordinates
 */
export function computeAnchorHitSize(anchorSize, zoomScale) {
  const scale = Math.max(zoomScale, 0.01);
  const marginInStageSpace = ANCHOR_HIT_MARGIN / scale;
  return anchorSize + 2 * marginInStageSpace;
}
