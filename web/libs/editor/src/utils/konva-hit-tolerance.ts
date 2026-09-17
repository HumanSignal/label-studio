import Konva from "konva";

/**
 * Make Konva's color-key hit detection tolerant of ±1 RGB drift.
 *
 * Konva identifies which shape is under the pointer by drawing every shape to
 * an offscreen "hit" canvas filled with a unique color key, then reading the
 * pixel under the pointer back with `getImageData` and looking the color up in
 * `Konva.shapes`. This requires `getImageData` to return the *exact* bytes that
 * were written.
 *
 * On some GPU-accelerated canvas implementations (observed on Chrome / Linux,
 * regardless of `willReadFrequently`) `getImageData` rounds solid colors by ±1
 * per channel. The exact lookup then misses, and the click "falls through".
 * This hits small targets hardest — most visibly the 8px image Transformer
 * resize handles, which become unclickable when zoomed (a non-integer stage
 * scale makes the miss rate worse), and occasionally drops region-selection
 * clicks too.
 *
 * Konva's built-in recovery (spiral search to neighbouring pixel *positions*)
 * doesn't help here: the whole anchor footprint reads the same drifted color,
 * so no nearby position carries the exact key either.
 *
 * Fix: on an opaque-pixel miss, search the 26 color keys within ±1 RGB of the
 * read-back value and resolve to that shape. The true shape's exact key is by
 * definition one of those neighbours (the read-back drifted from it by ≤1).
 * Color keys are spread across 16.7M values, so the chance a ±1 neighbour is a
 * *different* registered shape is negligible (~0.02% worst case, a single-pixel
 * mishit). The extra work only runs on a miss, so healthy hits pay nothing.
 */

const PATCH_FLAG = "__lsTolerantHitPatched";
const HASH = "#";

type HitLayer = {
  hitCanvas: { pixelRatio: number; context: { getImageData(x: number, y: number, w: number, h: number): ImageData } };
};

type IntersectionResult = { shape?: unknown; antialiased?: boolean };

export function installTolerantHitDetection(konva: typeof Konva = Konva): void {
  const konvaAny = konva as unknown as Record<string, any>;
  const layerProto = konva.Layer?.prototype as unknown as
    | { _getIntersection?: (pos: { x: number; y: number }) => IntersectionResult }
    | undefined;

  // Bail out gracefully if already patched or if Konva's internals changed
  // shape (e.g. after a version upgrade) — never break hit detection.
  if (!layerProto || typeof layerProto._getIntersection !== "function") return;
  if (konvaAny[PATCH_FLAG]) return;

  const original = layerProto._getIntersection;
  const rgbToHex = konva.Util?._rgbToHex?.bind(konva.Util);
  if (typeof rgbToHex !== "function") return;

  layerProto._getIntersection = function (this: HitLayer, pos: { x: number; y: number }): IntersectionResult {
    const result = original.call(this, pos);
    // Exact match (or no opaque pixel) — keep Konva's behaviour untouched.
    if (result.shape) return result;

    const ratio = this.hitCanvas.pixelRatio;
    const p = this.hitCanvas.context.getImageData(Math.round(pos.x * ratio), Math.round(pos.y * ratio), 1, 1).data;
    // Only fully-opaque pixels carry a color key; partial alpha is a real edge.
    if (p[3] !== 255) return result;

    for (let dr = -1; dr <= 1; dr++) {
      for (let dg = -1; dg <= 1; dg++) {
        for (let db = -1; db <= 1; db++) {
          if (!dr && !dg && !db) continue; // exact key already tried by `original`
          const r = p[0] + dr;
          const g = p[1] + dg;
          const b = p[2] + db;
          if (r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) continue;
          const shape = konvaAny.shapes[HASH + rgbToHex(r, g, b)];
          if (shape) return { shape };
        }
      }
    }

    return result;
  };

  konvaAny[PATCH_FLAG] = true;
}
