export const FREEHAND_MIN_DISTANCE = 2;
export const FREEHAND_SIMPLIFY_EPSILON = 2;
export const FREEHAND_REPAIR_MIN_RAW_POINTS = 8;
export const FREEHAND_REPAIR_SNAP_RADIUS = 12;

const FREEHAND_REPAIR_ARC_SCORE_TOLERANCE = 1;
const FREEHAND_REPAIR_POINT_EPSILON = 1e-6;
const FREEHAND_REPAIR_POINT_EPSILON_SQUARED = FREEHAND_REPAIR_POINT_EPSILON ** 2;
const FREEHAND_REPAIR_SCORE_SAMPLE_COUNT = 32;
const FREEHAND_REPAIR_MAX_SIMPLIFIED_POINTS = 2000;

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

const normalizeGeometryPoints = (points) => {
  let values;

  try {
    values = Array.from(points ?? []);
  } catch {
    return null;
  }

  const normalized = values.map(normalizePoint);

  if (normalized.some((point) => point === null)) return null;
  return normalized.map(({ x, y }) => ({ x, y }));
};

const sameGeometryPoint = (first, second) => distanceSquared(first, second) <= FREEHAND_REPAIR_POINT_EPSILON_SQUARED;

const withoutRepeatedClosingPoint = (points) => {
  if (points.length > 1 && sameGeometryPoint(points[0], points[points.length - 1])) return points.slice(0, -1);
  return points;
};

const deduplicateAdjacentGeometryPoints = (points) =>
  points.reduce((result, point) => {
    if (!result.length || !sameGeometryPoint(result[result.length - 1], point)) result.push(point);
    return result;
  }, []);

const projectPointToSegment = (point, start, end) => {
  const segmentX = end.x - start.x;
  const segmentY = end.y - start.y;
  const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY;

  if (segmentLengthSquared <= FREEHAND_REPAIR_POINT_EPSILON_SQUARED) return null;

  const projection = ((point.x - start.x) * segmentX + (point.y - start.y) * segmentY) / segmentLengthSquared;
  const t = Math.max(0, Math.min(1, projection));
  const projectedPoint = { x: start.x + t * segmentX, y: start.y + t * segmentY };

  return {
    point: projectedPoint,
    t,
    distanceSquared: distanceSquared(point, projectedPoint),
    length: Math.sqrt(segmentLengthSquared),
  };
};

const contourMetrics = (contour) => {
  const lengths = [];
  const offsets = [0];
  let perimeter = 0;

  for (let index = 0; index < contour.length; index++) {
    const length = Math.sqrt(distanceSquared(contour[index], contour[(index + 1) % contour.length]));

    lengths.push(length);
    perimeter += length;
    offsets.push(perimeter);
  }

  return { lengths, offsets, perimeter };
};

/**
 * Finds the closest point on a closed contour in the contour's coordinate space.
 * The returned `position` is segmentIndex + t and can be used to walk the contour
 * without special-casing the closing segment.
 */
export function findNearestContourPoint(rawContour, rawPoint) {
  const normalizedContour = normalizeGeometryPoints(rawContour);
  const point = normalizePoint(rawPoint);

  if (!normalizedContour || !point) return null;
  const contour = withoutRepeatedClosingPoint(normalizedContour);

  if (contour.length < 3) return null;

  const { lengths, offsets, perimeter } = contourMetrics(contour);
  let nearest = null;

  for (let segmentIndex = 0; segmentIndex < contour.length; segmentIndex++) {
    const projection = projectPointToSegment(
      point,
      contour[segmentIndex],
      contour[(segmentIndex + 1) % contour.length],
    );

    if (!projection) continue;
    if (nearest && projection.distanceSquared >= nearest.distanceSquared) continue;

    nearest = {
      ...projection,
      segmentIndex,
      position: segmentIndex + projection.t,
      perimeterOffset: offsets[segmentIndex] + projection.t * lengths[segmentIndex],
    };
  }

  if (!nearest) return null;

  // Canonicalize vertex projections to the outgoing segment. This gives the same
  // anchor for either segment incident to a vertex, including the wrap at vertex 0.
  if (nearest.t <= FREEHAND_REPAIR_POINT_EPSILON) {
    nearest.t = 0;
    nearest.point = { ...contour[nearest.segmentIndex] };
    nearest.position = nearest.segmentIndex;
    nearest.perimeterOffset = offsets[nearest.segmentIndex];
  } else if (1 - nearest.t <= FREEHAND_REPAIR_POINT_EPSILON) {
    nearest.segmentIndex = (nearest.segmentIndex + 1) % contour.length;
    nearest.t = 0;
    nearest.point = { ...contour[nearest.segmentIndex] };
    nearest.position = nearest.segmentIndex;
    nearest.perimeterOffset = nearest.segmentIndex === 0 ? 0 : offsets[nearest.segmentIndex];
  }

  nearest.distanceSquared = distanceSquared(point, nearest.point);
  nearest.distance = Math.sqrt(nearest.distanceSquared);
  nearest.perimeter = perimeter;
  delete nearest.length;
  return nearest;
}

const crossProduct = (start, end, point) =>
  (end.x - start.x) * (point.y - start.y) - (end.y - start.y) * (point.x - start.x);

const pointOnSegment = (point, start, end) =>
  Math.abs(crossProduct(start, end, point)) <= FREEHAND_REPAIR_POINT_EPSILON &&
  point.x >= Math.min(start.x, end.x) - FREEHAND_REPAIR_POINT_EPSILON &&
  point.x <= Math.max(start.x, end.x) + FREEHAND_REPAIR_POINT_EPSILON &&
  point.y >= Math.min(start.y, end.y) - FREEHAND_REPAIR_POINT_EPSILON &&
  point.y <= Math.max(start.y, end.y) + FREEHAND_REPAIR_POINT_EPSILON;

const segmentsIntersect = (firstStart, firstEnd, secondStart, secondEnd) => {
  const firstSideStart = crossProduct(firstStart, firstEnd, secondStart);
  const firstSideEnd = crossProduct(firstStart, firstEnd, secondEnd);
  const secondSideStart = crossProduct(secondStart, secondEnd, firstStart);
  const secondSideEnd = crossProduct(secondStart, secondEnd, firstEnd);
  const opposite = (first, second) =>
    (first > FREEHAND_REPAIR_POINT_EPSILON && second < -FREEHAND_REPAIR_POINT_EPSILON) ||
    (first < -FREEHAND_REPAIR_POINT_EPSILON && second > FREEHAND_REPAIR_POINT_EPSILON);

  if (opposite(firstSideStart, firstSideEnd) && opposite(secondSideStart, secondSideEnd)) return true;
  if (Math.abs(firstSideStart) <= FREEHAND_REPAIR_POINT_EPSILON && pointOnSegment(secondStart, firstStart, firstEnd))
    return true;
  if (Math.abs(firstSideEnd) <= FREEHAND_REPAIR_POINT_EPSILON && pointOnSegment(secondEnd, firstStart, firstEnd))
    return true;
  if (Math.abs(secondSideStart) <= FREEHAND_REPAIR_POINT_EPSILON && pointOnSegment(firstStart, secondStart, secondEnd))
    return true;
  if (Math.abs(secondSideEnd) <= FREEHAND_REPAIR_POINT_EPSILON && pointOnSegment(firstEnd, secondStart, secondEnd))
    return true;
  return false;
};

function intersectsBeyondSharedEndpoint(firstStart, firstEnd, secondStart, secondEnd, sharedPoint) {
  const firstOther = sameGeometryPoint(firstStart, sharedPoint) ? firstEnd : firstStart;
  const secondOther = sameGeometryPoint(secondStart, sharedPoint) ? secondEnd : secondStart;

  return pointOnSegment(firstOther, secondStart, secondEnd) || pointOnSegment(secondOther, firstStart, firstEnd);
}

/**
 * Checks a closed contour with a sweep-style bounding-box broad phase. `null`
 * means the comparison budget was exhausted, so callers can fail closed without
 * risking an unbounded synchronous pause on pathological dense contours.
 */
export function hasFreehandContourSelfIntersection(rawPoints, { maxComparisons = 1_000_000 } = {}) {
  const normalizedPoints = normalizeGeometryPoints(rawPoints);

  if (!normalizedPoints || !Number.isFinite(maxComparisons) || maxComparisons < 0) return null;
  const points = withoutRepeatedClosingPoint(normalizedPoints);

  if (points.length < 3) return true;

  const segments = points
    .map((start, index) => {
      const end = points[(index + 1) % points.length];

      return {
        index,
        start,
        end,
        minX: Math.min(start.x, end.x),
        maxX: Math.max(start.x, end.x),
        minY: Math.min(start.y, end.y),
        maxY: Math.max(start.y, end.y),
      };
    })
    .sort((first, second) => first.minX - second.minX || first.minY - second.minY);

  let active = [];
  let comparisons = 0;

  for (const segment of segments) {
    if (sameGeometryPoint(segment.start, segment.end)) return true;
    active = active.filter((candidate) => candidate.maxX + FREEHAND_REPAIR_POINT_EPSILON >= segment.minX);

    for (const candidate of active) {
      comparisons++;
      if (comparisons > maxComparisons) return null;
      const indexDistance = Math.abs(candidate.index - segment.index);
      const adjacent = indexDistance === 1 || indexDistance === points.length - 1;

      if (adjacent) {
        const sharedPoint = [candidate.start, candidate.end].find(
          (point) => sameGeometryPoint(point, segment.start) || sameGeometryPoint(point, segment.end),
        );

        if (
          !sharedPoint ||
          intersectsBeyondSharedEndpoint(candidate.start, candidate.end, segment.start, segment.end, sharedPoint)
        ) {
          return true;
        }
        continue;
      }
      if (
        candidate.maxY + FREEHAND_REPAIR_POINT_EPSILON < segment.minY ||
        segment.maxY + FREEHAND_REPAIR_POINT_EPSILON < candidate.minY
      ) {
        continue;
      }
      if (segmentsIntersect(candidate.start, candidate.end, segment.start, segment.end)) return true;
    }
    active.push(segment);
  }
  return false;
}

const hasDuplicateGeometryPoints = (points) => {
  const buckets = new Map();

  for (const point of points) {
    const cellX = Math.floor(point.x / FREEHAND_REPAIR_POINT_EPSILON);
    const cellY = Math.floor(point.y / FREEHAND_REPAIR_POINT_EPSILON);

    for (let offsetX = -1; offsetX <= 1; offsetX++) {
      for (let offsetY = -1; offsetY <= 1; offsetY++) {
        const nearby = buckets.get(`${cellX + offsetX}:${cellY + offsetY}`);

        if (nearby?.some((candidate) => sameGeometryPoint(point, candidate))) return true;
      }
    }
    const key = `${cellX}:${cellY}`;

    buckets.set(key, [...(buckets.get(key) ?? []), point]);
  }
  return false;
};

const hasSelfIntersection = (points, closed) => {
  const segmentCount = closed ? points.length : points.length - 1;

  for (let first = 0; first < segmentCount; first++) {
    const firstStart = points[first];
    const firstEnd = points[(first + 1) % points.length];

    if (sameGeometryPoint(firstStart, firstEnd)) return true;

    for (let second = first + 1; second < segmentCount; second++) {
      const adjacent = second === first + 1 || (closed && first === 0 && second === segmentCount - 1);

      if (adjacent) continue;
      if (segmentsIntersect(firstStart, firstEnd, points[second], points[(second + 1) % points.length])) return true;
    }
  }
  return false;
};

const signedDoubleArea = (points) =>
  points.reduce((area, point, index) => {
    const next = points[(index + 1) % points.length];
    return area + point.x * next.y - next.x * point.y;
  }, 0);

const isValidClosedContour = (points) =>
  points.length >= 3 &&
  !hasDuplicateGeometryPoints(points) &&
  Math.abs(signedDoubleArea(points)) > FREEHAND_REPAIR_POINT_EPSILON;

export function isValidFreehandContour(rawPoints, options) {
  const normalizedPoints = normalizeGeometryPoints(rawPoints);

  if (!normalizedPoints) return false;
  const points = withoutRepeatedClosingPoint(normalizedPoints);

  return isValidClosedContour(points) && hasFreehandContourSelfIntersection(points, options) === false;
}

const replacementIntersectsRetainedArc = (replacement, retainedArc) => {
  const replacementLastSegment = replacement.length - 2;
  const retainedLastSegment = retainedArc.length - 2;

  for (let replacementIndex = 0; replacementIndex <= replacementLastSegment; replacementIndex++) {
    const replacementStart = replacement[replacementIndex];
    const replacementEnd = replacement[replacementIndex + 1];

    for (let retainedIndex = 0; retainedIndex <= retainedLastSegment; retainedIndex++) {
      const retainedStart = retainedArc[retainedIndex];
      const retainedEnd = retainedArc[retainedIndex + 1];

      if (!segmentsIntersect(replacementStart, replacementEnd, retainedStart, retainedEnd)) continue;

      const sharedPoint =
        replacementIndex === 0 && retainedIndex === retainedLastSegment
          ? replacementStart
          : replacementIndex === replacementLastSegment && retainedIndex === 0
            ? replacementEnd
            : null;

      if (
        !sharedPoint ||
        intersectsBeyondSharedEndpoint(replacementStart, replacementEnd, retainedStart, retainedEnd, sharedPoint)
      ) {
        return true;
      }
    }
  }
  return false;
};

const buildForwardContourArc = (contour, startAnchor, endAnchor) => {
  let endPosition = endAnchor.position;

  if (endPosition <= startAnchor.position) endPosition += contour.length;
  const points = [startAnchor.point];

  for (let vertex = Math.floor(startAnchor.position) + 1; vertex < endPosition; vertex++) {
    points.push(contour[vertex % contour.length]);
  }
  points.push(endAnchor.point);
  return deduplicateAdjacentGeometryPoints(points);
};

const polylineLength = (points) => {
  let length = 0;

  for (let index = 1; index < points.length; index++) {
    length += Math.sqrt(distanceSquared(points[index - 1], points[index]));
  }
  return length;
};

const resamplePolyline = (points, sampleCount) => {
  const segmentLengths = [];
  const offsets = [0];
  let length = 0;

  for (let index = 1; index < points.length; index++) {
    const segmentLength = Math.sqrt(distanceSquared(points[index - 1], points[index]));

    segmentLengths.push(segmentLength);
    length += segmentLength;
    offsets.push(length);
  }

  if (length <= FREEHAND_REPAIR_POINT_EPSILON) return null;

  const samples = [];
  let segmentIndex = 0;

  for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex++) {
    const targetOffset = (length * sampleIndex) / (sampleCount - 1);

    while (segmentIndex < segmentLengths.length - 1 && offsets[segmentIndex + 1] < targetOffset) {
      segmentIndex++;
    }

    const segmentLength = segmentLengths[segmentIndex];
    const ratio = segmentLength > 0 ? (targetOffset - offsets[segmentIndex]) / segmentLength : 0;
    const start = points[segmentIndex];
    const end = points[segmentIndex + 1];

    samples.push({
      x: start.x + (end.x - start.x) * ratio,
      y: start.y + (end.y - start.y) * ratio,
    });
  }
  return samples;
};

const traceToArcProximity = (trace, arc) => {
  const traceSamples = resamplePolyline(trace, FREEHAND_REPAIR_SCORE_SAMPLE_COUNT);
  const arcSamples = resamplePolyline(arc, FREEHAND_REPAIR_SCORE_SAMPLE_COUNT);

  if (!traceSamples || !arcSamples) return Number.POSITIVE_INFINITY;
  return (
    traceSamples.reduce(
      (score, tracePoint, index) => score + Math.sqrt(distanceSquared(tracePoint, arcSamples[index])),
      0,
    ) / traceSamples.length
  );
};

const chooseReplacementArc = (trace, forwardArc, backwardArc) => {
  const forwardScore = traceToArcProximity(trace, forwardArc);
  const backwardScore = traceToArcProximity(trace, backwardArc);
  const scoreDifference = Math.abs(forwardScore - backwardScore);

  if (!Number.isFinite(forwardScore) || !Number.isFinite(backwardScore)) return null;
  if (scoreDifference > FREEHAND_REPAIR_ARC_SCORE_TOLERANCE) {
    return forwardScore < backwardScore ? "forward" : "backward";
  }

  const forwardLength = polylineLength(forwardArc);
  const backwardLength = polylineLength(backwardArc);

  if (Math.abs(forwardLength - backwardLength) <= FREEHAND_REPAIR_POINT_EPSILON) return null;
  return forwardLength < backwardLength ? "forward" : "backward";
};

/**
 * Replaces one arc of a closed canvas-space contour with a canvas-space freehand
 * trace. Both trace endpoints are snapped to the contour. Ambiguous or invalid
 * repairs fail closed by returning null.
 */
export function buildFreehandRepairContour(rawContour, rawTrace, options = {}) {
  const normalizedContour = normalizeGeometryPoints(rawContour);
  const normalizedTrace = normalizeGeometryPoints(rawTrace);
  const snapRadius = options?.snapRadius ?? FREEHAND_REPAIR_SNAP_RADIUS;

  if (!normalizedContour || !normalizedTrace || !Number.isFinite(snapRadius) || snapRadius < 0) return null;

  const contour = withoutRepeatedClosingPoint(normalizedContour);
  const trace = deduplicateAdjacentGeometryPoints(normalizedTrace);

  if (!isValidFreehandContour(contour) || trace.length < 2 || trace.length > FREEHAND_REPAIR_MAX_SIMPLIFIED_POINTS) {
    return null;
  }
  if (hasDuplicateGeometryPoints(trace) || hasSelfIntersection(trace, false)) return null;

  const startAnchor = findNearestContourPoint(contour, trace[0]);
  const endAnchor = findNearestContourPoint(contour, trace[trace.length - 1]);

  if (!startAnchor || !endAnchor) return null;
  if (startAnchor.distance > snapRadius || endAnchor.distance > snapRadius) return null;
  if (sameGeometryPoint(startAnchor.point, endAnchor.point)) return null;

  const snappedTrace = deduplicateAdjacentGeometryPoints([startAnchor.point, ...trace.slice(1, -1), endAnchor.point]);

  if (snappedTrace.length < 2 || hasDuplicateGeometryPoints(snappedTrace) || hasSelfIntersection(snappedTrace, false))
    return null;

  const forwardArc = buildForwardContourArc(contour, startAnchor, endAnchor);
  const backwardArc = [...buildForwardContourArc(contour, endAnchor, startAnchor)].reverse();
  const replacedArc = chooseReplacementArc(snappedTrace, forwardArc, backwardArc);

  if (!replacedArc) return null;

  const retainedArc = replacedArc === "forward" ? buildForwardContourArc(contour, endAnchor, startAnchor) : forwardArc;
  const replacement = replacedArc === "forward" ? snappedTrace : [...snappedTrace].reverse();

  if (replacementIntersectsRetainedArc(replacement, retainedArc)) return null;

  const repairedPoints = deduplicateAdjacentGeometryPoints(
    replacedArc === "forward"
      ? [...replacement, ...retainedArc.slice(1, -1)]
      : [...retainedArc, ...replacement.slice(1, -1)],
  );
  const points = withoutRepeatedClosingPoint(repairedPoints);

  if (!isValidFreehandContour(points)) return null;
  if (Math.sign(signedDoubleArea(points)) !== Math.sign(signedDoubleArea(contour))) return null;

  return { points, replacedArc, startAnchor, endAnchor };
}
