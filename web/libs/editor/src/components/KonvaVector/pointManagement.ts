import type { BezierPoint } from "./types";
import { generatePointId } from "./utils";

// Create a new point with UUID and reference to previous point
export const createPoint = (
  x: number,
  y: number,
  prevPointId?: string,
  options: Partial<BezierPoint> = {},
): BezierPoint => {
  return {
    id: generatePointId(),
    prevPointId,
    x,
    y,
    ...options,
  };
};

// Find the index of a point by its ID
const findPointIndexById = (points: BezierPoint[], id: string): number => {
  return points.findIndex((point) => point.id === id);
};

// Insert a point between two existing points
export const insertPointBetween = (
  points: BezierPoint[],
  prevPointId: string,
  nextPointId: string,
  newPoint: BezierPoint,
): BezierPoint[] => {
  const newPoints = [...points];

  // Find the index of the next point to insert before it
  const nextPointIndex = findPointIndexById(points, nextPointId);
  if (nextPointIndex === -1) return points;

  // Set the new point's reference to the previous point
  newPoint.prevPointId = prevPointId;

  // Update the next point's reference to the new point
  newPoints[nextPointIndex] = {
    ...newPoints[nextPointIndex],
    prevPointId: newPoint.id,
  };

  // Insert the new point before the next point
  newPoints.splice(nextPointIndex, 0, newPoint);

  return newPoints;
};

// Convert a point between regular and Bezier
export const convertPoint = (
  pointIndex: number,
  initialPoints: BezierPoint[],
  onPointConverted?: (point: BezierPoint, index: number, toBezier: boolean) => void,
  onPointsChange?: (points: BezierPoint[]) => void,
  onPathShapeChanged?: (points: BezierPoint[]) => void,
  setVisibleControlPoints?: (points: Set<number>) => void,
  visibleControlPoints?: Set<number>,
) => {
  if (pointIndex < 0 || pointIndex >= initialPoints.length) {
    return;
  }

  const point = initialPoints[pointIndex];

  if (point.isBezier) {
    // Use the existing function with the point index
    convertSelectedToRegular(pointIndex, initialPoints, onPointConverted, onPointsChange, onPathShapeChanged);

    // Hide control points for the converted point
    if (setVisibleControlPoints && visibleControlPoints) {
      setVisibleControlPoints(new Set(Array.from(visibleControlPoints).filter((i) => i !== pointIndex)));
    }
  } else {
    // Don't convert first or last points
    if (pointIndex === 0 || pointIndex === initialPoints.length - 1) {
      return;
    }

    // Use the existing function with the point index
    convertSelectedToBezier(pointIndex, initialPoints, onPointConverted, onPointsChange, onPathShapeChanged);

    // Make control points visible for the converted point
    if (setVisibleControlPoints && visibleControlPoints) {
      setVisibleControlPoints(new Set(Array.from(visibleControlPoints).concat([pointIndex])));
    }
  }
};

const convertSelectedToBezier = (
  pointIndex: number,
  initialPoints: BezierPoint[],
  onPointConverted?: (point: BezierPoint, index: number, toBezier: boolean) => void,
  onPointsChange?: (points: BezierPoint[]) => void,
  onPathShapeChanged?: (points: BezierPoint[]) => void,
) => {
  if (pointIndex === null || pointIndex === undefined || pointIndex === 0 || pointIndex === initialPoints.length - 1) {
    return;
  }

  const newPoints = initialPoints.map((point, i) => {
    if (i === pointIndex) {
      const prevPoint = initialPoints[i - 1];
      const nextPoint = initialPoints[i + 1];

      // Calculate the direction vector from previous to next point
      const dx = nextPoint.x - prevPoint.x;
      const dy = nextPoint.y - prevPoint.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Calculate control points on the same line, with anchor point in the middle
      const offset = distance * 0.3; // Distance from anchor point to each control point

      const controlPoint1 = {
        x: point.x - (dx / distance) * offset,
        y: point.y - (dy / distance) * offset,
      };
      const controlPoint2 = {
        x: point.x + (dx / distance) * offset,
        y: point.y + (dy / distance) * offset,
      };

      const updatedPoint: BezierPoint = {
        ...point,
        isBezier: true,
        controlPoint1,
        controlPoint2,
        disconnected: false,
      };
      onPointConverted?.(updatedPoint, i, true);
      onPathShapeChanged?.(initialPoints);
      return updatedPoint;
    }
    return point;
  });

  onPointsChange?.(newPoints);
};

const convertSelectedToRegular = (
  pointIndex: number,
  initialPoints: BezierPoint[],
  onPointConverted?: (point: BezierPoint, index: number, toBezier: boolean) => void,
  onPointsChange?: (points: BezierPoint[]) => void,
  onPathShapeChanged?: (points: BezierPoint[]) => void,
) => {
  if (pointIndex === null || pointIndex === undefined) return;

  const newPoints = initialPoints.map((point, i) => {
    if (i === pointIndex) {
      const updatedPoint: BezierPoint = {
        id: point.id,
        prevPointId: point.prevPointId,
        x: point.x,
        y: point.y,
      };
      onPointConverted?.(updatedPoint, i, false);
      onPathShapeChanged?.(initialPoints);
      return updatedPoint;
    }
    return point;
  });

  onPointsChange?.(newPoints);
};

export const deletePoint = (
  index: number,
  initialPoints: BezierPoint[],
  selectedPointIndex: number | null,
  setSelectedPointIndex: (index: number | null) => void,
  setVisibleControlPoints: (setter: (prev: Set<number>) => Set<number>) => void,
  onPointSelected?: (pointIndex: number | null) => void,
  onPointRemoved?: (point: BezierPoint, index: number) => void,
  onPointsChange?: (points: BezierPoint[]) => void,
  setLastAddedPointId?: (pointId: string | null) => void,
  lastAddedPointId?: string | null,
) => {
  if (index < 0 || index >= initialPoints.length) return;

  const deletedPoint = initialPoints[index];
  const newPoints = [...initialPoints];
  newPoints.splice(index, 1);

  // Reconnect points after deletion
  // Find points that were connected to the deleted point and reconnect them
  for (let i = 0; i < newPoints.length; i++) {
    const point = newPoints[i];

    // If this point was connected to the deleted point, reconnect it
    if (point.prevPointId === deletedPoint.id) {
      // Find the new previous point
      // CRITICAL: Use the deleted point's prevPointId (the point it was connected FROM)
      // This ensures correct reconnection in skeleton mode where branches exist
      // For example: C -> E -> F, when deleting E, F should reconnect to C (E's prevPointId)
      let newPrevPointId: string | undefined = deletedPoint.prevPointId;

      // Edge cases:
      if (index === 0) {
        // If we deleted the first point (no prevPointId), this point becomes the new first point
        newPrevPointId = undefined;
      } else if (!deletedPoint.prevPointId) {
        // If deleted point had no prevPointId (was a root point), this point becomes a root
        newPrevPointId = undefined;
      }
      // Otherwise, use deletedPoint.prevPointId which is correct for both linear and skeleton modes

      newPoints[i] = {
        ...point,
        prevPointId: newPrevPointId,
      };
    }
  }

  // Clear selection if the deleted point was selected
  if (selectedPointIndex === index) {
    setSelectedPointIndex(null);
    onPointSelected?.(null);
  }

  // Handle active point (lastAddedPointId) when deleting
  if (lastAddedPointId === deletedPoint.id) {
    // If we deleted the active point, reset to the last point in the new array
    if (newPoints.length > 0) {
      const newLastPoint = newPoints[newPoints.length - 1];
      setLastAddedPointId?.(newLastPoint.id);
    } else {
      // If no points left, clear the active point
      setLastAddedPointId?.(null);
    }
  }

  // Remove from visible control points if it was there
  setVisibleControlPoints((prev) => {
    const newSet = new Set(prev);
    newSet.delete(index);
    // Adjust indices for points after the deleted one
    const adjustedSet = new Set<number>();
    for (const pointIndex of Array.from(newSet)) {
      if (pointIndex > index) {
        adjustedSet.add(pointIndex - 1);
      } else {
        adjustedSet.add(pointIndex);
      }
    }
    return adjustedSet;
  });

  onPointRemoved?.(deletedPoint, index);
  onPointsChange?.(newPoints);
};
