/**
 * Tests for alignElements — side placements must return document coordinates (like every other alignment),
 * since the aligned element is portalled to `body` with `position: absolute`.
 */

import { alignElements } from "./dom";

type Rect = { top: number; left: number; width: number; height: number };

const withRect = (rect: Rect) => {
  const el = document.createElement("div");
  el.getBoundingClientRect = () =>
    ({
      ...rect,
      x: rect.left,
      y: rect.top,
      right: rect.left + rect.width,
      bottom: rect.top + rect.height,
      toJSON: () => ({}),
    }) as DOMRect;
  return el;
};

const setWindow = (scrollX: number, scrollY: number, innerWidth = 1000, innerHeight = 800) => {
  Object.defineProperty(window, "scrollX", { configurable: true, value: scrollX });
  Object.defineProperty(window, "scrollY", { configurable: true, value: scrollY });
  Object.defineProperty(window, "innerWidth", { configurable: true, value: innerWidth });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: innerHeight });
};

describe("alignElements side placements", () => {
  const original = {
    scrollX: window.scrollX,
    scrollY: window.scrollY,
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
  };

  afterEach(() => {
    setWindow(original.scrollX, original.scrollY, original.innerWidth, original.innerHeight);
  });

  // Trigger (viewport coords): 40x40 at (200, 100). Tooltip: 80x20.
  const trigger = () => withRect({ top: 100, left: 200, width: 40, height: 40 });
  const tooltip = () => withRect({ top: 0, left: 0, width: 80, height: 20 });

  it("adds the scroll offset to left-center / right-center like the other alignments", () => {
    setWindow(30, 500);
    const left = alignElements(trigger(), tooltip(), "left-center", 8);
    expect(left.align).toBe("left-center");
    expect(left.top).toBe(100 + 20 - 10 + 500);
    expect(left.left).toBe(200 - 80 - 8 + 30);

    const right = alignElements(trigger(), tooltip(), "right-center", 8);
    expect(right.align).toBe("right-center");
    expect(right.top).toBe(100 + 20 - 10 + 500);
    expect(right.left).toBe(200 + 40 + 8 + 30);

    // Parity with a non-side branch: bottom-left also returns viewport + scroll.
    const bottom = alignElements(trigger(), tooltip(), "bottom-left", 8);
    expect(bottom.top).toBe(100 + 40 + 8 + 500);
    expect(bottom.left).toBe(200 + 30);
  });

  it("flips against the viewport edges, not the scroll offset", () => {
    // Scrolled far right: the old check (`sideLeft < scrollX`) flipped a tooltip that fits in the viewport.
    setWindow(5000, 0);
    expect(alignElements(trigger(), tooltip(), "left-center", 8).align).toBe("left-center");

    // Trigger hugging the left viewport edge: no room on the left, flips right.
    const nearLeft = withRect({ top: 100, left: 10, width: 40, height: 40 });
    const flippedRight = alignElements(nearLeft, tooltip(), "left-center", 8);
    expect(flippedRight.align).toBe("right-center");
    expect(flippedRight.left).toBe(10 + 40 + 8 + 5000);

    // Trigger hugging the right viewport edge: no room on the right, flips left.
    const nearRight = withRect({ top: 100, left: 940, width: 40, height: 40 });
    const flippedLeft = alignElements(nearRight, tooltip(), "right-center", 8);
    expect(flippedLeft.align).toBe("left-center");
    expect(flippedLeft.left).toBe(940 - 80 - 8 + 5000);
  });
});
