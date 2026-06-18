/**
 * Unit tests for VideoVectorRegion — interpolation logic, getShape, completeness views.
 */
import { types } from "mobx-state-tree";

mockModule("../../tags/object/Video", () => {
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

const mkVertices = (pts) => pts.map(([x, y], i) => ({ id: `v${i}`, x, y }));

describe("VideoVectorRegion", () => {
  let VideoVectorRegionModel;
  let VideoModel;
  let TestRoot;

  beforeAll(() => {
    VideoVectorRegionModel = require("../VideoVectorRegion").VideoVectorRegionModel;
    VideoModel = require("../../tags/object/Video").VideoModel;

    TestRoot = types
      .model("TestRoot", {
        video: types.optional(VideoModel, { id: "vid1", framerate: "24", length: 100 }),
        region: types.optional(VideoVectorRegionModel, {
          id: "vvr1",
          pid: "p1",
          object: "vid1",
          sequence: [],
        }),
      })
      .actions((_self) => ({
        createSerializedResult(_region, value) {
          return { value: { ...value }, original_width: 100, original_height: 100, image_rotation: 0 };
        },
      }));
  });

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

    it("interpolates at quarter ratio", () => {
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
      const shape = root.region.getShape(15);
      expect(shape.vertices[0].x).toBeCloseTo(75);
      expect(shape.vertices[0].y).toBeCloseTo(75);
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

  describe("closable — a closed contour is always closable (BROS-1422)", () => {
    it("reports closable=true for a closed keyframe even without a closable control", () => {
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
                [10, 10],
                [20, 20],
                [30, 10],
              ]),
              closed: true,
            },
          ],
        },
      });
      // SAM2 produces closed polygons regardless of `closable=false`; the region
      // must treat such a shape as closable so finished/incomplete are correct.
      expect(root.region.closable).toBe(true);
      expect(root.region.incomplete).toBeFalsy();
      expect(root.region.finished).toBe(true);
    });

    it("reports closable=false for an open contour with no closable control", () => {
      const root = TestRoot.create({
        video: { id: "vid1" },
        region: {
          id: "vvr1",
          pid: "p1",
          object: "vid1",
          sequence: [{ frame: 0, enabled: true, vertices: mkVertices([[1, 2]]), closed: false }],
        },
      });
      expect(root.region.closable).toBe(false);
    });
  });

  describe("addVertexAtCanvasPoint — rapid clicks accumulate (BROS-1206)", () => {
    const makeRoot = () =>
      TestRoot.create({
        video: { id: "vid1" },
        region: { id: "vvr1", pid: "p1", object: "vid1", sequence: [] },
      });

    // Mirrors the production handler registered by the view: it reads the LIVE
    // store on every call (never a captured snapshot), so consecutive clicks
    // that arrive before a re-render still each produce a vertex.
    const registerFreshAppender = (region) =>
      region.setAppendVertexFn((x, y) => {
        const shape = region.getShape(0) ?? { vertices: [], closed: false };
        const current = shape.vertices;
        const last = current[current.length - 1];
        region.updateShape(
          {
            vertices: [...current, { id: `v${current.length}`, x, y, prevPointId: last?.id }],
            closed: shape.closed,
          },
          0,
        );
      });

    it("returns false when no append handler is registered", () => {
      const root = makeRoot();
      expect(root.region.addVertexAtCanvasPoint(10, 10)).toBe(false);
      expect(root.region.getShape(0)).toBeNull();
    });

    it("adds one vertex per call without dropping earlier ones", () => {
      const root = makeRoot();
      registerFreshAppender(root.region);

      expect(root.region.addVertexAtCanvasPoint(10, 10)).toBe(true);
      expect(root.region.addVertexAtCanvasPoint(20, 20)).toBe(true);
      expect(root.region.addVertexAtCanvasPoint(30, 30)).toBe(true);

      const shape = root.region.getShape(0);
      expect(shape.vertices).toHaveLength(3);
      expect(shape.vertices.map((v) => [v.x, v.y])).toEqual([
        [10, 10],
        [20, 20],
        [30, 30],
      ]);
      // each new vertex links back to the previous one
      expect(shape.vertices[1].prevPointId).toBe(shape.vertices[0].id);
      expect(shape.vertices[2].prevPointId).toBe(shape.vertices[1].id);
    });

    it("clears the handler when set to null", () => {
      const root = makeRoot();
      registerFreshAppender(root.region);
      expect(root.region.addVertexAtCanvasPoint(10, 10)).toBe(true);

      root.region.setAppendVertexFn(null);
      expect(root.region.addVertexAtCanvasPoint(20, 20)).toBe(false);
      expect(root.region.getShape(0).vertices).toHaveLength(1);
    });
  });
});
