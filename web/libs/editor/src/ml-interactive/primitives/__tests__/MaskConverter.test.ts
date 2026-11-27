/**
 * Unit tests for MaskConverter (ml-interactive/primitives/MaskConverter.ts).
 *
 * These are pure functions over binary masks — no DOM, no MST, no mocks
 * needed. We cover the marching-squares contour tracer, the skeleton
 * extractor, and the invariants they're supposed to hold (non-empty result
 * on non-empty input, bounded point counts, bounds-respecting output).
 */

import { maskToClosedVectors, maskToSkeletonVectors } from "../MaskConverter";

function buildRectMask(width: number, height: number, rect: { x: number; y: number; w: number; h: number }) {
  const mask = new Uint8Array(width * height);
  for (let y = rect.y; y < rect.y + rect.h; y++) {
    for (let x = rect.x; x < rect.x + rect.w; x++) {
      mask[y * width + x] = 1;
    }
  }
  return mask;
}

describe("maskToClosedVectors", () => {
  it("returns no contours for an empty mask", () => {
    const mask = new Uint8Array(10 * 10);
    expect(maskToClosedVectors(mask, 10, 10)).toEqual([]);
  });

  it("traces exactly one outer contour for a fully-foreground mask", () => {
    // Marching squares scans one cell outside the mask bounds, so the edge
    // between "inside all-foreground" and "outside implicit zero" produces
    // a single closed rectangle following the mask's perimeter.
    const mask = new Uint8Array(4 * 4).fill(1);
    const contours = maskToClosedVectors(mask, 4, 4);
    expect(contours).toHaveLength(1);
    expect(contours[0].length).toBeGreaterThanOrEqual(3);
  });

  it("produces a single closed contour for a solid rectangle", () => {
    const mask = buildRectMask(10, 10, { x: 2, y: 2, w: 5, h: 5 });
    const contours = maskToClosedVectors(mask, 10, 10);

    expect(contours).toHaveLength(1);
    const poly = contours[0];
    // A closed polygon needs at least 3 distinct vertices.
    expect(poly.length).toBeGreaterThanOrEqual(3);
  });

  it("bounds every polygon vertex inside the mask's padded extent", () => {
    // Marching squares emits edge midpoints that can sit at -0.5/width+0.5
    // around the foreground — bound against that slightly-expanded envelope.
    const mask = buildRectMask(8, 8, { x: 1, y: 1, w: 4, h: 4 });
    const [poly] = maskToClosedVectors(mask, 8, 8);

    for (const p of poly) {
      expect(p.x).toBeGreaterThanOrEqual(-1);
      expect(p.x).toBeLessThanOrEqual(8);
      expect(p.y).toBeGreaterThanOrEqual(-1);
      expect(p.y).toBeLessThanOrEqual(8);
    }
  });

  it("keeps only the largest blob by default when the mask has multiple components", () => {
    const mask = new Uint8Array(12 * 6);
    // Small blob on the left
    for (let y = 1; y < 3; y++) {
      for (let x = 1; x < 3; x++) mask[y * 12 + x] = 1;
    }
    // Larger blob on the right
    for (let y = 1; y < 5; y++) {
      for (let x = 7; x < 11; x++) mask[y * 12 + x] = 1;
    }

    const contours = maskToClosedVectors(mask, 12, 6);
    expect(contours).toHaveLength(1);
  });

  it("returns every component when simplification is disabled", () => {
    const mask = new Uint8Array(12 * 6);
    for (let y = 1; y < 5; y++) {
      for (let x = 1; x < 4; x++) mask[y * 12 + x] = 1;
      for (let x = 7; x < 11; x++) mask[y * 12 + x] = 1;
    }
    const contours = maskToClosedVectors(mask, 12, 6, 0.8, { simplify: false });
    expect(contours.length).toBeGreaterThanOrEqual(2);
  });

  it("fills internal holes so Swiss-cheese masks produce a single outer contour", () => {
    // 20×20 filled square with a 4×4 hole in the middle.
    const w = 20;
    const mask = new Uint8Array(w * w);
    for (let y = 2; y < w - 2; y++) {
      for (let x = 2; x < w - 2; x++) mask[y * w + x] = 1;
    }
    for (let y = 8; y < 12; y++) {
      for (let x = 8; x < 12; x++) mask[y * w + x] = 0;
    }
    const contours = maskToClosedVectors(mask, w, w);
    expect(contours).toHaveLength(1);
  });

  it("a higher simplifyTolerance produces fewer vertices (Douglas–Peucker)", () => {
    // 30×30 circle-ish blob — a good baseline for simplification to bite.
    const w = 30;
    const mask = new Uint8Array(w * w);
    for (let y = 0; y < w; y++) {
      for (let x = 0; x < w; x++) {
        const dx = x - 15;
        const dy = y - 15;
        if (dx * dx + dy * dy <= 100) mask[y * w + x] = 1;
      }
    }

    const tight = maskToClosedVectors(mask, w, w, 0.2)[0].length;
    const loose = maskToClosedVectors(mask, w, w, 2.0)[0].length;

    expect(loose).toBeLessThan(tight);
  });
});

describe("maskToSkeletonVectors", () => {
  it("returns no paths for an empty mask", () => {
    const mask = new Uint8Array(8 * 8);
    expect(maskToSkeletonVectors(mask, 8, 8)).toEqual([]);
  });

  it("produces at least one polyline for a horizontal 1-px line", () => {
    const w = 12;
    const h = 5;
    const mask = new Uint8Array(w * h);
    for (let x = 2; x < 10; x++) mask[2 * w + x] = 1; // row 2

    const paths = maskToSkeletonVectors(mask, w, h);
    expect(paths.length).toBeGreaterThanOrEqual(1);
    // A polyline needs ≥ 2 vertices to be renderable.
    expect(paths[0].length).toBeGreaterThanOrEqual(2);
  });

  it("skeleton path stays inside the original mask bounds", () => {
    const w = 16;
    const h = 16;
    const mask = buildRectMask(w, h, { x: 3, y: 3, w: 10, h: 2 });

    const paths = maskToSkeletonVectors(mask, w, h);
    for (const path of paths) {
      for (const p of path) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThan(w);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeLessThan(h);
      }
    }
  });
});
