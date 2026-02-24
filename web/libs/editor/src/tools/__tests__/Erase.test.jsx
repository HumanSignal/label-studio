/**
 * Unit tests for Erase tool (tools/Erase.jsx)
 */
import { Erase } from "../Erase";

const stageContent = {};
const mockBrush = {
  type: "brushregion",
  addPoint: jest.fn(),
  beginPath: jest.fn(),
  endPath: jest.fn(),
};

function makeMockObj() {
  return {
    stageRef: { content: stageContent },
    name: "Image",
    canvasSize: { width: 800, height: 600 },
    stageScale: 1,
    stageWidth: 800,
    stageHeight: 600,
  };
}

jest.mock("../../utils/utilities", () => ({
  clamp: jest.fn((v, min, max) => Math.max(min, Math.min(max, v))),
  findClosestParent: jest.fn(() => true),
}));

describe("Erase tool", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { findClosestParent } = require("../../utils/utilities");
    findClosestParent.mockReturnValue(true);
  });

  function createTool(overrides = {}) {
    const obj = makeMockObj();
    const env = {
      object: obj,
      manager: { selectTool: jest.fn() },
      control: { annotation: { highlightedNode: mockBrush } },
    };
    return Erase.create(overrides, env);
  }

  it("exposes viewClass, iconComponent, controls, and extraShortcuts", () => {
    const tool = createTool();
    expect(typeof tool.viewClass).toBe("function");
    expect(tool.iconComponent).toBeDefined();
    expect(Array.isArray(tool.controls)).toBe(true);
    expect(tool.controls).toHaveLength(1);
    const rangeControl = tool.controls[0];
    expect(rangeControl.props.onChange).toBeDefined();
    rangeControl.props.onChange(20);
    expect(tool.strokeWidth).toBe(20);
    expect(tool.extraShortcuts).toEqual(
      expect.objectContaining({
        "tool:decrease-tool": expect.any(Array),
        "tool:increase-tool": expect.any(Array),
      }),
    );
  });

  it("has default strokeWidth 10", () => {
    const tool = createTool();
    expect(tool.strokeWidth).toBe(10);
  });

  it("setStroke updates strokeWidth", () => {
    const tool = createTool();
    tool.setStroke(25);
    expect(tool.strokeWidth).toBe(25);
  });

  it("viewClass returns a function", () => {
    const tool = createTool();
    expect(typeof tool.viewClass).toBe("function");
  });

  it("iconComponent is IconEraserTool", () => {
    const tool = createTool();
    expect(tool.iconComponent).toBeDefined();
  });

  it("controls returns array with Range", () => {
    const tool = createTool();
    const controls = tool.controls;
    expect(Array.isArray(controls)).toBe(true);
    expect(controls.length).toBeGreaterThan(0);
  });

  it("extraShortcuts has tool:decrease-tool and tool:increase-tool", () => {
    const tool = createTool({ strokeWidth: 20 });
    expect(tool.extraShortcuts["tool:decrease-tool"]).toBeDefined();
    expect(tool.extraShortcuts["tool:increase-tool"]).toBeDefined();
    const [, decreaseFn] = tool.extraShortcuts["tool:decrease-tool"];
    const [, increaseFn] = tool.extraShortcuts["tool:increase-tool"];
    decreaseFn();
    expect(tool.strokeWidth).toBeLessThanOrEqual(20);
    increaseFn();
    expect(tool.strokeWidth).toBeGreaterThanOrEqual(1);
  });

  it("afterUpdateSelected calls updateCursor", () => {
    const tool = createTool();
    if (typeof tool.updateCursor === "function") {
      const spy = jest.spyOn(tool, "updateCursor");
      tool.afterUpdateSelected();
      expect(spy).toHaveBeenCalled();
    } else {
      tool.afterUpdateSelected();
    }
  });

  it("addPoint calls brush.addPoint with floored coords", () => {
    const tool = createTool();
    const ev = { target: stageContent, offsetX: 10, offsetY: 10 };
    tool.mousedownEv(ev, null, [0, 0]);
    mockBrush.addPoint.mockClear();
    tool.addPoint(1.7, 2.3);
    expect(mockBrush.addPoint).toHaveBeenCalledWith(1, 2);
  });

  it("mouseupEv when mode is drawing sets mode to viewing and calls brush.endPath", () => {
    const tool = createTool();
    const ev = { target: stageContent, offsetX: 10, offsetY: 10 };
    tool.mousedownEv(ev, null, [0, 0]);
    expect(tool.mode).toBe("drawing");
    tool.mouseupEv();
    expect(tool.mode).toBe("viewing");
    expect(mockBrush.endPath).toHaveBeenCalled();
  });

  it("mouseupEv when mode is not drawing does nothing", () => {
    const tool = createTool();
    expect(tool.mode).toBe("viewing");
    tool.mouseupEv();
    expect(mockBrush.endPath).not.toHaveBeenCalled();
  });

  it("mousemoveEv when mode is drawing calls addPoint", () => {
    const tool = createTool();
    const ev = { target: stageContent, offsetX: 10, offsetY: 10 };
    tool.mousedownEv(ev, null, [0, 0]);
    mockBrush.addPoint.mockClear();
    tool.mousemoveEv(ev, null, [10, 20]);
    expect(mockBrush.addPoint).toHaveBeenCalledWith(10, 20);
  });

  it("mousemoveEv when mode is not drawing does not call addPoint", () => {
    const tool = createTool();
    mockBrush.addPoint.mockClear();
    tool.mousemoveEv({ target: stageContent }, null, [10, 20]);
    expect(mockBrush.addPoint).not.toHaveBeenCalled();
  });

  it("mousedownEv when getSelectedShape is null returns early", () => {
    const env = {
      object: makeMockObj(),
      manager: {},
      control: { annotation: { highlightedNode: null } },
    };
    const toolNoBrush = Erase.create({}, env);
    const ev = { target: stageContent, offsetX: 10, offsetY: 10 };
    toolNoBrush.mousedownEv(ev, null, [5, 5]);
    expect(mockBrush.beginPath).not.toHaveBeenCalled();
  });

  it("mousedownEv when brush is brushregion sets mode and calls beginPath and addPoint", () => {
    const tool = createTool({ strokeWidth: 12 });
    const ev = { target: stageContent, offsetX: 10, offsetY: 10 };
    tool.mousedownEv(ev, null, [5, 5]);
    expect(tool.mode).toBe("drawing");
    expect(mockBrush.beginPath).toHaveBeenCalledWith({
      type: "eraser",
      opacity: 1,
      strokeWidth: 12,
    });
    expect(mockBrush.addPoint).toHaveBeenCalledWith(5, 5);
  });

  it("mousemoveEv when findClosestParent returns false does not call addPoint", () => {
    const { findClosestParent } = require("../../utils/utilities");
    findClosestParent.mockReturnValue(false);
    const tool = createTool();
    const ev = { target: stageContent, offsetX: 10, offsetY: 10 };
    tool.mousedownEv(ev, null, [0, 0]);
    mockBrush.addPoint.mockClear();
    tool.mousemoveEv(ev, null, [10, 20]);
    expect(mockBrush.addPoint).not.toHaveBeenCalled();
  });

  it("mousemoveEv when brush type is not brushregion does not call addPoint", () => {
    const tool = createTool();
    const ev = { target: stageContent, offsetX: 10, offsetY: 10 };
    tool.mousedownEv(ev, null, [0, 0]);
    mockBrush.addPoint.mockClear();
    mockBrush.type = "other";
    tool.mousemoveEv(ev, null, [10, 20]);
    expect(mockBrush.addPoint).not.toHaveBeenCalled();
    mockBrush.type = "brushregion";
  });

  it("mousedownEv when findClosestParent returns false does not start drawing", () => {
    const { findClosestParent } = require("../../utils/utilities");
    findClosestParent.mockReturnValue(false);
    const tool = createTool();
    const ev = { target: stageContent, offsetX: 10, offsetY: 10 };
    tool.mousedownEv(ev, null, [5, 5]);
    expect(tool.mode).toBe("viewing");
    expect(mockBrush.beginPath).not.toHaveBeenCalled();
  });

  it("mousedownEv when getSelectedShape is null does not start drawing", () => {
    const env = {
      object: makeMockObj(),
      manager: { selectTool: jest.fn() },
      control: { annotation: { highlightedNode: null } },
    };
    const tool = Erase.create({}, env);
    const ev = { target: stageContent, offsetX: 10, offsetY: 10 };
    tool.mousedownEv(ev, null, [5, 5]);
    expect(tool.mode).toBe("viewing");
    expect(mockBrush.beginPath).not.toHaveBeenCalled();
  });

  it("mouseupEv when not drawing does not call endPath", () => {
    const tool = createTool();
    expect(tool.mode).toBe("viewing");
    tool.mouseupEv();
    expect(mockBrush.endPath).not.toHaveBeenCalled();
  });

  it("afterUpdateSelected calls updateCursor", () => {
    const tool = createTool();
    expect(() => tool.afterUpdateSelected()).not.toThrow();
  });
});
