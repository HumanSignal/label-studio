/**
 * Unit tests for mask-output (ml-interactive/primitives/mask-output.ts).
 *
 * Focus: BROS-1221 — SAM2-generated VideoVector regions must reflect the
 * detected region. The conversion always traces the region's boundary
 * contour (marching squares) and the `closed` flag follows the control's
 * `closable` attribute. A non-closable vector is the same boundary contour
 * left open — NOT a medial-axis skeleton collapsed to a single centerline.
 */

import { maskToLargestShape, maskToShapes } from "../mask-output";

function buildRectMask(width: number, height: number, rect: { x: number; y: number; w: number; h: number }) {
  const mask = new Uint8Array(width * height);
  for (let y = rect.y; y < rect.y + rect.h; y++) {
    for (let x = rect.x; x < rect.x + rect.w; x++) {
      mask[y * width + x] = 1;
    }
  }
  return mask;
}

function bbox(vertices: Array<{ x: number; y: number }>) {
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const v of vertices) {
    if (v.x < minX) minX = v.x;
    if (v.x > maxX) maxX = v.x;
    if (v.y < minY) minY = v.y;
    if (v.y > maxY) maxY = v.y;
  }
  return { width: maxX - minX, height: maxY - minY };
}

describe("maskToLargestShape", () => {
  const W = 40;
  const H = 40;
  // A solid 20×16 block centred in the frame. As percentages that's a region
  // spanning ~50% of the width and ~40% of the height.
  const rectMask = buildRectMask(W, H, { x: 10, y: 12, w: 20, h: 16 });

  it("returns null for an empty mask", () => {
    const mask = new Uint8Array(W * H);
    expect(maskToLargestShape(mask, W, H, 512, 0.8, false)).toBeNull();
  });

  it("traces the region boundary (not a collapsed centerline) for a non-closable vector", () => {
    const shape = maskToLargestShape(rectMask, W, H, 512, 0.8, false);
    expect(shape).not.toBeNull();
    const { width, height } = bbox(shape!.vertices);
    // The contour must span both dimensions of the block. A medial-axis
    // skeleton of this block would collapse to a near-1D line (height ~ 0),
    // so this assertion is exactly what the skeleton conversion failed.
    expect(width).toBeGreaterThan(30); // ~50% of frame width
    expect(height).toBeGreaterThan(25); // ~40% of frame height
    // A boundary needs more than the two endpoints of a line segment.
    expect(shape!.vertices.length).toBeGreaterThan(2);
  });

  it("emits an open path (closed:false) when the control is not closable", () => {
    const shape = maskToLargestShape(rectMask, W, H, 512, 0.8, false);
    expect(shape!.closed).toBe(false);
  });

  it("emits a closed polygon (closed:true) when the control is closable", () => {
    const shape = maskToLargestShape(rectMask, W, H, 512, 0.8, true);
    expect(shape!.closed).toBe(true);
    // Closing the path does not change which region it traces.
    const { width, height } = bbox(shape!.vertices);
    expect(width).toBeGreaterThan(30);
    expect(height).toBeGreaterThan(25);
  });
});

describe("maskToShapes", () => {
  it("propagates the requested closed flag to every shape", () => {
    const W = 24;
    const H = 24;
    const mask = buildRectMask(W, H, { x: 4, y: 4, w: 12, h: 12 });

    const open = maskToShapes(mask, W, H, 512, 0.8, false);
    const closed = maskToShapes(mask, W, H, 512, 0.8, true);

    expect(open.length).toBeGreaterThan(0);
    expect(closed.length).toBeGreaterThan(0);
    expect(open.every((s) => s.closed === false)).toBe(true);
    expect(closed.every((s) => s.closed === true)).toBe(true);
  });
});
