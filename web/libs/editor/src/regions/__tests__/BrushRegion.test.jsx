/**
 * Unit tests for BrushRegion (model views and actions).
 * View/React coverage is largely from Cypress; these tests cover model logic.
 */
import { types } from "mobx-state-tree";

jest.mock("../../utils/canvas", () => ({
  Region2RLE: jest.fn(() => new Uint8Array([0, 1, 2])),
  RLE2Region: jest.fn(() => null),
  maskDataURL2Image: jest.fn(() => Promise.resolve(null)),
}));

jest.mock("../../tags/object/Image", () => {
  const { types } = require("mobx-state-tree");
  const image = types
    .model("ImageModel", {
      id: types.identifier,
      stageWidth: types.optional(types.number, 800),
      stageHeight: types.optional(types.number, 600),
    })
    .views(() => ({
      get stageRef() {
        return null;
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
      canvasToInternalX(v) {
        return v / 2;
      },
      canvasToInternalY(v) {
        return v / 2;
      },
      zoomOriginalCoords([x, y]) {
        return [x, y];
      },
      setStageSize(w, h) {
        self.stageWidth = w;
        self.stageHeight = h;
      },
    }));
  return { ImageModel: image };
});

import { BrushRegionModel } from "../BrushRegion";
import { ImageModel } from "../../tags/object/Image";

const TestRoot = types
  .model("TestRoot", {
    image: types.optional(ImageModel, { id: "img1" }),
    region: types.optional(BrushRegionModel, {
      id: "br1",
      pid: "p1",
      object: "img1",
      touches: [],
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

describe("BrushRegion", () => {
  describe("BrushRegionModel", () => {
    let root;
    let region;

    beforeEach(() => {
      root = TestRoot.create({
        image: { id: "img1" },
        region: {
          id: "br1",
          pid: "p1",
          object: "img1",
          touches: [],
        },
      });
      region = root.region;
    });

    it("strokeColor and colorParts use defaultStyle when no style/tag", () => {
      expect(region.colorParts).toBeDefined();
      expect(Array.isArray(region.colorParts)).toBe(true);
      expect(region.strokeColor).toBeDefined();
      expect(typeof region.strokeColor).toBe("string");
    });

    it("touchesLength returns touches length", () => {
      expect(region.touchesLength).toBe(0);
    });

    it("setScale updates scaleX and scaleY", () => {
      region.setScale(2, 3);
      expect(region.scaleX).toBe(2);
      expect(region.scaleY).toBe(3);
    });

    it("updateImageSize is no-op when parent stage dimensions are small", () => {
      root.image.setStageSize(1, 1);
      region.updateImageSize(100, 100, 100, 100);
      expect(region.needsUpdate).toBe(1);
    });

    it("updateMaskImage does nothing when no maskDataURL", () => {
      expect(() => region.updateMaskImage()).not.toThrow();
    });

    it("updateMaskImage sets mask image src when maskDataURL present", () => {
      const dataUrl = "data:image/png;base64,abc";
      root = TestRoot.create({
        image: { id: "img1" },
        region: {
          id: "br1",
          pid: "p1",
          object: "img1",
          maskDataURL: dataUrl,
          touches: [],
        },
      });
      region = root.region;
      region.updateMaskImage();
      const img = region.getMaskImage();
      expect(img).toBeInstanceOf(window.Image);
      expect(img.src).toContain("base64,abc");
    });

    it("getMaskImage returns undefined when no mask set", () => {
      expect(region.getMaskImage()).toBeUndefined();
    });

    it("setLayerRef sets layerRef and opacity when ref provided", () => {
      const canvas = document.createElement("canvas");
      const ref = { canvas: { _canvas: canvas } };
      region.setLayerRef(ref);
      expect(region.layerRef).toBe(ref);
      expect(canvas.style.opacity).toBe(String(region.opacity));
    });

    it("setLayerRef does nothing when ref is falsy", () => {
      region.setLayerRef(null);
      expect(region.layerRef).toBeUndefined();
    });

    it("cacheImageData sets imageData to null when no layerRef", () => {
      region.cacheImageData();
      expect(region.imageData).toBeNull();
    });

    it("cacheImageData sets imageData when layerRef has toCanvas", () => {
      const mockImageData = { data: new Uint8ClampedArray(4), width: 1, height: 1 };
      const mockGetImageData = jest.fn(() => mockImageData);
      const mockCtx = { getImageData: mockGetImageData };
      const mockCanvas = {
        getContext: jest.fn(() => mockCtx),
        width: 10,
        height: 10,
      };
      const ref = {
        canvas: { _canvas: document.createElement("canvas"), width: 10, height: 10 },
        toCanvas: jest.fn(() => mockCanvas),
      };
      region.setLayerRef(ref);
      region.cacheImageData();
      expect(region.imageData).toEqual(mockImageData);
      expect(mockGetImageData).toHaveBeenCalledWith(0, 0, 10, 10);
    });

    it("prepareCoords delegates to parent zoomOriginalCoords", () => {
      const coords = region.prepareCoords([10, 20]);
      expect(coords).toEqual([10, 20]);
    });

    it("convertPointsToMask is callable (no-op)", () => {
      expect(() => region.convertPointsToMask()).not.toThrow();
    });

    it("serialize with fast: true returns value with format and optional touches/maskDataURL", () => {
      const result = region.serialize({ fast: true });
      expect(result).toBeDefined();
      expect(result.value.format).toBe("rle");
      expect(result.original_width).toBe(100);
    });

    it("serialize with fast: true includes touches when present", () => {
      const pointId = "pt1";
      root = TestRoot.create({
        image: { id: "img1" },
        region: {
          id: "br1",
          pid: "p1",
          object: "img1",
          touches: [
            {
              id: pointId,
              type: "add",
              points: [0, 0, 10, 10],
              relativePoints: [0, 0, 1.25, 1.67],
              strokeWidth: 25,
              relativeStrokeWidth: 25,
            },
          ],
        },
      });
      region = root.region;
      const result = region.serialize({ fast: true });
      expect(result.value.touches).toBeDefined();
      expect(result.value.touches.length).toBe(1);
    });

    it("serialize with fast: true includes maskDataURL when present", () => {
      root = TestRoot.create({
        image: { id: "img1" },
        region: {
          id: "br1",
          pid: "p1",
          object: "img1",
          maskDataURL: "data:image/png;base64,xyz",
          touches: [],
        },
      });
      region = root.region;
      const result = region.serialize({ fast: true });
      expect(result.value.maskDataURL).toBe("data:image/png;base64,xyz");
    });

    it("updateImageSize updates touches when parent stage size > 1", () => {
      root = TestRoot.create({
        image: { id: "img1", stageWidth: 800, stageHeight: 600 },
        region: {
          id: "br1",
          pid: "p1",
          object: "img1",
          touches: [
            {
              id: "pt1",
              type: "add",
              points: [10, 20],
              relativePoints: [1.25, 3.33],
              strokeWidth: 25,
              relativeStrokeWidth: 25,
            },
          ],
        },
      });
      region = root.region;
      const before = region.needsUpdate;
      region.updateImageSize(100, 100, 800, 600);
      expect(region.needsUpdate).toBe(before + 1);
    });

    it("serialize without fast uses Canvas.Region2RLE and returns result", () => {
      const Canvas = require("../../utils/canvas");
      Canvas.Region2RLE.mockReturnValue(new Uint8Array([0, 1, 2, 3]));
      const result = region.serialize();
      expect(Canvas.Region2RLE).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.value.rle).toEqual([0, 1, 2, 3]);
    });

    it("serialize without fast returns null when Region2RLE returns empty", () => {
      const Canvas = require("../../utils/canvas");
      Canvas.Region2RLE.mockReturnValue(null);
      const result = region.serialize();
      expect(result).toBeNull();
    });

    it("serialize without fast returns null when Region2RLE returns empty array", () => {
      const Canvas = require("../../utils/canvas");
      Canvas.Region2RLE.mockReturnValue([]);
      const result = region.serialize();
      expect(result).toBeNull();
    });
  });

  describe("Points (touches) views", () => {
    it("compositeOperation is destination-out for eraser type", () => {
      const testRoot = TestRoot.create({
        image: { id: "img1" },
        region: {
          id: "br1",
          pid: "p1",
          object: "img1",
          touches: [
            {
              id: "pt1",
              type: "eraser",
              points: [0, 0, 10, 10],
              relativePoints: [0, 0, 1.25, 1.67],
              strokeWidth: 25,
              relativeStrokeWidth: 25,
            },
          ],
        },
      });
      const testRegion = testRoot.region;
      expect(testRegion.touches[0].compositeOperation).toBe("destination-out");
    });

    it("compositeOperation is source-over for add type", () => {
      const testRoot = TestRoot.create({
        image: { id: "img1" },
        region: {
          id: "br1",
          pid: "p1",
          object: "img1",
          touches: [
            {
              id: "pt1",
              type: "add",
              points: [0, 0],
              relativePoints: [0, 0],
              strokeWidth: 25,
              relativeStrokeWidth: 25,
            },
          ],
        },
      });
      const testRegion = testRoot.region;
      expect(testRegion.touches[0].compositeOperation).toBe("source-over");
    });
  });

  describe("bboxCoordsCanvas with touches", () => {
    it("computes bbox from first touch points when imageData is null", () => {
      const root = TestRoot.create({
        image: { id: "img1" },
        region: {
          id: "br1",
          pid: "p1",
          object: "img1",
          touches: [
            {
              id: "pt1",
              type: "add",
              points: [5, 10, 25, 30, 15, 20],
              relativePoints: [5, 10, 25, 30, 15, 20],
              strokeWidth: 25,
              relativeStrokeWidth: 25,
            },
          ],
        },
      });
      const region = root.region;
      const bbox = region.bboxCoordsCanvas;
      expect(bbox).toEqual({
        left: 5,
        top: 10,
        right: 25,
        bottom: 30,
      });
    });

    it("bboxCoords maps bboxCoordsCanvas via parent canvasToInternal", () => {
      const root = TestRoot.create({
        image: { id: "img1" },
        region: {
          id: "br1",
          pid: "p1",
          object: "img1",
          touches: [
            {
              id: "pt1",
              type: "add",
              points: [10, 20, 30, 40],
              relativePoints: [10, 20, 30, 40],
              strokeWidth: 25,
              relativeStrokeWidth: 25,
            },
          ],
        },
      });
      const region = root.region;
      const bbox = region.bboxCoords;
      expect(bbox).toEqual({
        left: 5,
        top: 10,
        right: 15,
        bottom: 20,
      });
    });
  });

  describe("Registry region type predicate", () => {
    it("accepts value with rle (predicate returns truthy)", () => {
      const predicate = BrushRegionModel.detectByValue;
      expect(Boolean(predicate({ rle: [0, 1, 2] }))).toBe(true);
    });

    it("accepts value with touches (predicate returns truthy)", () => {
      const predicate = BrushRegionModel.detectByValue;
      expect(Boolean(predicate({ touches: [] }))).toBe(true);
    });

    it("accepts value with maskDataURL (predicate returns truthy)", () => {
      const predicate = BrushRegionModel.detectByValue;
      expect(Boolean(predicate({ maskDataURL: "data:image/png;base64,abc" }))).toBe(true);
    });

    it("rejects value without rle, touches, or maskDataURL (predicate returns falsy)", () => {
      const predicate = BrushRegionModel.detectByValue;
      expect(Boolean(predicate({}))).toBe(false);
      expect(Boolean(predicate({ format: "rle" }))).toBe(false);
    });
  });
});
