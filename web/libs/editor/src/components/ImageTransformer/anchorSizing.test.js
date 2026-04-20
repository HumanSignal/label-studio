import { computeAnchorSize, computeAnchorHitSize } from "./anchorSizing";

describe("computeAnchorSize", () => {
  it("returns base size at zoom level 1", () => {
    expect(computeAnchorSize(1)).toBe(10);
  });

  it("shrinks in stage-space when zoomed in (constant screen size)", () => {
    expect(computeAnchorSize(2)).toBe(5);
    expect(computeAnchorSize(4)).toBe(2.5);
  });

  it("grows in stage-space when zoomed out (constant screen size)", () => {
    expect(computeAnchorSize(0.5)).toBe(20);
  });

  it("never renders below minimum screen pixels", () => {
    for (const zoom of [0.1, 0.5, 1, 2, 5, 10]) {
      const stageSize = computeAnchorSize(zoom);
      const screenSize = stageSize * zoom;
      expect(screenSize).toBeGreaterThanOrEqual(10);
    }
  });

  it("handles edge case of very small zoom", () => {
    const size = computeAnchorSize(0.01);
    expect(size).toBeGreaterThan(0);
    expect(size * 0.01).toBeGreaterThanOrEqual(10);
  });
});

describe("computeAnchorHitSize", () => {
  it("is always larger than the visual anchor", () => {
    for (const zoom of [0.5, 1, 2]) {
      const anchor = computeAnchorSize(zoom);
      const hit = computeAnchorHitSize(anchor, zoom);
      expect(hit).toBeGreaterThan(anchor);
    }
  });

  it("adds consistent screen-space margin regardless of zoom", () => {
    const anchor1 = computeAnchorSize(1);
    const hit1 = computeAnchorHitSize(anchor1, 1);
    const screenMargin1 = (hit1 - anchor1) * 1;

    const anchor2 = computeAnchorSize(2);
    const hit2 = computeAnchorHitSize(anchor2, 2);
    const screenMargin2 = (hit2 - anchor2) * 2;

    expect(Math.abs(screenMargin1 - screenMargin2)).toBeLessThan(0.01);
  });
});
