/**
 * Unit tests for TimelineRegion (model serialization).
 *
 * Draft/history uses `Annotation.fixBrokenAnnotation`, which runs `toJS` before
 * `structuredClone` so MST/MobX observables from `serialize()` are safe (FIT-1686).
 */
import { destroy, types } from "mobx-state-tree";
import { toJS } from "mobx";

describe("TimelineRegion", () => {
  let TimelineRegionModel;
  let TestRoot;

  beforeAll(() => {
    require("../../tags/object/Video");
    require("../../stores/RegionStore");
    const mod = require("../TimelineRegion");
    TimelineRegionModel = mod.TimelineRegionModel;

    TestRoot = types
      .model("TestRoot", {
        video: types.optional(require("../../tags/object/Video").VideoModel, {
          id: "vid1",
          name: "vid1",
        }),
        region: types.optional(TimelineRegionModel, {
          id: "tr1",
          pid: "p1",
          object: "vid1",
          ranges: [{ start: 3, end: 5 }],
        }),
      })
      .actions((_self) => ({
        createSerializedResult(_region, value) {
          return { value: { ...value } };
        },
      }));
  });

  describe("serialize()", () => {
    let root;
    let region;

    beforeEach(() => {
      root = TestRoot.create({
        video: { id: "vid1", name: "vid1", framerate: "24" },
        region: {
          id: "tr1",
          pid: "p1",
          object: "vid1",
          ranges: [
            { start: 3, end: 5 },
            { start: 10, end: 20 },
          ],
        },
      });
      region = root.region;
    });

    afterEach(() => {
      if (root) destroy(root);
    });

    it("returns value.ranges with expected frame spans (MobX toJS for comparison)", () => {
      const { value } = region.serialize();
      expect(Array.isArray(value.ranges)).toBe(true);
      expect(toJS(value.ranges)).toEqual([
        { start: 3, end: 5 },
        { start: 10, end: 20 },
      ]);
    });
  });
});
