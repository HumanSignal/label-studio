/**
 * Unit tests for the VideoVector tool (tools/VideoVector.js).
 *
 * Focused on the drawing-state lifecycle and, in particular, the BROS-1207
 * regression: after an in-progress VideoVector region is deleted out from under
 * the tool (e.g. removed from the regions sidebar), the next click must be able
 * to start a brand-new region instead of being silently swallowed because the
 * tool is stuck in "drawing" mode.
 */

import { destroy, getEnv, isAlive, types } from "mobx-state-tree";
import { VideoVector } from "../VideoVector";

const mockFfActive = mock(() => false);
mockModule("@humansignal/core", () => {
  const actual = requireActual("@humansignal/core");
  return {
    ...actual,
    ff: { ...actual.ff, isActive: (flag) => mockFfActive(flag) },
  };
});

// Minimal MobX-state-tree stand-in for a VideoVectorRegion. It needs to be a
// real MST node so the tool's isAlive() checks behave like production and so we
// can destroy() it to simulate an external delete.
const MockRegion = types
  .model("MockVideoVectorRegion", {
    id: types.identifier,
    type: types.optional(types.string, "videovectorregion"),
    closedFlag: types.optional(types.boolean, false),
    drawingFlag: types.optional(types.boolean, false),
    finished: types.optional(types.boolean, false),
    sequence: types.frozen([]),
  })
  // Records points appended via addVertexAtCanvasPoint so tests can assert that
  // a click actually produced a vertex (BROS-1408).
  .volatile(() => ({
    appendedPoints: [],
  }))
  .views((self) => ({
    get closed() {
      return self.closedFlag;
    },
    get isDrawing() {
      return self.drawingFlag;
    },
    getShape() {
      return { closed: self.closedFlag, vertices: [] };
    },
  }))
  .actions((self) => ({
    setDrawing(value) {
      self.drawingFlag = value;
    },
    startPoint() {},
    commitPoint() {},
    deleteRegion() {},
    addVertexAtCanvasPoint(x, y) {
      self.appendedPoints.push({ x, y });
      return true;
    },
  }));

// Compose the real tool with an env-backed annotation getter so we can drive it
// without standing up a full annotation store. obj/control/manager already read
// from the env via ToolMixin.
const EnvAnnotation = types.model("EnvAnnotation", {}).views((self) => ({
  get annotation() {
    return getEnv(self).annotation;
  },
}));
const TestTool = types.compose("TestVideoVectorTool", VideoVector, EnvAnnotation);
const Store = types.model("VideoVectorStore", { tool: TestTool });

function createTool() {
  const regs = [];
  let counter = 0;

  const annotation = {
    isDrawing: false,
    isReadOnly: () => false,
    setIsDrawing: mock(function setIsDrawing(value) {
      annotation.isDrawing = value;
    }),
    unselectAreas: mock(),
    afterCreateResult: mock(),
    history: { freeze: mock(), unfreeze: mock() },
    selectedRegions: [],
    regions: [],
    regionStore: { selection: { highlighted: null } },
  };

  const obj = {
    regs,
    currentFrame: 0,
    hasStates: true,
    activeStates: () => [{}],
    getAvailableStates: () => [{}],
    checkLabels: () => true,
    addVideoVectorRegion: mock(() => {
      const region = MockRegion.create({ id: `region-${counter++}` });
      regs.push(region);
      return region;
    }),
  };

  // control.type differs from tagTypes.stateTypes ("videovectorlabels") so the
  // tool's isIncorrectControl() resolves to false.
  const control = { type: "videovector", isSelected: true };
  const manager = {};

  const store = Store.create({ tool: {} }, { object: obj, control, manager, annotation });

  return { tool: store.tool, obj, annotation, regs };
}

describe("VideoVector tool", () => {
  beforeEach(() => {
    clearAllMocks();
  });

  describe("resetDrawingState", () => {
    it("clears mode, currentArea and the annotation drawing flag", () => {
      const { tool, annotation } = createTool();

      tool.mousedownEv({ button: 0 }, [10, 10]);
      expect(tool.mode).toBe("drawing");
      expect(tool.currentArea).not.toBeNull();

      tool.resetDrawingState();

      expect(tool.mode).toBe("viewing");
      expect(tool.currentArea).toBeNull();
      expect(annotation.isDrawing).toBe(false);
      expect(annotation.setIsDrawing).toHaveBeenLastCalledWith(false);
    });
  });

  describe("drawing after the active region is deleted (BROS-1207)", () => {
    it("starts a new region on the next click instead of no-op'ing", () => {
      const { tool, obj, regs } = createTool();

      // Draw the first region — it stays in "drawing" mode because this config
      // (no closable / maxPoints) never auto-finishes.
      tool.mousedownEv({ button: 0 }, [10, 10]);
      expect(obj.addVideoVectorRegion).toHaveBeenCalledTimes(1);
      expect(tool.mode).toBe("drawing");

      // Simulate deleting that still-unfinished region from the sidebar: it is
      // removed from the object's regions and destroyed, but the tool still
      // holds a (now dead) reference to it.
      const region1 = tool.currentArea;
      regs.length = 0;
      destroy(region1);
      expect(isAlive(region1)).toBe(false);

      // The next click must reset the stale state and start a fresh region.
      tool.mousedownEv({ button: 0 }, [50, 50]);

      expect(obj.addVideoVectorRegion).toHaveBeenCalledTimes(2);
      expect(tool.mode).toBe("drawing");
      expect(tool.currentArea).not.toBeNull();
      expect(isAlive(tool.currentArea)).toBe(true);
      expect(tool.currentArea).not.toBe(region1);
    });

    it("keeps drawing the same region when it is still alive and unfinished", () => {
      const { tool, obj } = createTool();

      tool.mousedownEv({ button: 0 }, [10, 10]);
      expect(obj.addVideoVectorRegion).toHaveBeenCalledTimes(1);
      const region1 = tool.currentArea;

      // Region is alive and unclosed → a subsequent click should continue the
      // same region, not create a new one.
      tool.mousedownEv({ button: 0 }, [50, 50]);

      expect(obj.addVideoVectorRegion).toHaveBeenCalledTimes(1);
      expect(tool.currentArea).toBe(region1);
    });
  });

  describe("each click produces a vertex (BROS-1408)", () => {
    // The point is committed inside a setTimeout in mouseupEv; flush the macro
    // task queue so the assertion runs after it fires.
    const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

    it("adds a vertex even when the cursor moves more than 5px between mousedown and mouseup", async () => {
      const { tool } = createTool();

      tool.mousedownEv({ button: 0 }, [10, 10]);
      const region = tool.currentArea;
      expect(region).not.toBeNull();

      // Fast click: the cursor is still in motion, so mouseup lands well beyond
      // 5px from mousedown. The point must still be created — previously this
      // delta silently dropped the click.
      tool.mouseupEv({}, [40, 60]);
      await flush();

      expect(region.appendedPoints).toEqual([{ x: 40, y: 60 }]);
    });

    it("adds a vertex on a clean (no-movement) click", async () => {
      const { tool } = createTool();

      tool.mousedownEv({ button: 0 }, [10, 10]);
      const region = tool.currentArea;

      tool.mouseupEv({}, [11, 11]);
      await flush();

      expect(region.appendedPoints).toEqual([{ x: 11, y: 11 }]);
    });

    it("does not append a vertex for a shift+click (handled by KonvaVector)", async () => {
      const { tool } = createTool();

      // A normal click adds the first vertex.
      tool.mousedownEv({ button: 0 }, [10, 10]);
      const region = tool.currentArea;
      tool.mouseupEv({}, [10, 10]);
      await flush();
      expect(region.appendedPoints).toHaveLength(1);

      // Shift+click is handled by KonvaVector (ghost-point insertion): mousedown
      // returns early without arming `down`, so the mouseup must not append.
      tool.mousedownEv({ button: 0, shiftKey: true }, [20, 20]);
      tool.mouseupEv({ shiftKey: true }, [20, 20]);
      await flush();
      expect(region.appendedPoints).toHaveLength(1);
    });
  });

  // After a region is closed/finished, the closing pointer gesture emits a
  // trailing (debounced) click that reaches the region's onClick handler once
  // `isDrawing` has already flipped to false. Without a guard that click runs
  // onClickRegion → _selectArea, which *toggles* selection: it selects a region
  // that "Select region after creating it" is off for (the reported bug), and
  // would unselect a region the setting is on for. Selection after creation must
  // be owned solely by afterCreateResult, which honors the setting. BROS-1411.
  describe("selection after closing respects the setting (BROS-1411)", () => {
    function finishCurrentRegion(tool) {
      tool.mousedownEv({ button: 0 }, [10, 10]);
      const region = tool.currentArea;
      tool._finishDrawing();
      return region;
    }

    it("delegates post-close selection to afterCreateResult (setting-aware)", () => {
      const { tool, annotation } = createTool();

      const region = finishCurrentRegion(tool);

      // The tool never selects/unselects the region directly — it hands off to
      // afterCreateResult, which is the single place that reads selectAfterCreate.
      expect(annotation.afterCreateResult).toHaveBeenCalledTimes(1);
      expect(annotation.afterCreateResult.mock.calls[0][0]).toBe(region);
    });

    it("suppresses the trailing close-gesture click once (single-shot)", () => {
      const { tool } = createTool();

      const region = finishCurrentRegion(tool);

      // The first click on the just-finished region (the trailing close click)
      // is suppressed so it cannot toggle selection…
      expect(tool.consumeSelectSuppression(region.id)).toBe(true);
      // …but only once — a later genuine click selects normally.
      expect(tool.consumeSelectSuppression(region.id)).toBe(false);
    });

    it("does not suppress clicks on a different region", () => {
      const { tool } = createTool();

      finishCurrentRegion(tool);

      expect(tool.consumeSelectSuppression("some-other-region")).toBe(false);
    });

    it("does not suppress once the guard window has elapsed", () => {
      const { tool } = createTool();

      setSystemTime(new Date("2024-01-01T00:00:00.000Z"));
      try {
        const region = finishCurrentRegion(tool);

        // Well beyond the debounce/guard window — a real later click must select.
        setSystemTime(new Date("2024-01-01T00:00:01.000Z"));
        expect(tool.consumeSelectSuppression(region.id)).toBe(false);
      } finally {
        setSystemTime();
      }
    });
  });
});
