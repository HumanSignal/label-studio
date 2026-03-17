/**
 * Unit tests for DrawingTool mixin (mixins/DrawingTool.js).
 * Covers DrawingTool base views and actions, comparePointsWithThreshold,
 * createRegionOptions, isAllowedInteraction, canStartDrawing, deleteRegion,
 * resetBeforeAnnotationSwitch, and TwoPointsDrawingTool / MultipleClicksDrawingTool / ThreePointsDrawingTool.
 */

import { getEnv, types } from "mobx-state-tree";
import { DrawingTool, TwoPointsDrawingTool, MultipleClicksDrawingTool, ThreePointsDrawingTool } from "../DrawingTool";

jest.mock("../../utils/feature-flags", () => ({
  isFF: jest.fn(() => false),
  FF_DEV_3391: "ff_3391",
}));

const mockFfIsActive = jest.fn(() => false);
jest.mock("@humansignal/core", () => ({
  ff: {
    isActive: (flag) => mockFfIsActive(flag),
    FF_MULTIPLE_LABELS_REGIONS: "ff_multiple_labels",
  },
}));

function createMockAnnotation(overrides = {}) {
  return {
    isReadOnly: jest.fn(() => false),
    editable: true,
    isDrawing: false,
    setIsDrawing: jest.fn(),
    createResult: jest.fn(() => mockCreatedResult),
    history: { freeze: jest.fn(), unfreeze: jest.fn() },
    unselectAll: jest.fn(),
    regionStore: {
      selection: {
        _updateResultsFromRegions: jest.fn(),
        drawingSelect: jest.fn(),
        drawingUnselect: jest.fn(),
      },
      hasSelection: false,
    },
    ...overrides,
  };
}

function createMockControl(overrides = {}) {
  return {
    type: "rectlabels",
    isSelected: true,
    getResultValue: jest.fn(() => ({})),
    ...overrides,
  };
}

function createMockObj(overrides = {}) {
  return {
    stageScale: 1,
    stageWidth: 800,
    stageHeight: 600,
    checkLabels: jest.fn(() => true),
    createDrawingRegion: jest.fn(() => mockDrawingRegion),
    deleteDrawingRegion: jest.fn(),
    activeStates: jest.fn(() => []),
    canvasSize: { width: 800, height: 600 },
    canvasToInternalX: jest.fn((v) => v),
    canvasToInternalY: jest.fn((v) => v),
    multiImage: false,
    currentImage: 0,
    ...overrides,
  };
}

function createMockManager(overrides = {}) {
  return {
    findSelectedTool: jest.fn(function fn() {
      return this._currentTool ?? null;
    }),
    selectTool: jest.fn(),
    _currentTool: null,
    ...overrides,
  };
}

let mockDrawingRegion;
let mockCreatedResult;

const EnvDrawingTool = types.model("EnvDrawingTool", {}).views((self) => ({
  get annotation() {
    return getEnv(self).annotation;
  },
  get control() {
    return getEnv(self).control;
  },
  get obj() {
    return getEnv(self).obj;
  },
  get manager() {
    return getEnv(self).manager;
  },
  get group() {
    return getEnv(self).group ?? "default";
  },
  get disabled() {
    return getEnv(self).disabled ?? false;
  },
  get dynamic() {
    return getEnv(self).dynamic ?? false;
  },
}));

const WithTagTypes = (stateTypes) =>
  types.model("WithTagTypes", {}).views(() => ({
    get tagTypes() {
      return { stateTypes };
    },
  }));
const TestDrawingTool = types.compose(EnvDrawingTool, DrawingTool, WithTagTypes("rectlabels"));
const Store = types.model("Store", { tool: TestDrawingTool });

function createStore(envOverrides = {}) {
  const annotation = createMockAnnotation();
  const control = createMockControl();
  const obj = createMockObj();
  const manager = createMockManager();
  mockDrawingRegion = {
    setDrawing: jest.fn(),
    toJSON: jest.fn(() => ({ x: 0, y: 0, coordstype: "px" })),
    serialize: jest.fn(() => ({ value: { x: 0, y: 0 } })),
    get results() {
      return [{ value: { toJSON: () => ({}) } }, { value: { toJSON: () => ({}) }, toJSON: () => ({ extra: 1 }) }];
    },
    setPositionInternal: jest.fn(),
    addPoint: jest.fn(),
    draw: jest.fn(),
    type: "rect",
    startX: 0,
    startY: 0,
    rotation: 0,
  };
  mockCreatedResult = {
    addResult: jest.fn(),
    notifyDrawingFinished: jest.fn(),
  };
  const env = {
    annotation,
    control,
    obj,
    manager,
    object: obj,
    ...envOverrides,
  };
  const store = Store.create({ tool: {} }, env);
  return { store, tool: store.tool, annotation, control, obj, manager };
}

describe("DrawingTool mixin", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("views", () => {
    it("createRegionOptions adds coordstype px", () => {
      const { tool } = createStore();
      expect(tool.createRegionOptions({ x: 1, y: 2 })).toEqual({
        x: 1,
        y: 2,
        coordstype: "px",
      });
    });

    it("isDrawing is true when mode is drawing", () => {
      const { tool } = createStore();
      expect(tool.isDrawing).toBe(false);
      tool.startDrawing(0, 0);
      expect(tool.isDrawing).toBe(true);
    });

    it("getActiveShape and getCurrentArea return currentArea", () => {
      const { tool } = createStore();
      expect(tool.getActiveShape).toBeNull();
      expect(tool.getCurrentArea()).toBeNull();
      expect(tool.current()).toBeNull();
      tool.startDrawing(0, 0);
      expect(tool.getCurrentArea()).toBe(mockDrawingRegion);
      expect(tool.getActiveShape).toBe(mockDrawingRegion);
    });

    it("canStart returns false when annotation is read-only", () => {
      const { tool, annotation } = createStore();
      annotation.isReadOnly.mockReturnValue(true);
      expect(tool.canStart()).toBe(false);
    });

    it("canStart returns true when not drawing and not read-only", () => {
      const { tool } = createStore();
      expect(tool.canStart()).toBe(true);
    });

    it("MIN_SIZE returns scaled dimensions", () => {
      const { tool, obj } = createStore();
      obj.stageScale = 2;
      obj.stageWidth = 400;
      obj.stageHeight = 300;
      const min = tool.MIN_SIZE;
      expect(min).toHaveProperty("X");
      expect(min).toHaveProperty("Y");
    });

    it("isAllowedInteraction returns true when group is not segmentation", () => {
      const { tool } = createStore({ group: "default" });
      expect(tool.isAllowedInteraction({ offsetX: 0, offsetY: 0 })).toBe(true);
    });

    it("isAllowedInteraction returns false when offset exceeds canvas (segmentation)", () => {
      const { tool, obj } = createStore({ group: "segmentation" });
      obj.canvasSize = { width: 100, height: 100 };
      expect(tool.isAllowedInteraction({ offsetX: 150, offsetY: 50 })).toBe(false);
      expect(tool.isAllowedInteraction({ offsetX: 50, offsetY: 150 })).toBe(false);
    });

    it("isAllowedInteraction returns true when within canvas (segmentation)", () => {
      const { tool } = createStore({ group: "segmentation" });
      expect(tool.isAllowedInteraction({ offsetX: 50, offsetY: 50 })).toBe(true);
    });

    it("isAllowedInteraction returns false when FF_DEV_3391 and !annotation.editable", () => {
      const { isFF } = require("../../utils/feature-flags");
      isFF.mockReturnValue(true);
      const { tool, annotation } = createStore();
      annotation.editable = false;
      expect(tool.isAllowedInteraction({ offsetX: 50, offsetY: 50 })).toBe(false);
      isFF.mockReturnValue(false);
    });

    it("isIncorrectControl returns true when tagTypes.stateTypes matches control.type and control not selected", () => {
      const { tool, control } = createStore();
      control.isSelected = false;
      expect(tool.tagTypes.stateTypes).toBe("rectlabels");
      expect(tool.isIncorrectControl()).toBe(true);
    });

    it("isIncorrectLabel returns true when obj.checkLabels is false", () => {
      const { tool, obj } = createStore();
      obj.checkLabels.mockReturnValue(false);
      expect(tool.isIncorrectLabel()).toBe(true);
    });
  });

  describe("comparePointsWithThreshold", () => {
    it("returns undefined when p1 or p2 is null/undefined", () => {
      const { tool } = createStore();
      expect(tool.comparePointsWithThreshold(null, { x: 0, y: 0 })).toBeUndefined();
      expect(tool.comparePointsWithThreshold({ x: 0, y: 0 }, null)).toBeUndefined();
    });

    it("returns true when points are within default threshold", () => {
      const { tool } = createStore();
      expect(tool.comparePointsWithThreshold({ x: 0, y: 0 }, { x: 0, y: 0 })).toBe(true);
    });

    it("returns false when points exceed threshold", () => {
      const { tool } = createStore();
      const threshold = { x: 1, y: 1 };
      expect(tool.comparePointsWithThreshold({ x: 0, y: 0 }, { x: 100, y: 100 }, threshold)).toBe(false);
    });

    it("accepts number threshold and uses it for x and y", () => {
      const { tool } = createStore();
      expect(tool.comparePointsWithThreshold({ x: 0, y: 0 }, { x: 2, y: 2 }, 5)).toBe(true);
      expect(tool.comparePointsWithThreshold({ x: 0, y: 0 }, { x: 10, y: 10 }, 5)).toBe(false);
    });
  });

  describe("event", () => {
    it("ignores right click and shift", () => {
      const { tool } = createStore();
      tool.clickEv = jest.fn();
      tool.event("click", { button: 1, timeStamp: 0 }, [0, 0, 0, 0]);
      expect(tool.clickEv).not.toHaveBeenCalled();
      tool.event("click", { button: 0, shiftKey: true, timeStamp: 0 }, [0, 0, 0, 0]);
      expect(tool.clickEv).not.toHaveBeenCalled();
    });

    it("invokes clickEv for left click", () => {
      const { tool } = createStore();
      tool.clickEv = jest.fn();
      tool.event("click", { button: 0, shiftKey: false, timeStamp: 100 }, [1, 2, 3, 4]);
      expect(tool.clickEv).toHaveBeenCalledWith(expect.any(Object), [1, 2], [3, 4]);
    });

    it("invokes mousedownEv for mousedown", () => {
      const { tool } = createStore();
      tool.mousedownEv = jest.fn();
      tool.event("mousedown", { button: 0, shiftKey: false }, [1, 2, 3, 4]);
      expect(tool.mousedownEv).toHaveBeenCalledWith(expect.any(Object), [1, 2], [3, 4]);
    });

    it("invokes mousemoveEv for mousemove", () => {
      const { tool } = createStore();
      tool.mousemoveEv = jest.fn();
      tool.event("mousemove", { button: 0 }, [1, 2, 3, 4]);
      expect(tool.mousemoveEv).toHaveBeenCalledWith(expect.any(Object), [1, 2], [3, 4]);
    });

    it("invokes mouseupEv for mouseup", () => {
      const { tool } = createStore();
      tool.mouseupEv = jest.fn();
      tool.event("mouseup", { button: 0 }, [1, 2, 3, 4]);
      expect(tool.mouseupEv).toHaveBeenCalledWith(expect.any(Object), [1, 2], [3, 4]);
    });
  });

  describe("deleteRegion", () => {
    it("clears currentArea and calls obj.deleteDrawingRegion", () => {
      const { tool, obj } = createStore();
      tool.startDrawing(0, 0);
      expect(tool.currentArea).not.toBeNull();
      tool.deleteRegion();
      expect(tool.currentArea).toBeNull();
      expect(obj.deleteDrawingRegion).toHaveBeenCalled();
    });
  });

  describe("beforeCommitDrawing and canStartDrawing", () => {
    it("beforeCommitDrawing returns true", () => {
      const { tool } = createStore();
      expect(tool.beforeCommitDrawing()).toBe(true);
    });

    it("canStartDrawing returns false when disabled", () => {
      const { tool } = createStore({ disabled: true });
      expect(tool.canStartDrawing()).toBe(false);
    });

    it("canStartDrawing returns false when annotation is drawing", () => {
      const { tool, annotation } = createStore();
      annotation.isDrawing = true;
      expect(tool.canStartDrawing()).toBe(false);
    });
  });

  describe("resetBeforeAnnotationSwitch", () => {
    it("clears currentArea and sets mode to viewing", () => {
      const { tool } = createStore();
      tool.startDrawing(0, 0);
      expect(tool.mode).toBe("drawing");
      tool.resetBeforeAnnotationSwitch();
      expect(tool.currentArea).toBeNull();
      expect(tool.mode).toBe("viewing");
    });
  });

  describe("applyActiveStates", () => {
    it("calls area.setValue for each active state", () => {
      const { tool, obj } = createStore();
      const state1 = { setValue: jest.fn() };
      const state2 = { setValue: jest.fn() };
      obj.activeStates.mockReturnValue([state1, state2]);
      const area = { setValue: jest.fn() };
      tool.applyActiveStates(area);
      expect(area.setValue).toHaveBeenCalledWith(state1);
      expect(area.setValue).toHaveBeenCalledWith(state2);
    });
  });

  describe("finishDrawing and commitDrawingRegion", () => {
    it("finishDrawing commits and resets when beforeCommitDrawing returns true", () => {
      const { tool, annotation } = createStore();
      tool.startDrawing(0, 0);
      tool.finishDrawing();
      expect(annotation.setIsDrawing).toHaveBeenCalledWith(false);
      expect(annotation.createResult).toHaveBeenCalled();
      expect(mockCreatedResult.notifyDrawingFinished).toHaveBeenCalled();
      expect(tool.mode).toBe("viewing");
      expect(tool.currentArea).toBeNull();
    });

    it("commitDrawingRegion adds rest results to newArea", () => {
      const { tool, annotation } = createStore();
      tool.startDrawing(0, 0);
      tool.commitDrawingRegion();
      expect(mockCreatedResult.addResult).toHaveBeenCalledWith({ extra: 1 });
    });

    it("commitDrawingRegion returns early when no currentArea", () => {
      const { tool, annotation } = createStore();
      expect(tool.currentArea).toBeNull();
      const result = tool.commitDrawingRegion();
      expect(annotation.createResult).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
    });
  });

  describe("createRegion", () => {
    it("createRegion sets currentArea and applies active states when ff multiple labels is off", () => {
      const { tool, annotation, obj } = createStore();
      const area = { setValue: jest.fn() };
      annotation.createResult.mockReturnValue(area);
      obj.activeStates.mockReturnValue([]);
      const result = tool.createRegion({ x: 10, y: 10 });
      expect(annotation.createResult).toHaveBeenCalledWith({ x: 10, y: 10 }, {}, expect.anything(), obj, false);
      expect(tool.currentArea).toBe(area);
    });

    it("createRegion with FF_MULTIPLE_LABELS_REGIONS passes additionalStates", () => {
      mockFfIsActive.mockReturnValue(true);
      const { tool, annotation, obj } = createStore();
      const area = { setValue: jest.fn() };
      annotation.createResult.mockReturnValue(area);
      const state1 = {};
      const state2 = {};
      obj.activeStates.mockReturnValue([tool.control, state1, state2]);
      tool.createRegion({ x: 10, y: 10 });
      expect(annotation.createResult).toHaveBeenCalledWith({ x: 10, y: 10 }, {}, expect.anything(), obj, false, [
        state1,
        state2,
      ]);
      mockFfIsActive.mockReturnValue(false);
    });
  });

  describe("event double-click", () => {
    it("invokes dblclickEv when two clicks within 300ms at same point", () => {
      const { tool } = createStore();
      tool.dblclickEv = jest.fn();
      tool.clickEv = jest.fn();
      tool.event("click", { button: 0, shiftKey: false, timeStamp: 0 }, [5, 5, 0, 0]);
      tool.event("click", { button: 0, shiftKey: false, timeStamp: 100 }, [5, 5, 0, 0]);
      expect(tool.dblclickEv).toHaveBeenCalled();
    });
  });

  describe("resumeUnfinishedRegion", () => {
    it("resumes region and sets drawing mode", () => {
      const { tool, annotation, manager } = createStore();
      const unfinished = {
        setDrawing: jest.fn(),
        id: "poly1",
      };
      manager.findSelectedTool.mockReturnValue(null);
      tool.resumeUnfinishedRegion(unfinished);
      expect(tool.currentArea).toBe(unfinished);
      expect(unfinished.setDrawing).toHaveBeenCalledWith(true);
      expect(tool.mode).toBe("drawing");
      expect(annotation.setIsDrawing).toHaveBeenCalledWith(true);
      expect(annotation.regionStore.selection.drawingSelect).toHaveBeenCalledWith(unfinished);
      expect(manager.selectTool).toHaveBeenCalledWith(tool, true);
    });
  });
});

describe("TwoPointsDrawingTool", () => {
  const EnvTwoPoints = types.model("EnvTwoPoints", {}).views((self) => ({
    get annotation() {
      return getEnv(self).annotation;
    },
    get control() {
      return getEnv(self).control;
    },
    get obj() {
      return getEnv(self).obj;
    },
    get manager() {
      return getEnv(self).manager;
    },
    get group() {
      return getEnv(self).group ?? "default";
    },
    get disabled() {
      return getEnv(self).disabled ?? false;
    },
    get dynamic() {
      return getEnv(self).dynamic ?? false;
    },
  }));
  const TestTwoPoints = types.compose(EnvTwoPoints, TwoPointsDrawingTool, WithTagTypes("rectlabels"));
  const Store2 = types.model("Store2", { tool: TestTwoPoints });

  function createTwoPointsStore(envOverrides = {}) {
    mockDrawingRegion = {
      setDrawing: jest.fn(),
      toJSON: jest.fn(() => ({})),
      serialize: jest.fn(() => ({ value: {} })),
      get results() {
        return [{ value: { toJSON: () => ({}) } }];
      },
      setPositionInternal: jest.fn(),
      type: "rect",
      startX: 0,
      startY: 0,
      rotation: 0,
    };
    const annotation = createMockAnnotation();
    const control = createMockControl();
    const obj = createMockObj();
    const manager = createMockManager();
    const env = {
      annotation,
      control,
      obj,
      manager,
      object: obj,
      ...envOverrides,
    };
    return Store2.create({ tool: {} }, env);
  }

  it("defaultDimensions returns MIN_SIZE.X and MIN_SIZE.Y", () => {
    const store = createTwoPointsStore();
    const dim = store.tool.defaultDimensions;
    expect(dim).toHaveProperty("width");
    expect(dim).toHaveProperty("height");
  });

  it("mousedownEv then mousemoveEv beyond threshold starts drawing", () => {
    const store = createTwoPointsStore({ group: "default" });
    const tool = store.tool;
    tool.mousedownEv({ button: 0, offsetX: 50, offsetY: 50 }, [0.01, 0.01]);
    tool.mousemoveEv({}, [0.5, 0.5]);
    expect(tool.isDrawing).toBe(true);
  });

  it("mouseupEv after drag finishes drawing", () => {
    const store = createTwoPointsStore({ group: "default" });
    const tool = store.tool;
    tool.mousedownEv({ button: 0, offsetX: 50, offsetY: 50 }, [0.01, 0.01]);
    tool.mousemoveEv({}, [0.2, 0.2]);
    tool.mouseupEv({}, [0.3, 0.3]);
    expect(tool.mode).toBe("viewing");
    expect(tool.currentArea).toBeNull();
  });

  it("draw updates shape position", () => {
    const store = createTwoPointsStore();
    const tool = store.tool;
    tool.startDrawing(0.1, 0.1);
    const shape = tool.getCurrentArea();
    tool.draw(0.3, 0.3);
    expect(shape.setPositionInternal).toHaveBeenCalled();
  });

  it("draw with ellipse type uses ellipse bounds", () => {
    const store = createTwoPointsStore();
    const tool = store.tool;
    const ellipseShape = {
      setDrawing: jest.fn(),
      setPositionInternal: jest.fn(),
      type: "ellipse",
      startX: 0.2,
      startY: 0.2,
      rotation: 0,
    };
    tool.obj.createDrawingRegion.mockReturnValue(ellipseShape);
    tool.startDrawing(0.2, 0.2);
    tool.draw(0.5, 0.5);
    expect(ellipseShape.setPositionInternal).toHaveBeenCalled();
  });

  it("clickEv in two-clicks mode draws and finishes", () => {
    const store = createTwoPointsStore({ group: "default" });
    const tool = store.tool;
    tool.mousedownEv({ button: 0 }, [0.01, 0.01]);
    tool.mousemoveEv({}, [0.02, 0.02]);
    tool.clickEv({ button: 0 }, [0.02, 0.02]);
    tool.clickEv({ button: 0 }, [0.15, 0.15]);
    expect(tool.mode).toBe("viewing");
  });

  it("dblclickEv creates default dimensions shape", () => {
    const store = createTwoPointsStore({ group: "default" });
    const tool = store.tool;
    tool.obj.canvasToInternalX.mockReturnValue(0.05);
    tool.obj.canvasToInternalY.mockReturnValue(0.05);
    tool.dblclickEv({ button: 0 }, [0.1, 0.1]);
    expect(tool.annotation.createResult).toHaveBeenCalled();
  });
});

describe("MultipleClicksDrawingTool", () => {
  const EnvMulti = types.model("EnvMulti", {}).views((self) => ({
    get annotation() {
      return getEnv(self).annotation;
    },
    get control() {
      return getEnv(self).control;
    },
    get obj() {
      return getEnv(self).obj;
    },
    get manager() {
      return getEnv(self).manager;
    },
    get group() {
      return getEnv(self).group ?? "default";
    },
    get disabled() {
      return getEnv(self).disabled ?? false;
    },
    get dynamic() {
      return getEnv(self).dynamic ?? false;
    },
  }));
  const TestMulti = types.compose(EnvMulti, MultipleClicksDrawingTool);
  const StoreMulti = types.model("StoreMulti", { tool: TestMulti });

  function createMultiStore(envOverrides = {}) {
    mockDrawingRegion = {
      setDrawing: jest.fn(),
      addPoint: jest.fn(),
      draw: jest.fn(),
      get results() {
        return [{ value: { toJSON: () => ({}) } }];
      },
      toJSON: () => ({}),
      serialize: () => ({ value: {} }),
    };
    const annotation = createMockAnnotation();
    const control = createMockControl();
    const obj = createMockObj();
    const manager = createMockManager();
    const env = {
      annotation,
      control,
      obj,
      manager,
      object: obj,
      ...envOverrides,
    };
    return StoreMulti.create({ tool: {} }, env);
  }

  it("canStart returns false when current() is truthy", () => {
    const store = createMultiStore();
    expect(store.tool.canStart()).toBe(true);
    store.tool.startDrawing(0, 0);
    expect(store.tool.canStart()).toBe(false);
  });

  it("canStartDrawing returns false when regionStore.hasSelection", () => {
    const store = createMultiStore();
    store.tool.annotation.regionStore.hasSelection = true;
    expect(store.tool.canStartDrawing()).toBe(false);
  });

  it("nextPoint adds point to current area", () => {
    mockDrawingRegion = {
      setDrawing: jest.fn(),
      addPoint: jest.fn(),
      draw: jest.fn(),
      get results() {
        return [{ value: { toJSON: () => ({}) } }];
      },
      toJSON: () => ({}),
      serialize: () => ({ value: {} }),
      item_index: 0,
    };
    const store = createMultiStore();
    store.tool.obj.createDrawingRegion.mockReturnValue(mockDrawingRegion);
    store.tool.obj.multiImage = false;
    store.tool.startDrawing(0, 0);
    store.tool.nextPoint(0.1, 0.1);
    expect(mockDrawingRegion.addPoint).toHaveBeenCalledWith(0.1, 0.1);
  });

  it("finishDrawing calls drawingUnselect and closeCurrent then _finishDrawing", () => {
    const store = createMultiStore();
    store.tool.startDrawing(0, 0);
    store.tool.listenForClose = jest.fn();
    store.tool.closeCurrent = jest.fn();
    store.tool.finishDrawing();
    expect(store.tool.annotation.regionStore.selection.drawingUnselect).toHaveBeenCalled();
    expect(store.tool.closeCurrent).toHaveBeenCalled();
  });

  it("_clickEv when current and pointsCount > 2 at same point calls finishDrawing", () => {
    const store = createMultiStore({ group: "default" });
    const tool = store.tool;
    tool._clickEv({ timeStamp: 0 }, [0.1, 0.1]);
    tool.nextPoint(0.2, 0.2);
    tool.nextPoint(0.3, 0.3);
    tool.closeCurrent = jest.fn();
    tool._clickEv({ timeStamp: 100 }, [0.1, 0.1]);
    expect(tool.closeCurrent).toHaveBeenCalled();
  });

  it("_clickEv when no current and canStartDrawing starts drawing", () => {
    const store = createMultiStore({ group: "default" });
    const tool = store.tool;
    tool.listenForClose = jest.fn();
    tool._clickEv({ timeStamp: 100 }, [0.1, 0.1]);
    expect(tool.currentArea).not.toBeNull();
    expect(tool.listenForClose).toHaveBeenCalled();
  });
});

describe("ThreePointsDrawingTool", () => {
  const EnvThree = types.model("EnvThree", {}).views((self) => ({
    get annotation() {
      return getEnv(self).annotation;
    },
    get control() {
      return getEnv(self).control;
    },
    get obj() {
      return getEnv(self).obj;
    },
    get manager() {
      return getEnv(self).manager;
    },
    get group() {
      return getEnv(self).group ?? "default";
    },
    get disabled() {
      return getEnv(self).disabled ?? false;
    },
    get dynamic() {
      return getEnv(self).dynamic ?? false;
    },
  }));
  const TestThree = types.compose(EnvThree, ThreePointsDrawingTool);
  const Store3 = types.model("Store3", { tool: TestThree });

  function createThreeStore(envOverrides = {}) {
    const annotation = createMockAnnotation();
    const control = createMockControl();
    const obj = createMockObj();
    const manager = createMockManager();
    const env = {
      annotation,
      control,
      obj,
      manager,
      object: obj,
      ...envOverrides,
    };
    return Store3.create({ tool: {} }, env);
  }

  it("canStart returns false when current() is truthy", () => {
    const store = createThreeStore();
    expect(store.tool.canStart()).toBe(true);
    store.tool.startDrawing(0, 0);
    expect(store.tool.canStart()).toBe(false);
  });

  it("canStartDrawing delegates to !isIncorrectControl when not drawing", () => {
    const store = createThreeStore();
    store.tool.annotation.isDrawing = false;
    store.tool.annotation.regionStore.hasSelection = false;
    expect(store.tool.canStartDrawing()).toBe(true);
  });

  it("draw updates shape position", () => {
    mockDrawingRegion = {
      setDrawing: jest.fn(),
      setPositionInternal: jest.fn(),
      get results() {
        return [{ value: { toJSON: () => ({}) } }];
      },
      toJSON: () => ({}),
      serialize: () => ({ value: {} }),
      startX: 0,
      startY: 0,
      rotation: 0,
    };
    const store = createThreeStore();
    store.tool.obj.createDrawingRegion.mockReturnValue(mockDrawingRegion);
    store.tool.startDrawing(0.1, 0.1);
    store.tool.draw(0.3, 0.3);
    expect(mockDrawingRegion.setPositionInternal).toHaveBeenCalled();
  });

  it("nextPoint pushes point and calls area.draw", () => {
    mockDrawingRegion = {
      setDrawing: jest.fn(),
      draw: jest.fn(),
      get results() {
        return [{ value: { toJSON: () => ({}) } }];
      },
      toJSON: () => ({}),
      serialize: () => ({ value: {} }),
    };
    const store = createThreeStore();
    store.tool.obj.createDrawingRegion.mockReturnValue(mockDrawingRegion);
    store.tool.startDrawing(0, 0);
    store.tool.nextPoint(0.2, 0.2);
    expect(mockDrawingRegion.draw).toHaveBeenCalled();
  });

  it("mousedownEv sets startPoint and drawing mode", () => {
    mockDrawingRegion = {
      setDrawing: jest.fn(),
      draw: jest.fn(),
      setPositionInternal: jest.fn(),
      get results() {
        return [{ value: { toJSON: () => ({}) } }];
      },
      toJSON: () => ({}),
      serialize: () => ({ value: {} }),
      startX: 0,
      startY: 0,
      rotation: 0,
    };
    const store = createThreeStore({ group: "default" });
    store.tool.obj.createDrawingRegion.mockReturnValue(mockDrawingRegion);
    store.tool.mousedownEv({ button: 0, offsetX: 50, offsetY: 50 }, [0.1, 0.1]);
    expect(store.tool.mode).toBe("drawing");
  });

  it("_clickEv with 3 points finishes drawing", () => {
    mockDrawingRegion = {
      setDrawing: jest.fn(),
      draw: jest.fn(),
      setPositionInternal: jest.fn(),
      get results() {
        return [{ value: { toJSON: () => ({}) } }];
      },
      toJSON: () => ({}),
      serialize: () => ({ value: {} }),
    };
    const store = createThreeStore({ group: "default" });
    store.tool.obj.createDrawingRegion.mockReturnValue(mockDrawingRegion);
    store.tool._clickEv({}, [0.1, 0.1]);
    store.tool._clickEv({}, [0.2, 0.2]);
    store.tool._clickEv({}, [0.3, 0.3]);
    expect(store.tool.annotation.createResult).toHaveBeenCalled();
  });

  it("mousemoveEv in drawing mode calls updateDraw", () => {
    mockDrawingRegion = {
      setDrawing: jest.fn(),
      draw: jest.fn(),
      setPositionInternal: jest.fn(),
      get results() {
        return [{ value: { toJSON: () => ({}) } }];
      },
      toJSON: () => ({}),
      serialize: () => ({ value: {} }),
      startX: 0,
      startY: 0,
      rotation: 0,
    };
    const store = createThreeStore({ group: "default" });
    store.tool.obj.createDrawingRegion.mockReturnValue(mockDrawingRegion);
    store.tool.mousedownEv({ button: 0 }, [0.1, 0.1]);
    store.tool.mousemoveEv({}, [0.2, 0.2]);
    expect(mockDrawingRegion.setPositionInternal).toHaveBeenCalled();
  });

  it("mouseupEv in DRAG_MODE finishes drawing", () => {
    mockDrawingRegion = {
      setDrawing: jest.fn(),
      draw: jest.fn(),
      setPositionInternal: jest.fn(),
      get results() {
        return [{ value: { toJSON: () => ({}) } }];
      },
      toJSON: () => ({}),
      serialize: () => ({ value: {} }),
      startX: 0,
      startY: 0,
      rotation: 0,
    };
    const store = createThreeStore({ group: "default" });
    store.tool.obj.createDrawingRegion.mockReturnValue(mockDrawingRegion);
    store.tool.mousedownEv({ button: 0 }, [0.1, 0.1]);
    store.tool.mousemoveEv({}, [0.2, 0.2]);
    store.tool.mouseupEv({}, [0.3, 0.3]);
    expect(store.tool.mode).toBe("viewing");
  });

  it("dblclickEv creates default dimensions shape", () => {
    mockDrawingRegion = {
      setDrawing: jest.fn(),
      draw: jest.fn(),
      setPositionInternal: jest.fn(),
      get results() {
        return [{ value: { toJSON: () => ({}) } }];
      },
      toJSON: () => ({}),
      serialize: () => ({ value: {} }),
      startX: 0,
      startY: 0,
      rotation: 0,
    };
    const store = createThreeStore({ group: "default" });
    store.tool.obj.createDrawingRegion.mockReturnValue(mockDrawingRegion);
    store.tool.obj.canvasToInternalX.mockReturnValue(0.05);
    store.tool.obj.canvasToInternalY.mockReturnValue(0.05);
    store.tool.dblclickEv({ button: 0 }, [0.1, 0.1]);
    expect(store.tool.annotation.createResult).toHaveBeenCalled();
  });
});
