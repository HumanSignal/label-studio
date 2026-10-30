import { describe, it, expect } from "bun:test";
import { getColumnDropTarget, reorderColumnIds } from "./columnDrop";

// Three adjacent 100px columns in viewport coordinates, starting at x=50.
const rects = [
  { left: 50, right: 150 },
  { left: 150, right: 250 },
  { left: 250, right: 350 },
];

describe("getColumnDropTarget (FIT-3307)", () => {
  it("targets the gap before the first column when the pointer is left of its midpoint", () => {
    expect(getColumnDropTarget(rects, 60)).toEqual({ gapIndex: 0, offset: 50 });
  });

  it("targets the gap before the first column when the pointer is left of the whole header", () => {
    expect(getColumnDropTarget(rects, -20)).toEqual({ gapIndex: 0, offset: 50 });
  });

  it("targets the gap between two columns when the pointer is past the first midpoint", () => {
    expect(getColumnDropTarget(rects, 120)).toEqual({ gapIndex: 1, offset: 150 });
    expect(getColumnDropTarget(rects, 190)).toEqual({ gapIndex: 1, offset: 150 });
  });

  it("switches gap exactly at a column midpoint", () => {
    expect(getColumnDropTarget(rects, 99).gapIndex).toBe(0);
    expect(getColumnDropTarget(rects, 100).gapIndex).toBe(1);
  });

  it("targets the gap after the last column when the pointer is past its midpoint", () => {
    expect(getColumnDropTarget(rects, 310)).toEqual({ gapIndex: 3, offset: 350 });
  });

  it("targets the gap after the last column when the pointer is right of the whole header", () => {
    expect(getColumnDropTarget(rects, 5000)).toEqual({ gapIndex: 3, offset: 350 });
  });

  it("works for a single column", () => {
    const single = [{ left: 10, right: 110 }];
    expect(getColumnDropTarget(single, 20)).toEqual({ gapIndex: 0, offset: 10 });
    expect(getColumnDropTarget(single, 100)).toEqual({ gapIndex: 1, offset: 110 });
  });

  it("returns null when there are no columns", () => {
    expect(getColumnDropTarget([], 10)).toBeNull();
  });

  it("only depends on viewport rects, so horizontal scroll does not matter", () => {
    // Same table scrolled 400px left: rects shift, pointer shifts with the content under it.
    const scrolled = rects.map((r) => ({ left: r.left - 400, right: r.right - 400 }));
    expect(getColumnDropTarget(scrolled, 120 - 400)).toEqual({ gapIndex: 1, offset: 150 - 400 });
  });
});

describe("reorderColumnIds (FIT-3307)", () => {
  const ids = ["a", "b", "c", "d"];

  it("moves a column to the start", () => {
    expect(reorderColumnIds(ids, "c", 0)).toEqual(["c", "a", "b", "d"]);
  });

  it("moves a column to the end (past the last column, not before it)", () => {
    expect(reorderColumnIds(ids, "a", 4)).toEqual(["b", "c", "d", "a"]);
  });

  it("moves a column forward into a middle gap", () => {
    expect(reorderColumnIds(ids, "a", 3)).toEqual(["b", "c", "a", "d"]);
  });

  it("moves a column backward into a middle gap", () => {
    expect(reorderColumnIds(ids, "d", 1)).toEqual(["a", "d", "b", "c"]);
  });

  it("keeps the order when dropped in the gap right before itself", () => {
    expect(reorderColumnIds(ids, "b", 1)).toEqual(ids);
  });

  it("keeps the order when dropped in the gap right after itself", () => {
    expect(reorderColumnIds(ids, "b", 2)).toEqual(ids);
  });

  it("keeps the order when the last column is dropped at the end", () => {
    expect(reorderColumnIds(ids, "d", 4)).toEqual(ids);
  });

  it("keeps the order when the first column is dropped at the start", () => {
    expect(reorderColumnIds(ids, "a", 0)).toEqual(ids);
  });

  it("does not mutate the input and returns the same order for an unknown id", () => {
    const input = [...ids];
    expect(reorderColumnIds(input, "zzz", 2)).toEqual(ids);
    reorderColumnIds(input, "a", 3);
    expect(input).toEqual(ids);
  });
});
