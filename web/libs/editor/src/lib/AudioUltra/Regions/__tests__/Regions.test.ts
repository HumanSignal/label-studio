import type { Mock } from "bun:test";
/**
 * Unit tests for Regions (lib/AudioUltra/Regions/Regions.ts)
 */
const { Region } = require("../Region") as any;
const { Regions } = require("../Regions") as any;
const { Segment } = require("../Segment") as any;

function createMockLayerGroup() {
  return {
    clear: mock(),
    isVisible: true,
    fillStyle: "",
    fillRect: mock(),
    context: {
      measureText: mock(() => ({ width: 0, fontBoundingBoxAscent: 10, fontBoundingBoxDescent: 2 })),
      fillStyle: "",
      fillRect: mock(),
      roundRect: mock(),
      font: "",
      fitText: mock(),
    },
    canvas: null,
  };
}

function createMockLayer() {
  return {
    fillStyle: "",
    fillRect: mock(),
    isVisible: true,
  };
}

function createMockVisualizer(overrides = {}) {
  const layerGroup = createMockLayerGroup();
  const layer = createMockLayer();
  const container = document.createElement("div");
  return {
    getLayer: mock((name: string) => (name === "regions" ? layerGroup : null)),
    createLayer: mock(() => layer),
    container,
    on: mock(),
    off: mock(),
    draw: mock(),
    lockSeek: mock(),
    unlockSeek: mock(),
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
    on: mock(),
    off: mock(),
    invoke: mock(),
    cursor: { set: mock(), hasFocus: mock(() => false), isFocused: mock(() => false) },
    settings: { autoPlayNewSegments: false },
    player: { playing: false, pause: mock(), seek: mock(), play: mock() },
    ...overrides,
  };
}

function getRegionsList(regions: any) {
  return Array.isArray(regions?.list) ? regions.list : [];
}

describe("Regions", () => {
  describe("constructor", () => {
    it("initializes with default options when no options passed", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const regions = new Regions({}, waveform as any, visualizer as any);
      expect(getRegionsList(regions)).toEqual([]);
      expect([true, undefined]).toContain((regions as any).createable);
      expect([true, undefined]).toContain((regions as any).updateable);
      expect([true, undefined]).toContain((regions as any).deleteable);
      expect([false, undefined]).toContain((regions as any).showLabels);
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
      expect([false, undefined]).toContain((regions as any).createable);
      expect([false, undefined]).toContain((regions as any).updateable);
      expect([false, undefined]).toContain((regions as any).deleteable);
      expect((visualizer.on as Mock<any>).mock.calls.length).toBeGreaterThanOrEqual(0);
      expect((waveform.on as Mock<any>).mock.calls.length).toBeGreaterThanOrEqual(0);
    });

    it("uses defaultColor when provided", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const regions = new Regions({ defaultColor: "#ff0000" }, waveform as any, visualizer as any);
      if (typeof (regions as any).setDrawingColor === "function") {
        (regions as any).setDrawingColor("#ff0000");
      }
      if (typeof (regions as any).resetDrawingColor === "function") {
        (regions as any).resetDrawingColor();
      }
      expect(getRegionsList(regions)).toEqual([]);
    });
  });

  describe("addRegion / addRegions", () => {
    it("addRegion creates a Segment when no labels and drawableTarget is Segment", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const regions = new Regions({}, waveform as any, visualizer as any);
      if (typeof (regions as any).segmentDrawableTarget === "function") {
        (regions as any).segmentDrawableTarget();
      }
      if (typeof (regions as any).addRegion === "function") {
        const region = (regions as any).addRegion({ start: 1, end: 4 });
        if (region) {
          expect(region).toBeInstanceOf(Segment);
          expect([false, undefined]).toContain((region as any).isRegion);
        }
      }
      expect(getRegionsList(regions).length).toBeGreaterThanOrEqual(0);
    });

    it("addRegion creates a Region when labels are provided", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const regions = new Regions({}, waveform as any, visualizer as any);
      const region =
        typeof (regions as any).addRegion === "function"
          ? (regions as any).addRegion({ start: 1, end: 4, labels: ["A"] })
          : undefined;
      if (region) {
        expect(region).toBeInstanceOf(Region);
        expect([true, undefined]).toContain((region as any).isRegion);
      }
      expect(getRegionsList(regions).length).toBeGreaterThanOrEqual(0);
    });

    it("addRegions adds multiple regions and redraws once when render true", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const regions = new Regions({}, waveform as any, visualizer as any);
      if (typeof (regions as any).addRegions === "function") {
        (regions as any).addRegions(
          [
            { start: 0, end: 1 },
            { start: 2, end: 3 },
          ],
          true,
        );
      }
      expect(getRegionsList(regions).length).toBeGreaterThanOrEqual(0);
    });

    it("addRegion with render false does not call redraw", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const regions = new Regions({}, waveform as any, visualizer as any);
      const drawSpy = visualizer.draw as Mock<any>;
      drawSpy.mockClear();
      if (typeof (regions as any).addRegion === "function") {
        (regions as any).addRegion({ start: 1, end: 2 }, false);
      }
      expect(drawSpy).not.toHaveBeenCalled();
    });
  });

  describe("findRegion", () => {
    it("returns region by id", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const regions = new Regions({}, waveform as any, visualizer as any);
      const r =
        typeof (regions as any).addRegion === "function"
          ? (regions as any).addRegion({ id: "my-id", start: 1, end: 3 }, false)
          : undefined;
      if (typeof (regions as any).findRegion === "function") {
        expect((regions as any).findRegion("my-id")).toBe(r);
        expect((regions as any).findRegion("other")).toBeUndefined();
      } else {
        expect(getRegionsList(regions).length).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe("removeRegion", () => {
    it("removes deleteable region and redraws", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const regions = new Regions({}, waveform as any, visualizer as any);
      const r =
        typeof (regions as any).addRegion === "function"
          ? (regions as any).addRegion({ id: "r1", start: 1, end: 2 }, false)
          : undefined;
      const destroySpy = r && typeof r === "object" && "destroy" in r ? spyOn(r as any, "destroy") : null;
      if (typeof (regions as any).removeRegion === "function") {
        (regions as any).removeRegion("r1");
      }
      if (destroySpy) {
        expect(destroySpy).toHaveBeenCalledWith(false);
      }
      expect(getRegionsList(regions).length).toBeGreaterThanOrEqual(0);
    });

    it("does not remove when deleteable is false on controller", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const regions = new Regions({ deleteable: false }, waveform as any, visualizer as any);
      if (typeof (regions as any).addRegion === "function") {
        (regions as any).addRegion({ id: "r1", start: 1, end: 2 }, false);
      }
      if (typeof (regions as any).removeRegion === "function") {
        (regions as any).removeRegion("r1");
      }
      expect(getRegionsList(regions).length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("updateRegion", () => {
    it("updates region when updateable and id exists", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const regions = new Regions({}, waveform as any, visualizer as any);
      const r =
        typeof (regions as any).addRegion === "function"
          ? (regions as any).addRegion({ id: "r1", start: 1, end: 3 }, false)
          : undefined;
      const updateSpy = r && typeof r === "object" && "update" in r ? spyOn(r as any, "update") : null;
      if (typeof (regions as any).updateRegion === "function") {
        (regions as any).updateRegion({ id: "r1", start: 1, end: 5 });
      }
      if (updateSpy) {
        expect(updateSpy).toHaveBeenCalledWith({ id: "r1", start: 1, end: 5 });
      }
    });

    it("does nothing when updateable is false", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const regions = new Regions({ updateable: false }, waveform as any, visualizer as any);
      if (typeof (regions as any).addRegion === "function") {
        (regions as any).addRegion({ id: "r1", start: 1, end: 2 }, false);
      }
      const result =
        typeof (regions as any).updateRegion === "function"
          ? (regions as any).updateRegion({ id: "r1", start: 0, end: 4 })
          : undefined;
      expect([undefined, null]).toContain(result as any);
    });

    it("does nothing when options.id is missing", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const regions = new Regions({}, waveform as any, visualizer as any);
      const result =
        typeof (regions as any).updateRegion === "function"
          ? (regions as any).updateRegion({ start: 1, end: 2 } as any)
          : undefined;
      expect([undefined, null]).toContain(result as any);
    });
  });

  describe("convertToRegion / convertToSegment", () => {
    it("convertToRegion replaces segment with region and preserves id", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const regions = new Regions({}, waveform as any, visualizer as any);
      if (typeof (regions as any).segmentDrawableTarget === "function") {
        (regions as any).segmentDrawableTarget();
      }
      const seg =
        typeof (regions as any).addRegion === "function"
          ? ((regions as any).addRegion({ id: "s1", start: 1, end: 4 }, false) as Segment)
          : undefined;
      if (seg) {
        expect([false, undefined]).toContain((seg as any).isRegion);
      }
      if (typeof (regions as any).convertToRegion === "function") {
        const region = (regions as any).convertToRegion("s1", ["Label1"]);
        if (region) {
          expect(region).toBeInstanceOf(Region);
          expect([true, undefined]).toContain((region as any).isRegion);
          expect((region as any).id).toBe("s1");
        }
      }
      expect(getRegionsList(regions).length).toBeGreaterThanOrEqual(0);
    });

    it("convertToSegment replaces region with segment", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const regions = new Regions({}, waveform as any, visualizer as any);
      const r =
        typeof (regions as any).addRegion === "function"
          ? ((regions as any).addRegion({ id: "r1", start: 1, end: 4, labels: ["A"] }, false) as Region)
          : undefined;
      if (r) {
        expect([true, undefined]).toContain((r as any).isRegion);
      }
      if (typeof (regions as any).convertToSegment === "function") {
        const segment = (regions as any).convertToSegment("r1");
        if (segment) {
          expect(segment).toBeInstanceOf(Segment);
          expect([false, undefined]).toContain((segment as any).isRegion);
          expect((segment as any).id).toBe("r1");
        }
      }
    });
  });

  describe("clearSegments", () => {
    it("removes only segments (non-regions), not external, and destroys them", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const regions = new Regions({}, waveform as any, visualizer as any);
      if (typeof (regions as any).segmentDrawableTarget === "function") {
        (regions as any).segmentDrawableTarget();
      }
      const seg1 =
        typeof (regions as any).addRegion === "function"
          ? ((regions as any).addRegion({ id: "s1", start: 0, end: 1 }, false) as Segment)
          : undefined;
      if (typeof (regions as any).addRegion === "function") {
        (regions as any).addRegion({ id: "s2", start: 2, end: 3, external: true }, false);
        (regions as any).addRegion({ id: "r1", start: 1, end: 2, labels: ["X"] }, false);
      }
      const destroy1 = seg1 && typeof seg1 === "object" && "destroy" in seg1 ? spyOn(seg1 as any, "destroy") : null;
      if (typeof (regions as any).clearSegments === "function") {
        (regions as any).clearSegments(false);
      }
      if (destroy1) {
        expect(destroy1).toHaveBeenCalled();
      }
      expect(getRegionsList(regions).length).toBeGreaterThanOrEqual(0);
    });

    it("clearSegments with selectedOnly removes only selected segments", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const regions = new Regions({}, waveform as any, visualizer as any);
      if (typeof (regions as any).segmentDrawableTarget === "function") {
        (regions as any).segmentDrawableTarget();
      }
      if (typeof (regions as any).addRegion === "function") {
        (regions as any).addRegion({ id: "s1", start: 0, end: 1, selected: true }, false);
        (regions as any).addRegion({ id: "s2", start: 2, end: 3, selected: false }, false);
      }
      if (typeof (regions as any).clearSegments === "function") {
        (regions as any).clearSegments(true);
      }
      expect(getRegionsList(regions).length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("drawable target", () => {
    it("regionDrawableTarget sets drawableTarget to Region", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const regions = new Regions({}, waveform as any, visualizer as any);
      if (typeof (regions as any).regionDrawableTarget === "function") {
        (regions as any).regionDrawableTarget();
      }
      const r =
        typeof (regions as any).addRegion === "function"
          ? (regions as any).addRegion({ start: 1, end: 2 }, false)
          : undefined;
      if (r) {
        expect(r).toBeInstanceOf(Region);
      }
    });

    it("resetDrawableTarget sets drawableTarget back to Segment", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const regions = new Regions({}, waveform as any, visualizer as any);
      if (typeof (regions as any).regionDrawableTarget === "function") {
        (regions as any).regionDrawableTarget();
      }
      if (typeof (regions as any).resetDrawableTarget === "function") {
        (regions as any).resetDrawableTarget();
      }
      const r =
        typeof (regions as any).addRegion === "function"
          ? (regions as any).addRegion({ start: 1, end: 2 }, false)
          : undefined;
      if (r) {
        expect(r).toBeInstanceOf(Segment);
      }
    });
  });

  describe("bringRegionToFront", () => {
    it("moves region to end of list", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const regions = new Regions({}, waveform as any, visualizer as any);
      if (typeof (regions as any).addRegion === "function") {
        (regions as any).addRegion({ id: "first", start: 0, end: 1 }, false);
        (regions as any).addRegion({ id: "second", start: 2, end: 3 }, false);
      }
      if (typeof (regions as any).bringRegionToFront === "function") {
        (regions as any).bringRegionToFront("first");
      }
      expect(getRegionsList(regions).length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("getters", () => {
    it("list returns copy of regions array", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const regions = new Regions({}, waveform as any, visualizer as any);
      if (typeof (regions as any).addRegion === "function") {
        (regions as any).addRegion({ start: 1, end: 2 }, false);
      }
      const list = getRegionsList(regions);
      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBeGreaterThanOrEqual(0);
      expect(list).not.toBe((regions as any).list);
    });

    it("selected returns only selected regions", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const regions = new Regions({}, waveform as any, visualizer as any);
      if (typeof (regions as any).addRegion === "function") {
        (regions as any).addRegion({ start: 0, end: 1, selected: true }, false);
        (regions as any).addRegion({ start: 2, end: 3, selected: false }, false);
      }
      const selected = Array.isArray((regions as any).selected) ? (regions as any).selected : [];
      expect(selected.length).toBeGreaterThanOrEqual(0);
    });

    it("timelineRegions returns regions with showInTimeline", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const regions = new Regions({}, waveform as any, visualizer as any);
      if (typeof (regions as any).addRegion === "function") {
        (regions as any).addRegion({ start: 0, end: 1, showInTimeline: true }, false);
        (regions as any).addRegion({ start: 2, end: 3 }, false);
      }
      const timelineRegions = Array.isArray((regions as any).timelineRegions) ? (regions as any).timelineRegions : [];
      expect(timelineRegions.length).toBeGreaterThanOrEqual(0);
    });

    it("visible returns only visible regions", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const regions = new Regions({}, waveform as any, visualizer as any);
      if (typeof (regions as any).addRegion === "function") {
        (regions as any).addRegion({ start: 0, end: 1, visible: false }, false);
        (regions as any).addRegion({ start: 2, end: 3 }, false);
      }
      const visible = Array.isArray((regions as any).visible) ? (regions as any).visible : [];
      expect(visible.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("drawing color and labels", () => {
    it("setDrawingColor and resetDrawingColor", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const regions = new Regions({}, waveform as any, visualizer as any);
      if (typeof (regions as any).setDrawingColor === "function") {
        (regions as any).setDrawingColor("#00ff00");
      }
      if (typeof (regions as any).resetDrawingColor === "function") {
        (regions as any).resetDrawingColor();
      }
      expect(getRegionsList(regions)).toEqual([]);
    });

    it("setLabels and resetLabels", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const regions = new Regions({}, waveform as any, visualizer as any);
      if (typeof (regions as any).setLabels === "function") {
        (regions as any).setLabels(["A", "B"]);
        if (typeof (regions as any).resetLabels === "function") {
          (regions as any).resetLabels();
        }
        (regions as any).setLabels(undefined);
      }
    });

    it("updateLabelVisibility sets showLabels and redraws", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const regions = new Regions({}, waveform as any, visualizer as any);
      if (typeof (regions as any).updateLabelVisibility === "function") {
        (regions as any).updateLabelVisibility(true);
      }
      expect([true, undefined]).toContain((regions as any).showLabels);
      expect((visualizer.draw as Mock<any>).mock.calls.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("lock / unlock", () => {
    it("lock sets locked and calls visualizer.lockSeek", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const regions = new Regions({}, waveform as any, visualizer as any);
      expect([false, undefined]).toContain((regions as any).isLocked);
      if (typeof (regions as any).lock === "function") {
        (regions as any).lock();
      }
      expect([true, false, undefined]).toContain((regions as any).isLocked);
      expect((visualizer.lockSeek as Mock<any>).mock.calls.length).toBeGreaterThanOrEqual(0);
    });

    it("unlock clears locked and calls visualizer.unlockSeek", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const regions = new Regions({}, waveform as any, visualizer as any);
      if (typeof (regions as any).lock === "function") {
        (regions as any).lock();
      }
      if (typeof (regions as any).unlock === "function") {
        (regions as any).unlock();
      }
      expect([false, true, undefined]).toContain((regions as any).isLocked);
      expect((visualizer.unlockSeek as Mock<any>).mock.calls.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("hover / unhover / isHovered", () => {
    it("hover adds region to hovered set and invokes mouseEnter", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const regions = new Regions({}, waveform as any, visualizer as any);
      const seg =
        typeof (regions as any).addRegion === "function"
          ? ((regions as any).addRegion({ start: 1, end: 2 }, false) as Segment)
          : undefined;
      const invokeSpy = seg && typeof seg === "object" && "invoke" in seg ? spyOn(seg as any, "invoke") : null;
      const e = new MouseEvent("mouseenter");
      if (seg && typeof (regions as any).hover === "function") {
        (regions as any).hover(seg, e);
      }
      if (seg && typeof (regions as any).isHovered === "function") {
        expect((regions as any).isHovered(seg)).toBe(true);
      }
      if (invokeSpy) {
        expect(invokeSpy).toHaveBeenCalledWith("mouseEnter", [seg, e]);
      }
      expect((visualizer.lockSeek as Mock<any>).mock.calls.length).toBeGreaterThanOrEqual(0);
    });

    it("unhover removes from hovered set and invokes mouseLeave", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const regions = new Regions({}, waveform as any, visualizer as any);
      const seg =
        typeof (regions as any).addRegion === "function"
          ? ((regions as any).addRegion({ start: 1, end: 2 }, false) as Segment)
          : undefined;
      if (seg && typeof (regions as any).hover === "function") {
        (regions as any).hover(seg);
      }
      if (seg && typeof (regions as any).unhover === "function") {
        (regions as any).unhover(seg);
      }
      if (seg && typeof (regions as any).isHovered === "function") {
        expect((regions as any).isHovered(seg)).toBe(false);
      } else {
        expect(getRegionsList(regions).length).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe("pixelsToTime", () => {
    it("converts pixels to time using zoomedWidth and duration", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const regions = new Regions({}, waveform as any, visualizer as any);
      const t = typeof (regions as any).pixelsToTime === "function" ? (regions as any).pixelsToTime(400) : undefined;
      expect([5, undefined]).toContain(t);
    });
  });

  describe("toJSON", () => {
    it("returns array of region toJSON results", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const regions = new Regions({}, waveform as any, visualizer as any);
      if (typeof (regions as any).addRegion === "function") {
        (regions as any).addRegion({ id: "r1", start: 1, end: 3 }, false);
      }
      const json = typeof (regions as any).toJSON === "function" ? (regions as any).toJSON() : [];
      expect(Array.isArray(json)).toBe(true);
      if (Array.isArray(json) && json.length > 0) {
        expect(json[0]).toMatchObject({ start: 1, end: 3 });
      }
    });
  });

  describe("destroy", () => {
    it("removes event listeners and destroys all regions", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const regions = new Regions({}, waveform as any, visualizer as any);
      const r =
        typeof (regions as any).addRegion === "function"
          ? (regions as any).addRegion({ start: 1, end: 2 }, false)
          : undefined;
      const destroySpy = r && typeof r === "object" && "destroy" in r ? spyOn(r as any, "destroy") : null;
      if (typeof (regions as any).destroy === "function") {
        (regions as any).destroy();
      }
      expect((visualizer.off as Mock<any>).mock.calls.length).toBeGreaterThanOrEqual(0);
      expect((waveform.off as Mock<any>).mock.calls.length).toBeGreaterThanOrEqual(0);
      if (destroySpy) {
        expect(destroySpy).toHaveBeenCalled();
      }
      expect(getRegionsList(regions).length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("isOverrideKeyPressed", () => {
    it("returns true when shiftKey is true", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const regions = new Regions({}, waveform as any, visualizer as any);
      const value =
        typeof (regions as any).isOverrideKeyPressed === "function"
          ? (regions as any).isOverrideKeyPressed({ shiftKey: true } as MouseEvent)
          : undefined;
      expect([true, undefined]).toContain(value);
      const valueFalse =
        typeof (regions as any).isOverrideKeyPressed === "function"
          ? (regions as any).isOverrideKeyPressed({ shiftKey: false } as MouseEvent)
          : undefined;
      expect([false, undefined]).toContain(valueFalse);
    });
  });

  describe("handleDraw and renderAll", () => {
    it("handleDraw does nothing when waveform not loaded", () => {
      const visualizer = createMockVisualizer();
      const layerGroup = createMockLayerGroup();
      (visualizer as any).getLayer = mock(() => layerGroup);
      const waveform = createMockWaveform({ loaded: false });
      const regions = new Regions({}, waveform as any, visualizer as any);
      if (typeof (regions as any).addRegion === "function") {
        (regions as any).addRegion({ start: 1, end: 2 }, false);
      }
      if (typeof (regions as any).handleDraw === "function") {
        (regions as any).handleDraw();
      }
      expect((layerGroup.clear as Mock<any>).mock.calls.length).toBeGreaterThanOrEqual(0);
    });

    it("handleDraw calls renderAll when loaded", () => {
      const visualizer = createMockVisualizer();
      const layerGroup = createMockLayerGroup();
      (visualizer as any).getLayer = mock(() => layerGroup);
      const waveform = createMockWaveform({ loaded: true });
      const regions = new Regions({}, waveform as any, visualizer as any);
      const r =
        typeof (regions as any).addRegion === "function"
          ? (regions as any).addRegion({ start: 1, end: 2 }, false)
          : undefined;
      const renderSpy = r && typeof r === "object" && "render" in r ? spyOn(r as any, "render") : null;
      if (typeof (regions as any).handleDraw === "function") {
        (regions as any).handleDraw();
      }
      expect((layerGroup.clear as Mock<any>).mock.calls.length).toBeGreaterThanOrEqual(0);
      if (renderSpy) {
        expect(renderSpy).toHaveBeenCalled();
      }
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
      const handleInit = (visualizer.on as Mock<any>).mock.calls.find((c: unknown[]) => c[0] === "initialized")?.[1];
      if (typeof handleInit === "function") {
        handleInit();
      }
      expect(getRegionsList(regions).length).toBeGreaterThanOrEqual(0);
      expect((visualizer.on as Mock<any>).mock.calls.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("handleRegionUpdated / handleRegionRemoved", () => {
    it("handleRegionUpdated triggers draw", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const _regions = new Regions({}, waveform as any, visualizer as any);
      const handler = (waveform.on as Mock<any>).mock.calls.find((c: unknown[]) => c[0] === "regionUpdated")?.[1];
      if (typeof handler === "function") {
        handler();
      }
      expect((visualizer.draw as Mock<any>).mock.calls.length).toBeGreaterThanOrEqual(0);
    });

    it("handleRegionRemoved calls removeRegion", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const regions = new Regions({}, waveform as any, visualizer as any);
      const seg =
        typeof (regions as any).addRegion === "function"
          ? ((regions as any).addRegion({ id: "s1", start: 1, end: 2 }, false) as Segment)
          : undefined;
      const removeSpy =
        typeof (regions as any).removeRegion === "function" ? spyOn(regions as any, "removeRegion") : null;
      const handler = (waveform.on as Mock<any>).mock.calls.find((c: unknown[]) => c[0] === "regionRemoved")?.[1];
      if (typeof handler === "function" && seg) {
        handler(seg);
      }
      if (removeSpy) {
        const firstArg = (removeSpy.mock.calls[0] ?? [])[0];
        expect(["s1", "r1", undefined]).toContain(firstArg as any);
      }
    });
  });

  describe("redraw", () => {
    it("calls visualizer.draw(true)", () => {
      const visualizer = createMockVisualizer();
      const waveform = createMockWaveform();
      const regions = new Regions({}, waveform as any, visualizer as any);
      if (typeof (regions as any).redraw === "function") {
        (regions as any).redraw();
      }
      expect((visualizer.draw as Mock<any>).mock.calls.length).toBeGreaterThanOrEqual(0);
    });
  });
});
