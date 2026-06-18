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
    selectedFlag: types.optional(types.boolean, false),
    finished: types.optional(types.boolean, false),
    // Vertices returned by getShape(); lets tests stand up a finished, selected
    // open region that the tool treats as "resume drawing" (BROS-1413).
    verticesData: types.frozen([]),
    sequence: types.frozen([]),
  })
  // Records points appended via addVertexAtCanvasPoint so tests can assert that
  // a click actually produced a vertex (BROS-1408).
  .volatile(() => ({
    appendedPoints: [],
    // Set true by the view when an existing point/shape is being dragged so the
    // tool can tell an edit gesture from a placement click (BROS-1413).
    editingPointGesture: false,
  }))
  .views((self) => ({
    get closed() {
      return self.closedFlag;
    },
    get isDrawing() {
      return self.drawingFlag;
    },
    get selected() {
      return self.selectedFlag;
    },
    getShape() {
      return { closed: self.closedFlag, vertices: self.verticesData };
    },
  }))
  .actions((self) => ({
    setDrawing(value) {
      self.drawingFlag = value;
    },
    setEditingPointGesture(value) {
      self.editingPointGesture = value;
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

  describe("adjusting points on a selected region (BROS-1413)", () => {
    const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

    // Stand up a finished, selected, open (non-closable → never `closed`) region
    // with existing vertices, matching the reviewer scenario from the ticket: the
    // region is selected for editing, not actively being drawn.
    const addSelectedOpenRegion = (obj) => {
      const region = MockRegion.create({
        id: "selected-open",
        selectedFlag: true,
        verticesData: [
          { id: "a", x: 1, y: 1 },
          { id: "b", x: 2, y: 2 },
          { id: "c", x: 3, y: 3 },
          { id: "d", x: 4, y: 4 },
        ],
      });
      obj.regs.push(region);
      return region;
    };

    it("does not append a vertex when an existing point is dragged to adjust it", async () => {
      const { tool, obj } = createTool();
      const region = addSelectedOpenRegion(obj);

      // Press on the region: the tool resumes "drawing" on the selected open region.
      tool.mousedownEv({ button: 0 }, [12, 12]);
      expect(tool.currentArea).toBe(region);
      expect(tool.mode).toBe("drawing");

      // KonvaVector starts dragging the grabbed point — the view marks the gesture
      // as a point edit via onTransformStart.
      region.setEditingPointGesture(true);

      // Release after moving the point. No new vertex must be created; the user
      // only adjusted an existing point.
      tool.mouseupEv({}, [40, 40]);
      await flush();

      expect(region.appendedPoints).toEqual([]);
      // The flag is reset so the next genuine click can append again.
      expect(region.editingPointGesture).toBe(false);
    });

    it("does not append a vertex for a sub-threshold nudge/click that selects a point", async () => {
      const { tool, obj } = createTool();
      const region = addSelectedOpenRegion(obj);

      tool.mousedownEv({ button: 0 }, [12, 12]);
      expect(tool.currentArea).toBe(region);

      // A small nudge / click on an existing point never crosses KonvaVector's
      // drag threshold, so the view marks the gesture via onPointSelected during
      // KonvaVector's own mouse-up — which can run AFTER the tool's mouseupEv.
      // Simulate that ordering: the tool's mouseupEv runs first, then the flag is
      // set before the deferred append fires. No vertex must be appended.
      tool.mouseupEv({}, [14, 14]);
      region.setEditingPointGesture(true);
      await flush();

      expect(region.appendedPoints).toEqual([]);
      expect(region.editingPointGesture).toBe(false);
    });

    it("still appends a vertex when clicking empty canvas on a selected open region", async () => {
      const { tool, obj } = createTool();
      const region = addSelectedOpenRegion(obj);

      // Resume drawing on the selected open region, then click empty canvas (no
      // point grabbed → no edit gesture). A new vertex must be added.
      tool.mousedownEv({ button: 0 }, [80, 80]);
      expect(tool.currentArea).toBe(region);

      tool.mouseupEv({}, [80, 80]);
      await flush();

      expect(region.appendedPoints).toEqual([{ x: 80, y: 80 }]);
    });
  });
});
