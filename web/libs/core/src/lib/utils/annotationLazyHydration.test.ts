import { annotationNeedsHydration, applyAnnotationHydrationFromApi } from "./annotationLazyHydration";
import type { Mock } from "bun:test";

describe("annotationNeedsHydration", () => {
  it("returns false for non-annotation", () => {
    expect(annotationNeedsHydration(null)).toBe(false);
    expect(annotationNeedsHydration({ type: "prediction" })).toBe(false);
  });

  it("returns false for in-session user-generated draft", () => {
    expect(
      annotationNeedsHydration({
        type: "annotation",
        userGenerate: true,
        sentUserGenerate: false,
      }),
    ).toBe(false);
  });

  it("returns false when versions.result has items", () => {
    expect(
      annotationNeedsHydration({
        type: "annotation",
        userGenerate: false,
        versions: { result: [{ id: "a" }] },
        areas: { size: 0 },
      }),
    ).toBe(false);
  });

  it("returns false when areas are present", () => {
    expect(
      annotationNeedsHydration({
        type: "annotation",
        userGenerate: false,
        versions: { result: [] },
        areas: { size: 2 },
      }),
    ).toBe(false);
  });

  it("returns true for lazy stub (empty result, no regions, persisted)", () => {
    expect(
      annotationNeedsHydration({
        type: "annotation",
        userGenerate: false,
        versions: { result: [] },
        areas: { size: 0 },
      }),
    ).toBe(true);
  });
});

describe("applyAnnotationHydrationFromApi", () => {
  beforeEach(() => {
    const mst = require("mobx-state-tree");
    (mst.isAlive as Mock<any>).mockReturnValue(true);
  });

  it("returns false when payload missing result", () => {
    expect(applyAnnotationHydrationFromApi([], 1, { error: "x" })).toBe(false);
    expect(applyAnnotationHydrationFromApi([], 1, null)).toBe(false);
  });

  it("returns false when annotation pk not found", () => {
    expect(applyAnnotationHydrationFromApi([{ pk: "2" }], 1, { result: [] })).toBe(false);
  });

  it("deserializes result and reinitializes history", () => {
    const ann = {
      pk: "5",
      versions: { result: [] },
      areas: { size: 0 },
      trackedState: {},
      deserializeResults: mock(),
      updateObjects: mock(),
      reinitHistory: mock(),
      history: { freeze: mock(), safeUnfreeze: mock() },
    };
    const result = [{ id: "region-1" }];
    expect(applyAnnotationHydrationFromApi([ann], 5, { result })).toBe(true);
    expect(ann.deserializeResults).toHaveBeenCalledWith(result);
    expect(ann.history.freeze).toHaveBeenCalled();
    expect(ann.updateObjects).toHaveBeenCalled();
    expect(ann.history.safeUnfreeze).toHaveBeenCalled();
    expect(ann.reinitHistory).toHaveBeenCalled();
  });

  it("returns false when already hydrated and server result matches local", () => {
    const serverResult = [{ id: "x" }];
    const ann = {
      pk: "1",
      versions: { result: [] },
      areas: { size: 1 },
      trackedState: {},
      deserializeResults: mock(),
      serializeAnnotation: () => serverResult,
    };
    expect(applyAnnotationHydrationFromApi([ann], 1, { result: serverResult })).toBe(false);
    expect(ann.deserializeResults).not.toHaveBeenCalled();
  });

  it("re-applies server result when regions exist but payload differs (FIT-1660)", () => {
    const ann = {
      pk: "1",
      versions: { result: [] },
      areas: { size: 1 },
      trackedState: {},
      serializeAnnotation: () => [{ stale: true }],
      addVersions: mock(),
      deserializeResults: mock(),
      updateObjects: mock(),
      reinitHistory: mock(),
      history: { freeze: mock(), safeUnfreeze: mock() },
    };
    const serverResult = [{ fresh: true }];
    expect(applyAnnotationHydrationFromApi([ann], 1, { result: serverResult })).toBe(true);
    expect(ann.deserializeResults).toHaveBeenCalledWith(serverResult);
    expect(ann.updateObjects).toHaveBeenCalled();
    expect(ann.reinitHistory).toHaveBeenCalled();
  });

  it("preserves local draft regions when draftSelected=true and defers to versions.result (FIT-1681)", () => {
    // Repro: after a Submit + reorder in Quick View, lsf-sdk#setAnnotation applies the saved draft
    // on top of the persisted annotation. The annotation now has regions reflecting the DRAFT
    // and differs from the server's submitted `result`. A subsequent _hydrateStubAnnotation call
    // MUST NOT overwrite those draft regions with the server's submitted result — doing so
    // wipes the draft from the LSF view and the next autosave then saves the submitted state
    // as the new draft, losing the user's work.
    const draftRegions = [{ id: "reordered-region", draft: true }];
    const serverResult = [{ id: "submitted-region", draft: false }];
    const addVersions = mock();
    const ann = {
      pk: "42",
      draftSelected: true,
      versions: { result: [], draft: draftRegions },
      areas: { size: 1 },
      trackedState: {},
      serializeAnnotation: () => draftRegions,
      addVersions,
      deserializeResults: mock(),
      updateObjects: mock(),
      reinitHistory: mock(),
      history: { freeze: mock(), safeUnfreeze: mock() },
    };

    const applied = applyAnnotationHydrationFromApi([ann], 42, { result: serverResult });

    expect(applied).toBe(false);
    // Server result must never replace the live draft regions.
    expect(ann.deserializeResults).not.toHaveBeenCalled();
    expect(ann.updateObjects).not.toHaveBeenCalled();
    expect(ann.reinitHistory).not.toHaveBeenCalled();
    // But versions.result should be populated so the annotation is logically hydrated
    // (prevents repeated re-hydration attempts and keeps Submit/Update button state correct).
    expect(addVersions).toHaveBeenCalledWith({ result: serverResult });
  });

  it("preserves local work when versions.draft is present even without draftSelected flag (FIT-1681)", () => {
    // Defensive: older code paths or race conditions may leave `versions.draft` set while
    // `draftSelected` is briefly false. Either signal must block server-result re-apply.
    const draftRegions = [{ id: "local-draft" }];
    const serverResult = [{ id: "submitted" }];
    const addVersions = mock();
    const ann = {
      pk: "43",
      draftSelected: false,
      versions: { result: [], draft: draftRegions },
      areas: { size: 1 },
      trackedState: {},
      serializeAnnotation: () => draftRegions,
      addVersions,
      deserializeResults: mock(),
      updateObjects: mock(),
      reinitHistory: mock(),
      history: { freeze: mock(), safeUnfreeze: mock() },
    };

    const applied = applyAnnotationHydrationFromApi([ann], 43, { result: serverResult });

    expect(applied).toBe(false);
    expect(ann.deserializeResults).not.toHaveBeenCalled();
    expect(addVersions).toHaveBeenCalledWith({ result: serverResult });
  });
});
