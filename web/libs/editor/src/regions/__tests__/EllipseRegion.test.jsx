/**
 * Unit tests for EllipseRegion (model views, actions, and region type).
 * View coverage is largely from Cypress; these tests cover model logic.
 */
import { types } from "mobx-state-tree";

// Math.unit is used in coordsInside (degrees to radians); not in standard JS.
const deg2rad = (deg) => (deg * Math.PI) / 180;
beforeAll(() => {
  if (typeof Math.unit !== "function") {
    Math.unit = (value, unit) => (unit === "deg" ? deg2rad(value) : value);
  }
});
afterAll(() => {
  delete Math.unit;
});

jest.mock("../../tags/object/Image", () => {
  const { types } = require("mobx-state-tree");
  return {
    ImageModel: types
      .model("ImageModel", { id: types.identifier })
      .volatile(() => ({ whRatio: 1 }))
      .views(() => ({
        get naturalWidth() {
          return 100;
        },
        get naturalHeight() {
          return 100;
        },
      }))
      .actions((self) => ({
        createSerializedResult(region, value) {
          return {
            value: { ...value },
            original_width: 100,
            original_height: 100,
            image_rotation: 0,
          };
        },
        internalToCanvasX(v) {
          return v;
        },
        internalToCanvasY(v) {
          return v;
        },
        canvasToInternalX(v) {
          return v;
        },
        canvasToInternalY(v) {
          return v;
        },
      })),
  };
});

import { EllipseRegionModel } from "../EllipseRegion";
import { ImageModel } from "../../tags/object/Image";

const TestRoot = types
  .model("TestRoot", {
    image: types.optional(ImageModel, { id: "img1" }),
    region: types.optional(EllipseRegionModel, {
      id: "ellipse1",
      pid: "p1",
      object: "img1",
      x: 50,
      y: 50,
      radiusX: 20,
      radiusY: 16,
      rotation: 0,
      results: [],
    }),
  })
  .volatile(() => ({ whRatio: 1 }))
  .actions((self) => ({
    createSerializedResult(region, value) {
      return {
        value: { ...value },
        original_width: 100,
        original_height: 100,
        image_rotation: 0,
      };
    },
    canvasToInternalX(v) {
      return v;
    },
    canvasToInternalY(v) {
      return v;
    },
  }));

describe("EllipseRegion", () => {
  describe("EllipseRegionModel", () => {
    let root;
    let region;

    beforeEach(() => {
      root = TestRoot.create({
        image: { id: "img1" },
        region: {
          id: "ellipse1",
          pid: "p1",
          object: "img1",
          x: 50,
          y: 50,
          radiusX: 20,
          radiusY: 16,
          rotation: 0,
          results: [],
        },
      });
      region = root.region;
    });

    it("bboxCoords returns correct bounds when rotation is 0", () => {
      expect(region.bboxCoords).toEqual({
        left: 30,
        top: 34,
        right: 70,
        bottom: 66,
      });
    });

    it("bboxCoords uses rotateBboxCoords when rotation is non-zero", () => {
      const rotated = TestRoot.create({
        image: { id: "img1" },
        region: {
          id: "e2",
          pid: "p2",
          object: "img1",
          x: 50,
          y: 50,
          radiusX: 20,
          radiusY: 16,
          rotation: 90,
          results: [],
        },
      });
      const r = rotated.region;
      expect(r.rotation).toBe(90);
      const bbox = r.bboxCoords;
      expect(bbox).toHaveProperty("left");
      expect(bbox).toHaveProperty("top");
      expect(bbox).toHaveProperty("right");
      expect(bbox).toHaveProperty("bottom");
    });

    it("afterCreate sets startX and startY from x and y", () => {
      expect(region.startX).toBe(50);
      expect(region.startY).toBe(50);
    });

    it("coordsInside returns true for point inside ellipse (rotation 0)", () => {
      expect(region.coordsInside(50, 50)).toBe(true);
      expect(region.coordsInside(55, 52)).toBe(true);
    });

    it("coordsInside returns false for point outside ellipse", () => {
      expect(region.coordsInside(100, 100)).toBe(false);
      expect(region.coordsInside(71, 50)).toBe(false);
    });

    it("setPositionInternal updates x, y, radiusX, radiusY and normalizes rotation", () => {
      region.setPositionInternal(10, 20, 5, 8, 45);
      expect(region.x).toBe(10);
      expect(region.y).toBe(20);
      expect(region.radiusX).toBe(5);
      expect(region.radiusY).toBe(8);
      expect(region.rotation).toBe(45);

      region.setPositionInternal(0, 0, 1, 1, -90);
      expect(region.rotation).toBe(270);
    });

    it("setPosition delegates to setPositionInternal with parent canvas conversion", () => {
      region.setPosition(100, 80, 10, 12, 0);
      expect(region.x).toBe(100);
      expect(region.y).toBe(80);
      expect(region.radiusX).toBe(10);
      expect(region.radiusY).toBe(12);
    });

    it("setScale updates scaleX and scaleY", () => {
      region.setScale(2, 3);
      expect(region.scaleX).toBe(2);
      expect(region.scaleY).toBe(3);
    });

    it("setFill updates fill", () => {
      region.setFill("#ff0000");
      expect(region.fill).toBe("#ff0000");
    });

    it("updateImageSize is a no-op", () => {
      expect(() => region.updateImageSize()).not.toThrow();
    });

    it("serialize returns value with x, y, radiusX, radiusY, rotation", () => {
      const result = region.serialize();
      expect(result.value).toEqual({
        x: 50,
        y: 50,
        radiusX: 20,
        radiusY: 16,
        rotation: 0,
      });
      expect(result.original_width).toBe(100);
      expect(result.original_height).toBe(100);
      expect(result.image_rotation).toBe(0);
    });
  });

  describe("Registry region type", () => {
    it("is registered as ellipseregion", () => {
      const Registry = require("../../core/Registry").default;
      const Model = Registry.getModelByTag("ellipseregion");
      expect(Model).toBeDefined();
      expect(Model).toBe(EllipseRegionModel);
    });
  });
});
