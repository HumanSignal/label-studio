import { appendFreehandPoint, simplifyFreehandPoints } from "../freehand";

describe("freehand utilities", () => {
  it("keeps only endpoints for a straight trace", () => {
    expect(
      simplifyFreehandPoints(
        [
          [0, 0],
          [1, 0.1],
          [2, -0.1],
          [3, 0],
        ],
        0.2,
      ),
    ).toEqual([
      { x: 0, y: 0 },
      { x: 3, y: 0 },
    ]);
  });

  it("preserves corners outside the Douglas-Peucker tolerance", () => {
    expect(
      simplifyFreehandPoints(
        [
          [0, 0],
          [5, 0],
          [5, 5],
          [10, 5],
        ],
        1,
      ),
    ).toEqual([
      { x: 0, y: 0 },
      { x: 5, y: 0 },
      { x: 5, y: 5 },
      { x: 10, y: 5 },
    ]);
  });

  it("filters invalid, duplicate, and too-close samples", () => {
    const first = appendFreehandPoint([], { x: 1, y: 1 });
    const unchanged = appendFreehandPoint(first, { x: 1.5, y: 1.5 }, 2);
    const extended = appendFreehandPoint(unchanged, { x: 4, y: 1 }, 2);

    expect(unchanged).toBe(first);
    expect(appendFreehandPoint(extended, { x: Number.NaN, y: 1 })).toBe(extended);
    expect(extended).toEqual([
      { x: 1, y: 1 },
      { x: 4, y: 1 },
    ]);
  });
});
