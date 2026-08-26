/**
 * Converts binary segmentation masks to vector paths.
 *
 * Extension point — add new converters here for brush, bitmask, etc.
 */

interface Point {
  x: number;
  y: number;
}

/**
 * Marching-squares contour extraction → Douglas-Peucker simplification.
 * Returns array of closed polygons (one per foreground blob, outer boundary
 * only), each as an array of {x, y} in pixel coordinates.
 *
 * By default the mask is simplified before tracing: only the largest
 * connected component is kept and any internal holes are filled. That
 * prevents SAM masks with scattered speckles or Swiss-cheese interiors
 * from producing hundreds of tiny regions on Accept. Pass
 * `{ simplify: false }` to fall back to raw multi-component tracing.
 */
const MAX_RAW_POINTS = 5000;

export interface MaskTraceOptions {
  /** Keep only the largest connected component + fill holes. Default true. */
  simplify?: boolean;
}

export function maskToClosedVectors(
  mask: Uint8Array,
  width: number,
  height: number,
  simplifyTolerance = 0.8,
  options: MaskTraceOptions = {},
): Point[][] {
  const { simplify = true } = options;
  const traceMask = simplify ? simplifyMask(mask, width, height) : mask;
  const contours = traceContours(traceMask, width, height);
  return contours.map((c) => douglasPeucker(thinIfNeeded(c), simplifyTolerance));
}

/**
 * Largest connected component + hole fill, in pixel space. Cheap (O(W*H))
 * and deterministic — we'd rather spend the CPU here than ship 100-region
 * polygons to the timeline.
 */
function simplifyMask(mask: Uint8Array, width: number, height: number): Uint8Array {
  const largest = keepLargestComponent(mask, width, height);
  return fillHoles(largest, width, height);
}

/**
 * 4-connected flood-fill labelling. Returns a new binary mask with only
 * the largest component preserved (by pixel count). If the input is empty,
 * returns a copy of the input.
 */
function keepLargestComponent(mask: Uint8Array, width: number, height: number): Uint8Array {
  const labels = new Int32Array(mask.length);
  const queue = new Int32Array(mask.length);
  let bestSize = 0;
  let bestLabel = 0;
  let nextLabel = 0;
  const sizes: number[] = [0]; // 1-indexed; index 0 unused

  for (let i = 0; i < mask.length; i++) {
    if (!mask[i] || labels[i]) continue;
    nextLabel += 1;
    let size = 0;
    let head = 0;
    let tail = 0;
    queue[tail++] = i;
    labels[i] = nextLabel;
    while (head < tail) {
      const idx = queue[head++];
      size += 1;
      const x = idx % width;
      const y = (idx - x) / width;
      // 4-connected neighbours
      if (x > 0) {
        const n = idx - 1;
        if (mask[n] && !labels[n]) {
          labels[n] = nextLabel;
          queue[tail++] = n;
        }
      }
      if (x < width - 1) {
        const n = idx + 1;
        if (mask[n] && !labels[n]) {
          labels[n] = nextLabel;
          queue[tail++] = n;
        }
      }
      if (y > 0) {
        const n = idx - width;
        if (mask[n] && !labels[n]) {
          labels[n] = nextLabel;
          queue[tail++] = n;
        }
      }
      if (y < height - 1) {
        const n = idx + width;
        if (mask[n] && !labels[n]) {
          labels[n] = nextLabel;
          queue[tail++] = n;
        }
      }
    }
    sizes.push(size);
    if (size > bestSize) {
      bestSize = size;
      bestLabel = nextLabel;
    }
  }

  if (bestLabel === 0) return new Uint8Array(mask); // empty

  const out = new Uint8Array(mask.length);
  for (let i = 0; i < mask.length; i++) {
    if (labels[i] === bestLabel) out[i] = 1;
  }
  return out;
}

/**
 * Flood-fill the 0-background from the image border. Any 0-pixel that the
 * flood can't reach is enclosed by foreground — a hole — so we flip it to
 * 1. Removes the "Swiss cheese" look SAM sometimes produces on textured
 * objects.
 */
function fillHoles(mask: Uint8Array, width: number, height: number): Uint8Array {
  const reachable = new Uint8Array(mask.length);
  const queue = new Int32Array(mask.length);
  let head = 0;
  let tail = 0;

  const pushIfBg = (idx: number) => {
    if (mask[idx] || reachable[idx]) return;
    reachable[idx] = 1;
    queue[tail++] = idx;
  };

  // Seed from all border pixels
  for (let x = 0; x < width; x++) {
    pushIfBg(x);
    pushIfBg((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    pushIfBg(y * width);
    pushIfBg(y * width + (width - 1));
  }

  while (head < tail) {
    const idx = queue[head++];
    const x = idx % width;
    const y = (idx - x) / width;
    if (x > 0) pushIfBg(idx - 1);
    if (x < width - 1) pushIfBg(idx + 1);
    if (y > 0) pushIfBg(idx - width);
    if (y < height - 1) pushIfBg(idx + width);
  }

  const out = new Uint8Array(mask.length);
  for (let i = 0; i < mask.length; i++) {
    // Foreground stays foreground; unreached background (= hole) becomes foreground.
    out[i] = mask[i] || !reachable[i] ? 1 : 0;
  }
  return out;
}

/**
 * Skeleton extraction (Zhang-Suen thinning) → branch paths.
 * Returns array of polyline paths (open) in pixel coordinates.
 *
 * Skeletons of fragmented masks produce one path per fragment, which is
 * rarely what the user wants. We default to the largest-connected-component
 * filter; hole-fill is intentionally skipped because it would collapse the
 * skeleton of ring-shaped objects.
 */
export function maskToSkeletonVectors(
  mask: Uint8Array,
  width: number,
  height: number,
  simplifyTolerance = 1.0,
  options: MaskTraceOptions = {},
): Point[][] {
  const { simplify = true } = options;
  const traceMask = simplify ? keepLargestComponent(mask, width, height) : mask;
  const skeleton = zhangSuenThinning(traceMask, width, height);
  const paths = traceSkeletonPaths(skeleton, width, height);
  return paths.map((p) => douglasPeucker(thinIfNeeded(p), simplifyTolerance));
}

/** Evenly thin a point list to MAX_RAW_POINTS to bound D-P's O(n^2) cost. */
function thinIfNeeded(pts: Point[]): Point[] {
  if (pts.length <= MAX_RAW_POINTS) return pts;
  const step = pts.length / MAX_RAW_POINTS;
  const out: Point[] = [];
  for (let i = 0; i < MAX_RAW_POINTS; i++) {
    out.push(pts[Math.floor(i * step)]);
  }
  if (out[out.length - 1] !== pts[pts.length - 1]) {
    out.push(pts[pts.length - 1]);
  }
  return out;
}

// ─── Contour tracing (marching squares) ─────────────────────────────────────
//
// Proper marching squares: scans every 2×2 cell of the binary mask, emits
// directed line segments at edge midpoints, then chains them into closed
// contours. Produces sub-pixel accurate boundaries that precisely follow
// the mask edge — no Moore-tracing artifacts, no duplicate contours.

function traceContours(mask: Uint8Array, width: number, height: number): Point[][] {
  const at = (x: number, y: number): number =>
    x >= 0 && y >= 0 && x < width && y < height ? (mask[y * width + x] ? 1 : 0) : 0;

  // fromMap: directed edge starting from each midpoint key → destination.
  // Each midpoint appears at most once as a "from", guaranteeing O(n) chaining.
  const pk = (x: number, y: number) => `${x},${y}`;
  const fromMap = new Map<string, { pt: Point; toKey: string; toPt: Point }>();
  const allKeys: string[] = [];

  const add = (fx: number, fy: number, tx: number, ty: number) => {
    const fk = pk(fx, fy);
    fromMap.set(fk, { pt: { x: fx, y: fy }, toKey: pk(tx, ty), toPt: { x: tx, y: ty } });
    allKeys.push(fk);
  };

  for (let cy = -1; cy < height; cy++) {
    for (let cx = -1; cx < width; cx++) {
      const cell = (at(cx, cy) << 3) | (at(cx + 1, cy) << 2) | (at(cx + 1, cy + 1) << 1) | at(cx, cy + 1);

      if (cell === 0 || cell === 15) continue;

      // Edge midpoints for this cell
      const tx = cx + 0.5;
      const ty_ = cy; // top
      const rx = cx + 1;
      const ry = cy + 0.5; // right
      const bx = cx + 0.5;
      const by = cy + 1; // bottom
      const lx = cx;
      const ly = cy + 0.5; // left

      // Directed segments: contour winds clockwise around foreground
      // (screen coords, y-down). Foreground is on the left of travel.
      switch (cell) {
        case 1:
          add(bx, by, lx, ly);
          break;
        case 2:
          add(rx, ry, bx, by);
          break;
        case 3:
          add(rx, ry, lx, ly);
          break;
        case 4:
          add(tx, ty_, rx, ry);
          break;
        case 5:
          add(tx, ty_, rx, ry);
          add(bx, by, lx, ly);
          break;
        case 6:
          add(tx, ty_, bx, by);
          break;
        case 7:
          add(tx, ty_, lx, ly);
          break;
        case 8:
          add(lx, ly, tx, ty_);
          break;
        case 9:
          add(bx, by, tx, ty_);
          break;
        case 10:
          add(lx, ly, tx, ty_);
          add(rx, ry, bx, by);
          break;
        case 11:
          add(rx, ry, tx, ty_);
          break;
        case 12:
          add(lx, ly, rx, ry);
          break;
        case 13:
          add(bx, by, rx, ry);
          break;
        case 14:
          add(lx, ly, bx, by);
          break;
      }
    }
  }

  // Chain directed segments into closed contours
  const visited = new Set<string>();
  const contours: Point[][] = [];

  for (const startKey of allKeys) {
    if (visited.has(startKey)) continue;

    const path: Point[] = [];
    let key = startKey;

    while (!visited.has(key)) {
      const entry = fromMap.get(key);
      if (!entry) break;
      visited.add(key);
      path.push(entry.pt);
      key = entry.toKey;
    }

    if (path.length >= 3) contours.push(path);
  }

  // Shift from pixel-center coords to pixel-extent coords (+0.5)
  // so output ranges from 0 to width / 0 to height.
  return contours.map((c) => c.map((p) => ({ x: p.x + 0.5, y: p.y + 0.5 })));
}

// ─── Douglas-Peucker simplification ─────────────────────────────────────────

function douglasPeucker(points: Point[], tolerance: number): Point[] {
  if (points.length <= 2) return points;

  let maxDist = 0;
  let maxIdx = 0;
  const first = points[0];
  const last = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistance(points[i], first, last);
    if (d > maxDist) {
      maxDist = d;
      maxIdx = i;
    }
  }

  if (maxDist > tolerance) {
    const left = douglasPeucker(points.slice(0, maxIdx + 1), tolerance);
    const right = douglasPeucker(points.slice(maxIdx), tolerance);
    return [...left.slice(0, -1), ...right];
  }

  return [first, last];
}

function perpendicularDistance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

// ─── Zhang-Suen thinning (skeleton extraction) ─────────────────────────────

function zhangSuenThinning(mask: Uint8Array, width: number, height: number): Uint8Array {
  const img = new Uint8Array(mask);
  let changed = true;

  while (changed) {
    changed = false;
    // Sub-iteration 1
    const toRemove1: number[] = [];
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        if (img[y * width + x] !== 1) continue;
        const n = neighbors(img, x, y, width);
        const B = n.reduce((s, v) => s + v, 0);
        const A = transitions(n);
        if (B >= 2 && B <= 6 && A === 1 && n[0] * n[2] * n[4] === 0 && n[2] * n[4] * n[6] === 0) {
          toRemove1.push(y * width + x);
          changed = true;
        }
      }
    }
    for (const idx of toRemove1) img[idx] = 0;

    // Sub-iteration 2
    const toRemove2: number[] = [];
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        if (img[y * width + x] !== 1) continue;
        const n = neighbors(img, x, y, width);
        const B = n.reduce((s, v) => s + v, 0);
        const A = transitions(n);
        if (B >= 2 && B <= 6 && A === 1 && n[0] * n[2] * n[6] === 0 && n[0] * n[4] * n[6] === 0) {
          toRemove2.push(y * width + x);
          changed = true;
        }
      }
    }
    for (const idx of toRemove2) img[idx] = 0;
  }

  return img;
}

function neighbors(img: Uint8Array, x: number, y: number, w: number): number[] {
  // P2,P3,P4,P5,P6,P7,P8,P9 in clockwise order from top
  return [
    img[(y - 1) * w + x], // P2
    img[(y - 1) * w + x + 1], // P3
    img[y * w + x + 1], // P4
    img[(y + 1) * w + x + 1], // P5
    img[(y + 1) * w + x], // P6
    img[(y + 1) * w + x - 1], // P7
    img[y * w + x - 1], // P8
    img[(y - 1) * w + x - 1], // P9
  ];
}

function transitions(n: number[]): number {
  let count = 0;
  for (let i = 0; i < 8; i++) {
    if (n[i] === 0 && n[(i + 1) % 8] === 1) count++;
  }
  return count;
}

// ─── Skeleton path tracing ──────────────────────────────────────────────────

function traceSkeletonPaths(skeleton: Uint8Array, width: number, height: number): Point[][] {
  const visited = new Uint8Array(width * height);
  const paths: Point[][] = [];
  const dirs = [
    [-1, -1],
    [0, -1],
    [1, -1],
    [-1, 0],
    [1, 0],
    [-1, 1],
    [0, 1],
    [1, 1],
  ];

  // Find endpoints and junctions first
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      if (skeleton[y * width + x] !== 1 || visited[y * width + x]) continue;

      const n = countSkeletonNeighbors(skeleton, x, y, width);
      if (n === 1 || n === 0) {
        // Endpoint or isolated — trace from here
        const path = traceOnePath(skeleton, visited, x, y, width, height, dirs);
        if (path.length >= 2) paths.push(path);
      }
    }
  }

  // Trace remaining unvisited skeleton pixels (loops)
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      if (skeleton[y * width + x] === 1 && !visited[y * width + x]) {
        const path = traceOnePath(skeleton, visited, x, y, width, height, dirs);
        if (path.length >= 2) paths.push(path);
      }
    }
  }

  return paths;
}

function countSkeletonNeighbors(img: Uint8Array, x: number, y: number, w: number): number {
  let count = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      if (img[(y + dy) * w + (x + dx)] === 1) count++;
    }
  }
  return count;
}

function traceOnePath(
  skeleton: Uint8Array,
  visited: Uint8Array,
  startX: number,
  startY: number,
  w: number,
  h: number,
  dirs: number[][],
): Point[] {
  const path: Point[] = [];
  let x = startX;
  let y = startY;

  for (let step = 0; step < w * h; step++) {
    visited[y * w + x] = 1;
    path.push({ x, y });

    let found = false;
    for (const [dx, dy] of dirs) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < w && ny >= 0 && ny < h && skeleton[ny * w + nx] === 1 && !visited[ny * w + nx]) {
        x = nx;
        y = ny;
        found = true;
        break;
      }
    }
    if (!found) break;
  }

  return path;
}
