export const FREEHAND_MIN_DISTANCE = 2;
export const FREEHAND_SIMPLIFY_EPSILON = 2;

const normalizePoint = (point) => {
  const x = Array.isArray(point) ? point[0] : point?.x;
  const y = Array.isArray(point) ? point[1] : point?.y;

  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return Array.isArray(point) ? { x, y } : { ...point, x, y };
};

const distanceSquared = (first, second) => {
  const deltaX = first.x - second.x;
  const deltaY = first.y - second.y;

  return deltaX * deltaX + deltaY * deltaY;
};

export function appendFreehandPoint(points, point, minDistance = FREEHAND_MIN_DISTANCE, force = false) {
  const trace = Array.isArray(points) ? points : [];
  const nextPoint = normalizePoint(point);

  if (!nextPoint) return trace;
  if (trace.length === 0) return [nextPoint];

  const pointDistanceSquared = distanceSquared(trace[trace.length - 1], nextPoint);
  const threshold = Number.isFinite(minDistance) ? Math.max(0, minDistance) : FREEHAND_MIN_DISTANCE;

  if (pointDistanceSquared === 0 || (!force && pointDistanceSquared < threshold * threshold)) return trace;
  return [...trace, nextPoint];
}

const pointToSegmentDistanceSquared = (point, start, end) => {
  const segmentX = end.x - start.x;
  const segmentY = end.y - start.y;
  const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY;

  if (segmentLengthSquared === 0) return distanceSquared(point, start);

  const projection = ((point.x - start.x) * segmentX + (point.y - start.y) * segmentY) / segmentLengthSquared;
  const ratio = Math.max(0, Math.min(1, projection));
  return distanceSquared(point, { x: start.x + ratio * segmentX, y: start.y + ratio * segmentY });
};

const markDouglasPeuckerPoints = (points, firstIndex, lastIndex, epsilonSquared, markers) => {
  let furthestIndex = -1;
  let furthestDistanceSquared = epsilonSquared;

  for (let index = firstIndex + 1; index < lastIndex; index++) {
    const candidate = pointToSegmentDistanceSquared(points[index], points[firstIndex], points[lastIndex]);

    if (candidate > furthestDistanceSquared) {
      furthestDistanceSquared = candidate;
      furthestIndex = index;
    }
  }

  if (furthestIndex < 0) return;
  markers[furthestIndex] = 1;
  markDouglasPeuckerPoints(points, firstIndex, furthestIndex, epsilonSquared, markers);
  markDouglasPeuckerPoints(points, furthestIndex, lastIndex, epsilonSquared, markers);
};

export function simplifyFreehandPoints(points, epsilon = FREEHAND_SIMPLIFY_EPSILON) {
  const trace = (Array.isArray(points) ? points : []).reduce((result, point) => {
    const normalized = normalizePoint(point);

    if (normalized && (!result.length || distanceSquared(result[result.length - 1], normalized) > 0)) {
      result.push(normalized);
    }
    return result;
  }, []);

  if (trace.length <= 2) return trace;

  const safeEpsilon = Number.isFinite(epsilon) ? Math.max(0, epsilon) : FREEHAND_SIMPLIFY_EPSILON;
  const markers = new Uint8Array(trace.length);
  const lastIndex = trace.length - 1;

  markers[0] = markers[lastIndex] = 1;
  markDouglasPeuckerPoints(trace, 0, lastIndex, safeEpsilon * safeEpsilon, markers);
  return trace.filter((_, index) => markers[index] === 1);
}
