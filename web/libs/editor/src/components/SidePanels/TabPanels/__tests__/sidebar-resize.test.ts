/**
 * Tests for the resizable sidebar panel feature.
 *
 * These tests guard against regressions that would break the ability to
 * resize the side panels (left/right) in the labeling interface.
 */
import {
  DEFAULT_PANEL_HEIGHT,
  DEFAULT_PANEL_MAX_WIDTH,
  DEFAULT_PANEL_MIN_HEIGHT,
  DEFAULT_PANEL_MIN_WIDTH,
  DEFAULT_PANEL_WIDTH,
} from "../../constants";
import { resizePanelColumns, resizers } from "../utils";
import { type PanelBBox, Side } from "../types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makePanel = (overrides: Partial<PanelBBox> = {}): PanelBBox => ({
  top: 0,
  left: 0,
  order: 0,
  relativeLeft: 0,
  relativeTop: 0,
  zIndex: 1,
  width: DEFAULT_PANEL_WIDTH,
  height: DEFAULT_PANEL_HEIGHT,
  visible: true,
  detached: false,
  alignment: Side.right,
  maxHeight: 1000,
  panelViews: [],
  ...overrides,
});

/**
 * Pure reimplementation of the resizer-visibility rule from PanelTabsBase.tsx
 * so we can unit-test it without rendering React.
 *
 * Source: PanelTabsBase.tsx — the `shouldRender` expression inside
 * the {resizers.map(…)} block.
 */
const shouldRenderResizer = (
  res: string,
  alignment: string,
  collapsed: boolean,
  detached: boolean,
): boolean => (collapsed ? false : ((res === "left" || res === "right") && alignment !== res) || detached);

// ---------------------------------------------------------------------------
// 1. Constants
// ---------------------------------------------------------------------------

describe("Sidebar resize constants", () => {
  it("DEFAULT_PANEL_MIN_WIDTH is 180", () => {
    expect(DEFAULT_PANEL_MIN_WIDTH).toBe(180);
  });

  it("DEFAULT_PANEL_WIDTH is 320", () => {
    expect(DEFAULT_PANEL_WIDTH).toBe(320);
  });

  it("DEFAULT_PANEL_MAX_WIDTH is 500", () => {
    expect(DEFAULT_PANEL_MAX_WIDTH).toBe(500);
  });

  it("DEFAULT_PANEL_MIN_WIDTH < DEFAULT_PANEL_WIDTH < DEFAULT_PANEL_MAX_WIDTH", () => {
    expect(DEFAULT_PANEL_MIN_WIDTH).toBeLessThan(DEFAULT_PANEL_WIDTH);
    expect(DEFAULT_PANEL_WIDTH).toBeLessThan(DEFAULT_PANEL_MAX_WIDTH);
  });

  it("DEFAULT_PANEL_MIN_HEIGHT is positive", () => {
    expect(DEFAULT_PANEL_MIN_HEIGHT).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 2. Resizer visibility logic
// ---------------------------------------------------------------------------

describe("Sidebar resizer visibility", () => {
  describe("left-aligned panel", () => {
    it("shows the right-side resizer", () => {
      expect(shouldRenderResizer("right", "left", false, false)).toBe(true);
    });

    it("does NOT show the left-side resizer (would overlap the panel edge)", () => {
      expect(shouldRenderResizer("left", "left", false, false)).toBe(false);
    });

    it("does NOT show top/bottom resizers when attached", () => {
      expect(shouldRenderResizer("top", "left", false, false)).toBe(false);
      expect(shouldRenderResizer("bottom", "left", false, false)).toBe(false);
    });
  });

  describe("right-aligned panel", () => {
    it("shows the left-side resizer", () => {
      expect(shouldRenderResizer("left", "right", false, false)).toBe(true);
    });

    it("does NOT show the right-side resizer", () => {
      expect(shouldRenderResizer("right", "right", false, false)).toBe(false);
    });

    it("does NOT show top/bottom resizers when attached", () => {
      expect(shouldRenderResizer("top", "right", false, false)).toBe(false);
      expect(shouldRenderResizer("bottom", "right", false, false)).toBe(false);
    });
  });

  describe("detached (floating) panel", () => {
    it("shows ALL resizers", () => {
      for (const res of resizers) {
        expect(shouldRenderResizer(res, "left", false, true)).toBe(true);
      }
    });
  });

  describe("collapsed panel", () => {
    it("shows NO resizers regardless of alignment", () => {
      for (const res of resizers) {
        expect(shouldRenderResizer(res, "left", true, false)).toBe(false);
        expect(shouldRenderResizer(res, "right", true, false)).toBe(false);
      }
    });
  });
});

// ---------------------------------------------------------------------------
// 3. resizePanelColumns — group height resize
// ---------------------------------------------------------------------------

describe("resizePanelColumns", () => {
  it("returns the original state when the panel has no alignment", () => {
    const state: Record<string, PanelBBox> = {
      panel1: makePanel({ alignment: undefined as unknown as Side }),
    };
    const result = resizePanelColumns(state, "panel1", 300, 0, 1000);

    expect(result).toBe(state);
  });

  it("clamps the resized panel height to DEFAULT_PANEL_MIN_HEIGHT", () => {
    const state: Record<string, PanelBBox> = {
      panel1: makePanel({ height: 500, order: 0 }),
      panel2: makePanel({ height: 500, order: 1 }),
    };
    const belowMin = DEFAULT_PANEL_MIN_HEIGHT - 10;
    const result = resizePanelColumns(state, "panel2", belowMin, 0, 1000);

    expect(result["panel2"].height).toBeGreaterThanOrEqual(DEFAULT_PANEL_MIN_HEIGHT);
  });

  it("sets the resized panel to the requested height when within bounds", () => {
    const state: Record<string, PanelBBox> = {
      panel1: makePanel({ height: 500, order: 0 }),
      panel2: makePanel({ height: 500, order: 1 }),
    };
    const newHeight = 300;
    const result = resizePanelColumns(state, "panel2", newHeight, 0, 1000);

    expect(result["panel2"].height).toBe(newHeight);
  });

  it("does not exceed availableHeight for any panel", () => {
    const availableHeight = 800;
    const state: Record<string, PanelBBox> = {
      panel1: makePanel({ height: 400, order: 0 }),
      panel2: makePanel({ height: 400, order: 1 }),
    };
    const result = resizePanelColumns(state, "panel2", 700, 0, availableHeight);

    for (const panel of Object.values(result)) {
      expect(panel.height).toBeLessThanOrEqual(availableHeight);
    }
  });

  it("invisible panels are not resized", () => {
    const state: Record<string, PanelBBox> = {
      panel1: makePanel({ height: 500, order: 0, visible: false }),
      panel2: makePanel({ height: 500, order: 1 }),
    };
    const originalHeight = state["panel1"].height;
    const result = resizePanelColumns(state, "panel2", 300, 0, 1000);

    expect(result["panel1"].height).toBe(originalHeight);
  });
});
