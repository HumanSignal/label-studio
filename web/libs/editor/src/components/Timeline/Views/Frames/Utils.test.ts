import { describe, expect, it } from "bun:test";
import { computeKeypointsVirtualBounds } from "./Utils";

/** Previous hardcoded viewport used by KeypointsVirtual before FIT-2656. */
const LEGACY_VIRTUAL_VIEWPORT = 165;

describe("computeKeypointsVirtualBounds", () => {
  it("covers all visible rows for default timeline height at scrollTop 0", () => {
    const [start, end] = computeKeypointsVirtualBounds(0, 20, 64);

    // 64px viewport ≈ 3 rows + 5 overscan → indices 0..7
    expect(start).toBe(0);
    expect(end).toBe(7);
  });

  it("renders more rows than legacy 165px window for tall timelines (FIT-2656)", () => {
    const regionsLength = 20;
    const [, legacyEnd] = computeKeypointsVirtualBounds(0, regionsLength, LEGACY_VIRTUAL_VIEWPORT);
    const [, tallEnd] = computeKeypointsVirtualBounds(0, regionsLength, 300);

    expect(tallEnd).toBeGreaterThan(legacyEnd);
    // 300px viewport must cover all rows visible without scrolling (~13 rows) plus overscan
    expect(tallEnd).toBeGreaterThanOrEqual(17);
  });

  it("includes the last row when the full timeline fits in the viewport", () => {
    const regionsLength = 20;
    const viewportHeight = regionsLength * 24;
    const [, end] = computeKeypointsVirtualBounds(0, regionsLength, viewportHeight);

    expect(end).toBe(regionsLength);
  });

  it("does not extend past region count", () => {
    const [start, end] = computeKeypointsVirtualBounds(0, 5, 300);

    expect(start).toBe(0);
    expect(end).toBe(5);
  });

  it("shifts window when scrolled vertically", () => {
    const scrollTop = 240; // row 10
    const [start, end] = computeKeypointsVirtualBounds(scrollTop, 30, 64);

    expect(start).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(start);
  });
});
