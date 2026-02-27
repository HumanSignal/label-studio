/**
 * Unit tests for Regions mixin (mixins/Regions.js)
 */
import { getEnv, getRoot, getParent, types } from "mobx-state-tree";

jest.mock("../../utils/feature-flags", () => ({
  isFF: () => false,
  FF_DEV_3391: "ff_3391",
  FF_SIMPLE_INIT: "ff_simple_init",
}));

const mockAnnotation = () => ({
  regionStore: {
    isSelected: jest.fn(() => false),
    unselectAll: jest.fn(),
    toggleRegionSelection: jest.fn(),
  },
  selectArea: jest.fn(),
  unselectAll: jest.fn(),
  toggleRegionSelection: jest.fn(),
  isDrawing: false,
  isLinkingMode: false,
  addLinkedRegion: jest.fn(),
  stopLinkingMode: jest.fn(),
  isSuggestionsAccepting: false,
  isReadOnly: jest.fn(() => false),
  areas: new Map(),
});

import RegionsMixin from "../Regions";

const Base = types
  .model("RegionsTestBase", {
    selected: types.optional(types.boolean, false),
  })
  .volatile(() => ({
    type: "TestRegion",
    labelName: "Label1",
    results: [{ from_name: { smartEnabled: false } }],
    supportSuggestions: false,
    states: null,
  }))
  .actions((self) => ({
    setType(t) {
      self.type = t;
    },
    setLabelName(l) {
      self.labelName = l;
    },
    setResults(r) {
      self.results = r;
    },
    setSupportSuggestions(s) {
      self.supportSuggestions = s;
    },
    setSelected(s) {
      self.selected = s;
    },
    setStates(s) {
      self.states = s;
    },
  }));

const TestRegion = types.compose(Base, RegionsMixin);

function createStore(annotationOverrides = {}, regionSnapshot = {}) {
  const annotation = { ...mockAnnotation(), ...annotationOverrides };
  annotation.areas = new Map();

  const store = types
    .model({
      region: types.maybe(TestRegion),
    })
    .volatile(() => ({
      annotationStore: { selected: annotation, selectedHistory: null },
    }))
    .actions((self) => ({
      setAnnotation(ann) {
        self.annotationStore = { selected: ann, selectedHistory: null };
      },
    }));

  const root = store.create({ region: regionSnapshot });
  const region = root.region;
  annotation.areas.set(region.id, true);
  return { root, region, annotation };
}

describe("Regions mixin", () => {
  describe("views", () => {
    it("perRegionStates returns states filtered by perregion", () => {
      const { region } = createStore();
      region.setStates([
        { perregion: true, name: "a" },
        { perregion: false, name: "b" },
        { perregion: true, name: "c" },
      ]);
      expect(region.perRegionStates).toHaveLength(2);
      expect(region.perRegionStates.map((s) => s.name)).toEqual(["a", "c"]);
    });

    it("perRegionStates returns null when states is null", () => {
      const { region } = createStore();
      region.setStates(null);
      expect(region.perRegionStates).toBeNull();
    });

    it("store returns root", () => {
      const { root, region } = createStore();
      expect(region.store).toBe(root);
    });

    it("parent returns parent node", () => {
      const { root, region } = createStore();
      expect(region.parent).toBe(root);
    });

    it("editable throws Not implemented", () => {
      const { region } = createStore();
      expect(() => region.editable).toThrow("Not implemented");
    });

    it("isCompleted is true when not drawing", () => {
      const { region } = createStore();
      expect(region.isCompleted).toBe(true);
      region.setDrawing(true);
      expect(region.isCompleted).toBe(false);
    });

    it("highlighted reflects _highlighted", () => {
      const { region } = createStore();
      expect(region.highlighted).toBe(false);
      region.setHighlight(true);
      expect(region.highlighted).toBe(true);
    });

    it("inSelection uses regionStore.isSelected", () => {
      const { region, annotation } = createStore();
      annotation.regionStore.isSelected.mockReturnValue(true);
      expect(region.inSelection).toBe(true);
      annotation.regionStore.isSelected.mockReturnValue(false);
      expect(region.inSelection).toBe(false);
    });

    it("isReady is true", () => {
      const { region } = createStore();
      expect(region.isReady).toBe(true);
    });

    it("currentImageEntity uses parent.findImageEntity", () => {
      const { root, region } = createStore();
      const entity = {};
      root.findImageEntity = jest.fn(() => entity);
      region.setItemIndex(0);
      expect(region.currentImageEntity).toBe(entity);
      expect(root.findImageEntity).toHaveBeenCalledWith(0);
    });

    it("getConnectedDynamicRegions filters by type, labelName, to_name", () => {
      const { region, annotation } = createStore();
      region.setResults([{ from_name: { smartEnabled: false }, to_name: "img" }]);
      const other = { type: "TestRegion", labelName: "Label1", results: [{ to_name: "img" }] };
      annotation.regions = [region, other];
      region.setSupportSuggestions(false);
      const result = region.getConnectedDynamicRegions(true);
      expect(result).toHaveLength(1);
      expect(result[0]).toBe(other);
    });

    it("getConnectedDynamicRegions excludes self when excludeSelf true", () => {
      const { region, annotation } = createStore();
      annotation.regions = [region];
      expect(region.getConnectedDynamicRegions(true)).toHaveLength(0);
      expect(region.getConnectedDynamicRegions(false)).toHaveLength(1);
    });

    it("isRealRegion is true when annotation.areas has region id", () => {
      const { region, annotation } = createStore();
      expect(region.isRealRegion).toBe(true);
      annotation.areas.delete(region.id);
      expect(region.isRealRegion).toBe(false);
    });

    it("shouldNotifyDrawingFinished is false when not real region", () => {
      const { region, annotation } = createStore();
      annotation.areas.clear();
      expect(region.shouldNotifyDrawingFinished).toBe(false);
    });

    it("shouldNotifyDrawingFinished is false when isSuggestionsAccepting", () => {
      const { region, annotation } = createStore();
      annotation.isSuggestionsAccepting = true;
      expect(region.shouldNotifyDrawingFinished).toBe(false);
    });
  });

  describe("actions", () => {
    it("setParentID sets parentID", () => {
      const { region } = createStore();
      region.setParentID("p1");
      expect(region.parentID).toBe("p1");
    });

    it("setDrawing sets isDrawing", () => {
      const { region } = createStore();
      region.setDrawing(true);
      expect(region.isDrawing).toBe(true);
    });

    it("setShapeRef sets shapeRef when ref is truthy", () => {
      const { region } = createStore();
      const ref = {};
      region.setShapeRef(ref);
      expect(region.shapeRef).toBe(ref);
      region.setShapeRef(null);
      expect(region.shapeRef).toBe(ref);
    });

    it("setItemIndex sets item_index", () => {
      const { region } = createStore();
      region.setItemIndex(1);
      expect(region.item_index).toBe(1);
    });

    it("setItemIndex throws when index undefined", () => {
      const { region } = createStore();
      expect(() => region.setItemIndex(undefined)).toThrow("Index must be provided for");
    });

    it("beforeDestroy calls beforeDestroyArea when isRealRegion", () => {
      const { region, annotation } = createStore();
      const spy = jest.spyOn(region, "beforeDestroyArea");
      region.beforeDestroy();
      expect(spy).toHaveBeenCalled();
    });

    it("beforeDestroy does not call beforeDestroyArea when not real region", () => {
      const { region, annotation } = createStore();
      annotation.areas.clear();
      const spy = jest.spyOn(region, "beforeDestroyArea");
      region.beforeDestroy();
      expect(spy).not.toHaveBeenCalled();
    });

    it("setLocked sets with value", () => {
      const { region } = createStore();
      region.setLocked(true);
      expect(region.locked).toBe(true);
    });

    it("setLocked accepts function", () => {
      const { region } = createStore();
      region.setLocked(true);
      region.setLocked((prev) => !prev);
      expect(region.locked).toBe(false);
    });

    it("makeDynamic sets dynamic true", () => {
      const { region } = createStore();
      region.makeDynamic();
      expect(region.dynamic).toBe(true);
    });

    it("setHighlight sets _highlighted", () => {
      const { region } = createStore();
      region.setHighlight(true);
      expect(region._highlighted).toBe(true);
    });

    it("toggleHighlight toggles _highlighted", () => {
      const { region } = createStore();
      region.toggleHighlight();
      expect(region._highlighted).toBe(true);
      region.toggleHighlight();
      expect(region._highlighted).toBe(false);
    });

    it("toggleFiltered toggles filtered and calls toggleHidden", () => {
      const { region } = createStore();
      const e = { stopPropagation: jest.fn() };
      region.toggleFiltered(e);
      expect(region.filtered).toBe(true);
      expect(region.hidden).toBe(true);
      expect(e.stopPropagation).toHaveBeenCalled();
    });

    it("toggleHidden toggles hidden and stops propagation", () => {
      const { region } = createStore();
      const e = { stopPropagation: jest.fn() };
      region.toggleHidden(e);
      expect(region.hidden).toBe(true);
      expect(e.stopPropagation).toHaveBeenCalled();
      region.toggleHidden(e, true);
      expect(region.filtered).toBe(false);
    });

    it("updateOriginOnEdit changes prediction to prediction-changed", () => {
      const { region } = createStore({}, { origin: "prediction" });
      region.updateOriginOnEdit();
      expect(region.origin).toBe("prediction-changed");
    });

    it("updateOriginOnEdit leaves manual unchanged", () => {
      const { region } = createStore();
      region.updateOriginOnEdit();
      expect(region.origin).toBe("manual");
    });

    it("requestPerRegionFocus sets perRegionFocusRequest", () => {
      const { region } = createStore();
      const before = Date.now();
      region.requestPerRegionFocus();
      expect(region.perRegionFocusRequest).toBeGreaterThanOrEqual(before);
    });

    it("cancelPerRegionFocus clears perRegionFocusRequest", () => {
      const { region } = createStore();
      region.requestPerRegionFocus();
      region.cancelPerRegionFocus();
      expect(region.perRegionFocusRequest).toBeNull();
    });

    it("onClickRegion does nothing when isDrawing", () => {
      const { region, annotation } = createStore();
      region.setDrawing(true);
      region.onClickRegion();
      expect(annotation.selectArea).not.toHaveBeenCalled();
    });

    it("onClickRegion calls _selectArea when not additive", () => {
      const { region, annotation } = createStore();
      region.setSelected(false);
      region.onClickRegion();
      expect(annotation.selectArea).toHaveBeenCalledWith(region);
    });

    it("onClickRegion toggles selection when ctrlKey", () => {
      const { region, annotation } = createStore();
      region.onClickRegion({ ctrlKey: true });
      expect(annotation.toggleRegionSelection).toHaveBeenCalledWith(region);
    });

    it("onClickRegion in linking mode adds linked region and stops linking", () => {
      const { region, annotation } = createStore();
      annotation.isLinkingMode = true;
      region.onClickRegion();
      expect(annotation.addLinkedRegion).toHaveBeenCalledWith(region);
      expect(annotation.stopLinkingMode).toHaveBeenCalled();
      expect(annotation.regionStore.unselectAll).toHaveBeenCalled();
    });
  });
});
