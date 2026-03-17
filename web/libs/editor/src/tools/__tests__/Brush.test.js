/**
 * Unit tests for Brush tool (tools/Brush.jsx).
 * Covers Brush model defaults, views (tagTypes, controls, extraShortcuts, iconComponent),
 * BrushCursorMixin (cursorStyleRule, updateCursor), and actions (setStroke,
 * afterUpdateSelected, addPoint, mouseupEv, mousemoveEv, mousedownEv, commitDrawingRegion).
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { types } from "mobx-state-tree";

const mockCreateBrushSizeCircleCursor = jest.fn((val) => `url('cursor-${val}') auto`);
jest.mock("../../utils/canvas", () => ({
  __esModule: true,
  default: {
    createBrushSizeCircleCursor: (...args) => mockCreateBrushSizeCircleCursor(...args),
  },
}));

jest.mock("../../utils/feature-flags", () => ({
  isFF: jest.fn(() => false),
}));

const stageContent = {};
jest.mock("../../utils/utilities", () => {
  const actual = jest.requireActual("../../utils/utilities");
  return {
    ...actual,
    findClosestParent: jest.fn(() => stageContent),
  };
});

const MockIcon = () => React.createElement("span", { "data-testid": "brush-icon" });
jest.mock("../../components/Node/Node", () => ({
  NodeViews: {
    BrushRegionModel: {
      icon: MockIcon,
      altIcon: MockIcon,
    },
  },
}));

jest.mock("mobx-state-tree", () => {
  const actual = jest.requireActual("mobx-state-tree");
  const origGetRoot = actual.getRoot;
  return {
    ...actual,
    getRoot(node) {
      if (node && typeof node === "object" && Object.hasOwn(node, "__mockRoot")) {
        return node.__mockRoot;
      }
      return origGetRoot(node);
    },
  };
});

const { Brush, BrushCursorMixin } = require("../Brush");

function createMockManager() {
  return {
    name: "brush",
    selectTool: jest.fn(),
    root: null,
  };
}

function createMockControl(overrides = {}) {
  return {
    type: "brushlabels",
    strokeWidth: 15,
    isSelected: true,
    annotation: null,
    getResultValue: () => ({}),
    ...overrides,
  };
}

function createMockObj(overrides = {}) {
  return {
    name: "image",
    stageRef: {
      content: stageContent,
      container: () => ({ style: {} }),
    },
    annotation: null,
    regs: [],
    multiImage: false,
    currentImage: 0,
    canvasSize: { width: 100, height: 100 },
    checkLabels: () => true,
    ...overrides,
  };
}

function createMockAnnotation(overrides = {}) {
  return {
    createResult: jest.fn(() => mockNewArea),
    history: { freeze: jest.fn(), unfreeze: jest.fn() },
    isReadOnly: () => false,
    ...overrides,
  };
}

let mockNewArea;

describe("Brush tool", () => {
  let manager;
  let control;
  let obj;
  let annotation;

  beforeEach(() => {
    jest.clearAllMocks();
    const { findClosestParent } = require("../../utils/utilities");
    findClosestParent.mockReturnValue(stageContent);
    manager = createMockManager();
    control = createMockControl();
    obj = createMockObj();
    annotation = createMockAnnotation();
    control.annotation = annotation;
    obj.annotation = {
      selectArea: jest.fn(),
      setIsDrawing: jest.fn(),
    };
    control.__mockRoot = { annotationStore: { selected: annotation }, settings: { preserveSelectedTool: false } };
    obj.__mockRoot = { annotationStore: { selected: annotation }, settings: {} };
    mockNewArea = {
      setDrawing: jest.fn(),
      notifyDrawingFinished: jest.fn(),
    };
  });

  function createBrush(envOverrides = {}) {
    return Brush.create(
      {},
      {
        manager,
        control,
        object: obj,
        ...envOverrides,
      },
    );
  }

  describe("Brush model defaults and views", () => {
    it("has default strokeWidth, group, shortcut, and tagTypes", () => {
      const tool = createBrush();
      expect(tool.strokeWidth).toBe(15);
      expect(tool.group).toBe("segmentation");
      expect(tool.shortcut).toBe("tool:brush");
      expect(tool.tagTypes).toEqual({
        stateTypes: "brushlabels",
        controlTagTypes: ["brushlabels", "brush"],
      });
    });

    it("viewClass returns a function", () => {
      const tool = createBrush();
      expect(typeof tool.viewClass).toBe("function");
    });

    it("iconComponent returns NodeViews.BrushRegionModel icon when not dynamic", () => {
      const tool = createBrush();
      const Icon = tool.iconComponent;
      const { getByTestId } = render(React.createElement(Icon));
      expect(getByTestId("brush-icon")).toBeInTheDocument();
    });

    it("controls returns array with one Range element", () => {
      const tool = createBrush();
      const controls = tool.controls;
      expect(Array.isArray(controls)).toBe(true);
      expect(controls).toHaveLength(1);
      expect(controls[0].key).toBe("brush-size");
    });

    it("controls Range onChange updates strokeWidth via setStroke", () => {
      const tool = createBrush();
      const rangeControl = tool.controls[0];
      const onChange = rangeControl.props.onChange;
      expect(onChange).toBeDefined();
      onChange(25);
      expect(tool.strokeWidth).toBe(25);
    });

    it("extraShortcuts has decrease and increase tool shortcuts", () => {
      const tool = createBrush();
      const shortcuts = tool.extraShortcuts;
      expect(shortcuts["tool:decrease-tool"]).toHaveLength(2);
      expect(shortcuts["tool:increase-tool"]).toHaveLength(2);
      expect(shortcuts["tool:decrease-tool"][0]).toBe("Decrease size");
      expect(shortcuts["tool:increase-tool"][0]).toBe("Increase size");
    });

    it("extraShortcuts decrease handler calls setStroke with clamped value", () => {
      const tool = createBrush();
      tool.setStroke(20);
      const decreaseFn = tool.extraShortcuts["tool:decrease-tool"][1];
      decreaseFn();
      expect(tool.strokeWidth).toBe(15);
    });

    it("extraShortcuts increase handler calls setStroke with clamped value", () => {
      const tool = createBrush();
      tool.setStroke(40);
      const increaseFn = tool.extraShortcuts["tool:increase-tool"][1];
      increaseFn();
      expect(tool.strokeWidth).toBe(45);
    });

    it("extraShortcuts clamps to MIN_SIZE and MAX_SIZE", () => {
      const tool = createBrush();
      tool.setStroke(1);
      tool.extraShortcuts["tool:decrease-tool"][1]();
      expect(tool.strokeWidth).toBe(1);
      tool.setStroke(50);
      tool.extraShortcuts["tool:increase-tool"][1]();
      expect(tool.strokeWidth).toBe(50);
    });
  });

  describe("BrushCursorMixin", () => {
    it("cursorStyleRule calls Canvas.createBrushSizeCircleCursor with strokeWidth", () => {
      const tool = createBrush();
      tool.setStroke(25);
      expect(tool.cursorStyleRule).toBe("url('cursor-25') auto");
      expect(mockCreateBrushSizeCircleCursor).toHaveBeenCalledWith(25);
    });

    it("updateCursor does nothing when not selected", () => {
      const tool = createBrush();
      tool.setSelected(false);
      const container = { style: {} };
      obj.stageRef = { container: () => container };
      tool.updateCursor();
      expect(container.style.cursor).toBeUndefined();
    });

    it("updateCursor does nothing when obj or stageRef is missing", () => {
      const toolNoObj = Brush.create({ selected: true }, { manager, control, object: null });
      mockCreateBrushSizeCircleCursor.mockClear();
      toolNoObj.updateCursor();
      expect(mockCreateBrushSizeCircleCursor).not.toHaveBeenCalled();
    });

    it("updateCursor sets container cursor when selected and stageRef present", () => {
      const container = { style: {} };
      obj.stageRef = { container: () => container };
      const tool = Brush.create({ selected: true }, { manager, control, object: obj });
      tool.updateCursor();
      expect(container.style.cursor).toContain("cursor");
      expect(container.style.cursor).toContain("15");
    });
  });

  describe("setStroke and afterUpdateSelected", () => {
    it("setStroke updates strokeWidth and invokes updateCursor when selected", () => {
      obj.stageRef = { container: () => ({ style: {} }) };
      const tool = Brush.create({ selected: true }, { manager, control, object: obj });
      mockCreateBrushSizeCircleCursor.mockClear();
      tool.setStroke(20);
      expect(tool.strokeWidth).toBe(20);
      expect(mockCreateBrushSizeCircleCursor).toHaveBeenCalledWith(20);
    });

    it("afterUpdateSelected invokes updateCursor when selected", () => {
      obj.stageRef = { container: () => ({ style: {} }) };
      const tool = Brush.create({ selected: true }, { manager, control, object: obj });
      mockCreateBrushSizeCircleCursor.mockClear();
      tool.afterUpdateSelected();
      expect(mockCreateBrushSizeCircleCursor).toHaveBeenCalled();
    });
  });

  describe("mouseupEv", () => {
    it("does nothing when mode is not drawing", () => {
      const tool = createBrush();
      tool.mouseupEv({}, null, [10, 10]);
      expect(annotation.history.unfreeze).not.toHaveBeenCalled();
    });
  });

  describe("mousemoveEv", () => {
    it("does nothing when mode is not drawing", () => {
      const tool = createBrush();
      const ev = {
        target: stageContent,
        offsetX: 5,
        offsetY: 5,
      };
      tool.mousemoveEv(ev, null, [5, 5]);
      expect(annotation.createResult).not.toHaveBeenCalled();
    });
  });

  describe("mousedownEv", () => {
    it("returns early when isAllowedInteraction returns false", () => {
      const tool = createBrush();
      const ev = { target: obj.stageRef.content, button: 0, shiftKey: false, offsetX: 0, offsetY: 0 };
      jest.spyOn(tool, "isAllowedInteraction").mockReturnValue(false);
      tool.mousedownEv(ev, null, [0, 0]);
      expect(annotation.history.freeze).not.toHaveBeenCalled();
    });

    it("returns early when multiImage and currentImage differs from brush item_index", () => {
      const mockBrush = {
        type: "brushregion",
        item_index: 1,
        addPoint: jest.fn(),
        beginPath: jest.fn(),
        setDrawing: jest.fn(),
      };
      annotation.highlightedNode = mockBrush;
      obj.multiImage = true;
      obj.currentImage = 2;
      const tool = createBrush();
      const ev = { target: stageContent, button: 0, shiftKey: false, offsetX: 10, offsetY: 10 };
      tool.mousedownEv(ev, null, [10, 10]);
      expect(annotation.history.freeze).not.toHaveBeenCalled();
    });

    it("returns early when findClosestParent does not find stage content", () => {
      const { findClosestParent } = require("../../utils/utilities");
      findClosestParent.mockReturnValueOnce(null);
      const tool = createBrush();
      const ev = {
        target: document.createElement("div"),
        button: 0,
        shiftKey: false,
        offsetX: 10,
        offsetY: 10,
      };
      tool.mousedownEv(ev, null, [10, 10]);
      expect(annotation.history.freeze).not.toHaveBeenCalled();
    });

    it("continues stroke when getSelectedShape is existing brush region", () => {
      const mockBrush = {
        type: "brushregion",
        addPoint: jest.fn(),
        beginPath: jest.fn(),
        setDrawing: jest.fn(),
        endPath: jest.fn(),
      };
      annotation.highlightedNode = mockBrush;
      const tool = createBrush();
      const ev = {
        target: stageContent,
        button: 0,
        shiftKey: false,
        offsetX: 10,
        offsetY: 10,
      };
      tool.mousedownEv(ev, null, [10, 10]);
      expect(annotation.history.freeze).toHaveBeenCalled();
      expect(mockBrush.beginPath).toHaveBeenCalledWith({ type: "add", strokeWidth: 15 });
      expect(mockBrush.addPoint).toHaveBeenCalledWith(10, 10);
    });

    it("starts new drawing when no selected shape and canStartDrawing", () => {
      obj.createDrawingRegion = jest.fn((opts) => {
        const region = {
          beginPath: jest.fn(),
          setDrawing: jest.fn(),
          addPoint: jest.fn(),
        };
        return region;
      });
      annotation.setIsDrawing = jest.fn();
      control.getResultValue = () => ({});
      obj.activeStates = () => [];
      const tool = createBrush();
      const ev = {
        target: stageContent,
        button: 0,
        shiftKey: false,
        offsetX: 10,
        offsetY: 10,
      };
      tool.mousedownEv(ev, null, [10, 10]);
      expect(annotation.history.freeze).toHaveBeenCalled();
      expect(obj.createDrawingRegion).toHaveBeenCalled();
      expect(tool.mode).toBe("drawing");
    });
  });

  describe("commitDrawingRegion", () => {
    it("creates result, clears drawing state, and returns new area", () => {
      const mockCurrentArea = {
        toJSON: () => ({ touches: [], dynamic: false }),
        setDrawing: jest.fn(),
        results: [{ value: { toJSON: () => ({}) } }],
        notifyDrawingFinished: jest.fn(),
      };
      obj.createDrawingRegion = jest.fn(() => mockCurrentArea);
      obj.deleteDrawingRegion = jest.fn();
      obj.activeStates = () => [];
      annotation.setIsDrawing = jest.fn();
      control.getResultValue = () => ({});

      const tool = createBrush();
      tool.createDrawingRegion({ touches: [], coordstype: "px" });

      const result = tool.commitDrawingRegion();

      expect(annotation.createResult).toHaveBeenCalled();
      expect(mockCurrentArea.setDrawing).toHaveBeenCalledWith(false);
      expect(mockNewArea.notifyDrawingFinished).toHaveBeenCalled();
      expect(result).toBe(mockNewArea);
    });
  });

  describe("mouseupEv and mousemoveEv drawing paths", () => {
    it("mouseupEv in drawing mode commits and unfreezes when isFirstBrushStroke", (done) => {
      const mockBrush = {
        beginPath: jest.fn(),
        setDrawing: jest.fn(),
        endPath: jest.fn(),
        addPoint: jest.fn(),
        toJSON: () => ({ touches: [], dynamic: false }),
        results: [{ value: { toJSON: () => ({}) } }],
      };
      obj.createDrawingRegion = jest.fn(() => mockBrush);
      obj.deleteDrawingRegion = jest.fn();
      obj.activeStates = () => [];
      annotation.setIsDrawing = jest.fn();
      control.getResultValue = () => ({});

      const tool = createBrush();
      const ev = { target: stageContent, button: 0, shiftKey: false, offsetX: 10, offsetY: 10 };
      tool.mousedownEv(ev, null, [10, 10]);
      expect(tool.mode).toBe("drawing");

      tool.mouseupEv({}, null, [15, 15]);
      expect(mockBrush.addPoint).toHaveBeenCalledWith(15, 15);
      expect(mockBrush.setDrawing).toHaveBeenCalledWith(false);
      expect(mockBrush.endPath).toHaveBeenCalled();

      setTimeout(() => {
        expect(annotation.createResult).toHaveBeenCalled();
        expect(annotation.history.unfreeze).toHaveBeenCalled();
        expect(obj.annotation.selectArea).toHaveBeenCalledWith(mockNewArea);
        done();
      }, 50);
    });

    it("mouseupEv in drawing mode unfreezes without commit when not isFirstBrushStroke", () => {
      const mockBrush = {
        type: "brushregion",
        addPoint: jest.fn(),
        beginPath: jest.fn(),
        setDrawing: jest.fn(),
        endPath: jest.fn(),
      };
      annotation.highlightedNode = mockBrush;
      const tool = createBrush();
      const ev = { target: stageContent, button: 0, shiftKey: false, offsetX: 10, offsetY: 10 };
      tool.mousedownEv(ev, null, [10, 10]);
      tool.mousedownEv(ev, null, [11, 11]);
      annotation.history.unfreeze.mockClear();
      tool.mouseupEv({}, null, [12, 12]);
      expect(annotation.history.unfreeze).toHaveBeenCalled();
      expect(obj.annotation.setIsDrawing).toHaveBeenCalledWith(false);
    });

    it("mousemoveEv in drawing mode adds point when over stage content", () => {
      const mockBrush = {
        type: "brushregion",
        addPoint: jest.fn(),
        beginPath: jest.fn(),
        setDrawing: jest.fn(),
        endPath: jest.fn(),
      };
      annotation.highlightedNode = mockBrush;
      const tool = createBrush();
      const ev = { target: stageContent, button: 0, shiftKey: false, offsetX: 5, offsetY: 5 };
      tool.mousedownEv(ev, null, [10, 10]);
      mockBrush.addPoint.mockClear();
      tool.mousemoveEv(ev, null, [12, 13]);
      expect(mockBrush.addPoint).toHaveBeenCalledWith(12, 13);
    });

    it("mousemoveEv in drawing mode does not addPoint when findClosestParent returns null", () => {
      const { findClosestParent } = require("../../utils/utilities");
      const mockBrush = {
        type: "brushregion",
        addPoint: jest.fn(),
        beginPath: jest.fn(),
        setDrawing: jest.fn(),
        endPath: jest.fn(),
      };
      annotation.highlightedNode = mockBrush;
      const tool = createBrush();
      const ev = { target: stageContent, button: 0, shiftKey: false, offsetX: 5, offsetY: 5 };
      tool.mousedownEv(ev, null, [10, 10]);
      findClosestParent.mockReturnValueOnce(null);
      mockBrush.addPoint.mockClear();
      tool.mousemoveEv(ev, null, [12, 13]);
      expect(mockBrush.addPoint).not.toHaveBeenCalled();
    });

    it("addPoint floors coordinates", () => {
      const mockBrush = {
        type: "brushregion",
        addPoint: jest.fn(),
        beginPath: jest.fn(),
        setDrawing: jest.fn(),
      };
      annotation.highlightedNode = mockBrush;
      const tool = createBrush();
      const ev = { target: stageContent, button: 0, shiftKey: false, offsetX: 0, offsetY: 0 };
      tool.mousedownEv(ev, null, [10.3, 20.7]);
      expect(mockBrush.addPoint).toHaveBeenCalledWith(10, 20);
    });
  });
});

describe("BrushCursorMixin standalone", () => {
  it("cursorStyleRule uses strokeWidth from model", () => {
    const Model = types.compose(BrushCursorMixin, types.model({ strokeWidth: 12 }));
    const instance = Model.create({ strokeWidth: 12 });
    expect(instance.cursorStyleRule).toBe("url('cursor-12') auto");
  });
});
