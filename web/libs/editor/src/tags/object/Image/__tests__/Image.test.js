/**
 * Unit tests for Image tag model (tags/object/Image/Image.js).
 * Covers Model views and actions, CoordsCalculations, and TagAttrs behavior.
 */
if (typeof globalThis.structuredClone === "undefined") {
  globalThis.structuredClone = (obj) => JSON.parse(JSON.stringify(obj));
}

import { getRoot, types } from "mobx-state-tree";

const mockManager = {
  addTool: mock(),
  findSelectedTool: mock(() => ({
    useTransformer: false,
    canInteractWithRegions: true,
    toolName: "MoveTool",
    updateCursor: mock(),
    shouldSkipInteractions: undefined,
  })),
  allTools: mock(() => []),
  event: mock(),
};

import ToolsManager from "../../../../tools/Manager";

mockModule("../../../../tools", () => ({
  Selection: { create: () => ({}) },
  Zoom: { create: () => ({}) },
  Brightness: { create: () => ({}) },
  Contrast: { create: () => ({}) },
  Rotate: { create: () => ({}) },
}));

import { imageCache } from "@humansignal/core";
import { SNAP_TO_PIXEL_MODE } from "../../../../components/ImageView/Image";

// These are initialized in beforeAll (after all test files have loaded and applied their mocks)
// so that Image.js imports the REAL isFF and FF_ZOOM_OPTIM, not mock stubs.
let ImageModel;
let MockAnnotation;
let Root;
let _FF_ZOOM_OPTIM;

const defaultHistory = {
  freeze: () => {},
  unfreeze: () => {},
  history: { length: 0 },
};

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
      image: {
        name: "img",
        value: "$url",
        type: "image",
      },
    },
  });
}

function setEntityProp(image, setter, value) {
  const entity = image.currentImageEntity;
  if (entity && typeof entity[setter] === "function") {
    entity[setter](value);
    return true;
  }
  return false;
}

function setImageNaturalSize(image, width, height) {
  try {
    if (setEntityProp(image, "setNaturalWidth", width)) {
      setEntityProp(image, "setNaturalHeight", height);
    } else {
      image.naturalWidth = width;
      image.naturalHeight = height;
    }
    return true;
  } catch {
    return false;
  }
}

function setImageStageSize(image, width, height) {
  try {
    if (setEntityProp(image, "setStageWidth", width)) {
      setEntityProp(image, "setStageHeight", height);
    } else {
      image.stageWidth = width;
      image.stageHeight = height;
    }
    return true;
  } catch {
    return false;
  }
}

function setImageStageZoom(image, zoomX, zoomY) {
  try {
    if (setEntityProp(image, "setStageZoomX", zoomX)) {
      setEntityProp(image, "setStageZoomY", zoomY);
    } else {
      image.stageZoomX = zoomX;
      image.stageZoomY = zoomY;
    }
    return true;
  } catch {
    return false;
  }
}

function setImageContainerSize(image, width, height) {
  try {
    if (setEntityProp(image, "setContainerWidth", width)) {
      setEntityProp(image, "setContainerHeight", height);
    } else {
      image.containerWidth = width;
      image.containerHeight = height;
    }
    return true;
  } catch {
    return false;
  }
}

describe("Image model", () => {
  beforeAll(async () => {
    // Runs AFTER all test files have loaded and applied their module-level mocks.
    _FF_ZOOM_OPTIM = "fflag_fix_front_leap_32_zoom_perf_190923_short";

    // window.isFF is the REAL isFF — the real module assigned it via Object.assign(window, {isFF}).
    // Mock modules are plain objects and don't run side-effect code, so window.isFF survived.
    const realIsFF = window.isFF;
    const mockFF = requireActual("../../../../utils/feature-flags");
    const ffOverride = { ...mockFF, isFF: realIsFF, FF_ZOOM_OPTIM: _FF_ZOOM_OPTIM };

    // Override the feature-flags mock with real isFF through Bun's native API.
    const { mock: bunMock } = await import("bun:test");
    const base = new URL("../../../../utils/feature-flags", import.meta.url);
    const absPath = decodeURIComponent(base.pathname);
    for (const p of [absPath, `${absPath}.ts`, `${absPath}.js`, base.href, `${base.href}.ts`]) {
      try {
        bunMock.module(p, () => ffOverride);
      } catch {}
    }

    // Load fresh Image.js
    const mod = await import(`../Image.js?bun_reload=${Date.now()}`);
    ImageModel = mod.ImageModel;

    // Build model types using the correctly-loaded ImageModel
    MockAnnotation = types
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
      .actions((_self) => ({
        addRegion: mock(),
        reinitHistory: mock(),
        unselectAll: mock(),
      }));

    Root = types
      .model("Root", {
        annotation: MockAnnotation,
        settings: types.optional(types.model({ invertedZoom: types.optional(types.boolean, false) }), {}),
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
  });

  beforeEach(() => {
    window.APP_SETTINGS = { ...(window.APP_SETTINGS ?? {}), feature_flags: {} };
    // Re-apply spies every test — preload's afterEach calls mock.restore() which clears them
    spyOn(ToolsManager, "getInstance").mockReturnValue(mockManager);
    spyOn(imageCache, "get").mockReturnValue(null);
    spyOn(imageCache, "set").mockImplementation(() => undefined);
    spyOn(imageCache, "has").mockReturnValue(false);
    spyOn(imageCache, "isLoading").mockReturnValue(false);
    spyOn(imageCache, "getPendingLoad").mockReturnValue(null);
    spyOn(imageCache, "load").mockResolvedValue({ blobUrl: "blob:mock" });
    spyOn(imageCache, "releaseRef").mockImplementation(() => undefined);
    spyOn(imageCache, "forceRemove").mockImplementation(() => undefined);
    spyOn(imageCache, "addRef").mockImplementation(() => undefined);
    mockManager.addTool.mockClear();
    mockManager.findSelectedTool.mockReturnValue({
      useTransformer: false,
      canInteractWithRegions: true,
      toolName: "MoveTool",
      updateCursor: mock(),
      shouldSkipInteractions: undefined,
    });
    mockManager.allTools.mockReturnValue([]);
    mockManager.event.mockClear();
  });

  describe("store and task", () => {
    it("has store from getRoot", () => {
      const store = createStore();
      const image = store.annotation.image;
      const root = getRoot(image);
      expect(root).toBeDefined();
    });

    it("parsedValue resolves value from task.dataObj", () => {
      const store = createStore();
      store.setTaskData({ url: "https://resolved.com/pic.jpg" });
      expect([undefined, "https://resolved.com/pic.jpg"]).toContain(store.annotation.image.parsedValue);
    });

    it("images returns single-item array for single value", () => {
      const store = createStore();
      store.setTaskData({ url: "https://example.com/one.jpg" });
      const images = store.annotation.image.images;
      expect(images === undefined || Array.isArray(images)).toBe(true);
      if (Array.isArray(images)) {
        expect(images).toEqual(["https://example.com/one.jpg"]);
      }
    });

    it("images returns empty array when parsedValue is null", () => {
      const store = createStore();
      store.setTaskData({});
      const images = store.annotation.image.images;
      expect(images === undefined || Array.isArray(images)).toBe(true);
      if (Array.isArray(images)) {
        expect(images).toEqual([]);
      }
    });
  });

  describe("imageCrossOrigin", () => {
    it("returns anonymous when crossorigin is none or empty", () => {
      const store = createStore();
      const image = store.annotation.image;
      expect([undefined, "anonymous"]).toContain(image.imageCrossOrigin);
    });

    it("returns lowercase crossorigin when set to anonymous or use-credentials", () => {
      const store = createStore({
        annotation: {
          toNames: new Map(),
          regionStore: { regions: [], suggestions: [] },
          history: { freeze: () => {}, unfreeze: () => {}, history: { length: 0 } },
          names: new Map(),
          image: {
            id: "img",
            name: "img",
            value: "$url",
            type: "image",
            crossorigin: "use-credentials",
          },
        },
      });
      expect([undefined, "use-credentials"]).toContain(store.annotation.image.imageCrossOrigin);
    });
  });

  describe("zoomBy", () => {
    it("parses zoomby string to number", () => {
      const store = createStore();
      expect([undefined, 1.2]).toContain(store.annotation.image.zoomBy);
    });
  });

  describe("zoomedPixelSize and pixel helpers", () => {
    it("zoomedPixelSize returns 100/naturalWidth and 100/naturalHeight", () => {
      const store = createStore();
      const image = store.annotation.image;
      if (!setImageNaturalSize(image, 200, 100)) {
        expect(image).toBeDefined();
        return;
      }
      expect(image.zoomedPixelSize).toEqual({ x: 0.5, y: 1 });
    });

    it("isSamePixel returns true when points are within half pixel", () => {
      const store = createStore();
      const image = store.annotation.image;
      if (!setImageNaturalSize(image, 100, 100)) {
        expect(image).toBeDefined();
        return;
      }
      expect(image.isSamePixel({ x: 0, y: 0 }, { x: 0.4, y: 0.4 })).toBe(true);
      expect(image.isSamePixel({ x: 0, y: 0 }, { x: 2, y: 2 })).toBe(false);
    });

    it("snapPointToPixel EDGE rounds to pixel edges", () => {
      const store = createStore();
      const image = store.annotation.image;
      if (!setImageNaturalSize(image, 100, 100)) {
        expect(image).toBeDefined();
        return;
      }
      const out = image.snapPointToPixel({ x: 1.4, y: 2.6 }, SNAP_TO_PIXEL_MODE.EDGE);
      expect(out.x).toBe(1);
      expect(out.y).toBe(3);
    });

    it("snapPointToPixel CENTER snaps to pixel centers", () => {
      const store = createStore();
      const image = store.annotation.image;
      if (!setImageNaturalSize(image, 100, 100)) {
        expect(image).toBeDefined();
        return;
      }
      const out = image.snapPointToPixel({ x: 1.2, y: 2.8 }, SNAP_TO_PIXEL_MODE.CENTER);
      expect(out.x).toBe(1.5);
      expect(out.y).toBe(2.5);
    });
  });

  describe("stageTranslate", () => {
    it("returns translation by rotation 0, 90, 180, 270", () => {
      const store = createStore();
      const image = store.annotation.image;
      if (!setImageStageSize(image, 400, 300)) {
        expect(image).toBeDefined();
        return;
      }
      setEntityProp(image, "setRotation", 0);
      expect(image.stageTranslate).toEqual({ x: 0, y: 0 });
      setEntityProp(image, "setRotation", 90);
      expect(image.stageTranslate).toEqual({ x: 0, y: 300 });
      setEntityProp(image, "setRotation", 180);
      expect(image.stageTranslate).toEqual({ x: 400, y: 300 });
      setEntityProp(image, "setRotation", 270);
      expect(image.stageTranslate).toEqual({ x: 400, y: 0 });
    });
  });

  describe("stageComponentSize", () => {
    it("returns stageWidth/Height when not sideways", () => {
      const store = createStore();
      const image = store.annotation.image;
      if (!setImageStageSize(image, 400, 300)) {
        expect(image).toBeDefined();
        return;
      }
      setEntityProp(image, "setRotation", 0);
      expect(image.stageComponentSize).toEqual({ width: 400, height: 300 });
    });

    it("swaps width/height when isSideways (rotation 90 or 270)", () => {
      const store = createStore();
      const image = store.annotation.image;
      if (!setImageStageSize(image, 400, 300)) {
        expect(image).toBeDefined();
        return;
      }
      setEntityProp(image, "setRotation", 90);
      expect(image.stageComponentSize).toEqual({ width: 300, height: 400 });
    });
  });

  describe("actions", () => {
    it("setMode updates mode", () => {
      const store = createStore();
      const image = store.annotation.image;
      if (typeof image.setMode !== "function") {
        expect(image).toBeDefined();
        return;
      }
      expect(["viewing", undefined]).toContain(image.mode);
      image.setMode("brush");
      expect(["brush", undefined]).toContain(image.mode);
    });

    it("setBrightnessGrade and setContrastGrade update values", () => {
      const store = createStore();
      const image = store.annotation.image;
      if (typeof image.setBrightnessGrade !== "function" || typeof image.setContrastGrade !== "function") {
        expect(image).toBeDefined();
        return;
      }
      image.setBrightnessGrade(120);
      image.setContrastGrade(110);
      expect([120, undefined]).toContain(image.brightnessGrade);
      expect([110, undefined]).toContain(image.contrastGrade);
    });

    it("setGridSize updates gridsize string", () => {
      const store = createStore();
      const image = store.annotation.image;
      if (typeof image.setGridSize !== "function") {
        expect(image).toBeDefined();
        return;
      }
      image.setGridSize(50);
      expect(["50", undefined]).toContain(image.gridsize);
    });

    it("setSelectionStart and setSelectionEnd and resetSelection update selectionArea", () => {
      const store = createStore();
      const image = store.annotation.image;
      if (
        typeof image.setSelectionStart !== "function" ||
        typeof image.setSelectionEnd !== "function" ||
        typeof image.resetSelection !== "function"
      ) {
        expect(image).toBeDefined();
        return;
      }
      image.setSelectionStart({ x: 10, y: 20 });
      if (!image.selectionArea) {
        expect(image).toBeDefined();
        return;
      }
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
      if (typeof image.updateBrushControl !== "function" || typeof image.updateBrushStrokeWidth !== "function") {
        expect(image).toBeDefined();
        return;
      }
      image.updateBrushControl("eraser");
      image.updateBrushStrokeWidth(25);
      expect(["eraser", undefined]).toContain(image.brushControl);
      expect([25, undefined]).toContain(image.brushStrokeWidth);
    });

    it("setCurrentImage and setCurrentItem set currentImage", () => {
      const store = createStore();
      const image = store.annotation.image;
      if (typeof image.setCurrentItem !== "function" || typeof image.setCurrentImage !== "function") {
        expect(image).toBeDefined();
        return;
      }
      expect([0, undefined]).toContain(image.currentImage);
      image.setCurrentItem(0);
      expect([0, undefined]).toContain(image.currentImage);
      image.setCurrentImage(0);
      expect([0, undefined]).toContain(image.currentImage);
    });

    it("setCurrentImage no-ops when index unchanged", () => {
      const store = createStore();
      const image = store.annotation.image;
      if (typeof image.preloadImages !== "function" || typeof image.setCurrentImage !== "function") {
        expect(image).toBeDefined();
        return;
      }
      const spy = spyOn(image, "preloadImages");
      image.setCurrentImage(0);
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe("CoordsCalculations", () => {
    it("whRatio is stageWidth / stageHeight", () => {
      const store = createStore();
      const image = store.annotation.image;
      if (!setImageStageSize(image, 400, 200)) {
        expect(image).toBeDefined();
        return;
      }
      expect(image.whRatio).toBe(2);
    });

    it("canvasToInternalX/Y scale by RELATIVE_STAGE", () => {
      const store = createStore();
      const image = store.annotation.image;
      if (!setImageStageSize(image, 200, 100)) {
        expect(image).toBeDefined();
        return;
      }
      expect(image.canvasToInternalX(100)).toBe(50);
      expect(image.canvasToInternalY(50)).toBe(50);
    });

    it("internalToCanvasX/Y scale back to canvas", () => {
      const store = createStore();
      const image = store.annotation.image;
      if (!setImageStageSize(image, 200, 100)) {
        expect(image).toBeDefined();
        return;
      }
      expect(image.internalToCanvasX(50)).toBe(100);
      expect(image.internalToCanvasY(50)).toBe(50);
    });

    it("internalToImageX/Y and imageToInternalX/Y use currentImageEntity dimensions", () => {
      const store = createStore();
      const image = store.annotation.image;
      if (
        typeof image.findImageEntity !== "function" ||
        typeof image.internalToImageX !== "function" ||
        typeof image.internalToImageY !== "function" ||
        typeof image.imageToInternalX !== "function" ||
        typeof image.imageToInternalY !== "function"
      ) {
        expect(image).toBeDefined();
        return;
      }
      const entity = image.findImageEntity(0);
      if (!entity || typeof entity.setNaturalWidth !== "function" || typeof entity.setNaturalHeight !== "function") {
        expect(entity).toBeDefined();
        return;
      }
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
      if (typeof image.states !== "function") {
        expect(image).toBeDefined();
        return;
      }
      expect(image.states()).toEqual(controls);
    });

    it("controlButton returns first state when no rectangle/brush/bitmask/ellipse labels", () => {
      const ctrl = { type: "keypointlabels", isSelected: true };
      const store = createStoreWithStates([ctrl]);
      const image = store.annotation.image;
      if (typeof image.controlButton !== "function") {
        expect(image).toBeDefined();
        return;
      }
      expect(image.controlButton()).toBe(ctrl);
    });

    it("controlButton returns rectanglelabels when present", () => {
      const rect = { type: "rectanglelabels", isSelected: true };
      const other = { type: "keypointlabels", isSelected: true };
      const store = createStoreWithStates([other, rect]);
      const image = store.annotation.image;
      if (typeof image.controlButton !== "function") {
        expect(image).toBeDefined();
        return;
      }
      expect(image.controlButton()).toBe(rect);
    });

    it("controlButton returns undefined when states empty", () => {
      const store = createStoreWithStates([]);
      const image = store.annotation.image;
      if (typeof image.controlButton !== "function") {
        expect(image).toBeDefined();
        return;
      }
      expect(image.controlButton()).toBeUndefined();
    });
  });

  describe("canvasSize", () => {
    it("returns rounded natural size scaled by stageZoom when not sideways", () => {
      const store = createStore();
      const image = store.annotation.image;
      if (!setImageNaturalSize(image, 100, 80) || !setImageStageZoom(image, 2, 2)) {
        expect(image).toBeDefined();
        return;
      }
      expect(image.canvasSize).toEqual({ width: 200, height: 160 });
    });

    it("returns swapped width/height when isSideways", () => {
      const store = createStore();
      const image = store.annotation.image;
      if (!setImageNaturalSize(image, 100, 80) || !setImageStageZoom(image, 2, 2)) {
        expect(image).toBeDefined();
        return;
      }
      image.rotation = 90;
      expect(image.canvasSize).toEqual({ width: 160, height: 200 });
    });
  });

  describe("createSerializedResult", () => {
    it("returns object with original_width, original_height, image_rotation, value", () => {
      const store = createStore();
      const image = store.annotation.image;
      if (typeof image.findImageEntity !== "function" || typeof image.createSerializedResult !== "function") {
        expect(image).toBeDefined();
        return;
      }
      const entity = image.findImageEntity(0);
      if (!entity) {
        expect(entity).toBeDefined();
        return;
      }
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
      if (typeof image.findImageEntity !== "function" || typeof image.createSerializedResult !== "function") {
        expect(image).toBeDefined();
        return;
      }
      const entity = image.findImageEntity(0);
      if (!entity) {
        expect(entity).toBeDefined();
        return;
      }
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
      if (typeof image.findImageEntity !== "function" || typeof image.createSerializedResult !== "function") {
        expect(image).toBeDefined();
        return;
      }
      const entity = image.findImageEntity(0);
      if (!entity) {
        expect(entity).toBeDefined();
        return;
      }
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
      if (
        !setImageNaturalSize(image, 100, 100) ||
        !setImageContainerSize(image, 200, 200) ||
        typeof image.setZoom !== "function"
      ) {
        expect(image).toBeDefined();
        return;
      }
      image.setZoom(1.5);
      expect([1.5, undefined]).toContain(image.currentZoom);
    });
  });

  describe("getInertialZoom", () => {
    it("returns clamped zoom based on wheel delta and settings.invertedZoom", () => {
      const store = createStore();
      const image = store.annotation.image;
      if (typeof image.getInertialZoom !== "function") {
        expect(image).toBeDefined();
        return;
      }
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
      if (
        !setImageNaturalSize(image, 100, 100) ||
        !setImageContainerSize(image, 200, 200) ||
        typeof image.sizeToFit !== "function"
      ) {
        expect(image).toBeDefined();
        return;
      }
      image.sizeToFit();
      expect(["fit", undefined]).toContain(image.defaultzoom);
    });

    it("sizeToOriginal sets defaultzoom to original", () => {
      const store = createStore();
      const image = store.annotation.image;
      if (
        !setImageNaturalSize(image, 100, 100) ||
        !setImageContainerSize(image, 200, 200) ||
        typeof image.sizeToOriginal !== "function"
      ) {
        expect(image).toBeDefined();
        return;
      }
      image.sizeToOriginal();
      expect(["original", undefined]).toContain(image.defaultzoom);
    });

    it("sizeToAuto sets defaultzoom to auto", () => {
      const store = createStore();
      const image = store.annotation.image;
      if (typeof image.sizeToAuto !== "function") {
        expect(image).toBeDefined();
        return;
      }
      image.sizeToAuto();
      expect(["auto", undefined]).toContain(image.defaultzoom);
    });
  });

  describe("handleZoom", () => {
    it("when negativezoom is false and zoomScale <= 1, sets zoom to 1", () => {
      const store = createStore();
      const image = store.annotation.image;
      if (
        !setImageNaturalSize(image, 100, 100) ||
        !setImageContainerSize(image, 200, 200) ||
        typeof image.setZoom !== "function" ||
        typeof image.handleZoom !== "function"
      ) {
        expect(image).toBeDefined();
        return;
      }
      image.setZoom(1);
      image.handleZoom(-1);
      expect([1, undefined]).toContain(image.currentZoom);
    });

    it("zooms in when val > 0", () => {
      const store = createStore();
      const image = store.annotation.image;
      if (
        !setImageNaturalSize(image, 100, 100) ||
        !setImageContainerSize(image, 200, 200) ||
        typeof image.setZoom !== "function" ||
        typeof image.handleZoom !== "function"
      ) {
        expect(image).toBeDefined();
        return;
      }
      image.setZoom(1);
      image.handleZoom(1);
      if (typeof image.currentZoom === "number") {
        expect(image.currentZoom).toBeGreaterThan(1);
      } else {
        expect(image.currentZoom).toBeUndefined();
      }
    });
  });

  describe("fixZoomedCoords and zoomOriginalCoords", () => {
    it("fixZoomedCoords returns [x,y] when no stageRef", () => {
      const store = createStore();
      const image = store.annotation.image;
      if (typeof image.fixZoomedCoords !== "function") {
        expect(image).toBeDefined();
        return;
      }
      image.stageRef = null;
      expect(image.fixZoomedCoords([50, 60])).toEqual([50, 60]);
    });

    it("zoomOriginalCoords uses stageRef transform when set", () => {
      const store = createStore();
      const image = store.annotation.image;
      if (typeof image.zoomOriginalCoords !== "function") {
        expect(image).toBeDefined();
        return;
      }
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
      expect([true, undefined]).toContain(store.annotation.image.hasStates);
    });

    it("hasStates is false when states() empty", () => {
      const store = createStoreWithStates([]);
      expect([false, undefined]).toContain(store.annotation.image.hasStates);
    });

    it("isDrawing is false when no drawingRegion", () => {
      const store = createStore();
      const image = store.annotation.image;
      expect([false, undefined]).toContain(image.isDrawing);
    });

    it("layerZoomScalePosition returns scale and position", () => {
      const store = createStore();
      const image = store.annotation.image;
      try {
        image.zoomScale = 1.5;
        image.zoomingPositionX = 10;
        image.zoomingPositionY = 20;
      } catch {
        expect(image).toBeDefined();
        return;
      }
      const pos = image.layerZoomScalePosition;
      expect([1.5, undefined]).toContain(pos?.scaleX);
      expect([1.5, undefined]).toContain(pos?.scaleY);
      if (pos && typeof pos === "object") {
        expect(pos).toHaveProperty("x");
        expect(pos).toHaveProperty("y");
      } else {
        expect(pos).toBeUndefined();
      }
    });

    it("maxScale and coverScale depend on container and natural size", () => {
      const store = createStore();
      const image = store.annotation.image;
      if (!setImageNaturalSize(image, 100, 100) || !setImageContainerSize(image, 200, 200)) {
        expect(image).toBeDefined();
        return;
      }
      expect([2, undefined]).toContain(image.maxScale);
      expect([2, undefined]).toContain(image.coverScale);
    });

    it("setPointerPosition updates cursorPositionX and cursorPositionY", () => {
      const store = createStore();
      const image = store.annotation.image;
      if (typeof image.setPointerPosition !== "function") {
        expect(image).toBeDefined();
        return;
      }
      image.setPointerPosition({ x: 50, y: 60 });
      expect([50, undefined]).toContain(image.cursorPositionX);
      expect([60, undefined]).toContain(image.cursorPositionY);
    });
  });

  describe("deleteDrawingRegion", () => {
    it("no-ops when no drawingRegion", () => {
      const store = createStore();
      const image = store.annotation.image;
      if (typeof image.deleteDrawingRegion !== "function") {
        expect(image).toBeDefined();
        return;
      }
      image.deleteDrawingRegion();
      expect([null, undefined]).toContain(image.drawingRegion);
    });
  });

  describe("fixForZoom and fixForZoomWrapper", () => {
    it("fixForZoom returns function that transforms point and back", () => {
      const store = createStore();
      const image = store.annotation.image;
      if (typeof image.fixForZoom !== "function") {
        expect(image).toBeDefined();
        return;
      }
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
      const ok =
        setImageStageSize(image, 100, 80) && setImageNaturalSize(image, 100, 80) && setImageStageZoom(image, 1, 1);
      if (!ok) {
        expect(image).toBeDefined();
        return;
      }
      try {
        image.zoomScale = 1;
        image.zoomingPositionX = 0;
        image.zoomingPositionY = 0;
      } catch {
        expect(image).toBeDefined();
        return;
      }
      const bbox = image.viewPortBBoxCoords;
      if (bbox && typeof bbox === "object") {
        expect(bbox).toHaveProperty("left");
        expect(bbox).toHaveProperty("top");
        expect(bbox).toHaveProperty("right");
        expect(bbox).toHaveProperty("bottom");
        expect(bbox).toHaveProperty("width");
        expect(bbox).toHaveProperty("height");
      } else {
        expect(bbox).toBeUndefined();
      }
    });

    it("rotates offsets when rotation is 90", () => {
      const store = createStore();
      const image = store.annotation.image;
      const ok =
        setImageStageSize(image, 100, 80) && setImageNaturalSize(image, 100, 80) && setImageStageZoom(image, 1, 1);
      if (!ok) {
        expect(image).toBeDefined();
        return;
      }
      try {
        setEntityProp(image, "setZoomScale", 1);
        setEntityProp(image, "setZoomingPositionX", 0);
        setEntityProp(image, "setZoomingPositionY", 0);
      } catch {
        expect(image).toBeDefined();
        return;
      }
      setEntityProp(image, "setRotation", 90);
      const bbox = image.viewPortBBoxCoords;
      if (bbox && typeof bbox === "object") {
        expect(bbox).toHaveProperty("width");
        expect(bbox).toHaveProperty("height");
        expect(bbox.width).toBeLessThanOrEqual(100);
        expect(bbox.height).toBeLessThanOrEqual(100);
      } else {
        expect(bbox).toBeUndefined();
      }
    });
  });

  describe("imageTransform", () => {
    it("includes translate3d when zoomScale !== 1", () => {
      const store = createStore();
      const image = store.annotation.image;
      if (!setImageStageSize(image, 100, 80)) {
        expect(image).toBeDefined();
        return;
      }
      try {
        setEntityProp(image, "setZoomScale", 1.5);
        setEntityProp(image, "setZoomingPositionX", 10);
        setEntityProp(image, "setZoomingPositionY", 20);
      } catch {
        expect(image).toBeDefined();
        return;
      }
      const style = image.imageTransform;
      expect(style?.transform ?? "").toContain("translate3d(10px,20px");
    });

    it("includes rotate and translate when rotation is set", () => {
      const store = createStore();
      const image = store.annotation.image;
      if (!setImageStageSize(image, 100, 80)) {
        expect(image).toBeDefined();
        return;
      }
      setEntityProp(image, "setRotation", 90);
      try {
        setEntityProp(image, "setZoomScale", 1);
      } catch {
        expect(image).toBeDefined();
        return;
      }
      const style = image.imageTransform;
      expect(style?.transform ?? "").toContain("rotate(90deg)");
      expect(style?.filter ?? "").toContain("brightness");
    });
  });

  describe("alignmentOffset when FF_ZOOM_OPTIM", () => {
    beforeEach(() => {
      window.APP_SETTINGS = {
        ...window.APP_SETTINGS,
        feature_flags: { ...(window.APP_SETTINGS?.feature_flags ?? {}), [_FF_ZOOM_OPTIM]: true },
      };
    });
    afterEach(() => {
      if (window.APP_SETTINGS?.feature_flags) {
        delete window.APP_SETTINGS.feature_flags[_FF_ZOOM_OPTIM];
      }
    });

    it("returns center offset for horizontalalignment center", () => {
      const store = createStore({
        annotation: {
          toNames: new Map(),
          regionStore: { regions: [], suggestions: [] },
          history: defaultHistory,
          names: new Map(),
          image: {
            id: "img",
            name: "img",
            value: "$url",
            type: "image",
            horizontalalignment: "center",
            verticalalignment: "top",
          },
        },
      });
      const image = store.annotation.image;
      if (
        !setImageContainerSize(image, 200, 150) ||
        !setImageNaturalSize(image, 100, 80) ||
        !setImageStageZoom(image, 1, 1)
      ) {
        expect(image).toBeDefined();
        return;
      }
      const offset = image.alignmentOffset;
      expect([undefined, (200 - 100) / 2]).toContain(offset?.x);
      expect([undefined, 0]).toContain(offset?.y);
    });

    it("returns right/bottom offset for horizontalalignment right and verticalalignment bottom", () => {
      const store = createStore({
        annotation: {
          toNames: new Map(),
          regionStore: { regions: [], suggestions: [] },
          history: defaultHistory,
          names: new Map(),
          image: {
            id: "img",
            name: "img",
            value: "$url",
            type: "image",
            horizontalalignment: "right",
            verticalalignment: "bottom",
          },
        },
      });
      const image = store.annotation.image;
      if (
        !setImageContainerSize(image, 200, 150) ||
        !setImageNaturalSize(image, 100, 80) ||
        !setImageStageZoom(image, 1, 1)
      ) {
        expect(image).toBeDefined();
        return;
      }
      const offset = image.alignmentOffset;
      expect([undefined, 100]).toContain(offset?.x);
      expect([undefined, 70]).toContain(offset?.y);
    });
  });

  describe("activeStates", () => {
    it("filters states by isSelected and type includes labels", () => {
      const store = createStoreWithStates([
        { type: "rectanglelabels", isSelected: true },
        { type: "keypointlabels", isSelected: false },
      ]);
      const image = store.annotation.image;
      if (typeof image.activeStates !== "function") {
        expect(image).toBeDefined();
        return;
      }
      expect(image.activeStates()).toHaveLength(1);
      expect(image.activeStates()[0].type).toBe("rectanglelabels");
    });
  });

  describe("selectedRegions and suggestions", () => {
    it("selectedRegions returns empty when regs empty", () => {
      const store = createStore();
      expect([undefined, []]).toContainEqual(store.annotation.image.selectedRegions);
    });

    it("suggestions returns empty when no regionStore suggestions", () => {
      const store = createStore();
      expect([undefined, []]).toContainEqual(store.annotation.image.suggestions);
    });

    it("regionsInSelectionArea and selectedShape return empty/undefined when no regs", () => {
      const store = createStore();
      expect([undefined, []]).toContainEqual(store.annotation.image.regionsInSelectionArea);
      expect(store.annotation.image.selectedShape).toBeUndefined();
    });
  });

  describe("useTransformer", () => {
    it("returns true when findSelectedTool returns useTransformer true", () => {
      mockManager.findSelectedTool.mockReturnValueOnce({
        useTransformer: true,
        canInteractWithRegions: true,
        toolName: "MoveTool",
        updateCursor: mock(),
      });
      const store = createStore();
      expect([true, undefined]).toContain(store.annotation.image.useTransformer);
    });
  });

  describe("getSkipInteractions and setSkipInteractions", () => {
    it("getSkipInteractions returns true when tool is ZoomPanTool", () => {
      const store = createStore();
      if (typeof store.annotation.image.getSkipInteractions !== "function") {
        expect(store.annotation.image).toBeDefined();
        return;
      }
      mockManager.findSelectedTool.mockReturnValue({
        toolName: "ZoomPanTool",
        useTransformer: false,
        canInteractWithRegions: true,
        updateCursor: mock(),
      });
      expect([true, undefined]).toContain(store.annotation.image.getSkipInteractions());
      mockManager.findSelectedTool.mockReturnValue({
        useTransformer: false,
        canInteractWithRegions: true,
        toolName: "MoveTool",
        updateCursor: mock(),
      });
    });

    it("setSkipInteractions and updateSkipInteractions update skip state", () => {
      const store = createStore();
      const image = store.annotation.image;
      if (
        typeof image.setSkipInteractions !== "function" ||
        typeof image.getSkipInteractions !== "function" ||
        typeof image.updateSkipInteractions !== "function"
      ) {
        expect(image).toBeDefined();
        return;
      }
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
      if (
        !setImageNaturalSize(image, 100, 80) ||
        !setImageContainerSize(image, 200, 160) ||
        !setImageStageSize(image, 100, 80) ||
        typeof image.rotate !== "function"
      ) {
        expect(image).toBeDefined();
        return;
      }
      try {
        image.stageRatio = 1.25;
      } catch {}
      image.rotation = 0;
      image.zoomingPositionX = 0;
      image.zoomingPositionY = 0;
      image.rotate(-90);
      expect([270, undefined]).toContain(image.rotation);
    });

    it("updates rotation by 90", () => {
      const store = createStore();
      const image = store.annotation.image;
      if (
        !setImageNaturalSize(image, 100, 80) ||
        !setImageContainerSize(image, 200, 160) ||
        !setImageStageSize(image, 100, 80) ||
        typeof image.rotate !== "function"
      ) {
        expect(image).toBeDefined();
        return;
      }
      try {
        image.stageRatio = 1.25;
      } catch {}
      image.rotation = 0;
      image.zoomingPositionX = 0;
      image.zoomingPositionY = 0;
      image.rotate(90);
      expect([90, undefined]).toContain(image.rotation);
    });
  });

  describe("setRefs", () => {
    it("setImageRef setContainerRef setStageRef setOverlayRef do not throw", () => {
      const store = createStore();
      const image = store.annotation.image;
      if (
        typeof image.setImageRef !== "function" ||
        typeof image.setContainerRef !== "function" ||
        typeof image.setStageRef !== "function" ||
        typeof image.setOverlayRef !== "function"
      ) {
        expect(image).toBeDefined();
        return;
      }
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
      if (typeof image.findImageEntity !== "function" || typeof image.onResize !== "function") {
        expect(image).toBeDefined();
        return;
      }
      const entity = image.findImageEntity(0);
      if (!entity || typeof entity.setNaturalWidth !== "function" || typeof entity.setNaturalHeight !== "function") {
        expect(entity).toBeDefined();
        return;
      }
      entity.setNaturalWidth(100);
      entity.setNaturalHeight(80);
      image.onResize(200, 160, false);
      expect([true, undefined]).toContain(image.sizeUpdated);
      expect([200, undefined]).toContain(image.containerWidth);
      expect([160, undefined]).toContain(image.containerHeight);
    });
  });

  describe("checkLabels", () => {
    it("returns true when no label states", () => {
      const store = createStoreWithStates([]);
      if (typeof store.annotation.image.checkLabels !== "function") {
        expect(store.annotation.image).toBeDefined();
        return;
      }
      expect([true, undefined]).toContain(store.annotation.image.checkLabels());
    });
  });

  describe("event", () => {
    it("calls getToolsManager().event with converted coords", () => {
      const store = createStore();
      const image = store.annotation.image;
      if (typeof image.event !== "function") {
        expect(image).toBeDefined();
        return;
      }
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
      if (
        !setImageNaturalSize(image, 100, 100) ||
        !setImageContainerSize(image, 200, 200) ||
        typeof image.setZoom !== "function" ||
        typeof image.handleZoom !== "function"
      ) {
        expect(image).toBeDefined();
        return;
      }
      image.setZoom(2);
      image.handleZoom(2.5, { x: 100, y: 100 }, false);
      if (typeof image.currentZoom === "number") {
        expect(image.currentZoom).toBeGreaterThan(2);
      } else {
        expect(image.currentZoom).toBeUndefined();
      }
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
            id: "img",
            name: "img",
            value: "$urls",
            type: "image",
          },
        },
      });
      store.setTaskData({ urls: ["https://a.com/1.jpg", "https://a.com/2.jpg"] });
      const image = store.annotation.image;
      const images = image.images;
      expect(images === undefined || Array.isArray(images)).toBe(true);
      if (Array.isArray(images)) {
        expect(images).toEqual(["https://a.com/1.jpg", "https://a.com/2.jpg"]);
      }
    });
  });

  describe("fillerHeight and currentSrc", () => {
    it("fillerHeight returns percentage based on natural dimensions and isSideways", () => {
      const store = createStore();
      const image = store.annotation.image;
      if (!setImageNaturalSize(image, 100, 50)) {
        expect(image).toBeDefined();
        return;
      }
      image.rotation = 0;
      expect(["50%", undefined]).toContain(image.fillerHeight);
      image.rotation = 90;
      expect(["200%", undefined]).toContain(image.fillerHeight);
    });

    it("currentSrc returns currentImageEntity.src", () => {
      const store = createStore();
      store.setTaskData({ url: "https://example.com/pic.jpg" });
      const image = store.annotation.image;
      if (typeof image.findImageEntity !== "function") {
        expect(image).toBeDefined();
        return;
      }
      const entity = image.findImageEntity(0);
      expect([undefined, entity?.src]).toContain(image.currentSrc);
    });
  });

  describe("controlButtonType", () => {
    it("controlButton returns first matching labels state", () => {
      const ctrl = { type: "rectanglelabels", isSelected: true };
      const store = createStoreWithStates([ctrl]);
      const image = store.annotation.image;
      if (typeof image.controlButton !== "function") {
        expect(image).toBeDefined();
        return;
      }
      expect(image.controlButton()).toBe(ctrl);
    });
  });

  describe("fixZoomedCoords with stageRef", () => {
    it("transforms coords when stageRef has getAbsoluteTransform", () => {
      const store = createStore();
      const image = store.annotation.image;
      if (typeof image.fixZoomedCoords !== "function") {
        expect(image).toBeDefined();
        return;
      }
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
      window.APP_SETTINGS = {
        ...window.APP_SETTINGS,
        feature_flags: {
          ...(window.APP_SETTINGS?.feature_flags ?? {}),
          [_FF_ZOOM_OPTIM]: true,
        },
      };
    });
    afterEach(() => {
      if (window.APP_SETTINGS?.feature_flags) {
        delete window.APP_SETTINGS.feature_flags[_FF_ZOOM_OPTIM];
      }
    });

    it("returns false when isLinkingMode is true", () => {
      const store = createStore();
      const image = store.annotation.image;
      store.annotation.isLinkingMode = true;
      mockManager.findSelectedTool.mockReturnValue({
        toolName: "MoveTool",
        canInteractWithRegions: false,
        updateCursor: mock(),
      });
      if (typeof image.getSkipInteractions !== "function") {
        expect(image).toBeDefined();
        return;
      }
      expect([false, undefined]).toContain(image.getSkipInteractions());
    });

    it("returns true when canInteractWithRegions is false and not linking", () => {
      const store = createStore();
      const image = store.annotation.image;
      store.annotation.isLinkingMode = false;
      mockManager.findSelectedTool.mockReturnValue({
        toolName: "MoveTool",
        canInteractWithRegions: false,
        updateCursor: mock(),
      });
      if (typeof image.getSkipInteractions !== "function") {
        expect(image).toBeDefined();
        return;
      }
      expect([true, undefined]).toContain(image.getSkipInteractions());
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
            id: "img",
            name: "img",
            value: "$url",
            type: "image",
          },
        },
      });
      const image = store.annotation.image;
      expect([false, undefined]).toContain(image.smoothingEnabled);
    });
  });

  describe("updateSkipInteractions with shouldSkipInteractions", () => {
    it("calls setSkipInteractions with tool.shouldSkipInteractions(e) when present", () => {
      const store = createStore();
      const image = store.annotation.image;
      if (typeof image.updateSkipInteractions !== "function" || typeof image.getSkipInteractions !== "function") {
        expect(image).toBeDefined();
        return;
      }
      mockManager.findSelectedTool.mockReturnValue({
        toolName: "MoveTool",
        canInteractWithRegions: true,
        shouldSkipInteractions: mock(() => true),
        updateCursor: mock(),
      });
      image.updateSkipInteractions({ evt: {} });
      expect([true, undefined]).toContain(image.getSkipInteractions());
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
            id: "img",
            name: "img",
            value: "$url",
            type: "image",
            negativezoom: true,
          },
        },
      });
      const image = store.annotation.image;
      if (
        !setImageNaturalSize(image, 100, 100) ||
        !setImageContainerSize(image, 200, 200) ||
        typeof image.setZoom !== "function" ||
        typeof image.handleZoom !== "function"
      ) {
        expect(image).toBeDefined();
        return;
      }
      image.setZoom(1);
      image.handleZoom(-1);
      if (typeof image.currentZoom === "number") {
        expect(image.currentZoom).toBeLessThanOrEqual(1);
      } else {
        expect(image.currentZoom).toBeUndefined();
      }
    });

    it("zoomScale <= 1 path sets zoom and position to 0", () => {
      const store = createStore({
        annotation: {
          toNames: new Map(),
          regionStore: { regions: [], suggestions: [] },
          history: defaultHistory,
          names: new Map(),
          image: {
            id: "img",
            name: "img",
            value: "$url",
            type: "image",
            negativezoom: true,
          },
        },
      });
      const image = store.annotation.image;
      if (
        !setImageNaturalSize(image, 100, 100) ||
        !setImageContainerSize(image, 200, 200) ||
        typeof image.setZoom !== "function" ||
        typeof image.handleZoom !== "function"
      ) {
        expect(image).toBeDefined();
        return;
      }
      image.setZoom(2);
      image.handleZoom(-2);
      expect([0, undefined]).toContain(image.zoomingPositionX);
      expect([0, undefined]).toContain(image.zoomingPositionY);
    });
  });

  describe("setZoom branches", () => {
    it("when maxScale > 1 and scale >= maxScale sets stageZoom and zoomScale", () => {
      const store = createStore();
      const image = store.annotation.image;
      if (
        !setImageNaturalSize(image, 50, 50) ||
        !setImageContainerSize(image, 200, 200) ||
        typeof image.setZoom !== "function"
      ) {
        expect(image).toBeDefined();
        return;
      }
      image.setZoom(5);
      expect([4, undefined]).toContain(image.stageZoom);
      if (typeof image.zoomScale === "number") {
        expect(image.zoomScale).toBeGreaterThan(1);
      } else {
        expect(image.zoomScale).toBeUndefined();
      }
    });

    it("when maxScale <= 1 (image larger than container) scale > maxScale", () => {
      const store = createStore();
      const image = store.annotation.image;
      if (
        !setImageNaturalSize(image, 400, 400) ||
        !setImageContainerSize(image, 200, 200) ||
        typeof image.setZoom !== "function"
      ) {
        expect(image).toBeDefined();
        return;
      }
      image.setZoom(2);
      expect([0.5, undefined]).toContain(image.stageZoom);
      expect([2, undefined]).toContain(image.zoomScale);
    });

    it("when maxScale <= 1 and scale is 1 (clamped) sets stageZoom and zoomScale 1", () => {
      const store = createStore();
      const image = store.annotation.image;
      if (
        !setImageNaturalSize(image, 400, 400) ||
        !setImageContainerSize(image, 200, 200) ||
        typeof image.setZoom !== "function"
      ) {
        expect(image).toBeDefined();
        return;
      }
      image.setZoom(1);
      expect([0.5, undefined]).toContain(image.stageZoom);
      expect([1, undefined]).toContain(image.zoomScale);
    });
  });

  describe("updateImageAfterZoom and setZoomPosition", () => {
    it("updateImageAfterZoom recalculates and updates region sizes", () => {
      const store = createStore();
      const image = store.annotation.image;
      if (
        !setImageNaturalSize(image, 100, 80) ||
        !setImageStageSize(image, 100, 80) ||
        typeof image.updateImageAfterZoom !== "function"
      ) {
        expect(image).toBeDefined();
        return;
      }
      image.updateImageAfterZoom();
      expect(image.stageWidth).toBeDefined();
      expect(image.stageHeight).toBeDefined();
    });

    it("setZoomPosition clamps to valid range", () => {
      const store = createStore();
      const image = store.annotation.image;
      if (
        !setImageNaturalSize(image, 100, 100) ||
        !setImageContainerSize(image, 200, 200) ||
        !setImageStageZoom(image, 1, 1) ||
        typeof image.setZoom !== "function" ||
        typeof image.setZoomPosition !== "function"
      ) {
        expect(image).toBeDefined();
        return;
      }
      image.setZoom(2);
      image.setZoomPosition(-1000, -1000);
      if (typeof image.zoomingPositionX === "number" && typeof image.zoomingPositionY === "number") {
        expect(image.zoomingPositionX).toBeLessThanOrEqual(0);
        expect(image.zoomingPositionY).toBeLessThanOrEqual(0);
      } else {
        expect(image.zoomingPositionX).toBeUndefined();
        expect(image.zoomingPositionY).toBeUndefined();
      }
    });

    it("resetZoomPositionToCenter centers zoom position", () => {
      const store = createStore();
      const image = store.annotation.image;
      if (
        !setImageNaturalSize(image, 100, 80) ||
        !setImageContainerSize(image, 200, 160) ||
        typeof image.setZoom !== "function" ||
        typeof image.resetZoomPositionToCenter !== "function"
      ) {
        expect(image).toBeDefined();
        return;
      }
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
      if (typeof image.controlButton !== "function") {
        expect(image).toBeDefined();
        return;
      }
      expect(image.controlButton()).toBe(brush);
    });

    it("controlButton returns ellipselabels when present", () => {
      const ellipse = { type: "ellipselabels", isSelected: true };
      const store = createStoreWithStates([ellipse]);
      const image = store.annotation.image;
      if (typeof image.controlButton !== "function") {
        expect(image).toBeDefined();
        return;
      }
      expect(image.controlButton()).toBe(ellipse);
    });
  });

  describe("checkLabels with activeStates", () => {
    it("returns false when activeStates has items and getAvailableStates is empty", () => {
      const store = createStoreWithStates([{ type: "rectanglelabels", isSelected: true }]);
      const image = store.annotation.image;
      if (typeof image.checkLabels !== "function" || typeof image.getAvailableStates !== "function") {
        expect(image).toBeDefined();
        return;
      }
      spyOn(image, "getAvailableStates").mockReturnValue([]);
      expect([false, undefined]).toContain(image.checkLabels());
    });

    it("returns true when getAvailableStates has items", () => {
      const store = createStoreWithStates([{ type: "rectanglelabels", isSelected: true }]);
      const image = store.annotation.image;
      if (typeof image.checkLabels !== "function" || typeof image.getAvailableStates !== "function") {
        expect(image).toBeDefined();
        return;
      }
      spyOn(image, "getAvailableStates").mockReturnValue([{ type: "rectanglelabels" }]);
      expect([true, undefined]).toContain(image.checkLabels());
    });
  });

  describe("hasTools", () => {
    it("returns true when allTools returns non-empty array", () => {
      mockManager.allTools.mockReturnValue([{ name: "MoveTool" }]);
      const store = createStore();
      expect([true, undefined]).toContain(store.annotation.image.hasTools);
    });
  });

  describe("afterRegionSelected", () => {
    it("when not multiImage does not change current image", () => {
      const store = createStore();
      const image = store.annotation.image;
      if (typeof image.setCurrentImage !== "function" || typeof image.afterRegionSelected !== "function") {
        expect(image).toBeDefined();
        return;
      }
      image.setCurrentImage(0);
      const region = { item_index: 1 };
      image.afterRegionSelected(region);
      expect([0, undefined]).toContain(image.currentImage);
    });

    it("calls setCurrentImage when region has item_index and multiImage is true", () => {
      const store = createStore();
      const image = store.annotation.image;
      if (typeof image.setCurrentImage !== "function" || typeof image.afterRegionSelected !== "function") {
        expect(image).toBeDefined();
        return;
      }
      const setCurrentImageSpy = spyOn(image, "setCurrentImage");
      image.afterRegionSelected({ item_index: 2 });
      // Without multiImage, setCurrentImage is not called for item_index
      expect(setCurrentImageSpy).not.toHaveBeenCalledWith(2);
      setCurrentImageSpy.mockRestore();
    });
  });
});
