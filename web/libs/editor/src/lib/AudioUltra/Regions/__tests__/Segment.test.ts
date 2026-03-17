/**
 * Unit tests for Segment (lib/AudioUltra/Regions/Segment.ts)
 */
import { Segment } from "../Segment";

function createMockLayer() {
  return {
    fillStyle: "",
    fillRect: jest.fn(),
    isVisible: true,
  };
}

function createMockVisualizer(overrides = {}) {
  const layer = createMockLayer();
  const timelineLayer = { isVisible: true };
  return {
    width: 800,
    height: 100,
    zoomedWidth: 800,
    timelineHeight: 20,
    timelinePlacement: "top" as const,
    getScrollLeft: () => 0,
    getScrollLeftPx: () => 0,
    getLayer: jest.fn((name: string) => (name === "timeline" ? timelineLayer : null)),
    createLayer: jest.fn(() => layer),
    container: document.createElement("div"),
    ...overrides,
  };
}

function createMockWaveform(overrides = {}) {
  return {
    duration: 10,
    zoom: 1,
    cursor: { set: jest.fn() },
    player: { pause: jest.fn() },
    invoke: jest.fn(),
    scrollToRegion: jest.fn(),
    playing: false,
    ...overrides,
  };
}

function createMockController(overrides = {}) {
  const layerGroup = { isVisible: true };
  return {
    bringRegionToFront: jest.fn(),
    isHovered: jest.fn(() => false),
    layerGroup,
    isOverrideKeyPressed: jest.fn(() => false),
    get isLocked() {
      return false;
    },
    convertToRegion: jest.fn(),
    convertToSegment: jest.fn(),
    ...overrides,
  };
}

describe("Segment", () => {
  describe("constructor", () => {
    it("throws when options.start is negative", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const controller = createMockController();
      expect(() => new Segment({ start: -1, end: 5 }, waveform as any, visualizer as any, controller as any)).toThrow(
        "Segment start must be greater than 0",
      );
    });

    it("throws when options.end is negative", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const controller = createMockController();
      expect(() => new Segment({ start: 0, end: -1 }, waveform as any, visualizer as any, controller as any)).toThrow(
        "Segment end must be greater than 0",
      );
    });

    it("initializes with default options", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const controller = createMockController();
      const segment = new Segment({ start: 1, end: 5 }, waveform as any, visualizer as any, controller as any);
      expect(segment.start).toBe(1);
      expect(segment.end).toBe(5);
      expect(segment.selected).toBe(false);
      expect(segment.updateable).toBe(true);
      expect(segment.locked).toBe(false);
      expect(segment.deleteable).toBe(true);
      expect(segment.visible).toBe(true);
      expect(segment.showInTimeline).toBe(false);
      expect(segment.external).toBe(false);
      expect(segment.id).toBeDefined();
      expect(segment.id.length).toBeGreaterThan(0);
    });

    it("uses provided options", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const controller = createMockController();
      const segment = new Segment(
        {
          id: "seg-1",
          start: 2,
          end: 8,
          selected: true,
          updateable: false,
          locked: true,
          deleteable: false,
          visible: false,
          showInTimeline: true,
          external: true,
        },
        waveform as any,
        visualizer as any,
        controller as any,
      );
      expect(segment.id).toBe("seg-1");
      expect(segment.start).toBe(2);
      expect(segment.end).toBe(8);
      expect(segment.selected).toBe(true);
      expect(segment.updateable).toBe(false);
      expect(segment.locked).toBe(true);
      // deleteable is not set in constructor, only via update()
      expect(segment.visible).toBe(false);
      expect(segment.showInTimeline).toBe(true);
      expect(segment.external).toBe(true);
    });
  });

  describe("isRegion", () => {
    it("returns false", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const controller = createMockController();
      const segment = new Segment({ start: 1, end: 5 }, waveform as any, visualizer as any, controller as any);
      expect(segment.isRegion).toBe(false);
    });
  });

  describe("update", () => {
    it("updates segment properties", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const controller = createMockController();
      const segment = new Segment({ start: 1, end: 5 }, waveform as any, visualizer as any, controller as any);
      segment.update({
        start: 2,
        end: 6,
        selected: true,
        visible: false,
        locked: true,
        updateable: false,
        deleteable: false,
        showInTimeline: true,
        external: true,
        color: "#ff0000",
      });
      expect(segment.start).toBe(2);
      expect(segment.end).toBe(6);
      expect(segment.selected).toBe(true);
      expect(segment.visible).toBe(false);
      expect(segment.locked).toBe(true);
      expect(segment.updateable).toBe(false);
      expect(segment.deleteable).toBe(false);
      expect(segment.showInTimeline).toBe(true);
      expect(segment.external).toBe(true);
    });

    it("does not apply update when updateable is false and only updateable is set to false", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const controller = createMockController();
      const segment = new Segment(
        { start: 1, end: 5, updateable: false },
        waveform as any,
        visualizer as any,
        controller as any,
      );
      segment.update({ updateable: false });
      expect(segment.updateable).toBe(false);
    });
  });

  describe("setVisibility", () => {
    it("updates visible and invokes update and regionUpdated", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const controller = createMockController();
      const segment = new Segment({ start: 1, end: 5 }, waveform as any, visualizer as any, controller as any);
      segment.setVisibility(false);
      expect(segment.visible).toBe(false);
      expect(waveform.invoke).toHaveBeenCalledWith("regionUpdated", [segment]);
    });

    it("does nothing when visible is unchanged", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const controller = createMockController();
      const segment = new Segment({ start: 1, end: 5 }, waveform as any, visualizer as any, controller as any);
      const invokeSpy = waveform.invoke as jest.Mock;
      invokeSpy.mockClear();
      segment.setVisibility(true);
      expect(invokeSpy).not.toHaveBeenCalled();
    });
  });

  describe("bringToFront", () => {
    it("calls controller.bringRegionToFront with segment id", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const controller = createMockController();
      const segment = new Segment(
        { id: "my-seg", start: 1, end: 5 },
        waveform as any,
        visualizer as any,
        controller as any,
      );
      segment.bringToFront();
      expect(controller.bringRegionToFront).toHaveBeenCalledWith("my-seg");
    });
  });

  describe("getters", () => {
    it("options returns current options", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const controller = createMockController();
      const segment = new Segment(
        { id: "x", start: 1, end: 5, selected: true },
        waveform as any,
        visualizer as any,
        controller as any,
      );
      const opts = segment.options;
      expect(opts).toEqual(
        expect.objectContaining({
          start: 1,
          end: 5,
          id: "x",
          selected: true,
          updateable: true,
          locked: false,
          deleteable: true,
          visible: true,
        }),
      );
    });

    it("width is derived from start, end, duration and zoom", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const controller = createMockController();
      const segment = new Segment({ start: 2, end: 6 }, waveform as any, visualizer as any, controller as any);
      expect(segment.width).toBeGreaterThan(0);
      expect(segment.xEnd).toBe(segment.xStart + segment.width);
    });

    it("timelineHeight and timelinePlacement use defaults when visualizer has none", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const controller = createMockController();
      const segment = new Segment({ start: 1, end: 5 }, waveform as any, visualizer as any, controller as any);
      expect(segment.timelineHeight).toBe(20);
      expect(segment.timelinePlacement).toBe("top");
    });
  });

  describe("render", () => {
    it("does not draw when not visible", () => {
      const visualizer = createMockVisualizer();
      const layer = createMockLayer();
      (visualizer as any).createLayer = () => layer;
      const waveform = createMockWaveform();
      const controller = createMockController();
      const segment = new Segment(
        { start: 1, end: 5, visible: false },
        waveform as any,
        visualizer as any,
        controller as any,
      );
      segment.render();
      expect(layer.fillRect).not.toHaveBeenCalled();
    });

    it("draws when visible and in viewport", () => {
      const visualizer = createMockVisualizer();
      const layer = createMockLayer();
      (visualizer as any).createLayer = () => layer;
      const waveform = createMockWaveform();
      const controller = createMockController();
      (controller as any).layerGroup = layer;
      const segment = new Segment({ start: 1, end: 5 }, waveform as any, visualizer as any, controller as any);
      segment.render();
      expect(layer.fillRect).toHaveBeenCalled();
    });
  });

  describe("handleUpdateEnd", () => {
    it("invokes updateEnd and waveform regionUpdatedEnd", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const controller = createMockController();
      const segment = new Segment({ start: 1, end: 5 }, waveform as any, visualizer as any, controller as any);
      segment.handleUpdateEnd();
      expect(waveform.invoke).toHaveBeenCalledWith("regionUpdatedEnd", [segment]);
    });
  });

  describe("handleSelected", () => {
    it("toggles selected and invokes update and regionUpdated", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const controller = createMockController();
      const segment = new Segment({ start: 1, end: 5 }, waveform as any, visualizer as any, controller as any);
      segment.handleSelected(true);
      expect(segment.selected).toBe(true);
      expect(waveform.invoke).toHaveBeenCalledWith("regionUpdated", [segment]);
    });

    it("pauses waveform when playing", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      (waveform as any).playing = true;
      const controller = createMockController();
      const segment = new Segment({ start: 1, end: 5 }, waveform as any, visualizer as any, controller as any);
      segment.handleSelected();
      expect(waveform.player.pause).toHaveBeenCalled();
    });
  });

  describe("handleHighlighted", () => {
    it("toggles highlighted and invokes update and regionUpdated", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const controller = createMockController();
      const segment = new Segment({ start: 1, end: 5 }, waveform as any, visualizer as any, controller as any);
      segment.handleHighlighted(true);
      expect(segment.highlighted).toBe(true);
      expect(waveform.invoke).toHaveBeenCalledWith("regionUpdated", [segment]);
    });
  });

  describe("setColor", () => {
    it("updates color", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const controller = createMockController();
      const segment = new Segment({ start: 1, end: 5 }, waveform as any, visualizer as any, controller as any);
      segment.setColor("#ff0000");
      expect(segment.color).toBeDefined();
    });
  });

  describe("setLocked", () => {
    it("sets locked and invokes update and regionUpdated", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const controller = createMockController();
      const segment = new Segment({ start: 1, end: 5 }, waveform as any, visualizer as any, controller as any);
      segment.setLocked(true);
      expect(segment.locked).toBe(true);
      expect(waveform.invoke).toHaveBeenCalledWith("regionUpdated", [segment]);
    });
  });

  describe("updateColor", () => {
    it("updates color and invokes when updateable", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const controller = createMockController();
      const segment = new Segment({ start: 1, end: 5 }, waveform as any, visualizer as any, controller as any);
      segment.updateColor("#00ff00");
      expect(waveform.invoke).toHaveBeenCalledWith("regionUpdated", [segment]);
    });

    it("does nothing when not updateable", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const controller = createMockController();
      const segment = new Segment(
        { start: 1, end: 5, updateable: false },
        waveform as any,
        visualizer as any,
        controller as any,
      );
      const invokeSpy = waveform.invoke as jest.Mock;
      invokeSpy.mockClear();
      segment.updateColor("#00ff00");
      expect(invokeSpy).not.toHaveBeenCalled();
    });
  });

  describe("updatePosition", () => {
    it("updates start and end and invokes", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const controller = createMockController();
      const segment = new Segment({ start: 1, end: 5 }, waveform as any, visualizer as any, controller as any);
      segment.updatePosition(2, 7);
      expect(segment.start).toBe(2);
      expect(segment.end).toBe(7);
      expect(waveform.invoke).toHaveBeenCalledWith("regionUpdated", [segment]);
    });

    it("uses current start/end when called with undefined", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const controller = createMockController();
      const segment = new Segment({ start: 2, end: 6 }, waveform as any, visualizer as any, controller as any);
      segment.updatePosition(3, undefined);
      expect(segment.start).toBe(3);
      expect(segment.end).toBe(6);
      segment.updatePosition(undefined, 8);
      expect(segment.start).toBe(3);
      expect(segment.end).toBe(8);
    });

    it("swaps start and end when start > end", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const controller = createMockController();
      const segment = new Segment({ start: 1, end: 5 }, waveform as any, visualizer as any, controller as any);
      segment.updatePosition(6, 3);
      expect(segment.start).toBe(3);
      expect(segment.end).toBe(6);
    });

    it("does nothing when not updateable", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const controller = createMockController();
      const segment = new Segment(
        { start: 1, end: 5, updateable: false },
        waveform as any,
        visualizer as any,
        controller as any,
      );
      const invokeSpy = waveform.invoke as jest.Mock;
      invokeSpy.mockClear();
      segment.updatePosition(2, 7);
      expect(segment.start).toBe(1);
      expect(segment.end).toBe(5);
      expect(invokeSpy).not.toHaveBeenCalled();
    });
  });

  describe("scrollToRegion", () => {
    it("calls waveform.scrollToRegion with start", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const controller = createMockController();
      const segment = new Segment({ start: 3, end: 7 }, waveform as any, visualizer as any, controller as any);
      segment.scrollToRegion();
      expect(waveform.scrollToRegion).toHaveBeenCalledWith(3);
    });
  });

  describe("convertToRegion", () => {
    it("calls controller.convertToRegion when updateable", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const controller = createMockController();
      const segment = new Segment(
        { id: "s1", start: 1, end: 5 },
        waveform as any,
        visualizer as any,
        controller as any,
      );
      segment.convertToRegion(["label1"], true);
      expect(controller.convertToRegion).toHaveBeenCalledWith("s1", ["label1"], true);
    });

    it("returns undefined when not updateable", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const controller = createMockController();
      const segment = new Segment(
        { start: 1, end: 5, updateable: false },
        waveform as any,
        visualizer as any,
        controller as any,
      );
      const result = segment.convertToRegion(["label1"]);
      expect(result).toBeUndefined();
      expect(controller.convertToRegion).not.toHaveBeenCalled();
    });
  });

  describe("convertToSegment", () => {
    it("calls controller.convertToSegment when updateable", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const controller = createMockController();
      const segment = new Segment(
        { id: "s1", start: 1, end: 5 },
        waveform as any,
        visualizer as any,
        controller as any,
      );
      segment.convertToSegment(true);
      expect(controller.convertToSegment).toHaveBeenCalledWith("s1", true);
    });

    it("returns undefined when not updateable", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const controller = createMockController();
      const segment = new Segment(
        { start: 1, end: 5, updateable: false },
        waveform as any,
        visualizer as any,
        controller as any,
      );
      const result = segment.convertToSegment();
      expect(result).toBeUndefined();
      expect(controller.convertToSegment).not.toHaveBeenCalled();
    });
  });

  describe("remove", () => {
    it("invokes regionRemoved when deleteable", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const controller = createMockController();
      const segment = new Segment({ start: 1, end: 5 }, waveform as any, visualizer as any, controller as any);
      segment.remove();
      expect(waveform.invoke).toHaveBeenCalledWith("regionRemoved", [segment]);
    });

    it("does nothing when not deleteable", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const controller = createMockController();
      const segment = new Segment({ start: 1, end: 5 }, waveform as any, visualizer as any, controller as any);
      segment.update({ deleteable: false });
      const invokeSpy = waveform.invoke as jest.Mock;
      invokeSpy.mockClear();
      segment.remove();
      expect(invokeSpy).not.toHaveBeenCalledWith("regionRemoved", expect.anything());
    });
  });

  describe("destroy", () => {
    it("calls remove when notify is true and deleteable", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const controller = createMockController();
      const segment = new Segment({ start: 1, end: 5 }, waveform as any, visualizer as any, controller as any);
      segment.destroy(true);
      expect(waveform.invoke).toHaveBeenCalledWith("regionRemoved", [segment]);
    });

    it("does not call remove when notify is false", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const controller = createMockController();
      const segment = new Segment({ start: 1, end: 5 }, waveform as any, visualizer as any, controller as any);
      const invokeSpy = waveform.invoke as jest.Mock;
      invokeSpy.mockClear();
      segment.destroy(false);
      expect(invokeSpy).not.toHaveBeenCalledWith("regionRemoved", expect.anything());
    });

    it("does nothing when not deleteable", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const controller = createMockController();
      const segment = new Segment({ start: 1, end: 5 }, waveform as any, visualizer as any, controller as any);
      segment.update({ deleteable: false });
      const invokeSpy = waveform.invoke as jest.Mock;
      invokeSpy.mockClear();
      segment.destroy(true);
      expect(invokeSpy).not.toHaveBeenCalled();
    });
  });

  describe("toJSON", () => {
    it("returns start and end", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const controller = createMockController();
      const segment = new Segment({ start: 2, end: 8 }, waveform as any, visualizer as any, controller as any);
      expect(segment.toJSON()).toEqual({ start: 2, end: 8 });
    });
  });

  describe("switchCursor", () => {
    it("calls waveform.cursor.set with symbol", () => {
      const { CursorSymbol } = require("../../Cursor/Cursor");
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const controller = createMockController();
      const segment = new Segment({ start: 1, end: 5 }, waveform as any, visualizer as any, controller as any);
      segment.switchCursor(CursorSymbol.grab, false);
      expect(waveform.cursor.set).toHaveBeenCalledWith(CursorSymbol.grab, "");
    });

    it("passes layerName when shouldGrabFocus true and symbol is not crosshair", () => {
      const { CursorSymbol } = require("../../Cursor/Cursor");
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const controller = createMockController();
      const segment = new Segment(
        { id: "seg-x", start: 1, end: 5 },
        waveform as any,
        visualizer as any,
        controller as any,
      );
      segment.switchCursor(CursorSymbol.grab, true);
      expect(waveform.cursor.set).toHaveBeenCalledWith(CursorSymbol.grab, "region-seg-x");
    });

    it("passes empty string when symbol is crosshair (no cursor focus)", () => {
      const { CursorSymbol } = require("../../Cursor/Cursor");
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const controller = createMockController();
      const segment = new Segment({ start: 1, end: 5 }, waveform as any, visualizer as any, controller as any);
      segment.switchCursor(CursorSymbol.crosshair, true);
      expect(waveform.cursor.set).toHaveBeenCalledWith(CursorSymbol.crosshair, "");
    });
  });

  describe("handleSelected early return", () => {
    it("does not toggle when isDragging and already selected", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const controller = createMockController();
      const segment = new Segment(
        { start: 1, end: 5, selected: true },
        waveform as any,
        visualizer as any,
        controller as any,
      );
      (segment as any).isDragging = true;
      const invokeSpy = waveform.invoke as jest.Mock;
      invokeSpy.mockClear();
      segment.handleSelected();
      expect(segment.selected).toBe(true);
      expect(invokeSpy).not.toHaveBeenCalledWith("regionUpdated", expect.anything());
    });
  });

  describe("handleHighlighted edge cases", () => {
    it("does nothing when not updateable", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const controller = createMockController();
      const segment = new Segment(
        { start: 1, end: 5, updateable: false },
        waveform as any,
        visualizer as any,
        controller as any,
      );
      const invokeSpy = waveform.invoke as jest.Mock;
      invokeSpy.mockClear();
      segment.handleHighlighted(true);
      expect(segment.highlighted).toBe(false);
      expect(invokeSpy).not.toHaveBeenCalled();
    });

    it("does nothing when isDragging and selected", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const controller = createMockController();
      const segment = new Segment(
        { start: 1, end: 5, selected: true },
        waveform as any,
        visualizer as any,
        controller as any,
      );
      (segment as any).isDragging = true;
      const invokeSpy = waveform.invoke as jest.Mock;
      invokeSpy.mockClear();
      segment.handleHighlighted(true);
      expect(invokeSpy).not.toHaveBeenCalled();
    });

    it("toggles highlighted when called with no arg", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const controller = createMockController();
      const segment = new Segment({ start: 1, end: 5 }, waveform as any, visualizer as any, controller as any);
      segment.handleHighlighted();
      expect(segment.highlighted).toBe(true);
      segment.handleHighlighted();
      expect(segment.highlighted).toBe(false);
    });
  });

  describe("hovered getter", () => {
    it("returns controller.isHovered(segment)", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const controller = createMockController();
      (controller.isHovered as jest.Mock).mockReturnValue(true);
      const segment = new Segment({ start: 1, end: 5 }, waveform as any, visualizer as any, controller as any);
      expect(segment.hovered).toBe(true);
      expect(controller.isHovered).toHaveBeenCalledWith(segment);
    });
  });

  describe("render inViewport", () => {
    it("does not draw when segment is left of viewport", () => {
      const layer = createMockLayer();
      const visualizer = createMockVisualizer();
      (visualizer as any).createLayer = () => layer;
      (visualizer as any).getScrollLeft = () => 1;
      const waveform = createMockWaveform();
      const controller = createMockController();
      (controller as any).layerGroup = layer;
      const segment = new Segment({ start: 1, end: 5 }, waveform as any, visualizer as any, controller as any);
      segment.render();
      expect(layer.fillRect).not.toHaveBeenCalled();
    });

    it("does not draw when segment is right of viewport", () => {
      const layer = createMockLayer();
      const visualizer = createMockVisualizer();
      (visualizer as any).createLayer = () => layer;
      (visualizer as any).width = 800;
      const waveform = createMockWaveform();
      const controller = createMockController();
      (controller as any).layerGroup = layer;
      const segment = new Segment({ start: 10, end: 10.5 }, waveform as any, visualizer as any, controller as any);
      segment.render();
      expect(layer.fillRect).not.toHaveBeenCalled();
    });

    it("draws with darkened color when selected", () => {
      const layer = createMockLayer();
      const visualizer = createMockVisualizer();
      (visualizer as any).createLayer = () => layer;
      const waveform = createMockWaveform();
      const controller = createMockController();
      (controller as any).layerGroup = layer;
      const segment = new Segment(
        { start: 1, end: 5, selected: true },
        waveform as any,
        visualizer as any,
        controller as any,
      );
      segment.render();
      expect(layer.fillRect).toHaveBeenCalled();
    });

    it("draws with darkened color when highlighted or active", () => {
      const layer = createMockLayer();
      const visualizer = createMockVisualizer();
      (visualizer as any).createLayer = () => layer;
      const waveform = createMockWaveform();
      const controller = createMockController();
      (controller as any).layerGroup = layer;
      const segment = new Segment({ start: 1, end: 5 }, waveform as any, visualizer as any, controller as any);
      (segment as any).highlighted = true;
      segment.render();
      expect(layer.fillRect).toHaveBeenCalled();
    });
  });

  describe("yStart and yEnd", () => {
    it("uses 0 for top when timeline is bottom", () => {
      const visualizer = createMockVisualizer({ timelinePlacement: "bottom" as const });
      const waveform = createMockWaveform();
      const controller = createMockController();
      const segment = new Segment({ start: 1, end: 5 }, waveform as any, visualizer as any, controller as any);
      expect(segment.yStart).toBe(0);
    });

    it("yEnd is yStart + (height - timelineHeight)", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const controller = createMockController();
      const segment = new Segment({ start: 1, end: 5 }, waveform as any, visualizer as any, controller as any);
      expect(segment.yEnd).toBe(segment.yStart + (100 - 20));
    });
  });

  describe("timelineHeight and timelinePlacement defaults", () => {
    it("uses defaults.timelineHeight when visualizer.timelineHeight is falsy", () => {
      const visualizer = createMockVisualizer();
      delete (visualizer as any).timelineHeight;
      const waveform = createMockWaveform();
      const controller = createMockController();
      const segment = new Segment({ start: 1, end: 5 }, waveform as any, visualizer as any, controller as any);
      expect(segment.timelineHeight).toBe(32);
    });

    it("uses defaults.timelinePlacement when visualizer.timelinePlacement is falsy", () => {
      const visualizer = createMockVisualizer();
      delete (visualizer as any).timelinePlacement;
      const waveform = createMockWaveform();
      const controller = createMockController();
      const segment = new Segment({ start: 1, end: 5 }, waveform as any, visualizer as any, controller as any);
      expect(segment.timelinePlacement).toBe("top");
    });
  });

  describe("destroy when already destroyed", () => {
    it("does nothing on second destroy", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const controller = createMockController();
      const segment = new Segment({ start: 1, end: 5 }, waveform as any, visualizer as any, controller as any);
      segment.destroy(true);
      const invokeSpy = waveform.invoke as jest.Mock;
      invokeSpy.mockClear();
      segment.destroy(true);
      expect(invokeSpy).not.toHaveBeenCalled();
    });
  });

  describe("update when updateable is false", () => {
    it("allows setting updateable to true", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const controller = createMockController();
      const segment = new Segment(
        { start: 1, end: 5, updateable: false },
        waveform as any,
        visualizer as any,
        controller as any,
      );
      segment.update({ updateable: true });
      expect(segment.updateable).toBe(true);
    });
  });

  describe("mouseOver (via event)", () => {
    it("does nothing when controller.layerGroup is not visible", () => {
      const { CursorSymbol } = require("../../Cursor/Cursor");
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const controller = createMockController();
      (controller as any).layerGroup = { isVisible: false };
      const segment = new Segment({ start: 1, end: 5 }, waveform as any, visualizer as any, controller as any);
      const cursorSetSpy = waveform.cursor.set as jest.Mock;
      cursorSetSpy.mockClear();
      (segment as any).invoke("mouseOver", [segment, { clientX: 100 } as MouseEvent]);
      expect(cursorSetSpy).not.toHaveBeenCalled();
    });

    it("sets colResize when over edge and updateable", () => {
      const { CursorSymbol } = require("../../Cursor/Cursor");
      const container = document.createElement("div");
      const visualizer = createMockVisualizer({
        container,
        getScrollLeftPx: () => 0,
        zoomedWidth: 800,
      });
      const waveform = createMockWaveform({ duration: 10 });
      const controller = createMockController();
      const segment = new Segment({ start: 1, end: 5 }, waveform as any, visualizer as any, controller as any);
      const cursorTime = 4.99;
      const clientX = (cursorTime / 10) * 800;
      (segment as any).invoke("mouseOver", [segment, { clientX } as MouseEvent]);
      expect(waveform.cursor.set).toHaveBeenCalledWith(CursorSymbol.colResize, expect.any(String));
    });

    it("sets grab when not over edge", () => {
      const { CursorSymbol } = require("../../Cursor/Cursor");
      const container = document.createElement("div");
      const visualizer = createMockVisualizer({ container, getScrollLeftPx: () => 0, zoomedWidth: 800 });
      const waveform = createMockWaveform({ duration: 10 });
      const controller = createMockController();
      const segment = new Segment({ start: 2, end: 5 }, waveform as any, visualizer as any, controller as any);
      const cursorTime = 3.5;
      const clientX = (cursorTime / 10) * 800;
      (segment as any).invoke("mouseOver", [segment, { clientX } as MouseEvent]);
      expect(waveform.cursor.set).toHaveBeenCalledWith(CursorSymbol.grab, expect.any(String));
    });

    it("does nothing when isDragging", () => {
      const { CursorSymbol } = require("../../Cursor/Cursor");
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const controller = createMockController();
      const segment = new Segment({ start: 1, end: 5 }, waveform as any, visualizer as any, controller as any);
      (segment as any).isDragging = true;
      const cursorSetSpy = waveform.cursor.set as jest.Mock;
      cursorSetSpy.mockClear();
      (segment as any).invoke("mouseOver", [segment, { clientX: 200 } as MouseEvent]);
      expect(cursorSetSpy).not.toHaveBeenCalled();
    });
  });

  describe("mouseDown (via event)", () => {
    it("does nothing when controller.layerGroup is not visible", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const controller = createMockController();
      (controller as any).layerGroup = { isVisible: false };
      const segment = new Segment({ start: 1, end: 5 }, waveform as any, visualizer as any, controller as any);
      const addSpy = jest.spyOn(document, "addEventListener");
      (segment as any).invoke("mouseDown", [segment, { clientX: 100 } as MouseEvent]);
      expect(controller.bringRegionToFront).not.toHaveBeenCalled();
      addSpy.mockRestore();
    });

    it("does nothing when override key is pressed", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const controller = createMockController();
      (controller.isOverrideKeyPressed as jest.Mock).mockReturnValue(true);
      const segment = new Segment({ start: 1, end: 5 }, waveform as any, visualizer as any, controller as any);
      (segment as any).invoke("mouseDown", [segment, { clientX: 100 } as MouseEvent]);
      expect(controller.bringRegionToFront).not.toHaveBeenCalled();
    });

    it("does nothing when controller is locked", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const controller = createMockController();
      Object.defineProperty(controller, "isLocked", { get: () => true });
      const segment = new Segment({ start: 1, end: 5 }, waveform as any, visualizer as any, controller as any);
      (segment as any).invoke("mouseDown", [segment, { clientX: 100 } as MouseEvent]);
      expect(controller.bringRegionToFront).not.toHaveBeenCalled();
    });

    it("does not add mousemove listener when not updateable", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const controller = createMockController();
      const segment = new Segment(
        { start: 1, end: 5, updateable: false },
        waveform as any,
        visualizer as any,
        controller as any,
      );
      const addSpy = jest.spyOn(document, "addEventListener");
      (segment as any).invoke("mouseDown", [segment, { clientX: 100 } as MouseEvent]);
      expect(controller.bringRegionToFront).toHaveBeenCalled();
      const mousemoveCalls = addSpy.mock.calls.filter((c) => c[0] === "mousemove");
      expect(mousemoveCalls.length).toBe(0);
      addSpy.mockRestore();
    });

    it("adds mousemove listener when updateable", () => {
      const container = document.createElement("div");
      const visualizer = createMockVisualizer({ container });
      const waveform = createMockWaveform();
      const controller = createMockController();
      const segment = new Segment({ start: 1, end: 5 }, waveform as any, visualizer as any, controller as any);
      const addSpy = jest.spyOn(document, "addEventListener");
      (segment as any).invoke("mouseDown", [segment, { clientX: 100 } as MouseEvent]);
      const mousemoveCalls = addSpy.mock.calls.filter((c) => c[0] === "mousemove");
      expect(mousemoveCalls.length).toBe(1);
      addSpy.mockRestore();
      document.removeEventListener("mouseup", (segment as any).handleMouseUp);
      document.removeEventListener("mousemove", (segment as any).handleDrag);
    });
  });

  describe("handleMouseUp and handleDrag", () => {
    it("calls handleUpdateEnd and switchCursor when isDragging on mouseup", () => {
      const { CursorSymbol } = require("../../Cursor/Cursor");
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const controller = createMockController();
      const segment = new Segment({ start: 1, end: 5 }, waveform as any, visualizer as any, controller as any);
      (segment as any).draggingStartPosition = { grabPosition: 0, start: 1, end: 5 };
      (segment as any).isDragging = true;
      const invokeSpy = waveform.invoke as jest.Mock;
      const cursorSetSpy = waveform.cursor.set as jest.Mock;
      cursorSetSpy.mockClear();
      invokeSpy.mockClear();
      (segment as any).handleMouseUp({} as MouseEvent);
      expect(cursorSetSpy).toHaveBeenCalledWith(CursorSymbol.grab, expect.any(String));
      expect(invokeSpy).toHaveBeenCalledWith("regionUpdatedEnd", [segment]);
    });

    it("handleDrag updates position when moving (not resizing)", () => {
      const container = document.createElement("div");
      const visualizer = createMockVisualizer({
        container,
        getScrollLeft: () => 0,
        getScrollLeftPx: () => 0,
        zoomedWidth: 800,
      });
      const waveform = createMockWaveform({ duration: 10 });
      const controller = createMockController();
      const segment = new Segment({ start: 2, end: 6 }, waveform as any, visualizer as any, controller as any);
      (segment as any).draggingStartPosition = { grabPosition: 200, start: 2, end: 6 };
      (segment as any).isGrabbingEdge = { isRightEdge: false, isLeftEdge: false };
      const moveEvent = new MouseEvent("mousemove", { clientX: 300 });
      (segment as any).handleDrag(moveEvent);
      expect(segment.start).not.toBe(2);
      expect(segment.end).not.toBe(6);
      expect(waveform.invoke).toHaveBeenCalledWith("regionUpdated", [segment]);
    });

    it("handleDrag does nothing when not updateable", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const controller = createMockController();
      const segment = new Segment(
        { start: 1, end: 5, updateable: false },
        waveform as any,
        visualizer as any,
        controller as any,
      );
      (segment as any).draggingStartPosition = { grabPosition: 0, start: 1, end: 5 };
      const invokeSpy = waveform.invoke as jest.Mock;
      invokeSpy.mockClear();
      (segment as any).handleDrag({ preventDefault: jest.fn(), stopPropagation: jest.fn(), clientX: 100 } as any);
      expect(invokeSpy).not.toHaveBeenCalled();
    });

    it("handleDrag does nothing when locked", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const controller = createMockController();
      const segment = new Segment(
        { start: 1, end: 5, locked: true },
        waveform as any,
        visualizer as any,
        controller as any,
      );
      (segment as any).draggingStartPosition = { grabPosition: 0, start: 1, end: 5 };
      const invokeSpy = waveform.invoke as jest.Mock;
      invokeSpy.mockClear();
      (segment as any).handleDrag({ preventDefault: jest.fn(), stopPropagation: jest.fn(), clientX: 100 } as any);
      expect(invokeSpy).not.toHaveBeenCalled();
    });

    it("handleDrag clamps currentPosition when negative", () => {
      const container = document.createElement("div");
      const visualizer = createMockVisualizer({
        container,
        getScrollLeft: () => 0,
        getScrollLeftPx: () => 0,
        zoomedWidth: 800,
      });
      const waveform = createMockWaveform({ duration: 10 });
      const controller = createMockController();
      const segment = new Segment({ start: 2, end: 6 }, waveform as any, visualizer as any, controller as any);
      (segment as any).draggingStartPosition = { grabPosition: 200, start: 2, end: 6 };
      (segment as any).isGrabbingEdge = { isRightEdge: false, isLeftEdge: false };
      const moveEvent = new MouseEvent("mousemove", { clientX: -500 });
      (segment as any).handleDrag(moveEvent);
      expect(segment.start).toBe(0);
      expect(segment.end).toBe(4);
    });

    it("handleDrag resize path (right edge) calls switchCursor colResize and updatePosition", () => {
      const { CursorSymbol } = require("../../Cursor/Cursor");
      const container = document.createElement("div");
      const visualizer = createMockVisualizer({
        container,
        getScrollLeft: () => 0,
        getScrollLeftPx: () => 0,
        zoomedWidth: 800,
      });
      const waveform = createMockWaveform({ duration: 10 });
      const controller = createMockController();
      const segment = new Segment({ start: 2, end: 6 }, waveform as any, visualizer as any, controller as any);
      (segment as any).draggingStartPosition = { grabPosition: 600, start: 2, end: 6 };
      (segment as any).isGrabbingEdge = { isRightEdge: true, isLeftEdge: false };
      const cursorSetSpy = waveform.cursor.set as jest.Mock;
      cursorSetSpy.mockClear();
      const invokeSpy = waveform.invoke as jest.Mock;
      invokeSpy.mockClear();
      const moveEvent = new MouseEvent("mousemove", { clientX: 700 });
      (segment as any).handleDrag(moveEvent);
      expect(cursorSetSpy).toHaveBeenCalledWith(CursorSymbol.colResize, expect.any(String));
      expect(invokeSpy).toHaveBeenCalledWith("regionUpdated", [segment]);
    });
  });
});
