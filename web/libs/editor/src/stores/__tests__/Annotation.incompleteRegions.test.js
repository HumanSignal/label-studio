/**
 * Regression tests for the annotation submission gate (BROS-1194).
 *
 * Submission must be blocked while any region is still "incomplete" — not only
 * polygons. A VideoVector region with fewer vertices than its `minPoints` is
 * incomplete and must keep Submit disabled, the same way an unclosed polygon does.
 *
 * Before the fix the annotation-level gate (`hasIncompletePolygons`) only looked
 * at `polygonregion` areas, so an incomplete VideoVector slipped through and the
 * annotation could be submitted with an unfinished region. The fix replaced it
 * with `hasIncompleteRegions`, backed by the pure `hasIncompleteRegion` helper
 * that inspects every area regardless of type.
 *
 * These tests exercise that helper directly. The previous version booted a full
 * editor store via `AppStore.create`, which depends on MST reference unions that
 * are frozen at import time and are therefore import-order sensitive in the test
 * runner — the tests passed in isolation but failed in the full suite once an
 * earlier file froze the union without the drawing-control tags registered.
 */
import { hasIncompleteRegion } from "../Annotation/Annotation";

// Minimal stand-ins for editor areas — the gate only reads `incomplete`.
const area = (type, incomplete) => ({ type, incomplete });

describe("hasIncompleteRegion (BROS-1194)", () => {
  it("is true when a VideoVector region is incomplete (below minPoints)", () => {
    const areas = [area("videovectorregion", true)];
    expect(hasIncompleteRegion(areas)).toBe(true);
  });

  it("is true for any non-polygon incomplete region, not only polygons", () => {
    // The bug: the old gate only checked `polygonregion`. A complete polygon
    // alongside an incomplete vector must still block submission.
    const areas = [area("polygonregion", false), area("vectorregion", true)];
    expect(hasIncompleteRegion(areas)).toBe(true);
  });

  it("still reports an unclosed polygon as incomplete (existing behavior preserved)", () => {
    const areas = [area("polygonregion", true)];
    expect(hasIncompleteRegion(areas)).toBe(true);
  });

  it("is false when every region is complete", () => {
    const areas = [area("videovectorregion", false), area("polygonregion", false), area("rectangleregion", false)];
    expect(hasIncompleteRegion(areas)).toBe(false);
  });

  it("is false when there are no regions", () => {
    expect(hasIncompleteRegion([])).toBe(false);
  });

  it("accepts any iterable of areas (e.g. an MST map's values())", () => {
    const map = new Map([
      ["a", area("videovectorregion", false)],
      ["b", area("videovectorregion", true)],
    ]);
    expect(hasIncompleteRegion(map.values())).toBe(true);
  });
});
