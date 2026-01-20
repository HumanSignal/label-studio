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

  // Track previous point positions to detect if violation is reducing
  const previousPointsRef = React.useRef<Array<{ x: number; y: number }> | null>(null);

  // Helper function to calculate constraint based on point bounding box (similar to onDragMove logic)
  const calculatePointBasedConstraints = React.useCallback(
    (
      projectedPoints: Array<{ x: number; y: number }>,
      oldBox: any,
      newBox: any,
    ): { constrainedBox: any; isOutOfBounds: boolean; violationReducing: boolean } => {
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

      // Check if out of bounds
      const isOutOfBounds =
        pointBox.x < bounds.x ||
        pointBox.x + pointBox.width > bounds.x + bounds.width ||
        pointBox.y < bounds.y ||
        pointBox.y + pointBox.height > bounds.y + bounds.height;

      if (!isOutOfBounds) {
        // Points are in bounds - allow transformation
        const constrainedBox = { ...newBox };
        if (constrainedBox.width < BBOX_MIN_WIDTH) constrainedBox.width = BBOX_MIN_WIDTH;
        if (constrainedBox.height < BBOX_MIN_WIDTH) constrainedBox.height = BBOX_MIN_WIDTH;
        previousPointsRef.current = projectedPoints;
        return { constrainedBox, isOutOfBounds: false, violationReducing: false };
      }

      // Calculate violation amounts
      const violationLeft = Math.max(0, bounds.x - pointBox.x);
      const violationRight = Math.max(0, pointBox.x + pointBox.width - (bounds.x + bounds.width));
      const violationTop = Math.max(0, bounds.y - pointBox.y);
      const violationBottom = Math.max(0, pointBox.y + pointBox.height - (bounds.y + bounds.height));
      const currentViolation = Math.max(violationLeft, violationRight, violationTop, violationBottom);

      // Check if violation is reducing compared to previous points
      let violationReducing = false;
      if (previousPointsRef.current) {
        const prevMinX = Math.min(...previousPointsRef.current.map((p) => p.x));
        const prevMaxX = Math.max(...previousPointsRef.current.map((p) => p.x));
        const prevMinY = Math.min(...previousPointsRef.current.map((p) => p.y));
        const prevMaxY = Math.max(...previousPointsRef.current.map((p) => p.y));

        const prevViolationLeft = Math.max(0, bounds.x - prevMinX);
        const prevViolationRight = Math.max(0, prevMaxX - (bounds.x + bounds.width));
        const prevViolationTop = Math.max(0, bounds.y - prevMinY);
        const prevViolationBottom = Math.max(0, prevMaxY - (bounds.y + bounds.height));
        const prevViolation = Math.max(prevViolationLeft, prevViolationRight, prevViolationTop, prevViolationBottom);

        violationReducing = currentViolation < prevViolation - 0.01; // EPS threshold
      }

      // If violation is reducing, allow the transformation
      if (violationReducing) {
        const constrainedBox = { ...newBox };
        if (constrainedBox.width < BBOX_MIN_WIDTH) constrainedBox.width = BBOX_MIN_WIDTH;
        if (constrainedBox.height < BBOX_MIN_WIDTH) constrainedBox.height = BBOX_MIN_WIDTH;
        previousPointsRef.current = projectedPoints;
        return { constrainedBox, isOutOfBounds: true, violationReducing: true };
      }

      // Violation is not reducing - block transformation
      const constrainedBox = { ...oldBox };
      if (constrainedBox.width < BBOX_MIN_WIDTH) constrainedBox.width = BBOX_MIN_WIDTH;
      if (constrainedBox.height < BBOX_MIN_WIDTH) constrainedBox.height = BBOX_MIN_WIDTH;
      return { constrainedBox, isOutOfBounds: true, violationReducing: false };
    },
    [bounds],
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
      enabledAnchors={["top-left", "top-right", "bottom-left", "bottom-right", "middle-left", "middle-right", "middle-top", "middle-bottom"]}
      // Remove dragBoundFunc - we'll handle constraints in onDragMove instead
      onTransform={(_e: any) => {
        // Apply proxy coordinates to real points in real-time
        const transformer = transformerRef.current;
        if (transformer && bounds) {
          try {
            // Check if we need to constrain the transformer position
            const constraints = calculateTransformerConstraints(
              transformer,
              bounds,
              scaleX,
              scaleY,
              transform,
              fitScale,
            );

            if (constraints) {
              // Force the transformer to the constrained position
              transformer.x(constraints.x);
              transformer.y(constraints.y);
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
            const originalRotation = originalPositionsRef.current.initialRotation || 0;
            const rotationDelta = Math.abs(transformer.rotation() - originalRotation);
            const isActualRotation = rotationDelta > 1.0;

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
      }}
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

        // Store initial rotation
        originalPositionsRef.current.initialRotation = transformerRef.current?.rotation() || 0;

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

        // Store initial rotation
        originalPositionsRef.current.initialRotation = transformerRef.current?.rotation() || 0;

        // Reset the first transform tick flag
        isFirstTransformTickRef.current = true;

        // Reset previous points tracking
        previousPointsRef.current = null;
      }}
      boundBoxFunc={(oldBox, newBox) => {
        if (!bounds) {
          // Only enforce minimum size
          const constrainedBox = { ...newBox };
          if (constrainedBox.width < BBOX_MIN_WIDTH) {
            constrainedBox.width = BBOX_MIN_WIDTH;
          }
          if (constrainedBox.height < BBOX_MIN_WIDTH) {
            constrainedBox.height = BBOX_MIN_WIDTH;
          }
          return constrainedBox;
        }

        const transformer = transformerRef.current;
        if (!transformer) {
          // Only enforce minimum size
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
          // Only enforce minimum size
          const constrainedBox = { ...newBox };
          if (constrainedBox.width < BBOX_MIN_WIDTH) {
            constrainedBox.width = BBOX_MIN_WIDTH;
          }
          if (constrainedBox.height < BBOX_MIN_WIDTH) {
            constrainedBox.height = BBOX_MIN_WIDTH;
          }
          return constrainedBox;
        }

        // Get point positions from nodes (they're already in image coordinates)
        // Konva updates node positions during transformation, so we can read them directly
        const projectedPoints: Array<{ x: number; y: number }> = [];
        for (const node of nodes) {
          if (!node || !node.name()) continue;
          const pointIndex = Number.parseInt(node.name().split("-")[1]);
          if (pointIndex >= 0 && selectedPoints.has(pointIndex)) {
            // Node positions are in image coordinates
            projectedPoints.push({ x: node.x(), y: node.y() });
          }
        }

        if (projectedPoints.length === 0) {
          // Only enforce minimum size
          const constrainedBox = { ...newBox };
          if (constrainedBox.width < BBOX_MIN_WIDTH) {
            constrainedBox.width = BBOX_MIN_WIDTH;
          }
          if (constrainedBox.height < BBOX_MIN_WIDTH) {
            constrainedBox.height = BBOX_MIN_WIDTH;
          }
          return constrainedBox;
        }

        // Use the same constraint logic as onDragMove
        const { constrainedBox } = calculatePointBasedConstraints(projectedPoints, oldBox, newBox);
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
