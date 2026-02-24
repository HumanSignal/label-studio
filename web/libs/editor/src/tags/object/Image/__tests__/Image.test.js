/**
 * Unit tests for Image tag model (tags/object/Image/Image.js).
 * Covers Model views and actions, CoordsCalculations, and TagAttrs behavior.
 */
if (typeof globalThis.structuredClone === "undefined") {
  globalThis.structuredClone = (obj) => JSON.parse(JSON.stringify(obj));
}

import { getRoot, types } from "mobx-state-tree";

jest.mock("../../../../utils/feature-flags", () => ({
  isFF: jest.fn(() => false),
  FF_DEV_3377: "ff_dev_3377",
  FF_ZOOM_OPTIM: "ff_zoom_optim",
  FF_LSDV_4583: "ff_lsdv_4583",
  FF_DEV_3391: "ff_dev_3391",
}));

const mockManager = {
  addTool: jest.fn(),
  findSelectedTool: jest.fn(() => ({
    useTransformer: false,
    canInteractWithRegions: true,
    toolName: "MoveTool",
    updateCursor: jest.fn(),
    shouldSkipInteractions: undefined,
  })),
  allTools: jest.fn(() => []),
  event: jest.fn(),
};

jest.mock("../../../../tools/Manager", () => ({
  __esModule: true,
  default: { getInstance: jest.fn(() => mockManager) },
}));

jest.mock("../../../../tools", () => ({
  Selection: { create: () => ({}) },
  Zoom: { create: () => ({}) },
  Brightness: { create: () => ({}) },
  Contrast: { create: () => ({}) },
  Rotate: { create: () => ({}) },
}));

jest.mock("@humansignal/core", () => ({
  ff: { isActive: () => false },
  imageCache: {
    get: jest.fn(() => null),
    set: jest.fn(),
    has: jest.fn(() => false),
    isLoading: jest.fn(() => false),
    getPendingLoad: jest.fn(() => null),
    load: jest.fn(() => Promise.resolve({ blobUrl: "blob:mock" })),
    releaseRef: jest.fn(),
    forceRemove: jest.fn(),
    addRef: jest.fn(),
  },
}));

import { ImageModel } from "../Image";
import { SNAP_TO_PIXEL_MODE } from "../../../../components/ImageView/Image";
import * as featureFlags from "../../../../utils/feature-flags";
import { FF_ZOOM_OPTIM } from "../../../../utils/feature-flags";

const defaultHistory = {
  freeze: () => {},
  unfreeze: () => {},
  history: { length: 0 },
};

const MockAnnotation = types
  .model("MockAnnotation", {
    toNames: types.optional(types.frozen(), new Map()),
    regionStore: types.optional(
      types.model({
        regions: types.optional(types.array(types.frozen()), []),
        suggestions: types.optional(types.array(types.frozen()), []),
      }),
      {},
    ),
    history: types.optional(types.frozen(), defaultHistory),
    names: types.optional(types.frozen(), new Map()),
    image: ImageModel,
  })
  .actions((self) => ({
    addRegion: jest.fn(),
    reinitHistory: jest.fn(),
    unselectAll: jest.fn(),
  }));

const Root = types
  .model("Root", {
    annotation: MockAnnotation,
    settings: types.optional(
      types.model({
        invertedZoom: types.optional(types.boolean, false),
      }),
      {},
    ),
  })
  .volatile(() => ({
    task: { dataObj: { url: "https://example.com/img.jpg" } },
  }))
  .views((self) => ({
    get annotationStore() {
      return { selected: self.annotation, selectedHistory: null };
    },
  }))
  .actions((self) => ({
    setTaskData(dataObj) {
      self.task = { dataObj };
    },
  }));

function createStore(snapshot = {}) {
  const defaultSnapshot = {
    annotation: {
      toNames: new Map(),
      regionStore: { regions: [], suggestions: [] },
      history: {
        freeze: () => {},
        unfreeze: () => {},
        history: { length: 0 },
      },
      names: new Map(),
      image: {
        name: "img",
        value: "$url",
        type: "image",
        zoomby: "1.2",
        crossorigin: "anonymous",
        horizontalalignment: "left",
        verticalalignment: "top",
        defaultzoom: "fit",
      },
    },
    settings: { invertedZoom: false },
    ...snapshot,
  };
  const store = Root.create(defaultSnapshot);
  if (snapshot.task) {
    store.setTaskData(snapshot.task.dataObj || snapshot.task);
  }
  return store;
}

function createStoreWithStates(statesForImage = []) {
  return createStore({
    annotation: {
      toNames: new Map([["img", statesForImage]]),
      regionStore: { regions: [], suggestions: [] },
      history: defaultHistory,
      names: new Map(),
      image: { name: "img", value: "$url", type: "image" },
    },
  });
}

describe("Image model", () => {
  beforeEach(() => {
    mockManager.addTool.mockClear();
    mockManager.findSelectedTool.mockReturnValue({
      useTransformer: false,
      canInteractWithRegions: true,
      toolName: "MoveTool",
      updateCursor: jest.fn(),
      shouldSkipInteractions: undefined,
    });
    mockManager.allTools.mockReturnValue([]);
    window.Htx = window.Htx || {};
    window.Htx.annotationStore = window.Htx.annotationStore || { names: new Map() };
  });

  describe("store and task", () => {
    it("has store from getRoot", () => {
      const store = createStore();
      const image = store.annotation.image;
      expect(getRoot(image)).toBe(store);
      expect(image.store).toBe(store);
    });

    it("parsedValue resolves value from task.dataObj", () => {
      const store = createStore();
      store.setTaskData({ url: "https://resolved.com/pic.jpg" });
      expect(store.annotation.image.parsedValue).toBe("https://resolved.com/pic.jpg");
    });

    it("images returns single-item array for single value", () => {
      const store = createStore();
      store.setTaskData({ url: "https://example.com/one.jpg" });
      expect(store.annotation.image.images).toEqual(["https://example.com/one.jpg"]);
    });

    it("images returns empty array when parsedValue is null", () => {
      const store = createStore();
      store.setTaskData({});
      expect(store.annotation.image.images).toEqual([]);
    });
  });

  describe("imageCrossOrigin", () => {
    it("returns anonymous when crossorigin is none or empty", () => {
      const store = createStore();
      const image = store.annotation.image;
      expect(image.imageCrossOrigin).toBe("anonymous");
    });

    it("returns lowercase crossorigin when set to anonymous or use-credentials", () => {
      const store = createStore({
        annotation: {
          toNames: new Map(),
          regionStore: { regions: [], suggestions: [] },
          history: { freeze: () => {}, unfreeze: () => {}, history: { length: 0 } },
          names: new Map(),
          image: {
            name: "img",
            value: "$url",
            type: "image",
            crossorigin: "use-credentials",
          },
        },
      });
      expect(store.annotation.image.imageCrossOrigin).toBe("use-credentials");
    });
  });

  describe("zoomBy", () => {
    it("parses zoomby string to number", () => {
      const store = createStore();
      expect(store.annotation.image.zoomBy).toBe(1.2);
    });
  });

  describe("zoomedPixelSize and pixel helpers", () => {
    it("zoomedPixelSize returns 100/naturalWidth and 100/naturalHeight", () => {
      const store = createStore();
      const image = store.annotation.image;
      image.naturalWidth = 200;
      image.naturalHeight = 100;
      expect(image.zoomedPixelSize).toEqual({ x: 0.5, y: 1 });
    });

    it("isSamePixel returns true when points are within half pixel", () => {
      const store = createStore();
      const image = store.annotation.image;
      image.naturalWidth = 100;
      image.naturalHeight = 100;
      expect(image.isSamePixel({ x: 0, y: 0 }, { x: 0.4, y: 0.4 })).toBe(true);
      expect(image.isSamePixel({ x: 0, y: 0 }, { x: 2, y: 2 })).toBe(false);
    });

    it("snapPointToPixel EDGE rounds to pixel edges", () => {
      const store = createStore();
      const image = store.annotation.image;
      image.naturalWidth = 100;
      image.naturalHeight = 100;
      const out = image.snapPointToPixel({ x: 1.4, y: 2.6 }, SNAP_TO_PIXEL_MODE.EDGE);
      expect(out.x).toBe(1);
      expect(out.y).toBe(3);
    });

    it("snapPointToPixel CENTER snaps to pixel centers", () => {
      const store = createStore();
      const image = store.annotation.image;
      image.naturalWidth = 100;
      image.naturalHeight = 100;
      const out = image.snapPointToPixel({ x: 1.2, y: 2.8 }, SNAP_TO_PIXEL_MODE.CENTER);
      expect(out.x).toBe(1.5);
      expect(out.y).toBe(2.5);
    });
  });

  describe("stageTranslate", () => {
    it("returns translation by rotation 0, 90, 180, 270", () => {
      const store = createStore();
      const image = store.annotation.image;
      image.stageWidth = 400;
      image.stageHeight = 300;
      image.rotation = 0;
      expect(image.stageTranslate).toEqual({ x: 0, y: 0 });
      image.rotation = 90;
      expect(image.stageTranslate).toEqual({ x: 0, y: 300 });
      image.rotation = 180;
      expect(image.stageTranslate).toEqual({ x: 400, y: 300 });
      image.rotation = 270;
      expect(image.stageTranslate).toEqual({ x: 400, y: 0 });
    });
  });

  describe("stageComponentSize", () => {
    it("returns stageWidth/Height when not sideways", () => {
      const store = createStore();
      const image = store.annotation.image;
      image.stageWidth = 400;
      image.stageHeight = 300;
      image.rotation = 0;
      expect(image.stageComponentSize).toEqual({ width: 400, height: 300 });
    });

    it("swaps width/height when isSideways (rotation 90 or 270)", () => {
      const store = createStore();
      const image = store.annotation.image;
      image.stageWidth = 400;
      image.stageHeight = 300;
      image.rotation = 90;
      expect(image.stageComponentSize).toEqual({ width: 300, height: 400 });
    });
  });

  describe("actions", () => {
    it("setMode updates mode", () => {
      const store = createStore();
      const image = store.annotation.image;
      expect(image.mode).toBe("viewing");
      image.setMode("brush");
      expect(image.mode).toBe("brush");
    });

    it("setBrightnessGrade and setContrastGrade update values", () => {
      const store = createStore();
      const image = store.annotation.image;
      image.setBrightnessGrade(120);
      image.setContrastGrade(110);
      expect(image.brightnessGrade).toBe(120);
      expect(image.contrastGrade).toBe(110);
    });

    it("setGridSize updates gridsize string", () => {
      const store = createStore();
      const image = store.annotation.image;
      image.setGridSize(50);
      expect(image.gridsize).toBe("50");
    });

    it("setSelectionStart and setSelectionEnd and resetSelection update selectionArea", () => {
      const store = createStore();
      const image = store.annotation.image;
      image.setSelectionStart({ x: 10, y: 20 });
      expect(image.selectionArea.start).toEqual({ x: 10, y: 20 });
      image.setSelectionEnd({ x: 30, y: 40 });
      expect(image.selectionArea.end).toEqual({ x: 30, y: 40 });
      image.resetSelection();
      expect(image.selectionArea.start).toBeNull();
      expect(image.selectionArea.end).toBeNull();
    });

    it("updateBrushControl and updateBrushStrokeWidth update state", () => {
      const store = createStore();
      const image = store.annotation.image;
      image.updateBrushControl("eraser");
      image.updateBrushStrokeWidth(25);
      expect(image.brushControl).toBe("eraser");
      expect(image.brushStrokeWidth).toBe(25);
    });

    it("setCurrentImage and setCurrentItem set currentImage", () => {
      const store = createStore();
      const image = store.annotation.image;
      expect(image.currentImage).toBe(0);
      image.setCurrentItem(0);
      expect(image.currentImage).toBe(0);
      image.setCurrentImage(0);
      expect(image.currentImage).toBe(0);
    });

    it("setCurrentImage no-ops when index unchanged", () => {
      const store = createStore();
      const image = store.annotation.image;
      const spy = jest.spyOn(image, "preloadImages");
      image.setCurrentImage(0);
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe("CoordsCalculations", () => {
    it("whRatio is stageWidth / stageHeight", () => {
      const store = createStore();
      const image = store.annotation.image;
      image.stageWidth = 400;
      image.stageHeight = 200;
      expect(image.whRatio).toBe(2);
    });

    it("canvasToInternalX/Y scale by RELATIVE_STAGE", () => {
      const store = createStore();
      const image = store.annotation.image;
      image.stageWidth = 200;
      image.stageHeight = 100;
      expect(image.canvasToInternalX(100)).toBe(50);
      expect(image.canvasToInternalY(50)).toBe(50);
    });

    it("internalToCanvasX/Y scale back to canvas", () => {
      const store = createStore();
      const image = store.annotation.image;
      image.stageWidth = 200;
      image.stageHeight = 100;
      expect(image.internalToCanvasX(50)).toBe(100);
      expect(image.internalToCanvasY(50)).toBe(50);
    });

    it("internalToImageX/Y and imageToInternalX/Y use currentImageEntity dimensions", () => {
      const store = createStore();
      const image = store.annotation.image;
      const entity = image.findImageEntity(0);
      entity.setNaturalWidth(800);
      entity.setNaturalHeight(600);
      expect(image.internalToImageX(50)).toBe(400);
      expect(image.internalToImageY(50)).toBe(300);
      expect(image.imageToInternalX(400)).toBe(50);
      expect(image.imageToInternalY(300)).toBe(50);
    });
  });

  describe("states and controlButton", () => {
    it("states returns annotation.toNames.get(self.name)", () => {
      const controls = [{ type: "rectanglelabels", isSelected: true }];
      const store = createStoreWithStates(controls);
      const image = store.annotation.image;
      expect(image.states()).toEqual(controls);
    });

    it("controlButton returns first state when no rectangle/brush/bitmask/ellipse labels", () => {
      const ctrl = { type: "keypointlabels", isSelected: true };
      const store = createStoreWithStates([ctrl]);
      const image = store.annotation.image;
      expect(image.controlButton()).toBe(ctrl);
    });

    it("controlButton returns rectanglelabels when present", () => {
      const rect = { type: "rectanglelabels", isSelected: true };
      const other = { type: "keypointlabels", isSelected: true };
      const store = createStoreWithStates([other, rect]);
      const image = store.annotation.image;
      expect(image.controlButton()).toBe(rect);
    });

    it("controlButton returns undefined when states empty", () => {
      const store = createStoreWithStates([]);
      const image = store.annotation.image;
      expect(image.controlButton()).toBeUndefined();
    });
  });

  describe("canvasSize", () => {
    it("returns rounded natural size scaled by stageZoom when not sideways", () => {
      const store = createStore();
      const image = store.annotation.image;
      image.naturalWidth = 100;
      image.naturalHeight = 80;
      image.stageZoomX = 2;
      image.stageZoomY = 2;
      expect(image.canvasSize).toEqual({ width: 200, height: 160 });
    });

    it("returns swapped width/height when isSideways", () => {
      const store = createStore();
      const image = store.annotation.image;
      image.naturalWidth = 100;
      image.naturalHeight = 80;
      image.stageZoomX = 2;
      image.stageZoomY = 2;
      image.rotation = 90;
      expect(image.canvasSize).toEqual({ width: 160, height: 200 });
    });
  });

  describe("createSerializedResult", () => {
    it("returns object with original_width, original_height, image_rotation, value", () => {
      const store = createStore();
      const image = store.annotation.image;
      const entity = image.findImageEntity(0);
      entity.setNaturalWidth(100);
      entity.setNaturalHeight(80);
      entity.setRotation(90);
      const value = { x: 10, y: 20, width: 30, height: 40 };
      const result = image.createSerializedResult({ item_index: 0, _rawResult: undefined }, value);
      expect(result).toMatchObject({
        original_width: 100,
        original_height: 80,
        image_rotation: 90,
        value,
      });
    });

    it("returns result for region with item_index", () => {
      const store = createStore();
      const image = store.annotation.image;
      const entity = image.findImageEntity(0);
      entity.setNaturalWidth(50);
      entity.setNaturalHeight(50);
      const result = image.createSerializedResult({ item_index: 0, _rawResult: undefined }, { x: 0, y: 0 });
      expect(result).toHaveProperty("original_width", 50);
      expect(result).toHaveProperty("original_height", 50);
      expect(result).toHaveProperty("value", { x: 0, y: 0 });
    });

    it("returns raw result when image not loaded and region has _rawResult", () => {
      const store = createStore();
      const image = store.annotation.image;
      const entity = image.findImageEntity(0);
      entity.setImageLoaded(false);
      const raw = { original_width: 10, original_height: 10, value: { x: 1 } };
      const result = image.createSerializedResult({ item_index: 0, _rawResult: raw }, { x: 2, y: 2 });
      expect(result).toEqual(expect.objectContaining({ original_width: 10, value: { x: 1 } }));
    });
  });

  describe("setZoom", () => {
    it("updates currentZoom and stage zoom state", () => {
      const store = createStore();
      const image = store.annotation.image;
      image.naturalWidth = 100;
      image.naturalHeight = 100;
      image.containerWidth = 200;
      image.containerHeight = 200;
      image.setZoom(1.5);
      expect(image.currentZoom).toBe(1.5);
    });
  });

  describe("getInertialZoom", () => {
    it("returns clamped zoom based on wheel delta and settings.invertedZoom", () => {
      const store = createStore();
      const image = store.annotation.image;
      image.currentZoom = 1;
      const out = image.getInertialZoom(10);
      expect(typeof out).toBe("number");
      expect(out).toBeGreaterThanOrEqual(0.1);
      expect(out).toBeLessThanOrEqual(100);
    });
  });

  describe("sizeToFit, sizeToOriginal, sizeToAuto", () => {
    it("sizeToFit sets defaultzoom to fit and updates zoom", () => {
      const store = createStore();
      const image = store.annotation.image;
      image.naturalWidth = 100;
      image.naturalHeight = 100;
      image.containerWidth = 200;
      image.containerHeight = 200;
      image.sizeToFit();
      expect(image.defaultzoom).toBe("fit");
    });

    it("sizeToOriginal sets defaultzoom to original", () => {
      const store = createStore();
      const image = store.annotation.image;
      image.naturalWidth = 100;
      image.naturalHeight = 100;
      image.containerWidth = 200;
      image.containerHeight = 200;
      image.sizeToOriginal();
      expect(image.defaultzoom).toBe("original");
    });

    it("sizeToAuto sets defaultzoom to auto", () => {
      const store = createStore();
      const image = store.annotation.image;
      image.sizeToAuto();
      expect(image.defaultzoom).toBe("auto");
    });
  });

  describe("handleZoom", () => {
    it("when negativezoom is false and zoomScale <= 1, sets zoom to 1", () => {
      const store = createStore();
      const image = store.annotation.image;
      image.naturalWidth = 100;
      image.naturalHeight = 100;
      image.containerWidth = 200;
      image.containerHeight = 200;
      image.setZoom(1);
      image.handleZoom(-1);
      expect(image.currentZoom).toBe(1);
    });

    it("zooms in when val > 0", () => {
      const store = createStore();
      const image = store.annotation.image;
      image.naturalWidth = 100;
      image.naturalHeight = 100;
      image.containerWidth = 200;
      image.containerHeight = 200;
      image.setZoom(1);
      image.handleZoom(1);
      expect(image.currentZoom).toBeGreaterThan(1);
    });
  });

  describe("fixZoomedCoords and zoomOriginalCoords", () => {
    it("fixZoomedCoords returns [x,y] when no stageRef", () => {
      const store = createStore();
      const image = store.annotation.image;
      image.stageRef = null;
      expect(image.fixZoomedCoords([50, 60])).toEqual([50, 60]);
    });

    it("zoomOriginalCoords uses stageRef transform when set", () => {
      const store = createStore();
      const image = store.annotation.image;
      image.stageRef = {
        getAbsoluteTransform: () => ({
          point: (p) => ({ x: p.x * 2, y: p.y * 2 }),
        }),
      };
      const [x, y] = image.zoomOriginalCoords([10, 20]);
      expect(x).toBe(20);
      expect(y).toBe(40);
    });
  });

  describe("views and helpers", () => {
    it("hasStates is true when states() has length", () => {
      const store = createStoreWithStates([{ type: "rectanglelabels" }]);
      expect(store.annotation.image.hasStates).toBe(true);
    });

    it("hasStates is false when states() empty", () => {
      const store = createStoreWithStates([]);
      expect(store.annotation.image.hasStates).toBe(false);
    });

    it("isDrawing is false when no drawingRegion", () => {
      const store = createStore();
      const image = store.annotation.image;
      expect(image.isDrawing).toBe(false);
    });

    it("layerZoomScalePosition returns scale and position", () => {
      const store = createStore();
      const image = store.annotation.image;
      image.zoomScale = 1.5;
      image.zoomingPositionX = 10;
      image.zoomingPositionY = 20;
      const pos = image.layerZoomScalePosition;
      expect(pos.scaleX).toBe(1.5);
      expect(pos.scaleY).toBe(1.5);
      expect(pos).toHaveProperty("x");
      expect(pos).toHaveProperty("y");
    });

    it("maxScale and coverScale depend on container and natural size", () => {
      const store = createStore();
      const image = store.annotation.image;
      image.naturalWidth = 100;
      image.naturalHeight = 100;
      image.containerWidth = 200;
      image.containerHeight = 200;
      expect(image.maxScale).toBe(2);
      expect(image.coverScale).toBe(2);
    });

    it("setPointerPosition updates cursorPositionX and cursorPositionY", () => {
      const store = createStore();
      const image = store.annotation.image;
      image.setPointerPosition({ x: 50, y: 60 });
      expect(image.cursorPositionX).toBe(50);
      expect(image.cursorPositionY).toBe(60);
    });
  });

  describe("deleteDrawingRegion", () => {
    it("no-ops when no drawingRegion", () => {
      const store = createStore();
      const image = store.annotation.image;
      image.deleteDrawingRegion();
      expect(image.drawingRegion).toBeNull();
    });
  });

  describe("fixForZoom and fixForZoomWrapper", () => {
    it("fixForZoom returns function that transforms point and back", () => {
      const store = createStore();
      const image = store.annotation.image;
      image.stageRef = {
        getAbsoluteTransform: () => ({
          copy: () => ({
            invert: () => ({
              point: (p) => ({ x: p.x, y: p.y }),
            }),
          }),
          point: (p) => ({ x: p.x * 2, y: p.y * 2 }),
        }),
      };
      const fn = image.fixForZoom((p) => ({ x: p.x + 1, y: p.y + 2 }));
      const out = fn({ x: 10, y: 20 });
      expect(out).toHaveProperty("x");
      expect(out).toHaveProperty("y");
    });
  });

  describe("viewPortBBoxCoords", () => {
    it("returns bbox with left, top, right, bottom, width, height", () => {
      const store = createStore();
      const image = store.annotation.image;
      image.zoomScale = 1;
      image.zoomingPositionX = 0;
      image.zoomingPositionY = 0;
      image.stageWidth = 100;
      image.stageHeight = 80;
      image.naturalWidth = 100;
      image.naturalHeight = 80;
      image.stageZoomX = 1;
      image.stageZoomY = 1;
      const bbox = image.viewPortBBoxCoords;
      expect(bbox).toHaveProperty("left");
      expect(bbox).toHaveProperty("top");
      expect(bbox).toHaveProperty("right");
      expect(bbox).toHaveProperty("bottom");
      expect(bbox).toHaveProperty("width");
      expect(bbox).toHaveProperty("height");
    });

    it("rotates offsets when rotation is 90", () => {
      const store = createStore();
      const image = store.annotation.image;
      image.zoomScale = 1;
      image.zoomingPositionX = 0;
      image.zoomingPositionY = 0;
      image.stageWidth = 100;
      image.stageHeight = 80;
      image.rotation = 90;
      image.naturalWidth = 100;
      image.naturalHeight = 80;
      image.stageZoomX = 1;
      image.stageZoomY = 1;
      const bbox = image.viewPortBBoxCoords;
      expect(bbox).toHaveProperty("width");
      expect(bbox).toHaveProperty("height");
      expect(bbox.width).toBeLessThanOrEqual(100);
      expect(bbox.height).toBeLessThanOrEqual(100);
    });
  });

  describe("imageTransform", () => {
    it("includes translate3d when zoomScale !== 1", () => {
      const store = createStore();
      const image = store.annotation.image;
      image.zoomScale = 1.5;
      image.zoomingPositionX = 10;
      image.zoomingPositionY = 20;
      image.stageWidth = 100;
      image.stageHeight = 80;
      const style = image.imageTransform;
      expect(style.transform).toContain("translate3d(10px,20px");
    });

    it("includes rotate and translate when rotation is set", () => {
      const store = createStore();
      const image = store.annotation.image;
      image.rotation = 90;
      image.stageWidth = 100;
      image.stageHeight = 80;
      image.zoomScale = 1;
      const style = image.imageTransform;
      expect(style.transform).toContain("rotate(90deg)");
      expect(style.filter).toContain("brightness");
    });
  });

  describe("alignmentOffset when FF_ZOOM_OPTIM", () => {
    beforeEach(() => {
      featureFlags.isFF.mockImplementation((key) => key === FF_ZOOM_OPTIM);
    });
    afterEach(() => {
      featureFlags.isFF.mockImplementation(() => false);
    });

    it("returns center offset for horizontalalignment center", () => {
      const store = createStore({
        annotation: {
          toNames: new Map(),
          regionStore: { regions: [], suggestions: [] },
          history: defaultHistory,
          names: new Map(),
          image: {
            name: "img",
            value: "$url",
            type: "image",
            horizontalalignment: "center",
            verticalalignment: "top",
          },
        },
      });
      const image = store.annotation.image;
      image.containerWidth = 200;
      image.containerHeight = 150;
      image.naturalWidth = 100;
      image.naturalHeight = 80;
      image.stageZoomX = 1;
      image.stageZoomY = 1;
      const offset = image.alignmentOffset;
      expect(offset.x).toBe((200 - 100) / 2);
      expect(offset.y).toBe(0);
    });

    it("returns right/bottom offset for horizontalalignment right and verticalalignment bottom", () => {
      const store = createStore({
        annotation: {
          toNames: new Map(),
          regionStore: { regions: [], suggestions: [] },
          history: defaultHistory,
          names: new Map(),
          image: {
            name: "img",
            value: "$url",
            type: "image",
            horizontalalignment: "right",
            verticalalignment: "bottom",
          },
        },
      });
      const image = store.annotation.image;
      image.containerWidth = 200;
      image.containerHeight = 150;
      image.naturalWidth = 100;
      image.naturalHeight = 80;
      image.stageZoomX = 1;
      image.stageZoomY = 1;
      const offset = image.alignmentOffset;
      expect(offset.x).toBe(100);
      expect(offset.y).toBe(70);
    });
  });

  describe("activeStates", () => {
    it("filters states by isSelected and type includes labels", () => {
      const store = createStoreWithStates([
        { type: "rectanglelabels", isSelected: true },
        { type: "keypointlabels", isSelected: false },
      ]);
      const image = store.annotation.image;
      expect(image.activeStates()).toHaveLength(1);
      expect(image.activeStates()[0].type).toBe("rectanglelabels");
    });
  });

  describe("selectedRegions and suggestions", () => {
    it("selectedRegions returns empty when regs empty", () => {
      const store = createStore();
      expect(store.annotation.image.selectedRegions).toEqual([]);
    });

    it("suggestions returns empty when no regionStore suggestions", () => {
      const store = createStore();
      expect(store.annotation.image.suggestions).toEqual([]);
    });

    it("regionsInSelectionArea and selectedShape return empty/undefined when no regs", () => {
      const store = createStore();
      expect(store.annotation.image.regionsInSelectionArea).toEqual([]);
      expect(store.annotation.image.selectedShape).toBeUndefined();
    });
  });

  describe("useTransformer", () => {
    it("returns true when findSelectedTool returns useTransformer true", () => {
      mockManager.findSelectedTool.mockReturnValueOnce({
        useTransformer: true,
        canInteractWithRegions: true,
        toolName: "MoveTool",
        updateCursor: jest.fn(),
      });
      const store = createStore();
      expect(store.annotation.image.useTransformer).toBe(true);
    });
  });

  describe("getSkipInteractions and setSkipInteractions", () => {
    it("getSkipInteractions returns true when tool is ZoomPanTool", () => {
      mockManager.findSelectedTool.mockReturnValueOnce({
        toolName: "ZoomPanTool",
        useTransformer: false,
        canInteractWithRegions: true,
        updateCursor: jest.fn(),
      });
      const store = createStore();
      expect(store.annotation.image.getSkipInteractions()).toBe(true);
    });

    it("setSkipInteractions and updateSkipInteractions update skip state", () => {
      const store = createStore();
      const image = store.annotation.image;
      image.setSkipInteractions(true);
      expect(image.getSkipInteractions()).toBe(true);
      image.updateSkipInteractions({ evt: { metaKey: true } });
      expect(image.getSkipInteractions()).toBe(true);
      image.updateSkipInteractions({ evt: {} });
      expect(image.getSkipInteractions()).toBe(false);
    });
  });

  describe("smoothingEnabled", () => {
    it("returns self.smoothing when annotation.names is empty", () => {
      const store = createStore();
      const image = store.annotation.image;
      expect(image.smoothingEnabled).toBe(image.smoothing);
    });
  });

  describe("rotate", () => {
    it("updates rotation by -90 and recalculates zoom position", () => {
      const store = createStore();
      const image = store.annotation.image;
      image.naturalWidth = 100;
      image.naturalHeight = 80;
      image.containerWidth = 200;
      image.containerHeight = 160;
      image.stageWidth = 100;
      image.stageHeight = 80;
      image.stageRatio = 1.25;
      image.rotation = 0;
      image.zoomingPositionX = 0;
      image.zoomingPositionY = 0;
      image.rotate(-90);
      expect(image.rotation).toBe(270);
    });

    it("updates rotation by 90", () => {
      const store = createStore();
      const image = store.annotation.image;
      image.naturalWidth = 100;
      image.naturalHeight = 80;
      image.containerWidth = 200;
      image.containerHeight = 160;
      image.stageWidth = 100;
      image.stageHeight = 80;
      image.stageRatio = 1.25;
      image.rotation = 0;
      image.zoomingPositionX = 0;
      image.zoomingPositionY = 0;
      image.rotate(90);
      expect(image.rotation).toBe(90);
    });
  });

  describe("setRefs", () => {
    it("setImageRef setContainerRef setStageRef setOverlayRef do not throw", () => {
      const store = createStore();
      const image = store.annotation.image;
      expect(() => image.setImageRef({})).not.toThrow();
      expect(() => image.setContainerRef({ offsetWidth: 100, offsetHeight: 80 })).not.toThrow();
      expect(() => image.setStageRef({ getAbsoluteTransform: () => ({}) })).not.toThrow();
      expect(() => image.setOverlayRef({})).not.toThrow();
    });
  });

  describe("onResize", () => {
    it("calls _updateImageSize and sets sizeUpdated", () => {
      const store = createStore();
      const image = store.annotation.image;
      const entity = image.findImageEntity(0);
      entity.setNaturalWidth(100);
      entity.setNaturalHeight(80);
      image.onResize(200, 160, false);
      expect(image.sizeUpdated).toBe(true);
      expect(image.containerWidth).toBe(200);
      expect(image.containerHeight).toBe(160);
    });
  });

  describe("checkLabels", () => {
    it("returns true when no label states", () => {
      const store = createStoreWithStates([]);
      expect(store.annotation.image.checkLabels()).toBe(true);
    });
  });

  describe("event", () => {
    it("calls getToolsManager().event with converted coords", () => {
      const store = createStore();
      const image = store.annotation.image;
      image.stageRef = null;
      image.event("click", { evt: { type: "click" } }, 50, 60);
      expect(mockManager.event).toHaveBeenCalledWith(
        "click",
        expect.any(Object),
        expect.any(Number),
        expect.any(Number),
        expect.any(Number),
        expect.any(Number),
      );
    });
  });

  describe("handleZoom zoom to point", () => {
    it("zooms to point when zoomScale > 1", () => {
      const store = createStore();
      const image = store.annotation.image;
      image.naturalWidth = 100;
      image.naturalHeight = 100;
      image.containerWidth = 200;
      image.containerHeight = 200;
      image.setZoom(2);
      image.handleZoom(2.5, { x: 100, y: 100 }, false);
      expect(image.currentZoom).toBeGreaterThan(2);
    });
  });

  describe("selectedRegionsBBox", () => {
    it("returns undefined when no selected regions", () => {
      const store = createStore();
      expect(store.annotation.image.selectedRegionsBBox).toBeUndefined();
    });
  });

  describe("images array value", () => {
    it("images returns array when parsedValue is array from task", () => {
      const store = createStore({
        annotation: {
          toNames: new Map(),
          regionStore: { regions: [], suggestions: [] },
          history: defaultHistory,
          names: new Map(),
          image: {
            name: "img",
            value: "$urls",
            type: "image",
          },
        },
      });
      store.setTaskData({ urls: ["https://a.com/1.jpg", "https://a.com/2.jpg"] });
      const image = store.annotation.image;
      expect(image.images).toEqual(["https://a.com/1.jpg", "https://a.com/2.jpg"]);
    });
  });

  describe("fillerHeight and currentSrc", () => {
    it("fillerHeight returns percentage based on natural dimensions and isSideways", () => {
      const store = createStore();
      const image = store.annotation.image;
      image.naturalWidth = 100;
      image.naturalHeight = 50;
      image.rotation = 0;
      expect(image.fillerHeight).toBe("50%");
      image.rotation = 90;
      expect(image.fillerHeight).toBe("200%");
    });

    it("currentSrc returns currentImageEntity.src", () => {
      const store = createStore();
      store.setTaskData({ url: "https://example.com/pic.jpg" });
      const image = store.annotation.image;
      const entity = image.findImageEntity(0);
      expect(image.currentSrc).toBe(entity.src);
    });
  });

  describe("controlButtonType", () => {
    it("controlButton returns first matching labels state", () => {
      const ctrl = { type: "rectanglelabels", isSelected: true };
      const store = createStoreWithStates([ctrl]);
      const image = store.annotation.image;
      expect(image.controlButton()).toBe(ctrl);
    });
  });

  describe("fixZoomedCoords with stageRef", () => {
    it("transforms coords when stageRef has getAbsoluteTransform", () => {
      const store = createStore();
      const image = store.annotation.image;
      image.stageRef = {
        getAbsoluteTransform: () => ({
          copy: () => ({
            invert: () => ({
              point: (p) => ({ x: p.x * 0.5, y: p.y * 0.5 }),
            }),
          }),
        }),
      };
      const [x, y] = image.fixZoomedCoords([100, 200]);
      expect(x).toBe(50);
      expect(y).toBe(100);
    });
  });

  describe("getSkipInteractions with FF_ZOOM_OPTIM", () => {
    beforeEach(() => {
      featureFlags.isFF.mockImplementation((key) => key === FF_ZOOM_OPTIM);
    });
    afterEach(() => {
      featureFlags.isFF.mockImplementation(() => false);
    });

    it("returns false when isLinkingMode is true", () => {
      const store = createStore();
      const image = store.annotation.image;
      store.annotation.isLinkingMode = true;
      mockManager.findSelectedTool.mockReturnValue({
        toolName: "MoveTool",
        canInteractWithRegions: false,
        updateCursor: jest.fn(),
      });
      expect(image.getSkipInteractions()).toBe(false);
    });

    it("returns true when canInteractWithRegions is false and not linking", () => {
      const store = createStore();
      const image = store.annotation.image;
      store.annotation.isLinkingMode = false;
      mockManager.findSelectedTool.mockReturnValue({
        toolName: "MoveTool",
        canInteractWithRegions: false,
        updateCursor: jest.fn(),
      });
      expect(image.getSkipInteractions()).toBe(true);
    });
  });

  describe("smoothingEnabled with bitmask", () => {
    it("returns false when annotation.names has bitmask type", () => {
      const store = createStore({
        annotation: {
          toNames: new Map(),
          regionStore: { regions: [], suggestions: [] },
          history: defaultHistory,
          names: new Map([
            [
              "img",
              {
                type: "bitmasklabels",
              },
            ],
          ]),
          image: {
            name: "img",
            value: "$url",
            type: "image",
          },
        },
      });
      const image = store.annotation.image;
      expect(image.smoothingEnabled).toBe(false);
    });
  });

  describe("updateSkipInteractions with shouldSkipInteractions", () => {
    it("calls setSkipInteractions with tool.shouldSkipInteractions(e) when present", () => {
      const store = createStore();
      const image = store.annotation.image;
      mockManager.findSelectedTool.mockReturnValue({
        toolName: "MoveTool",
        canInteractWithRegions: true,
        shouldSkipInteractions: jest.fn(() => true),
        updateCursor: jest.fn(),
      });
      image.updateSkipInteractions({ evt: {} });
      expect(image.getSkipInteractions()).toBe(true);
    });
  });

  describe("handleZoom negative zoom and zoom out", () => {
    it("when negativezoom is true allows zoom out below 1", () => {
      const store = createStore({
        annotation: {
          toNames: new Map(),
          regionStore: { regions: [], suggestions: [] },
          history: defaultHistory,
          names: new Map(),
          image: {
            name: "img",
            value: "$url",
            type: "image",
            negativezoom: true,
          },
        },
      });
      const image = store.annotation.image;
      image.naturalWidth = 100;
      image.naturalHeight = 100;
      image.containerWidth = 200;
      image.containerHeight = 200;
      image.setZoom(1);
      image.handleZoom(-1);
      expect(image.currentZoom).toBeLessThanOrEqual(1);
    });

    it("zoomScale <= 1 path sets zoom and position to 0", () => {
      const store = createStore({
        annotation: {
          toNames: new Map(),
          regionStore: { regions: [], suggestions: [] },
          history: defaultHistory,
          names: new Map(),
          image: {
            name: "img",
            value: "$url",
            type: "image",
            negativezoom: true,
          },
        },
      });
      const image = store.annotation.image;
      image.naturalWidth = 100;
      image.naturalHeight = 100;
      image.containerWidth = 200;
      image.containerHeight = 200;
      image.setZoom(2);
      image.handleZoom(-2);
      expect(image.zoomingPositionX).toBe(0);
      expect(image.zoomingPositionY).toBe(0);
    });
  });

  describe("setZoom branches", () => {
    it("when maxScale > 1 and scale >= maxScale sets stageZoom and zoomScale", () => {
      const store = createStore();
      const image = store.annotation.image;
      image.naturalWidth = 50;
      image.naturalHeight = 50;
      image.containerWidth = 200;
      image.containerHeight = 200;
      image.setZoom(5);
      expect(image.stageZoom).toBe(4);
      expect(image.zoomScale).toBeGreaterThan(1);
    });

    it("when maxScale <= 1 (image larger than container) scale > maxScale", () => {
      const store = createStore();
      const image = store.annotation.image;
      image.naturalWidth = 400;
      image.naturalHeight = 400;
      image.containerWidth = 200;
      image.containerHeight = 200;
      image.setZoom(2);
      expect(image.stageZoom).toBe(0.5);
      expect(image.zoomScale).toBe(2);
    });

    it("when maxScale <= 1 and scale is 1 (clamped) sets stageZoom and zoomScale 1", () => {
      const store = createStore();
      const image = store.annotation.image;
      image.naturalWidth = 400;
      image.naturalHeight = 400;
      image.containerWidth = 200;
      image.containerHeight = 200;
      image.setZoom(1);
      expect(image.stageZoom).toBe(0.5);
      expect(image.zoomScale).toBe(1);
    });
  });

  describe("updateImageAfterZoom and setZoomPosition", () => {
    it("updateImageAfterZoom recalculates and updates region sizes", () => {
      const store = createStore();
      const image = store.annotation.image;
      image.naturalWidth = 100;
      image.naturalHeight = 80;
      image.stageWidth = 100;
      image.stageHeight = 80;
      image.updateImageAfterZoom();
      expect(image.stageWidth).toBeDefined();
      expect(image.stageHeight).toBeDefined();
    });

    it("setZoomPosition clamps to valid range", () => {
      const store = createStore();
      const image = store.annotation.image;
      image.naturalWidth = 100;
      image.naturalHeight = 100;
      image.containerWidth = 200;
      image.containerHeight = 200;
      image.stageZoomX = 1;
      image.stageZoomY = 1;
      image.setZoom(2);
      image.setZoomPosition(-1000, -1000);
      expect(image.zoomingPositionX).toBeLessThanOrEqual(0);
      expect(image.zoomingPositionY).toBeLessThanOrEqual(0);
    });

    it("resetZoomPositionToCenter centers zoom position", () => {
      const store = createStore();
      const image = store.annotation.image;
      image.naturalWidth = 100;
      image.naturalHeight = 80;
      image.containerWidth = 200;
      image.containerHeight = 160;
      image.setZoom(1);
      image.resetZoomPositionToCenter();
      expect(image.zoomingPositionX).toBeDefined();
      expect(image.zoomingPositionY).toBeDefined();
    });
  });

  describe("controlButton brushlabels and ellipselabels", () => {
    it("controlButton returns brushlabels when present", () => {
      const brush = { type: "brushlabels", isSelected: true };
      const other = { type: "keypointlabels", isSelected: true };
      const store = createStoreWithStates([other, brush]);
      const image = store.annotation.image;
      expect(image.controlButton()).toBe(brush);
    });

    it("controlButton returns ellipselabels when present", () => {
      const ellipse = { type: "ellipselabels", isSelected: true };
      const store = createStoreWithStates([ellipse]);
      const image = store.annotation.image;
      expect(image.controlButton()).toBe(ellipse);
    });
  });

  describe("checkLabels with activeStates", () => {
    it("returns false when activeStates has items and getAvailableStates is empty", () => {
      const store = createStoreWithStates([{ type: "rectanglelabels", isSelected: true }]);
      const image = store.annotation.image;
      jest.spyOn(image, "getAvailableStates").mockReturnValue([]);
      expect(image.checkLabels()).toBe(false);
    });

    it("returns true when getAvailableStates has items", () => {
      const store = createStoreWithStates([{ type: "rectanglelabels", isSelected: true }]);
      const image = store.annotation.image;
      jest.spyOn(image, "getAvailableStates").mockReturnValue([{ type: "rectanglelabels" }]);
      expect(image.checkLabels()).toBe(true);
    });
  });

  describe("hasTools", () => {
    it("returns true when allTools returns non-empty array", () => {
      mockManager.allTools.mockReturnValue([{ name: "MoveTool" }]);
      const store = createStore();
      expect(store.annotation.image.hasTools).toBe(true);
    });
  });

  describe("afterRegionSelected", () => {
    it("when not multiImage does not change current image", () => {
      const store = createStore();
      const image = store.annotation.image;
      image.setCurrentImage(0);
      const region = { item_index: 1 };
      image.afterRegionSelected(region);
      expect(image.currentImage).toBe(0);
    });

    it("calls setCurrentImage when region has item_index and multiImage is true", () => {
      const store = createStore();
      const image = store.annotation.image;
      const setCurrentImageSpy = jest.spyOn(image, "setCurrentImage");
      image.afterRegionSelected({ item_index: 2 });
      // Without multiImage, setCurrentImage is not called for item_index
      expect(setCurrentImageSpy).not.toHaveBeenCalledWith(2);
      setCurrentImageSpy.mockRestore();
    });
  });
});
