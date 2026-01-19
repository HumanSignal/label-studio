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
  proxyRefs?: React.MutableRefObject<{ [key: number]: Konva.Circle | null }>;
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

  // Cleanup RAF on unmount
  React.useEffect(() => {
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

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

            // Update the ref immediately so next transformation tick uses latest points
            if (updateCurrentPointsRef) {
              updateCurrentPointsRef(newPoints);
            }

            // Skip control point transformations on the first tick to avoid jumping
            if (isFirstTransformTickRef.current) {
              isFirstTransformTickRef.current = false;
              onPointsChange?.(newPoints);
            } else {
              // Apply transformation to control points using RAF
              if (rafIdRef.current) {
                cancelAnimationFrame(rafIdRef.current);
              }
              rafIdRef.current = requestAnimationFrame(() => {
                // Check if this is actually a rotation operation (not just scaling)
                const isActualRotation = Math.abs(transformer.rotation()) > 1.0;

                // Apply transformation to control points using original positions as base
                const updatedPoints = applyTransformationToControlPoints(
                  newPoints,
                  originalPositionsRef.current,
                  transformer.rotation(),
                  transformer.scaleX(),
                  transformer.scaleY(),
                  transformerCenter.x,
                  transformerCenter.y,
                  isActualRotation, // Only apply rotation logic if there's actual rotation
                  pixelSnapping,
                );
                onPointsChange?.(updatedPoints);
              });
            }
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
      }}
      boundBoxFunc={(oldBox, newBox) => {
        if (!bounds) return newBox;

        // Calculate the rotated bounding box properly
        const getCorner = (pivotX: number, pivotY: number, diffX: number, diffY: number, angle: number) => {
          const distance = Math.sqrt(diffX * diffX + diffY * diffY);
          angle += Math.atan2(diffY, diffX);
          const x = pivotX + distance * Math.cos(angle);
          const y = pivotY + distance * Math.sin(angle);
          return { x, y };
        };

        const { x, y, width, height, rotation = 0 } = newBox;
        const rad = rotation;

        // Get all four corners of the rotated rectangle
        const p1 = getCorner(x, y, 0, 0, rad);
        const p2 = getCorner(x, y, width, 0, rad);
        const p3 = getCorner(x, y, width, height, rad);
        const p4 = getCorner(x, y, 0, height, rad);

        // Calculate the bounding box of the rotated rectangle
        const rotatedBox = {
          x: Math.min(p1.x, p2.x, p3.x, p4.x),
          y: Math.min(p1.y, p2.y, p3.y, p4.y),
          width: Math.max(p1.x, p2.x, p3.x, p4.x) - Math.min(p1.x, p2.x, p3.x, p4.x),
          height: Math.max(p1.y, p2.y, p3.y, p4.y) - Math.min(p1.y, p2.y, p3.y, p4.y),
        };

        // Convert rotated box to image coordinates
        const imageBox = {
          x: (rotatedBox.x - transform.offsetX) / (transform.zoom * fitScale),
          y: (rotatedBox.y - transform.offsetY) / (transform.zoom * fitScale),
          width: rotatedBox.width / (transform.zoom * fitScale),
          height: rotatedBox.height / (transform.zoom * fitScale),
        };

        // Check if the rotated box would go out of bounds
        const isOut =
          imageBox.x < bounds.x ||
          imageBox.y < bounds.y ||
          imageBox.x + imageBox.width > bounds.x + bounds.width ||
          imageBox.y + imageBox.height > bounds.y + bounds.height;

        return isOut ? oldBox : newBox;
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
