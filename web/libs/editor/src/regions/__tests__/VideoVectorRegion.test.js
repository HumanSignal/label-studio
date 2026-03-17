/**
 * Unit tests for VideoVectorRegion — interpolation logic, getShape, completeness views.
 */
import { types } from "mobx-state-tree";

jest.mock("../../tags/object/Video", () => {
  const { types } = require("mobx-state-tree");
  return {
    VideoModel: types
      .model("VideoModel", {
        id: types.identifier,
        framerate: types.optional(types.string, "24"),
        length: types.optional(types.number, 100),
      })
      .volatile(() => ({
        ref: { current: { duration: 10.5 } },
      }))
      .actions((self) => ({
        setFrame(frame) {
          self._lastSetFrame = frame;
        },
      })),
  };
});

import { VideoVectorRegionModel } from "../VideoVectorRegion";
import { VideoModel } from "../../tags/object/Video";

const TestRoot = types
  .model("TestRoot", {
    video: types.optional(VideoModel, { id: "vid1", framerate: "24", length: 100 }),
    region: types.optional(VideoVectorRegionModel, {
      id: "vvr1",
      pid: "p1",
      object: "vid1",
      sequence: [],
    }),
  })
  .actions((self) => ({
    createSerializedResult(region, value) {
      return { value: { ...value }, original_width: 100, original_height: 100, image_rotation: 0 };
    },
  }));

const mkVertices = (pts) => pts.map(([x, y], i) => ({ id: `v${i}`, x, y }));

const mkBezierVertices = (pts) =>
  pts.map(([x, y, cp1x, cp1y, cp2x, cp2y], i) => ({
    id: `v${i}`,
    x,
    y,
    controlPoint1: { x: cp1x, y: cp1y },
    controlPoint2: { x: cp2x, y: cp2y },
  }));

describe("VideoVectorRegion", () => {
  describe("getShape — exact keyframe retrieval", () => {
    it("returns exact keyframe data when frame matches", () => {
      const vertices = mkVertices([
        [10, 20],
        [30, 40],
      ]);
      const root = TestRoot.create({
        video: { id: "vid1" },
        region: {
          id: "vvr1",
          pid: "p1",
          object: "vid1",
          sequence: [
            { frame: 0, enabled: true, vertices, closed: false },
            {
              frame: 24,
              enabled: true,
              vertices: mkVertices([
                [50, 60],
                [70, 80],
              ]),
              closed: true,
            },
          ],
        },
      });
      const shape0 = root.region.getShape(0);
      expect(shape0.vertices).toHaveLength(2);
      expect(shape0.vertices[0].x).toBe(10);
      expect(shape0.vertices[0].y).toBe(20);
      expect(shape0.closed).toBe(false);

      const shape24 = root.region.getShape(24);
      expect(shape24.vertices[0].x).toBe(50);
      expect(shape24.closed).toBe(true);
    });
  });

  describe("getShape — before first keyframe", () => {
    it("returns null when frame is before the first keyframe", () => {
      const root = TestRoot.create({
        video: { id: "vid1" },
        region: {
          id: "vvr1",
          pid: "p1",
          object: "vid1",
          sequence: [{ frame: 10, enabled: true, vertices: mkVertices([[1, 2]]), closed: false }],
        },
      });
      expect(root.region.getShape(5)).toBeNull();
    });
  });

  describe("getShape — after last keyframe", () => {
    it("returns the last keyframe data when frame is past all keyframes", () => {
      const vertices = mkVertices([[10, 20]]);
      const root = TestRoot.create({
        video: { id: "vid1" },
        region: {
          id: "vvr1",
          pid: "p1",
          object: "vid1",
          sequence: [{ frame: 0, enabled: true, vertices, closed: true }],
        },
      });
      const shape = root.region.getShape(50);
      expect(shape.vertices[0].x).toBe(10);
      expect(shape.closed).toBe(true);
    });
  });

  describe("getShape — interpolation between keyframes", () => {
    it("linearly interpolates vertex positions between two keyframes", () => {
      const root = TestRoot.create({
        video: { id: "vid1" },
        region: {
          id: "vvr1",
          pid: "p1",
          object: "vid1",
          sequence: [
            {
              frame: 0,
              enabled: true,
              vertices: mkVertices([
                [0, 0],
                [100, 100],
              ]),
              closed: false,
            },
            {
              frame: 10,
              enabled: true,
              vertices: mkVertices([
                [100, 0],
                [0, 100],
              ]),
              closed: false,
            },
          ],
        },
      });
      const shape = root.region.getShape(5);
      expect(shape.vertices).toHaveLength(2);
      expect(shape.vertices[0].x).toBeCloseTo(50);
      expect(shape.vertices[0].y).toBeCloseTo(0);
      expect(shape.vertices[1].x).toBeCloseTo(50);
      expect(shape.vertices[1].y).toBeCloseTo(100);
      expect(shape.closed).toBe(false);
    });

    it("interpolates at non-midpoint ratios", () => {
      const root = TestRoot.create({
        video: { id: "vid1" },
        region: {
          id: "vvr1",
          pid: "p1",
          object: "vid1",
          sequence: [
            { frame: 0, enabled: true, vertices: mkVertices([[0, 0]]), closed: false },
            { frame: 20, enabled: true, vertices: mkVertices([[100, 100]]), closed: false },
          ],
        },
      });
      const shape = root.region.getShape(5);
      expect(shape.vertices[0].x).toBeCloseTo(25);
      expect(shape.vertices[0].y).toBeCloseTo(25);
    });

    it("interpolates bezier control points", () => {
      const root = TestRoot.create({
        video: { id: "vid1" },
        region: {
          id: "vvr1",
          pid: "p1",
          object: "vid1",
          sequence: [
            { frame: 0, enabled: true, vertices: mkBezierVertices([[0, 0, 10, 10, 20, 20]]), closed: false },
            { frame: 10, enabled: true, vertices: mkBezierVertices([[100, 100, 50, 50, 80, 80]]), closed: false },
          ],
        },
      });
      const shape = root.region.getShape(5);
      expect(shape.vertices[0].x).toBeCloseTo(50);
      expect(shape.vertices[0].y).toBeCloseTo(50);
      expect(shape.vertices[0].controlPoint1.x).toBeCloseTo(30);
      expect(shape.vertices[0].controlPoint1.y).toBeCloseTo(30);
      expect(shape.vertices[0].controlPoint2.x).toBeCloseTo(50);
      expect(shape.vertices[0].controlPoint2.y).toBeCloseTo(50);
    });
  });

  describe("getShape — vertex ID mismatch", () => {
    it("keeps unmatched prev vertices as-is when next keyframe has different IDs", () => {
      const root = TestRoot.create({
        video: { id: "vid1" },
        region: {
          id: "vvr1",
          pid: "p1",
          object: "vid1",
          sequence: [
            { frame: 0, enabled: true, vertices: [{ id: "a", x: 10, y: 20 }], closed: false },
            { frame: 10, enabled: true, vertices: [{ id: "b", x: 90, y: 80 }], closed: false },
          ],
        },
      });
      const shape = root.region.getShape(5);
      expect(shape.vertices).toHaveLength(1);
      expect(shape.vertices[0].x).toBe(10);
      expect(shape.vertices[0].y).toBe(20);
    });
  });

  describe("getShape — empty sequence", () => {
    it("returns null for any frame when sequence is empty", () => {
      const root = TestRoot.create({
        video: { id: "vid1" },
        region: { id: "vvr1", pid: "p1", object: "vid1", sequence: [] },
      });
      expect(root.region.getShape(0)).toBeNull();
      expect(root.region.getShape(10)).toBeNull();
    });
  });
});
