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
});
