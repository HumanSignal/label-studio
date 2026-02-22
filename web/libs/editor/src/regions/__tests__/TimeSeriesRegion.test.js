/**
 * Unit tests for TimeSeriesRegion (model views and actions).
 * Covers parent, getRegionElement, grow/shrink, selectRegion, afterUnselectRegion,
 * updateRegion, afterCreate (string start/end), serialize (numeric and timeformat).
 */
import { types } from "mobx-state-tree";

jest.mock("../../core/Hotkey", () => ({
  Hotkey: () => ({
    addNamed: jest.fn(),
    removeNamed: jest.fn(),
  }),
}));

jest.mock("../../tags/object/TimeSeries", () => {
  const { types: t } = require("mobx-state-tree");
  return {
    TimeSeriesModel: t
      .model("TimeSeriesModel", {
        id: t.identifier,
        timeformat: t.optional(t.string, ""),
      })
      .actions((self) => ({
        parseTime(val) {
          return typeof val === "string" ? Number(val) : val;
        },
      }))
      .volatile(() => ({
        scrollToRegion: jest.fn(),
        updateView: jest.fn(),
      })),
  };
});

import { TimeSeriesRegionModel } from "../TimeSeriesRegion";
import { TimeSeriesModel } from "../../tags/object/TimeSeries";

const TestRoot = types.model("TestRoot", {
  timeseries: types.optional(TimeSeriesModel, { id: "ts1", timeformat: "" }),
  region: types.optional(TimeSeriesRegionModel, {
    id: "r1",
    pid: "p1",
    object: "ts1",
    start: 0,
    end: 100,
    results: [],
  }),
});

describe("TimeSeriesRegion", () => {
  describe("TimeSeriesRegionModel", () => {
    it("parent view returns object when alive", () => {
      const root = TestRoot.create({
        timeseries: { id: "ts1", timeformat: "" },
        region: { id: "r1", pid: "p1", object: "ts1", start: 0, end: 100, results: [] },
      });
      expect(root.region.parent).toBe(root.timeseries);
    });

    it("getRegionElement returns _brushRef", () => {
      const root = TestRoot.create({
        timeseries: { id: "ts1" },
        region: { id: "r1", pid: "p1", object: "ts1", start: 0, end: 100, results: [] },
      });
      const ref = {};
      root.region._brushRef = ref;
      expect(root.region.getRegionElement()).toBe(ref);
    });

    it("growRight increases end by size", () => {
      const root = TestRoot.create({
        timeseries: { id: "ts1" },
        region: { id: "r1", pid: "p1", object: "ts1", start: 10, end: 50, results: [] },
      });
      root.region.growRight(5);
      expect(root.region.end).toBe(55);
    });

    it("growLeft decreases start by size", () => {
      const root = TestRoot.create({
        timeseries: { id: "ts1" },
        region: { id: "r1", pid: "p1", object: "ts1", start: 10, end: 50, results: [] },
      });
      root.region.growLeft(3);
      expect(root.region.start).toBe(7);
    });

    it("shrinkRight decreases end by size", () => {
      const root = TestRoot.create({
        timeseries: { id: "ts1" },
        region: { id: "r1", pid: "p1", object: "ts1", start: 10, end: 50, results: [] },
      });
      root.region.shrinkRight(5);
      expect(root.region.end).toBe(45);
    });

    it("shrinkLeft increases start by size", () => {
      const root = TestRoot.create({
        timeseries: { id: "ts1" },
        region: { id: "r1", pid: "p1", object: "ts1", start: 10, end: 50, results: [] },
      });
      root.region.shrinkLeft(2);
      expect(root.region.start).toBe(12);
    });

    it("selectRegion calls parent.scrollToRegion", () => {
      const root = TestRoot.create({
        timeseries: { id: "ts1" },
        region: { id: "r1", pid: "p1", object: "ts1", start: 0, end: 100, results: [] },
      });
      root.region.selectRegion();
      expect(root.timeseries.scrollToRegion).toHaveBeenCalledWith(root.region);
    });

    it("afterUnselectRegion calls parent.updateView", () => {
      const root = TestRoot.create({
        timeseries: { id: "ts1" },
        region: { id: "r1", pid: "p1", object: "ts1", start: 0, end: 100, results: [] },
      });
      root.region.afterUnselectRegion();
      expect(root.timeseries.updateView).toHaveBeenCalled();
    });

    it("updateRegion sets start and end and calls notifyDrawingFinished", () => {
      const root = TestRoot.create({
        timeseries: { id: "ts1" },
        region: { id: "r1", pid: "p1", object: "ts1", start: 0, end: 100, results: [] },
      });
      const spy = jest.spyOn(root.region, "notifyDrawingFinished");
      root.region.updateRegion(20, 80);
      expect(root.region.start).toBe(20);
      expect(root.region.end).toBe(80);
      expect(spy).toHaveBeenCalled();
    });

    it("afterCreate parses string start/end via parent.parseTime", () => {
      const root = TestRoot.create({
        timeseries: { id: "ts1" },
        region: {
          id: "r1",
          pid: "p1",
          object: "ts1",
          start: "100",
          end: "200",
          results: [],
        },
      });
      expect(root.region.start).toBe(100);
      expect(root.region.end).toBe(200);
    });

    it("serialize returns value with start, end, instant (numeric, no timeformat)", () => {
      const root = TestRoot.create({
        timeseries: { id: "ts1", timeformat: "" },
        region: {
          id: "r1",
          pid: "p1",
          object: "ts1",
          start: 10,
          end: 90,
          instant: false,
          results: [],
        },
      });
      const result = root.region.serialize();
      expect(result.value).toEqual({
        start: 10,
        end: 90,
        instant: false,
      });
    });

    it("serialize uses parent.timeformat when set (d3.utcFormat)", () => {
      const root = TestRoot.create({
        timeseries: { id: "ts1", timeformat: "%Y-%m-%d" },
        region: {
          id: "r1",
          pid: "p1",
          object: "ts1",
          start: 0,
          end: 100,
          instant: true,
          results: [],
        },
      });
      const result = root.region.serialize();
      expect(result.value.instant).toBe(true);
      expect(typeof result.value.start).toBe("string");
      expect(typeof result.value.end).toBe("string");
    });

    it("updateAppearenceFromState does nothing when labelsState is falsy", () => {
      const root = TestRoot.create({
        timeseries: { id: "ts1" },
        region: { id: "r1", pid: "p1", object: "ts1", start: 0, end: 100, results: [] },
      });
      expect(() => root.region.updateAppearenceFromState()).not.toThrow();
    });

    it("updateAppearenceFromState calls parent.updateView when labelsState is set", () => {
      const root = TestRoot.create({
        timeseries: { id: "ts1" },
        region: { id: "r1", pid: "p1", object: "ts1", start: 0, end: 100, results: [] },
      });
      root.region.labelsState = {};
      root.region.updateAppearenceFromState();
      expect(root.timeseries.updateView).toHaveBeenCalled();
    });
  });
});
