/**
 * Unit tests for VideoRegion (model views, actions, onlyProps util).
 * VideoRegion is base for VideoRectangleRegion; these tests cover shared logic.
 */
import { types, destroy, unprotect } from "mobx-state-tree";

describe("VideoRegion", () => {
  let onlyProps;
  let VideoRegionModel;
  let VideoRectangleRegionModel;
  let TestRoot;

  beforeAll(() => {
    require("../../tags/object/Video");
    require("../../stores/RegionStore");
    const mod1 = require("../VideoRegion");
    const mod2 = require("../VideoRectangleRegion");
    onlyProps = mod1.onlyProps;
    VideoRegionModel = mod1.VideoRegion;
    VideoRectangleRegionModel = mod2.VideoRectangleRegionModel;

    TestRoot = types
      .model("TestRoot", {
        video: types.optional(require("../../tags/object/Video").VideoModel, {
          id: "vid1",
          name: "vid1",
        }),
        region: types.optional(VideoRectangleRegionModel, {
          id: "vr1",
          pid: "p1",
          object: "vid1",
          sequence: [
            { x: 10, y: 10, width: 50, height: 30, frame: 0, enabled: true },
            { x: 20, y: 20, width: 60, height: 40, frame: 24, enabled: true },
          ],
        }),
      })
      .actions((_self) => ({
        createSerializedResult(_region, value) {
          return { value: { ...value }, original_width: 100, original_height: 100, image_rotation: 0 };
        },
      }));
  });

  describe("onlyProps", () => {
    it("returns object with only requested props", () => {
      const obj = { a: 1, b: 2, c: 3 };
      expect(onlyProps(["a", "c"], obj)).toEqual({ a: 1, c: 3 });
    });

    it("returns empty object when props list is empty", () => {
      expect(onlyProps([], { a: 1 })).toEqual({});
    });
  });

  describe("VideoRegionModel (via VideoRectangleRegionModel)", () => {
    let root;
    let region;

    beforeEach(() => {
      root = TestRoot.create({
        video: { id: "vid1", name: "vid1", framerate: "24" },
        region: {
          id: "vr1",
          pid: "p1",
          object: "vid1",
          sequence: [
            { x: 10, y: 10, width: 50, height: 30, frame: 0, enabled: true },
            { x: 20, y: 20, width: 60, height: 40, frame: 24, enabled: true },
          ],
        },
      });
      region = root.region;
      unprotect(root);
      root.video.length = 100;
      jest.spyOn(root.video, "setFrame").mockImplementation(() => {});
      // @ts-ignore - patching volatile for testing
      root.video.ref = { current: { duration: 10.5 } };
    });

    afterEach(() => {
      if (root) destroy(root);
    });

    it("serialize returns value with framesCount, duration, sequence with time from frame/framerate", () => {
      const result = region.serialize();
      expect(result.value.framesCount).toBe(100);
      expect(result.value.duration).toBe(10.5);
      expect(result.value.sequence).toHaveLength(2);
      expect(result.value.sequence[0]).toMatchObject({ frame: 0, time: 0 });
      expect(result.value.sequence[1]).toMatchObject({ frame: 24, time: 1 });
    });

    it("closestKeypoint returns last keypoint with frame <= targetFrame", () => {
      expect(region.closestKeypoint(12).frame).toBe(0);
      expect(region.closestKeypoint(24).frame).toBe(24);
    });

    it("closestKeypoint with onlyPrevious true returns last keypoint with frame <= target or undefined", () => {
      expect(region.closestKeypoint(12, true).frame).toBe(0);
      // No keypoint with frame <= targetFrame when target is before first keypoint
      const afterFirst = TestRoot.create({
        video: { id: "vid2", name: "vid2", framerate: "24" },
        region: {
          id: "vr2",
          pid: "p2",
          object: "vid2",
          sequence: [{ x: 0, y: 0, width: 10, height: 10, frame: 24, enabled: true }],
        },
      });
      expect(afterFirst.region.closestKeypoint(10, true)).toBeUndefined();
      destroy(afterFirst);
    });

    it("closestKeypoint returns next keypoint when targetFrame before first", () => {
      expect(region.closestKeypoint(0, false).frame).toBe(0);
    });

    it("isInLifespan returns true when keypoint enabled", () => {
      expect(region.isInLifespan(12)).toBe(true);
    });

    it("isInLifespan returns false when no keypoint", () => {
      const emptyRoot = TestRoot.create({
        video: { id: "vid2", name: "vid2", framerate: "24" },
        region: { id: "vr2", pid: "p2", object: "vid2", sequence: [] },
      });
      expect(emptyRoot.region.isInLifespan(0)).toBe(false);
      destroy(emptyRoot);
    });

    it("isInLifespan returns true for exact frame when keypoint disabled", () => {
      region.toggleLifespan(0);
      expect(region.sequence[0].enabled).toBe(false);
      expect(region.isInLifespan(0)).toBe(true);
    });

    it("toggleLifespan flips enabled for closest keypoint", () => {
      expect(region.sequence[0].enabled).toBe(true);
      region.toggleLifespan(0);
      expect(region.sequence[0].enabled).toBe(false);
      region.toggleLifespan(0);
      expect(region.sequence[0].enabled).toBe(true);
    });

    it("removeKeypoint removes keypoint at frame", () => {
      region.removeKeypoint(24);
      expect(region.sequence).toHaveLength(1);
      expect(region.sequence[0].frame).toBe(0);
    });

    it("onSelectInOutliner calls object.setFrame with first frame", () => {
      region.onSelectInOutliner();
      expect(root.video.setFrame).toHaveBeenCalledWith(0);
    });

    it("getVisibility returns true", () => {
      expect(region.getVisibility()).toBe(true);
    });
  });

  describe("base VideoRegion getShape/updateShape", () => {
    let BaseVideoRoot;

    beforeAll(() => {
      BaseVideoRoot = types.model("BaseVideoRoot", {
        video: types.optional(require("../../tags/object/Video").VideoModel, {
          id: "vid1",
          name: "vid1",
          framerate: "24",
        }),
        region: types.optional(VideoRegionModel, {
          id: "vr1",
          pid: "p1",
          object: "vid1",
          sequence: [{ frame: 0, enabled: true }],
        }),
      });
    });

    it("getShape throws (must be implemented on shape level)", () => {
      const root = BaseVideoRoot.create({
        video: { id: "vid1", name: "vid1" },
        region: { id: "vr1", pid: "p1", object: "vid1", sequence: [{ frame: 0, enabled: true }] },
      });
      expect(() => root.region.getShape()).toThrow("Method getShape be implemented on a shape level");
      destroy(root);
    });

    it("updateShape throws (must be implemented on shape level)", () => {
      const root = BaseVideoRoot.create({
        video: { id: "vid1", name: "vid1" },
        region: { id: "vr1", pid: "p1", object: "vid1", sequence: [{ frame: 0, enabled: true }] },
      });
      expect(() => root.region.updateShape()).toThrow("Method updateShape must be implemented on a shape level");
      destroy(root);
    });
  });

  describe("preProcessSnapshot", () => {
    it("uses value.sequence when sequence missing in snapshot", () => {
      const root = TestRoot.create({
        video: { id: "vid1", name: "vid1" },
        region: {
          id: "vr1",
          pid: "p1",
          object: "vid1",
          value: { sequence: [{ frame: 5, enabled: true }] },
        },
      });
      expect(root.region.sequence).toHaveLength(1);
      expect(root.region.sequence[0].frame).toBe(5);
      destroy(root);
    });
  });
});
