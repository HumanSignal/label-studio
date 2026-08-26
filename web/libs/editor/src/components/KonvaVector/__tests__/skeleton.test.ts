/**
 * Unit tests for isVectorSkeletonEnabled (components/KonvaVector/skeleton.ts).
 *
 * Skeleton mode (branching open paths) is incompatible with SAM2: SAM2 always
 * emits a closed mask, so when an interactive-ML backend is bound to the
 * control the skeleton attribute must be ignored and a plain non-skeleton
 * closed shape produced instead (BROS-1434). The helper is the single source
 * of truth shared by the image (VectorRegion) and video (VideoVector)
 * renderers.
 */

import { isVectorSkeletonEnabled } from "../skeleton";

describe("isVectorSkeletonEnabled", () => {
  it("returns false when the control has skeleton disabled", () => {
    expect(isVectorSkeletonEnabled({ skeleton: false })).toBe(false);
  });

  it("returns true when skeleton is enabled and no SAM2 backend is bound", () => {
    expect(isVectorSkeletonEnabled({ skeleton: true, hasInteractiveBackend: false })).toBe(true);
  });

  it("returns false when SAM2 is active even though skeleton is enabled", () => {
    expect(isVectorSkeletonEnabled({ skeleton: true, hasInteractiveBackend: true })).toBe(false);
  });

  it("respects the skeleton attribute for controls without the interactive mixin", () => {
    // Plain `Vector` / non-SAM controls never expose `hasInteractiveBackend`.
    expect(isVectorSkeletonEnabled({ skeleton: true })).toBe(true);
    expect(isVectorSkeletonEnabled({ skeleton: false })).toBe(false);
  });

  it("treats a missing skeleton attribute as disabled", () => {
    expect(isVectorSkeletonEnabled({})).toBe(false);
  });

  it("returns false for a null / undefined control", () => {
    expect(isVectorSkeletonEnabled(null)).toBe(false);
    expect(isVectorSkeletonEnabled(undefined)).toBe(false);
  });
});
