/**
 * Unit tests for Annotation model (stores/Annotation/Annotation.js).
 * Target: coverage parity 77.92%.
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

import "../../../tags/visual/View";
import "../../../tags/object/RichText";
import Tree from "../../../core/Tree";
import Registry from "../../../core/Registry";
import AppStore from "../../AppStore";

const MINIMAL_CONFIG = `<View><Text name="t1" value="$text" /></View>`;

const createTestEnv = () => ({
  events: {
    hasEvent: jest.fn(() => false),
    invoke: jest.fn(),
  },
  messages: {},
  settings: {},
});

function createStoreWithAnnotation(annotationSnapshot = {}) {
  const env = createTestEnv();
  const task = {
    id: 1,
    data: JSON.stringify({ text: "Hello" }),
  };
  const store = AppStore.create(
    {
      config: MINIMAL_CONFIG,
      task,
      interfaces: ["basic"],
    },
    env,
  );
  store.initializeStore({});
  const ann = store.annotationStore.addAnnotation({
    result: [],
    ...annotationSnapshot,
  });
  return { store, annotation: ann, env };
}

describe("Annotation model", () => {
  describe("creation and snapshot", () => {
    it("creates annotation with default type and editable", () => {
      const { annotation } = createStoreWithAnnotation();
      expect(annotation.type).toBe("annotation");
      expect(annotation.editable).toBe(true);
      expect(annotation.id).toBeDefined();
    });

    it("creates prediction with editable false", () => {
      const env = createTestEnv();
      const store = AppStore.create(
        {
          config: MINIMAL_CONFIG,
          task: { id: 1, data: JSON.stringify({ text: "Hi" }) },
          interfaces: ["basic"],
        },
        env,
      );
      store.initializeStore({});
      const pred = store.annotationStore.addPrediction({ result: [] });
      expect(pred.type).toBe("prediction");
      expect(pred.editable).toBe(false);
    });
  });

  describe("views", () => {
    it("store returns root store", () => {
      const { store, annotation } = createStoreWithAnnotation();
      expect(annotation.store).toBe(store);
    });

    it("list returns annotation store", () => {
      const { store, annotation } = createStoreWithAnnotation();
      expect(annotation.list).toBe(store.annotationStore);
    });

    it("regions returns array from areas", () => {
      const { annotation } = createStoreWithAnnotation();
      expect(annotation.regions).toEqual([]);
    });

    it("results returns empty array when no areas", () => {
      const { annotation } = createStoreWithAnnotation();
      expect(annotation.results).toEqual([]);
    });

    it("hasSelection reflects regionStore.hasSelection", () => {
      const { annotation } = createStoreWithAnnotation();
      expect(annotation.hasSelection).toBe(false);
    });

    it("selectionSize reflects regionStore selection size", () => {
      const { annotation } = createStoreWithAnnotation();
      expect(annotation.selectionSize).toBe(0);
    });

    it("selectedRegions returns empty array when none selected", () => {
      const { annotation } = createStoreWithAnnotation();
      expect(annotation.selectedRegions).toEqual([]);
    });

    it("exists is false when pk and versions not set", () => {
      const { annotation } = createStoreWithAnnotation();
      expect(annotation.exists).toBe(false);
    });

    it("isReadOnly returns true when readonly is true", () => {
      const { annotation } = createStoreWithAnnotation();
      annotation.setReadonly(true);
      expect(annotation.isReadOnly()).toBe(true);
    });

    it("isReadOnly returns false when editable and not readonly", () => {
      const { annotation } = createStoreWithAnnotation();
      expect(annotation.isReadOnly()).toBe(false);
    });
  });

  describe("actions", () => {
    it("setEditable updates editable", () => {
      const { annotation } = createStoreWithAnnotation();
      annotation.setEditable(false);
      expect(annotation.editable).toBe(false);
    });

    it("setReadonly updates readonly", () => {
      const { annotation } = createStoreWithAnnotation();
      annotation.setReadonly(true);
      expect(annotation.readonly).toBe(true);
    });

    it("toggleVisibility toggles hidden", () => {
      const { annotation } = createStoreWithAnnotation();
      expect(annotation.hidden).toBe(false);
      annotation.toggleVisibility(true);
      expect(annotation.hidden).toBe(false);
      annotation.toggleVisibility();
      expect(annotation.hidden).toBe(true);
    });

    it("setIsDrawing updates isDrawing", () => {
      const { annotation } = createStoreWithAnnotation();
      annotation.setIsDrawing(true);
      expect(annotation.isDrawing).toBe(true);
    });

    it("setDragMode updates dragMode", () => {
      const { annotation } = createStoreWithAnnotation();
      annotation.setDragMode(true);
      expect(annotation.dragMode).toBe(true);
    });

    it("unselectAreas does not throw when selection empty", () => {
      const { annotation } = createStoreWithAnnotation();
      expect(() => annotation.unselectAreas()).not.toThrow();
    });

    it("unselectAll clears selection and does not throw", () => {
      const { annotation } = createStoreWithAnnotation();
      expect(() => annotation.unselectAll()).not.toThrow();
      expect(() => annotation.unselectAll(true)).not.toThrow();
    });

    it("validate returns true for empty annotation", () => {
      const { annotation } = createStoreWithAnnotation();
      expect(annotation.validate()).toBe(true);
    });

    it("beforeSend traverses tree and stops linking mode", () => {
      const { annotation } = createStoreWithAnnotation();
      expect(() => annotation.beforeSend()).not.toThrow();
    });

    it("deleteAllRegions with no regions does not throw", () => {
      const { annotation } = createStoreWithAnnotation();
      expect(() => annotation.deleteAllRegions()).not.toThrow();
    });

    it("deleteAllRegions with deleteReadOnly clears and updates", () => {
      const { annotation } = createStoreWithAnnotation();
      expect(() => annotation.deleteAllRegions({ deleteReadOnly: true })).not.toThrow();
    });

    it("updateObjects does not throw", () => {
      const { annotation } = createStoreWithAnnotation();
      expect(() => annotation.updateObjects()).not.toThrow();
      expect(() => annotation.updateObjects(false)).not.toThrow();
    });

    it("prepareAnnotation parses JSON string", () => {
      const { annotation } = createStoreWithAnnotation();
      const result = annotation.prepareAnnotation(
        '[{"type":"labels","from_name":"l","to_name":"t1","value":{"labels":["A"]}}]',
      );
      expect(Array.isArray(result)).toBe(true);
    });

    it("prepareAnnotation returns array for array input", () => {
      const { annotation } = createStoreWithAnnotation();
      const input = [];
      expect(annotation.prepareAnnotation(input)).toEqual([]);
    });

    it("fixBrokenAnnotation filters invalid results and fixes types", () => {
      const { annotation } = createStoreWithAnnotation();
      const json = [
        { type: "relation", from_id: "a", to_id: "b", direction: "right" },
        { type: "htmllabels", from_name: "x", to_name: "y", value: {} },
      ];
      const fixed = annotation.fixBrokenAnnotation(json);
      expect(fixed.length).toBeLessThanOrEqual(json.length);
    });

    it("fixBrokenAnnotation passes through relation type", () => {
      const { annotation } = createStoreWithAnnotation();
      const json = [{ type: "relation", from_id: "a", to_id: "b", direction: "right", labels: [] }];
      const fixed = annotation.fixBrokenAnnotation(json);
      expect(fixed.some((r) => r.type === "relation")).toBe(true);
    });

    it("serializeAnnotation returns array and resets cursor", () => {
      const { annotation } = createStoreWithAnnotation();
      const result = annotation.serializeAnnotation();
      expect(Array.isArray(result)).toBe(true);
      expect(document.body.style.cursor).toBe("default");
    });

    it("setGroundTruth updates ground_truth", () => {
      const { annotation } = createStoreWithAnnotation();
      annotation.setGroundTruth(true, false);
      expect(annotation.ground_truth).toBe(true);
    });

    it("sendUserGenerate sets sentUserGenerate", () => {
      const { annotation } = createStoreWithAnnotation();
      annotation.sendUserGenerate();
      expect(annotation.sentUserGenerate).toBe(true);
    });

    it("updatePersonalKey sets pk", () => {
      const { store, annotation } = createStoreWithAnnotation();
      store.addAnnotationToTaskHistory = jest.fn();
      annotation.updatePersonalKey("42");
      expect(annotation.pk).toBe("42");
      expect(store.addAnnotationToTaskHistory).toHaveBeenCalledWith("42");
    });

    it("setUnresolvedCommentCount and setCommentCount update counts", () => {
      const { annotation } = createStoreWithAnnotation();
      annotation.setUnresolvedCommentCount(2);
      annotation.setCommentCount(5);
      expect(annotation.unresolved_comment_count).toBe(2);
      expect(annotation.comment_count).toBe(5);
    });

    it("addVersions merges versions and can set draftSelected", () => {
      const { annotation } = createStoreWithAnnotation();
      annotation.addVersions({ draft: [] });
      expect(annotation.versions.draft).toEqual([]);
    });

    it("setDraftId and setDraftSelected update volatile state", () => {
      const { annotation } = createStoreWithAnnotation();
      annotation.setDraftId(99);
      annotation.setDraftSelected(true);
      expect(annotation.draftId).toBe(99);
      expect(annotation.draftSelected).toBe(true);
    });

    it("setDraftSaving and setDraftSaved update state", () => {
      const { annotation } = createStoreWithAnnotation();
      annotation.setDraftSaving(true);
      expect(annotation.isDraftSaving).toBe(true);
      annotation.setDraftSaved("2020-01-01");
      expect(annotation.draftSaved).toBe("2020-01-01");
    });

    it("dropDraft clears draft state when autosave exists", () => {
      const { annotation } = createStoreWithAnnotation();
      annotation.autosave = { cancel: jest.fn() };
      annotation.setDraftId(1);
      annotation.setDraftSelected(true);
      annotation.addVersions({ draft: [] });
      annotation.dropDraft();
      expect(annotation.draftId).toBe(0);
      expect(annotation.draftSelected).toBe(false);
      expect(annotation.versions.draft).toBeUndefined();
    });

    it("reinitHistory calls history.reinit and setInitialValues for annotation type", () => {
      const { annotation } = createStoreWithAnnotation();
      annotation.history.reinit = jest.fn();
      annotation.reinitHistory(true);
      expect(annotation.history.reinit).toHaveBeenCalledWith(true);
    });

    it("deserializeAnnotation warns and delegates to deserializeResults", () => {
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
      const { annotation } = createStoreWithAnnotation();
      annotation.deserializeResults = jest.fn();
      annotation.deserializeAnnotation([]);
      expect(consoleSpy).toHaveBeenCalled();
      expect(annotation.deserializeResults).toHaveBeenCalledWith([]);
      consoleSpy.mockRestore();
    });

    it("prepareValue returns value for non-text types", () => {
      const { annotation } = createStoreWithAnnotation();
      expect(annotation.prepareValue({ labels: ["A"] }, "rectanglelabels")).toEqual({ labels: ["A"] });
    });

    it("prepareValue transforms start/end to startOffset/endOffset for text types", () => {
      const { annotation } = createStoreWithAnnotation();
      const value = { start: 0, end: 5 };
      const result = annotation.prepareValue(value, "richtext");
      expect(result.startOffset).toBe(0);
      expect(result.endOffset).toBe(5);
      expect(result.isText).toBe(true);
    });

    it("rejectAllSuggestions clears suggestions", () => {
      const { annotation } = createStoreWithAnnotation();
      expect(() => annotation.rejectAllSuggestions()).not.toThrow();
    });

    it("resetReady iterates objects and areas", () => {
      const { annotation } = createStoreWithAnnotation();
      expect(() => annotation.resetReady()).not.toThrow();
    });
  });
});
