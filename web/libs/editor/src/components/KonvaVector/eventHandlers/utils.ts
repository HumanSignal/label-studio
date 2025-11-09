import type { BezierPoint } from "../types";
import type { EventHandlerProps } from "./types";
import { getClosestPointOnLine, getClosestPointOnBezierCurve } from "../utils";
import { addBezierPoint } from "./drawing";

// Convert stage coordinates to image coordinates
export function stageToImageCoordinates(
  stagePos: { x: number; y: number },
  transform: { zoom: number; offsetX: number; offsetY: number },
  fitScale: number,
  x: number,
  y: number,
): { x: number; y: number } {
  const scale = transform.zoom * fitScale;
  return {
    x: (stagePos.x - x - transform.offsetX) / scale,
    y: (stagePos.y - y - transform.offsetY) / scale,
  };
}

// Check if a point is within canvas bounds
export function isPointInCanvasBounds(point: { x: number; y: number }, width: number, height: number): boolean {
  return point.x >= 0 && point.y >= 0 && point.x <= width && point.y <= height;
}

// Snap coordinates to pixel grid
export function snapToPixel(point: { x: number; y: number }, enabled = false) {
  if (!enabled) return point;

  return {
    x: Math.round(point.x),
    y: Math.round(point.y),
  };
}

// Calculate distance between two points
export function getDistance(point1: { x: number; y: number }, point2: { x: number; y: number }): number {
  return Math.sqrt((point1.x - point2.x) ** 2 + (point1.y - point2.y) ** 2);
}

// Check if a point is within hit radius of another point
export function isPointInHitRadius(
  point: { x: number; y: number },
  target: { x: number; y: number },
  hitRadius: number,
): boolean {
  return getDistance(point, target) <= hitRadius;
}

// Find the closest point on the path to a given cursor position
export function findClosestPointOnPath(
  cursorPos: { x: number; y: number },
  points: BezierPoint[],
  allowClose?: boolean,
  isPathClosed?: boolean,
): { point: { x: number; y: number }; segmentIndex: number } | null {
  if (points.length < 2) return null;

  let closestPoint = { x: 0, y: 0 };
  let closestDistance = Number.POSITIVE_INFINITY;
  let closestSegmentIndex = 0;

  // Create a map for quick point lookup
  const pointMap = new Map<string, BezierPoint>();
  for (const point of points) {
    pointMap.set(point.id, point);
  }

  // Check each segment
  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    if (!point.prevPointId) continue;

    const prevPoint = pointMap.get(point.prevPointId);
    if (!prevPoint) continue;

    let segmentClosestPoint: { x: number; y: number };

    // Replicate the exact rendering logic from PolylineShape
    if (prevPoint.isBezier && prevPoint.controlPoint2 && point.isBezier && point.controlPoint1) {
      // Full Bezier curve - both points have control points
      segmentClosestPoint = getClosestPointOnBezierCurve(
        cursorPos,
        prevPoint,
        prevPoint.controlPoint2,
        point.controlPoint1,
        point,
      );
    } else if (prevPoint.isBezier && prevPoint.controlPoint2) {
      // Partial Bezier curve - only prevPoint has controlPoint2
      const dx = point.x - prevPoint.x;
      const dy = point.y - prevPoint.y;
      const controlX = point.x - dx * 0.3;
      const controlY = point.y - dy * 0.3;
      segmentClosestPoint = getClosestPointOnBezierCurve(
        cursorPos,
        prevPoint,
        prevPoint.controlPoint2,
        { x: controlX, y: controlY },
        point,
      );
    } else if (point.isBezier && point.controlPoint1) {
      // Partial Bezier curve - only current point has controlPoint1
      const dx = point.x - prevPoint.x;
      const dy = point.y - prevPoint.y;
      const controlX = prevPoint.x + dx * 0.3;
      const controlY = prevPoint.y + dy * 0.3;
      segmentClosestPoint = getClosestPointOnBezierCurve(
        cursorPos,
        prevPoint,
        { x: controlX, y: controlY },
        point.controlPoint1,
        point,
      );
    } else {
      // Straight line
      segmentClosestPoint = getClosestPointOnLine(cursorPos, prevPoint, point);
    }

    const distance = getDistance(cursorPos, segmentClosestPoint);

    if (distance < closestDistance) {
      closestDistance = distance;
      closestPoint = segmentClosestPoint;
      closestSegmentIndex = i;
    }
  }

  // Check closing segment if path is closed
  // Allow closing if we have more than 2 points or at least one bezier point
  const canClosePath = () => {
    // Allow closing if we have more than 2 points
    if (points.length > 2) {
      return true;
    }

    // Allow closing if we have at least one bezier point
    const hasBezierPoint = points.some((point) => point.isBezier);
    if (hasBezierPoint) {
      return true;
    }

    return false;
  };

  if (allowClose && isPathClosed && canClosePath()) {
    const lastPoint = points[points.length - 1];
    const firstPoint = points[0];

    let segmentClosestPoint: { x: number; y: number };

    // Replicate the exact rendering logic from PolylineShape for closing segment
    if (lastPoint.isBezier && lastPoint.controlPoint2 && firstPoint.isBezier && firstPoint.controlPoint1) {
      // Full Bezier curve - both points have control points
      segmentClosestPoint = getClosestPointOnBezierCurve(
        cursorPos,
        lastPoint,
        lastPoint.controlPoint2,
        firstPoint.controlPoint1,
        firstPoint,
      );
    } else if (lastPoint.isBezier && lastPoint.controlPoint2) {
      // Partial Bezier curve - only lastPoint has controlPoint2
      const dx = firstPoint.x - lastPoint.x;
      const dy = firstPoint.y - lastPoint.y;
      const controlX = firstPoint.x - dx * 0.3;
      const controlY = firstPoint.y - dy * 0.3;
      segmentClosestPoint = getClosestPointOnBezierCurve(
        cursorPos,
        lastPoint,
        lastPoint.controlPoint2,
        { x: controlX, y: controlY },
        firstPoint,
      );
    } else if (firstPoint.isBezier && firstPoint.controlPoint1) {
      // Partial Bezier curve - only firstPoint has controlPoint1
      const dx = firstPoint.x - lastPoint.x;
      const dy = firstPoint.y - lastPoint.y;
      const controlX = lastPoint.x + dx * 0.3;
      const controlY = lastPoint.y + dy * 0.3;
      segmentClosestPoint = getClosestPointOnBezierCurve(
        cursorPos,
        lastPoint,
        { x: controlX, y: controlY },
        firstPoint.controlPoint1,
        firstPoint,
      );
    } else {
      // Straight line
      segmentClosestPoint = getClosestPointOnLine(cursorPos, lastPoint, firstPoint);
    }

    const distance = getDistance(cursorPos, segmentClosestPoint);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestPoint = segmentClosestPoint;
      closestSegmentIndex = points.length; // Use points.length to indicate closing segment
    }
  }

  // Only return if we're within a reasonable distance (e.g., 50 pixels)
  const maxSnapDistance = 50;
  if (closestDistance <= maxSnapDistance) {
    return {
      point: closestPoint,
      segmentIndex: closestSegmentIndex,
    };
  }

  return null;
}

/**
 * Calculate the distance from a point to a line segment
 */
export function distanceToLineSegment(
  point: { x: number; y: number },
  lineStart: { x: number; y: number },
  lineEnd: { x: number; y: number },
): number {
  const A = point.x - lineStart.x;
  const B = point.y - lineStart.y;
  const C = lineEnd.x - lineStart.x;
  const D = lineEnd.y - lineStart.y;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;

  if (lenSq !== 0) {
    param = dot / lenSq;
  }

  let xx: number;
  let yy: number;

  if (param < 0) {
    xx = lineStart.x;
    yy = lineStart.y;
  } else if (param > 1) {
    xx = lineEnd.x;
    yy = lineEnd.y;
  } else {
    xx = lineStart.x + param * C;
    yy = lineStart.y + param * D;
  }

  const dx = point.x - xx;
  const dy = point.y - yy;

  return Math.sqrt(dx * dx + dy * dy);
}

// Shared utility for handling bezier point creation during drag operations
export function handleBezierDragCreation(
  props: EventHandlerProps,
  startPos: { x: number; y: number },
  handledSelectionInMouseDown: { current: boolean },
): boolean {
  // Check if bezier is allowed
  if (!props.allowBezier) {
    return false;
  }

  // Create the bezier point immediately at the starting position
  const startImagePos = stageToImageCoordinates(startPos, props.transform, props.fitScale, props.x, props.y);

  // Create bezier point with initial control points
  const newPointIndex = props.initialPoints.length;
  const result = addBezierPoint(props, startImagePos.x, startImagePos.y);
  if (result) {
    // Store the index of the newly created bezier point
    props.setNewPointDragIndex(newPointIndex);
    // Set dragging state for bezier control point manipulation
    props.setIsDraggingNewBezier(true);
    // Mark that we've handled this interaction to prevent click handler from running
    handledSelectionInMouseDown.current = true;
    return true;
  }
  return false;
}

// Shared utility for continuing bezier drag (updating control points)
export function continueBezierDrag(props: EventHandlerProps): void {
  if (props.newPointDragIndex !== null && props.cursorPosition) {
    const bezierPointIndex = props.newPointDragIndex;
    const newPoints = [...props.initialPoints];
    const bezierPoint = newPoints[bezierPointIndex];

    if (bezierPoint && bezierPoint.isBezier && props.cursorPosition) {
      // Keep the bezier point at its original position (where the drag started)
      // Only update the control points to follow the cursor

      // Calculate the drag vector from the bezier point to current cursor
      const dragVectorX = props.cursorPosition.x - bezierPoint.x;
      const dragVectorY = props.cursorPosition.y - bezierPoint.y;

      // Calculate the distance from the bezier point to the cursor
      const controlDistance = Math.sqrt(dragVectorX * dragVectorX + dragVectorY * dragVectorY);

      // Normalize the drag vector
      const normalizedDragX = dragVectorX / controlDistance;
      const normalizedDragY = dragVectorY / controlDistance;

      // Create control points with pixel snapping
      const controlPoint1Pos = {
        x: bezierPoint.x + normalizedDragX * controlDistance,
        y: bezierPoint.y + normalizedDragY * controlDistance,
      };
      const controlPoint2Pos = {
        x: bezierPoint.x - normalizedDragX * controlDistance,
        y: bezierPoint.y - normalizedDragY * controlDistance,
      };

      const snappedControlPoint1 = snapToPixel(controlPoint1Pos, props.pixelSnapping);
      const snappedControlPoint2 = snapToPixel(controlPoint2Pos, props.pixelSnapping);

      // Create a new point object with updated control points
      newPoints[bezierPointIndex] = {
        ...bezierPoint,
        controlPoint1: {
          x: snappedControlPoint1.x,
          y: snappedControlPoint1.y,
        },
        controlPoint2: {
          x: snappedControlPoint2.x,
          y: snappedControlPoint2.y,
        },
      };

      // Update the points
      props.onPointsChange?.(newPoints);
      props.onPointEdited?.(newPoints[bezierPointIndex], bezierPointIndex);
    }
  }
}
