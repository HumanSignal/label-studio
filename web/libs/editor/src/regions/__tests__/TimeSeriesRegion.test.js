/**
 * Unit tests for TimeSeriesRegion (model views and actions).
 * Covers parent, getRegionElement, grow/shrink, selectRegion, afterUnselectRegion,
 * updateRegion, afterCreate (string start/end), serialize (numeric and timeformat).
 */
import { types } from "mobx-state-tree";

mockModule("../../core/Hotkey", () => {
  const hotkeyApi = {
    keymap: {},
  };

  hotkeyApi.Hotkey = () => ({
    addNamed: mock((name, callback) => {
      hotkeyApi.keymap[name] = callback ?? mock();
    }),
    removeNamed: mock((name) => {
      delete hotkeyApi.keymap[name];
    }),
  });
  hotkeyApi.Hotkey.keymap = hotkeyApi.keymap;
  hotkeyApi.Hotkey.setScope = mock();
  hotkeyApi.Hotkey.DEFAULT_SCOPE = "all";

  return {
    __esModule: true,
    __skipMerge: true,
    ...hotkeyApi,
    default: {
      DEFAULT_SCOPE: hotkeyApi.Hotkey.DEFAULT_SCOPE,
      Hotkey: hotkeyApi.Hotkey,
    },
  };
});

import { TimeSeriesRegionModel } from "../TimeSeriesRegion";
import { TimeSeriesModel } from "../../tags/object/TimeSeries";

const TestRoot = types
  .model("TestRoot", {
    timeseries: TimeSeriesModel,
    region: types.optional(TimeSeriesRegionModel, {
      id: "r1",
      pid: "p1",
      object: "ts1",
      start: 0,
      end: 100,
      results: [],
    }),
  })
  .volatile(() => ({
    task: { dataObj: {} },
    annotationStore: {
      initialized: true,
      selected: {},
      root: {},
      names: [],
      addErrors: mock(),
    },
  }));

const createRoot = (region = {}, timeformat = "") =>
  TestRoot.create(
    {
      timeseries: {
        name: "ts1",
        value: "$timeseries",
        sync: "video1",
        defaultwidth: "100%",
        timecolumn: "time",
        timeformat,
        children: [],
      },
      region: {
        id: "r1",
        pid: "p1",
        object: "ts1",
        start: 0,
        end: 100,
        results: [],
        ...region,
      },
    },
    {
      events: { addNamed: mock(), removeNamed: mock() },
      syncManager: { syncSend: mock() },
      messages: {},
    },
  );

describe("TimeSeriesRegion", () => {
  describe("TimeSeriesRegionModel", () => {
    it("parent view returns object when alive", () => {
      const root = createRoot();
      expect(root.region.parent).toBe(root.timeseries);
    });

    it("getRegionElement returns _brushRef", () => {
      const root = createRoot();
      const ref = {};
      root.region._brushRef = ref;
      expect(root.region.getRegionElement()).toBe(ref);
    });

    it("growRight increases end by size", () => {
      const root = createRoot({ start: 10, end: 50 });
      root.region.growRight(5);
      expect(root.region.end).toBe(55);
    });

    it("growLeft decreases start by size", () => {
      const root = createRoot({ start: 10, end: 50 });
      root.region.growLeft(3);
      expect(root.region.start).toBe(7);
    });

    it("shrinkRight decreases end by size", () => {
      const root = createRoot({ start: 10, end: 50 });
      root.region.shrinkRight(5);
      expect(root.region.end).toBe(45);
    });

    it("shrinkLeft increases start by size", () => {
      const root = createRoot({ start: 10, end: 50 });
      root.region.shrinkLeft(2);
      expect(root.region.start).toBe(12);
    });

    it("selectRegion calls parent.scrollToRegion", () => {
      const root = createRoot();
      const scrollToRegionSpy = spyOn(root.timeseries, "scrollToRegion");
      root.region.selectRegion();
      expect(scrollToRegionSpy).toHaveBeenCalledWith(root.region);
    });

    it("afterUnselectRegion calls parent.updateView", () => {
      const root = createRoot();
      const updateViewSpy = spyOn(root.timeseries, "updateView");
      root.region.afterUnselectRegion();
      expect(updateViewSpy).toHaveBeenCalled();
    });

    it("updateRegion sets start and end and calls notifyDrawingFinished", () => {
      const root = createRoot();
      const spy = spyOn(root.region, "notifyDrawingFinished");
      root.region.updateRegion(20, 80);
      expect(root.region.start).toBe(20);
      expect(root.region.end).toBe(80);
      expect(spy).toHaveBeenCalled();
    });

    it("afterCreate parses string start/end via parent.parseTime", () => {
      const root = createRoot({ start: "100", end: "200" });
      expect(root.region.start).toBe(100);
      expect(root.region.end).toBe(200);
    });

    it("serialize returns value with start, end, instant (numeric, no timeformat)", () => {
      const root = createRoot({ start: 10, end: 90, instant: false }, "");
      const result = root.region.serialize();
      expect(result.value).toEqual({
        start: 10,
        end: 90,
        instant: false,
      });
    });

    it("serialize uses parent.timeformat when set (d3.utcFormat)", () => {
      const root = createRoot({ start: 0, end: 100, instant: true }, "%Y-%m-%d");
      const result = root.region.serialize();
      expect(result.value.instant).toBe(true);
      expect(typeof result.value.start).toBe("string");
      expect(typeof result.value.end).toBe("string");
    });

    it("updateAppearenceFromState does nothing when labelsState is falsy", () => {
      const root = createRoot();
      expect(() => root.region.updateAppearenceFromState()).not.toThrow();
    });

    it("updateAppearenceFromState calls parent.updateView when labelsState is set", () => {
      const root = createRoot();
      const updateViewSpy = spyOn(root.timeseries, "updateView");
      root.region.labelsState = {};
      root.region.updateAppearenceFromState();
      expect(updateViewSpy).toHaveBeenCalled();
    });
  });
});
