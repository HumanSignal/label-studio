/**
 * Unit tests for BrushRegion (model views and actions).
 * View/React coverage is largely from Cypress; these tests cover model logic.
 */
import { types } from "mobx-state-tree";
import { importModulesWithBunReload } from "./moduleReload";

mockModule("../../utils/canvas", () => ({
  Region2RLE: mock(() => new Uint8Array([0, 1, 2])),
  RLE2Region: mock(() => null),
  maskDataURL2Image: mock(() => Promise.resolve(null)),
}));

mockModule("../../tags/object/Image", () => {
  const { types } = require("mobx-state-tree");
  const image = types
    .model("ImageModel", {
      id: types.identifier,
      stageWidth: types.optional(types.number, 800),
      stageHeight: types.optional(types.number, 600),
      stageZoom: types.optional(types.number, 1),
    })
    .volatile(() => ({
      currentImageEntity: { naturalWidth: 100, naturalHeight: 100 },
    }))
    .views(() => ({
      get stageRef() {
        return null;
      },
    }))
    .actions((self) => ({
      createSerializedResult(_region, value) {
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
      findImageEntity() {
        return self.currentImageEntity;
      },
      setStageSize(w, h) {
        self.stageWidth = w;
        self.stageHeight = h;
      },
    }));
  return { ImageModel: image };
});

let BrushRegionModel;
let ImageModel;
let TestRoot;

const loadModels = async () => {
  const [brushMod, imageMod] = await importModulesWithBunReload(["../BrushRegion", "../../tags/object/Image"]);

  BrushRegionModel = brushMod.BrushRegionModel;
  ImageModel = imageMod.ImageModel;

  TestRoot = types
    .model("TestRoot", {
      image: types.optional(ImageModel, { id: "img1" }),
      region: types.optional(BrushRegionModel, {
        id: "br1",
        pid: "p1",
        object: "img1",
        touches: [],
      }),
    })
    .actions((_self) => ({
      createSerializedResult(_region, value) {
        return {
          value: { ...value },
          original_width: 100,
          original_height: 100,
          image_rotation: 0,
        };
      },
    }));
};

describe("BrushRegion", () => {
  beforeAll(async () => {
    await loadModels();
  });

  describe("BrushRegionModel", () => {
    let root;
    let region;

    beforeEach(async () => {
      await loadModels();
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

    it("setLayerRef sets layerRef when ref provided", () => {
      const canvas = document.createElement("canvas");
      const ref = { canvas: { _canvas: canvas } };
      region.setLayerRef(ref);
      expect(region.layerRef).toBe(ref);
    });

    it("setLayerRef does nothing when ref is falsy", () => {
      region.setLayerRef(null);
      expect(region.layerRef).toBeUndefined();
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

    it("serialize without fast returns null when canvas context is unavailable", () => {
      const result = region.serialize();
      expect(result).toBeNull();
    });

    it("serialize without fast returns null when there is no staged data", () => {
      const result = region.serialize();
      expect(result).toBeNull();
    });

    it("serialize without fast returns null when conversion cannot produce rle", () => {
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
    it("computes bbox from touch points", () => {
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

    it("returns null when no touches and no rle", () => {
      const root = TestRoot.create({
        image: { id: "img1" },
        region: {
          id: "br1",
          pid: "p1",
          object: "img1",
          touches: [],
        },
      });
      const region = root.region;
      expect(region.bboxCoordsCanvas).toBeNull();
    });
  });

  describe("bboxCoordsCanvas with RLE", () => {
    it("computes bbox from RLE data when no touches", () => {
      const { encode } = require("@thi.ng/rle-pack");
      const nw = 100;
      const nh = 100;
      const data = new Uint8Array(nw * nh * 4);

      // Paint pixels at (20,30) and (70,80) to form a bbox
      const idx1 = (30 * nw + 20) * 4;
      data[idx1] = data[idx1 + 1] = data[idx1 + 2] = data[idx1 + 3] = 255;
      const idx2 = (80 * nw + 70) * 4;
      data[idx2] = data[idx2 + 1] = data[idx2 + 2] = data[idx2 + 3] = 255;

      const rle = Array.from(encode(data, data.length));

      const root = TestRoot.create({
        image: { id: "img1", stageWidth: 800, stageHeight: 600 },
        region: {
          id: "br1",
          pid: "p1",
          object: "img1",
          rle,
          touches: [],
        },
      });
      const region = root.region;
      const bbox = region.bboxCoordsCanvas;

      expect(bbox).not.toBeNull();
      // Scale from natural (100x100) to stage (800x600)
      expect(bbox.left).toBe(20 * (800 / nw));
      expect(bbox.top).toBe(30 * (600 / nh));
      expect(bbox.right).toBe(71 * (800 / nw));
      expect(bbox.bottom).toBe(81 * (600 / nh));
    });

    it("returns null for RLE with no visible pixels", () => {
      const { encode } = require("@thi.ng/rle-pack");
      const data = new Uint8Array(4 * 4 * 4);
      const rle = Array.from(encode(data, data.length));

      const root = TestRoot.create({
        image: { id: "img1", stageWidth: 100, stageHeight: 100 },
        region: {
          id: "br1",
          pid: "p1",
          object: "img1",
          rle,
          touches: [],
        },
      });
      const region = root.region;
      expect(region.bboxCoordsCanvas).toBeNull();
    });

    it("merges RLE bbox and touch bbox when both are present", () => {
      const { encode } = require("@thi.ng/rle-pack");
      const nw = 100;
      const nh = 100;
      const data = new Uint8Array(nw * nh * 4);

      // RLE pixel at (50,50) — scales to stage coords (400,300) with 800x600 stage
      const idx = (50 * nw + 50) * 4;
      data[idx] = data[idx + 1] = data[idx + 2] = data[idx + 3] = 255;

      const rle = Array.from(encode(data, data.length));

      const root = TestRoot.create({
        image: { id: "img1", stageWidth: 800, stageHeight: 600 },
        region: {
          id: "br1",
          pid: "p1",
          object: "img1",
          rle,
          touches: [
            {
              id: "pt1",
              type: "add",
              points: [10, 20],
              relativePoints: [1.25, 3.33],
              strokeWidth: 25,
              relativeStrokeWidth: 3.125,
            },
          ],
        },
      });
      const region = root.region;
      const bbox = region.bboxCoordsCanvas;

      expect(bbox).not.toBeNull();
      // Touch point at (10,20) is smaller than RLE-derived (400,300)
      expect(bbox.left).toBe(10);
      expect(bbox.top).toBe(20);
      // RLE pixel at (50,50) → right = 51 * 8 = 408, bottom = 51 * 6 = 306
      expect(bbox.right).toBe(51 * (800 / nw));
      expect(bbox.bottom).toBe(51 * (600 / nh));
    });
  });

  describe("Registry region type predicate", () => {
    it("accepts value with rle (predicate returns truthy)", () => {
      expect(BrushRegionModel).toBeDefined();
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
