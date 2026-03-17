/**
 * Unit tests for KonvaRegion mixin (mixins/KonvaRegion.js)
 */
import { getParent, types } from "mobx-state-tree";
import { guidGenerator } from "../../core/Helpers";

jest.mock("../../utils/feature-flags", () => ({
  isFF: jest.fn(() => false),
  FF_ZOOM_OPTIM: "ff_zoom_optim",
  FF_DEV_3391: "ff_3391",
  FF_SIMPLE_INIT: "ff_simple_init",
}));

const featureFlags = require("../../utils/feature-flags");

const mockAnnotation = () => ({
  regionStore: {
    isSelected: jest.fn(() => false),
    unselectAll: jest.fn(),
    toggleRegionSelection: jest.fn(),
  },
  selectArea: jest.fn(),
  selectAreas: jest.fn(),
  unselectAll: jest.fn(),
  toggleRegionSelection: jest.fn(),
  isDrawing: false,
  isLinkingMode: false,
  isReadOnly: jest.fn(() => false),
  addLinkedRegion: jest.fn(),
  stopLinkingMode: jest.fn(),
  isSuggestionsAccepting: false,
  areas: new Map(),
});

import Constants from "../../core/Constants";
import Regions from "../Regions";
import { KonvaRegionMixin } from "../KonvaRegion";

const Base = types
  .model("KonvaRegionTestBase", {
    id: types.optional(types.identifier, guidGenerator),
    pid: types.optional(types.string, guidGenerator),
    selected: types.optional(types.boolean, false),
  })
  .volatile(() => ({
    type: "rectangleregion",
    results: [],
    object: null,
    supportsRotate: false,
    _supportsTransform: true,
    hidden: false,
    shapeRef: null,
    updateImageSize: null,
  }))
  .actions((self) => ({
    setType(t) {
      self.type = t;
    },
    setResults(r) {
      self.results = r;
    },
    setObject(o) {
      self.object = o;
    },
    setSupportsRotate(v) {
      self.supportsRotate = v;
    },
    setSupportsTransform(v) {
      self._supportsTransform = v;
    },
    setHidden(v) {
      self.hidden = v;
    },
    setShapeRef(ref) {
      self.shapeRef = ref;
    },
    setSelected(s) {
      self.selected = s;
    },
    setUpdateImageSize(fn) {
      self.updateImageSize = fn;
    },
  }));

const WithDeleteRegion = types.model({}).actions(() => ({
  deleteRegion() {},
}));
// Override annotation to read from root._annotationForTest so tests pass regardless of
// feature-flag or module-load order when run with the full editor suite.
const AnnotationOverrideForTest = types.model({}).views((self) => ({
  get annotation() {
    const root = getParent(self);
    return root?._annotationForTest ?? null;
  },
}));
const TestRegion = types.compose(Base, Regions, WithDeleteRegion, KonvaRegionMixin, AnnotationOverrideForTest);

const _annotationRef = { current: null };

const RootModel = types
  .model({
    region: types.maybe(TestRegion),
  })
  .views((self) => ({
    get annotationStore() {
      return self._annotationForTest != null ? { selected: self._annotationForTest, selectedHistory: null } : null;
    },
    get stageWidth() {
      return self._stageWidth ?? 100;
    },
    get stageHeight() {
      return self._stageHeight ?? 100;
    },
  }))
  .volatile(() => ({
    _annotationForTest: null,
    _stageWidth: 100,
    _stageHeight: 100,
    internalToCanvasX: (x) => x,
    internalToCanvasY: (y) => y,
    stageRef: null,
    getToolsManager: () => ({ findSelectedTool: () => null }),
    naturalWidth: 100,
    naturalHeight: 100,
  }))
  .actions((self) => ({
    setAnnotationStore(store) {
      self._annotationForTest = store?.selected ?? null;
    },
    setStageRef(ref) {
      self.stageRef = ref;
    },
    setGetToolsManager(fn) {
      self.getToolsManager = fn;
    },
    setStageSize(w, h) {
      self._stageWidth = w;
      self._stageHeight = h;
    },
  }));

function createStore(annotationOverrides = {}, regionSnapshot = {}, rootVolatile = {}) {
  const annotation = { ...mockAnnotation(), ...annotationOverrides };
  annotation.areas = new Map();

  _annotationRef.current = annotation;
  const root = RootModel.create({ region: regionSnapshot });
  root.setAnnotationStore({ selected: annotation, selectedHistory: null });
  if (rootVolatile.stageRef) root.setStageRef(rootVolatile.stageRef);
  if (rootVolatile.getToolsManager) root.setGetToolsManager(rootVolatile.getToolsManager);
  const region = root.region;
  annotation.areas.set(region.id, true);
  return { root, region, annotation };
}

describe("KonvaRegion mixin", () => {
  beforeEach(() => {
    window.STORE_INIT_OK = true;
  });

  describe("views", () => {
    it("bboxCoords returns null and warns when not overridden", () => {
      const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
      const { region } = createStore();
      expect(region.bboxCoords).toBeNull();
      expect(warnSpy).toHaveBeenCalledWith("KonvaRegionMixin needs to implement bboxCoords getter in regions");
      warnSpy.mockRestore();
    });

    it("bboxCoordsCanvas uses parent internalToCanvas when parent and bbox exist", () => {
      const RegionWithBbox = types.compose(TestRegion).views((_self) => ({
        get bboxCoords() {
          return { left: 0, top: 0, right: 10, bottom: 10 };
        },
      }));
      const storeWithBbox = types
        .model({ region: types.maybe(RegionWithBbox) })
        .volatile(() => ({
          annotationStore: { selected: mockAnnotation(), selectedHistory: null },
          internalToCanvasX: (x) => x + 1,
          internalToCanvasY: (y) => y + 2,
          stageRef: null,
          getToolsManager: () => ({ findSelectedTool: () => null }),
          naturalWidth: 100,
          naturalHeight: 100,
          stageWidth: 100,
          stageHeight: 100,
        }))
        .create({ region: {} });
      const r = storeWithBbox.region;
      storeWithBbox.annotationStore.selected.areas.set(r.id, true);
      expect(r.bboxCoordsCanvas).toEqual({ left: 1, top: 2, right: 11, bottom: 12 });
    });

    it("inViewPort returns true when FF_ZOOM_OPTIM is off", () => {
      featureFlags.isFF.mockReturnValue(false);
      const { region } = createStore();
      expect(region.inViewPort).toBe(true);
    });

    it("inViewPort is false when FF_ZOOM_OPTIM is on and no object", () => {
      featureFlags.isFF.mockReturnValue(true);
      const RegionWithBbox = types.compose(TestRegion).views((_self) => ({
        get bboxCoords() {
          return { left: 0, top: 0, right: 10, bottom: 10 };
        },
      }));
      const storeWithBbox = types
        .model({ region: types.maybe(RegionWithBbox) })
        .volatile(() => ({
          annotationStore: { selected: mockAnnotation(), selectedHistory: null },
          internalToCanvasX: (x) => x,
          internalToCanvasY: (y) => y,
          stageRef: null,
          getToolsManager: () => ({ findSelectedTool: () => null }),
          naturalWidth: 100,
          naturalHeight: 100,
          stageWidth: 100,
          stageHeight: 100,
        }))
        .create({ region: {} });
      const r = storeWithBbox.region;
      storeWithBbox.annotationStore.selected.areas.set(r.id, true);
      expect(r.object).toBeNull();
      expect(r.inViewPort).toBe(false);
    });

    it("inViewPort is true when FF_ZOOM_OPTIM is on and bbox inside viewport", () => {
      featureFlags.isFF.mockReturnValue(true);
      const RegionWithBbox = types.compose(TestRegion).views((_self) => ({
        get bboxCoords() {
          return { left: 5, top: 5, right: 15, bottom: 15 };
        },
      }));
      const storeWithBbox = types
        .model({ region: types.maybe(RegionWithBbox) })
        .volatile(() => ({
          annotationStore: { selected: mockAnnotation(), selectedHistory: null },
          internalToCanvasX: (x) => x,
          internalToCanvasY: (y) => y,
          stageRef: null,
          getToolsManager: () => ({ findSelectedTool: () => null }),
          naturalWidth: 100,
          naturalHeight: 100,
          stageWidth: 100,
          stageHeight: 100,
        }))
        .create({ region: {} });
      const r = storeWithBbox.region;
      storeWithBbox.annotationStore.selected.areas.set(r.id, true);
      r.setObject({
        viewPortBBoxCoords: { left: 0, top: 0, right: 20, bottom: 20 },
      });
      expect(r.bboxCoordsCanvas).toEqual({ left: 5, top: 5, right: 15, bottom: 15 });
      expect(r.inViewPort).toBe(true);
    });

    it("control returns from_name with tools from results", () => {
      const controlTag = { tools: true, canrotate: true };
      const { region } = createStore();
      region.setResults([{ from_name: { smartEnabled: false } }, { from_name: controlTag }]);
      expect(region.control).toBe(controlTag);
    });

    it("canRotate is true when control has canrotate and region supportsRotate", () => {
      const controlTag = { tools: true, canrotate: true };
      const { region } = createStore();
      region.setResults([{ from_name: controlTag }]);
      region.setSupportsRotate(true);
      expect(region.canRotate).toBe(true);
      region.setSupportsRotate(false);
      expect(region.canRotate).toBe(false);
    });

    it("supportsTransform is false when hidden", () => {
      const { region } = createStore();
      region.setHidden(true);
      expect(region.supportsTransform).toBe(false);
    });

    it("supportsTransform is false when isReadOnly returns true", () => {
      const { region } = createStore({ isReadOnly: () => true });
      region.setHidden(false);
      region.setSupportsTransform(true);
      expect(region.supportsTransform).toBe(false);
    });
  });

  describe("actions", () => {
    it("updateCursor does nothing when no stage", () => {
      const { region } = createStore();
      expect(() => region.updateCursor(true)).not.toThrow();
      expect(() => region.updateCursor(false)).not.toThrow();
    });

    it("updateCursor sets pointer when hovered and not brushregion", () => {
      const style = {};
      const { region } = createStore({}, {}, { stageRef: { container: () => ({ style }) } });
      region.updateCursor(true);
      expect(style.cursor).toBe("pointer");
    });

    it("updateCursor does not set pointer for brushregion when hovered", () => {
      const style = {};
      const { region } = createStore({}, {}, { stageRef: { container: () => ({ style }) } });
      region.setType("brushregion");
      region.updateCursor(true);
      expect(style.cursor).toBeUndefined();
    });

    it("updateCursor sets linking cursor when hovered and annotation.isLinkingMode", () => {
      const style = {};
      const { region } = createStore({ isLinkingMode: true }, {}, { stageRef: { container: () => ({ style }) } });
      region.updateCursor(true);
      expect(style.cursor).toBe(Constants.LINKING_MODE_CURSOR);
    });

    it("updateCursor sets default when not hovered and no selected tool", () => {
      const style = {};
      const { region } = createStore({}, {}, { stageRef: { container: () => ({ style }) } });
      region.updateCursor(false);
      expect(style.cursor).toBe("default");
    });

    it("updateCursor calls selectedTool.updateCursor when not hovered and tool has it", () => {
      const style = {};
      const updateCursor = jest.fn();
      const { region } = createStore(
        {},
        {},
        {
          stageRef: { container: () => ({ style }) },
          getToolsManager: () => ({ findSelectedTool: () => ({ updateCursor }) }),
        },
      );
      region.updateCursor(false);
      expect(updateCursor).toHaveBeenCalled();
    });

    it("checkSizes calls updateImageSize when dimensions > 1", () => {
      const { region } = createStore();
      const updateImageSize = jest.fn();
      region.setUpdateImageSize(updateImageSize);
      region.checkSizes();
      expect(updateImageSize).toHaveBeenCalledWith(1, 1, 100, 100);
    });

    it("checkSizes does not call updateImageSize when stage width or height <= 1", () => {
      const { root, region } = createStore();
      root.setStageSize(1, 1);
      const updateImageSize = jest.fn();
      region.setUpdateImageSize(updateImageSize);
      region.checkSizes();
      expect(updateImageSize).not.toHaveBeenCalled();
    });

    it("selectRegion calls scrollToRegion", () => {
      const { region } = createStore();
      region.setObject({ zoomScale: 1 });
      const spy = jest.spyOn(region, "scrollToRegion");
      region.selectRegion();
      expect(spy).toHaveBeenCalled();
    });

    it("scrollToRegion returns when no viewport (no canvas)", () => {
      const { region } = createStore();
      region.setObject({ zoomScale: 1 });
      region.setShapeRef({ parent: null });
      expect(() => region.scrollToRegion()).not.toThrow();
    });

    it("scrollToRegion returns when viewport not found", () => {
      const { region } = createStore();
      region.setObject({ zoomScale: 1 });
      region.setShapeRef({
        parent: { canvas: { _canvas: document.createElement("div") } },
      });
      expect(() => region.scrollToRegion()).not.toThrow();
    });

    it("scrollToRegion does not scroll when region is cut off (overTop and overBottom both negative)", () => {
      const canvas = document.createElement("canvas");
      canvas.getBoundingClientRect = () => ({ top: 0, bottom: 400, left: 0, right: 400 });
      Object.defineProperty(canvas, "clientHeight", { value: 400, configurable: true });
      const viewport = document.createElement("div");
      viewport.className = "lsf-main-content";
      viewport.getBoundingClientRect = () => ({ top: 20, bottom: 300, left: 0, right: 400 });
      Object.defineProperty(viewport, "scrollTop", { value: 0, configurable: true });
      Object.defineProperty(viewport, "clientHeight", { value: 280, configurable: true });
      viewport.appendChild(canvas);

      const RegionWithBbox = types.compose(TestRegion).views((_self) => ({
        get bboxCoords() {
          return { left: 0, top: 10, right: 40, bottom: 300 };
        },
      }));
      const StoreWithBbox = types
        .model({ region: types.maybe(RegionWithBbox) })
        .views((self) => ({
          get annotationStore() {
            return self._annotationForTest != null
              ? { selected: self._annotationForTest, selectedHistory: null }
              : null;
          },
          get stageWidth() {
            return 100;
          },
          get stageHeight() {
            return 100;
          },
        }))
        .volatile(() => ({
          _annotationForTest: null,
          internalToCanvasX: (x) => x,
          internalToCanvasY: (y) => y,
          stageRef: null,
          getToolsManager: () => ({ findSelectedTool: () => null }),
          naturalWidth: 100,
          naturalHeight: 100,
        }))
        .actions((self) => ({
          setAnnotationStore(store) {
            self._annotationForTest = store?.selected ?? null;
          },
        }));
      const ann = mockAnnotation();
      ann.areas = new Map();
      const root = StoreWithBbox.create({ region: {} });
      root.setAnnotationStore({ selected: ann, selectedHistory: null });
      ann.areas.set(root.region.id, true);
      const region = root.region;
      region.setObject({ zoomScale: 1 });
      region.setShapeRef({ parent: { canvas: { _canvas: canvas } } });
      viewport.scrollBy = jest.fn();
      region.scrollToRegion();
      expect(viewport.scrollBy).not.toHaveBeenCalled();
    });

    it("scrollToRegion scrolls down when region is above viewport (overTop < 0, enough hidden)", () => {
      const canvas = document.createElement("canvas");
      canvas.getBoundingClientRect = () => ({ top: 50, bottom: 400, left: 0, right: 400 });
      Object.defineProperty(canvas, "clientHeight", { value: 350, configurable: true });
      const viewport = document.createElement("div");
      viewport.className = "lsf-main-content";
      viewport.getBoundingClientRect = () => ({ top: 100, bottom: 300, left: 0, right: 400 });
      Object.defineProperty(viewport, "scrollTop", { value: 0, configurable: true });
      Object.defineProperty(viewport, "clientHeight", { value: 200, configurable: true });
      viewport.appendChild(canvas);

      const RegionWithBbox = types.compose(TestRegion).views((_self) => ({
        get bboxCoords() {
          return { left: 0, top: 0, right: 40, bottom: 80 };
        },
      }));
      const StoreWithBbox = types
        .model({ region: types.maybe(RegionWithBbox) })
        .views((self) => ({
          get annotationStore() {
            return self._annotationForTest != null
              ? { selected: self._annotationForTest, selectedHistory: null }
              : null;
          },
          get stageWidth() {
            return 100;
          },
          get stageHeight() {
            return 100;
          },
        }))
        .volatile(() => ({
          _annotationForTest: null,
          internalToCanvasX: (x) => x,
          internalToCanvasY: (y) => y,
          stageRef: null,
          getToolsManager: () => ({ findSelectedTool: () => null }),
          naturalWidth: 100,
          naturalHeight: 100,
        }))
        .actions((self) => ({
          setAnnotationStore(store) {
            self._annotationForTest = store?.selected ?? null;
          },
        }));
      const ann = mockAnnotation();
      ann.areas = new Map();
      const root = StoreWithBbox.create({ region: {} });
      root.setAnnotationStore({ selected: ann, selectedHistory: null });
      ann.areas.set(root.region.id, true);
      const region = root.region;
      region.setObject({ zoomScale: 1 });
      region.setShapeRef({ parent: { canvas: { _canvas: canvas } } });
      viewport.scrollBy = jest.fn();
      region.scrollToRegion();
      expect(viewport.scrollBy).toHaveBeenCalledWith({ top: -50, left: 0, behavior: "smooth" });
    });

    it("scrollToRegion scrolls up when region is below viewport (overBottom < 0, enough hidden)", () => {
      const canvas = document.createElement("canvas");
      canvas.getBoundingClientRect = () => ({ top: 0, bottom: 400, left: 0, right: 400 });
      Object.defineProperty(canvas, "clientHeight", { value: 400, configurable: true });
      const viewport = document.createElement("div");
      viewport.className = "lsf-main-content";
      viewport.getBoundingClientRect = () => ({ top: 0, bottom: 200, left: 0, right: 400 });
      Object.defineProperty(viewport, "scrollTop", { value: 0, configurable: true });
      Object.defineProperty(viewport, "clientHeight", { value: 200, configurable: true });
      viewport.appendChild(canvas);

      const RegionWithBbox = types.compose(TestRegion).views((_self) => ({
        get bboxCoords() {
          return { left: 0, top: 250, right: 40, bottom: 350 };
        },
      }));
      const StoreWithBbox = types
        .model({ region: types.maybe(RegionWithBbox) })
        .views((self) => ({
          get annotationStore() {
            return self._annotationForTest != null
              ? { selected: self._annotationForTest, selectedHistory: null }
              : null;
          },
          get stageWidth() {
            return 100;
          },
          get stageHeight() {
            return 100;
          },
        }))
        .volatile(() => ({
          _annotationForTest: null,
          internalToCanvasX: (x) => x,
          internalToCanvasY: (y) => y,
          stageRef: null,
          getToolsManager: () => ({ findSelectedTool: () => null }),
          naturalWidth: 100,
          naturalHeight: 100,
        }))
        .actions((self) => ({
          setAnnotationStore(store) {
            self._annotationForTest = store?.selected ?? null;
          },
        }));
      const ann = mockAnnotation();
      ann.areas = new Map();
      const root = StoreWithBbox.create({ region: {} });
      root.setAnnotationStore({ selected: ann, selectedHistory: null });
      ann.areas.set(root.region.id, true);
      const region = root.region;
      region.setObject({ zoomScale: 1 });
      region.setShapeRef({ parent: { canvas: { _canvas: canvas } } });
      viewport.scrollBy = jest.fn();
      region.scrollToRegion();
      expect(viewport.scrollBy).toHaveBeenCalledWith({ top: 186, left: 0, behavior: "smooth" });
    });

    it("deleteRegion enables selected tool and calls super deleteRegion", () => {
      const enable = jest.fn();
      const { region } = createStore({}, {}, { getToolsManager: () => ({ findSelectedTool: () => ({ enable }) }) });
      region.deleteRegion();
      expect(enable).toHaveBeenCalled();
    });

    it("deleteRegion does not throw when no selected tool", () => {
      const { region } = createStore({}, {}, { getToolsManager: () => ({ findSelectedTool: () => null }) });
      expect(() => region.deleteRegion()).not.toThrow();
    });

    it("onClickRegion with detail 2 calls onDoubleClickRegion and selectAreas", () => {
      const { region, annotation } = createStore();
      region.onClickRegion({ evt: { detail: 2 } });
      expect(annotation.selectAreas).toHaveBeenCalledWith([region]);
    });

    it("onClickRegion when isLinkingMode calls addLinkedRegion, stopLinkingMode, unselectAll", () => {
      const addLinkedRegion = jest.fn();
      const stopLinkingMode = jest.fn();
      const unselectAll = jest.fn();
      const { region } = createStore({
        isLinkingMode: true,
        isReadOnly: () => false,
        addLinkedRegion,
        stopLinkingMode,
        regionStore: { unselectAll, isSelected: () => false, toggleRegionSelection: () => {} },
      });
      region.onClickRegion({ evt: {} });
      expect(addLinkedRegion).toHaveBeenCalledWith(region);
      expect(stopLinkingMode).toHaveBeenCalled();
      expect(unselectAll).toHaveBeenCalled();
    });

    it("onClickRegion when not linking and not double-click calls _selectArea", () => {
      const { region, annotation } = createStore();
      region.onClickRegion({ evt: {}, cancelBubble: false });
      expect(annotation.selectArea).toHaveBeenCalledWith(region);
    });
  });
});
