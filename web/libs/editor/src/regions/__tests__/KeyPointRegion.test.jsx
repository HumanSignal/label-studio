/**
 * Unit tests for KeyPointRegion (model views and region type predicate).
 * View coverage is largely from Cypress; these tests cover model logic.
 */
import { types } from "mobx-state-tree";

// Avoid pulling in full Image tag (circular deps / heavy union) in unit tests.
// AreaMixin makes region.parent === region.object (the image), so image must provide createSerializedResult
// and internalToCanvasX/Y for region canvas getters.
jest.mock("../../tags/object/Image", () => {
  const { types } = require("mobx-state-tree");
  return {
    ImageModel: types.model("ImageModel", { id: types.identifier }).actions((self) => ({
      createSerializedResult(region, value) {
        return {
          value: { ...value },
          original_width: 100,
          original_height: 100,
          image_rotation: 0,
        };
      },
      internalToCanvasX(v) {
        return v * 2;
      },
      internalToCanvasY(v) {
        return v * 2;
      },
    })),
  };
});

import { KeyPointRegionModel } from "../KeyPointRegion";
import { ImageModel } from "../../tags/object/Image";

// Minimal parent with image so region.object reference resolves; provides createSerializedResult.
const TestRoot = types
  .model("TestRoot", {
    image: types.optional(ImageModel, { id: "img1" }),
    region: types.optional(KeyPointRegionModel, {
      id: "kp1",
      pid: "p1",
      object: "img1",
      x: 50,
      y: 50,
      width: 10,
      negative: false,
    }),
  })
  .volatile(() => ({}))
  .actions((self) => ({
    createSerializedResult(region, value) {
      return {
        value: { ...value },
        original_width: 100,
        original_height: 100,
        image_rotation: 0,
      };
    },
  }));

describe("KeyPointRegion", () => {
  describe("KeyPointRegionModel", () => {
    let root;
    let region;

    beforeEach(() => {
      root = TestRoot.create({
        image: { id: "img1" },
        region: {
          id: "kp1",
          pid: "p1",
          object: "img1",
          x: 50,
          y: 50,
          width: 10,
          negative: false,
        },
      });
      region = root.region;
    });

    it("bboxCoords returns correct bounds", () => {
      expect(region.bboxCoords).toEqual({
        left: 40,
        top: 40,
        right: 60,
        bottom: 60,
      });
    });

    it("serialize returns value with x, y, width", () => {
      // AreaMixin makes region.parent === region.object (image); mocked Image has createSerializedResult
      const result = region.serialize();
      expect(result.value).toEqual({ x: 50, y: 50, width: 10 });
      expect(result.original_width).toBe(100);
    });

    it("serialize does not add is_positive or labels when not dynamic", () => {
      const result = region.serialize();
      expect(result.is_positive).toBeUndefined();
      expect(result.value.labels).toBeUndefined();
    });

    it("canvasX, canvasY, canvasWidth delegate to parent internalToCanvas methods", () => {
      expect(region.canvasX).toBe(100);
      expect(region.canvasY).toBe(100);
      expect(region.canvasWidth).toBe(20);
    });
  });

  describe("Registry region type predicate", () => {
    it("accepts value with x, y, width and no height", () => {
      const predicate = KeyPointRegionModel.detectByValue;
      expect(predicate({ x: 1, y: 2, width: 3 })).toBe(true);
      expect(predicate({ x: 1, y: 2, width: 3, height: 4 })).toBe(false);
      expect(predicate({ x: 1, y: 2 })).toBe(false);
    });
  });
});
