import type React from "react";
import { Shape } from "react-konva";
import type { BezierPoint } from "../types";
import { GHOST_LINE_STYLING, DEFAULT_STROKE_COLOR, HIT_RADIUS } from "../constants";
import { findClosestPointOnPath, getDistance } from "../eventHandlers/utils";

interface GhostLineProps {
  initialPoints: BezierPoint[];
  cursorPositionRef: React.RefObject<{ x: number; y: number } | null>;
  draggedControlPoint: { pointIndex: number; controlIndex: number } | null;
  draggedPointIndex?: number | null;
  isDraggingNewBezier?: boolean;
  isPathClosed: boolean;
  allowClose: boolean;
  transform: { zoom: number; offsetX: number; offsetY: number };
  fitScale: number;
  maxPoints?: number;
  minPoints?: number; // Add minPoints prop
  skeletonEnabled?: boolean;
  selectedPointIndex?: number | null;
  lastAddedPointId?: string | null;
  activePointId?: string | null;
  stroke?: string;
  pixelSnapping?: boolean;
  drawingDisabled?: boolean;
  // Non-hover-related disabled states (for real-time checks)
  isShiftKeyHeld?: boolean;
  transformMode?: boolean;
  effectiveSelectedPointsSize?: number;
}

export const GhostLine: React.FC<GhostLineProps> = ({
  initialPoints,
  cursorPositionRef,
  draggedControlPoint,
  draggedPointIndex = null,
  isDraggingNewBezier = false,
  isPathClosed,
  allowClose,
  transform,
  fitScale,
  maxPoints,
  minPoints,
  skeletonEnabled,
  selectedPointIndex = null,
  lastAddedPointId,
  activePointId = null,
  stroke = DEFAULT_STROKE_COLOR,
  pixelSnapping = false,
  drawingDisabled = false,
  isShiftKeyHeld = false,
  transformMode = false,
  effectiveSelectedPointsSize = 0,
}) => {
  // Helper function to snap coordinates to pixel grid
  const snapToPixel = (point: { x: number; y: number }) => {
    if (!pixelSnapping) return point;
    return {
      x: Math.round(point.x),
      y: Math.round(point.y),
    };
  };
  // Get the active point for the ghost line
  const getActivePoint = () => {
    // In skeleton mode, use the active point (selected point)
    if (skeletonEnabled && activePointId) {
      const activePoint = initialPoints.find((p) => p.id === activePointId);
      if (activePoint) {
        return activePoint;
      }
    }

    // If a point is selected, use that point for the ghost line
    if (
      selectedPointIndex !== null &&
      selectedPointIndex !== undefined &&
      selectedPointIndex >= 0 &&
      selectedPointIndex < initialPoints.length
    ) {
      return initialPoints[selectedPointIndex];
    }

    // In non-skeleton mode, use the last added point
    // Fallback to lastAddedPointId for backward compatibility
    if (lastAddedPointId) {
      const lastAddedPoint = initialPoints.find((p) => p.id === lastAddedPointId);
      if (lastAddedPoint) {
        return lastAddedPoint;
      }
    }

    // Final fallback: use the last point in the array
    if (initialPoints.length > 0) {
      const lastPoint = initialPoints[initialPoints.length - 1];
      return lastPoint;
    }
    return null;
  };

  const activePoint = getActivePoint();

  // Always render the Shape components - conditional logic happens inside sceneFunc
  // This allows the ghost line to update via stage.batchDraw() without React re-renders
  return (
    <>
      {/* Ghost line from active point to cursor */}
      {/* Only show ghost line when not at max points */}
      {activePoint && (
        <Shape
          stroke={stroke}
          strokeWidth={GHOST_LINE_STYLING.STROKE_WIDTH}
          strokeScaleEnabled={false}
          lineCap="round"
          lineJoin="round"
          dash={GHOST_LINE_STYLING.DASH}
          opacity={GHOST_LINE_STYLING.OPACITY}
          sceneFunc={(ctx, shape) => {
            // Read cursor position from ref inside sceneFunc for real-time updates
            const cursorPos = cursorPositionRef.current;

            // Check all conditions for showing ghost line
            // Show ghost line when we have points and cursor position, unless:
            // - We're dragging something
            // - Path is closed
            // - Max points reached
            // - Drawing is disabled (includes hovering over points, control points, or segments)
            if (
              !cursorPos ||
              draggedControlPoint ||
              draggedPointIndex !== null ||
              isDraggingNewBezier ||
              isPathClosed ||
              (maxPoints !== undefined && initialPoints.length >= maxPoints)
            ) {
              return; // Don't draw anything
            }

            // Real-time hover detection: check if cursor is over points, control points, or segments
            // This runs inside sceneFunc for real-time updates without React re-renders
            const scale = transform.zoom * fitScale;

            // Check if hovering over control points
            if (cursorPos && initialPoints.length > 0) {
              const controlPointHitRadius = HIT_RADIUS.CONTROL_POINT / scale;
              for (let i = 0; i < initialPoints.length; i++) {
                const point = initialPoints[i];
                if (point.isBezier) {
                  if (point.controlPoint1) {
                    const distance = Math.sqrt(
                      (cursorPos.x - point.controlPoint1.x) ** 2 + (cursorPos.y - point.controlPoint1.y) ** 2,
                    );
                    if (distance <= controlPointHitRadius) {
                      return; // Hide ghost line when hovering over control points
                    }
                  }
                  if (point.controlPoint2) {
                    const distance = Math.sqrt(
                      (cursorPos.x - point.controlPoint2.x) ** 2 + (cursorPos.y - point.controlPoint2.y) ** 2,
                    );
                    if (distance <= controlPointHitRadius) {
                      return; // Hide ghost line when hovering over control points
                    }
                  }
                }
              }
            }

            // Check if hovering over points (except last point and first point when closing is possible)
            if (cursorPos && initialPoints.length > 0) {
              const selectionHitRadius = HIT_RADIUS.SELECTION / scale;
              for (let i = 0; i < initialPoints.length; i++) {
                const point = initialPoints[i];
                const distance = Math.sqrt((cursorPos.x - point.x) ** 2 + (cursorPos.y - point.y) ** 2);
                if (distance <= selectionHitRadius) {
                  // Allow ghost line when hovering over the last point (so you can continue drawing)
                  if (i === initialPoints.length - 1) {
                    continue; // Don't hide ghost line for the last point
                  }
                  // Allow ghost line when hovering over the first point if path closing is possible
                  if (i === 0 && allowClose && !isPathClosed) {
                    continue; // Don't hide ghost line for the first point when closing is possible
                  }
                  // Hide ghost line when hovering over other points
                  return;
                }
              }
            }

            // Check if hovering over path segments
            if (cursorPos && initialPoints.length >= 2) {
              const segmentHitRadius = HIT_RADIUS.SEGMENT / scale;
              const closestPathPoint = findClosestPointOnPath(cursorPos, initialPoints, allowClose, isPathClosed);
              if (closestPathPoint && getDistance(cursorPos, closestPathPoint.point) <= segmentHitRadius) {
                return; // Hide ghost line when hovering over segments
              }
            }

            // Hide ghost line when drawing is disabled for non-hover reasons (Shift key, transform mode, etc.)
            // Note: Hover detection (points, control points, segments) is handled above in real-time
            // Check non-hover-related disabled states directly (not from drawingDisabled which includes hover state)
            // Only show ghost line if drawing is enabled OR if we have a selected point (for editing)
            const isNonHoverDisabled = isShiftKeyHeld || transformMode || effectiveSelectedPointsSize > 1;
            if (isNonHoverDisabled) {
              // If we have a selected point, still show ghost line (useful for editing)
              // Otherwise, hide it when drawing is disabled (but only for non-hover reasons)
              // Hover detection is already handled above, so this only checks Shift key, transform mode, etc.
              if (selectedPointIndex === null) {
                return; // Don't draw anything - drawing is disabled and no point is selected
              }
            }

            // Check if we should hide ghost line when closing indicator is visible
            const closingTargetCheck = (() => {
              if (!allowClose || !activePoint) return null;

              const canClosePath = initialPoints.length > 2 || initialPoints.some((p) => p.isBezier);
              if (!canClosePath || (minPoints && initialPoints.length < minPoints)) return null;

              const firstPoint = initialPoints[0];
              const lastPoint = initialPoints[initialPoints.length - 1];
              const closeRadius = GHOST_LINE_STYLING.CLOSE_RADIUS / (transform.zoom * fitScale);

              const isActivePointFirst = activePoint.id === firstPoint.id;
              const isActivePointLast = activePoint.id === lastPoint.id;

              if (!isActivePointFirst && !isActivePointLast) return null;

              const distanceToFirst = Math.sqrt((cursorPos.x - firstPoint.x) ** 2 + (cursorPos.y - firstPoint.y) ** 2);
              const distanceToLast = Math.sqrt((cursorPos.x - lastPoint.x) ** 2 + (cursorPos.y - lastPoint.y) ** 2);

              if (isActivePointFirst && distanceToLast <= closeRadius) {
                return { point: lastPoint, index: initialPoints.length - 1 };
              }
              if (isActivePointLast && distanceToFirst <= closeRadius) {
                return { point: firstPoint, index: 0 };
              }
              return null;
            })();

            if (closingTargetCheck) return; // Hide ghost line when closing indicator should show

            ctx.beginPath();
            ctx.moveTo(activePoint.x, activePoint.y);

            // Snap cursor position to pixel grid if enabled
            const snappedCursor = snapToPixel(cursorPos);

            // Check if the active point is a bezier point and has control points
            if (activePoint.isBezier && activePoint.controlPoint1 && activePoint.controlPoint2) {
              // Calculate control points for the ghost curve
              // Use the same logic as the path rendering for partial bezier curves
              const dx = snappedCursor.x - activePoint.x;
              const dy = snappedCursor.y - activePoint.y;
              const controlX = snappedCursor.x - dx * GHOST_LINE_STYLING.BEZIER_CONTROL_MULTIPLIER;
              const controlY = snappedCursor.y - dy * GHOST_LINE_STYLING.BEZIER_CONTROL_MULTIPLIER;

              // Draw bezier curve using the active point's controlPoint2 and calculated control point
              // controlPoint2 is the "outgoing" control point that affects the curve direction
              ctx.bezierCurveTo(
                activePoint.controlPoint2.x,
                activePoint.controlPoint2.y,
                controlX,
                controlY,
                snappedCursor.x,
                snappedCursor.y,
              );
            } else {
              // Straight line
              ctx.lineTo(snappedCursor.x, snappedCursor.y);
            }

            ctx.strokeShape(shape);
          }}
        />
      )}

      {/* Closing indicator when near first or last point - always show when appropriate */}
      {activePoint && (
        <Shape
          stroke={GHOST_LINE_STYLING.CLOSING_INDICATOR_STROKE}
          strokeWidth={GHOST_LINE_STYLING.CLOSING_INDICATOR_STROKE_WIDTH}
          strokeScaleEnabled={false}
          lineCap="round"
          lineJoin="round"
          dash={GHOST_LINE_STYLING.CLOSING_INDICATOR_DASH}
          opacity={GHOST_LINE_STYLING.CLOSING_INDICATOR_OPACITY}
          sceneFunc={(ctx, shape) => {
            // Read cursor position and check for closing target inside sceneFunc
            const cursorPos = cursorPositionRef.current;
            if (!cursorPos || isPathClosed || (drawingDisabled && !allowClose)) return;

            // Calculate closing target
            const closingTarget = (() => {
              if (!allowClose) return null;

              const canClosePath = initialPoints.length > 2 || initialPoints.some((p) => p.isBezier);
              if (!canClosePath || (minPoints && initialPoints.length < minPoints)) return null;

              const firstPoint = initialPoints[0];
              const lastPoint = initialPoints[initialPoints.length - 1];
              const closeRadius = GHOST_LINE_STYLING.CLOSE_RADIUS / (transform.zoom * fitScale);

              const isActivePointFirst = activePoint.id === firstPoint.id;
              const isActivePointLast = activePoint.id === lastPoint.id;

              if (!isActivePointFirst && !isActivePointLast) return null;

              const distanceToFirst = Math.sqrt((cursorPos.x - firstPoint.x) ** 2 + (cursorPos.y - firstPoint.y) ** 2);
              const distanceToLast = Math.sqrt((cursorPos.x - lastPoint.x) ** 2 + (cursorPos.y - lastPoint.y) ** 2);

              if (isActivePointFirst && distanceToLast <= closeRadius) {
                return { point: lastPoint, index: initialPoints.length - 1 };
              }
              if (isActivePointLast && distanceToFirst <= closeRadius) {
                return { point: firstPoint, index: 0 };
              }
              return null;
            })();

            if (!closingTarget) return;

            ctx.beginPath();
            ctx.moveTo(activePoint.x, activePoint.y);

            const targetPoint = closingTarget.point;

            // Check if either point is a bezier point and handle curves accordingly
            if (
              activePoint.isBezier &&
              activePoint.controlPoint2 &&
              targetPoint.isBezier &&
              targetPoint.controlPoint1
            ) {
              // Both points are bezier - use their control points
              ctx.bezierCurveTo(
                activePoint.controlPoint2.x,
                activePoint.controlPoint2.y,
                targetPoint.controlPoint1.x,
                targetPoint.controlPoint1.y,
                targetPoint.x,
                targetPoint.y,
              );
            } else if (activePoint.isBezier && activePoint.controlPoint2) {
              // Only active point is bezier - calculate control point for target point
              const dx = targetPoint.x - activePoint.x;
              const dy = targetPoint.y - activePoint.y;
              const controlX = targetPoint.x - dx * GHOST_LINE_STYLING.BEZIER_CONTROL_MULTIPLIER;
              const controlY = targetPoint.y - dy * GHOST_LINE_STYLING.BEZIER_CONTROL_MULTIPLIER;
              ctx.bezierCurveTo(
                activePoint.controlPoint2.x,
                activePoint.controlPoint2.y,
                controlX,
                controlY,
                targetPoint.x,
                targetPoint.y,
              );
            } else if (targetPoint.isBezier && targetPoint.controlPoint1) {
              // Only target point is bezier - calculate control point for active point
              const dx = targetPoint.x - activePoint.x;
              const dy = targetPoint.y - activePoint.y;
              const controlX = activePoint.x + dx * GHOST_LINE_STYLING.BEZIER_CONTROL_MULTIPLIER;
              const controlY = activePoint.y + dy * GHOST_LINE_STYLING.BEZIER_CONTROL_MULTIPLIER;
              ctx.bezierCurveTo(
                controlX,
                controlY,
                targetPoint.controlPoint1.x,
                targetPoint.controlPoint1.y,
                targetPoint.x,
                targetPoint.y,
              );
            } else {
              // Both points are regular - straight line
              ctx.lineTo(targetPoint.x, targetPoint.y);
            }

            ctx.strokeShape(shape);
          }}
        />
      )}
    </>
  );
};
