import { minMax } from './utilities';

/**
 * Rotate `bboxCoords` by `rotation` degrees around `pivot`
 * `whRatio` is used to do rotation result in internal metric 100x100:
 *   scaleX = stageWidth / 100
 *   1. shift coords to rotate zero-based vectors: x - pivot | y - pivot
 *   2. convert internal to absolute: x * scaleX | y * scaleY
 *   3. rotate vector: x * cosA - y * sinA | x * sinA + y * cosA
 *   4. scale back:    x / scale | y / scale
 *   5. shift back:    x + pivot | y + pivot
 *   2+3+4 are simplified for x:
 *     ((x * scaleX) * cosA - (y * scaleY) * sinA) / scaleX
 *     x * cosA - y * sinA * scaleY / scaleX
 *   similar for y
 *   and scaleX / scaleY = whRatio
 * @typedef {{ left: number, top: number, right: number, bottom: number }} BBox
 * @param {BBox} bboxCoords
 * @param {number} rotation degrees
 * @param {{ x: number, y: number }} pivot
 * @param {number} whRatio
 * @returns {BBox}
 */
export function rotateBboxCoords(bboxCoords, rotation, pivot = { x: bboxCoords.left, y: bboxCoords.top }, whRatio = 1) {
  if (!bboxCoords) return bboxCoords;
  const a = rotation * Math.PI / 180, cosA = Math.cos(a), sinA = Math.sin(a);

  const points = [
    {
      x: bboxCoords.left - pivot.x,
      y: bboxCoords.top - pivot.y,
    },
    {
      x: bboxCoords.right - pivot.x,
      y: bboxCoords.top - pivot.y,
    },
    {
      x: bboxCoords.left - pivot.x,
      y: bboxCoords.bottom - pivot.y,
    },
    {
      x: bboxCoords.right - pivot.x,
      y: bboxCoords.bottom - pivot.y,
    },
  ].map(p => ({
    x: p.x * cosA - p.y * sinA / whRatio,
    y: p.x * sinA * whRatio + p.y * cosA,
  }));
  const [left, right] = minMax(points.map(p => p.x));
  const [top, bottom] = minMax(points.map(p => p.y));

  return {
    left: left + pivot.x,
    right: right + pivot.x,
    top: top + pivot.y,
    bottom: bottom + pivot.y,
  };
}