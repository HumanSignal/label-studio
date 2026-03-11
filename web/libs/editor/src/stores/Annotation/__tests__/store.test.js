/**
 * Unit tests for Annotation store (stores/Annotation/store.js).
 * Target: coverage parity 75.91%.
 */
if (typeof globalThis.structuredClone === "undefined") {
  globalThis.structuredClone = (obj) => JSON.parse(JSON.stringify(obj));
}

jest.mock("keymaster", () => {
  const keymaster = () => {};
  keymaster.unbind = () => {};
  keymaster.setScope = () => {};
  return { __esModule: true, default: keymaster };
});

jest.mock("../../../tools/Manager", () => ({
  __esModule: true,
  default: {
    setRoot: jest.fn(),
    removeAllTools: jest.fn(),
    allInstances: jest.fn(() => []),
    resetActiveDrawings: jest.fn(),
  },
}));

const mockInvoke = jest.fn();
const mockInvokeFirst = jest.fn();
const mockHasEvent = jest.fn(() => false);
jest.mock("../../../components/Infomodal/Infomodal", () => ({
  __esModule: true,
  default: {
    warning: jest.fn(),
    error: jest.fn(),
  },
}));

import "../../../tags/visual/View";
import "../../../tags/object/RichText";
import Tree from "../../../core/Tree";
import Registry from "../../../core/Registry";
import AppStore from "../../AppStore";

const MINIMAL_CONFIG = `<View><Text name="t1" value="$text" /></View>`;

function createTestEnv(overrides = {}) {
  return {
    events: {
      hasEvent: mockHasEvent,
      invoke: mockInvoke,
      invokeFirst: mockInvokeFirst,
    },
    messages: { CONFIRM_TO_DELETE_ALL_REGIONS: "Delete all?" },
    settings: {},
    forceAutoAnnotation: false,
    forceAutoAcceptSuggestions: false,
    ...overrides,
  };
}

function createStore(snapshot = {}, envOverrides) {
  const env = createTestEnv(envOverrides);
  return AppStore.create(
    {
      config: MINIMAL_CONFIG,
      task: { id: 1, data: JSON.stringify({ text: "Hello" }) },
      interfaces: ["basic"],
      ...snapshot,
    },
    env,
  );
}

describe("Annotation store (store.js)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHasEvent.mockReturnValue(false);
    localStorage.setItem("annotation-store-viewing-all", "false");
  });

  describe("creation and initRoot", () => {
    it("store getter returns root store", () => {
      const store = createStore();
      store.initializeStore({});
      expect(store.annotationStore.store).toBe(store);
    });

    it("viewingAll is false when not initialized", () => {
      const store = createStore();
      expect(store.annotationStore.initialized).toBe(false);
      expect(store.annotationStore.viewingAll).toBe(false);
    });

    it("viewingAll is false when interface annotations:view-all is missing", () => {
      const store = createStore();
      store.initializeStore({});
      expect(store.annotationStore.viewingAll).toBe(false);
    });

    it("initRoot with null config sets empty view root", () => {
      const store = createStore();
      store.initializeStore({});
      store.annotationStore.initRoot(null);
      expect(store.annotationStore.root).toBeDefined();
      expect(store.annotationStore.root.type).toBe("view");
    });

    it("initRoot is no-op when root already set", () => {
      const store = createStore();
      store.initializeStore({});
      const root = store.annotationStore.root;
      store.annotationStore.initRoot(MINIMAL_CONFIG);
      expect(store.annotationStore.root).toBe(root);
    });

    it("initRoot with invalid config calls showError and sets error view root", () => {
      const store = createStore();
      store.initializeStore({});
      const invalidConfig = "<View><NotATag";
      store.annotationStore.initRoot(invalidConfig);
      expect(store.annotationStore.root).toBeDefined();
      expect(store.annotationStore.root.type).toBe("view");
      expect(store.annotationStore.validation).toBeDefined();
    });
  });

  describe("addAnnotation and addPrediction", () => {
    it("addAnnotation creates annotation and selectAnnotation selects it", () => {
      const store = createStore();
      store.initializeStore({});
      const ann = store.annotationStore.addAnnotation({ result: [] });
      expect(ann.type).toBe("annotation");
      expect(ann.editable).toBe(true);
      expect(store.annotationStore.annotations.length).toBe(1);
      const selected = store.annotationStore.selectAnnotation(ann.id);
      expect(selected).toBe(ann);
      expect(store.annotationStore.selected).toBe(ann);
    });

    it("addPrediction creates prediction and selectPrediction selects it", () => {
      const store = createStore();
      store.initializeStore({});
      store.annotationStore.addAnnotation({ result: [] });
      const pred = store.annotationStore.addPrediction({ result: [] });
      expect(pred.type).toBe("prediction");
      expect(pred.editable).toBe(false);
      expect(store.annotationStore.predictions.length).toBe(1);
      const selected = store.annotationStore.selectPrediction(pred.id);
      expect(selected).toBe(pred);
    });

    it("selectAnnotation returns null when annotations empty", () => {
      const store = createStore();
      store.initializeStore({});
      expect(store.annotationStore.selectAnnotation("any")).toBeNull();
    });

    it("selectPrediction returns null when predictions empty", () => {
      const store = createStore();
      store.initializeStore({});
      expect(store.annotationStore.selectPrediction("any")).toBeNull();
    });

    it("selectItem finds by id or pk and resets history when resetHistory true", () => {
      const store = createStore();
      store.initializeStore({});
      const a1 = store.annotationStore.addAnnotation({ result: [], pk: "100" });
      store.annotationStore.addAnnotation({ result: [] });
      store.annotationStore.selectAnnotation(a1.id);
      store.annotationStore.addHistory({});
      expect(store.annotationStore.history.length).toBe(1);
      store.annotationStore.selectAnnotation(a1.id, { retainHistory: false });
      expect(store.annotationStore.selectedHistory).toBeNull();
      expect(store.annotationStore.history.length).toBe(0);
    });

    it("FIT-720: addHistory preserves numeric pk from API (HistoryItem preProcessSnapshot)", () => {
      const store = createStore();
      store.initializeStore({
        annotations: [{ id: "a1", pk: 100, result: [] }],
      });
      store.annotationStore.selectAnnotation(store.annotationStore.annotations[0].id);
      const historyRowId = 46597;
      store.annotationStore.addHistory({
        id: historyRowId,
        annotation_id: 100,
        action: "submitted",
        result: [],
        is_stub: true,
      });
      expect(store.annotationStore.history.length).toBe(1);
      expect(Number(store.annotationStore.history[0].pk)).toBe(historyRowId);
    });

    it("addAnnotation when root not set initializes root from store config", () => {
      const store = createStore();
      expect(store.annotationStore.root).toBeUndefined();
      store.annotationStore.addAnnotation({ result: [] });
      expect(store.annotationStore.root).toBeDefined();
    });
  });

  describe("viewingAll and toggle", () => {
    it("toggleViewingAllAnnotations toggles viewingAllAnnotations and persists to localStorage", () => {
      const store = createStore({ interfaces: ["basic", "annotations:view-all"] });
      store.initializeStore({});
      store.annotationStore.addAnnotation({ result: [] });
      store.annotationStore.selectAnnotation(store.annotationStore.annotations[0].id);
      expect(store.annotationStore.viewingAllAnnotations).toBe(false);
      store.annotationStore.toggleViewingAllAnnotations();
      expect(store.annotationStore.viewingAllAnnotations).toBe(true);
      expect(localStorage.getItem("annotation-store-viewing-all")).toBe("true");
      store.annotationStore.toggleViewingAllAnnotations();
      expect(store.annotationStore.viewingAllAnnotations).toBe(false);
    });

    it("exiting view-all via selectAnnotation with exitViewAll persists to localStorage", () => {
      const store = createStore({ interfaces: ["basic", "annotations:view-all"] });
      store.initializeStore({});
      store.annotationStore.addAnnotation({ result: [] });
      store.annotationStore.selectAnnotation(store.annotationStore.annotations[0].id);
      store.annotationStore.toggleViewingAllAnnotations();
      expect(localStorage.getItem("annotation-store-viewing-all")).toBe("true");
      store.annotationStore.selectAnnotation(store.annotationStore.annotations[0].id, { exitViewAll: true });
      expect(store.annotationStore.viewingAllAnnotations).toBe(false);
      expect(localStorage.getItem("annotation-store-viewing-all")).toBe("false");
    });
  });

  describe("selectAnnotation options", () => {
    it("exitViewAll calls unselectViewingAll", () => {
      const store = createStore({ interfaces: ["basic", "annotations:view-all"] });
      store.initializeStore({});
      store.annotationStore.addAnnotation({ result: [] });
      store.annotationStore.selectAnnotation(store.annotationStore.annotations[0].id);
      store.annotationStore.toggleViewingAllAnnotations();
      expect(store.annotationStore.viewingAllAnnotations).toBe(true);
      store.annotationStore.selectAnnotation(store.annotationStore.annotations[0].id, { exitViewAll: true });
      expect(store.annotationStore.viewingAllAnnotations).toBe(false);
    });

    it("selectAnnotation with pk calls addAnnotationToTaskHistory on parent", () => {
      const store = createStore();
      store.initializeStore({});
      const ann = store.annotationStore.addAnnotation({ result: [], pk: "42" });
      store.addAnnotationToTaskHistory = jest.fn();
      store.annotationStore.selectAnnotation(ann.id);
      expect(store.addAnnotationToTaskHistory).toHaveBeenCalledWith("42");
    });

    it("selectAnnotation in view-all mode without exitViewAll sets editable to false", () => {
      const store = createStore({ interfaces: ["basic", "annotations:view-all"] });
      store.initializeStore({});
      const a1 = store.annotationStore.addAnnotation({ result: [] });
      const a2 = store.annotationStore.addAnnotation({ result: [] });
      store.annotationStore.selectAnnotation(a1.id);
      store.annotationStore.toggleViewingAllAnnotations();
      expect(store.annotationStore.viewingAll).toBe(true);
      store.annotationStore.selectAnnotation(a2.id);
      expect(a2.editable).toBe(false);
    });
  });

  describe("deleteAnnotation and clearDeletedParents", () => {
    it("deleteAnnotation destroys annotation and selects next", () => {
      const store = createStore();
      store.initializeStore({});
      const a1 = store.annotationStore.addAnnotation({ result: [] });
      const a2 = store.annotationStore.addAnnotation({ result: [] });
      store.annotationStore.selectAnnotation(a1.id);
      store.annotationStore.deleteAnnotation(a1);
      expect(store.annotationStore.annotations.length).toBe(1);
      expect(store.annotationStore.selected).toBe(a2);
    });

    it("clearDeletedParents returns early when annotation has no pk", () => {
      const store = createStore();
      store.initializeStore({});
      expect(() => store.annotationStore.clearDeletedParents(null)).not.toThrow();
      expect(() => store.annotationStore.clearDeletedParents({})).not.toThrow();
    });

    it("clearDeletedParents does not throw when no children reference the given pk", () => {
      const store = createStore();
      store.initializeStore({});
      store.annotationStore.addAnnotation({ result: [], pk: "10" });
      expect(() => store.annotationStore.clearDeletedParents({ pk: "99" })).not.toThrow();
    });
  });

  describe("history", () => {
    it("addHistory pushes history item", () => {
      const store = createStore();
      store.initializeStore({});
      store.annotationStore.addAnnotation({ result: [] });
      store.annotationStore.selectAnnotation(store.annotationStore.annotations[0].id);
      store.annotationStore.addHistory({});
      expect(store.annotationStore.history.length).toBe(1);
    });

    it("clearHistory destroys and clears history", () => {
      const store = createStore();
      store.initializeStore({});
      store.annotationStore.addAnnotation({ result: [] });
      store.annotationStore.selectAnnotation(store.annotationStore.annotations[0].id);
      store.annotationStore.addHistory({});
      store.annotationStore.clearHistory();
      expect(store.annotationStore.history.length).toBe(0);
    });

    it("selectHistory sets selectedHistory and invokes event", () => {
      const store = createStore();
      store.initializeStore({});
      store.annotationStore.addAnnotation({ result: [] });
      store.annotationStore.selectAnnotation(store.annotationStore.annotations[0].id);
      const hist = store.annotationStore.addHistory({});
      store.annotationStore.selectHistory(hist);
      expect(store.annotationStore.selectedHistory).toBe(hist);
      expect(mockInvoke).toHaveBeenCalledWith("selectHistory", store, store.annotationStore.selected, hist);
    });
  });

  describe("createAnnotation and addAnnotationFromPrediction", () => {
    it("createAnnotation adds annotation and sets default values when no prediction result", () => {
      const store = createStore();
      store.initializeStore({});
      const ann = store.annotationStore.createAnnotation({ userGenerate: true });
      expect(ann).toBeDefined();
      expect(ann.type).toBe("annotation");
      expect(store.annotationStore.annotations).toContain(ann);
    });

    it("addAnnotationFromPrediction creates annotation from prediction and sets parent_prediction", () => {
      const store = createStore();
      store.initializeStore({});
      const pred = store.annotationStore.addPrediction({
        result: [],
        pk: "50",
      });
      pred._initialAnnotationObj = [];
      const ann = store.annotationStore.addAnnotationFromPrediction(pred);
      expect(ann).toBeDefined();
      expect(ann.parent_prediction).toBe(50);
    });

    it("addAnnotationFromPrediction from annotation entity sets parent_annotation", () => {
      const store = createStore();
      store.initializeStore({});
      const parentAnn = store.annotationStore.addAnnotation({ result: [], pk: "100" });
      parentAnn._initialAnnotationObj = [];
      const childAnn = store.annotationStore.addAnnotationFromPrediction(parentAnn);
      expect(childAnn).toBeDefined();
      expect(childAnn.parent_annotation).toBe(100);
    });

    it("createAnnotation with non-interactive prediction result deserializes and selects", () => {
      const store = createStore();
      store.initializeStore({});
      const pred = store.annotationStore.addPrediction({ result: [] });
      pred._initialAnnotationObj = [
        {
          interactive_mode: false,
          from_name: "l",
          to_name: "t1",
          type: "labels",
          value: { labels: [] },
        },
      ];
      const ann = store.annotationStore.createAnnotation();
      expect(ann).toBeDefined();
      expect(store.annotationStore.selected).toBe(ann);
    });
  });

  describe("resetAnnotations", () => {
    it("resetAnnotations clears selected, history, annotations, predictions", () => {
      const store = createStore();
      store.initializeStore({});
      store.annotationStore.addAnnotation({ result: [] });
      store.annotationStore.selectAnnotation(store.annotationStore.annotations[0].id);
      store.annotationStore.resetAnnotations();
      expect(store.annotationStore.selected).toBeNull();
      expect(store.annotationStore.selectedHistory).toBeNull();
      expect(store.annotationStore.annotations.length).toBe(0);
      expect(store.annotationStore.predictions.length).toBe(0);
      expect(store.annotationStore.history.length).toBe(0);
    });
  });

  describe("addErrors and validate", () => {
    it("addErrors appends to validation and deduplicates by identifier", () => {
      const store = createStore();
      store.initializeStore({});
      const { errorBuilder } = require("../../../core/DataValidator/ConfigValidator");
      const err1 = errorBuilder.generalError("Err1");
      const err2 = errorBuilder.generalError("Err2");
      store.annotationStore.addErrors([err1]);
      store.annotationStore.addErrors([err1, err2]);
      expect(store.annotationStore.validation.length).toBe(2);
    });

    it("validate delegates to DataValidator", () => {
      const store = createStore();
      store.initializeStore({});
      const rootModel = Tree.treeToModel(MINIMAL_CONFIG, store);
      expect(() => store.annotationStore.validate("CONFIG", rootModel)).not.toThrow();
    });
  });

  describe("names and toNames", () => {
    it("addName puts node in names map", () => {
      const store = createStore();
      store.initializeStore({});
      const root = store.annotationStore.root;
      store.annotationStore.addName(root);
      expect(store.annotationStore.names.size).toBeGreaterThan(0);
    });

    it("addToName sets toNames for node with toname", () => {
      const store = createStore();
      store.initializeStore({});
      const textNode = store.annotationStore.root.children[0];
      expect(textNode.name).toBe("t1");
      store.annotationStore.addToName({ toname: "t1", name: textNode.name });
      expect(store.annotationStore.toNames.get("t1")).toBeDefined();
      expect(store.annotationStore.toNames.get("t1").length).toBe(1);
    });
  });

  describe("_selectItem and _unselectAll", () => {
    it("_selectItem sets selected and updates item", () => {
      const store = createStore();
      store.initializeStore({});
      const a1 = store.annotationStore.addAnnotation({ result: [] });
      const a2 = store.annotationStore.addAnnotation({ result: [] });
      store.annotationStore.selectAnnotation(a1.id);
      store.annotationStore._selectItem(a2);
      expect(store.annotationStore.selected).toBe(a2);
      expect(a2.editable).toBe(false);
    });

    it("_unselectAll clears selection state on current selected", () => {
      const store = createStore();
      store.initializeStore({});
      const ann = store.annotationStore.addAnnotation({ result: [] });
      store.annotationStore.selectAnnotation(ann.id);
      expect(ann.selected).toBe(true);
      store.annotationStore._unselectAll();
      expect(ann.selected).toBe(false);
    });
  });

  describe("selectPrediction with exitViewAll", () => {
    it("selectPrediction with exitViewAll unsets viewingAllAnnotations", () => {
      const store = createStore({ interfaces: ["basic", "annotations:view-all"] });
      store.initializeStore({});
      store.annotationStore.addAnnotation({ result: [] });
      const pred = store.annotationStore.addPrediction({ result: [] });
      store.annotationStore.selectAnnotation(store.annotationStore.annotations[0].id);
      store.annotationStore.toggleViewingAllAnnotations();
      store.annotationStore.selectPrediction(pred.id, { exitViewAll: true });
      expect(store.annotationStore.viewingAllAnnotations).toBe(false);
    });
  });
});
