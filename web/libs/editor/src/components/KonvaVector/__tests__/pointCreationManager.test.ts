import { describe, expect, it } from "bun:test";
import type { BezierPoint } from "../types";
import { PointCreationManager } from "../pointCreationManager";

// Build a simple open path of `count` connected points: p0 <- p1 <- p2 ...
function makePoints(count: number): BezierPoint[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `p${i}`,
    x: i * 10,
    y: 0,
    prevPointId: i === 0 ? undefined : `p${i - 1}`,
    isBezier: false,
  }));
}

describe("PointCreationManager — segment origin (BROS-1412)", () => {
  it("connects a new segment from the selected first endpoint when no active point is set", () => {
    const points = makePoints(4);
    let resultingPoints: BezierPoint[] = [];

    const manager = new PointCreationManager();
    manager.setProps({
      initialPoints: points,
      allowBezier: false,
      skeletonEnabled: false,
      // The user unselected the region then clicked the FIRST point — it becomes the
      // selected point but activePointId is not (re)established.
      activePointId: null,
      selectedPointIndex: 0,
      selectedPoints: new Set([0]),
      canAddMorePoints: () => true,
      allowOutsideBounds: true,
      onPointsChange: (pts) => {
        resultingPoints = pts;
      },
    });

    manager.createRegularPointAt(100, 100);

    const newPoint = resultingPoints[resultingPoints.length - 1];
    // The ghost-line preview originates from the selected first point, so the committed
    // segment must too — not from the last point in the array.
    expect(newPoint.prevPointId).toBe("p0");
  });

  it("still connects from the active point when one is set", () => {
    const points = makePoints(4);
    let resultingPoints: BezierPoint[] = [];

    const manager = new PointCreationManager();
    manager.setProps({
      initialPoints: points,
      allowBezier: false,
      skeletonEnabled: false,
      activePointId: "p3",
      selectedPointIndex: 0,
      selectedPoints: new Set([0]),
      canAddMorePoints: () => true,
      allowOutsideBounds: true,
      onPointsChange: (pts) => {
        resultingPoints = pts;
      },
    });

    manager.createRegularPointAt(100, 100);

    const newPoint = resultingPoints[resultingPoints.length - 1];
    expect(newPoint.prevPointId).toBe("p3");
  });

  it("falls back to the last point in the array when nothing is active or selected", () => {
    const points = makePoints(4);
    let resultingPoints: BezierPoint[] = [];

    const manager = new PointCreationManager();
    manager.setProps({
      initialPoints: points,
      allowBezier: false,
      skeletonEnabled: false,
      activePointId: null,
      selectedPointIndex: null,
      selectedPoints: new Set(),
      canAddMorePoints: () => true,
      allowOutsideBounds: true,
      onPointsChange: (pts) => {
        resultingPoints = pts;
      },
    });

    manager.createRegularPointAt(100, 100);

    const newPoint = resultingPoints[resultingPoints.length - 1];
    expect(newPoint.prevPointId).toBe("p3");
  });
});
