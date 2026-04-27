/**
 * Unit tests for BrushRegion (regions/BrushRegion.jsx).
 * Covers BrushRegionModel views (parent, colorParts, strokeColor, touchesLength,
 * bboxCoordsCanvas, bboxCoords) and actions (serialize, beginPath, endPath,
 * setScale, updateImageSize, endUpdatedMaskDataURL, convertToImage, etc.),
 * and HtxBrush/HtxBrushLayer view rendering.
 */

import { render, fireEvent, act } from "@testing-library/react";
import { types } from "mobx-state-tree";
const ff = mockFF();

let mockBrushImageRef = null;
mockModule("../../utils/canvas", () => ({
  Region2RLE: mock(),
  RLE2Region: mock(() => ({ onload: null, src: "" })),
  maskDataURL2Image: mock(() => {
    mockBrushImageRef = { onload: null, width: 100, height: 100 };
    return Promise.resolve(mockBrushImageRef);
  }),
}));

mockModule("../../components/InteractiveOverlays/Geometry", () => ({
  Geometry: {
    getImageDataBBox: mock(() => ({ x: 0, y: 0, width: 50, height: 50 })),
  },
}));

const mockCtx = {
  save: mock(),
  restore: mock(),
  beginPath: mock(),
  moveTo: mock(),
  lineTo: mock(),
  stroke: mock(),
  drawImage: mock(),
  getImageData: mock(() => ({ data: new Uint8ClampedArray(4 * 100 * 100), width: 100, height: 100 })),
  putImageData: mock(),
  getTransform: mock(() => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })),
  setTransform: mock(),
  clearRect: mock(),
  canvas: { width: 100, height: 100 },
};
mockModule("react-konva", () => {
  const React = require("react");
  return {
    Layer: React.forwardRef(({ children, ...p }, ref) => {
      const { visible, opacity, clip, ...rest } = p;
      return React.createElement("div", { "data-testid": "konva-layer", ref, ...rest }, children);
    }),
    Group: React.forwardRef(({ children, ...p }, ref) => {
      const {
        shadowColor,
        shadowBlur,
        shadowOffsetX,
        shadowOffsetY,
        shadowOpacity,
        attrMy,
        hitFunc,
        sceneFunc,
        visible,
        opacity,
        clip,
        listening,
        ...rest
      } = p;
      return React.createElement("div", { "data-testid": "konva-group", ref, ...rest }, children);
    }),
    Image: React.forwardRef((p, ref) => {
      const { hitFunc, image, sceneFunc, width, height, ...rest } = p;
      if (hitFunc && image) {
        hitFunc(mockCtx, { colorKey: "#ff0000" });
      }
      return React.createElement("div", { "data-testid": "konva-image", ref, ...rest });
    }),
    Shape: React.forwardRef((p, ref) => {
      const { sceneFunc, hitFunc, ...rest } = p;
      if (sceneFunc) sceneFunc(mockCtx, {});
      if (hitFunc) hitFunc(mockCtx, { colorKey: "#ff0000" });
      return React.createElement("div", { "data-testid": "konva-shape", ref, ...rest });
    }),
  };
});

mockModule("../../components/ImageView/ImageViewContext", () => ({
  ImageViewContext: require("react").createContext({ suggestion: null }),
}));

const _Canvas = require("../../utils/canvas");
const { Geometry } = require("../../components/InteractiveOverlays/Geometry");

function createMockAnnotation(overrides = {}) {
  return {
    pauseAutosave: mock(),
    startAutosave: mock(),
    autosave: mock(),
    isReadOnly: () => false,
    unselectAll: mock(),
    regionStore: { isSelected: () => false },
    ...overrides,
  };
}

const MockImageModel = types
  .model("ImageModel", {
    id: types.identifier,
    name: types.optional(types.string, "image"),
  })
  .volatile(() => ({
    _layerVisible: true,
    naturalWidth: 100,
    naturalHeight: 100,
    stageWidth: 100,
    stageHeight: 100,
    stageScale: 1,
    stageRef: {
      _width: 100,
      _height: 100,
      _scaleX: 1,
      _scaleY: 1,
      _x: 0,
      _y: 0,
      _offsetX: 0,
      _offsetY: 0,
      _rotation: 0,
      container: () => ({ style: {} }),
      findOne: () => ({
        visible: () => true,
        show: mock(),
        hide: mock(),
        toCanvas: () => ({
          getContext: () => ({
            getImageData: () => ({ data: new Uint8ClampedArray(4 * 100 * 100), width: 100, height: 100 }),
          }),
        }),
      }),
      getWidth() {
        return this._width;
      },
      getHeight() {
        return this._height;
      },
      getScaleX() {
        return this._scaleX;
      },
      getScaleY() {
        return this._scaleY;
      },
      getX() {
        return this._x;
      },
      getY() {
        return this._y;
      },
      getOffsetX() {
        return this._offsetX;
      },
      getOffsetY() {
        return this._offsetY;
      },
      getRotation() {
        return this._rotation;
      },
      setWidth(v) {
        this._width = v;
        return this;
      },
      setHeight(v) {
        this._height = v;
        return this;
      },
      setScaleX(v) {
        this._scaleX = v;
        return this;
      },
      setScaleY(v) {
        this._scaleY = v;
        return this;
      },
      setX(v) {
        this._x = v;
        return this;
      },
      setY(v) {
        this._y = v;
        return this;
      },
      setOffsetX(v) {
        this._offsetX = v;
        return this;
      },
      setOffsetY(v) {
        this._offsetY = v;
        return this;
      },
      setRotation(v) {
        this._rotation = v;
        return this;
      },
      drawScene: mock(),
    },
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
    createSerializedResult: (_region, value) => ({ value, original_width: 100, original_height: 100 }),
    getSkipInteractions: () => false,
    getToolsManager: () => ({ findSelectedTool: () => null }),
    supportSuggestions: false,
    findImageEntity: () => ({ naturalWidth: 100, naturalHeight: 100, stageWidth: 100, stageHeight: 100 }),
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
    setStageRef(stage) {
      self.stageRef = stage;
    },
  }));

mockModule("../../tags/object/Image", () => ({
  ImageModel: MockImageModel,
}));

const { BrushRegionModel, HtxBrush } = require("../BrushRegion");
const { ImageModel } = require("../../tags/object/Image");
const { ImageViewContext } = require("../../components/ImageView/ImageViewContext");

describe("BrushRegion", () => {
  let root;
  let region;
  let mockAnnotation;
  let originalError;

  beforeAll(() => {
    originalError = console.error;
    console.error = (...args) => {
      const msg = typeof args[0] === "string" ? args[0] : "";
      if (msg.includes("was not wrapped in act") || msg.includes("for a non-boolean attribute `visible`")) {
        return;
      }
      originalError(...args);
    };
  });

  afterAll(() => {
    console.error = originalError;
  });

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
    image: types.optional(ImageModel, { id: "img1" }),
    region: types.optional(BrushRegionModel, {
      id: "br1",
      pid: "p1",
      object: "image",
      touches: [],
    }),
  });

  const stubRegionObjectRefs = (targetRoot) => {
    try {
      if (typeof targetRoot.image.findImageEntity !== "function") {
        Object.defineProperty(targetRoot.image, "findImageEntity", {
          configurable: true,
          value: () => ({ naturalWidth: 100, naturalHeight: 100 }),
        });
      }
      Object.defineProperty(targetRoot.region, "object", {
        configurable: true,
        get: () => targetRoot.image,
      });
      Object.defineProperty(targetRoot.region, "parent", {
        configurable: true,
        get: () => targetRoot.image,
      });
      Object.defineProperty(targetRoot.region, "currentImageEntity", {
        configurable: true,
        get: () => ({ naturalWidth: 100, naturalHeight: 100 }),
      });
    } catch {
      // Ignore when runtime prevents redefining model accessors.
    }
  };

  beforeEach(() => {
    restoreAllMocks();
    mockAnnotation = createMockAnnotation();
    root = TestRoot.create({
      annotationStore: { selected: mockAnnotation },
      settings: { showLabels: false },
      image: { id: "img1", name: "image" },
      region: { id: "br1", pid: "p1", object: "image", touches: [] },
    });
    root.image.setAnnotation(mockAnnotation);
    region = root.region;
    stubRegionObjectRefs(root);
    clearAllMocks();
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

    it("bboxCoordsCanvas returns bbox from touch points", () => {
      region.beginPath({ type: "add", strokeWidth: 25 });
      region.addPoint(10, 10);
      region.addPoint(50, 10);
      region.addPoint(50, 50);
      region.addPoint(10, 50);
      region.endPath();
      const bbox = region.bboxCoordsCanvas;
      expect(bbox).toEqual({ left: 10, top: 10, right: 50, bottom: 50 });
    });
  });

  describe("serialize", () => {
    it("returns result from parent.createSerializedResult with fast option when rle present", () => {
      const rootWithRle = TestRoot.create({
        annotationStore: { selected: mockAnnotation },
        image: { id: "img1", name: "image" },
        region: { id: "br2", pid: "p2", object: "image", touches: [], rle: [1, 2, 3] },
      });
      rootWithRle.image.setAnnotation(mockAnnotation);
      stubRegionObjectRefs(rootWithRle);
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

    it("serialize() without fast returns null when stage is unavailable", () => {
      root.image.setStageRef(null);
      const result = region.serialize();
      expect(result).toBeNull();
    });

    it("serialize() without fast returns createSerializedResult when Region2RLE returns non-empty", () => {
      region.beginPath({ type: "add", strokeWidth: 25 });
      region.addPoint(0, 0);
      region.addPoint(10, 10);
      region.endPath();
      const result = region.serialize();
      expect(result).toBeDefined();
      expect(Array.isArray(result.value.rle)).toBe(true);
      expect(result.value.rle.length).toBeGreaterThan(0);
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
      region.beginPath({ type: "add", strokeWidth: 25 });
      region.addPoint(0, 0);
      region.addPoint(10, 10);
      region.endPath();
      expect(region.touches.length).toBe(1);
      region.convertToImage();
      expect(region.touches.length).toBe(0);
      expect(Array.isArray(region.rle)).toBe(true);
      expect(region.rle.length).toBeGreaterThan(0);
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

    it("setLayerRef sets layerRef when ref provided", () => {
      const mockLayer = {
        canvas: { _canvas: { style: {} } },
      };
      region.setLayerRef(mockLayer);
      expect(region.layerRef).toBe(mockLayer);
    });

    it("setLayerRef does nothing when ref is falsy", () => {
      region.setLayerRef(null);
      expect(region.layerRef).toBeUndefined();
    });
  });

  describe("preDraw", () => {
    it("preDraw does nothing when layerRef is not set", () => {
      region.beginPath({ type: "add", strokeWidth: 25 });
      expect(() => region.preDraw(5, 5)).not.toThrow();
    });

    it("preDraw uses clip rect from alignment and stage scale", () => {
      ff.reset();
      const ctx = {
        save: mock(),
        restore: mock(),
        beginPath: mock(),
        moveTo: mock(),
        lineTo: mock(),
        rect: mock(),
        clip: mock(),
        lineCap: "",
        lineJoin: "",
        lineWidth: 0,
        strokeStyle: "",
        globalCompositeOperation: "",
        stroke: mock(),
      };
      const mockRef = {
        getLayer: () => ({ canvas: { context: ctx } }),
        canvas: { _canvas: { style: {} }, context: ctx, width: 100, height: 100 },
      };
      region.setLayerRef(mockRef);
      region.beginPath({ type: "add", strokeWidth: 25 });
      region.preDraw(5, 5);
      expect(ctx.rect).toHaveBeenCalled();
      expect(ctx.clip).toHaveBeenCalled();
    });

    it("preDraw uses cachedPoints when multiple points added", () => {
      ff.reset();
      const ctx = {
        save: mock(),
        restore: mock(),
        beginPath: mock(),
        moveTo: mock(),
        lineTo: mock(),
        rect: mock(),
        clip: mock(),
        lineCap: "",
        lineJoin: "",
        lineWidth: 0,
        strokeStyle: "",
        globalCompositeOperation: "",
        stroke: mock(),
      };
      const mockRef = {
        getLayer: () => ({ canvas: { context: ctx } }),
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
      ff.reset();
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
      expect(getAllByTestId("konva-group").length).toBeGreaterThanOrEqual(1);
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
      expect(getAllByTestId("konva-group").length).toBeGreaterThanOrEqual(1);
      expect(getAllByTestId("konva-shape").length).toBeGreaterThanOrEqual(1);
    });

    it("loads image from maskDataURL without crashing", async () => {
      region.endUpdatedMaskDataURL("data:image/png;base64,test");
      mockBrushImageRef = null;
      const { getAllByTestId } = render(
        <ImageViewContext.Provider value={{ suggestion: null }}>
          <HtxBrush item={region} />
        </ImageViewContext.Provider>,
      );
      expect(getAllByTestId("konva-group").length).toBeGreaterThanOrEqual(1);
      if (mockBrushImageRef && typeof mockBrushImageRef.onload === "function") {
        mockBrushImageRef.onload();
      }
      await Promise.resolve();
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
        act(() => {
          fireEvent.mouseOver(segmentationGroup);
          fireEvent.mouseOut(segmentationGroup);
        });
      }).not.toThrow();
    });

    it("calls setHighlight and updateCursor when isLinkingMode and mouseOver/mouseOut", () => {
      const linkingRoot = TestRoot.create({
        annotationStore: { selected: { ...createMockAnnotation(), isLinkingMode: true } },
        settings: { showLabels: false },
        image: { id: "img1", name: "image" },
        region: { id: "br4", pid: "p4", object: "image", touches: [] },
      });
      linkingRoot.image.setAnnotation(linkingRoot.annotationStore.selected);
      stubRegionObjectRefs(linkingRoot);
      const setHighlightSpy = spyOn(linkingRoot.region, "setHighlight");
      const { getAllByTestId } = render(
        <ImageViewContext.Provider value={{ suggestion: null }}>
          <HtxBrush item={linkingRoot.region} />
        </ImageViewContext.Provider>,
      );
      const groups = getAllByTestId("konva-group");
      const segmentationGroup = groups.find((g) => g.getAttribute("name") === "segmentation") ?? groups[0];
      act(() => {
        fireEvent.mouseOver(segmentationGroup);
      });
      expect(setHighlightSpy).toHaveBeenCalledWith(true);
      act(() => {
        fireEvent.mouseOut(segmentationGroup);
      });
      expect(setHighlightSpy).toHaveBeenCalledWith(false);
      setHighlightSpy.mockRestore();
    });

    it("handles Group onMouseDown when isLinkingMode without throwing", () => {
      const linkingRoot = TestRoot.create({
        annotationStore: { selected: { ...createMockAnnotation(), isLinkingMode: true } },
        settings: { showLabels: false },
        image: { id: "img1", name: "image" },
        region: { id: "br4", pid: "p4", object: "image", touches: [] },
      });
      linkingRoot.image.setAnnotation(linkingRoot.annotationStore.selected);
      stubRegionObjectRefs(linkingRoot);
      const { getAllByTestId } = render(
        <ImageViewContext.Provider value={{ suggestion: null }}>
          <HtxBrush item={linkingRoot.region} />
        </ImageViewContext.Provider>,
      );
      const groups = getAllByTestId("konva-group");
      const segmentationGroup = groups.find((g) => g.getAttribute("name") === "segmentation") ?? groups[0];
      expect(() => {
        act(() => {
          fireEvent.mouseDown(segmentationGroup);
        });
      }).not.toThrow();
    });

    it("renders Image when maskDataURL is present", async () => {
      region.endUpdatedMaskDataURL("data:image/png;base64,hit");
      mockBrushImageRef = null;
      const { getAllByTestId } = render(
        <ImageViewContext.Provider value={{ suggestion: null }}>
          <HtxBrush item={region} />
        </ImageViewContext.Provider>,
      );
      expect(getAllByTestId("konva-group").length).toBeGreaterThanOrEqual(1);
      if (mockBrushImageRef && typeof mockBrushImageRef.onload === "function") {
        act(() => {
          mockBrushImageRef.onload();
        });
      }
      await Promise.resolve();
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

    it("Group onClick calls setHighlight(false) and onClickRegion when not linking", () => {
      const setHighlightSpy = spyOn(region, "setHighlight");
      const onClickRegionSpy = spyOn(region, "onClickRegion").mockImplementation(() => {});
      const { getAllByTestId } = render(
        <ImageViewContext.Provider value={{ suggestion: null }}>
          <HtxBrush item={region} />
        </ImageViewContext.Provider>,
      );
      const groups = getAllByTestId("konva-group");
      const segmentationGroup = groups.find((g) => g.getAttribute("name") === "segmentation") ?? groups[0];
      act(() => {
        fireEvent.click(segmentationGroup);
      });
      expect(setHighlightSpy).toHaveBeenCalledWith(false);
      expect(onClickRegionSpy).toHaveBeenCalled();
      setHighlightSpy.mockRestore();
      onClickRegionSpy.mockRestore();
    });
  });
});
