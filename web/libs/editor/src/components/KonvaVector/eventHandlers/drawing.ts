import type { KonvaEventObject } from "konva/lib/Node";
import type { EventHandlerProps } from "./types";
import { PointType } from "../types";
import { HIT_RADIUS } from "../constants";
import { getDistance, isPointInCanvasBounds, snapToPixel, stageToImageCoordinates } from "./utils";

export interface AddPointOptions {
  x: number;
  y: number;
  type?: PointType;
  prevPointId?: string;
  controlPoint1?: { x: number; y: number };
  controlPoint2?: { x: number; y: number };
  isDisconnected?: boolean;
}

/**
 * Close the path by setting the first point's prevPointId to the last point's ID
 * This creates a circular reference that indicates the path is closed
 */
export function closePath(props: EventHandlerProps): boolean {
  return closePathBetweenFirstAndLast(props, 0, props.initialPoints.length - 1);
}

/**
 * Close the path between first and last points bidirectionally
 * This allows closing from first to last OR last to first
 */
export function closePathBetweenFirstAndLast(
  props: EventHandlerProps,
  fromPointIndex: number,
  toPointIndex: number,
): boolean {
  if (!props.allowClose || props.initialPoints.length < 2) {
    return false;
  }

  // Check if we can close the path based on point count or bezier points
  const canClosePath = () => {
    // Allow closing if we have more than 2 points
    if (props.initialPoints.length > 2) {
      return true;
    }

    // Allow closing if we have at least one bezier point
    const hasBezierPoint = props.initialPoints.some((point) => point.isBezier);
    if (hasBezierPoint) {
      return true;
    }

    return false;
  };

  if (!canClosePath()) {
    return false;
  }

  // Additional validation: ensure we meet the minimum points requirement
  const minPoints = props.minPoints;
  if (minPoints && props.initialPoints.length < minPoints) {
    return false;
  }

  // Only allow closing between first and last points
  const firstPointIndex = 0;
  const lastPointIndex = props.initialPoints.length - 1;

  if (
    (fromPointIndex !== firstPointIndex && fromPointIndex !== lastPointIndex) ||
    (toPointIndex !== firstPointIndex && toPointIndex !== lastPointIndex)
  ) {
    return false;
  }

  // Check if path is already closed (first point's prevPointId points to last point)
  const firstPoint = props.initialPoints[0];
  const lastPoint = props.initialPoints[props.initialPoints.length - 1];
  if (firstPoint.prevPointId === lastPoint.id) {
    return true;
  }

  // Close the path by setting the first point's prevPointId to the last point's ID
  const updatedPoints = [...props.initialPoints];
  updatedPoints[0] = {
    ...updatedPoints[0],
    prevPointId: updatedPoints[updatedPoints.length - 1].id,
  };

  // Update the points and notify parent
  props.onPointsChange?.(updatedPoints);

  // Update the internal path closed state and notify parent
  props.setIsPathClosed(true);

  return true;
}

/**
 * Open the path by removing the first point's prevPointId reference to the last point
 * This removes the circular reference and makes the path open again
 */
export function openPath(props: EventHandlerProps): boolean {
  if (!props.allowClose || props.initialPoints.length < 2) {
    return false;
  }

  const firstPoint = props.initialPoints[0];
  const lastPoint = props.initialPoints[props.initialPoints.length - 1];

  // Check if path is already open (first point has no prevPointId or it doesn't point to last point)
  if (!firstPoint.prevPointId || firstPoint.prevPointId !== lastPoint.id) {
    return true;
  }

  // Open the path by removing the first point's prevPointId
  const updatedPoints = [...props.initialPoints];
  updatedPoints[0] = {
    ...firstPoint,
    prevPointId: undefined,
  };

  // Update the points and notify parent
  props.onPointsChange?.(updatedPoints);

  // Update the internal path closed state
  props.setIsPathClosed(false);

  return true;
}

/**
 * Unified function to add points to the polyline
 * Supports all types of point addition: click, click-drag, shift-click with ghost point
 */
export function addPoint(props: EventHandlerProps, options: AddPointOptions): boolean {
  if (!props.pointCreationManager) {
    return false;
  }

  if (options.type === PointType.BEZIER) {
    return props.pointCreationManager.createBezierPointAt(
      options.x,
      options.y,
      options.controlPoint1,
      options.controlPoint2,
      options.prevPointId,
      options.isDisconnected,
    );
  }
  return props.pointCreationManager.createRegularPointAt(options.x, options.y, options.prevPointId);
}

export function handleDrawingModeClick(e: KonvaEventObject<MouseEvent>, props: EventHandlerProps): boolean {
  const pos = e.target.getStage()?.getPointerPosition();
  if (!pos) return false;

  const imagePos = stageToImageCoordinates(pos, props.transform, props.fitScale, props.x, props.y);

  // Check if we're within canvas bounds (only if bounds checking is enabled)
  if (!isPointInCanvasBounds(imagePos, props.width, props.height)) {
    return false;
  }

  // Snap to pixel grid if enabled
  const snappedPos = snapToPixel(imagePos, props.pixelSnapping);

  // Check if we're clicking near the first point to close the path
  if (props.allowClose && !props.isPathClosed && props.initialPoints.length > 0) {
    const firstPoint = props.initialPoints[0];
    const distanceToFirst = getDistance(imagePos, firstPoint);
    const closeRadius = 15 / (props.transform.zoom * props.fitScale);

    // Only proceed with closing logic if we're actually near the first point
    if (distanceToFirst <= closeRadius) {
      // Use the new closePath function to properly set point references
      return closePath(props);
    }
  }

  // Only add new points if path is not closed and we haven't reached max points
  if (!props.isPathClosed && props.canAddMorePoints?.()) {
    // In skeleton mode, explicitly pass the activePointId as prevPointId
    // to ensure the new point connects to the selected point
    const addPointOptions: any = {
      x: snappedPos.x,
      y: snappedPos.y,
      type: PointType.REGULAR,
    };

    if (props.skeletonEnabled && props.activePointId) {
      addPointOptions.prevPointId = props.activePointId;
    }

    // Use the unified addPoint function
    return addPoint(props, addPointOptions);
  }

  return false;
}

/**
 * Add a point from ghost point drag
 */
export function addPointFromGhostDrag(
  props: EventHandlerProps,
  ghostPoint: { x: number; y: number; segmentIndex: number },
  dragDistance: number,
): boolean {
  if (!props.pointCreationManager) {
    return false;
  }

  return props.pointCreationManager.createPointFromGhostDrag(ghostPoint, dragDistance);
}

/**
 * Add a bezier point with custom control points
 */
export function addBezierPoint(
  props: EventHandlerProps,
  x: number,
  y: number,
  controlPoint1?: { x: number; y: number },
  controlPoint2?: { x: number; y: number },
  isDisconnected = false,
): boolean {
  if (!props.pointCreationManager) {
    return false;
  }

  return props.pointCreationManager.createBezierPointAt(x, y, controlPoint1, controlPoint2, undefined, isDisconnected);
}

/**
 * Add a point at a specific position with custom reference
 */
export function addPointAtPosition(props: EventHandlerProps, x: number, y: number, prevPointId?: string): boolean {
  if (!props.pointCreationManager) {
    return false;
  }

  return props.pointCreationManager.createRegularPointAt(x, y, prevPointId);
}

export function handleShiftClickPointConversion(e: KonvaEventObject<MouseEvent>, props: EventHandlerProps): boolean {
  const pos = e.target.getStage()?.getPointerPosition();
  if (!pos) {
    return false;
  }

  const imagePos = stageToImageCoordinates(pos, props.transform, props.fitScale, props.x, props.y);

  // Find the closest point
  let closestPointIndex = -1;
  let closestDistance = Number.POSITIVE_INFINITY;

  for (let i = 0; i < props.initialPoints.length; i++) {
    const point = props.initialPoints[i];
    const distance = getDistance(imagePos, point);
    const hitRadius = HIT_RADIUS.SELECTION / (props.transform.zoom * props.fitScale);

    if (distance <= hitRadius && distance < closestDistance) {
      closestDistance = distance;
      closestPointIndex = i;
    }
  }

  // Handle the point if we found one
  if (closestPointIndex !== -1) {
    const point = props.initialPoints[closestPointIndex];

    // If it's a bezier point and disconnected, reconnect it first
    if (point.isBezier && point.disconnected) {
      const newPoints = props.initialPoints.map((p, i) => {
        if (i === closestPointIndex) {
          // Reconnect by making control points symmetric around the anchor point
          if (p.controlPoint1 && p.controlPoint2) {
            const dx = p.controlPoint2.x - p.x;
            const dy = p.controlPoint2.y - p.y;
            return {
              ...p,
              disconnected: false,
              controlPoint1: {
                x: p.x - dx,
                y: p.y - dy,
              },
              controlPoint2: {
                x: p.x + dx,
                y: p.y + dy,
              },
            };
          }
          return p;
        }
        return p;
      });
      props.onPointsChange?.(newPoints);
      return true;
    }

    // Convert between regular and bezier points
    const newPoints = [...props.initialPoints];
    const pointToConvert = newPoints[closestPointIndex];

    if (!pointToConvert.isBezier) {
      // Check if bezier is allowed
      if (!props.allowBezier) {
        return false;
      }

      // Smart control point placement based on neighboring points
      // Use actual path connections via prevPointId references, not array bounds
      const prevPoint = props.initialPoints.find((p) => p.id === pointToConvert.prevPointId);
      const nextPoint = props.initialPoints.find((p) => p.prevPointId === pointToConvert.id);

      // Check if we have both neighboring points for smart placement
      if (prevPoint && nextPoint) {
        // Calculate the direction vector from previous to next point
        const dx = nextPoint.x - prevPoint.x;
        const dy = nextPoint.y - prevPoint.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Use a minimum distance to ensure handles aren't too short
        const minOffset = 30; // Minimum handle length
        const maxOffset = 80; // Maximum handle length
        const baseOffset = distance * 0.3; // Base calculation

        // Ensure handles are neither too short nor too long
        const offset = Math.max(minOffset, Math.min(maxOffset, baseOffset));

        // Calculate control points on the same line, with anchor point in the middle
        const controlPoint1 = {
          x: pointToConvert.x - (dx / distance) * offset,
          y: pointToConvert.y - (dy / distance) * offset,
        };
        const controlPoint2 = {
          x: pointToConvert.x + (dx / distance) * offset,
          y: pointToConvert.y + (dy / distance) * offset,
        };

        // Snap control points to pixel grid if enabled
        const snappedControlPoint1 = snapToPixel(controlPoint1, props.pixelSnapping);
        const snappedControlPoint2 = snapToPixel(controlPoint2, props.pixelSnapping);

        // Convert in place, following the same concept as addBezierPoint
        newPoints[closestPointIndex] = {
          ...pointToConvert,
          isBezier: true,
          controlPoint1: snappedControlPoint1,
          controlPoint2: snappedControlPoint2,
          disconnected: false, // Same as addBezierPoint with isDisconnected = false
        };

        props.onPointsChange?.(newPoints);
        props.onPointEdited?.(newPoints[closestPointIndex], closestPointIndex);

        // Make the control points visible (following addBezierPoint concept)
        props.setVisibleControlPoints(new Set([closestPointIndex]));

        return true;
      }

      if (prevPoint || nextPoint) {
        // Handle points that have only one neighbor in the path
        const neighborPoint = prevPoint || nextPoint;

        if (!neighborPoint) {
          return false;
        }

        // Create control points based on the available neighbor
        const dx = neighborPoint.x - pointToConvert.x;
        const dy = neighborPoint.y - pointToConvert.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Use a reasonable offset for single-neighbor points
        const offset = Math.max(30, Math.min(60, distance * 0.4));

        // Place control points along the direction to/from the neighbor
        const controlPoint1 = {
          x: pointToConvert.x - (dx / distance) * offset,
          y: pointToConvert.y - (dy / distance) * offset,
        };
        const controlPoint2 = {
          x: pointToConvert.x + (dx / distance) * offset,
          y: pointToConvert.y + (dy / distance) * offset,
        };

        // Snap control points to pixel grid if enabled
        const snappedControlPoint1 = snapToPixel(controlPoint1, props.pixelSnapping);
        const snappedControlPoint2 = snapToPixel(controlPoint2, props.pixelSnapping);

        // Convert in place
        newPoints[closestPointIndex] = {
          ...pointToConvert,
          isBezier: true,
          controlPoint1: snappedControlPoint1,
          controlPoint2: snappedControlPoint2,
          disconnected: false,
        };

        props.onPointsChange?.(newPoints);
        props.onPointEdited?.(newPoints[closestPointIndex], closestPointIndex);
        props.setVisibleControlPoints(new Set([closestPointIndex]));

        return true;
      } // Graceful error handling - only for truly corrupted data

      console.warn(
        "🔍 Shift-click: Cannot convert point - missing neighboring points. This should not happen in normal operation.",
      );
      return false;
    }

    // It's a bezier point - check if controls are synchronized
    const isSynchronized = !pointToConvert.disconnected;

    if (isSynchronized) {
      // Convert bezier point to regular
      newPoints[closestPointIndex] = {
        ...pointToConvert,
        isBezier: false,
        controlPoint1: undefined,
        controlPoint2: undefined,
        disconnected: false,
      };

      props.onPointsChange?.(newPoints);
      props.onPointEdited?.(newPoints[closestPointIndex], closestPointIndex);
      return true;
    }

    // Controls are disconnected - synchronize them
    if (pointToConvert.controlPoint1 && pointToConvert.controlPoint2) {
      // Make control points symmetric around the anchor point
      const dx = pointToConvert.controlPoint2.x - pointToConvert.x;
      const dy = pointToConvert.controlPoint2.y - pointToConvert.y;

      // Snap control points to pixel grid if enabled
      const symmetricControlPoint1 = {
        x: pointToConvert.x - dx,
        y: pointToConvert.y - dy,
      };
      const symmetricControlPoint2 = {
        x: pointToConvert.x + dx,
        y: pointToConvert.y + dy,
      };

      const snappedControlPoint1 = snapToPixel(symmetricControlPoint1, props.pixelSnapping);
      const snappedControlPoint2 = snapToPixel(symmetricControlPoint2, props.pixelSnapping);

      newPoints[closestPointIndex] = {
        ...pointToConvert,
        disconnected: false,
        controlPoint1: snappedControlPoint1,
        controlPoint2: snappedControlPoint2,
      };

      props.onPointsChange?.(newPoints);
      props.onPointEdited?.(newPoints[closestPointIndex], closestPointIndex);
      return true;
    }
  }

  return false;
}

/**
 * Insert a point between two existing points on a path segment
 */
export function insertPointBetween(
  props: EventHandlerProps,
  x: number,
  y: number,
  prevPointId: string,
  nextPointId: string,
  type: PointType = PointType.REGULAR,
  controlPoint1?: { x: number; y: number },
  controlPoint2?: { x: number; y: number },
): { success: boolean; newPointIndex?: number } {
  if (!props.pointCreationManager) {
    return { success: false };
  }

  return props.pointCreationManager.insertPointBetween(
    x,
    y,
    prevPointId,
    nextPointId,
    type,
    controlPoint1,
    controlPoint2,
  );
}

/**
 * Break a closed path at a specific segment by removing the prevPointId reference
 * that creates the connection between the two points of that segment
 */
export function breakPathAtSegment(props: EventHandlerProps, segmentIndex?: number): boolean {
  if (!props.allowClose || props.initialPoints.length < 3) {
    return false;
  }

  // Trust the isPathClosed prop that was passed from the main component
  // This ensures consistency between the UI state and the breaking logic

  if (!props.isPathClosed) {
    return false;
  }

  const firstPoint = props.initialPoints[0];
  const lastPoint = props.initialPoints[props.initialPoints.length - 1];

  // If no segment index is provided, break at the closure point (first point)
  if (segmentIndex === undefined) {
    const updatedPoints = [...props.initialPoints];
    updatedPoints[0] = {
      ...firstPoint,
      prevPointId: undefined,
    };

    // Update the points and notify parent
    props.onPointsChange?.(updatedPoints);

    // Update the internal path closed state
    props.setIsPathClosed(false);

    return true;
  }

  // Handle breaking at a specific segment
  let updatedPoints = [...props.initialPoints];

  if (segmentIndex === props.initialPoints.length) {
    // This is the closing segment (last point to first point)
    // Break by removing the first point's prevPointId reference to the last point
    updatedPoints[0] = {
      ...firstPoint,
      prevPointId: undefined,
    };
  } else if (segmentIndex >= 0 && segmentIndex < props.initialPoints.length) {
    // This could be either a regular segment or the closing segment
    const currentPoint = updatedPoints[segmentIndex];

    // Check if this is actually the closing segment (first point with prevPointId to last point)
    if (segmentIndex === 0 && currentPoint.prevPointId === lastPoint.id) {
      // This is the closing segment - break by removing the first point's prevPointId
      updatedPoints[0] = {
        ...currentPoint,
        prevPointId: undefined,
      };
    } else {
      // This is a regular segment - break by removing the current point's prevPointId reference
      updatedPoints[segmentIndex] = {
        ...currentPoint,
        prevPointId: undefined,
      };
    }

    // Only shift the array if we're not breaking at the closing segment (segmentIndex = 0)
    if (segmentIndex !== 0 || currentPoint.prevPointId !== lastPoint.id) {
      // Shift the array so that the breaking point becomes the first element
      // Example: [a, b, c, d] break at b-c -> [c, d, a, b]
      const breakingPointIndex = segmentIndex;
      const shiftedPoints = [
        ...updatedPoints.slice(breakingPointIndex), // [c, d]
        ...updatedPoints.slice(0, breakingPointIndex), // [a, b]
      ];

      // Update the prevPointId references for the shifted points
      const finalPoints = shiftedPoints.map((point, index) => {
        if (index === 0) {
          // First point should have no prevPointId
          return {
            ...point,
            prevPointId: undefined,
          };
        } // Other points should reference the previous point in the new order
        return {
          ...point,
          prevPointId: shiftedPoints[index - 1].id,
        };
      });

      updatedPoints = finalPoints;

      // Set the point that comes BEFORE the breaking point as the active point
      // In the shifted array, this is the last point (the one that was before the breaking point)
      const activePoint = updatedPoints[updatedPoints.length - 1];
      props.setActivePointId?.(activePoint.id);
      props.setLastAddedPointId?.(activePoint.id);
    } else {
      // When breaking at the closing segment, set the last point as active (since it was connected to the first point)
      const lastPointInArray = updatedPoints[updatedPoints.length - 1];
      props.setActivePointId?.(lastPointInArray.id);
      props.setLastAddedPointId?.(lastPointInArray.id);
    }
  } else {
    return false;
  }

  // Update the points and notify parent
  props.onPointsChange?.(updatedPoints);

  // Update the internal path closed state
  props.setIsPathClosed(false);

  return true;
}
