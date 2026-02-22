/**
 * Unit tests for KeyPointRegion (model views and region type predicate).
 * View coverage is largely from Cypress; these tests cover model logic.
 */
import { applySnapshot, getSnapshot, getRoot, types } from "mobx-state-tree";

// Avoid pulling in full Image tag (circular deps / heavy union) in unit tests.
// AreaMixin makes region.parent === region.object (the image), so image must provide createSerializedResult,
// internalToCanvasX/Y and canvasToInternalX/Y for region canvas getters and setPosition.
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
      canvasToInternalX(v) {
        return v / 2;
      },
      canvasToInternalY(v) {
        return v / 2;
      },
    })),
  };
});

import { KeyPointRegionModel } from "../KeyPointRegion";
import { ImageModel } from "../../tags/object/Image";

// Optional test control for setPosition (with control) test; root._testControl used by TestKeyPointRegion.
const TestKeyPointRegion = types.compose(
  KeyPointRegionModel,
  types.model({}).views((self) => ({
    get control() {
      const root = getRoot(self);
      if (root._testControl !== undefined && root._testControl !== null) return root._testControl;
      return self.results?.find((r) => r.from_name?.tools)?.from_name;
    },
  })),
);

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
  .volatile(() => ({ _testControl: null }))
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

    it("updateImageSize is a no-op", () => {
      expect(() => region.updateImageSize()).not.toThrow();
    });

    it("serialize adds is_positive and value.labels when dynamic is true", () => {
      applySnapshot(region, { ...getSnapshot(region), dynamic: true });
      const result = region.serialize();
      expect(result.is_positive).toBe(true);
      expect(result.value.labels).toEqual([]);
    });

    it("serialize sets is_positive false when dynamic and negative are true", () => {
      applySnapshot(region, { ...getSnapshot(region), dynamic: true, negative: true });
      const result = region.serialize();
      expect(result.is_positive).toBe(false);
    });

    it("setPosition updates x,y using parent canvasToInternal when control is absent", () => {
      // No results => no control; setPosition uses fallback internal coords
      region.setPosition(100, 200);
      expect(region.x).toBe(50);
      expect(region.y).toBe(100);
    });

    it("setPosition uses control.getSnappedPoint when control is present", () => {
      const RootWithControl = types
        .model({
          image: types.optional(ImageModel, { id: "img1" }),
          region: types.optional(TestKeyPointRegion, {
            id: "kp1",
            pid: "p1",
            object: "img1",
            x: 50,
            y: 50,
            width: 10,
            negative: false,
          }),
        })
        .volatile(() => ({ _testControl: null }))
        .actions((self) => ({
          createSerializedResult(region, value) {
            return {
              value: { ...value },
              original_width: 100,
              original_height: 100,
              image_rotation: 0,
            };
          },
          setTestControl(c) {
            self._testControl = c;
          },
        }));
      const rootWithControl = RootWithControl.create({
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
      rootWithControl.setTestControl({
        getSnappedPoint(p) {
          return { x: p.x + 10, y: p.y + 20 };
        },
      });
      const regionWithControl = rootWithControl.region;
      regionWithControl.setPosition(100, 200);
      expect(regionWithControl.x).toBe(60);
      expect(regionWithControl.y).toBe(120);
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
