import type Konva from "konva";
import type { BezierPoint } from "../types";
import { constrainGroupToBounds } from "./boundsChecking";

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
        return {
          ...point,
          controlPoint1: {
            x: point.x + rotatedCP1X,
            y: point.y + rotatedCP1Y,
          },
          controlPoint2: {
            x: point.x + rotatedCP2X,
            y: point.y + rotatedCP2Y,
          },
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
      return {
        ...point,
        controlPoint1: {
          x: point.x + scaledCP1X,
          y: point.y + scaledCP1Y,
        },
        controlPoint2: {
          x: point.x + scaledCP2X,
          y: point.y + scaledCP2Y,
        },
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
  proxyRefs?: React.MutableRefObject<{ [key: number]: Konva.Rect | null }>,
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
  bounds?: { width: number; height: number },
): TransformResult {
  const nodes = transformer.nodes();
  const newPoints = [...initialPoints];

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

  // Apply the transformation to each selected point
  for (const node of nodes) {
    if (!node || !node.name()) continue;

    const pointIndex = Number.parseInt(node.name().split("-")[1]); // proxy-{index}
    const point = newPoints[pointIndex];
    const originalPoint = initialPoints[pointIndex];

    if (point && originalPoint) {
      // Get the node's transformed position - trust the transformer
      const transformedX = node.x();
      const transformedY = node.y();

      // Use stored original positions if available, otherwise use current positions
      const originalPos = originalPositions?.[pointIndex] || originalPoint;

      // Update the point position (no individual constraints - group constraints handled by transformer)
      point.x = transformedX;
      point.y = transformedY;

      // Don't update proxy node position - let transformer manage it
      // This prevents the update loop

      // Control points will be handled separately using delta transformation
    }
  }

  // Let Konva's built-in dragBoundFunc and resizeBoundFunc handle all boundary constraints
  // No need for custom point constraint logic

  return { newPoints, transformer };
}
