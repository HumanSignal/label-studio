import { mock, describe, it, expect, beforeEach, afterEach, spyOn } from "bun:test";
import * as mst from "mobx-state-tree";
import { annotationNeedsHydration, applyAnnotationHydrationFromApi } from "./annotationLazyHydration";

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
  let isAliveSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    isAliveSpy = spyOn(mst, "isAlive").mockReturnValue(true);
  });

  afterEach(() => {
    isAliveSpy?.mockRestore();
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

  it("re-apply path clears existing regions before deserializing server result (FIT-1669)", () => {
    // Repro: when regions are re-hydrated on scroll in Compare All, `deserializeResults`
    // on a live annotation with existing areas stacks new results on top of them. The
    // hydration helper must `deleteAllRegions({ deleteReadOnly: true })` first so the
    // rebuild starts from a clean slate and the Outliner never renders ghost regions.
    const deleteAllRegions = mock();
    const deserializeResults = mock();
    const ann = {
      pk: "9",
      versions: { result: [] },
      areas: { size: 1 },
      trackedState: {},
      serializeAnnotation: () => [{ stale: true }],
      addVersions: mock(),
      deleteAllRegions,
      deserializeResults,
      updateObjects: mock(),
      reinitHistory: mock(),
      history: { freeze: mock(), safeUnfreeze: mock() },
    };
    const serverResult = [{ fresh: true }];

    expect(applyAnnotationHydrationFromApi([ann], 9, { result: serverResult })).toBe(true);
    expect(deleteAllRegions).toHaveBeenCalledWith({ deleteReadOnly: true });

    // Ordering matters: the region wipe must precede the deserialize call.
    const wipeOrder = deleteAllRegions.mock.invocationCallOrder?.[0];
    const deserializeOrder = deserializeResults.mock.invocationCallOrder?.[0];
    expect(wipeOrder).toBeLessThan(deserializeOrder);
  });

  it("safeUnfreeze does not run if isAlive flips to false after freeze (FIT-1669)", () => {
    // If `isAlive` flips off between `freeze` and `deserializeResults` (e.g. the
    // annotation is torn down by a concurrent selection change), safeUnfreeze MUST
    // NOT be called or MST will throw an assertion error on the dead object.
    let calls = 0;
    isAliveSpy.mockImplementation(() => {
      calls += 1;
      // Alive on initial guard and after-freeze check, then dead for all subsequent calls.
      return calls <= 2;
    });

    const safeUnfreeze = mock();
    const ann = {
      pk: "11",
      versions: { result: [] },
      areas: { size: 0 },
      trackedState: {},
      addVersions: mock(),
      deserializeResults: mock(),
      updateObjects: mock(),
      reinitHistory: mock(),
      history: { freeze: mock(), safeUnfreeze },
    };

    applyAnnotationHydrationFromApi([ann], 11, { result: [{ id: "r" }] });

    expect(ann.history.freeze).toHaveBeenCalled();
    expect(safeUnfreeze).not.toHaveBeenCalled();
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
