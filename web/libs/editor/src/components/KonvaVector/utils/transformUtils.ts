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

      // Apply the same transformation to control points if it's a Bezier point
      if (
        updateControlPoints &&
        point.isBezier &&
        point.controlPoint1 &&
        point.controlPoint2 &&
        originalPoint.controlPoint1 &&
        originalPoint.controlPoint2
      ) {
        // Use stored original control point positions if available
        const originalCP1 = originalPositions?.[pointIndex]?.controlPoint1 || originalPoint.controlPoint1;
        const originalCP2 = originalPositions?.[pointIndex]?.controlPoint2 || originalPoint.controlPoint2;

        // Calculate the relative vectors from anchor point to control points (in original state)
        const originalAnchorX = originalPos.x;
        const originalAnchorY = originalPos.y;

        const cp1VectorX = originalCP1.x - originalAnchorX;
        const cp1VectorY = originalCP1.y - originalAnchorY;
        const cp2VectorX = originalCP2.x - originalAnchorX;
        const cp2VectorY = originalCP2.y - originalAnchorY;

        // Apply scaling to the control point vectors
        let finalCP1X = cp1VectorX * scaleX;
        let finalCP1Y = cp1VectorY * scaleY;
        let finalCP2X = cp2VectorX * scaleX;
        let finalCP2Y = cp2VectorY * scaleY;

        // Apply rotation to the control point vectors if there's rotation
        if (Math.abs(currentRotation) > 0.1) {
          const cos = Math.cos(rotationRadians);
          const sin = Math.sin(rotationRadians);

          // Rotate the control point vectors (maintain relative angle to anchor)
          const rotatedCP1X = finalCP1X * cos - finalCP1Y * sin;
          const rotatedCP1Y = finalCP1X * sin + finalCP1Y * cos;
          const rotatedCP2X = finalCP2X * cos - finalCP2Y * sin;
          const rotatedCP2Y = finalCP2X * sin + finalCP2Y * cos;

          finalCP1X = rotatedCP1X;
          finalCP1Y = rotatedCP1Y;
          finalCP2X = rotatedCP2X;
          finalCP2Y = rotatedCP2Y;
        }

        // Apply the vectors to the new anchor point position
        const finalCP1PosX = point.x + finalCP1X;
        const finalCP1PosY = point.y + finalCP1Y;
        const finalCP2PosX = point.x + finalCP2X;
        const finalCP2PosY = point.y + finalCP2Y;

        // Note: We don't apply bounds checking to control points
        // Only anchor points are constrained to image bounds
        // Control points can extend outside bounds as they are visual guides

        point.controlPoint1 = {
          x: finalCP1PosX,
          y: finalCP1PosY,
        };
        point.controlPoint2 = {
          x: finalCP2PosX,
          y: finalCP2PosY,
        };
      }
    }
  }

  // Let Konva's built-in dragBoundFunc and resizeBoundFunc handle all boundary constraints
  // No need for custom point constraint logic

  return { newPoints, transformer };
}
