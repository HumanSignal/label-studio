/**
 * Unit tests for PolygonRegion (model views, actions, and region type predicate).
 * View coverage is largely from Cypress; these tests cover model logic.
 */
import { types } from "mobx-state-tree";

jest.mock("../../tags/object/Image", () => {
  const { types } = require("mobx-state-tree");
  return {
    ImageModel: types
      .model("ImageModel", { id: types.identifier })
      .views(() => ({
        get naturalWidth() {
          return 100;
        },
        get naturalHeight() {
          return 100;
        },
        get stageWidth() {
          return 100;
        },
        get stageHeight() {
          return 100;
        },
      }))
      .actions(() => ({
        createSerializedResult(_region, value) {
          return {
            value: { ...value },
            original_width: 100,
            original_height: 100,
            image_rotation: 0,
          };
        },
      })),
  };
});

import {
  PolygonRegionModel,
  getAnchorPoint,
  getFlattenedPoints,
  moveHoverAnchor,
  removeHoverAnchor,
} from "../PolygonRegion";
import { ImageModel } from "../../tags/object/Image";

const TestRoot = types
  .model("TestRoot", {
    image: types.optional(ImageModel, { id: "img1" }),
    region: types.optional(PolygonRegionModel, {
      id: "poly1",
      pid: "p1",
      object: "img1",
      points: [
        [10, 10],
        [50, 10],
        [50, 50],
        [10, 50],
      ],
      closed: true,
      results: [],
    }),
  })
  .views(() => ({
    get canvasToInternalX() {
      return (x) => x;
    },
    get canvasToInternalY() {
      return (y) => y;
    },
    get isSamePixel() {
      return () => false;
    },
  }))
  .actions(() => ({
    createSerializedResult(_region, value) {
      return {
        value: { ...value },
        original_width: 100,
        original_height: 100,
        image_rotation: 0,
      };
    },
  }));

describe("PolygonRegion", () => {
  describe("PolygonRegionModel", () => {
    let root;
    let region;

    beforeEach(() => {
      root = TestRoot.create({
        image: { id: "img1" },
        region: {
          id: "poly1",
          pid: "p1",
          object: "img1",
          points: [
            [10, 10],
            [50, 10],
            [50, 50],
            [10, 50],
          ],
          closed: true,
          results: [],
        },
      });
      region = root.region;
    });

    it("store returns root", () => {
      expect(region.store).toBe(root);
    });

    it("bboxCoords returns correct bounds from points", () => {
      expect(region.bboxCoords).toEqual({
        left: 10,
        top: 10,
        right: 50,
        bottom: 50,
      });
    });

    it("bboxCoords returns empty object when no points", () => {
      const emptyRoot = TestRoot.create({
        image: { id: "img1" },
        region: {
          id: "poly2",
          pid: "p2",
          object: "img1",
          points: [],
          closed: false,
          results: [],
        },
      });
      expect(emptyRoot.region.bboxCoords).toEqual({});
    });

    it("serialize returns value with points and closed", () => {
      const result = region.serialize();
      expect(result.value.points).toEqual([
        [10, 10],
        [50, 10],
        [50, 50],
        [10, 50],
      ]);
      expect(result.value.closed).toBe(true);
      expect(result.original_width).toBe(100);
    });

    it("setMouseOverStartPoint updates volatile state", () => {
      expect(region.mouseOverStartPoint).toBe(false);
      region.setMouseOverStartPoint(true);
      expect(region.mouseOverStartPoint).toBe(true);
      region.setMouseOverStartPoint(false);
      expect(region.mouseOverStartPoint).toBe(false);
    });

    it("closePoly sets closed to true when points.length >= 3", () => {
      const openRoot = TestRoot.create({
        image: { id: "img1" },
        region: {
          id: "polyOpen",
          pid: "pOpen",
          object: "img1",
          points: [
            [0, 0],
            [10, 0],
            [10, 10],
          ],
          closed: false,
          results: [],
        },
      });
      const openRegion = openRoot.region;
      expect(openRegion.closed).toBe(false);
      openRegion.closePoly();
      expect(openRegion.closed).toBe(true);
    });

    it("closePoly does nothing when already closed", () => {
      region.closePoly();
      expect(region.closed).toBe(true);
    });

    it("closePoly does nothing when points.length < 3", () => {
      const twoPoints = TestRoot.create({
        image: { id: "img1" },
        region: {
          id: "poly2pt",
          pid: "p2pt",
          object: "img1",
          points: [
            [0, 0],
            [5, 5],
          ],
          closed: false,
          results: [],
        },
      });
      twoPoints.region.closePoly();
      expect(twoPoints.region.closed).toBe(false);
    });

    it("canClose returns true when (x,y) near first point", () => {
      expect(region.canClose(10, 10)).toBe(true);
      expect(region.canClose(11, 10)).toBe(true);
    });

    it("canClose returns false when points.length < 2", () => {
      const onePoint = TestRoot.create({
        image: { id: "img1" },
        region: {
          id: "poly1pt",
          pid: "p1pt",
          object: "img1",
          points: [[0, 0]],
          closed: false,
          results: [],
        },
      });
      expect(onePoint.region.canClose(0, 0)).toBe(false);
    });

    it("canClose returns false when (x,y) far from first point", () => {
      expect(region.canClose(100, 100)).toBe(false);
    });

    it("setScale updates scaleX and scaleY", () => {
      region.setScale(2, 3);
      expect(region.scaleX).toBe(2);
      expect(region.scaleY).toBe(3);
    });

    it("setPoints updates point coordinates from flat array", () => {
      region.setPoints([0, 0, 20, 0, 20, 20, 0, 20]);
      expect(region.points[0].x).toBe(0);
      expect(region.points[0].y).toBe(0);
      expect(region.points[2].x).toBe(20);
      expect(region.points[2].y).toBe(20);
    });

    it("afterUnselectRegion clears selectedPoint.selected", () => {
      const firstPoint = region.points[0];
      region.setSelectedPoint(firstPoint);
      expect(region.selectedPoint).toBe(firstPoint);
      expect(firstPoint.selected).toBe(true);
      region.afterUnselectRegion();
      expect(firstPoint.selected).toBe(false);
    });

    it("addPoint does nothing when closed", () => {
      const len = region.points.length;
      region.addPoint(25, 25);
      expect(region.points.length).toBe(len);
    });

    it("afterCreate assigns id to points when given as [x,y] arrays", () => {
      expect(region.points.length).toBe(4);
      for (let i = 0; i < region.points.length; i++) {
        expect(region.points[i].id).toBeDefined();
        expect(typeof region.points[i].x).toBe("number");
        expect(typeof region.points[i].y).toBe("number");
      }
    });

    it("deletePoint removes point when more than 3 points and closed", () => {
      expect(region.points.length).toBe(4);
      const pointToRemove = region.points[1];
      region.deletePoint(pointToRemove);
      expect(region.points.length).toBe(3);
    });

    it("deletePoint does nothing when would eliminate closed shape (3 points)", () => {
      const threePointRoot = TestRoot.create({
        image: { id: "img1" },
        region: {
          id: "poly3",
          pid: "p3",
          object: "img1",
          points: [
            [0, 0],
            [10, 0],
            [10, 10],
          ],
          closed: true,
          results: [],
        },
      });
      const r = threePointRoot.region;
      const len = r.points.length;
      r.deletePoint(r.points[1]);
      expect(r.points.length).toBe(len);
    });

    it("deletePoint clears selectedPoint when deleting selected point", () => {
      const pointToRemove = region.points[1];
      region.setSelectedPoint(pointToRemove);
      region.deletePoint(pointToRemove);
      expect(region.selectedPoint).toBeNull();
    });

    it("destroyRegion detaches and destroys points", () => {
      expect(() => region.destroyRegion()).not.toThrow();
    });

    it("updateImageSize is a no-op", () => {
      expect(() => region.updateImageSize()).not.toThrow();
    });

    it("setSelectedPoint clears previous selected point", () => {
      const first = region.points[0];
      const second = region.points[1];
      region.setSelectedPoint(first);
      expect(first.selected).toBe(true);
      region.setSelectedPoint(second);
      expect(first.selected).toBe(false);
      expect(second.selected).toBe(true);
    });

    it("deletePoint does nothing when only one point", () => {
      const onePointRoot = TestRoot.create({
        image: { id: "img1" },
        region: {
          id: "poly1pt",
          pid: "p1pt",
          object: "img1",
          points: [[5, 5]],
          closed: false,
          results: [],
        },
      });
      const r = onePointRoot.region;
      r.deletePoint(r.points[0]);
      expect(r.points.length).toBe(1);
    });
  });

  describe("getAnchorPoint", () => {
    it("returns [x, y] for segment and cursor", () => {
      const flattenedPoints = [0, 0, 10, 10];
      const [x, y] = getAnchorPoint({
        flattenedPoints,
        cursorX: 5,
        cursorY: 5,
      });
      expect(typeof x).toBe("number");
      expect(typeof y).toBe("number");
      expect(x).toBeCloseTo(5);
      expect(y).toBeCloseTo(5);
    });

    it("returns [x, y] for vertical segment", () => {
      const flattenedPoints = [10, 0, 10, 20];
      const [x, y] = getAnchorPoint({
        flattenedPoints,
        cursorX: 10,
        cursorY: 10,
      });
      expect(x).toBeCloseTo(10);
      expect(y).toBeCloseTo(10);
    });
  });

  describe("getFlattenedPoints", () => {
    it("returns flat array of canvas coords from points with canvasX/canvasY", () => {
      const points = [
        { canvasX: 0, canvasY: 0 },
        { canvasX: 10, canvasY: 10 },
      ];
      expect(getFlattenedPoints(points)).toEqual([0, 0, 10, 10]);
    });
  });

  describe("moveHoverAnchor", () => {
    it("moves existing hover anchor to point when layer has one", () => {
      const to = jest.fn();
      const layer = { findOne: () => ({ to }), draw: () => {} };
      moveHoverAnchor({ point: [10, 20], group: {}, layer, zoom: 1 });
      expect(to).toHaveBeenCalledWith({ x: 10, y: 20, duration: 0 });
    });
  });

  describe("removeHoverAnchor", () => {
    it("returns without throwing when layer has no hover anchor", () => {
      const layer = { findOne: () => null, draw: () => {} };
      expect(() => removeHoverAnchor({ layer })).not.toThrow();
    });

    it("destroys hover anchor and redraws layer when anchor exists", () => {
      const destroy = jest.fn();
      const draw = jest.fn();
      const layer = { findOne: () => ({ destroy }), draw };
      removeHoverAnchor({ layer });
      expect(destroy).toHaveBeenCalled();
      expect(draw).toHaveBeenCalled();
    });
  });

  describe("Registry region type predicate", () => {
    it("accepts value with points", () => {
      const predicate = PolygonRegionModel.detectByValue;
      expect(
        predicate({
          points: [
            [0, 0],
            [1, 1],
          ],
        }),
      ).toBe(true);
      expect(predicate({ points: [] })).toBe(true);
    });

    it("rejects value without points", () => {
      const predicate = PolygonRegionModel.detectByValue;
      expect(predicate({})).toBe(false);
      expect(predicate({ closed: true })).toBe(false);
    });
  });
});
