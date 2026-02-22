/**
 * Unit tests for KonvaRegion mixin (mixins/KonvaRegion.js)
 */
import { types } from "mobx-state-tree";
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
const TestRegion = types.compose(Base, Regions, WithDeleteRegion, KonvaRegionMixin);

const _annotationRef = { current: null };

const RootModel = types
  .model({
    region: types.maybe(TestRegion),
  })
  .volatile(() => ({
    annotationStore: _annotationRef.current ? { selected: _annotationRef.current, selectedHistory: null } : null,
    internalToCanvasX: (x) => x,
    internalToCanvasY: (y) => y,
    stageRef: null,
    getToolsManager: () => ({ findSelectedTool: () => null }),
    naturalWidth: 100,
    naturalHeight: 100,
    stageWidth: 100,
    stageHeight: 100,
  }))
  .actions((self) => ({
    setAnnotationStore(store) {
      self.annotationStore = store;
    },
    setStageRef(ref) {
      self.stageRef = ref;
    },
    setGetToolsManager(fn) {
      self.getToolsManager = fn;
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
      const RegionWithBbox = types.compose(TestRegion).views((self) => ({
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
      const RegionWithBbox = types.compose(TestRegion).views((self) => ({
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

    it.skip("supportsTransform is false when hidden", () => {
      const { region } = createStore();
      region.setHidden(true);
      expect(region.supportsTransform).toBe(false);
    });
  });

  describe("actions", () => {
    it("updateCursor does nothing when no stage", () => {
      const { region } = createStore();
      expect(() => region.updateCursor(true)).not.toThrow();
      expect(() => region.updateCursor(false)).not.toThrow();
    });

    it.skip("updateCursor sets pointer when hovered and not brushregion", () => {
      const style = {};
      const { region } = createStore({}, {}, { stageRef: { container: () => ({ style }) } });
      region.updateCursor(true);
      expect(style.cursor).toBe("pointer");
    });

    it.skip("updateCursor does not set pointer for brushregion when hovered", () => {
      const style = {};
      const { region } = createStore({}, {}, { stageRef: { container: () => ({ style }) } });
      region.setType("brushregion");
      region.updateCursor(true);
      expect(style.cursor).toBeUndefined();
    });

    it("updateCursor sets default when not hovered and no selected tool", () => {
      const style = {};
      const { root, region } = createStore({}, {}, { stageRef: { container: () => ({ style }) } });
      region.updateCursor(false);
      expect(style.cursor).toBe("default");
    });

    it("updateCursor calls selectedTool.updateCursor when not hovered and tool has it", () => {
      const style = {};
      const updateCursor = jest.fn();
      const { root, region } = createStore(
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

    it("deleteRegion enables selected tool and calls super deleteRegion", () => {
      const enable = jest.fn();
      const { root, region } = createStore(
        {},
        {},
        { getToolsManager: () => ({ findSelectedTool: () => ({ enable }) }) },
      );
      region.deleteRegion();
      expect(enable).toHaveBeenCalled();
    });
  });
});
