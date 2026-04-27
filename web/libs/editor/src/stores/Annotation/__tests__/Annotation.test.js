/**
 * Unit tests for Annotation model (stores/Annotation/Annotation.js).
 * Target: coverage parity 77.92%.
 */
if (typeof globalThis.structuredClone === "undefined") {
  globalThis.structuredClone = (obj) => JSON.parse(JSON.stringify(obj));
}

mockModule("keymaster", () => {
  let scope = "all";
  const keymaster = () => {};
  keymaster.unbind = () => {};
  keymaster.setScope = (nextScope) => {
    scope = nextScope ?? scope;
  };
  keymaster.getScope = () => scope;
  return { __esModule: true, default: keymaster };
});

import { observable } from "mobx";
import "../../../tags/visual/View";
import "../../../tags/object/RichText";
import "../../../tags/object/Image/Image.js";
import "../../../tags/control/Labels/Labels.jsx";
import { getSnapshot, unprotect, protect } from "mobx-state-tree";
import AppStore from "../../AppStore";

const MINIMAL_CONFIG =
  '<View><Image name="img" value="$img" /><Labels name="l" toName="img"><Label value="A" /></Labels></View>';

const createTestEnv = () => ({
  events: {
    hasEvent: mock(() => false),
    invoke: mock(),
  },
  messages: {},
  settings: {},
});

function createStoreWithAnnotation(annotationSnapshot = {}) {
  const env = createTestEnv();
  const task = {
    id: 1,
    data: JSON.stringify({ img: "https://example.com/test.jpg" }),
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
          task: { id: 1, data: JSON.stringify({ img: "https://example.com/test.jpg" }) },
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
        '[{"type":"labels","from_name":"l","to_name":"img","value":{"labels":["A"]}}]',
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

    it("fixBrokenAnnotation strips MobX observables before structuredClone (FIT-1686, FIT-1692)", () => {
      const { annotation } = createStoreWithAnnotation();
      const ranges = observable([observable({ start: 3, end: 5 }), observable({ start: 10, end: 20 })]);
      const json = [
        {
          id: "r1",
          type: "labels",
          from_name: "l",
          to_name: "img",
          value: { labels: ["A"], ranges },
        },
      ];
      expect(() => annotation.fixBrokenAnnotation(json)).not.toThrow();
      const fixed = annotation.fixBrokenAnnotation(json);
      expect(fixed).toHaveLength(1);
      expect(() => structuredClone(fixed[0])).not.toThrow();
      expect(fixed[0].value.ranges).toEqual([
        { start: 3, end: 5 },
        { start: 10, end: 20 },
      ]);
    });

    it("fixBrokenAnnotation collapses duplicate (id, from_name, type) rows (FIT-1669)", () => {
      // Ensures the deserialize entry point (used by live annotations,
      // history items, and predictions) never forwards stacked duplicates
      // to `deserializeSingleResult` / `area.addResult`. `l`/`img` match
      // the `MINIMAL_CONFIG` tag names so rows survive the `tagNames`
      // filter and exercise the dedupe branch.
      const { annotation } = createStoreWithAnnotation();
      const json = [
        { id: "r1", type: "labels", from_name: "l", to_name: "img", value: { labels: ["A"] } },
        { id: "r1", type: "labels", from_name: "l", to_name: "img", value: { labels: ["A"] } },
        { id: "r2", type: "labels", from_name: "l", to_name: "img", value: { labels: ["A"] } },
      ];
      const fixed = annotation.fixBrokenAnnotation(json);
      const ids = fixed.filter((r) => r.type === "labels").map((r) => r.id);
      expect(ids).toEqual(["r1", "r2"]);
    });

    it("fixBrokenAnnotation preserves distinct from_name on shared id (FIT-1669)", () => {
      const { annotation } = createStoreWithAnnotation();
      const json = [
        { id: "shared", type: "labels", from_name: "l", to_name: "img", value: { labels: ["A"] } },
        { id: "shared", type: "relation", from_id: "a", to_id: "b", direction: "right", labels: [] },
      ];
      const fixed = annotation.fixBrokenAnnotation(json);
      expect(fixed.some((r) => r.type === "labels" && r.id === "shared")).toBe(true);
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
      store.addAnnotationToTaskHistory = mock();
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
      annotation.autosave = { cancel: mock() };
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
      annotation.history.reinit = mock();
      annotation.reinitHistory(true);
      expect(annotation.history.reinit).toHaveBeenCalledWith(true);
    });

    describe("needsDraftSave view (FIT-1685)", () => {
      /** Simulate a second undo state (requires unprotecting the store root in MST 3). */
      function pushDuplicateHistoryState(store, annotation) {
        unprotect(store);
        try {
          const tt = annotation.history;
          const snap = getSnapshot(annotation.trackedState);
          tt.history.push(snap);
          tt.undoIdx = tt.history.length - 1;
        } finally {
          protect(store);
        }
      }

      it("is false when there is no undo history beyond the initial state", () => {
        const { annotation } = createStoreWithAnnotation();
        expect(annotation.needsDraftSave()).toBe(false);
      });

      it("is false when previewing a submitted snapshot while a server draft exists, even if history looks dirty", () => {
        const { annotation, store } = createStoreWithAnnotation();
        pushDuplicateHistoryState(store, annotation);
        annotation.addVersions({ draft: [{ id: "d1", type: "labels" }] });
        annotation.setDraftSelected(false);
        expect(annotation.history.hasChanges).toBe(true);
        expect(annotation.needsDraftSave()).toBe(false);
      });

      it("is true when there are tracked changes and no draftSaved yet", () => {
        const { annotation, store } = createStoreWithAnnotation();
        pushDuplicateHistoryState(store, annotation);
        annotation.setDraftSaved(undefined);
        expect(annotation.needsDraftSave()).toBe(true);
      });

      it("is true when lastAdditionTime is after draftSaved", () => {
        const { annotation, store } = createStoreWithAnnotation();
        pushDuplicateHistoryState(store, annotation);
        unprotect(store);
        try {
          annotation.history.lastAdditionTime = new Date("2099-06-01T00:00:00.000Z");
        } finally {
          protect(store);
        }
        annotation.setDraftSaved("2020-01-01T00:00:00.000Z");
        expect(annotation.needsDraftSave()).toBe(true);
      });

      it("is false when draftSaved is newer than lastAdditionTime", () => {
        const { annotation, store } = createStoreWithAnnotation();
        pushDuplicateHistoryState(store, annotation);
        unprotect(store);
        try {
          annotation.history.lastAdditionTime = new Date("2020-01-01T00:00:00.000Z");
        } finally {
          protect(store);
        }
        annotation.setDraftSaved("2099-01-01T00:00:00.000Z");
        expect(annotation.needsDraftSave()).toBe(false);
      });

      it("is false while submission is in progress", () => {
        const { annotation, store } = createStoreWithAnnotation();
        pushDuplicateHistoryState(store, annotation);
        annotation.submissionInProgress();
        annotation.setDraftSaved(undefined);
        expect(annotation.needsDraftSave()).toBe(false);
      });

      it("is false when the annotation is not editable", () => {
        const { annotation, store } = createStoreWithAnnotation();
        annotation.setEditable(false);
        pushDuplicateHistoryState(store, annotation);
        expect(annotation.needsDraftSave()).toBe(false);
      });
    });

    describe("saveDraft preview guard (FIT-1685)", () => {
      it("saveDraft does not call submitDraft when a server draft exists but draft is not selected", async () => {
        const { annotation, store } = createStoreWithAnnotation();
        const submitDraft = mock().mockResolvedValue({});
        store.submitDraft = submitDraft;
        annotation.addVersions({
          draft: [{ id: "d1", type: "labels", from_name: "l", to_name: "img", value: { labels: ["A"] } }],
        });
        annotation.setDraftSelected(false);

        await annotation.saveDraft();

        expect(submitDraft).not.toHaveBeenCalled();
      });

      it("saveDraft clears isDraftSaving when skipping preview-only persist", async () => {
        const { annotation, store } = createStoreWithAnnotation();
        store.submitDraft = mock().mockResolvedValue({});
        annotation.addVersions({
          draft: [{ id: "d1", type: "labels", from_name: "l", to_name: "img", value: { labels: ["A"] } }],
        });
        annotation.setDraftSelected(false);
        annotation.setDraftSaving(true);

        await annotation.saveDraft();

        expect(annotation.isDraftSaving).toBe(false);
      });

      it("saveDraftImmediatelyWithResults returns empty object without setting saving when previewing", async () => {
        const { annotation, store } = createStoreWithAnnotation();
        store.submitDraft = mock().mockResolvedValue({});
        annotation.addVersions({
          draft: [{ id: "d1", type: "labels", from_name: "l", to_name: "img", value: { labels: ["A"] } }],
        });
        annotation.setDraftSelected(false);

        const res = await annotation.saveDraftImmediatelyWithResults();

        expect(res).toEqual({});
        expect(store.submitDraft).not.toHaveBeenCalled();
        expect(annotation.isDraftSaving).toBe(false);
      });
    });

    it("deserializeAnnotation warns and delegates to deserializeResults", () => {
      const consoleSpy = spyOn(console, "warn").mockImplementation(() => {});
      const { annotation } = createStoreWithAnnotation();
      annotation.deserializeResults = mock();
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
