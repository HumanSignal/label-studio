/**
 * Unit tests for Result (regions/Result.js).
 * Covers views (store, area, mainValue, hasValue, isReadOnly, getSelectedString,
 * selectedLabels, mergeMainValue, canBeSubmitted, tag, style, emptyStyle, controlStyle,
 * getRegionElement, perRegionStates) and actions (setValue, afterCreate, setMetaValue,
 * serialize, setHighlight, toggleHighlight, toggleHidden).
 */
import { types } from "mobx-state-tree";

const mockIsFF = jest.fn(() => false);
jest.mock("../../utils/feature-flags", () => ({
  isFF: (...args) => mockIsFF(...args),
  FF_LSDV_4583: "ff_lsdv_4583",
}));

jest.mock("@humansignal/core", () => ({
  ff: {
    isActive: () => false,
  },
}));

jest.mock("../../core/Registry", () => {
  const { types: t } = require("mobx-state-tree");
  const MinimalControl = t
    .model("MinimalControl", {
      id: t.identifier,
      name: t.optional(t.string, "labels"),
      valueType: t.optional(t.string, "labels"),
      allowempty: t.optional(t.boolean, false),
      perregion: t.optional(t.boolean, false),
      visiblewhen: t.optional(t.string, ""),
      whenlabelvalue: t.optional(t.string, ""),
      whenchoicevalue: t.optional(t.string, ""),
      whentagname: t.optional(t.string, ""),
      mergeLabelsAndResults: t.optional(t.boolean, false),
      fillcolor: t.maybeNull(t.string),
      strokecolor: t.maybeNull(t.string),
      strokewidth: t.maybeNull(t.number),
      fillopacity: t.maybeNull(t.number),
      opacity: t.maybeNull(t.number),
      emptyLabel: t.optional(t.frozen(), () => null),
    })
    .views((self) => ({
      get findLabel() {
        return (val) => (val === null ? { background: "#ccc", parent: self } : { background: "#f00", parent: self });
      },
      selectedChoicesMatch() {
        return () => false;
      },
      get isVisible() {
        return true;
      },
      getRegionElement() {
        return undefined;
      },
    }));

  const MinimalObject = t.model("MinimalObject", {
    id: t.identifier,
    mergeLabelsAndResults: t.optional(t.boolean, false),
  });

  return {
    __esModule: true,
    default: {
      modelsArr: () => [MinimalControl],
      objectTypes: () => [MinimalObject],
      customTags: [],
    },
  };
});

import Result from "../Result";
import Registry from "../../core/Registry";

const MinimalControl = Registry.modelsArr()[0];
const MinimalObject = Registry.objectTypes()[0];

const MinimalArea = types
  .model("MinimalArea", {
    id: types.identifier,
    results: types.array(Result),
    parentID: types.maybeNull(types.string),
    item_index: types.optional(types.maybeNull(types.number), null),
  })
  .views((self) => ({
    get cleanId() {
      return self.id.replace(/#.*/, "");
    },
    get meta() {
      return {};
    },
    get labels() {
      return [];
    },
    get origin() {
      return "manual";
    },
    hasLabel() {
      return false;
    },
  }))
  .actions((self) => ({
    isReadOnly() {
      return false;
    },
    serialize() {
      return { value: {} };
    },
  }));

const MinimalAnnotation = types
  .model("MinimalAnnotation", {
    areas: types.array(MinimalArea),
  })
  .views((self) => ({
    get results() {
      return self.areas.flatMap((a) => a.results);
    },
  }));

const AnnotationStore = types.model("AnnotationStore", {
  selected: types.maybeNull(MinimalAnnotation),
});

const Root = types.model("Root", {
  control: MinimalControl,
  object: MinimalObject,
  annotationStore: types.optional(AnnotationStore, { selected: null }),
});

function createTree(resultSnapshot = {}, controlSnapshot = {}, areaSnapshot = {}, objectSnapshot = {}) {
  const defaultResult = {
    from_name: "c1",
    to_name: "o1",
    type: "rectanglelabels",
    value: { labels: ["L1"] },
    meta: {},
    ...resultSnapshot,
  };
  const area = {
    id: "a1",
    results: [defaultResult],
    parentID: null,
    ...areaSnapshot,
  };
  const annotation = {
    areas: [area],
  };
  return Root.create({
    control: { id: "c1", ...controlSnapshot },
    object: { id: "o1", ...objectSnapshot },
    annotationStore: { selected: annotation },
  });
}

function createTreeWithControl(controlSnapshot) {
  return createTree({}, controlSnapshot);
}

describe("Result", () => {
  describe("views", () => {
    it("store returns getRoot(self)", () => {
      const root = createTree();
      const result = root.annotationStore.selected.areas[0].results[0];
      expect(result.store).toBe(root);
    });

    it("area returns getParent(self, 2)", () => {
      const root = createTree();
      const result = root.annotationStore.selected.areas[0].results[0];
      expect(result.area).toBe(root.annotationStore.selected.areas[0]);
    });

    it("mainValue returns value[from_name.valueType]", () => {
      const root = createTree({ value: { labels: ["A", "B"] } });
      const result = root.annotationStore.selected.areas[0].results[0];
      expect(result.mainValue).toEqual(["A", "B"]);
    });

    it("hasValue returns true when mainValue is non-empty array", () => {
      const root = createTree({ value: { labels: ["L1"] } });
      const result = root.annotationStore.selected.areas[0].results[0];
      expect(result.hasValue).toBe(true);
    });

    it("hasValue returns false when mainValue is undefined", () => {
      const root = createTree({ value: {} });
      const result = root.annotationStore.selected.areas[0].results[0];
      expect(result.hasValue).toBe(false);
    });

    it("hasValue returns false when mainValue is empty array", () => {
      const root = createTree({ value: { labels: [] } });
      const result = root.annotationStore.selected.areas[0].results[0];
      expect(result.hasValue).toBe(false);
    });

    it("isReadOnly returns true when readonly is true", () => {
      const root = createTree({ readonly: true });
      const result = root.annotationStore.selected.areas[0].results[0];
      expect(result.isReadOnly()).toBe(true);
    });

    it("isReadOnly delegates to area when readonly is false", () => {
      const root = createTree();
      const result = root.annotationStore.selected.areas[0].results[0];
      expect(result.isReadOnly()).toBe(false);
    });

    it("isSelfReadOnly returns readonly flag", () => {
      const root = createTree({ readonly: true });
      const result = root.annotationStore.selected.areas[0].results[0];
      expect(result.isSelfReadOnly()).toBe(true);
    });

    it("getSelectedString joins mainValue with separator", () => {
      const root = createTree({ value: { labels: ["A", "B"] } });
      const result = root.annotationStore.selected.areas[0].results[0];
      expect(result.getSelectedString(" ")).toBe("A B");
      expect(result.getSelectedString(",")).toBe("A,B");
    });

    it("getSelectedString returns empty string when mainValue empty", () => {
      const root = createTree({ value: { labels: [] } });
      const result = root.annotationStore.selected.areas[0].results[0];
      expect(result.getSelectedString()).toBe("");
    });

    it("editable getter throws Not implemented", () => {
      const root = createTree();
      const result = root.annotationStore.selected.areas[0].results[0];
      expect(() => result.editable).toThrow("Not implemented");
    });

    it("afterCreate sets pid to id", () => {
      const root = createTree();
      const result = root.annotationStore.selected.areas[0].results[0];
      expect(result.pid).toBe(result.id);
    });

    it("perRegionStates returns filter of states when states exists", () => {
      const root = createTree();
      const result = root.annotationStore.selected.areas[0].results[0];
      expect(result.perRegionStates).toBeUndefined();
    });
  });

  describe("mergeMainValue", () => {
    it("returns intersection for labels type", () => {
      const root = createTree({ value: { labels: ["A", "B", "C"] } });
      const result = root.annotationStore.selected.areas[0].results[0];
      expect(result.mergeMainValue(["A", "C"])).toEqual(["A", "C"]);
      expect(result.mergeMainValue(["X"])).toEqual([]);
    });

    it("returns null when mainValue and value types differ", () => {
      const root = createTree({ value: { labels: ["A"] } });
      const result = root.annotationStore.selected.areas[0].results[0];
      expect(result.mergeMainValue(123)).toBeNull();
    });

    it("calls value.toJSON() when value has toJSON in mergeMainValue", () => {
      const root = createTree({ value: { labels: ["A", "B"] } });
      const result = root.annotationStore.selected.areas[0].results[0];
      const valueWithToJSON = { toJSON: () => ["A", "B"] };
      expect(result.mergeMainValue(valueWithToJSON)).toEqual(["A", "B"]);
    });
  });

  describe("selectedLabels", () => {
    it("maps mainValue through from_name.findLabel", () => {
      const root = createTree({ value: { labels: ["L1"] } });
      const result = root.annotationStore.selected.areas[0].results[0];
      const labels = result.selectedLabels;
      expect(labels).toHaveLength(1);
      expect(labels[0].background).toBeDefined();
    });

    it("returns empty array when mainValue empty and no allowempty", () => {
      const root = createTree({ value: { labels: [] } });
      const result = root.annotationStore.selected.areas[0].results[0];
      expect(result.selectedLabels).toEqual([]);
    });

    it("returns findLabel(null) when allowempty and mainValue length 0", () => {
      const root = createTreeWithControl({ allowempty: true });
      const result = root.annotationStore.selected.areas[0].results[0];
      result.setValue([]);
      const labels = result.selectedLabels;
      expect(labels).toBeDefined();
      const arr = Array.isArray(labels) ? labels : [labels];
      expect(arr).toHaveLength(1);
      expect(arr[0].background).toBe("#ccc");
    });
  });

  describe("canBeSubmitted", () => {
    it("returns true when control has no perregion/visiblewhen", () => {
      const root = createTree();
      const result = root.annotationStore.selected.areas[0].results[0];
      expect(result.canBeSubmitted).toBe(true);
    });

    it("returns true when perregion and whenlabelvalue unset", () => {
      const root = createTreeWithControl({ perregion: true });
      const result = root.annotationStore.selected.areas[0].results[0];
      expect(result.canBeSubmitted).toBe(true);
    });

    it("returns false when perregion and whenlabelvalue set and area.hasLabel returns false", () => {
      const root = createTreeWithControl({ perregion: true, whenlabelvalue: "NeedThis" });
      const result = root.annotationStore.selected.areas[0].results[0];
      expect(result.canBeSubmitted).toBe(false);
    });

    it("returns !isChoiceSelected() when visiblewhen is choice-unselected", () => {
      const root = createTreeWithControl({ visiblewhen: "choice-unselected" });
      const result = root.annotationStore.selected.areas[0].results[0];
      expect(result.canBeSubmitted).toBe(true);
    });
  });

  describe("tag", () => {
    it("returns null when mainValue empty", () => {
      const root = createTree({ value: { labels: [] } });
      const result = root.annotationStore.selected.areas[0].results[0];
      expect(result.tag).toBeNull();
    });

    it("returns findLabel(value[0]) when mainValue has items", () => {
      const root = createTree({ value: { labels: ["L1"] } });
      const result = root.annotationStore.selected.areas[0].results[0];
      expect(result.tag).not.toBeNull();
      expect(result.tag.background).toBeDefined();
    });
  });

  describe("style and emptyStyle", () => {
    it("style returns null when no tag", () => {
      const root = createTree({ value: { labels: [] } });
      const result = root.annotationStore.selected.areas[0].results[0];
      expect(result.style).toBeNull();
    });

    it("controlStyle returns from_name style props when from_name exists", () => {
      const root = createTree();
      const result = root.annotationStore.selected.areas[0].results[0];
      expect(result.controlStyle).toEqual({
        strokecolor: null,
        strokewidth: null,
        fillcolor: null,
        fillopacity: null,
        opacity: null,
      });
    });

    it("style returns object when tag has background and parent has strokewidth/fillopacity/opacity", () => {
      const root = createTreeWithControl({
        strokewidth: 2,
        fillopacity: 0.8,
        opacity: 1,
        fillcolor: "#f00",
        strokecolor: "#00f",
      });
      const result = root.annotationStore.selected.areas[0].results[0];
      expect(result.style).toEqual({
        strokecolor: "#f00",
        strokewidth: 2,
        fillcolor: "#f00",
        fillopacity: 0.8,
        opacity: 1,
      });
    });

    it("emptyStyle returns object when from_name.emptyLabel has background and parent", () => {
      const root = createTreeWithControl({
        emptyLabel: {
          background: "#eee",
          parent: { strokewidth: 1, fillopacity: 0.5, opacity: 1, strokecolor: "#000", fillcolor: "#ccc" },
        },
      });
      const result = root.annotationStore.selected.areas[0].results[0];
      expect(result.emptyStyle).toEqual({
        strokecolor: "#eee",
        strokewidth: 1,
        fillcolor: "#eee",
        fillopacity: 0.5,
        opacity: 1,
      });
    });

    it("getRegionElement returns from_name.getRegionElement()", () => {
      const root = createTree();
      const result = root.annotationStore.selected.areas[0].results[0];
      expect(result.getRegionElement()).toBeUndefined();
    });
  });

  describe("actions", () => {
    it("setValue updates value[from_name.valueType]", () => {
      const root = createTree({ value: { labels: ["L1"] } });
      const result = root.annotationStore.selected.areas[0].results[0];
      result.setValue(["L2"]);
      expect(result.mainValue).toEqual(["L2"]);
    });

    it("setMetaValue merges key into meta", () => {
      const root = createTree({ meta: { a: 1 } });
      const result = root.annotationStore.selected.areas[0].results[0];
      result.setMetaValue("b", 2);
      expect(result.meta).toEqual({ a: 1, b: 2 });
    });

    it("setHighlight and toggleHighlight update _highlighted", () => {
      const root = createTree();
      const result = root.annotationStore.selected.areas[0].results[0];
      result.setHighlight(true);
      expect(result._highlighted).toBe(true);
      result.toggleHighlight();
      expect(result._highlighted).toBe(false);
    });

    it("toggleHidden flips hidden", () => {
      const root = createTree();
      const result = root.annotationStore.selected.areas[0].results[0];
      expect(result.hidden).toBeUndefined();
      result.toggleHidden();
      expect(result.hidden).toBe(true);
      result.toggleHidden();
      expect(result.hidden).toBe(false);
    });

    it("setParentID updates parentID", () => {
      const root = createTree();
      const result = root.annotationStore.selected.areas[0].results[0];
      result.setParentID("pid-1");
      expect(result.parentID).toBe("pid-1");
    });
  });

  describe("serialize", () => {
    it("returns serialized data when canBeSubmitted is true and area serializes", () => {
      const root = createTree();
      const result = root.annotationStore.selected.areas[0].results[0];
      const data = result.serialize();
      expect(data).not.toBeNull();
      expect(data.id).toBe("a1");
      expect(data.from_name).toBe("c1");
      expect(data.to_name).toBe("o1");
      expect(data.type).toBe("rectanglelabels");
      expect(data.value).toEqual({ labels: ["L1"] });
    });

    it("returns null when canBeSubmitted is false", () => {
      const root = createTreeWithControl({ perregion: true, whenlabelvalue: "NeedThis" });
      const result = root.annotationStore.selected.areas[0].results[0];
      expect(result.canBeSubmitted).toBe(false);
      expect(result.serialize()).toBeNull();
    });

    it("returns null when area.serialize returns null", () => {
      const AreaNullSerialize = types
        .model("AreaNullSerialize", {
          id: types.identifier,
          results: types.array(Result),
          parentID: types.maybeNull(types.string),
        })
        .views((self) => ({
          get cleanId() {
            return self.id.replace(/#.*/, "");
          },
          get meta() {
            return {};
          },
          get labels() {
            return [];
          },
          get origin() {
            return "manual";
          },
          hasLabel() {
            return false;
          },
        }))
        .actions(() => ({
          isReadOnly() {
            return false;
          },
          serialize() {
            return null;
          },
        }));
      const RootNullArea = types.model("RootNullArea", {
        control: MinimalControl,
        object: MinimalObject,
        annotationStore: types.optional(
          types.model({ selected: types.maybeNull(types.model("AnnNull", { areas: types.array(AreaNullSerialize) })) }),
          { selected: null },
        ),
      });
      const root = RootNullArea.create({
        control: { id: "c1" },
        object: { id: "o1" },
        annotationStore: {
          selected: {
            areas: [
              {
                id: "a1",
                results: [
                  { from_name: "c1", to_name: "o1", type: "rectanglelabels", value: { labels: ["L1"] }, meta: {} },
                ],
                parentID: null,
              },
            ],
          },
        },
      });
      const result = root.annotationStore.selected.areas[0].results[0];
      expect(result.serialize()).toBeNull();
    });

    it("includes score when set", () => {
      const root = createTree({ score: 0.9 });
      const result = root.annotationStore.selected.areas[0].results[0];
      const data = result.serialize();
      expect(data.score).toBe(0.9);
    });

    it("includes readonly when isSelfReadOnly", () => {
      const root = createTree({ readonly: true });
      const result = root.annotationStore.selected.areas[0].results[0];
      const data = result.serialize();
      expect(data.readonly).toBe(true);
    });

    it("strips # from area.cleanId for id in serialized data", () => {
      const areaSnapshot = {
        id: "a1#ann-123",
        results: [
          {
            from_name: "c1",
            to_name: "o1",
            type: "rectanglelabels",
            value: { labels: ["L1"] },
            meta: {},
          },
        ],
        parentID: null,
      };
      const annotation = { areas: [areaSnapshot] };
      const root = Root.create({
        control: { id: "c1" },
        object: { id: "o1" },
        annotationStore: { selected: annotation },
      });
      const result = root.annotationStore.selected.areas[0].results[0];
      const data = result.serialize();
      expect(data.id).toBe("a1");
    });

    it("merges area.meta into data.meta", () => {
      const MinimalAreaWithMeta = types
        .model("MinimalAreaWithMeta", {
          id: types.identifier,
          results: types.array(Result),
          parentID: types.maybeNull(types.string),
          meta: types.optional(types.frozen(), () => ({ areaMeta: 1 })),
        })
        .views((self) => ({
          get cleanId() {
            return self.id.replace(/#.*/, "");
          },
          get labels() {
            return [];
          },
          get origin() {
            return "manual";
          },
        }))
        .actions((self) => ({
          isReadOnly() {
            return false;
          },
          serialize() {
            return { value: {} };
          },
        }));

      const AnnWithMeta = types.model("AnnWithMeta", {
        areas: types.array(MinimalAreaWithMeta),
      });
      const RootWithMeta = types.model("RootWithMeta", {
        control: MinimalControl,
        object: MinimalObject,
        annotationStore: types.optional(types.model({ selected: types.maybeNull(AnnWithMeta) }), { selected: null }),
      });

      const root = RootWithMeta.create({
        control: { id: "c1" },
        object: { id: "o1" },
        annotationStore: {
          selected: {
            areas: [
              {
                id: "a1",
                results: [
                  {
                    from_name: "c1",
                    to_name: "o1",
                    type: "rectanglelabels",
                    value: { labels: ["L1"] },
                    meta: { lead_time: 1 },
                  },
                ],
                meta: { areaMeta: 1 },
              },
            ],
          },
        },
      });
      const result = root.annotationStore.selected.areas[0].results[0];
      const data = result.serialize();
      expect(data.meta).toEqual(expect.objectContaining({ lead_time: 1, areaMeta: 1 }));
    });

    it("returns null when to_name.mergeLabelsAndResults and type is labels", () => {
      const root = createTree({ type: "labels", value: { labels: ["L1"] } }, {}, {}, { mergeLabelsAndResults: true });
      const result = root.annotationStore.selected.areas[0].results[0];
      expect(result.serialize()).toBeNull();
    });

    it("adds area.labels to data.value when to_name.mergeLabelsAndResults and type not labels and area has labels", () => {
      const AreaWithLabels = types
        .model("AreaWithLabels", {
          id: types.identifier,
          results: types.array(Result),
          parentID: types.maybeNull(types.string),
          labels: types.optional(types.array(types.string), []),
        })
        .views((self) => ({
          get cleanId() {
            return self.id.replace(/#.*/, "");
          },
          get meta() {
            return {};
          },
          get origin() {
            return "manual";
          },
          hasLabel() {
            return false;
          },
        }))
        .actions(() => ({
          isReadOnly() {
            return false;
          },
          serialize() {
            return { value: {} };
          },
        }));
      const RootMerge = types.model("RootMerge", {
        control: MinimalControl,
        object: MinimalObject,
        annotationStore: types.optional(
          types.model({ selected: types.maybeNull(types.model("AnnMerge", { areas: types.array(AreaWithLabels) })) }),
          { selected: null },
        ),
      });
      const root = RootMerge.create({
        control: { id: "c1" },
        object: { id: "o1", mergeLabelsAndResults: true },
        annotationStore: {
          selected: {
            areas: [
              {
                id: "a1",
                results: [
                  {
                    from_name: "c1",
                    to_name: "o1",
                    type: "textarea",
                    value: { textarea: ["hi"] },
                    meta: {},
                  },
                ],
                labels: ["AreaLabel1"],
              },
            ],
          },
        },
      });
      const result = root.annotationStore.selected.areas[0].results[0];
      const data = result.serialize();
      expect(data).not.toBeNull();
      expect(data.value.labels).toEqual(["AreaLabel1"]);
    });

    it("includes parentID when area.parentID is set", () => {
      const root = createTree({}, {}, { parentID: "pid-123#suffix" });
      const result = root.annotationStore.selected.areas[0].results[0];
      const data = result.serialize();
      expect(data.parentID).toBe("pid-123");
    });

    it("includes item_index when isFF(FF_LSDV_4583) and area.item_index is set", () => {
      mockIsFF.mockImplementation((flag) => flag === "ff_lsdv_4583");
      const root = createTree({}, {}, { item_index: 2 });
      const result = root.annotationStore.selected.areas[0].results[0];
      const data = result.serialize();
      expect(data.item_index).toBe(2);
      mockIsFF.mockReturnValue(false);
    });

    it("initializes data.value when area.serialize returns object without value", () => {
      const AreaNoValue = types
        .model("AreaNoValue", {
          id: types.identifier,
          results: types.array(Result),
          parentID: types.maybeNull(types.string),
        })
        .views((self) => ({
          get cleanId() {
            return self.id.replace(/#.*/, "");
          },
          get meta() {
            return {};
          },
          get labels() {
            return [];
          },
          get origin() {
            return "manual";
          },
          hasLabel() {
            return false;
          },
        }))
        .actions(() => ({
          isReadOnly() {
            return false;
          },
          serialize() {
            return {};
          },
        }));
      const RootNoValue = types.model("RootNoValue", {
        control: MinimalControl,
        object: MinimalObject,
        annotationStore: types.optional(
          types.model({ selected: types.maybeNull(types.model("AnnNoValue", { areas: types.array(AreaNoValue) })) }),
          { selected: null },
        ),
      });
      const root = RootNoValue.create({
        control: { id: "c1" },
        object: { id: "o1" },
        annotationStore: {
          selected: {
            areas: [
              {
                id: "a1",
                results: [
                  { from_name: "c1", to_name: "o1", type: "rectanglelabels", value: { labels: ["L1"] }, meta: {} },
                ],
                parentID: null,
              },
            ],
          },
        },
      });
      const result = root.annotationStore.selected.areas[0].results[0];
      const data = result.serialize();
      expect(data).not.toBeNull();
      expect(data.value).toEqual({ labels: ["L1"] });
    });
  });
});
