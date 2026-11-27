import { describe, expect, it } from "bun:test";
import type { BezierPoint } from "../types";
import { resolveDrawingOriginPointId } from "../utils";

function makePoints(count: number): BezierPoint[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `p${i}`,
    x: i * 10,
    y: 0,
    prevPointId: i === 0 ? undefined : `p${i - 1}`,
    isBezier: false,
  }));
}

describe("resolveDrawingOriginPointId (BROS-1412)", () => {
  const points = makePoints(4);

  it("prefers a valid activePointId above everything else", () => {
    expect(
      resolveDrawingOriginPointId(points, {
        activePointId: "p1",
        selectedPointIndex: 0,
        lastAddedPointId: "p2",
      }),
    ).toBe("p1");
  });

  it("falls back to the selected point when there is no active point", () => {
    expect(
      resolveDrawingOriginPointId(points, {
        activePointId: null,
        selectedPointIndex: 0,
        lastAddedPointId: "p2",
      }),
    ).toBe("p0");
  });

  it("falls back to lastAddedPointId when nothing is active or selected", () => {
    expect(
      resolveDrawingOriginPointId(points, {
        activePointId: null,
        selectedPointIndex: null,
        lastAddedPointId: "p2",
      }),
    ).toBe("p2");
  });

  it("falls back to the last point in the array as a last resort", () => {
    expect(
      resolveDrawingOriginPointId(points, {
        activePointId: null,
        selectedPointIndex: null,
        lastAddedPointId: null,
      }),
    ).toBe("p3");
  });

  it("ignores stale ids that no longer exist in the array", () => {
    expect(
      resolveDrawingOriginPointId(points, {
        activePointId: "gone",
        selectedPointIndex: null,
        lastAddedPointId: "also-gone",
      }),
    ).toBe("p3");
  });

  it("returns null for an empty path", () => {
    expect(
      resolveDrawingOriginPointId([], { activePointId: null, selectedPointIndex: null, lastAddedPointId: null }),
    ).toBeNull();
  });
});
