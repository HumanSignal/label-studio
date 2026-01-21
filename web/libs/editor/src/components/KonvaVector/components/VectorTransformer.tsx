import React from "react";
import { Transformer as KonvaTransformer } from "react-konva";
import type Konva from "konva";
import type { BezierPoint } from "../types";
import { calculateTransformerConstraints } from "../utils/boundsChecking";
import {
  applyTransformationToPoints,
  resetTransformState,
  applyTransformationToControlPoints,
  updateOriginalPositions,
} from "../utils/transformUtils";

const BBOX_MIN_WIDTH = 10;
const LOCKING_THRESHOLD = 0.1; // Lock when point touches boundary (within 0.1px)
const VALIDATION_THRESHOLD = 5; // Allow transformation if violation is within 5px (for unlocking)
const PRECISION_TOLERANCE = 1.0; // Tolerance for floating-point precision errors (allow up to 1px past threshold)

interface VectorTransformerProps {
  selectedPoints: Set<number>;
  initialPoints: BezierPoint[];
  transformerRef: React.RefObject<any>;
  proxyRefs?: React.MutableRefObject<{ [key: number]: Konva.Rect | null }>;
  onPointsChange?: (points: BezierPoint[]) => void;
  onTransformStateChange?: (state: {
    rotation: number;
    scaleX: number;
    scaleY: number;
    centerX: number;
    centerY: number;
  }) => void;
  onTransformationStart?: () => void;
  onTransformationEnd?: () => void;
  onTransformEnd?: (e: any) => void;
  bounds?: { x: number; y: number; width: number; height: number };
  scaleX?: number;
  scaleY?: number;
  transform?: { zoom: number; offsetX: number; offsetY: number };
  fitScale?: number;
  updateCurrentPointsRef?: (points: BezierPoint[]) => void;
  getCurrentPointsRef?: () => BezierPoint[];
  pixelSnapping?: boolean;
}

export const VectorTransformer: React.FC<VectorTransformerProps> = ({
  selectedPoints,
  initialPoints,
  transformerRef,
  proxyRefs,
  onPointsChange,
  onTransformStateChange,
  onTransformationStart,
  onTransformationEnd,
  onTransformEnd,
  bounds,
  scaleX = 1,
  scaleY = 1,
  transform = { zoom: 1, offsetX: 0, offsetY: 0 },
  fitScale = 1,
  updateCurrentPointsRef,
  getCurrentPointsRef,
  pixelSnapping = false,
}) => {
  const transformerStateRef = React.useRef<{
    rotation: number;
    scaleX: number;
    scaleY: number;
    centerX: number;
    centerY: number;
  }>({
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    centerX: 0,
    centerY: 0,
  });

  // Store original positions when drag/transform starts
  const originalPositionsRef = React.useRef<{
    [key: number]: {
      x: number;
      y: number;
      controlPoint1?: { x: number; y: number };
      controlPoint2?: { x: number; y: number };
    };
    initialRotation?: number;
  }>({});

  // RAF for smooth control point updates
  const rafIdRef = React.useRef<number | null>(null);

  // Track if this is the first transformation tick to avoid control point jumping
  const isFirstTransformTickRef = React.useRef<boolean>(true);

  // Track initial rotation when transform starts
  const initialRotationRef = React.useRef<number>(0);

  // Track previous point positions and box to detect direction
  const previousPointsRef = React.useRef<Array<{ x: number; y: number }> | null>(null);
  const previousBoxRef = React.useRef<any>(null);
  const previousRotationRef = React.useRef<number | null>(null);
  // Track last allowed rotation direction (1 for CW, -1 for CCW, 0 for none)
  const lastRotationDirectionRef = React.useRef<number>(0);

  // Helper function to calculate constraint based on point bounding box with direction detection
  const calculatePointBasedConstraints = React.useCallback(
    (
      projectedPoints: Array<{ x: number; y: number }>,
      oldBox: any,
      newBox: any,
    ): { constrainedBox: any; isOutOfBounds: boolean; violationReducing: boolean } => {
      const EPS = 0.01;

      if (!bounds || projectedPoints.length === 0) {
        const constrainedBox = { ...newBox };
        if (constrainedBox.width < BBOX_MIN_WIDTH) constrainedBox.width = BBOX_MIN_WIDTH;
        if (constrainedBox.height < BBOX_MIN_WIDTH) constrainedBox.height = BBOX_MIN_WIDTH;
        return { constrainedBox, isOutOfBounds: false, violationReducing: false };
      }

      // Calculate bounding box of projected points (in image coordinates)
      const minX = Math.min(...projectedPoints.map((p) => p.x));
      const maxX = Math.max(...projectedPoints.map((p) => p.x));
      const minY = Math.min(...projectedPoints.map((p) => p.y));
      const maxY = Math.max(...projectedPoints.map((p) => p.y));

      const pointBox = {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
      };

      // Detect transformation type and direction FIRST (before checking bounds)
      const oldRotation = oldBox.rotation || 0;
      const newRotation = newBox.rotation || 0;
      const rotationDelta = newRotation - oldRotation;
      const isRotating = Math.abs(rotationDelta) > EPS;

      const scaleXDelta = oldBox.width !== 0 ? newBox.width / oldBox.width : 1;
      const scaleYDelta = oldBox.height !== 0 ? newBox.height / oldBox.height : 1;
      const isScaling = Math.abs(scaleXDelta - 1) > EPS || Math.abs(scaleYDelta - 1) > EPS;

      const positionDeltaX = newBox.x - oldBox.x;
      const positionDeltaY = newBox.y - oldBox.y;
      const isDragging = Math.abs(positionDeltaX) > EPS || Math.abs(positionDeltaY) > EPS;

      // Calculate violation amounts for each edge
      const violationLeft = Math.max(0, bounds.x - pointBox.x);
      const violationRight = Math.max(0, pointBox.x + pointBox.width - (bounds.x + bounds.width));
      const violationTop = Math.max(0, bounds.y - pointBox.y);
      const violationBottom = Math.max(0, pointBox.y + pointBox.height - (bounds.y + bounds.height));
      const currentViolation = Math.max(violationLeft, violationRight, violationTop, violationBottom);

      // LOCKING: Check if violation exceeds locking threshold (strict - prevents going past boundary)
      const exceedsLockingThreshold = currentViolation > LOCKING_THRESHOLD;

      // VALIDATION: Check if violation is within validation threshold + precision tolerance
      // Add precision tolerance to account for floating-point errors
      const effectiveValidationThreshold = VALIDATION_THRESHOLD + PRECISION_TOLERANCE;
      const withinValidationThreshold = currentViolation <= effectiveValidationThreshold;

      // Calculate previous violation if we have previous points
      let prevViolationLeft = 0;
      let prevViolationRight = 0;
      let prevViolationTop = 0;
      let prevViolationBottom = 0;
      let prevViolation = 0;

      if (previousPointsRef.current) {
        const prevMinX = Math.min(...previousPointsRef.current.map((p) => p.x));
        const prevMaxX = Math.max(...previousPointsRef.current.map((p) => p.x));
        const prevMinY = Math.min(...previousPointsRef.current.map((p) => p.y));
        const prevMaxY = Math.max(...previousPointsRef.current.map((p) => p.y));

        prevViolationLeft = Math.max(0, bounds.x - prevMinX);
        prevViolationRight = Math.max(0, prevMaxX - (bounds.x + bounds.width));
        prevViolationTop = Math.max(0, bounds.y - prevMinY);
        prevViolationBottom = Math.max(0, prevMaxY - (bounds.y + bounds.height));
        prevViolation = Math.max(prevViolationLeft, prevViolationRight, prevViolationTop, prevViolationBottom);
      }

      // If violation is within locking threshold, treat as in bounds and allow transformation
      if (!exceedsLockingThreshold) {
        const constrainedBox = { ...newBox };
        if (constrainedBox.width < BBOX_MIN_WIDTH) constrainedBox.width = BBOX_MIN_WIDTH;
        if (constrainedBox.height < BBOX_MIN_WIDTH) constrainedBox.height = BBOX_MIN_WIDTH;
        previousPointsRef.current = projectedPoints;
        previousBoxRef.current = newBox;
        previousRotationRef.current = newBox.rotation || 0;
        return { constrainedBox, isOutOfBounds: false, violationReducing: false };
      }

      // Check if violation is increasing (this is what we want to block)
      // If no previous points, assume violation is not increasing (allow transformation)
      let violationIncreasing = false;
      let violationReducing = false;
      if (previousPointsRef.current) {
        violationIncreasing =
          violationLeft > prevViolationLeft + EPS ||
          violationRight > prevViolationRight + EPS ||
          violationTop > prevViolationTop + EPS ||
          violationBottom > prevViolationBottom + EPS;

        violationReducing =
          violationLeft < prevViolationLeft - EPS ||
          violationRight < prevViolationRight - EPS ||
          violationTop < prevViolationTop - EPS ||
          violationBottom < prevViolationBottom - EPS;
      }

      // ROTATION: Allow if opposite direction, reducing violation, within validation threshold, or not increasing violation
      if (isRotating) {
        // Detect rotation direction by comparing newRotation with oldRotation directly
        // newRotation > oldRotation = CW (clockwise, positive), newRotation < oldRotation = CCW (counter-clockwise, negative)
        const currentRotationDirection = newRotation > oldRotation ? 1 : newRotation < oldRotation ? -1 : 0;

        // Check if rotating in opposite direction from last allowed rotation
        const isRotatingOppositeDirection =
          lastRotationDirectionRef.current !== 0 &&
          currentRotationDirection !== 0 &&
          currentRotationDirection !== lastRotationDirectionRef.current;

        // STRICT CHECK: Always block if violation exceeds validation threshold + precision tolerance
        // Only allow if reducing violation or rotating opposite direction
        if (currentViolation > effectiveValidationThreshold) {
          // Only allow if reducing violation (bringing back in bounds) or rotating opposite (unlocking)
          if (violationReducing || isRotatingOppositeDirection) {
            const constrainedBox = { ...newBox };
            if (constrainedBox.width < BBOX_MIN_WIDTH) constrainedBox.width = BBOX_MIN_WIDTH;
            if (constrainedBox.height < BBOX_MIN_WIDTH) constrainedBox.height = BBOX_MIN_WIDTH;
            previousPointsRef.current = projectedPoints;
            previousBoxRef.current = newBox;
            previousRotationRef.current = newRotation;
            lastRotationDirectionRef.current = currentRotationDirection;
            return { constrainedBox, isOutOfBounds: true, violationReducing: violationReducing };
          }
          // Block - violation exceeds threshold and not reducing or opposite
          const constrainedBox = { ...oldBox };
          if (constrainedBox.width < BBOX_MIN_WIDTH) constrainedBox.width = BBOX_MIN_WIDTH;
          if (constrainedBox.height < BBOX_MIN_WIDTH) constrainedBox.height = BBOX_MIN_WIDTH;
          return { constrainedBox, isOutOfBounds: true, violationReducing: false };
        }

        // Violation is within validation threshold - allow if:
        // 1. Rotating opposite direction (to unlock)
        // 2. Violation is reducing (bringing points back in bounds)
        // 3. Violation is within validation threshold (allows slight violation for unlocking)
        if (isRotatingOppositeDirection || violationReducing || withinValidationThreshold) {
          const constrainedBox = { ...newBox };
          if (constrainedBox.width < BBOX_MIN_WIDTH) constrainedBox.width = BBOX_MIN_WIDTH;
          if (constrainedBox.height < BBOX_MIN_WIDTH) constrainedBox.height = BBOX_MIN_WIDTH;
          previousPointsRef.current = projectedPoints;
          previousBoxRef.current = newBox;
          previousRotationRef.current = newRotation;
          // Update last allowed rotation direction
          lastRotationDirectionRef.current = currentRotationDirection;
          return { constrainedBox, isOutOfBounds: true, violationReducing: violationReducing };
        }

        // Fallback: block if we get here
        const constrainedBox = { ...oldBox };
        // IMPORTANT: Don't update lastRotationDirectionRef when blocking - keep it so we can detect opposite direction
        if (constrainedBox.width < BBOX_MIN_WIDTH) constrainedBox.width = BBOX_MIN_WIDTH;
        if (constrainedBox.height < BBOX_MIN_WIDTH) constrainedBox.height = BBOX_MIN_WIDTH;
        return { constrainedBox, isOutOfBounds: true, violationReducing: false };
      }

      // SCALING: Strict check - block if violation exceeds validation threshold + precision tolerance
      if (isScaling) {
        // STRICT CHECK: Always block if violation exceeds validation threshold + precision tolerance
        if (currentViolation > effectiveValidationThreshold && !violationReducing) {
          const constrainedBox = { ...oldBox };
          if (constrainedBox.width < BBOX_MIN_WIDTH) constrainedBox.width = BBOX_MIN_WIDTH;
          if (constrainedBox.height < BBOX_MIN_WIDTH) constrainedBox.height = BBOX_MIN_WIDTH;
          return { constrainedBox, isOutOfBounds: true, violationReducing: false };
        }

        // Detect resize direction by comparing box edges
        const oldLeft = oldBox.x;
        const oldRight = oldBox.x + oldBox.width;
        const oldTop = oldBox.y;
        const oldBottom = oldBox.y + oldBox.height;

        const newLeft = newBox.x;
        const newRight = newBox.x + newBox.width;
        const newTop = newBox.y;
        const newBottom = newBox.y + newBox.height;

        // Check if we're resizing toward boundaries (only relevant if violation is increasing)
        const movingTowardLeft = newLeft < oldLeft && violationLeft > EPS;
        const movingTowardRight = newRight > oldRight && violationRight > EPS;
        const movingTowardTop = newTop < oldTop && violationTop > EPS;
        const movingTowardBottom = newBottom > oldBottom && violationBottom > EPS;
        const isMovingTowardAnyBoundary =
          movingTowardLeft || movingTowardRight || movingTowardTop || movingTowardBottom;

        // Violation is within validation threshold - allow if:
        // 1. Violation is reducing (bringing points back in bounds)
        // 2. Violation is within validation threshold (allows slight violation for unlocking)
        // 3. Not moving toward boundary (resizing from opposite side)
        if (
          violationReducing ||
          withinValidationThreshold ||
          !isMovingTowardAnyBoundary
        ) {
          const constrainedBox = { ...newBox };
          if (constrainedBox.width < BBOX_MIN_WIDTH) constrainedBox.width = BBOX_MIN_WIDTH;
          if (constrainedBox.height < BBOX_MIN_WIDTH) constrainedBox.height = BBOX_MIN_WIDTH;
          previousPointsRef.current = projectedPoints;
          previousBoxRef.current = newBox;
          previousRotationRef.current = newRotation;
          return { constrainedBox, isOutOfBounds: true, violationReducing: violationReducing };
        }

        // Block scaling that moves toward boundary AND increases violation beyond validation threshold
        const constrainedBox = { ...oldBox };
        if (constrainedBox.width < BBOX_MIN_WIDTH) constrainedBox.width = BBOX_MIN_WIDTH;
        if (constrainedBox.height < BBOX_MIN_WIDTH) constrainedBox.height = BBOX_MIN_WIDTH;
        return { constrainedBox, isOutOfBounds: true, violationReducing: false };
      }

      // DRAGGING: Strict check - block if violation exceeds validation threshold + precision tolerance
      if (isDragging) {
        // STRICT CHECK: Always block if violation exceeds validation threshold + precision tolerance
        if (currentViolation > effectiveValidationThreshold && !violationReducing) {
          const constrainedBox = { ...oldBox };
          if (constrainedBox.width < BBOX_MIN_WIDTH) constrainedBox.width = BBOX_MIN_WIDTH;
          if (constrainedBox.height < BBOX_MIN_WIDTH) constrainedBox.height = BBOX_MIN_WIDTH;
          return { constrainedBox, isOutOfBounds: true, violationReducing: false };
        }

        // Check if dragging away from boundaries (only relevant if violation is increasing)
        let draggingAway = false;
        if (previousPointsRef.current && violationIncreasing) {
          const prevMinX = Math.min(...previousPointsRef.current.map((p) => p.x));
          const prevMaxX = Math.max(...previousPointsRef.current.map((p) => p.x));
          const prevMinY = Math.min(...previousPointsRef.current.map((p) => p.y));
          const prevMaxY = Math.max(...previousPointsRef.current.map((p) => p.y));

          // Check if we're moving away from each boundary
          if (violationLeft > EPS && minX > prevMinX) draggingAway = true;
          if (violationRight > EPS && maxX < prevMaxX) draggingAway = true;
          if (violationTop > EPS && minY > prevMinY) draggingAway = true;
          if (violationBottom > EPS && maxY < prevMaxY) draggingAway = true;
        }

        // Violation is within validation threshold - allow if:
        // 1. Violation is reducing (bringing points back in bounds)
        // 2. Violation is within validation threshold (allows slight violation for unlocking)
        // 3. Dragging away from boundaries
        if (violationReducing || withinValidationThreshold || draggingAway) {
          const constrainedBox = { ...newBox };
          if (constrainedBox.width < BBOX_MIN_WIDTH) constrainedBox.width = BBOX_MIN_WIDTH;
          if (constrainedBox.height < BBOX_MIN_WIDTH) constrainedBox.height = BBOX_MIN_WIDTH;
          previousPointsRef.current = projectedPoints;
          previousBoxRef.current = newBox;
          previousRotationRef.current = newRotation;
          return { constrainedBox, isOutOfBounds: true, violationReducing: violationReducing };
        }

        // Block dragging that increases violation beyond validation threshold
        const constrainedBox = { ...oldBox };
        if (constrainedBox.width < BBOX_MIN_WIDTH) constrainedBox.width = BBOX_MIN_WIDTH;
        if (constrainedBox.height < BBOX_MIN_WIDTH) constrainedBox.height = BBOX_MIN_WIDTH;
        return { constrainedBox, isOutOfBounds: true, violationReducing: false };
      }

      // Unknown transformation - strict check
      // STRICT CHECK: Always block if violation exceeds validation threshold + precision tolerance
      if (currentViolation > effectiveValidationThreshold && !violationReducing) {
        const constrainedBox = { ...oldBox };
        if (constrainedBox.width < BBOX_MIN_WIDTH) constrainedBox.width = BBOX_MIN_WIDTH;
        if (constrainedBox.height < BBOX_MIN_WIDTH) constrainedBox.height = BBOX_MIN_WIDTH;
        return { constrainedBox, isOutOfBounds: true, violationReducing: false };
      }

      // Violation is within validation threshold - allow if reducing or within threshold
      if (violationReducing || withinValidationThreshold) {
        const constrainedBox = { ...newBox };
        if (constrainedBox.width < BBOX_MIN_WIDTH) constrainedBox.width = BBOX_MIN_WIDTH;
        if (constrainedBox.height < BBOX_MIN_WIDTH) constrainedBox.height = BBOX_MIN_WIDTH;
        previousPointsRef.current = projectedPoints;
        previousBoxRef.current = newBox;
        previousRotationRef.current = newRotation;
        return { constrainedBox, isOutOfBounds: true, violationReducing: violationReducing };
      }

      // Default: block only if violation is increasing beyond validation threshold
      const constrainedBox = { ...oldBox };
      if (constrainedBox.width < BBOX_MIN_WIDTH) constrainedBox.width = BBOX_MIN_WIDTH;
      if (constrainedBox.height < BBOX_MIN_WIDTH) constrainedBox.height = BBOX_MIN_WIDTH;
      return { constrainedBox, isOutOfBounds: true, violationReducing: false };
    },
    [bounds],
  );

  // Handle transform event
  const handleTransform = React.useCallback(
    (_e: any) => {
      // Apply proxy coordinates to real points in real-time
      const transformer = transformerRef.current;
      if (transformer && bounds) {
        try {
          // Check if we need to constrain the transformer position
          const constraints = calculateTransformerConstraints(transformer, bounds, scaleX, scaleY, transform, fitScale);

          if (constraints) {
            // Force the transformer to the constrained position
            transformer.x(constraints.x);
            transformer.y(constraints.y);
          }

          // Constrain proxy nodes directly to prevent points from going beyond boundaries
          // This ensures precise boundary checking like in onDragMove
          const nodes = transformer.nodes();
          if (nodes.length > 0 && proxyRefs) {
            // Get bounding box of all proxy nodes in image coordinates
            const nodePositions = nodes
              .map((node: Konva.Node) => {
                if (!node || !node.name()) return null;
                const pointIndex = Number.parseInt(node.name().split("-")[1]);
                if (pointIndex >= 0 && selectedPoints.has(pointIndex)) {
                  return { x: node.x(), y: node.y(), index: pointIndex };
                }
                return null;
              })
              .filter((p: { x: number; y: number; index: number } | null): p is { x: number; y: number; index: number } => p !== null);

            if (nodePositions.length > 0) {
              const minX = Math.min(...nodePositions.map((p: { x: number; y: number; index: number }) => p.x));
              const maxX = Math.max(...nodePositions.map((p: { x: number; y: number; index: number }) => p.x));
              const minY = Math.min(...nodePositions.map((p: { x: number; y: number; index: number }) => p.y));
              const maxY = Math.max(...nodePositions.map((p: { x: number; y: number; index: number }) => p.y));

              // Calculate violations
              const violationLeft = Math.max(0, bounds.x - minX);
              const violationRight = Math.max(0, maxX - (bounds.x + bounds.width));
              const violationTop = Math.max(0, bounds.y - minY);
              const violationBottom = Math.max(0, maxY - (bounds.y + bounds.height));

              // Constrain each node if it violates bounds (allow up to VALIDATION_THRESHOLD)
              nodePositions.forEach((nodePos: { x: number; y: number; index: number }) => {
                const node = proxyRefs.current[nodePos.index];
                if (!node) return;

                let constrainedX = nodePos.x;
                let constrainedY = nodePos.y;

                // Constrain to bounds (strict - no tolerance for precision errors in actual node positions)
                if (nodePos.x < bounds.x) {
                  constrainedX = bounds.x;
                } else if (nodePos.x > bounds.x + bounds.width) {
                  constrainedX = bounds.x + bounds.width;
                }

                if (nodePos.y < bounds.y) {
                  constrainedY = bounds.y;
                } else if (nodePos.y > bounds.y + bounds.height) {
                  constrainedY = bounds.y + bounds.height;
                }

                // Only update if position changed (to avoid unnecessary updates)
                if (constrainedX !== nodePos.x || constrainedY !== nodePos.y) {
                  node.x(constrainedX);
                  node.y(constrainedY);
                }
              });
            }
          }

          const transformerCenter = {
            x: transformer.x() + transformer.width() / 2,
            y: transformer.y() + transformer.height() / 2,
          };
          const { newPoints } = applyTransformationToPoints(
            transformer,
            initialPoints,
            proxyRefs,
            false, // Don't update control points here
            originalPositionsRef.current,
            transformerCenter,
            bounds,
            getCurrentPointsRef,
            updateCurrentPointsRef,
            pixelSnapping,
          );

          // Check if this is a rotation operation
          const originalRotation = initialRotationRef.current;
          const currentRotation = transformer.rotation();
          const rotationDelta = originalRotation - currentRotation;
          const isActualRotation = currentRotation !== 0;
          const rotationDirection = rotationDelta > 0 ? "cw" : ("ccw" as const);
          console.log("Rotation check:", {
            originalRotation,
            currentRotation,
            rotationDelta,
            isActualRotation,
            rotationDirection,
          });

          // Apply control point transformations synchronously during rotation to prevent shifting
          // Skip on first tick to avoid jumping
          let finalPoints = newPoints;
          if (!isFirstTransformTickRef.current) {
            // Apply transformation to control points immediately (synchronously) during rotation
            // This ensures anchor and control points stay in sync during quick rotation
            finalPoints = applyTransformationToControlPoints(
              newPoints,
              originalPositionsRef.current,
              transformer.rotation(),
              transformer.scaleX(),
              transformer.scaleY(),
              transformerCenter.x,
              transformerCenter.y,
              isActualRotation,
              pixelSnapping,
            );
          } else {
            isFirstTransformTickRef.current = false;
          }

          // Update the ref immediately with both anchor and control points
          if (updateCurrentPointsRef) {
            updateCurrentPointsRef(finalPoints);
          }

          // Notify of changes
          onPointsChange?.(finalPoints);
        } catch (error) {
          console.warn("Transform error:", error);
        }
      }
    },
    [
      bounds,
      scaleX,
      scaleY,
      transform,
      fitScale,
      initialPoints,
      proxyRefs,
      getCurrentPointsRef,
      updateCurrentPointsRef,
      pixelSnapping,
      onPointsChange,
    ],
  );

  // Cleanup RAF on unmount
  React.useEffect(() => {
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  // Ensure transformer layer and parent groups don't clip rotation handle
  React.useEffect(() => {
    const checkClipping = () => {
      if (transformerRef.current) {
        const layer = transformerRef.current.getLayer();
        if (layer) {
          // Disable clipping on the layer
          layer.clipFunc(undefined);
          layer.clipX(undefined);
          layer.clipY(undefined);
          layer.clipWidth(undefined);
          layer.clipHeight(undefined);

          // Also check parent groups
          let parent = layer.getParent();
          while (parent) {
            if (parent.clipFunc) {
              parent.clipFunc(undefined);
            }
            if (parent.clipX !== undefined) {
              parent.clipX(undefined);
              parent.clipY(undefined);
              parent.clipWidth(undefined);
              parent.clipHeight(undefined);
            }
            parent = parent.getParent();
          }
        }
      }
    };

    // Check immediately and after delays to ensure transformer is attached
    checkClipping();
    const timeout1 = setTimeout(checkClipping, 100);
    const timeout2 = setTimeout(checkClipping, 300);

    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
    };
  }, [selectedPoints.size]); // Re-run when selection changes

  if (selectedPoints.size <= 1 || initialPoints.length === 0) return null;

  // Calculate the bounding box of selected points for the drag area
  const selectedPointCoords = Array.from(selectedPoints)
    .map((index) => initialPoints[index])
    .filter((point) => point !== undefined); // Filter out undefined points

  if (selectedPointCoords.length === 0) return null;

  const TransformerComponent = KonvaTransformer as any;

  return (
    <TransformerComponent
      ref={transformerRef}
      rotateEnabled={true}
      draggable={true}
      keepRatio={false}
      shouldOverdrawWholeArea={true}
      padding={0}
      anchorSize={8}
      anchorStrokeWidth={2}
      borderStrokeWidth={1}
      rotateAnchorOffset={50}
      ignoreStroke={true}
      enabledAnchors={[
        "top-left",
        "top-right",
        "bottom-left",
        "bottom-right",
        "middle-left",
        "middle-right",
        "middle-top",
        "middle-bottom",
      ]}
      // Remove dragBoundFunc - we'll handle constraints in onDragMove instead
      onTransform={handleTransform}
      resizeBoundFunc={(oldBox: any, newBox: any) => {
        // Use Konva's built-in constraint system
        if (bounds) {
          const constrainedBox = { ...newBox };

          // Constrain to left edge
          if (constrainedBox.x < bounds.x) {
            const deltaX = bounds.x - constrainedBox.x;
            constrainedBox.x = bounds.x;
            constrainedBox.width = Math.max(BBOX_MIN_WIDTH, constrainedBox.width - deltaX);
          }
          // Constrain to right edge
          if (constrainedBox.x + constrainedBox.width > bounds.x + bounds.width) {
            constrainedBox.width = bounds.x + bounds.width - constrainedBox.x;
          }
          // Constrain to top edge
          if (constrainedBox.y < bounds.y) {
            const deltaY = bounds.y - constrainedBox.y;
            constrainedBox.y = bounds.y;
            constrainedBox.height = Math.max(BBOX_MIN_WIDTH, constrainedBox.height - deltaY);
          }
          // Constrain to bottom edge
          if (constrainedBox.y + constrainedBox.height > bounds.y + bounds.height) {
            constrainedBox.height = bounds.y + bounds.height - constrainedBox.y;
          }

          return constrainedBox;
        }
        return newBox;
      }}
      onTransformStart={(_e: any) => {
        // Notify that transformation has started
        onTransformationStart?.();

        // Store original positions of selected points
        originalPositionsRef.current = {};
        Array.from(selectedPoints).forEach((index) => {
          const point = initialPoints[index];
          if (point) {
            originalPositionsRef.current[index] = {
              x: point.x,
              y: point.y,
              controlPoint1: point.controlPoint1 ? { ...point.controlPoint1 } : undefined,
              controlPoint2: point.controlPoint2 ? { ...point.controlPoint2 } : undefined,
            };
          }
        });

        // Store initial rotation in dedicated ref
        const currentRotation = transformerRef.current?.rotation() || 0;
        initialRotationRef.current = currentRotation;
        originalPositionsRef.current.initialRotation = currentRotation; // Keep for compatibility

        // Reset rotation direction tracking
        lastRotationDirectionRef.current = 0;

        // Reset the first transform flag to ensure proper rotation tracking
        resetTransformState();

        // Reset the first transform tick flag
        isFirstTransformTickRef.current = true;
      }}
      onDragStart={(_e: any) => {
        // Notify that transformation has started (for history freezing)
        onTransformationStart?.();

        // Store original positions when dragging starts (for pure drag operations)
        originalPositionsRef.current = {};
        Array.from(selectedPoints).forEach((index) => {
          const point = initialPoints[index];
          if (point) {
            originalPositionsRef.current[index] = {
              x: point.x,
              y: point.y,
              controlPoint1: point.controlPoint1 ? { ...point.controlPoint1 } : undefined,
              controlPoint2: point.controlPoint2 ? { ...point.controlPoint2 } : undefined,
            };
          }
        });

        // Store initial rotation in dedicated ref
        const currentRotation = transformerRef.current?.rotation() || 0;
        initialRotationRef.current = currentRotation;
        originalPositionsRef.current.initialRotation = currentRotation; // Keep for compatibility

        // Reset the first transform tick flag
        isFirstTransformTickRef.current = true;

        // Reset previous points and box tracking
        previousPointsRef.current = null;
        previousBoxRef.current = null;
        previousRotationRef.current = null;
      }}
      boundBoxFunc={(oldBox: any, newBox: any) => {
        // Step 1: When function starts, remember oldBox state (current node positions and points)
        const currentPoints = getCurrentPointsRef?.() || initialPoints;
        const savedPoints = currentPoints.map((p) => ({ ...p }));

        // Save current node positions (which represent oldBox state)
        const savedNodePositions = new Map<number, { x: number; y: number }>();
        const transformer = transformerRef.current;
        if (transformer) {
          const nodes = transformer.nodes();
          for (const node of nodes) {
            if (!node || !node.name()) continue;
            const pointIndex = Number.parseInt(node.name().split("-")[1]);
            if (pointIndex >= 0 && selectedPoints.has(pointIndex)) {
              savedNodePositions.set(pointIndex, { x: node.x(), y: node.y() });
            }
          }
        }

        console.log("[boundBoxFunc] Start:", { oldBox, newBox, savedPointsCount: savedPoints.length });

        if (!bounds) {
          const constrainedBox = { ...newBox };
          if (constrainedBox.width < BBOX_MIN_WIDTH) {
            constrainedBox.width = BBOX_MIN_WIDTH;
          }
          if (constrainedBox.height < BBOX_MIN_WIDTH) {
            constrainedBox.height = BBOX_MIN_WIDTH;
          }
          return constrainedBox;
        }

        if (!transformer) {
          const constrainedBox = { ...newBox };
          if (constrainedBox.width < BBOX_MIN_WIDTH) {
            constrainedBox.width = BBOX_MIN_WIDTH;
          }
          if (constrainedBox.height < BBOX_MIN_WIDTH) {
            constrainedBox.height = BBOX_MIN_WIDTH;
          }
          return constrainedBox;
        }

        const nodes = transformer.nodes();
        if (nodes.length === 0) {
          const constrainedBox = { ...newBox };
          if (constrainedBox.width < BBOX_MIN_WIDTH) {
            constrainedBox.width = BBOX_MIN_WIDTH;
          }
          if (constrainedBox.height < BBOX_MIN_WIDTH) {
            constrainedBox.height = BBOX_MIN_WIDTH;
          }
          return constrainedBox;
        }

        // Step 2: Calculate new points according to newBox transformation state
        // Manually calculate projected points by applying transformation to original points
        const projectedPoints: Array<{ x: number; y: number }> = [];

        // Get transformation centers
        const oldCenterX = oldBox.x + (oldBox.width || transformer.width()) / 2;
        const oldCenterY = oldBox.y + (oldBox.height || transformer.height()) / 2;
        const newCenterX = newBox.x + (newBox.width || transformer.width()) / 2;
        const newCenterY = newBox.y + (newBox.height || transformer.height()) / 2;

        // Calculate transformation deltas from oldBox to newBox
        const rotationDelta = ((newBox.rotation || 0) - (oldBox.rotation || 0)) * (Math.PI / 180);
        const scaleXDelta = (newBox.scaleX || 1) / (oldBox.scaleX || 1);
        const scaleYDelta = (newBox.scaleY || 1) / (oldBox.scaleY || 1);

        const cos = Math.cos(rotationDelta);
        const sin = Math.sin(rotationDelta);

        // Apply transformation to current node positions (which represent oldBox state)
        for (const node of nodes) {
          if (!node || !node.name()) continue;
          const pointIndex = Number.parseInt(node.name().split("-")[1]);
          if (pointIndex >= 0 && selectedPoints.has(pointIndex)) {
            // Get current position (which is the oldBox state)
            const currentX = node.x();
            const currentY = node.y();

            // Get position relative to old center
            let x = currentX - oldCenterX;
            let y = currentY - oldCenterY;

            // Apply scaling
            x *= scaleXDelta;
            y *= scaleYDelta;

            // Apply rotation
            const rotatedX = x * cos - y * sin;
            const rotatedY = x * sin + y * cos;

            // Translate to new center
            const projectedX = rotatedX + newCenterX;
            const projectedY = rotatedY + newCenterY;

            projectedPoints.push({ x: projectedX, y: projectedY });
          }
        }

        console.log("[boundBoxFunc] Projected points:", projectedPoints);

        if (projectedPoints.length === 0) {
          const constrainedBox = { ...newBox };
          if (constrainedBox.width < BBOX_MIN_WIDTH) {
            constrainedBox.width = BBOX_MIN_WIDTH;
          }
          if (constrainedBox.height < BBOX_MIN_WIDTH) {
            constrainedBox.height = BBOX_MIN_WIDTH;
          }
          return constrainedBox;
        }

        // Step 3: Check newly calculated box and points for violation
        const minX = Math.min(...projectedPoints.map((p) => p.x));
        const maxX = Math.max(...projectedPoints.map((p) => p.x));
        const minY = Math.min(...projectedPoints.map((p) => p.y));
        const maxY = Math.max(...projectedPoints.map((p) => p.y));

        const violationLeft = Math.max(0, bounds.x - minX);
        const violationRight = Math.max(0, maxX - (bounds.x + bounds.width));
        const violationTop = Math.max(0, bounds.y - minY);
        const violationBottom = Math.max(0, maxY - (bounds.y + bounds.height));
        const currentViolation = Math.max(violationLeft, violationRight, violationTop, violationBottom);

        // Log each point individually
        projectedPoints.forEach((p, i) => {
          const outLeft = p.x < bounds.x;
          const outRight = p.x > bounds.x + bounds.width;
          const outTop = p.y < bounds.y;
          const outBottom = p.y > bounds.y + bounds.height;
          if (outLeft || outRight || outTop || outBottom) {
            console.log(`[boundBoxFunc] Point ${i} OUT OF BOUNDS:`, {
              x: p.x,
              y: p.y,
              outLeft,
              outRight,
              outTop,
              outBottom,
              boundsX: bounds.x,
              boundsY: bounds.y,
              boundsRight: bounds.x + bounds.width,
              boundsBottom: bounds.y + bounds.height,
            });
          }
        });

        console.log("[boundBoxFunc] Violation check:", {
          currentViolation,
          LOCKING_THRESHOLD,
          shouldBlock: currentViolation > 0,
          bounds: { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height },
          boundsRight: bounds.x + bounds.width,
          boundsBottom: bounds.y + bounds.height,
          minX,
          maxX,
          minY,
          maxY,
          violationLeft,
          violationRight,
          violationTop,
          violationBottom,
          projectedPoints: projectedPoints.map((p, i) => ({ index: i, x: p.x, y: p.y })),
        });

        // Step 4: If violation, restore box to oldBox and points to saved state
        // Block ANY violation, not just ones above threshold
        if (currentViolation > 0) {
          console.log("[boundBoxFunc] BLOCKING - restoring to oldBox");

          // Restore transformer to oldBox
          transformer.x(oldBox.x);
          transformer.y(oldBox.y);
          transformer.width(oldBox.width || transformer.width());
          transformer.height(oldBox.height || transformer.height());
          transformer.rotation(oldBox.rotation || 0);
          transformer.scaleX(oldBox.scaleX || 1);
          transformer.scaleY(oldBox.scaleY || 1);

          // Restore nodes to saved positions (oldBox state)
          if (proxyRefs) {
            nodes.forEach((node: Konva.Node) => {
              if (!node || !node.name()) return;
              const pointIndex = Number.parseInt(node.name().split("-")[1]);
              if (pointIndex >= 0 && selectedPoints.has(pointIndex)) {
                const savedPos = savedNodePositions.get(pointIndex);
                if (savedPos) {
                  node.x(savedPos.x);
                  node.y(savedPos.y);
                }
              }
            });
          }

          // Restore full points array to saved state (oldBox state)
          const restoredPoints = savedPoints.map((point) => ({ ...point }));

          if (updateCurrentPointsRef) {
            updateCurrentPointsRef(restoredPoints);
          }
          onPointsChange?.(restoredPoints);

          transformer.getLayer()?.batchDraw();

          console.log("[boundBoxFunc] Returning oldBox to block transformation");
          return oldBox;
        }

        // No violation - return newBox
        console.log("[boundBoxFunc] No violation - returning newBox");
        const constrainedBox = { ...newBox };
        if (constrainedBox.width < BBOX_MIN_WIDTH) {
          constrainedBox.width = BBOX_MIN_WIDTH;
        }
        if (constrainedBox.height < BBOX_MIN_WIDTH) {
          constrainedBox.height = BBOX_MIN_WIDTH;
        }
        return constrainedBox;
      }}
      onDragMove={(_e: any) => {
        // Apply drag movement to real points in real-time with constraints
        const transformer = transformerRef.current;
        if (transformer && bounds) {
          try {
            // Get all shapes in the transformer
            const shapes = transformer.nodes();
            if (shapes.length === 0) return;

            // Get bounding box of all shapes (like getTotalBox in the example)
            const boxes = shapes.map((shape) => shape.getClientRect());
            const box = {
              x: Math.min(...boxes.map((b) => b.x)),
              y: Math.min(...boxes.map((b) => b.y)),
              width: Math.max(...boxes.map((b) => b.x + b.width)) - Math.min(...boxes.map((b) => b.x)),
              height: Math.max(...boxes.map((b) => b.y + b.height)) - Math.min(...boxes.map((b) => b.y)),
            };

            // Convert box to image coordinates
            const imageBox = {
              x: (box.x - transform.offsetX) / (transform.zoom * fitScale),
              y: (box.y - transform.offsetY) / (transform.zoom * fitScale),
              width: box.width / (transform.zoom * fitScale),
              height: box.height / (transform.zoom * fitScale),
            };

            // Check if out of bounds and constrain each shape
            shapes.forEach((shape) => {
              const absPos = shape.getAbsolutePosition();
              const offsetX = box.x - absPos.x;
              const offsetY = box.y - absPos.y;

              const newAbsPos = { ...absPos };

              if (imageBox.x < bounds.x) {
                newAbsPos.x = bounds.x * (transform.zoom * fitScale) + transform.offsetX - offsetX;
              }
              if (imageBox.y < bounds.y) {
                newAbsPos.y = bounds.y * (transform.zoom * fitScale) + transform.offsetY - offsetY;
              }
              if (imageBox.x + imageBox.width > bounds.x + bounds.width) {
                newAbsPos.x =
                  (bounds.x + bounds.width) * (transform.zoom * fitScale) + transform.offsetX - box.width - offsetX;
              }
              if (imageBox.y + imageBox.height > bounds.y + bounds.height) {
                newAbsPos.y =
                  (bounds.y + bounds.height) * (transform.zoom * fitScale) + transform.offsetY - box.height - offsetY;
              }

              // Apply the constrained position to the individual shape
              shape.setAbsolutePosition(newAbsPos);
            });

            const transformerCenter = {
              x: transformer.x() + transformer.width() / 2,
              y: transformer.y() + transformer.height() / 2,
            };
            const { newPoints } = applyTransformationToPoints(
              transformer,
              initialPoints,
              proxyRefs,
              false, // Don't update control points here
              originalPositionsRef.current,
              transformerCenter,
              bounds,
              getCurrentPointsRef,
              updateCurrentPointsRef,
              pixelSnapping,
            );

            // Update the ref immediately so next transformation tick uses latest points
            if (updateCurrentPointsRef) {
              updateCurrentPointsRef(newPoints);
            }

            // Apply transformation to control points using RAF
            if (rafIdRef.current) {
              cancelAnimationFrame(rafIdRef.current);
            }
            rafIdRef.current = requestAnimationFrame(() => {
              // Apply transformation to control points using original positions as base
              const updatedPoints = applyTransformationToControlPoints(
                newPoints,
                originalPositionsRef.current,
                transformer.rotation(),
                transformer.scaleX(),
                transformer.scaleY(),
                transformerCenter.x,
                transformerCenter.y,
                false, // isRotation = false for onDragMove (translation only)
                pixelSnapping,
              );
              onPointsChange?.(updatedPoints);
            });
          } catch (error) {
            console.warn("Drag move error:", error);
          }
        }
      }}
      onDragEnd={(_e: any) => {
        // Get the transformer
        const transformer = transformerRef.current;
        if (!transformer) {
          return;
        }

        try {
          // Apply final drag position to real points
          const transformerCenter = {
            x: transformer.x() + transformer.width() / 2,
            y: transformer.y() + transformer.height() / 2,
          };
          const { newPoints } = applyTransformationToPoints(
            transformer,
            initialPoints,
            proxyRefs,
            true,
            originalPositionsRef.current,
            transformerCenter,
            bounds,
            getCurrentPointsRef,
            updateCurrentPointsRef,
          );

          // Update the ref immediately so next transformation uses latest points
          if (updateCurrentPointsRef) {
            updateCurrentPointsRef(newPoints);
          }

          // Apply control point transformations
          const updatedPoints = applyTransformationToControlPoints(
            newPoints,
            originalPositionsRef.current,
            transformer.rotation(),
            transformer.scaleX(),
            transformer.scaleY(),
            transformerCenter.x,
            transformerCenter.y,
            false, // isRotation = false for drag operations
            pixelSnapping,
          );

          onPointsChange?.(updatedPoints);

          // Update original positions with the final transformed positions
          updateOriginalPositions(updatedPoints, originalPositionsRef.current);

          // Store the transformer state for future updates
          onTransformStateChange?.({
            rotation: transformer.rotation(),
            scaleX: transformer.scaleX(),
            scaleY: transformer.scaleY(),
            centerX: transformer.x() + transformer.width() / 2,
            centerY: transformer.y() + transformer.height() / 2,
          });

          // Don't reset transformer - keep proxy points where they are
          transformer.getLayer()?.batchDraw();
        } catch (error) {
          console.warn("Drag end error:", error);
        }

        // Notify that transformation has ended (for history unfreezing)
        onTransformationEnd?.();
      }}
      onTransformEnd={(_e: any) => {
        // Get the transformer
        const transformer = transformerRef.current;
        if (!transformer) {
          return;
        }

        try {
          // Apply final transformation to real points
          const transformerCenter = {
            x: transformer.x() + transformer.width() / 2,
            y: transformer.y() + transformer.height() / 2,
          };
          const { newPoints } = applyTransformationToPoints(
            transformer,
            initialPoints,
            proxyRefs,
            true,
            originalPositionsRef.current,
            transformerCenter,
            bounds,
            getCurrentPointsRef,
            updateCurrentPointsRef,
          );

          // Update the ref immediately so next transformation uses latest points
          if (updateCurrentPointsRef) {
            updateCurrentPointsRef(newPoints);
          }
          // Apply control point transformations
          const isActualRotation = Math.abs(transformer.rotation()) > 1.0;
          const updatedPoints = applyTransformationToControlPoints(
            newPoints,
            originalPositionsRef.current,
            transformer.rotation(),
            transformer.scaleX(),
            transformer.scaleY(),
            transformerCenter.x,
            transformerCenter.y,
            isActualRotation,
            pixelSnapping,
          );

          onPointsChange?.(updatedPoints);

          // Update original positions with the final transformed positions
          // This ensures that subsequent transformations use the current state as the base
          updateOriginalPositions(updatedPoints, originalPositionsRef.current);

          // Store the transformer state for future updates
          onTransformStateChange?.({
            rotation: transformer.rotation(),
            scaleX: transformer.scaleX(),
            scaleY: transformer.scaleY(),
            centerX: transformer.x() + transformer.width() / 2,
            centerY: transformer.y() + transformer.height() / 2,
          });

          // Don't reset transformer - keep proxy points where they are
          // This maintains the rotation state of the transformer
          transformer.getLayer()?.batchDraw();
        } catch (error) {
          console.warn("Transform end error:", error);
        }

        // Notify that transformation has ended
        onTransformationEnd?.();

        // Call external onTransformEnd handler
        onTransformEnd?.(_e);
      }}
    />
  );
};
