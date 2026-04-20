/**
 * Tests for ImageTransformer anchor sizing behavior.
 * Verifies that resize handles scale with zoom level and maintain
 * a minimum grabbable hit area for small bounding boxes.
 *
 * Related issues:
 * - https://github.com/HumanSignal/label-studio/issues/4558
 * - https://github.com/HumanSignal/label-studio/issues/4452
 */

import { computeAnchorSize, computeAnchorHitSize } from "./anchorSizing";

describe("Anchor sizing for transformer handles", () => {
  describe("computeAnchorSize", () => {
    it("returns base size at zoom level 1", () => {
      const size = computeAnchorSize(1);
      expect(size).toBe(10);
    });

    it("scales inversely with zoom (handles stay same screen size when zoomed in)", () => {
      const sizeAt2x = computeAnchorSize(2);
      // At 2x zoom, anchor should be half the base size in stage coordinates
      // so it appears the same size on screen
      expect(sizeAt2x).toBe(5);
    });

    it("enforces minimum anchor size when zoomed out", () => {
      // At 0.25x zoom, naive scaling would give 40px — but minimum caps it
      const sizeAt025x = computeAnchorSize(0.25);
      // Should be capped to MIN / scale = 10 / 0.25 = 40 in stage coords
      // which renders as 10px on screen (the minimum)
      expect(sizeAt025x).toBeGreaterThanOrEqual(10);
    });

    it("never returns less than minimum screen size", () => {
      for (const zoom of [0.1, 0.5, 1, 2, 5, 10]) {
        const size = computeAnchorSize(zoom);
        const screenSize = size * zoom;
        expect(screenSize).toBeGreaterThanOrEqual(10);
      }
    });
  });

  describe("computeAnchorHitSize", () => {
    it("returns anchor size plus margin", () => {
      const hitSize = computeAnchorHitSize(10, 1);
      expect(hitSize).toBeGreaterThan(10);
    });

    it("hit area scales with zoom to maintain screen-space margin", () => {
      const hitAt1x = computeAnchorHitSize(10, 1);
      const hitAt2x = computeAnchorHitSize(5, 2);
      // Both should render to roughly the same screen-space hit area
      const screenHit1x = hitAt1x * 1;
      const screenHit2x = hitAt2x * 2;
      expect(Math.abs(screenHit1x - screenHit2x)).toBeLessThan(1);
    });

    it("minimum hit area is at least 26px on screen (anchor + 2*margin)", () => {
      for (const zoom of [0.5, 1, 2, 5]) {
        const anchorSize = computeAnchorSize(zoom);
        const hitSize = computeAnchorHitSize(anchorSize, zoom);
        const screenHitSize = hitSize * zoom;
        expect(screenHitSize).toBeGreaterThanOrEqual(26);
      }
    });
  });
});
