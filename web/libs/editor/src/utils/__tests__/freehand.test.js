import {
  appendFreehandPoint,
  buildFreehandRepairContour,
  findNearestContourPoint,
  FREEHAND_REPAIR_MIN_RAW_POINTS,
  FREEHAND_REPAIR_SNAP_RADIUS,
  hasFreehandContourSelfIntersection,
  isValidFreehandContour,
  simplifyFreehandPoints,
} from "../freehand";

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

  it("validates closed contours without misclassifying the wraparound edge", () => {
    const triangle = [
      { x: 1, y: 0 },
      { x: 2, y: 1 },
      { x: 0, y: 1 },
    ];

    expect(hasFreehandContourSelfIntersection(triangle)).toBe(false);
    expect(isValidFreehandContour(triangle)).toBe(true);
    expect(hasFreehandContourSelfIntersection(triangle, { maxComparisons: 0 })).toBeNull();
    expect(
      hasFreehandContourSelfIntersection([
        [0, 0],
        [10, 10],
        [0, 10],
        [10, 0],
      ]),
    ).toBe(true);
  });

  it("detects intersections introduced when valid input points are snapped", () => {
    const beforeSnapping = [
      [10.1043889262, 9.770172186],
      [12.4084808717, 10.9182869663],
      [10.4475965089, 11.7840321064],
      [11.0435366642, 10.279983292],
    ];
    const afterSnapping = beforeSnapping.map(([x, y]) => [Math.round(x), Math.round(y)]);

    expect(hasFreehandContourSelfIntersection(beforeSnapping)).toBe(false);
    expect(hasFreehandContourSelfIntersection(afterSnapping)).toBe(true);
    expect(isValidFreehandContour(afterSnapping)).toBe(false);
  });

  describe("contour repair", () => {
    const square = [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ];

    const signedArea = (points) =>
      points.reduce((area, point, index) => {
        const next = points[(index + 1) % points.length];
        return area + point.x * next.y - next.x * point.y;
      }, 0);

    it("exposes stable gesture defaults", () => {
      expect(FREEHAND_REPAIR_MIN_RAW_POINTS).toBe(8);
      expect(FREEHAND_REPAIR_SNAP_RADIUS).toBe(12);
    });

    it("projects a canvas point onto the nearest closed-contour segment", () => {
      expect(findNearestContourPoint(square, { x: 4, y: 3 })).toMatchObject({
        point: { x: 4, y: 0 },
        segmentIndex: 0,
        t: 0.4,
        position: 0.4,
        distance: 3,
        perimeterOffset: 4,
        perimeter: 40,
      });
      expect(findNearestContourPoint(square, [-1, 5])).toMatchObject({
        point: { x: 0, y: 5 },
        segmentIndex: 3,
        t: 0.5,
        position: 3.5,
      });
    });

    it("snaps endpoints and replaces the boundary arc nearest the trace", () => {
      const repair = buildFreehandRepairContour(
        square,
        [
          [0, 1],
          [4, 4],
          [10, 1],
        ],
        { snapRadius: 2 },
      );

      expect(repair).toMatchObject({
        replacedArc: "forward",
        startAnchor: { point: { x: 0, y: 1 }, segmentIndex: 3 },
        endAnchor: { point: { x: 10, y: 1 }, segmentIndex: 1 },
      });
      expect(repair.points).toEqual([
        { x: 0, y: 1 },
        { x: 4, y: 4 },
        { x: 10, y: 1 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
      ]);
    });

    it("handles a replaced arc that wraps across the contour's last vertex", () => {
      const repair = buildFreehandRepairContour(
        square,
        [
          [0, 8],
          [-2, 4],
          [2, 0],
        ],
        { snapRadius: 0 },
      );

      expect(repair.replacedArc).toBe("forward");
      expect(repair.points).toEqual([
        { x: 0, y: 8 },
        { x: -2, y: 4 },
        { x: 2, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
      ]);
    });

    it("preserves winding when the same local repair is drawn in reverse", () => {
      const repair = buildFreehandRepairContour(
        square,
        [
          [8, 0],
          [5, -2],
          [2, 0],
        ],
        { snapRadius: 0 },
      );

      expect(repair.replacedArc).toBe("backward");
      expect(repair.points).toEqual([
        { x: 8, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
        { x: 0, y: 0 },
        { x: 2, y: 0 },
        { x: 5, y: -2 },
      ]);
      expect(Math.sign(signedArea(repair.points))).toBe(Math.sign(signedArea(square.map(([x, y]) => ({ x, y })))));
    });

    it("uses trace proximity before length, allowing an intended long-arc repair", () => {
      const repair = buildFreehandRepairContour(
        square,
        [
          [0, 0],
          [-2, 5],
          [0, 10],
          [10, 10],
          [12, 5],
          [10, 0],
        ],
        { snapRadius: 0 },
      );

      expect(repair.replacedArc).toBe("backward");
      expect(repair.points).toEqual([
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 12, y: 5 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
        { x: -2, y: 5 },
      ]);
    });

    it("uses the shorter boundary arc only when proximity is effectively tied", () => {
      const tinySquare = [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
      ];
      const repair = buildFreehandRepairContour(tinySquare, [
        [0, 0],
        [0.5, -0.1],
        [1, 0],
      ]);

      expect(repair.replacedArc).toBe("forward");
    });

    it("rejects an ambiguous equal-proximity, equal-length repair", () => {
      expect(
        buildFreehandRepairContour(
          square,
          [
            [0, 5],
            [5, 5],
            [10, 5],
          ],
          { snapRadius: 0 },
        ),
      ).toBeNull();
    });

    it("rejects unsnapped or coincident endpoints", () => {
      expect(
        buildFreehandRepairContour(
          square,
          [
            [5, 5],
            [7, 7],
            [10, 1],
          ],
          { snapRadius: 2 },
        ),
      ).toBeNull();
      expect(
        buildFreehandRepairContour(
          square,
          [
            [0, 1],
            [2, 2],
            [0, 1],
          ],
          { snapRadius: 2 },
        ),
      ).toBeNull();
    });

    it("rejects invalid source contours and self-degenerate repaired contours", () => {
      const selfIntersectingContour = [
        [0, 0],
        [10, 10],
        [0, 10],
        [10, 0],
      ];

      expect(buildFreehandRepairContour(selfIntersectingContour, square.slice(0, 3))).toBeNull();
      expect(
        buildFreehandRepairContour(
          square,
          [
            [2, 0],
            [12, 5],
            [5, 12],
            [8, 0],
          ],
          { snapRadius: 0 },
        ),
      ).toBeNull();
      expect(
        buildFreehandRepairContour(square, [
          [0, 1],
          [Number.NaN, 2],
          [10, 1],
        ]),
      ).toBeNull();
    });

    it("preserves a clockwise source contour without adding a repeated closing point", () => {
      const clockwiseSquare = [
        [0, 0],
        [0, 10],
        [10, 10],
        [10, 0],
        [0, 0],
      ];
      const repair = buildFreehandRepairContour(
        clockwiseSquare,
        [
          [0, 2],
          [-2, 5],
          [0, 8],
        ],
        { snapRadius: 0 },
      );

      expect(repair).not.toBeNull();
      expect(Math.sign(signedArea(repair.points))).toBe(-1);
      expect(repair.points[repair.points.length - 1]).not.toEqual(repair.points[0]);
    });
  });
});
