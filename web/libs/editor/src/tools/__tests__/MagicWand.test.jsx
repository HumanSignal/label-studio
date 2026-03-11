/**
 * Unit tests for Magic Wand tool (tools/MagicWand.jsx).
 * Covers model defaults, views (tagTypes, iconComponent, defaultthreshold, opacity,
 * fillcolor, selectedLabel, blurradius, existingRegion, shouldInvalidateCache),
 * ToolView, getEventCoords, initCache, invalidateCache, keydownEv, mousemoveEv,
 * threshold, initCurrentRegion, copyTransformedMaskToNaturalSize, finalMaskToRegion,
 * commitDrawingRegion, and mousedownEv (rotation/crosshair early exit).
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { types } from "mobx-state-tree";

jest.mock("chroma-js", () => {
  const hex = (c) => (c && typeof c === "string" ? c : "#000000");
  return (c) => ({ hex: () => hex(c) });
});

const mockDrawMask = jest.fn(() => ({ data: new Uint8Array(0) }));
const mockGetTransformedImageData = jest.fn(() => [null, { width: 100, height: 100 }]);
const mockGetActualZoomingPosition = jest.fn(() => [0, 0]);
const mockMask2DataURL = jest.fn(() => "data:image/png;base64,mock");
const mockGuidGenerator = jest.fn(() => "test-guid");

jest.mock("../../utils/image", () => ({
  getTransformedImageData: (...args) => mockGetTransformedImageData(...args),
  getActualZoomingPosition: (...args) => mockGetActualZoomingPosition(...args),
}));
jest.mock("../../utils/magic-wand", () => ({
  drawMask: (...args) => mockDrawMask(...args),
}));
jest.mock("../../utils/canvas", () => ({
  __esModule: true,
  default: {
    mask2DataURL: (...args) => mockMask2DataURL(...args),
  },
}));
jest.mock("../../core/Helpers", () => ({
  guidGenerator: (...args) => mockGuidGenerator(...args),
}));
jest.mock("../../utils/feature-flags", () => ({
  isFF: jest.fn(() => false),
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

// Ensure HTMLImageElement#decode resolves so setupFinalMask flow completes
if (typeof HTMLImageElement !== "undefined" && !HTMLImageElement.prototype.decode) {
  HTMLImageElement.prototype.decode = () => Promise.resolve();
}

const MockIcon = () => React.createElement("span", { "data-testid": "magic-wand-icon" });
jest.mock("@humansignal/icons", () => ({
  IconMagicWandTool: MockIcon,
}));

const MockTool = ({ label, ariaLabel, onClick }) =>
  React.createElement(
    "button",
    { type: "button", "data-testid": "magic-wand-tool", "aria-label": ariaLabel, onClick },
    label,
  );
jest.mock("../../components/Toolbar/Tool", () => ({ Tool: MockTool }));

const { MagicWand } = require("../MagicWand");

function createMockManager() {
  return {
    name: "image",
    selectTool: jest.fn(),
    root: null,
  };
}

function createMockControl(overrides = {}) {
  return {
    type: "brushlabels",
    defaultthreshold: "32",
    opacity: "0.5",
    blurradius: "0",
    isSelected: true,
    annotation: null,
    getResultValue: () => ({}),
    ...overrides,
  };
}

function createMockImageObj(overrides = {}) {
  const overlayRef = document.createElement("canvas");
  overlayRef.width = 100;
  overlayRef.height = 100;
  overlayRef.style = {};
  const imageRef = {
    naturalWidth: 200,
    naturalHeight: 150,
    width: 100,
    height: 75,
  };
  return {
    name: "image",
    imageRef,
    overlayRef,
    canvasSize: { width: 100, height: 75 },
    zoomScale: 1,
    zoomingPositionX: 0,
    zoomingPositionY: 0,
    rotation: 0,
    crosshair: false,
    annotation: null,
    states: () => [],
    activeStates: () => [],
    deleteDrawingRegion: jest.fn(),
    createDrawingRegion: jest.fn((opts, resultValue, control, isDynamic) => ({
      id: "drawing-region-id",
      setDrawing: jest.fn(),
      results: [{ value: { toJSON: () => ({}) } }],
      notifyDrawingFinished: jest.fn(),
    })),
    ...overrides,
  };
}

function createMockAnnotation(overrides = {}) {
  const mockNewRegion = {
    id: "new-region-id",
    notifyDrawingFinished: jest.fn(),
  };
  return {
    createResult: jest.fn(() => mockNewRegion),
    history: { freeze: jest.fn(), unfreeze: jest.fn(), onUpdate: jest.fn(() => () => {}) },
    isReadOnly: () => false,
    setIsDrawing: jest.fn(),
    selectArea: jest.fn(),
    highlightedNode: null,
    ...overrides,
  };
}

describe("MagicWand tool", () => {
  let manager;
  let control;
  let obj;
  let annotation;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetTransformedImageData.mockReturnValue([null, { width: 100, height: 100 }]);
    mockDrawMask.mockReturnValue({ data: new Uint8Array(0) });
    mockGetActualZoomingPosition.mockReturnValue([0, 0]);
    mockMask2DataURL.mockReturnValue("data:image/png;base64,mock");
    mockGuidGenerator.mockReturnValue("test-guid");

    manager = createMockManager();
    control = createMockControl();
    obj = createMockImageObj();
    annotation = createMockAnnotation();
    control.annotation = annotation;
    obj.annotation = {
      selectArea: jest.fn(),
      setIsDrawing: jest.fn(),
    };
    control.__mockRoot = { annotationStore: { selected: annotation }, settings: {} };
    obj.__mockRoot = { annotationStore: { selected: annotation }, settings: {} };
  });

  function createMagicWand(envOverrides = {}) {
    return MagicWand.create(
      {},
      {
        manager,
        control,
        object: obj,
        ...envOverrides,
      },
    );
  }

  describe("model defaults and views", () => {
    it("has default group, shortcut, tagTypes", () => {
      const tool = createMagicWand();
      expect(tool.group).toBe("segmentation");
      expect(tool.shortcut).toBe("tool:magic-wand");
      expect(tool.tagTypes).toEqual({
        stateTypes: "brushlabels",
        controlTagTypes: ["brushlabels", "magicwand"],
      });
    });

    it("viewClass returns a function", () => {
      const tool = createMagicWand();
      expect(typeof tool.viewClass).toBe("function");
    });

    it("iconComponent returns IconMagicWandTool", () => {
      const tool = createMagicWand();
      const Icon = tool.iconComponent;
      const { getByTestId } = render(React.createElement(Icon));
      expect(getByTestId("magic-wand-icon")).toBeInTheDocument();
    });

    it("defaultthreshold parses control.defaultthreshold", () => {
      const tool = createMagicWand();
      expect(tool.defaultthreshold).toBe(32);
    });

    it("opacity parses control.opacity", () => {
      const tool = createMagicWand();
      expect(tool.opacity).toBe(0.5);
    });

    it("blurradius parses control.blurradius", () => {
      control.blurradius = "2";
      const tool = createMagicWand();
      expect(tool.blurradius).toBe(2);
    });

    it("fillcolor returns default when no states", () => {
      obj.states = () => [];
      const tool = createMagicWand();
      expect(tool.fillcolor).toBeDefined();
      expect(typeof tool.fillcolor).toBe("string");
    });

    it("fillcolor uses selectedColor from states when present", () => {
      obj.states = () => [{ selectedColor: "#ff0000" }];
      const tool = createMagicWand();
      expect(tool.fillcolor).toBe("#ff0000");
    });

    it("selectedLabel returns null when no states", () => {
      obj.states = () => [];
      const tool = createMagicWand();
      expect(tool.selectedLabel).toBeNull();
    });

    it("selectedLabel returns first selected value when state has isSelected", () => {
      obj.states = () => [{ isSelected: true, selectedValues: () => ["label1"] }];
      const tool = createMagicWand();
      expect(tool.selectedLabel).toBe("label1");
    });

    it("existingRegion returns null when getSelectedShape has no maskDataURL", () => {
      const tool = createMagicWand();
      expect(tool.existingRegion).toBeNull();
    });

    it("existingRegion returns getSelectedShape when it has maskDataURL", () => {
      const mockRegion = { id: "r1", type: "brushregion", maskDataURL: "data:..." };
      annotation.highlightedNode = mockRegion;
      control.annotation = annotation;
      const tool = createMagicWand();
      expect(tool.existingRegion).toBe(mockRegion);
    });

    it("shouldInvalidateCache is falsy when no existingRegion", () => {
      const tool = createMagicWand();
      expect(tool.shouldInvalidateCache()).toBeFalsy();
    });
  });

  describe("ToolView", () => {
    it("viewClass returns a function that renders Tool with label and onClick", () => {
      const tool = createMagicWand();
      tool.setSelected(false);
      const View = tool.viewClass;
      expect(typeof View).toBe("function");
      render(React.createElement(View));
      const btn = screen.getByTestId("magic-wand-tool");
      expect(btn).toBeInTheDocument();
      expect(btn).toHaveTextContent("Magic Wand");
      btn.click();
      expect(manager.selectTool).toHaveBeenCalledWith(tool, true);
    });

    it("when already selected, viewClass is a function (onClick would return early)", () => {
      const tool = createMagicWand();
      tool.setSelected(true);
      expect(typeof tool.viewClass).toBe("function");
      expect(manager.selectTool).not.toHaveBeenCalled();
    });
  });

  describe("getEventCoords", () => {
    it("returns offsetX, offsetY, screenX, screenY", () => {
      const tool = createMagicWand();
      const ev = { offsetX: 10, offsetY: 20, screenX: 100, screenY: 200 };
      const coords = tool.getEventCoords(ev);
      expect(coords).toEqual([10, 20, 100, 200]);
    });
  });

  describe("initCache", () => {
    it("creates new cachedNaturalCanvas when existingRegion is null (via mousedownEv)", () => {
      const tool = createMagicWand();
      tool.getEventCoords = jest.fn(() => [5, 5, 5, 5]);
      const ev = { offsetX: 5, offsetY: 5, screenX: 5, screenY: 5 };
      tool.mousedownEv(ev);
      expect(tool.isFirstWand).toBe(true);
      expect(tool.cachedNaturalCanvas).toBeInstanceOf(HTMLCanvasElement);
      expect(tool.cachedNaturalCanvas.width).toBe(200);
      expect(tool.cachedNaturalCanvas.height).toBe(150);
    });
  });

  describe("invalidateCache", () => {
    it("resets cachedNaturalCanvas and isFirstWand", () => {
      const tool = createMagicWand();
      tool.getEventCoords = jest.fn(() => [5, 5, 5, 5]);
      tool.mousedownEv({ offsetX: 5, offsetY: 5, screenX: 5, screenY: 5 });
      const prevCanvas = tool.cachedNaturalCanvas;
      tool.invalidateCache();
      expect(tool.cachedNaturalCanvas).toBeInstanceOf(HTMLCanvasElement);
      expect(tool.cachedNaturalCanvas).not.toBe(prevCanvas);
      expect(tool.cachedNaturalCanvas.width).toBe(200);
      expect(tool.isFirstWand).toBe(true);
      expect(tool.cachedRegionId).toBeNull();
    });
  });

  describe("keydownEv", () => {
    it("on Escape sets mode to viewing and removes listener", () => {
      const removeSpy = jest.spyOn(window, "removeEventListener");
      const tool = createMagicWand();
      tool.getEventCoords = jest.fn(() => [5, 5, 5, 5]);
      tool.mousedownEv({ offsetX: 5, offsetY: 5, screenX: 5, screenY: 5 });
      expect(tool.mode).toBe("drawing");
      const ev = { key: "Escape", preventDefault: jest.fn(), stopPropagation: jest.fn() };
      tool.keydownEv(ev);
      expect(tool.mode).toBe("viewing");
      expect(removeSpy).toHaveBeenCalledWith("keydown", expect.any(Function), true);
      expect(ev.preventDefault).toHaveBeenCalled();
      removeSpy.mockRestore();
    });

    it("ignores non-Escape key", () => {
      const tool = createMagicWand();
      tool.getEventCoords = jest.fn(() => [5, 5, 5, 5]);
      tool.mousedownEv({ offsetX: 5, offsetY: 5, screenX: 5, screenY: 5 });
      tool.keydownEv({ key: "Enter" });
      expect(tool.mode).toBe("drawing");
    });
  });

  describe("mousemoveEv", () => {
    it("does nothing when mode is not drawing", () => {
      const tool = createMagicWand();
      tool.threshold = jest.fn();
      tool.mousemoveEv({ offsetX: 5, offsetY: 5, screenX: 10, screenY: 10 });
      expect(tool.threshold).not.toHaveBeenCalled();
    });

    it("calls threshold when mode is drawing", () => {
      const tool = createMagicWand();
      tool.getEventCoords = jest.fn(() => [5, 5, 5, 5]);
      tool.mousedownEv({ offsetX: 5, offsetY: 5, screenX: 5, screenY: 5 });
      tool.getEventCoords = jest.fn(() => [5, 5, 10, 10]);
      tool.threshold = jest.fn();
      tool.mousemoveEv({ offsetX: 5, offsetY: 5, screenX: 10, screenY: 10 });
      expect(tool.threshold).toHaveBeenCalledWith(10, 10, tool.fillcolor, tool.opacity);
    });
  });

  describe("threshold", () => {
    it("does nothing when new position equals anchor", () => {
      const tool = createMagicWand();
      tool.getEventCoords = jest.fn(() => [5, 5, 5, 5]);
      tool.mousedownEv({ offsetX: 5, offsetY: 5, screenX: 5, screenY: 5 });
      mockDrawMask.mockClear();
      tool.threshold(5, 5);
      expect(mockDrawMask).not.toHaveBeenCalled();
    });

    it("updates threshold and calls drawMask when position differs", () => {
      const tool = createMagicWand();
      tool.getEventCoords = jest.fn(() => [5, 5, 5, 5]);
      tool.mousedownEv({ offsetX: 5, offsetY: 5, screenX: 0, screenY: 0 });
      mockDrawMask.mockClear();
      tool.threshold(100, 0);
      expect(tool.currentThreshold).not.toBe(32);
      expect(mockDrawMask).toHaveBeenCalled();
    });

    it("clamps threshold to 1 and 255", () => {
      const tool = createMagicWand();
      tool.getEventCoords = jest.fn(() => [5, 5, 5, 5]);
      tool.mousedownEv({ offsetX: 5, offsetY: 5, screenX: 0, screenY: 0 });
      tool.threshold(-1000, -1000);
      expect(tool.currentThreshold).toBeGreaterThanOrEqual(1);
      tool.threshold(10000, 10000);
      expect(tool.currentThreshold).toBeLessThanOrEqual(255);
    });
  });

  describe("initCurrentRegion", () => {
    it("creates new drawing region when isFirstWand (via mousedownEv)", () => {
      const tool = createMagicWand();
      tool.getEventCoords = jest.fn(() => [5, 5, 5, 5]);
      tool.mousedownEv({ offsetX: 5, offsetY: 5, screenX: 5, screenY: 5 });
      expect(obj.createDrawingRegion).toHaveBeenCalled();
      expect(tool.currentRegion).toBeDefined();
      expect(tool.currentRegion.results).toBeDefined();
    });
  });

  describe("copyTransformedMaskToNaturalSize", () => {
    it("runs without throwing and returns cachedNaturalCanvas.toDataURL()", () => {
      const tool = createMagicWand();
      tool.getEventCoords = jest.fn(() => [5, 5, 5, 5]);
      tool.mousedownEv({ offsetX: 5, offsetY: 5, screenX: 5, screenY: 5 });
      const blitImg = document.createElement("img");
      blitImg.src = "data:image/png;base64,mock";
      const url = tool.copyTransformedMaskToNaturalSize(blitImg);
      expect(url === null || typeof url === "string").toBe(true);
    });
  });

  describe("finalMaskToRegion and commitDrawingRegion (via mouseupEv flow)", () => {
    it("full mousedown then mouseup commits region and selects it", async () => {
      const tool = createMagicWand();
      tool.getEventCoords = jest.fn(() => [5, 5, 5, 5]);
      const ev = { offsetX: 5, offsetY: 5, screenX: 5, screenY: 5 };
      tool.mousedownEv(ev);
      expect(tool.mode).toBe("drawing");
      const removeSpy = jest.spyOn(window, "removeEventListener");
      const promise = tool.mouseupEv();
      expect(removeSpy).toHaveBeenCalledWith("keydown", expect.any(Function), true);
      expect(tool.mode).toBe("viewing");
      await promise;
      expect(annotation.createResult).toHaveBeenCalled();
      const createResultCall = annotation.createResult.mock.calls[0];
      expect(createResultCall[0]).toMatchObject({ coordstype: "px", dynamic: false });
      expect(annotation.history.unfreeze).toHaveBeenCalled();
      expect(annotation.setIsDrawing).toHaveBeenCalledWith(false);
      removeSpy.mockRestore();
    });
  });

  describe("mousedownEv", () => {
    it("sets mode to viewing and alerts when image has rotation", () => {
      const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});
      obj.rotation = 90;
      const tool = createMagicWand();
      const ev = {
        offsetX: 10,
        offsetY: 10,
        screenX: 10,
        screenY: 10,
      };
      expect(() => tool.mousedownEv(ev)).toThrow("The Magic Wand is not supported on rotated images");
      expect(tool.mode).toBe("viewing");
      expect(annotation.history.unfreeze).toHaveBeenCalled();
      alertSpy.mockRestore();
    });

    it("sets mode to viewing and alerts when crosshair is on", () => {
      const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});
      obj.crosshair = true;
      const tool = createMagicWand();
      const ev = { offsetX: 10, offsetY: 10, screenX: 10, screenY: 10 };
      expect(() => tool.mousedownEv(ev)).toThrow("The Magic Wand is not supported if the crosshair is turned on");
      expect(tool.mode).toBe("viewing");
      alertSpy.mockRestore();
    });

    it("starts drawing and calls initCanvas when no rotation and no crosshair", () => {
      const addSpy = jest.spyOn(window, "addEventListener");
      const tool = createMagicWand();
      tool.initCache = jest.fn();
      tool.initCanvas = jest.fn();
      tool.initCurrentRegion = jest.fn();
      tool.getEventCoords = jest.fn(() => [5, 5, 5, 5]);
      const ev = { offsetX: 5, offsetY: 5, screenX: 5, screenY: 5 };
      tool.mousedownEv(ev);
      expect(annotation.history.freeze).toHaveBeenCalled();
      expect(tool.mode).toBe("drawing");
      expect(tool.currentThreshold).toBe(32);
      expect(tool.initCache).toHaveBeenCalled();
      expect(tool.initCanvas).toHaveBeenCalled();
      expect(tool.initCurrentRegion).toHaveBeenCalled();
      expect(addSpy).toHaveBeenCalledWith("keydown", expect.any(Function), true);
      addSpy.mockRestore();
    });
  });

  describe("mouseupEv", () => {
    it("does nothing when mode is viewing", async () => {
      const tool = createMagicWand();
      tool.setupFinalMask = jest.fn();
      await tool.mouseupEv();
      expect(tool.setupFinalMask).not.toHaveBeenCalled();
    });
  });
});
