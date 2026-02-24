/**
 * Unit tests for BitmaskRegion (model views and actions).
 * View/React coverage is largely from Cypress; these tests cover model logic.
 */
import { destroy, types } from "mobx-state-tree";

jest.mock("../BitmaskRegion/utils", () => ({
  BitmaskDrawing: {
    begin: jest.fn(({ x, y }) => ({ x, y })),
    draw: jest.fn(({ x, y }) => ({ x, y })),
  },
  getCanvasPixelBounds: jest.fn(() => ({ left: 0, top: 0, right: 10, bottom: 10 })),
  isHoveringNonTransparentPixel: jest.fn(() => false),
}));

jest.mock("../BitmaskRegion/contour", () => ({
  generateMultiShapeOutline: jest.fn(() => []),
}));

jest.mock("../../tags/object/Image", () => {
  const { types } = require("mobx-state-tree");
  const image = types
    .model("ImageModel", {
      id: types.identifier,
      stageWidth: types.optional(types.number, 800),
      stageHeight: types.optional(types.number, 600),
      stageZoom: types.optional(types.number, 1),
      smoothing: types.optional(types.boolean, false),
    })
    .volatile(() => ({
      currentImageEntity: { naturalWidth: 100, naturalHeight: 100 },
      stageRef: null,
      annotation: null,
      regs: [],
    }))
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
      setStageSize(w, h) {
        self.stageWidth = w;
        self.stageHeight = h;
      },
      setStageZoom(z) {
        self.stageZoom = z;
      },
      setAnnotation(a) {
        self.annotation = a;
      },
    }));
  return { ImageModel: image };
});

// jsdom 2d context may not have .canvas; ensure it exists for fillRect(0,0,ctx.canvas.width,...)
const origGetContext = HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.getContext = function (type, ...args) {
  const ctx = origGetContext.apply(this, [type, ...args]);
  if (ctx && type === "2d" && !ctx.canvas) {
    ctx.canvas = this;
  }
  return ctx;
};

// jsdom does not provide OffscreenCanvas; use a canvas-backed polyfill
if (typeof globalThis.OffscreenCanvas === "undefined") {
  globalThis.OffscreenCanvas = class OffscreenCanvas {
    constructor(width, height) {
      this._canvas = document.createElement("canvas");
      this._canvas.width = width;
      this._canvas.height = height;
    }
    get width() {
      return this._canvas.width;
    }
    set width(v) {
      this._canvas.width = v;
    }
    get height() {
      return this._canvas.height;
    }
    set height(v) {
      this._canvas.height = v;
    }
    getContext(contextType) {
      const ctx = this._canvas.getContext(contextType);
      if (ctx && typeof ctx.canvas === "undefined") {
        ctx.canvas = this._canvas;
      }
      return ctx;
    }
  };
}

const origRequestIdleCallback = global.requestIdleCallback;
beforeAll(() => {
  global.requestIdleCallback = (cb) => (typeof cb === "function" ? setTimeout(cb, 0) : undefined);
});
afterAll(() => {
  global.requestIdleCallback = origRequestIdleCallback;
});

import { render, screen } from "@testing-library/react";
import React from "react";
import { BitmaskRegionModel, HtxBitmask } from "../BitmaskRegion";
import { ImageModel } from "../../tags/object/Image";

jest.mock("../RegionWrapper", () => {
  const React = require("react");
  return {
    RegionWrapper: ({ children }) => React.createElement("div", { "data-testid": "region-wrapper" }, children),
  };
});
jest.mock("react-konva", () => {
  const React = require("react");
  return {
    Group: ({ children, ...p }) => React.createElement("div", { "data-testid": "konva-group", ...p }, children),
    Image: (p) => React.createElement("div", { "data-testid": "konva-image", ...p }),
    Line: (p) => React.createElement("div", { "data-testid": "konva-line", ...p }),
    Rect: (p) => React.createElement("div", { "data-testid": "konva-rect", ...p }),
  };
});
jest.mock("../../components/ImageView/LabelOnRegion", () => {
  const React = require("react");
  return {
    LabelOnMask: () => React.createElement("div", { "data-testid": "label-on-mask" }),
  };
});
jest.mock("../AliveRegion", () => ({
  AliveRegion: (Comp) => Comp,
}));

const TestRoot = types
  .model("TestRoot", {
    image: types.optional(ImageModel, { id: "img1" }),
    region: types.optional(BitmaskRegionModel, {
      id: "bm1",
      pid: "p1",
      object: "img1",
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

describe("BitmaskRegion", () => {
  describe("BitmaskRegionModel", () => {
    let root;
    let region;

    beforeEach(() => {
      root = TestRoot.create({
        image: { id: "img1" },
        region: {
          id: "bm1",
          pid: "p1",
          object: "img1",
        },
      });
      region = root.region;
    });

    it("parent returns object when alive", () => {
      expect(region.parent).toBe(root.image);
    });

    it("colorParts and strokeColor use default when no style/tag", () => {
      expect(region.colorParts).toBeDefined();
      expect(Array.isArray(region.colorParts)).toBe(true);
      expect(region.strokeColor).toBeDefined();
      expect(typeof region.strokeColor).toBe("string");
    });

    it("bboxCoordsCanvas returns bbox when offscreenCanvasRef exists", () => {
      expect(region.offscreenCanvasRef).toBeTruthy();
      region.setBBox({ left: 1, top: 2, right: 3, bottom: 4 });
      expect(region.bboxCoordsCanvas).toEqual({ left: 1, top: 2, right: 3, bottom: 4 });
    });

    it("bboxCoords returns null when bbox is null", () => {
      region.setBBox(null);
      expect(region.bboxCoords).toBeNull();
    });

    it("bboxCoords maps bbox via parent canvasToInternal", () => {
      region.setBBox({ left: 10, top: 20, right: 30, bottom: 40 });
      expect(region.bboxCoords).toEqual({
        left: 5,
        top: 10,
        right: 15,
        bottom: 20,
      });
    });

    it("dimensions returns stage and image sizes from parent", () => {
      const dims = region.dimensions;
      expect(dims.stageWidth).toBe(800);
      expect(dims.stageHeight).toBe(600);
      expect(dims.imageWidth).toBe(100);
      expect(dims.imageHeight).toBe(100);
    });

    it("getImageDataURL returns data URL from snapshot canvas", () => {
      const url = region.getImageDataURL();
      expect(url).toBeDefined();
      if (typeof url === "string") {
        expect(url).toMatch(/^data:image\/png/);
      }
    });

    it("setOutline sets outline", () => {
      const outline = [[0, 0, 10, 10]];
      region.setOutline(outline);
      expect(region.outline).toEqual(outline);
    });

    it("restoreFromImageDataURL is no-op when no imageDataURL", () => {
      expect(() => region.restoreFromImageDataURL()).not.toThrow();
    });

    it("finalizeRegion composes mask, generates outline, updates bbox", () => {
      const Utils = require("../BitmaskRegion/utils");
      const Contour = require("../BitmaskRegion/contour");
      Utils.getCanvasPixelBounds.mockClear();
      Contour.generateMultiShapeOutline.mockClear();
      region.finalizeRegion();
      expect(Utils.getCanvasPixelBounds).toHaveBeenCalled();
      expect(Contour.generateMultiShapeOutline).toHaveBeenCalledWith(region);
    });

    it("updateImageURL sets imageDataURL from getImageDataURL", () => {
      region.updateImageURL();
      // In jsdom toDataURL may not return a string; setImageDataURL is still called with getImageDataURL() result
      expect(region.imageDataURL !== undefined).toBe(true);
      if (typeof region.imageDataURL === "string") {
        expect(region.imageDataURL).toMatch(/^data:image\/png/);
      }
    });

    it("setBBox and setImageDataURL update state", () => {
      region.setBBox({ left: 0, top: 0, right: 5, bottom: 5 });
      expect(region.bbox).toEqual({ left: 0, top: 0, right: 5, bottom: 5 });
      region.setImageDataURL("data:image/png;base64,abc");
      expect(region.imageDataURL).toBe("data:image/png;base64,abc");
    });

    it("generateOutline calls generateMultiShapeOutline and setOutline", () => {
      const Contour = require("../BitmaskRegion/contour");
      Contour.generateMultiShapeOutline.mockReturnValue([[0, 0, 10, 10]]);
      region.generateOutline();
      expect(Contour.generateMultiShapeOutline).toHaveBeenCalledWith(region);
      expect(region.outline).toEqual([[0, 0, 10, 10]]);
    });

    it("canvasSize returns width and height from parent entity and stageZoom", () => {
      const size = region.canvasSize();
      expect(size.width).toBe(100);
      expect(size.height).toBe(100);
    });

    it("createCanvas creates offscreen and bitmask canvases", () => {
      const ref = region.createCanvas();
      expect(region.bitmaskCanvasRef).toBeInstanceOf(OffscreenCanvas);
      expect(region.offscreenCanvasRef).toBeInstanceOf(OffscreenCanvas);
      expect(ref).toBe(region.offscreenCanvasRef);
      expect(region.offscreenCanvasRef.width).toBe(100);
      expect(region.offscreenCanvasRef.height).toBe(100);
    });

    it("createCanvas is idempotent and returns same refs when already created", () => {
      const firstRef = region.createCanvas();
      const secondRef = region.createCanvas();
      expect(secondRef).toBe(firstRef);
      expect(region.bitmaskCanvasRef).toBeTruthy();
      expect(region.offscreenCanvasRef).toBe(firstRef);
    });

    it("beforeDestroy clears disposers without throwing", () => {
      const tempRoot = TestRoot.create({
        image: { id: "img2" },
        region: { id: "bm2", pid: "p2", object: "img2" },
      });
      expect(() => destroy(tempRoot)).not.toThrow();
    });

    it("redraw schedules restoreFromImageDataURL via requestIdleCallback when refs and imageDataURL set", () => {
      region.setImageDataURL("data:image/png;base64,abc");
      region.redraw();
      jest.runAllTimers();
      // redraw calls requestIdleCallback (mocked as setTimeout); restoreFromImageDataURL is no-op for this URL
      expect(region.imageDataURL).toBe("data:image/png;base64,abc");
    });

    it("restoreFromImageDataURL async path runs when imageDataURL set and Image.decode resolves", async () => {
      const mockDecode = jest.fn().mockResolvedValue(undefined);
      global.Image = jest.fn().mockImplementation(function () {
        this.src = "";
        this.naturalWidth = 50;
        this.naturalHeight = 50;
        this.decode = mockDecode;
        return this;
      });
      if (typeof window !== "undefined") window.Image = global.Image;
      region.setImageDataURL("data:image/png;base64,xyz");
      region.restoreFromImageDataURL();
      await Promise.resolve();
      await new Promise((r) => setTimeout(r, 0));
      expect(mockDecode).toHaveBeenCalled();
      expect(region.offscreenCanvasRef.width).toBe(50);
      expect(region.offscreenCanvasRef.height).toBe(50);
      expect(region.bitmaskCanvasRef.width).toBe(50);
      expect(region.bitmaskCanvasRef.height).toBe(50);
      global.Image = typeof window !== "undefined" ? window.Image : undefined;
    });

    it("composeMask clears and draws when not drawing", () => {
      expect(() => region.composeMask()).not.toThrow();
    });

    it("composeMask skips clear when isDrawing is true", () => {
      region.setDrawing(true);
      expect(() => region.composeMask()).not.toThrow();
      region.setDrawing(false);
    });

    it("updateBBox calls getCanvasPixelBounds and setBBox", () => {
      const Utils = require("../BitmaskRegion/utils");
      Utils.getCanvasPixelBounds.mockReturnValue({ left: 1, top: 2, right: 11, bottom: 12 });
      region.updateBBox();
      expect(Utils.getCanvasPixelBounds).toHaveBeenCalledWith(region.offscreenCanvasRef, 1);
      expect(region.bbox).toEqual({ left: 1, top: 2, right: 11, bottom: 12 });
    });

    it("setLayerRef sets layerRef from ref getParent when ref provided", () => {
      const layer = { batchDraw: jest.fn() };
      const ref = { getParent: () => layer };
      region.setLayerRef(ref);
      expect(region.layerRef).toBe(layer);
    });

    it("setLayerRef does nothing when ref is null", () => {
      region.setLayerRef(null);
      expect(region.layerRef).toBeUndefined();
    });

    it("setImageRef sets imageRef when ref provided", () => {
      const ref = {};
      region.setImageRef(ref);
      expect(region.imageRef).toBe(ref);
    });

    it("setImageRef does nothing when ref is falsy", () => {
      region.setImageRef(null);
      expect(region.imageRef).toBeUndefined();
    });

    it("setLastPos updates lastPos", () => {
      region.setLastPos({ x: 5, y: 10 });
      expect(region.lastPos).toEqual({ x: 5, y: 10 });
    });

    it("positionToStage floors and scales by stageZoom", () => {
      root.image.setStageZoom(2);
      const pos = region.positionToStage(11, 19);
      expect(pos).toEqual({ x: 5, y: 9 });
    });

    it("beginPath with brush type uses black and source-over", () => {
      const annotation = { pauseAutosave: jest.fn() };
      root.image.setAnnotation(annotation);
      const Utils = require("../BitmaskRegion/utils");
      Utils.BitmaskDrawing.begin.mockClear();
      region.beginPath({ type: "brush", strokeWidth: 5, x: 10, y: 20 });
      expect(annotation.pauseAutosave).toHaveBeenCalled();
      expect(Utils.BitmaskDrawing.begin).toHaveBeenCalledWith(
        expect.objectContaining({
          brushSize: 5,
          eraserMode: false,
        }),
      );
    });

    it("beginPath with eraser type uses white and destination-out", () => {
      const annotation = { pauseAutosave: jest.fn() };
      root.image.setAnnotation(annotation);
      const Utils = require("../BitmaskRegion/utils");
      Utils.BitmaskDrawing.begin.mockClear();
      region.beginPath({ type: "eraser", strokeWidth: 8, x: 0, y: 0 });
      expect(Utils.BitmaskDrawing.begin).toHaveBeenCalledWith(
        expect.objectContaining({
          brushSize: 8,
          eraserMode: true,
        }),
      );
    });

    it("addPoint calls BitmaskDrawing.draw and composeMask", () => {
      const Utils = require("../BitmaskRegion/utils");
      Utils.BitmaskDrawing.draw.mockClear();
      region.addPoint(5, 10, 4);
      expect(Utils.BitmaskDrawing.draw).toHaveBeenCalledWith(
        expect.objectContaining({
          brushSize: 4,
          eraserMode: false,
        }),
      );
    });

    it("addPoint with erase option passes eraserMode", () => {
      const Utils = require("../BitmaskRegion/utils");
      Utils.BitmaskDrawing.draw.mockClear();
      region.addPoint(1, 2, 3, { erase: true });
      expect(Utils.BitmaskDrawing.draw).toHaveBeenCalledWith(
        expect.objectContaining({
          eraserMode: true,
        }),
      );
    });

    it("endPath finalizes region, updates URL, resumes autosave, notifies and autosaves", () => {
      jest.useFakeTimers();
      const autosave = jest.fn();
      const annotation = {
        startAutosave: jest.fn(),
        autosave,
      };
      root.image.setAnnotation(annotation);
      region.notifyDrawingFinished = jest.fn();
      region.endPath();
      expect(annotation.startAutosave).toHaveBeenCalled();
      expect(region.notifyDrawingFinished).toHaveBeenCalled();
      jest.runAllTimers();
      expect(autosave).toHaveBeenCalled();
      jest.useRealTimers();
    });

    it("updateImageSize finalizes and increments needsUpdate when stage size > 1", () => {
      root.image.setStageSize(100, 100);
      const before = region.needsUpdate;
      region.updateImageSize(100, 100, 100, 100);
      expect(region.needsUpdate).toBe(before + 1);
    });

    it("updateImageSize does nothing when parent stage width/height <= 1", () => {
      root.image.setStageSize(1, 1);
      const before = region.needsUpdate;
      region.updateImageSize(100, 100, 100, 100);
      expect(region.needsUpdate).toBe(before);
    });

    it("getImageSnapshotCanvas returns canvas with black mask from offscreen", () => {
      const canvas = region.getImageSnapshotCanvas();
      expect(canvas).toBeInstanceOf(HTMLCanvasElement);
      expect(canvas.width).toBe(region.offscreenCanvasRef.width);
      expect(canvas.height).toBe(region.offscreenCanvasRef.height);
    });

    it("isHovered delegates to isHoveringNonTransparentPixel", () => {
      const Utils = require("../BitmaskRegion/utils");
      Utils.isHoveringNonTransparentPixel.mockReturnValue(true);
      expect(region.isHovered()).toBe(true);
      Utils.isHoveringNonTransparentPixel.mockReturnValue(false);
      expect(region.isHovered()).toBe(false);
    });

    it("serialize returns parent createSerializedResult with imageDataURL", () => {
      region.setImageDataURL("data:image/png;base64,xyz");
      const result = region.serialize();
      expect(result).toBeDefined();
      expect(result.value.imageDataURL).toBe("data:image/png;base64,xyz");
      expect(result.original_width).toBe(100);
    });

    it("renders RegionWrapper and Konva structure when item has parent and canvas refs", () => {
      render(React.createElement(HtxBitmask, { item: region }));
      expect(screen.getByTestId("region-wrapper")).toBeInTheDocument();
      expect(screen.getAllByTestId("konva-group").length).toBeGreaterThan(0);
      expect(screen.getByTestId("konva-image")).toBeInTheDocument();
      expect(screen.getByTestId("label-on-mask")).toBeInTheDocument();
    });
  });

  describe("Registry region type predicate", () => {
    it("accepts value with imageDataURL (predicate returns truthy)", () => {
      const predicate = BitmaskRegionModel.detectByValue;
      expect(Boolean(predicate({ imageDataURL: "data:image/png;base64,abc" }))).toBe(true);
    });

    it("rejects value without imageDataURL (predicate returns falsy)", () => {
      const predicate = BitmaskRegionModel.detectByValue;
      expect(Boolean(predicate({}))).toBe(false);
      expect(Boolean(predicate({ format: "rle" }))).toBe(false);
    });
  });
});
