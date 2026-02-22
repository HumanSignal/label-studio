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
  });
});
