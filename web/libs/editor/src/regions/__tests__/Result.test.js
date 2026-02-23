/**
 * Unit tests for Result (regions/Result.js).
 * Covers views (store, area, mainValue, hasValue, isReadOnly, getSelectedString,
 * selectedLabels, mergeMainValue, canBeSubmitted, tag, style, emptyStyle, controlStyle,
 * getRegionElement, perRegionStates) and actions (setValue, afterCreate, setMetaValue,
 * serialize, setHighlight, toggleHighlight, toggleHidden).
 */
import { types } from "mobx-state-tree";

jest.mock("../../utils/feature-flags", () => ({
  isFF: jest.fn(() => false),
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
  }))
  .actions((self) => ({
    isReadOnly() {
      return false;
    },
    serialize() {
      return { value: {} };
    },
  }));

const MinimalAnnotation = types.model("MinimalAnnotation", {
  areas: types.array(MinimalArea),
});

const AnnotationStore = types.model("AnnotationStore", {
  selected: types.maybeNull(MinimalAnnotation),
});

const Root = types.model("Root", {
  control: MinimalControl,
  object: MinimalObject,
  annotationStore: types.optional(AnnotationStore, { selected: null }),
});

function createTree(resultSnapshot = {}, controlSnapshot = {}) {
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
  };
  const annotation = {
    areas: [area],
  };
  return Root.create({
    control: { id: "c1", ...controlSnapshot },
    object: { id: "o1" },
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
    it("returns null when canBeSubmitted is false and area serializes", () => {
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
  });
});
