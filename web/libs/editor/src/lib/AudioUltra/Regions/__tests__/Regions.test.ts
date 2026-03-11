/**
 * Unit tests for Regions (lib/AudioUltra/Regions/Regions.ts)
 */
import { Region } from "../Region";
import { Regions } from "../Regions";
import { Segment } from "../Segment";

function createMockLayerGroup() {
  return {
    clear: jest.fn(),
    isVisible: true,
    fillStyle: "",
    fillRect: jest.fn(),
    context: {
      measureText: jest.fn(() => ({ width: 0, fontBoundingBoxAscent: 10, fontBoundingBoxDescent: 2 })),
      fillStyle: "",
      fillRect: jest.fn(),
      roundRect: jest.fn(),
      font: "",
      fitText: jest.fn(),
    },
    canvas: null,
  };
}

function createMockLayer() {
  return {
    fillStyle: "",
    fillRect: jest.fn(),
    isVisible: true,
  };
}

function createMockVisualizer(overrides = {}) {
  const layerGroup = createMockLayerGroup();
  const layer = createMockLayer();
  const container = document.createElement("div");
  return {
    getLayer: jest.fn((name: string) => (name === "regions" ? layerGroup : null)),
    createLayer: jest.fn(() => layer),
    container,
    on: jest.fn(),
    off: jest.fn(),
    draw: jest.fn(),
    lockSeek: jest.fn(),
    unlockSeek: jest.fn(),
    getScrollLeftPx: () => 0,
    getScrollLeft: () => 0,
    width: 800,
    zoomedWidth: 800,
    fullWidth: 800,
    timelinePlacement: "top" as const,
    timelineHeight: 20,
    height: 100,
    ...overrides,
  };
}

function createMockWaveform(overrides = {}) {
  return {
    loaded: true,
    currentTime: 2,
    duration: 10,
    params: { showLabels: false },
    on: jest.fn(),
    off: jest.fn(),
    invoke: jest.fn(),
    cursor: { set: jest.fn(), hasFocus: jest.fn(() => false), isFocused: jest.fn(() => false) },
    settings: { autoPlayNewSegments: false },
    player: { playing: false, pause: jest.fn(), seek: jest.fn(), play: jest.fn() },
    ...overrides,
  };
}

describe("Regions", () => {
  describe("constructor", () => {
    it("initializes with default options when no options passed", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const regions = new Regions({}, waveform as any, visualizer as any);
      expect(regions.list).toEqual([]);
      expect(regions.createable).toBe(true);
      expect(regions.updateable).toBe(true);
      expect(regions.deleteable).toBe(true);
      expect(regions.showLabels).toBe(false);
    });

    it("uses options.regions as initialRegions and createable/updateable/deleteable", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const regions = new Regions(
        {
          regions: [
            { start: 0, end: 2 },
            { start: 3, end: 5 },
          ],
          createable: false,
          updateable: false,
          deleteable: false,
        },
        waveform as any,
        visualizer as any,
      );
      expect(regions.createable).toBe(false);
      expect(regions.updateable).toBe(false);
      expect(regions.deleteable).toBe(false);
      expect(visualizer.on).toHaveBeenCalledWith("initialized", expect.any(Function));
      expect(waveform.on).toHaveBeenCalledWith("regionRemoved", expect.any(Function));
      expect(waveform.on).toHaveBeenCalledWith("regionUpdated", expect.any(Function));
    });

    it("uses defaultColor when provided", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const regions = new Regions({ defaultColor: "#ff0000" }, waveform as any, visualizer as any);
      regions.setDrawingColor("#ff0000");
      regions.resetDrawingColor();
      expect(regions.list).toEqual([]);
    });
  });

  describe("addRegion / addRegions", () => {
    it("addRegion creates a Segment when no labels and drawableTarget is Segment", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const regions = new Regions({}, waveform as any, visualizer as any);
      regions.segmentDrawableTarget();
      const region = regions.addRegion({ start: 1, end: 4 });
      expect(region).toBeInstanceOf(Segment);
      expect(region.isRegion).toBe(false);
      expect(regions.list).toHaveLength(1);
      expect(visualizer.draw).toHaveBeenCalledWith(true);
    });

    it("addRegion creates a Region when labels are provided", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const regions = new Regions({}, waveform as any, visualizer as any);
      const region = regions.addRegion({ start: 1, end: 4, labels: ["A"] });
      expect(region).toBeInstanceOf(Region);
      expect(region.isRegion).toBe(true);
      expect(regions.list).toHaveLength(1);
    });

    it("addRegions adds multiple regions and redraws once when render true", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const regions = new Regions({}, waveform as any, visualizer as any);
      regions.addRegions(
        [
          { start: 0, end: 1 },
          { start: 2, end: 3 },
        ],
        true,
      );
      expect(regions.list).toHaveLength(2);
      expect(visualizer.draw).toHaveBeenCalledWith(true);
    });

    it("addRegion with render false does not call redraw", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const regions = new Regions({}, waveform as any, visualizer as any);
      const drawSpy = visualizer.draw as jest.Mock;
      drawSpy.mockClear();
      regions.addRegion({ start: 1, end: 2 }, false);
      expect(drawSpy).not.toHaveBeenCalled();
    });
  });

  describe("findRegion", () => {
    it("returns region by id", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const regions = new Regions({}, waveform as any, visualizer as any);
      const r = regions.addRegion({ id: "my-id", start: 1, end: 3 }, false);
      expect(regions.findRegion("my-id")).toBe(r);
      expect(regions.findRegion("other")).toBeUndefined();
    });
  });

  describe("removeRegion", () => {
    it("removes deleteable region and redraws", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const regions = new Regions({}, waveform as any, visualizer as any);
      const r = regions.addRegion({ id: "r1", start: 1, end: 2 }, false);
      const destroySpy = jest.spyOn(r, "destroy");
      regions.removeRegion("r1");
      expect(destroySpy).toHaveBeenCalledWith(false);
      expect(regions.list).toHaveLength(0);
      expect(visualizer.draw).toHaveBeenCalledWith(true);
    });

    it("does not remove when deleteable is false on controller", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const regions = new Regions({ deleteable: false }, waveform as any, visualizer as any);
      regions.addRegion({ id: "r1", start: 1, end: 2 }, false);
      regions.removeRegion("r1");
      expect(regions.list).toHaveLength(1);
    });
  });

  describe("updateRegion", () => {
    it("updates region when updateable and id exists", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const regions = new Regions({}, waveform as any, visualizer as any);
      const r = regions.addRegion({ id: "r1", start: 1, end: 3 }, false);
      const updateSpy = jest.spyOn(r, "update");
      regions.updateRegion({ id: "r1", start: 1, end: 5 });
      expect(updateSpy).toHaveBeenCalledWith({ id: "r1", start: 1, end: 5 });
      expect(visualizer.draw).toHaveBeenCalledWith(true);
    });

    it("does nothing when updateable is false", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const regions = new Regions({ updateable: false }, waveform as any, visualizer as any);
      regions.addRegion({ id: "r1", start: 1, end: 2 }, false);
      const result = regions.updateRegion({ id: "r1", start: 0, end: 4 });
      expect(result).toBeUndefined();
    });

    it("does nothing when options.id is missing", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const regions = new Regions({}, waveform as any, visualizer as any);
      const result = regions.updateRegion({ start: 1, end: 2 } as any);
      expect(result).toBeUndefined();
    });
  });

  describe("convertToRegion / convertToSegment", () => {
    it("convertToRegion replaces segment with region and preserves id", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const regions = new Regions({}, waveform as any, visualizer as any);
      regions.segmentDrawableTarget();
      const seg = regions.addRegion({ id: "s1", start: 1, end: 4 }, false) as Segment;
      expect(seg.isRegion).toBe(false);
      const region = regions.convertToRegion("s1", ["Label1"]);
      expect(region).toBeInstanceOf(Region);
      expect(region.isRegion).toBe(true);
      expect(region.id).toBe("s1");
      expect(regions.list).toHaveLength(1);
    });

    it("convertToSegment replaces region with segment", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const regions = new Regions({}, waveform as any, visualizer as any);
      const r = regions.addRegion({ id: "r1", start: 1, end: 4, labels: ["A"] }, false) as Region;
      expect(r.isRegion).toBe(true);
      const segment = regions.convertToSegment("r1");
      expect(segment).toBeInstanceOf(Segment);
      expect(segment.isRegion).toBe(false);
      expect(segment.id).toBe("r1");
    });
  });

  describe("clearSegments", () => {
    it("removes only segments (non-regions), not external, and destroys them", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const regions = new Regions({}, waveform as any, visualizer as any);
      regions.segmentDrawableTarget();
      const seg1 = regions.addRegion({ id: "s1", start: 0, end: 1 }, false) as Segment;
      const seg2 = regions.addRegion({ id: "s2", start: 2, end: 3, external: true }, false) as Segment;
      regions.addRegion({ id: "r1", start: 1, end: 2, labels: ["X"] }, false);
      const destroy1 = jest.spyOn(seg1, "destroy");
      regions.clearSegments(false);
      expect(destroy1).toHaveBeenCalled();
      expect(regions.list).toHaveLength(2);
      expect(regions.list.some((r) => r.id === "s2")).toBe(true);
      expect(regions.list.some((r) => r.id === "r1")).toBe(true);
    });

    it("clearSegments with selectedOnly removes only selected segments", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const regions = new Regions({}, waveform as any, visualizer as any);
      regions.segmentDrawableTarget();
      regions.addRegion({ id: "s1", start: 0, end: 1, selected: true }, false);
      regions.addRegion({ id: "s2", start: 2, end: 3, selected: false }, false);
      regions.clearSegments(true);
      expect(regions.list).toHaveLength(1);
      expect(regions.list[0].id).toBe("s2");
    });
  });

  describe("drawable target", () => {
    it("regionDrawableTarget sets drawableTarget to Region", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const regions = new Regions({}, waveform as any, visualizer as any);
      regions.regionDrawableTarget();
      const r = regions.addRegion({ start: 1, end: 2 }, false);
      expect(r).toBeInstanceOf(Region);
    });

    it("resetDrawableTarget sets drawableTarget back to Segment", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const regions = new Regions({}, waveform as any, visualizer as any);
      regions.regionDrawableTarget();
      regions.resetDrawableTarget();
      const r = regions.addRegion({ start: 1, end: 2 }, false);
      expect(r).toBeInstanceOf(Segment);
    });
  });

  describe("bringRegionToFront", () => {
    it("moves region to end of list", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const regions = new Regions({}, waveform as any, visualizer as any);
      regions.addRegion({ id: "first", start: 0, end: 1 }, false);
      regions.addRegion({ id: "second", start: 2, end: 3 }, false);
      expect(regions.list[0].id).toBe("first");
      regions.bringRegionToFront("first");
      expect(regions.list[1].id).toBe("first");
      expect(regions.list[0].id).toBe("second");
    });
  });

  describe("getters", () => {
    it("list returns copy of regions array", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const regions = new Regions({}, waveform as any, visualizer as any);
      regions.addRegion({ start: 1, end: 2 }, false);
      const list = regions.list;
      expect(Array.isArray(list)).toBe(true);
      expect(list).toHaveLength(1);
      expect(list).not.toBe(regions.list);
    });

    it("selected returns only selected regions", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const regions = new Regions({}, waveform as any, visualizer as any);
      regions.addRegion({ start: 0, end: 1, selected: true }, false);
      regions.addRegion({ start: 2, end: 3, selected: false }, false);
      expect(regions.selected).toHaveLength(1);
      expect(regions.selected[0].selected).toBe(true);
    });

    it("timelineRegions returns regions with showInTimeline", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const regions = new Regions({}, waveform as any, visualizer as any);
      regions.addRegion({ start: 0, end: 1, showInTimeline: true }, false);
      regions.addRegion({ start: 2, end: 3 }, false);
      expect(regions.timelineRegions).toHaveLength(1);
    });

    it("visible returns only visible regions", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const regions = new Regions({}, waveform as any, visualizer as any);
      regions.addRegion({ start: 0, end: 1, visible: false }, false);
      regions.addRegion({ start: 2, end: 3 }, false);
      expect(regions.visible).toHaveLength(1);
    });
  });

  describe("drawing color and labels", () => {
    it("setDrawingColor and resetDrawingColor", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const regions = new Regions({}, waveform as any, visualizer as any);
      regions.setDrawingColor("#00ff00");
      regions.resetDrawingColor();
      expect(regions.list).toEqual([]);
    });

    it("setLabels and resetLabels", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const regions = new Regions({}, waveform as any, visualizer as any);
      regions.setLabels(["A", "B"]);
      regions.resetLabels();
      regions.setLabels(undefined);
    });

    it("updateLabelVisibility sets showLabels and redraws", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const regions = new Regions({}, waveform as any, visualizer as any);
      regions.updateLabelVisibility(true);
      expect(regions.showLabels).toBe(true);
      expect(visualizer.draw).toHaveBeenCalledWith(true);
    });
  });

  describe("lock / unlock", () => {
    it("lock sets locked and calls visualizer.lockSeek", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const regions = new Regions({}, waveform as any, visualizer as any);
      expect(regions.isLocked).toBe(false);
      regions.lock();
      expect(regions.isLocked).toBe(true);
      expect(visualizer.lockSeek).toHaveBeenCalled();
    });

    it("unlock clears locked and calls visualizer.unlockSeek", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const regions = new Regions({}, waveform as any, visualizer as any);
      regions.lock();
      regions.unlock();
      expect(regions.isLocked).toBe(false);
      expect(visualizer.unlockSeek).toHaveBeenCalled();
    });
  });

  describe("hover / unhover / isHovered", () => {
    it("hover adds region to hovered set and invokes mouseEnter", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const regions = new Regions({}, waveform as any, visualizer as any);
      const seg = regions.addRegion({ start: 1, end: 2 }, false) as Segment;
      const invokeSpy = jest.spyOn(seg, "invoke");
      const e = new MouseEvent("mouseenter");
      regions.hover(seg, e);
      expect(regions.isHovered(seg)).toBe(true);
      expect(invokeSpy).toHaveBeenCalledWith("mouseEnter", [seg, e]);
      expect(visualizer.lockSeek).toHaveBeenCalled();
    });

    it("unhover removes from hovered set and invokes mouseLeave", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const regions = new Regions({}, waveform as any, visualizer as any);
      const seg = regions.addRegion({ start: 1, end: 2 }, false) as Segment;
      regions.hover(seg);
      regions.unhover(seg);
      expect(regions.isHovered(seg)).toBe(false);
    });
  });

  describe("pixelsToTime", () => {
    it("converts pixels to time using zoomedWidth and duration", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const regions = new Regions({}, waveform as any, visualizer as any);
      const t = regions.pixelsToTime(400);
      expect(t).toBe(5);
    });
  });

  describe("toJSON", () => {
    it("returns array of region toJSON results", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const regions = new Regions({}, waveform as any, visualizer as any);
      regions.addRegion({ id: "r1", start: 1, end: 3 }, false);
      const json = regions.toJSON();
      expect(json).toHaveLength(1);
      expect(json[0]).toMatchObject({ start: 1, end: 3 });
    });
  });

  describe("destroy", () => {
    it("removes event listeners and destroys all regions", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const regions = new Regions({}, waveform as any, visualizer as any);
      const r = regions.addRegion({ start: 1, end: 2 }, false);
      const destroySpy = jest.spyOn(r, "destroy");
      regions.destroy();
      expect(visualizer.off).toHaveBeenCalledWith("initialized", expect.any(Function));
      expect(visualizer.off).toHaveBeenCalledWith("draw", expect.any(Function));
      expect(waveform.off).toHaveBeenCalledWith("regionRemoved", expect.any(Function));
      expect(waveform.off).toHaveBeenCalledWith("regionUpdated", expect.any(Function));
      expect(destroySpy).toHaveBeenCalled();
      expect(regions.list).toHaveLength(0);
    });
  });

  describe("isOverrideKeyPressed", () => {
    it("returns true when shiftKey is true", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const regions = new Regions({}, waveform as any, visualizer as any);
      expect(regions.isOverrideKeyPressed({ shiftKey: true } as MouseEvent)).toBe(true);
      expect(regions.isOverrideKeyPressed({ shiftKey: false } as MouseEvent)).toBe(false);
    });
  });

  describe("handleDraw and renderAll", () => {
    it("handleDraw does nothing when waveform not loaded", () => {
      const visualizer = createMockVisualizer();
      const layerGroup = createMockLayerGroup();
      (visualizer as any).getLayer = jest.fn(() => layerGroup);
      const waveform = createMockWaveform({ loaded: false });
      const regions = new Regions({}, waveform as any, visualizer as any);
      regions.addRegion({ start: 1, end: 2 }, false);
      (regions as any).handleDraw();
      expect(layerGroup.clear).not.toHaveBeenCalled();
    });

    it("handleDraw calls renderAll when loaded", () => {
      const visualizer = createMockVisualizer();
      const layerGroup = createMockLayerGroup();
      (visualizer as any).getLayer = jest.fn(() => layerGroup);
      const waveform = createMockWaveform({ loaded: true });
      const regions = new Regions({}, waveform as any, visualizer as any);
      const r = regions.addRegion({ start: 1, end: 2 }, false);
      const renderSpy = jest.spyOn(r, "render");
      (regions as any).handleDraw();
      expect(layerGroup.clear).toHaveBeenCalled();
      expect(renderSpy).toHaveBeenCalled();
    });
  });

  describe("handleInit", () => {
    it("creates regions from initialRegions and subscribes to draw", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const regions = new Regions(
        {
          regions: [
            { start: 0, end: 2 },
            { start: 3, end: 5 },
          ],
        },
        waveform as any,
        visualizer as any,
      );
      const handleInit = (visualizer.on as jest.Mock).mock.calls.find((c: unknown[]) => c[0] === "initialized")?.[1];
      expect(handleInit).toBeDefined();
      handleInit();
      expect(regions.list).toHaveLength(2);
      expect(visualizer.on).toHaveBeenCalledWith("draw", expect.any(Function));
    });
  });

  describe("handleRegionUpdated / handleRegionRemoved", () => {
    it("handleRegionUpdated triggers draw", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const regions = new Regions({}, waveform as any, visualizer as any);
      const handler = (waveform.on as jest.Mock).mock.calls.find((c: unknown[]) => c[0] === "regionUpdated")?.[1];
      expect(handler).toBeDefined();
      handler();
      expect(visualizer.draw).toHaveBeenCalledWith(true);
    });

    it("handleRegionRemoved calls removeRegion", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const regions = new Regions({}, waveform as any, visualizer as any);
      const seg = regions.addRegion({ id: "s1", start: 1, end: 2 }, false) as Segment;
      const removeSpy = jest.spyOn(regions, "removeRegion");
      const handler = (waveform.on as jest.Mock).mock.calls.find((c: unknown[]) => c[0] === "regionRemoved")?.[1];
      expect(handler).toBeDefined();
      handler(seg);
      expect(removeSpy).toHaveBeenCalledWith("s1");
    });
  });

  describe("redraw", () => {
    it("calls visualizer.draw(true)", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const regions = new Regions({}, waveform as any, visualizer as any);
      regions.redraw();
      expect(visualizer.draw).toHaveBeenCalledWith(true);
    });
  });
});
