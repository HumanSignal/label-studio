import { installTolerantHitDetection } from "../konva-hit-tolerance";

// Konva's color key hex, without the leading '#'. Mirrors Konva.Util._rgbToHex.
const rgbToHex = (r: number, g: number, b: number) => ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);

/**
 * Minimal stand-in for Konva that reproduces the exact-color hit lookup the
 * patch wraps, so we can drive it without a real canvas/GPU.
 */
function makeFakeKonva() {
  const shapes: Record<string, unknown> = {};

  // Faithful reimplementation of Konva.Layer.prototype._getIntersection.
  function _getIntersection(this: any, pos: { x: number; y: number }) {
    const ratio = this.hitCanvas.pixelRatio;
    const p = this.hitCanvas.context.getImageData(Math.round(pos.x * ratio), Math.round(pos.y * ratio), 1, 1).data;
    if (p[3] === 255) {
      const shape = shapes[`#${rgbToHex(p[0], p[1], p[2])}`];
      if (shape) return { shape };
      return { antialiased: true };
    }
    if (p[3] > 0) return { antialiased: true };
    return {};
  }

  return {
    Layer: { prototype: { _getIntersection } },
    Util: { _rgbToHex: rgbToHex },
    shapes,
  } as any;
}

// Build a fake layer whose hit canvas returns a fixed pixel under the pointer.
const layerReading = (rgba: [number, number, number, number]) => ({
  hitCanvas: {
    pixelRatio: 1,
    context: { getImageData: () => ({ data: rgba }) },
  },
});

const intersect = (konva: any, rgba: [number, number, number, number]) =>
  konva.Layer.prototype._getIntersection.call(layerReading(rgba), { x: 5, y: 5 });

describe("installTolerantHitDetection", () => {
  it("leaves exact color-key matches untouched", () => {
    const konva = makeFakeKonva();
    const shape = { id: "exact" };
    konva.shapes[`#${rgbToHex(36, 94, 150)}`] = shape;
    installTolerantHitDetection(konva);

    expect(intersect(konva, [36, 94, 150, 255]).shape).toBe(shape);
  });

  it("resolves a shape when the read-back pixel drifts by ±1 per channel", () => {
    const konva = makeFakeKonva();
    const shape = { id: "drifted" };
    konva.shapes[`#${rgbToHex(36, 94, 150)}`] = shape; // registered key
    installTolerantHitDetection(konva);

    // GPU returned (37,95,150) instead of (36,94,150) — would miss without the patch.
    expect(intersect(konva, [37, 95, 150, 255]).shape).toBe(shape);
    // Without the patch this opaque miss is reported as antialiased.
    const konvaUnpatched = makeFakeKonva();
    konvaUnpatched.shapes[`#${rgbToHex(36, 94, 150)}`] = shape;
    expect(intersect(konvaUnpatched, [37, 95, 150, 255]).shape).toBeUndefined();
  });

  it("does not invent a hit for an opaque pixel with no ±1 neighbor registered", () => {
    const konva = makeFakeKonva();
    konva.shapes[`#${rgbToHex(10, 20, 30)}`] = { id: "far-away" };
    installTolerantHitDetection(konva);

    const res = intersect(konva, [200, 100, 50, 255]);
    expect(res.shape).toBeUndefined();
    expect(res.antialiased).toBe(true); // original behaviour preserved
  });

  it("ignores transparent / partial-alpha pixels (real edges)", () => {
    const konva = makeFakeKonva();
    konva.shapes[`#${rgbToHex(36, 94, 150)}`] = { id: "s" };
    installTolerantHitDetection(konva);

    expect(intersect(konva, [37, 95, 150, 0]).shape).toBeUndefined(); // transparent
    expect(intersect(konva, [37, 95, 150, 128]).antialiased).toBe(true); // edge
  });

  it("clamps channel search at the 0/255 boundaries", () => {
    const konva = makeFakeKonva();
    const shape = { id: "edge-color" };
    konva.shapes[`#${rgbToHex(0, 255, 1)}`] = shape;
    installTolerantHitDetection(konva);

    // Read-back drifted to (1,254,0); neighbor search must not overflow channels.
    expect(intersect(konva, [1, 254, 0, 255]).shape).toBe(shape);
  });

  it("is idempotent (does not double-wrap)", () => {
    const konva = makeFakeKonva();
    const wrappedOnce = (() => {
      installTolerantHitDetection(konva);
      return konva.Layer.prototype._getIntersection;
    })();
    installTolerantHitDetection(konva);
    expect(konva.Layer.prototype._getIntersection).toBe(wrappedOnce);
  });

  it("no-ops safely when Konva internals are missing", () => {
    expect(() => installTolerantHitDetection({} as any)).not.toThrow();
    expect(() => installTolerantHitDetection({ Layer: { prototype: {} } } as any)).not.toThrow();
  });
});
