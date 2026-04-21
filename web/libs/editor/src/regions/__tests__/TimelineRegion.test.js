/**
 * Unit tests for TimelineRegion (model serialization).
 *
 * Regression: FIT-1686 — submitting a TimelineLabels annotation produced
 *   "DataCloneError: Failed to execute 'structuredClone' on 'Window':
 *    [object Array] could not be cloned."
 * because `serialize()` returned the MST observable `ranges` array directly.
 * `Annotation.fixBrokenAnnotation` later calls `structuredClone(objRaw)` on the
 * serialized draft; MobX/MST observable arrays are not structured-cloneable.
 */
import { destroy, isStateTreeNode, types } from "mobx-state-tree";

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

    it("returns value.ranges as a plain array (not an MST observable)", () => {
      const { value } = region.serialize();
      expect(Array.isArray(value.ranges)).toBe(true);
      // MST observable arrays are also `isStateTreeNode` — a plain array is not.
      expect(isStateTreeNode(value.ranges)).toBe(false);
    });

    it("returns value.ranges entries as plain objects (not MST nodes)", () => {
      const { value } = region.serialize();
      expect(value.ranges).toHaveLength(2);
      expect(value.ranges[0]).toEqual({ start: 3, end: 5 });
      expect(value.ranges[1]).toEqual({ start: 10, end: 20 });
      for (const range of value.ranges) {
        expect(isStateTreeNode(range)).toBe(false);
      }
    });

    it("produces a payload that is structuredClone-able (root cause of FIT-1686)", () => {
      const serialized = region.serialize();
      expect(() => structuredClone(serialized)).not.toThrow();
      const cloned = structuredClone(serialized);
      expect(cloned.value.ranges).toEqual([
        { start: 3, end: 5 },
        { start: 10, end: 20 },
      ]);
    });
  });
});
