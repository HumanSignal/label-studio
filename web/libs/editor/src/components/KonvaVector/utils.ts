import type { BezierPoint, SimplePoint, PointInput, Point } from "./types";
import { nanoid } from "nanoid";

// Calculate closest point on a line segment
export const getClosestPointOnLine = (p: Point, a: Point, b: Point): Point => {
  const ax = a.x;
  const ay = a.y;
  const bx = b.x;
  const by = b.y;
  const px = p.x;
  const py = p.y;

  const A = px - ax;
  const B = py - ay;
  const C = bx - ax;
  const D = by - ay;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;

  if (lenSq !== 0) param = dot / lenSq;

  let xx: number;
  let yy: number;

  if (param < 0) {
    xx = ax;
    yy = ay;
  } else if (param > 1) {
    xx = bx;
    yy = by;
  } else {
    xx = ax + param * C;
    yy = ay + param * D;
  }

  return { x: xx, y: yy };
};

// Calculate closest point on a Bezier curve using numerical approximation
export const getClosestPointOnBezierCurve = (p: Point, p0: Point, p1: Point, p2: Point, p3: Point): Point => {
  let closestPoint = p0;
  let minDistance = Number.POSITIVE_INFINITY;

  const steps = 200; // Increased precision for smoother curve following
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;

    const x = (1 - t) ** 3 * p0.x + 3 * (1 - t) ** 2 * t * p1.x + 3 * (1 - t) * t ** 2 * p2.x + t ** 3 * p3.x;
    const y = (1 - t) ** 3 * p0.y + 3 * (1 - t) ** 2 * t * p1.y + 3 * (1 - t) * t ** 2 * p2.y + t ** 3 * p3.y;

    const distance = Math.sqrt((p.x - x) ** 2 + (p.y - y) ** 2);

    if (distance < minDistance) {
      minDistance = distance;
      closestPoint = { x, y };
    }
  }

  return closestPoint;
};

// Generate a unique ID for a point using nanoid
export const generatePointId = (): string => {
  return nanoid();
};

/**
 * Convert complex BezierPoint format to simple point format
 * @param bezierPoints Array of BezierPoint objects
 * @returns Array of [x, y] coordinates
 */
export const convertBezierToSimplePoints = (bezierPoints: BezierPoint[]): SimplePoint[] => {
  return bezierPoints.map((point) => [point.x, point.y]);
};

/**
 * Check if a point is in simple format
 * @param point Point to check
 * @returns True if point is in [x, y] format
 */
export const isSimplePoint = (point: PointInput): point is SimplePoint => {
  return Array.isArray(point) && point.length === 2 && typeof point[0] === "number" && typeof point[1] === "number";
};

/**
 * Check if a point is in complex format
 * @param point Point to check
 * @returns True if point is a BezierPoint object
 */
export const isBezierPoint = (point: PointInput): point is BezierPoint => {
  return typeof point === "object" && point !== null && "x" in point && "y" in point;
};

/**
 * Normalize input points to BezierPoint format
 * @param points Array of points in either simple or complex format
 * @returns Array of normalized BezierPoint objects
 * @throws Error if point format is invalid
 */
export const normalizePoints = (points: PointInput[]): BezierPoint[] => {
  let lastPointId: string | undefined = undefined;

  return points.map((point, index) => {
    if (isSimplePoint(point)) {
      // Convert simple point to BezierPoint
      const newPoint = {
        id: generatePointId(),
        prevPointId: index > 0 ? lastPointId : undefined,
        x: point[0],
        y: point[1],
        isBezier: false,
        disconnected: false,
        isBranching: false,
      };
      lastPointId = newPoint.id;
      return newPoint;
    }
    if (isBezierPoint(point)) {
      // Already in BezierPoint format, ensure it has proper prevPointId
      const newPoint = {
        ...point,
        id: point.id || generatePointId(),
        prevPointId: point.prevPointId || (index > 0 ? lastPointId : undefined),
      };
      lastPointId = newPoint.id;
      return newPoint;
    }
    // Fallback for any other format
    throw new Error(`Invalid point format at index ${index}: ${JSON.stringify(point)}`);
  });
};

/**
 * Point-in-polygon test using ray casting algorithm with Bezier curve support
 * @param point - The point to test
 * @param polygon - Array of polygon vertices with potential Bezier curves
 * @returns True if point is inside the polygon
 */
export const isPointInPolygon = (point: Point, polygon: BezierPoint[]): boolean => {
  if (polygon.length < 3) return false;

  let inside = false;
  const x = point.x;
  const y = point.y;

  // Create a map for quick point lookup
  const pointMap = new Map<string, BezierPoint>();
  for (const vertex of polygon) {
    pointMap.set(vertex.id, vertex);
  }

  // Check each edge of the polygon
  for (let i = 0; i < polygon.length; i++) {
    const currentPoint = polygon[i];
    const prevPoint = currentPoint.prevPointId ? pointMap.get(currentPoint.prevPointId) : null;

    if (!prevPoint) continue;

    // Check if this edge intersects with the horizontal ray from the test point
    const intersects = checkRayIntersectionWithEdge(point, prevPoint, currentPoint);
    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
};

/**
 * Check if a horizontal ray from the test point intersects with a polygon edge
 * Handles both straight lines and Bezier curves
 */
const checkRayIntersectionWithEdge = (testPoint: Point, startPoint: BezierPoint, endPoint: BezierPoint): boolean => {
  const x = testPoint.x;
  const y = testPoint.y;

  // For straight line edges
  if (!startPoint.isBezier && !endPoint.isBezier) {
    return checkRayIntersectionWithLine(testPoint, startPoint, endPoint);
  }

  // For Bezier curve edges, we need to sample points along the curve
  // and check intersections with line segments between sample points
  const samples = 20; // Number of sample points along the curve
  let lastPoint = startPoint;

  for (let i = 1; i <= samples; i++) {
    const t = i / samples;
    const currentPoint = getBezierPointAtT(startPoint, endPoint, t);

    // Check intersection with line segment from lastPoint to currentPoint
    if (checkRayIntersectionWithLine(testPoint, lastPoint, currentPoint)) {
      return true;
    }

    lastPoint = currentPoint;
  }

  return false;
};

/**
 * Check if a horizontal ray from the test point intersects with a straight line segment
 */
const checkRayIntersectionWithLine = (testPoint: Point, startPoint: Point, endPoint: Point): boolean => {
  const x = testPoint.x;
  const y = testPoint.y;
  const x1 = startPoint.x;
  const y1 = startPoint.y;
  const x2 = endPoint.x;
  const y2 = endPoint.y;

  // Ensure y1 <= y2 for consistent intersection checking
  if (y1 > y2) {
    return checkRayIntersectionWithLine(testPoint, endPoint, startPoint);
  }

  // Ray doesn't intersect if:
  // 1. The test point's y is not between the line segment's y values
  // 2. The line segment is horizontal (y1 === y2)
  if (y < y1 || y > y2 || y1 === y2) {
    return false;
  }

  // Calculate the x-coordinate where the horizontal ray intersects the line
  const intersectionX = x1 + ((y - y1) * (x2 - x1)) / (y2 - y1);

  // The ray intersects if the intersection point is to the right of the test point
  return intersectionX > x;
};

/**
 * Get a point on a Bezier curve at parameter t
 * Handles different Bezier configurations
 */
const getBezierPointAtT = (startPoint: BezierPoint, endPoint: BezierPoint, t: number): Point => {
  // Determine control points based on Bezier configuration
  let cp1: Point;
  let cp2: Point;

  if (startPoint.isBezier && startPoint.controlPoint2 && endPoint.isBezier && endPoint.controlPoint1) {
    // Full Bezier curve - both points have control points
    cp1 = startPoint.controlPoint2;
    cp2 = endPoint.controlPoint1;
  } else if (startPoint.isBezier && startPoint.controlPoint2) {
    // Partial Bezier curve - only startPoint has controlPoint2
    const dx = endPoint.x - startPoint.x;
    const dy = endPoint.y - startPoint.y;
    cp1 = startPoint.controlPoint2;
    cp2 = { x: endPoint.x - dx * 0.3, y: endPoint.y - dy * 0.3 };
  } else if (endPoint.isBezier && endPoint.controlPoint1) {
    // Partial Bezier curve - only endPoint has controlPoint1
    const dx = endPoint.x - startPoint.x;
    const dy = endPoint.y - startPoint.y;
    cp1 = { x: startPoint.x + dx * 0.3, y: startPoint.y + dy * 0.3 };
    cp2 = endPoint.controlPoint1;
  } else {
    // No Bezier curve, return interpolated point on straight line
    return {
      x: startPoint.x + t * (endPoint.x - startPoint.x),
      y: startPoint.y + t * (endPoint.y - startPoint.y),
    };
  }

  // Calculate Bezier curve point using cubic Bezier formula
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * t;

  return {
    x: uuu * startPoint.x + 3 * uu * t * cp1.x + 3 * u * tt * cp2.x + ttt * endPoint.x,
    y: uuu * startPoint.y + 3 * uu * t * cp1.y + 3 * u * tt * cp2.y + ttt * endPoint.y,
  };
};
