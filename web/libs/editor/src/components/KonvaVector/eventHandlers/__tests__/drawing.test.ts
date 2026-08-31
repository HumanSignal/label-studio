/**
 * Unit tests for KonvaVector drawing-event gate helpers.
 *
 * canInsertPointOnSegment encodes whether a Shift+Click on a path segment should
 * insert a new vertex. It is the core decision behind BROS-1200: a non-selected
 * video vector region must accept Shift+Click point insertion when the caller
 * opts in via allowShiftPointInsertWhenUnselected, while image vectors (which do
 * not opt in) keep requiring selection.
 */
import { canInsertPointOnSegment, resolveActivePointId } from "../drawing";

const baseState = {
  shiftKey: true,
  altKey: false,
  selected: true,
  disabled: false,
  disableInternalPointAddition: true,
  allowShiftPointInsertWhenUnselected: false,
  pointCount: 4,
  maxPoints: undefined as number | undefined,
};

describe("canInsertPointOnSegment", () => {
  it("allows insertion on a selected region (existing behavior)", () => {
    expect(canInsertPointOnSegment({ ...baseState, selected: true })).toBe(true);
  });

  it("blocks insertion on a non-selected region by default (image-vector behavior)", () => {
    expect(
      canInsertPointOnSegment({
        ...baseState,
        selected: false,
        allowShiftPointInsertWhenUnselected: false,
      }),
    ).toBe(false);
  });

  it("allows insertion on a non-selected region when the caller opts in (BROS-1200)", () => {
    expect(
      canInsertPointOnSegment({
        ...baseState,
        selected: false,
        allowShiftPointInsertWhenUnselected: true,
      }),
    ).toBe(true);
  });

  it("blocks insertion when disabled, even if opted in", () => {
    expect(
      canInsertPointOnSegment({
        ...baseState,
        disabled: true,
        selected: false,
        allowShiftPointInsertWhenUnselected: true,
      }),
    ).toBe(false);
  });

  it("requires the Shift key", () => {
    expect(canInsertPointOnSegment({ ...baseState, shiftKey: false })).toBe(false);
  });

  it("ignores Shift+Alt (reserved for other interactions)", () => {
    expect(canInsertPointOnSegment({ ...baseState, altKey: true })).toBe(false);
  });

  it("only applies when point addition is externally managed", () => {
    expect(canInsertPointOnSegment({ ...baseState, disableInternalPointAddition: false })).toBe(false);
  });

  it("requires at least two points to form a segment", () => {
    expect(canInsertPointOnSegment({ ...baseState, pointCount: 1 })).toBe(false);
    expect(canInsertPointOnSegment({ ...baseState, pointCount: 2 })).toBe(true);
  });

  it("blocks insertion once maxPoints is reached", () => {
    expect(canInsertPointOnSegment({ ...baseState, pointCount: 14, maxPoints: 14 })).toBe(false);
    expect(canInsertPointOnSegment({ ...baseState, pointCount: 13, maxPoints: 14 })).toBe(true);
  });
});

/**
 * resolveActivePointId decides which point the drawing "pointing line" (GhostLine)
 * originates from when KonvaVector's init effect re-runs on a point-count change.
 *
 * FIT-1924: Video Vectors append vertices through the MobX store (not KonvaVector's
 * internal point-creation manager), so activePointId is never advanced and the
 * pointing line stays pinned to the FIRST point. The active point must follow the
 * most-recently appended (last) point in both non-skeleton and skeleton modes
 * (BROS-1410). Only mid-segment inserts (last point unchanged) keep the current
 * active point.
 */
const p = (id: string) => ({ id });

describe("resolveActivePointId", () => {
  it("returns null when there are no points", () => {
    expect(
      resolveActivePointId({
        currentActivePointId: null,
        points: [],
        skeletonEnabled: false,
        previousLastPointId: null,
      }),
    ).toBeNull();
  });

  it("falls back to the last point on fresh init (no active point yet)", () => {
    expect(
      resolveActivePointId({
        currentActivePointId: null,
        points: [p("a"), p("b"), p("c")],
        skeletonEnabled: false,
        previousLastPointId: null,
      }),
    ).toBe("c");
  });

  it("falls back to the last point when the active point is stale (missing)", () => {
    expect(
      resolveActivePointId({
        currentActivePointId: "gone",
        points: [p("a"), p("b")],
        skeletonEnabled: false,
        previousLastPointId: "a",
      }),
    ).toBe("b");
  });

  it("advances to the newly appended last point in non-skeleton mode (FIT-1924)", () => {
    // Active point is pinned to the first point ("a") and is still valid, but a new
    // point ("b") was appended at the end — the pointing line must follow it.
    expect(
      resolveActivePointId({
        currentActivePointId: "a",
        points: [p("a"), p("b")],
        skeletonEnabled: false,
        previousLastPointId: "a",
      }),
    ).toBe("b");
  });

  it("keeps the current active point when the last point is unchanged (mid-segment insert)", () => {
    // A vertex was inserted in the middle: the array grew but the last point id is
    // the same, so the active point must not jump.
    expect(
      resolveActivePointId({
        currentActivePointId: "a",
        points: [p("a"), p("mid"), p("b")],
        skeletonEnabled: false,
        previousLastPointId: "b",
      }),
    ).toBe("a");
  });

  it("advances to the newly appended last point in skeleton mode (BROS-1410)", () => {
    // Skeleton Video Vectors also append through the MobX store, so the active point
    // (pinned to the first point "a") must follow the most-recently appended point "b"
    // instead of staying on the first point — matching the region geometry, which
    // continues from the last point.
    expect(
      resolveActivePointId({
        currentActivePointId: "a",
        points: [p("a"), p("b")],
        skeletonEnabled: true,
        previousLastPointId: "a",
      }),
    ).toBe("b");
  });

  it("keeps the current active point on a mid-segment insert in skeleton mode (BROS-1410)", () => {
    // The array grew but the last point id is unchanged (insert in the middle), so the
    // active point must not jump even in skeleton mode.
    expect(
      resolveActivePointId({
        currentActivePointId: "a",
        points: [p("a"), p("mid"), p("b")],
        skeletonEnabled: true,
        previousLastPointId: "b",
      }),
    ).toBe("a");
  });
});
