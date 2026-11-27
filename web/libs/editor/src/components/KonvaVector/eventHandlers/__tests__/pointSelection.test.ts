import { describe, expect, it } from "bun:test";
import type { BezierPoint } from "../../types";
import type { EventHandlerProps } from "../types";
import { isActivePointEligibleForClosing, shouldClosePathOnPointClick } from "../pointSelection";

// Build a simple open path of `count` connected points: p0 <- p1 <- p2 ...
function makePoints(count: number): BezierPoint[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `p${i}`,
    x: i * 10,
    y: 0,
    prevPointId: i === 0 ? undefined : `p${i - 1}`,
  }));
}

// Minimal props object — only the fields the tested pure functions read matter.
function makeProps(overrides: Partial<EventHandlerProps>): EventHandlerProps {
  return {
    initialPoints: makePoints(6),
    allowClose: true,
    isPathClosed: false,
    skeletonEnabled: true,
    activePointId: null,
    minPoints: 6,
    ...overrides,
  } as EventHandlerProps;
}

describe("isActivePointEligibleForClosing", () => {
  it("allows closing when the user explicitly clicks the first point, even if an intermediate point is active (BROS-911)", () => {
    const points = makePoints(6);
    const props = makeProps({ initialPoints: points, activePointId: "p2" });

    // Regression: selecting a middle point mid-drawing must not block closing
    // when the user clicks the first endpoint to close.
    expect(isActivePointEligibleForClosing(props, 0)).toBe(true);
  });

  it("allows closing when the user explicitly clicks the last point with an intermediate point active", () => {
    const points = makePoints(6);
    const props = makeProps({ initialPoints: points, activePointId: "p3" });

    expect(isActivePointEligibleForClosing(props, points.length - 1)).toBe(true);
  });

  it("falls back to active-point logic when no clicked index is provided", () => {
    const points = makePoints(6);
    // Active point is an intermediate point -> not eligible without an explicit endpoint click.
    const props = makeProps({ initialPoints: points, activePointId: "p2" });

    expect(isActivePointEligibleForClosing(props)).toBe(false);
  });

  it("falls back to active-point logic when the clicked point is not an endpoint", () => {
    const points = makePoints(6);
    const props = makeProps({ initialPoints: points, activePointId: "p2" });

    // Clicking an intermediate point uses the active-point heuristic (active is also intermediate).
    expect(isActivePointEligibleForClosing(props, 2)).toBe(false);
  });

  it("remains eligible when the active point is itself an endpoint (no clicked index)", () => {
    const points = makePoints(6);
    const props = makeProps({ initialPoints: points, activePointId: "p5" });

    expect(isActivePointEligibleForClosing(props)).toBe(true);
  });
});

describe("shouldClosePathOnPointClick", () => {
  const event = { evt: { shiftKey: false } } as any;

  it("returns true for an endpoint click on an open, closable path", () => {
    const props = makeProps({});
    expect(shouldClosePathOnPointClick(0, props, event)).toBe(true);
    expect(shouldClosePathOnPointClick(props.initialPoints.length - 1, props, event)).toBe(true);
  });

  it("returns false for an intermediate point click", () => {
    const props = makeProps({});
    expect(shouldClosePathOnPointClick(2, props, event)).toBe(false);
  });
});
