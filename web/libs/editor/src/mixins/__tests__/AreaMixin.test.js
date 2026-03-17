/**
 * Unit tests for AreaMixin (mixins/AreaMixin.js).
 * Covers AreaMixinBase views and actions used by all area/region types.
 */
import { destroy, getParent, isAlive, types } from "mobx-state-tree";
import { guidGenerator } from "../../core/Helpers";

jest.mock("../../utils/feature-flags", () => ({
  isFF: jest.fn(() => false),
  FF_LSDV_4930: "ff_lsdv_4930",
  FF_TAXONOMY_LABELING: "ff_taxonomy_labeling",
}));

jest.mock("../../regions/Result", () => require("./AreaMixinMockResult"));

import { AreaMixin, AreaMixinBase } from "../AreaMixin";
import { ReadOnlyRegionMixin } from "../ReadOnlyMixin";
import MockResult from "./AreaMixinMockResult";

const mockAnnotation = () => ({
  toNames: new Map(),
  deleteRegion: jest.fn(),
  deleteArea: jest.fn(),
  isReadOnly: jest.fn(() => false),
  highlightedNode: null,
  regionStore: { regionIndexMap: {} },
  updateAppearenceFromState: jest.fn(),
  unselectAll: jest.fn(),
});

const mockObject = (name = "img1") => ({
  name,
  supportSuggestions: false,
  selectionArea: null,
});

const BaseWithVolatiles = types
  .model("AreaMixinTestBase", {
    id: types.optional(types.identifier, guidGenerator),
    ouid: types.optional(types.number, () => 0),
    results: types.array(MockResult),
    parentID: types.maybeNull(types.string),
  })
  .volatile(() => ({
    type: "rectangleregion",
    bboxCoords: { x: 0, y: 0, width: 10, height: 10 },
    hidden: false,
    _highlighted: false,
    isRealRegion: true,
    destroyRegion: null,
    updateAppearenceFromState: null,
  }))
  .actions((self) => ({
    setHighlighted(v) {
      self._highlighted = v;
    },
    setRealRegion(v) {
      self.isRealRegion = v;
    },
    setDestroyRegion(fn) {
      self.destroyRegion = fn;
    },
    setHidden(v) {
      self.hidden = v;
    },
    setUpdateAppearenceFromState(fn) {
      self.updateAppearenceFromState = fn;
    },
  }))
  .views((self) => ({
    get annotation() {
      return getParent(self)?._annotation ?? null;
    },
    get object() {
      return getParent(self)?._object ?? null;
    },
  }));

const TestArea = types.compose(BaseWithVolatiles, AreaMixinBase, ReadOnlyRegionMixin);

const Root = types
  .model("AreaMixinTestRoot", {
    area: types.maybe(TestArea),
  })
  .volatile(() => ({
    _annotation: null,
    _object: null,
  }))
  .actions((self) => ({
    setAnnotation(ann) {
      self._annotation = ann;
    },
    setObject(obj) {
      self._object = obj;
    },
  }));

function createStore(areaSnapshot = {}) {
  const annotation = mockAnnotation();
  const object = mockObject();
  const root = Root.create({
    area: {
      id: "area1",
      results: [],
      ...areaSnapshot,
    },
  });
  root.setAnnotation(annotation);
  root.setObject(object);
  return { root, area: root.area, annotation, object };
}

describe("AreaMixin", () => {
  describe("cleanId", () => {
    it("strips # and suffix from id", () => {
      const { area } = createStore({ id: "area1#ann-123" });
      expect(area.cleanId).toBe("area1");
    });
  });

  describe("labelings", () => {
    it("returns results where from_name.isLabeling", () => {
      const { area } = createStore();
      area.addResult({
        from_name: { isLabeling: true },
        to_name: {},
        type: "rectanglelabels",
        value: { labels: ["A"] },
      });
      area.addResult({
        from_name: { isLabeling: false },
        to_name: {},
        type: "textarea",
        value: {},
      });
      expect(area.labelings).toHaveLength(1);
      expect(area.labelings[0].from_name.isLabeling).toBe(true);
    });
  });

  describe("labeling", () => {
    it("returns first labeling result with hasValue", () => {
      const { area } = createStore();
      area.addResult({
        from_name: { isLabeling: true },
        to_name: {},
        type: "rectanglelabels",
        value: { labels: ["L1"] },
      });
      expect(area.labeling).toBeDefined();
      expect(area.labeling.hasValue).toBe(true);
    });

    it("returns undefined when no labeling with value", () => {
      const { area } = createStore();
      area.addResult({
        from_name: { isLabeling: true },
        to_name: {},
        type: "rectanglelabels",
        value: {},
      });
      expect(area.labeling).toBeUndefined();
    });
  });

  describe("emptyLabel", () => {
    it("returns emptyLabel from result whose from_name has emptyLabel", () => {
      const { area } = createStore();
      const emptyLabelVal = { _value: "Empty" };
      area.addResult({
        from_name: { emptyLabel: emptyLabelVal },
        to_name: {},
        type: "rectanglelabels",
        value: {},
      });
      expect(area.emptyLabel).toBe(emptyLabelVal);
    });
  });

  describe("texting", () => {
    it("returns textarea result with hasValue when alive", () => {
      const { area } = createStore();
      area.addResult({
        from_name: {},
        to_name: {},
        type: "textarea",
        value: { textarea: ["hello"] },
      });
      expect(area.texting).toBeDefined();
      expect(area.texting.type).toBe("textarea");
    });

    it("returns false when no textarea with value", () => {
      const { area } = createStore();
      expect(area.texting).toBeFalsy();
    });
  });

  describe("tag", () => {
    it("returns labeling result's from_name", () => {
      const { area } = createStore();
      const tagRef = { isLabeling: true };
      area.addResult({
        from_name: tagRef,
        to_name: {},
        type: "rectanglelabels",
        value: { labels: ["L1"] },
      });
      expect(area.tag).toBe(tagRef);
    });
  });

  describe("hasLabel", () => {
    it("returns true when value is in mainValue", () => {
      const { area } = createStore();
      area.addResult({
        from_name: { isLabeling: true },
        to_name: {},
        type: "rectanglelabels",
        value: { labels: ["A", "B"] },
      });
      expect(area.hasLabel("A")).toBe(true);
      expect(area.hasLabel("B")).toBe(true);
    });

    it("returns false when value not in mainValue", () => {
      const { area } = createStore();
      area.addResult({
        from_name: { isLabeling: true },
        to_name: {},
        type: "rectanglelabels",
        value: { labels: ["A"] },
      });
      expect(area.hasLabel("B")).toBe(false);
    });

    it("returns false when labels or value missing", () => {
      const { area } = createStore();
      expect(area.hasLabel("x")).toBe(false);
      expect(area.hasLabel(null)).toBe(false);
    });

    it("handles comma-separated value (any match)", () => {
      const { area } = createStore();
      area.addResult({
        from_name: { isLabeling: true },
        to_name: {},
        type: "rectanglelabels",
        value: { labels: ["A", "B"] },
      });
      expect(area.hasLabel("B,A")).toBe(true);
      expect(area.hasLabel("C,A")).toBe(true);
    });
  });

  describe("perRegionTags", () => {
    it("returns tags for object name filtered by perregion", () => {
      const { root, area, annotation } = createStore();
      const perRegionTag = { perregion: true };
      const notPerRegion = { perregion: false };
      annotation.toNames.set("img1", [perRegionTag, notPerRegion]);
      expect(area.perRegionTags).toEqual([perRegionTag]);
    });

    it("returns empty array when toNames has no entry for object name", () => {
      const { area } = createStore();
      expect(area.perRegionTags).toEqual([]);
    });
  });

  describe("labelingTags", () => {
    it("returns empty array when FF_TAXONOMY_LABELING is off (mocked)", () => {
      const { area } = createStore();
      expect(area.labelingTags).toEqual([]);
    });

    it("returns tags with classification and isLabeling when FF_TAXONOMY_LABELING is on", () => {
      const isFF = require("../../utils/feature-flags").isFF;
      isFF.mockImplementation((flag) => flag === "ff_taxonomy_labeling");
      const { area, annotation } = createStore();
      const taxonomyTag = { classification: true, isLabeling: true };
      annotation.toNames.set("img1", [taxonomyTag]);
      expect(area.labelingTags).toEqual([taxonomyTag]);
      isFF.mockReturnValue(false);
    });
  });

  describe("perRegionDescControls", () => {
    it("filters perRegionTags by displaymode REGION_LIST", () => {
      const { PER_REGION_MODES } = require("../PerRegion");
      const { root, area, annotation } = createStore();
      const listTag = { perregion: true, displaymode: PER_REGION_MODES.REGION_LIST };
      const tagTag = { perregion: true, displaymode: PER_REGION_MODES.TAG };
      annotation.toNames.set("img1", [listTag, tagTag]);
      expect(area.perRegionDescControls).toEqual([listTag]);
    });
  });

  describe("perRegionFocusTarget", () => {
    it("returns first visible focusable per-region tag", () => {
      const { root, area, annotation } = createStore();
      const focusable = { perregion: true, isVisible: true, focusable: true };
      const notFocusable = { perregion: true, isVisible: true, focusable: false };
      annotation.toNames.set("img1", [notFocusable, focusable]);
      expect(area.perRegionFocusTarget).toBe(focusable);
    });

    it("skips tag with isVisible false", () => {
      const { root, area, annotation } = createStore();
      const hidden = { perregion: true, isVisible: false, focusable: true };
      annotation.toNames.set("img1", [hidden]);
      expect(area.perRegionFocusTarget).toBeUndefined();
    });
  });

  describe("labelName", () => {
    it("returns first mainValue or emptyLabel _value", () => {
      const { area } = createStore();
      area.addResult({
        from_name: { isLabeling: true },
        to_name: {},
        type: "rectanglelabels",
        value: { labels: ["First"] },
      });
      expect(area.labelName).toBe("First");
    });

    it("returns emptyLabel._value when no labeling value", () => {
      const { area } = createStore();
      const emptyLabelVal = { _value: "Empty" };
      area.addResult({
        from_name: { isLabeling: false, emptyLabel: emptyLabelVal },
        to_name: {},
        type: "rectanglelabels",
        value: {},
      });
      area.addResult({
        from_name: { isLabeling: true },
        to_name: {},
        type: "rectanglelabels",
        value: {},
      });
      expect(area.labelName).toBe("Empty");
    });
  });

  describe("labels", () => {
    it("returns array from labeling mainValue", () => {
      const { area } = createStore();
      area.addResult({
        from_name: { isLabeling: true },
        to_name: {},
        type: "rectanglelabels",
        value: { labels: ["A", "B"] },
      });
      expect(area.labels).toEqual(["A", "B"]);
    });

    it("returns empty array when no labeling", () => {
      const { area } = createStore();
      expect(area.labels).toEqual([]);
    });
  });

  describe("getLabelText", () => {
    it("joins index, label names, and text with joinstr", () => {
      const { area, annotation } = createStore();
      annotation.regionStore.regionIndexMap[area.id] = 2;
      area.addResult({
        from_name: { isLabeling: true },
        to_name: {},
        type: "rectanglelabels",
        value: { labels: ["L1"] },
      });
      area.addResult({
        from_name: {},
        to_name: {},
        type: "textarea",
        value: { textarea: ["note"] },
      });
      expect(area.getLabelText(" | ")).toBe("2: L1: note");
    });

    it("omits index when region_index null", () => {
      const { area } = createStore();
      area.addResult({
        from_name: { isLabeling: true },
        to_name: {},
        type: "rectanglelabels",
        value: { labels: ["L1"] },
      });
      expect(area.getLabelText(" ")).toBe("L1");
    });
  });

  describe("parent", () => {
    it("returns object when alive", () => {
      const { area, object } = createStore();
      expect(area.parent).toBe(object);
    });
  });

  describe("style", () => {
    it("returns result style when present", () => {
      const { area } = createStore();
      const style = { fillcolor: "#ff0000" };
      area.addResult({
        from_name: {},
        to_name: {},
        type: "rectanglelabels",
        value: {},
        style,
      });
      expect(area.style).toBe(style);
    });

    it("returns emptyStyle when no style but emptyStyle present", () => {
      const { area } = createStore();
      const emptyStyle = { fillcolor: "#ccc" };
      area.addResult({
        from_name: {},
        to_name: {},
        type: "rectanglelabels",
        value: {},
        emptyStyle,
      });
      expect(area.style).toBe(emptyStyle);
    });

    it("returns controlStyle when result type matches region type prefix", () => {
      const { area } = createStore();
      const controlStyle = { fillcolor: "#00f" };
      area.addResult({
        from_name: {},
        to_name: {},
        type: "rectangleregion",
        value: {},
        controlStyle,
      });
      expect(area.style).toBe(controlStyle);
    });
  });

  describe("selected", () => {
    it("returns true when annotation.highlightedNode is self", () => {
      const { area, annotation } = createStore();
      annotation.highlightedNode = area;
      expect(area.selected).toBe(true);
    });

    it("returns false otherwise", () => {
      const { area } = createStore();
      expect(area.selected).toBe(false);
    });
  });

  describe("getOneColor", () => {
    it("returns style.fillcolor when style present", () => {
      const { area } = createStore();
      const style = { fillcolor: "#ff0000" };
      area.addResult({
        from_name: {},
        to_name: {},
        type: "rectanglelabels",
        value: {},
        style,
      });
      expect(typeof area.getOneColor === "function" ? area.getOneColor() : area.getOneColor).toBe("#ff0000");
    });

    it("returns defaultStyle.fillcolor when no style", () => {
      const { defaultStyle } = require("../../core/Constants");
      const { area } = createStore();
      const color = typeof area.getOneColor === "function" ? area.getOneColor() : area.getOneColor;
      expect(color).toBe(defaultStyle.fillcolor);
    });
  });

  describe("highlighted", () => {
    it("returns _highlighted when parent has no selectionArea", () => {
      const { area } = createStore();
      area.setHighlighted(true);
      expect(area.highlighted).toBe(true);
    });

    it("returns isInSelectionArea when parent.selectionArea.isActive", () => {
      const { area, object } = createStore();
      object.selectionArea = { isActive: true, intersectsBbox: jest.fn(() => true) };
      expect(area.highlighted).toBe(true);
    });
  });

  describe("isInSelectionArea", () => {
    it("returns parent.selectionArea.intersectsBbox(bboxCoords) when active", () => {
      const { area, object } = createStore();
      const intersectsBbox = jest.fn(() => true);
      object.selectionArea = { isActive: true, intersectsBbox };
      expect(area.isInSelectionArea).toBe(true);
      expect(intersectsBbox).toHaveBeenCalledWith(area.bboxCoords);
    });

    it("returns false when selectionArea not active", () => {
      const { area, object } = createStore();
      object.selectionArea = { isActive: false };
      expect(area.isInSelectionArea).toBe(false);
    });

    it("returns false when FF_LSDV_4930 on and hidden (without calling intersectsBbox)", () => {
      const isFF = require("../../utils/feature-flags").isFF;
      isFF.mockImplementation((flag) => flag === "ff_lsdv_4930");
      const { area, object } = createStore();
      object.selectionArea = { isActive: true, intersectsBbox: jest.fn(() => true) };
      area.setHighlighted(false);
      area.setHidden(true);
      expect(area.isInSelectionArea).toBe(false);
      expect(object.selectionArea.intersectsBbox).not.toHaveBeenCalled();
      isFF.mockReturnValue(false);
    });
  });

  describe("supportSuggestions", () => {
    it("returns object.supportSuggestions", () => {
      const { root, object } = createStore();
      object.supportSuggestions = true;
      expect(root.area.supportSuggestions).toBe(true);
    });
  });

  describe("region_index", () => {
    it("returns null when not isRealRegion", () => {
      const { area } = createStore();
      area.setRealRegion(false);
      expect(area.region_index).toBeNull();
    });

    it("returns annotation.regionStore.regionIndexMap[id] when isRealRegion", () => {
      const { root, area, annotation } = createStore();
      annotation.regionStore.regionIndexMap[area.id] = 3;
      expect(area.region_index).toBe(3);
    });
  });

  describe("beforeDestroy", () => {
    it("destroys all results and calls annotation.updateAppearenceFromState", () => {
      const { area, annotation } = createStore();
      area.addResult({
        from_name: {},
        to_name: {},
        type: "rectanglelabels",
        value: {},
      });
      const r = area.results[0];
      expect(isAlive(r)).toBe(true);
      area.beforeDestroy();
      expect(annotation.updateAppearenceFromState).toHaveBeenCalled();
      expect(isAlive(r)).toBe(false);
    });
  });

  describe("setSelected", () => {
    it("throws when assigning to computed selected (selected is a view)", () => {
      const { area } = createStore();
      expect(() => area.setSelected(true)).toThrow();
    });
  });

  describe("deleteRegion", () => {
    it("does nothing when annotation is read-only", () => {
      const { area, annotation } = createStore();
      annotation.isReadOnly = jest.fn(() => true);
      area.deleteRegion();
      expect(annotation.deleteRegion).not.toHaveBeenCalled();
    });

    it("does nothing when area is read-only", () => {
      const { area, annotation } = createStore({ readonly: true });
      annotation.isReadOnly = jest.fn(() => false);
      area.deleteRegion();
      expect(annotation.deleteRegion).not.toHaveBeenCalled();
    });

    it("calls unselectAll when selected then deleteRegion", () => {
      const { area, annotation } = createStore();
      annotation.highlightedNode = area;
      area.deleteRegion();
      expect(annotation.unselectAll).toHaveBeenCalledWith(true);
      expect(annotation.deleteRegion).toHaveBeenCalledWith(area);
    });

    it("calls destroyRegion when present then deleteRegion", () => {
      const { area, annotation } = createStore();
      const destroyRegion = jest.fn();
      area.setDestroyRegion(destroyRegion);
      area.deleteRegion();
      expect(destroyRegion).toHaveBeenCalled();
      expect(annotation.deleteRegion).toHaveBeenCalledWith(area);
    });
  });

  describe("addResult", () => {
    it("pushes result to results", () => {
      const { area } = createStore();
      const snapshot = {
        from_name: {},
        to_name: {},
        type: "rectanglelabels",
        value: {},
      };
      area.addResult(snapshot);
      expect(area.results).toHaveLength(1);
      expect(area.results[0].type).toBe("rectanglelabels");
    });
  });

  describe("applyAdditionalDataFromResult", () => {
    it("is no-op (override point for subclasses)", () => {
      const { area } = createStore();
      expect(() => area.applyAdditionalDataFromResult({})).not.toThrow();
    });
  });

  describe("removeResult", () => {
    it("removes and destroys result, calls deleteArea when no results left", () => {
      const { area, annotation } = createStore();
      area.addResult({
        from_name: {},
        to_name: {},
        type: "rectanglelabels",
        value: {},
      });
      const r = area.results[0];
      area.removeResult(r);
      expect(area.results).toHaveLength(0);
      expect(isAlive(r)).toBe(false);
      expect(annotation.deleteArea).toHaveBeenCalledWith(area);
    });

    it("does nothing when result not in array", () => {
      const { area, annotation } = createStore();
      area.addResult({
        from_name: {},
        to_name: {},
        type: "rectanglelabels",
        value: {},
      });
      annotation.deleteArea.mockClear();
      const notInTree = MockResult.create({
        from_name: {},
        to_name: {},
        type: "rectanglelabels",
        value: {},
      });
      area.removeResult(notInTree);
      expect(annotation.deleteArea).not.toHaveBeenCalled();
    });
  });

  describe("setValue", () => {
    it("updates existing result when tag holdsState", () => {
      const { area } = createStore();
      const tag = {
        holdsState: true,
        resultType: "rectanglelabels",
        valueType: "labels",
        selectedValues: () => ["L1"],
      };
      area.addResult({
        from_name: tag,
        to_name: {},
        type: "rectanglelabels",
        value: { labels: [] },
      });
      const r = area.results[0];
      r.setValue = jest.fn();
      area.setValue(tag);
      expect(r.setValue).toHaveBeenCalledWith(["L1"]);
    });

    it("removes result when tag does not holdState", () => {
      const { area } = createStore();
      const tag = {
        holdsState: false,
        resultType: "rectanglelabels",
        valueType: "labels",
        selectedValues: () => [],
      };
      area.addResult({
        from_name: tag,
        to_name: {},
        type: "rectanglelabels",
        value: {},
      });
      area.setValue(tag);
      expect(area.results).toHaveLength(0);
    });

    it("pushes new result when no result for tag", () => {
      const { area, object } = createStore();
      const tag = {
        holdsState: true,
        resultType: "rectanglelabels",
        valueType: "labels",
        selectedValues: () => ["L1"],
      };
      area.setValue(tag);
      expect(area.results).toHaveLength(1);
      expect(area.results[0].from_name).toBe(tag);
      expect(area.results[0].to_name).toBe(object);
      expect(area.results[0].type).toBe("rectanglelabels");
      expect(area.results[0].value).toEqual({ labels: ["L1"] });
    });

    it("calls updateAppearenceFromState after setValue when set", () => {
      const { area } = createStore();
      const updateAppearenceFromState = jest.fn();
      area.setUpdateAppearenceFromState(updateAppearenceFromState);
      const tag = {
        holdsState: true,
        resultType: "rectanglelabels",
        valueType: "labels",
        selectedValues: () => ["L1"],
      };
      area.setValue(tag);
      expect(updateAppearenceFromState).toHaveBeenCalled();
    });
  });
});
