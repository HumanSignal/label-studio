/**
 * Unit tests for KonvaVector drawing-event gate helpers.
 *
 * canInsertPointOnSegment encodes whether a Shift+Click on a path segment should
 * insert a new vertex. It is the core decision behind BROS-1200: a non-selected
 * video vector region must accept Shift+Click point insertion when the caller
 * opts in via allowShiftPointInsertWhenUnselected, while image vectors (which do
 * not opt in) keep requiring selection.
 */
import { canInsertPointOnSegment } from "../drawing";

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
