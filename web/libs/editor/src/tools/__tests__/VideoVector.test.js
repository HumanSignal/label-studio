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
});
