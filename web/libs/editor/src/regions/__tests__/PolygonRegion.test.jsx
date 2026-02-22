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
      .actions((self) => ({
        createSerializedResult(region, value) {
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

import { PolygonRegionModel } from "../PolygonRegion";
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
