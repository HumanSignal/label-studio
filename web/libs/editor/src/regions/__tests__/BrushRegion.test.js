/**
 * Unit tests for BrushRegion (regions/BrushRegion.jsx).
 * Covers BrushRegionModel views (parent, colorParts, strokeColor, touchesLength,
 * bboxCoordsCanvas, bboxCoords) and actions (serialize, beginPath, endPath,
 * setScale, updateImageSize, endUpdatedMaskDataURL, convertToImage, etc.),
 * and HtxBrush/HtxBrushLayer view rendering.
 */

import React from "react";
import { render, waitFor, fireEvent } from "@testing-library/react";
import { types } from "mobx-state-tree";

let mockBrushImageRef = null;
jest.mock("../../utils/canvas", () => ({
  Region2RLE: jest.fn(),
  RLE2Region: jest.fn(() => ({ onload: null, src: "" })),
  maskDataURL2Image: jest.fn(() => {
    mockBrushImageRef = { onload: null, width: 100, height: 100 };
    return Promise.resolve(mockBrushImageRef);
  }),
}));

jest.mock("../../components/InteractiveOverlays/Geometry", () => ({
  Geometry: {
    getImageDataBBox: jest.fn(() => ({ x: 0, y: 0, width: 50, height: 50 })),
  },
}));

jest.mock("../../utils/feature-flags", () => ({
  isFF: jest.fn(() => false),
  FF_ZOOM_OPTIM: "ff_zoom_optim",
}));

const mockCtx = {
  save: jest.fn(),
  restore: jest.fn(),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  stroke: jest.fn(),
  drawImage: jest.fn(),
  getImageData: jest.fn(() => ({ data: new Uint8ClampedArray(4 * 100 * 100), width: 100, height: 100 })),
  putImageData: jest.fn(),
};
jest.mock("react-konva", () => {
  const React = require("react");
  return {
    Layer: ({ children, ...p }) => React.createElement("div", { "data-testid": "konva-layer", ...p }, children),
    Group: ({ children, ...p }) => React.createElement("div", { "data-testid": "konva-group", ...p }, children),
    Image: (p) => {
      const { hitFunc, image, sceneFunc, ...rest } = p;
      if (hitFunc && image) {
        hitFunc(mockCtx, { colorKey: "#ff0000" });
      }
      return React.createElement("div", { "data-testid": "konva-image", ...rest });
    },
    Shape: (p) => {
      const { sceneFunc, hitFunc, ...rest } = p;
      if (sceneFunc) sceneFunc(mockCtx, {});
      if (hitFunc) hitFunc(mockCtx, { colorKey: "#ff0000" });
      return React.createElement("div", { "data-testid": "konva-shape", ...rest });
    },
  };
});

jest.mock("../../components/ImageView/ImageViewContext", () => ({
  ImageViewContext: require("react").createContext({ suggestion: null }),
}));

const Canvas = require("../../utils/canvas");
const { Geometry } = require("../../components/InteractiveOverlays/Geometry");

function createMockAnnotation(overrides = {}) {
  return {
    pauseAutosave: jest.fn(),
    startAutosave: jest.fn(),
    autosave: jest.fn(),
    isReadOnly: () => false,
    unselectAll: jest.fn(),
    ...overrides,
  };
}

const MockImageModel = types
  .model("MockImageModel", {
    id: types.identifier,
    name: types.optional(types.string, "image"),
  })
  .volatile(() => ({
    naturalWidth: 100,
    naturalHeight: 100,
    stageWidth: 100,
    stageHeight: 100,
    stageScale: 1,
    stageRef: { container: () => ({ style: {} }) },
    alignmentOffset: { x: 0, y: 0 },
    zoomingPositionX: 0,
    zoomingPositionY: 0,
    zoomScale: 1,
    containerWidth: 100,
    containerHeight: 100,
    canvasSize: { width: 100, height: 100 },
    zoomOriginalCoords: ([x, y]) => [x, y],
    canvasToInternalX: (v) => v,
    canvasToInternalY: (v) => v,
    createSerializedResult: (region, value) => ({ value, original_width: 100, original_height: 100 }),
    getSkipInteractions: () => false,
    getToolsManager: () => ({ findSelectedTool: () => null }),
    supportSuggestions: false,
    findImageEntity: () => null,
    annotation: null,
    drawingRegion: null,
  }))
  .actions((self) => ({
    setAnnotation(ann) {
      self.annotation = ann;
    },
    setStageSize(w, h) {
      self.stageWidth = w;
      self.stageHeight = h;
    },
  }));

jest.mock("../../tags/object/Image", () => ({
  ImageModel: MockImageModel,
}));

const { BrushRegionModel, HtxBrush } = require("../BrushRegion");
const { ImageViewContext } = require("../../components/ImageView/ImageViewContext");

describe("BrushRegion", () => {
  let root;
  let region;
  let mockAnnotation;

  const TestRoot = types.model("TestRoot", {
    annotationStore: types.optional(
      types.model({
        selected: types.frozen(),
      }),
      { selected: null },
    ),
    settings: types.optional(
      types.model({
        showLabels: types.optional(types.boolean, false),
      }),
      { showLabels: false },
    ),
    image: types.optional(MockImageModel, { id: "img1" }),
    region: types.optional(BrushRegionModel, {
      id: "br1",
      pid: "p1",
      object: "img1",
      touches: [],
    }),
  });

  beforeEach(() => {
    mockAnnotation = createMockAnnotation();
    root = TestRoot.create({
      annotationStore: { selected: mockAnnotation },
      settings: { showLabels: false },
      image: { id: "img1" },
      region: { id: "br1", pid: "p1", object: "img1", touches: [] },
    });
    root.image.setAnnotation(mockAnnotation);
    region = root.region;
    jest.clearAllMocks();
  });

  describe("BrushRegionModel views", () => {
    it("parent returns object when alive", () => {
      expect(region.parent).toBe(root.image);
    });

    it("touchesLength returns touches length", () => {
      expect(region.touchesLength).toBe(0);
    });

    it("strokeColor returns hex from style or defaultStyle", () => {
      expect(region.strokeColor).toBeDefined();
      expect(typeof region.strokeColor).toBe("string");
    });

    it("bboxCoordsCanvas returns bbox from first touch points when no imageData", () => {
      region.beginPath({ type: "add", strokeWidth: 25 });
      region.addPoint(10, 10);
      region.addPoint(50, 10);
      region.addPoint(50, 50);
      region.addPoint(10, 50);
      region.endPath();
      const bbox = region.bboxCoordsCanvas;
      expect(bbox).toEqual({ left: 10, top: 10, right: 50, bottom: 50 });
    });

    it("bboxCoordsCanvas returns bbox from imageData when imageData is set", () => {
      Geometry.getImageDataBBox.mockReturnValue({ x: 10, y: 20, width: 40, height: 30 });
      const mockRef = {
        canvas: { _canvas: { style: {} }, width: 100, height: 100 },
        toCanvas: jest.fn().mockReturnValue({
          getContext: () => ({
            getImageData: () => ({ data: new Uint8ClampedArray(4 * 100 * 100), width: 100, height: 100 }),
          }),
        }),
      };
      region.setLayerRef(mockRef);
      region.cacheImageData();
      expect(region.imageData).not.toBeNull();
      const bbox = region.bboxCoordsCanvas;
      expect(Geometry.getImageDataBBox).toHaveBeenCalled();
      expect(bbox).not.toBeNull();
      expect(bbox.left).toBeDefined();
      expect(bbox.top).toBeDefined();
      expect(bbox.right).toBeDefined();
      expect(bbox.bottom).toBeDefined();
    });

    it("bboxCoordsCanvas returns null when imageData is set but getImageDataBBox returns null", () => {
      Geometry.getImageDataBBox.mockReturnValue(null);
      const mockRef = {
        canvas: { _canvas: { style: {} }, width: 1, height: 1 },
        toCanvas: jest.fn().mockReturnValue({
          getContext: () => ({ getImageData: () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 }) }),
        }),
      };
      region.setLayerRef(mockRef);
      region.cacheImageData();
      const bbox = region.bboxCoordsCanvas;
      expect(bbox).toBeNull();
    });
  });

  describe("serialize", () => {
    it("returns result from parent.createSerializedResult with fast option when rle present", () => {
      const rootWithRle = TestRoot.create({
        annotationStore: { selected: mockAnnotation },
        image: { id: "img1" },
        region: { id: "br2", pid: "p2", object: "img1", touches: [], rle: [1, 2, 3] },
      });
      rootWithRle.image.setAnnotation(mockAnnotation);
      const result = rootWithRle.region.serialize({ fast: true });
      expect(result).toBeDefined();
      expect(result.value.format).toBe("rle");
      expect(result.value.rle).toEqual([1, 2, 3]);
    });

    it("serialize(fast: true) includes touches and maskDataURL when set", () => {
      region.beginPath({ type: "add", strokeWidth: 25 });
      region.addPoint(0, 0);
      region.addPoint(10, 10);
      region.endPath();
      region.endUpdatedMaskDataURL("data:image/png;base64,abc");
      const result = region.serialize({ fast: true });
      expect(result.value.touches).toBeDefined();
      expect(result.value.maskDataURL).toBe("data:image/png;base64,abc");
    });

    it("serialize() without fast returns null when Region2RLE returns empty", () => {
      Canvas.Region2RLE.mockReturnValue(null);
      const result = region.serialize();
      expect(result).toBeNull();
    });

    it("serialize() without fast returns createSerializedResult when Region2RLE returns non-empty", () => {
      Canvas.Region2RLE.mockReturnValue(new Uint8Array([1, 2, 3]));
      region.beginPath({ type: "add", strokeWidth: 25 });
      region.addPoint(0, 0);
      region.addPoint(10, 10);
      region.endPath();
      const result = region.serialize();
      expect(result).toBeDefined();
      expect(result.value.rle).toEqual([1, 2, 3]);
    });
  });

  describe("actions", () => {
    it("setScale updates scaleX and scaleY", () => {
      region.setScale(2, 3);
      expect(region.scaleX).toBe(2);
      expect(region.scaleY).toBe(3);
    });

    it("updateMaskImage sets maskImage src when maskDataURL present", () => {
      region.updateMaskImage();
      region.endUpdatedMaskDataURL("data:image/png;base64,x");
      region.updateMaskImage();
      expect(region.getMaskImage()).toBeDefined();
    });

    it("beginPath calls annotation.pauseAutosave and returns Points instance", () => {
      const pathPoints = region.beginPath({ type: "add", strokeWidth: 25 });
      expect(mockAnnotation.pauseAutosave).toHaveBeenCalled();
      expect(pathPoints).toBeDefined();
      expect(pathPoints.type).toBe("add");
    });

    it("beginPath with type eraser returns Points with type eraser", () => {
      const pathPoints = region.beginPath({ type: "eraser", strokeWidth: 30 });
      expect(pathPoints.type).toBe("eraser");
    });

    it("endPath calls startAutosave, pushes touch and sets currentTouch", () => {
      const pathPoints = region.beginPath({ type: "add", strokeWidth: 25 });
      region.addPoint(0, 0);
      region.addPoint(10, 10);
      region.endPath();
      expect(mockAnnotation.startAutosave).toHaveBeenCalled();
      expect(region.touches.length).toBe(1);
      expect(region.currentTouch).toBe(pathPoints);
    });

    it("endPath with only two points duplicates to form a line", () => {
      region.beginPath({ type: "add", strokeWidth: 25 });
      region.addPoint(0, 0);
      region.addPoint(10, 10);
      region.endPath();
      expect(region.touches.length).toBe(1);
      expect(region.touches[0].points.length).toBe(4);
    });

    it("endUpdatedMaskDataURL sets maskDataURL and calls startAutosave", () => {
      region.endUpdatedMaskDataURL("data:image/png;base64,xyz");
      expect(region.maskDataURL).toBe("data:image/png;base64,xyz");
      expect(mockAnnotation.startAutosave).toHaveBeenCalled();
    });

    it("updateImageSize updates touches when stage size > 1", () => {
      region.beginPath({ type: "add", strokeWidth: 25 });
      region.addPoint(0, 0);
      region.addPoint(10, 10);
      region.endPath();
      const initialUpdate = region.needsUpdate;
      region.updateImageSize(100, 100, 100, 100);
      expect(region.needsUpdate).toBe(initialUpdate + 1);
    });

    it("updateImageSize does nothing when stage width or height <= 1", () => {
      root.image.setStageSize(1, 1);
      const initialUpdate = region.needsUpdate;
      region.updateImageSize(1, 1, 1, 1);
      expect(region.needsUpdate).toBe(initialUpdate);
    });

    it("convertToImage clears touches and sets rle when touches exist", () => {
      Canvas.Region2RLE.mockReturnValue(new Uint8Array([5, 6, 7]));
      region.beginPath({ type: "add", strokeWidth: 25 });
      region.addPoint(0, 0);
      region.addPoint(10, 10);
      region.endPath();
      expect(region.touches.length).toBe(1);
      region.convertToImage();
      expect(region.touches.length).toBe(0);
      expect(region.rle).toEqual([5, 6, 7]);
    });

    it("convertToImage does nothing when touches empty", () => {
      region.convertToImage();
      expect(region.touches.length).toBe(0);
      expect(region.rle).toBeUndefined();
    });

    it("prepareCoords returns parent.zoomOriginalCoords result", () => {
      const result = region.prepareCoords([10, 20]);
      expect(result).toEqual([10, 20]);
    });

    it("convertPointsToMask is a no-op", () => {
      expect(() => region.convertPointsToMask()).not.toThrow();
    });

    it("setLayerRef sets layerRef and canvas opacity when ref provided", () => {
      const mockLayer = {
        canvas: { _canvas: { style: {} } },
      };
      region.setLayerRef(mockLayer);
      expect(region.layerRef).toBe(mockLayer);
      expect(mockLayer.canvas._canvas.style.opacity).toBe(region.opacity);
    });

    it("setLayerRef does nothing when ref is falsy", () => {
      region.setLayerRef(null);
      expect(region.layerRef).toBeUndefined();
    });

    it("cacheImageData sets imageData to null when no layerRef", () => {
      region.cacheImageData();
      expect(region.imageData).toBeNull();
    });

    it("cacheImageData sets imageData from layerRef.toCanvas when layerRef exists", () => {
      const getImageData = jest.fn().mockReturnValue({ data: new Uint8ClampedArray(400), width: 10, height: 10 });
      const mockRef = {
        canvas: { _canvas: { style: {} }, width: 10, height: 10 },
        toCanvas: jest.fn().mockReturnValue({ getContext: () => ({ getImageData }) }),
      };
      region.setLayerRef(mockRef);
      region.cacheImageData();
      expect(region.imageData).not.toBeNull();
      expect(region.imageData.width).toBe(10);
      expect(region.imageData.height).toBe(10);
      expect(getImageData).toHaveBeenCalledWith(0, 0, 10, 10);
    });
  });

  describe("preDraw", () => {
    it("preDraw does nothing when layerRef is not set", () => {
      region.beginPath({ type: "add", strokeWidth: 25 });
      expect(() => region.preDraw(5, 5)).not.toThrow();
    });

    it("preDraw draws with layerRef and uses ctx when FF_ZOOM_OPTIM is false", () => {
      const featureFlags = require("../../utils/feature-flags");
      featureFlags.isFF.mockReturnValue(false);
      const ctx = {
        save: jest.fn(),
        restore: jest.fn(),
        beginPath: jest.fn(),
        moveTo: jest.fn(),
        lineTo: jest.fn(),
        rect: jest.fn(),
        clip: jest.fn(),
        lineCap: "",
        lineJoin: "",
        lineWidth: 0,
        strokeStyle: "",
        globalCompositeOperation: "",
        stroke: jest.fn(),
      };
      const mockRef = {
        canvas: { _canvas: { style: {} }, context: ctx, width: 100, height: 100 },
      };
      region.setLayerRef(mockRef);
      region.beginPath({ type: "add", strokeWidth: 25 });
      region.preDraw(10, 20);
      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.moveTo).toHaveBeenCalledWith(10, 20);
      expect(ctx.lineTo).toHaveBeenCalled();
      expect(ctx.stroke).toHaveBeenCalled();
      expect(ctx.restore).toHaveBeenCalled();
      featureFlags.isFF.mockReturnValue(false);
    });

    it("preDraw uses clip rect when FF_ZOOM_OPTIM is true", () => {
      const featureFlags = require("../../utils/feature-flags");
      featureFlags.isFF.mockReturnValue(true);
      const ctx = {
        save: jest.fn(),
        restore: jest.fn(),
        beginPath: jest.fn(),
        moveTo: jest.fn(),
        lineTo: jest.fn(),
        rect: jest.fn(),
        clip: jest.fn(),
        lineCap: "",
        lineJoin: "",
        lineWidth: 0,
        strokeStyle: "",
        globalCompositeOperation: "",
        stroke: jest.fn(),
      };
      const mockRef = {
        canvas: { _canvas: { style: {} }, context: ctx, width: 100, height: 100 },
      };
      region.setLayerRef(mockRef);
      region.beginPath({ type: "add", strokeWidth: 25 });
      region.preDraw(5, 5);
      expect(ctx.rect).toHaveBeenCalled();
      expect(ctx.clip).toHaveBeenCalled();
      featureFlags.isFF.mockReturnValue(false);
    });

    it("preDraw uses cachedPoints when multiple points added", () => {
      const featureFlags = require("../../utils/feature-flags");
      featureFlags.isFF.mockReturnValue(false);
      const ctx = {
        save: jest.fn(),
        restore: jest.fn(),
        beginPath: jest.fn(),
        moveTo: jest.fn(),
        lineTo: jest.fn(),
        rect: jest.fn(),
        clip: jest.fn(),
        lineCap: "",
        lineJoin: "",
        lineWidth: 0,
        strokeStyle: "",
        globalCompositeOperation: "",
        stroke: jest.fn(),
      };
      const mockRef = {
        canvas: { _canvas: { style: {} }, context: ctx, width: 100, height: 100 },
      };
      region.setLayerRef(mockRef);
      region.beginPath({ type: "add", strokeWidth: 25 });
      region.addPoint(1, 1);
      region.addPoint(2, 2);
      region.addPoint(3, 3);
      region.addPoint(4, 4);
      region.addPoint(5, 5);
      expect(ctx.moveTo).toHaveBeenCalled();
      expect(ctx.lineTo).toHaveBeenCalled();
      featureFlags.isFF.mockReturnValue(false);
    });
  });

  describe("Points (from beginPath)", () => {
    it("setType toggles eraser type", () => {
      region.beginPath({ type: "add", strokeWidth: 25 });
      region.addPoint(0, 0);
      region.addPoint(10, 10);
      region.endPath();
      const stroke = region.touches[0];
      expect(stroke.compositeOperation).toBe("source-over");
      stroke.setType("eraser");
      expect(stroke.type).toBe("eraser");
      expect(stroke.compositeOperation).toBe("destination-out");
    });

    it("rescale returns points scaled by destW/origW", () => {
      region.beginPath({ type: "add", strokeWidth: 25 });
      region.addPoint(10, 20);
      region.addPoint(30, 40);
      region.endPath();
      const stroke = region.touches[0];
      const rescaled = stroke.rescale(100, 100, 200);
      expect(rescaled).toEqual([
        stroke.points[0] * 2,
        stroke.points[1] * 2,
        stroke.points[2] * 2,
        stroke.points[3] * 2,
      ]);
    });

    it("scaledStrokeWidth returns strokeWidth scaled by destW/origW", () => {
      region.beginPath({ type: "add", strokeWidth: 25 });
      region.addPoint(0, 0);
      region.addPoint(10, 10);
      region.endPath();
      const stroke = region.touches[0];
      const w = stroke.scaledStrokeWidth(100, 100, 200);
      expect(w).toBe(stroke.strokeWidth * 2);
    });
  });

  describe("bboxCoords", () => {
    it("returns bbox with exact coords from touch points", () => {
      region.beginPath({ type: "add", strokeWidth: 25 });
      region.addPoint(5, 5);
      region.addPoint(15, 15);
      region.endPath();
      const bbox = region.bboxCoords;
      expect(bbox).not.toBeNull();
      expect(bbox.left).toBe(5);
      expect(bbox.top).toBe(5);
      expect(bbox.right).toBe(15);
      expect(bbox.bottom).toBe(15);
    });
  });

  describe("HtxBrush component", () => {
    it("renders when item has parent and annotation", () => {
      const { getAllByTestId } = render(
        <ImageViewContext.Provider value={{ suggestion: null }}>
          <HtxBrush item={region} />
        </ImageViewContext.Provider>,
      );
      expect(getAllByTestId("konva-layer").length).toBeGreaterThanOrEqual(1);
    });

    it("renders brush layer and shape when region has touches", () => {
      region.beginPath({ type: "add", strokeWidth: 25 });
      region.addPoint(0, 0);
      region.addPoint(10, 10);
      region.endPath();
      const { getAllByTestId } = render(
        <ImageViewContext.Provider value={{ suggestion: null }}>
          <HtxBrush item={region} />
        </ImageViewContext.Provider>,
      );
      expect(getAllByTestId("konva-layer").length).toBeGreaterThanOrEqual(1);
      expect(getAllByTestId("konva-shape").length).toBeGreaterThanOrEqual(1);
    });

    it("loads image from maskDataURL and calls setReady when onload fires", async () => {
      region.endUpdatedMaskDataURL("data:image/png;base64,test");
      mockBrushImageRef = null;
      render(
        <ImageViewContext.Provider value={{ suggestion: null }}>
          <HtxBrush item={region} />
        </ImageViewContext.Provider>,
      );
      await waitFor(() => {
        expect(mockBrushImageRef).not.toBeNull();
      });
      if (mockBrushImageRef && typeof mockBrushImageRef.onload === "function") {
        mockBrushImageRef.onload();
      }
      await waitFor(() => {
        expect(Canvas.maskDataURL2Image).toHaveBeenCalledWith("data:image/png;base64,test", expect.any(Object));
      });
    });

    it("handles Group onMouseOver and onMouseOut without throwing", () => {
      const { getAllByTestId } = render(
        <ImageViewContext.Provider value={{ suggestion: null }}>
          <HtxBrush item={region} />
        </ImageViewContext.Provider>,
      );
      const groups = getAllByTestId("konva-group");
      const segmentationGroup = groups.find((g) => g.getAttribute("name") === "segmentation") ?? groups[0];
      expect(() => {
        fireEvent.mouseOver(segmentationGroup);
        fireEvent.mouseOut(segmentationGroup);
      }).not.toThrow();
    });

    it("calls setHighlight and updateCursor when isLinkingMode and mouseOver/mouseOut", () => {
      const linkingRoot = TestRoot.create({
        annotationStore: { selected: { ...createMockAnnotation(), isLinkingMode: true } },
        settings: { showLabels: false },
        image: { id: "img1" },
        region: { id: "br4", pid: "p4", object: "img1", touches: [] },
      });
      linkingRoot.image.setAnnotation(linkingRoot.annotationStore.selected);
      const setHighlightSpy = jest.spyOn(linkingRoot.region, "setHighlight");
      const { getAllByTestId } = render(
        <ImageViewContext.Provider value={{ suggestion: null }}>
          <HtxBrush item={linkingRoot.region} />
        </ImageViewContext.Provider>,
      );
      const groups = getAllByTestId("konva-group");
      const segmentationGroup = groups.find((g) => g.getAttribute("name") === "segmentation") ?? groups[0];
      fireEvent.mouseOver(segmentationGroup);
      expect(setHighlightSpy).toHaveBeenCalledWith(true);
      fireEvent.mouseOut(segmentationGroup);
      expect(setHighlightSpy).toHaveBeenCalledWith(false);
      setHighlightSpy.mockRestore();
    });

    it("handles Group onMouseDown when isLinkingMode without throwing", () => {
      const linkingRoot = TestRoot.create({
        annotationStore: { selected: { ...createMockAnnotation(), isLinkingMode: true } },
        settings: { showLabels: false },
        image: { id: "img1" },
        region: { id: "br4", pid: "p4", object: "img1", touches: [] },
      });
      linkingRoot.image.setAnnotation(linkingRoot.annotationStore.selected);
      const { getAllByTestId } = render(
        <ImageViewContext.Provider value={{ suggestion: null }}>
          <HtxBrush item={linkingRoot.region} />
        </ImageViewContext.Provider>,
      );
      const groups = getAllByTestId("konva-group");
      const segmentationGroup = groups.find((g) => g.getAttribute("name") === "segmentation") ?? groups[0];
      expect(() => fireEvent.mouseDown(segmentationGroup)).not.toThrow();
    });

    it("renders Image with imageHitFunc when image loads from maskDataURL", async () => {
      region.endUpdatedMaskDataURL("data:image/png;base64,hit");
      mockBrushImageRef = null;
      render(
        <ImageViewContext.Provider value={{ suggestion: null }}>
          <HtxBrush item={region} />
        </ImageViewContext.Provider>,
      );
      await waitFor(() => expect(mockBrushImageRef).not.toBeNull());
      if (mockBrushImageRef && typeof mockBrushImageRef.onload === "function") mockBrushImageRef.onload();
      await waitFor(() => {
        expect(mockCtx.drawImage).toHaveBeenCalled();
        expect(mockCtx.getImageData).toHaveBeenCalled();
        expect(mockCtx.putImageData).toHaveBeenCalled();
      });
    });

    it("renders with eraser touch without throwing", () => {
      region.beginPath({ type: "eraser", strokeWidth: 25 });
      region.addPoint(0, 0);
      region.addPoint(10, 10);
      region.endPath();
      expect(() =>
        render(
          <ImageViewContext.Provider value={{ suggestion: null }}>
            <HtxBrush item={region} />
          </ImageViewContext.Provider>,
        ),
      ).not.toThrow();
    });

    it("Group onClick calls setHighlight(false) and onClickRegion when not linking and MoveTool", () => {
      const mst = require("mobx-state-tree");
      const origGetType = mst.getType;
      mst.getType = jest.fn().mockReturnValue({ name: "MoveTool" });
      const mockGetToolsManager = jest.fn().mockReturnValue({ findSelectedTool: () => ({}) });
      jest.spyOn(root.image, "getToolsManager").mockImplementation(mockGetToolsManager);
      const setHighlightSpy = jest.spyOn(region, "setHighlight");
      const onClickRegionSpy = jest.spyOn(region, "onClickRegion").mockImplementation(() => {});
      const { getAllByTestId } = render(
        <ImageViewContext.Provider value={{ suggestion: null }}>
          <HtxBrush item={region} />
        </ImageViewContext.Provider>,
      );
      const groups = getAllByTestId("konva-group");
      const segmentationGroup = groups.find((g) => g.getAttribute("name") === "segmentation") ?? groups[0];
      fireEvent.click(segmentationGroup);
      expect(setHighlightSpy).toHaveBeenCalledWith(false);
      expect(onClickRegionSpy).toHaveBeenCalled();
      setHighlightSpy.mockRestore();
      onClickRegionSpy.mockRestore();
      mst.getType = origGetType;
    });
  });
});
