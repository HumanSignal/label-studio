import type Konva from "konva";
import type { BezierPoint } from "../types";
import { snapToPixel } from "../eventHandlers/utils";
import { constrainPointToBounds } from "./boundsChecking";

export interface TransformResult {
  newPoints: BezierPoint[];
  transformer: Konva.Transformer;
}

/**
 * Applies transformation from proxy nodes to real points
 * This function handles both position and rotation transformations
 */
export function resetTransformState() {
  // No longer needed, but keeping for backward compatibility
}

/**
 * Applies delta transformation to control points using RAF for smooth updates
 */
export function applyTransformationToControlPoints(
  points: BezierPoint[],
  originalPositions: {
    [key: number]: {
      x: number;
      y: number;
      controlPoint1?: { x: number; y: number };
      controlPoint2?: { x: number; y: number };
    };
  },
  currentRotation: number,
  currentScaleX: number,
  currentScaleY: number,
  transformerCenterX: number,
  transformerCenterY: number,
  isRotation = false,
  pixelSnapping = false,
): BezierPoint[] {
  const rotationRadians = currentRotation * (Math.PI / 180);
  const cos = Math.cos(rotationRadians);
  const sin = Math.sin(rotationRadians);

  return points.map((point, index) => {
    if (point.isBezier && point.controlPoint1 && point.controlPoint2) {
      // Get original positions
      const originalPos = originalPositions[index];
      if (!originalPos || !originalPos.controlPoint1 || !originalPos.controlPoint2) return point;

      if (isRotation && Math.abs(currentRotation) > 2.0) {
        // ROTATION: Use original positions as base and apply full transformation
        const cp1OffsetX = originalPos.controlPoint1.x - originalPos.x;
        const cp1OffsetY = originalPos.controlPoint1.y - originalPos.y;
        const cp2OffsetX = originalPos.controlPoint2.x - originalPos.x;
        const cp2OffsetY = originalPos.controlPoint2.y - originalPos.y;

        // Apply scaling to the offsets
        const scaledCP1X = cp1OffsetX * currentScaleX;
        const scaledCP1Y = cp1OffsetY * currentScaleY;
        const scaledCP2X = cp2OffsetX * currentScaleX;
        const scaledCP2Y = cp2OffsetY * currentScaleY;

        // Rotate the scaled offsets
        const rotatedCP1X = scaledCP1X * cos - scaledCP1Y * sin;
        const rotatedCP1Y = scaledCP1X * sin + scaledCP1Y * cos;
        const rotatedCP2X = scaledCP2X * cos - scaledCP2Y * sin;
        const rotatedCP2Y = scaledCP2X * sin + scaledCP2Y * cos;

        // Apply to current anchor position
        const cp1 = snapToPixel(
          {
            x: point.x + rotatedCP1X,
            y: point.y + rotatedCP1Y,
          },
          pixelSnapping,
        );
        const cp2 = snapToPixel(
          {
            x: point.x + rotatedCP2X,
            y: point.y + rotatedCP2Y,
          },
          pixelSnapping,
        );
        return {
          ...point,
          controlPoint1: cp1,
          controlPoint2: cp2,
        };
      }

      // TRANSLATION/SCALING: Control points maintain their relative positions to anchor points
      // Calculate the offset from the original anchor to the original control points
      const originalCP1OffsetX = originalPos.controlPoint1.x - originalPos.x;
      const originalCP1OffsetY = originalPos.controlPoint1.y - originalPos.y;
      const originalCP2OffsetX = originalPos.controlPoint2.x - originalPos.x;
      const originalCP2OffsetY = originalPos.controlPoint2.y - originalPos.y;

      // Apply scaling to the offsets (but not rotation)
      const scaledCP1X = originalCP1OffsetX * currentScaleX;
      const scaledCP1Y = originalCP1OffsetY * currentScaleY;
      const scaledCP2X = originalCP2OffsetX * currentScaleX;
      const scaledCP2Y = originalCP2OffsetY * currentScaleY;

      // Apply to current anchor position
      const cp1 = snapToPixel(
        {
          x: point.x + scaledCP1X,
          y: point.y + scaledCP1Y,
        },
        pixelSnapping,
      );
      const cp2 = snapToPixel(
        {
          x: point.x + scaledCP2X,
          y: point.y + scaledCP2Y,
        },
        pixelSnapping,
      );
      return {
        ...point,
        controlPoint1: cp1,
        controlPoint2: cp2,
      };
    }
    return point;
  });
}

/**
 * Updates the original positions with the current transformed positions
 * This should be called after transformation ends to prepare for the next transformation
 */
export function updateOriginalPositions(
  points: BezierPoint[],
  originalPositions: {
    [key: number]: {
      x: number;
      y: number;
      controlPoint1?: { x: number; y: number };
      controlPoint2?: { x: number; y: number };
    };
  },
): void {
  points.forEach((point, index) => {
    if (point.isBezier && point.controlPoint1 && point.controlPoint2) {
      if (originalPositions[index]) {
        originalPositions[index] = {
          x: point.x,
          y: point.y,
          controlPoint1: { ...point.controlPoint1 },
          controlPoint2: { ...point.controlPoint2 },
        };
      }
    }
  });
}

export function applyTransformationToPoints(
  transformer: Konva.Transformer,
  initialPoints: BezierPoint[],
  proxyRefs?: React.MutableRefObject<{ [key: number]: Konva.Circle | null }>,
  updateControlPoints = true,
  originalPositions?: {
    [key: number]: {
      x: number;
      y: number;
      controlPoint1?: { x: number; y: number };
      controlPoint2?: { x: number; y: number };
    };
  },
  transformerCenter?: { x: number; y: number },
  bounds?: { x: number; y: number; width: number; height: number },
  getCurrentPointsRef?: () => BezierPoint[],
  updateCurrentPointsRef?: (points: BezierPoint[]) => void,
  pixelSnapping = false,
): TransformResult {
  const nodes = transformer.nodes();

  // Use current points ref if available, otherwise use initialPoints prop
  // This ensures we always use the latest points during transformation
  const currentPoints = getCurrentPointsRef ? getCurrentPointsRef() : initialPoints;
  const newPoints = currentPoints.map((point) => ({ ...point })); // Create new objects to avoid mutation

  // Safety check - ensure we have valid nodes
  if (!nodes || nodes.length === 0) {
    return { newPoints, transformer };
  }

  // Calculate incremental rotation change
  const currentRotation = transformer.rotation();

  // Use the current rotation directly - the transformer handles the rotation correctly
  // We just need to apply this rotation to the control points relative to their anchor points
  const rotationRadians = currentRotation * (Math.PI / 180);
  const scaleX = transformer.scaleX();
  const scaleY = transformer.scaleY();

  // First pass: check if ANY point would go out of bounds
  // If so, prevent the entire transformation to avoid deformation
  let wouldAnyPointGoOutOfBounds = false;
  if (bounds) {
    for (const node of nodes) {
      if (!node || !node.name()) continue;

      const pointIndex = Number.parseInt(node.name().split("-")[1]);
      const originalPoint = currentPoints[pointIndex];
      if (!originalPoint) continue;

      // Get the node's transformed position
      const transformedX = node.x();
      const transformedY = node.y();
      const snappedPos = snapToPixel({ x: transformedX, y: transformedY }, pixelSnapping);

      // Check if this point would be out of bounds
      const wouldBeOutOfBounds =
        snappedPos.x < 0 ||
        snappedPos.x > bounds.width ||
        snappedPos.y < 0 ||
        snappedPos.y > bounds.height;

      // Check if current position is within bounds
      const currentInBounds =
        originalPoint.x >= 0 &&
        originalPoint.x <= bounds.width &&
        originalPoint.y >= 0 &&
        originalPoint.y <= bounds.height;

      if (wouldBeOutOfBounds && currentInBounds) {
        // This point would go out of bounds - prevent entire transformation
        wouldAnyPointGoOutOfBounds = true;
        break;
      }
    }
  }

  // Apply the transformation to each selected point
  for (const node of nodes) {
    if (!node || !node.name()) continue;

    const pointIndex = Number.parseInt(node.name().split("-")[1]); // proxy-{index}
    const point = newPoints[pointIndex];
    // Use currentPoints to get original point, not initialPoints prop (which might be stale)
    const originalPoint = currentPoints[pointIndex];

    if (point && originalPoint) {
      if (wouldAnyPointGoOutOfBounds) {
        // Prevent entire transformation - keep all points at current positions
        point.x = originalPoint.x;
        point.y = originalPoint.y;
      } else {
        // Get the node's transformed position - trust the transformer
        const transformedX = node.x();
        const transformedY = node.y();

        // Update the point position with pixel snapping if enabled
        const snappedPos = snapToPixel({ x: transformedX, y: transformedY }, pixelSnapping);
        
        // Constrain point to image boundaries (point-level constraint)
        if (bounds) {
          const constrainedPos = constrainPointToBounds(
            snappedPos,
            { width: bounds.width, height: bounds.height },
          );
          point.x = constrainedPos.x;
          point.y = constrainedPos.y;
        } else {
          point.x = snappedPos.x;
          point.y = snappedPos.y;
        }
      }

      // Don't update proxy node position - let transformer manage it
      // This prevents the update loop

      // Control points will be handled separately using delta transformation
    }
  }

  return { newPoints, transformer };
}
