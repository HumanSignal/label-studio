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
  shouldPreventTransformationDueToBoundary,
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

  // Store last valid transformer state (before any point would go out of bounds)
  // This is the state we revert to when transformation is prevented
  const lastValidTransformerStateRef = React.useRef<{
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    scaleX: number;
    scaleY: number;
  } | null>(null);

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
      dragBoundFunc={(oldPos, newPos) => {
        // Prevent dragging when points are at boundaries and would stay there
        if (!bounds) return newPos;
        
        const transformer = transformerRef.current;
        if (!transformer) return newPos;
        
        // Check actual point positions, not proxy nodes
        const currentPoints = getCurrentPointsRef ? getCurrentPointsRef() : initialPoints;
        const tolerance = 0.1;
        const toleranceCheck = 0.001;
        
        // Calculate drag delta
        const deltaX = newPos.x - oldPos.x;
        const deltaY = newPos.y - oldPos.y;
        
        // Check each selected point
        for (const pointIndex of Array.from(selectedPoints)) {
          const currentPoint = currentPoints[pointIndex];
          if (!currentPoint) continue;
          
          // Check if point is at boundary
          const atBoundary = 
            currentPoint.x <= tolerance ||
            currentPoint.x >= bounds.width - tolerance ||
            currentPoint.y <= tolerance ||
            currentPoint.y >= bounds.height - tolerance;
          
          if (atBoundary) {
            // Calculate where point would be after drag
            const newX = currentPoint.x + deltaX;
            const newY = currentPoint.y + deltaY;
            
            // Constrain to bounds
            const constrainedX = Math.max(0, Math.min(bounds.width, newX));
            const constrainedY = Math.max(0, Math.min(bounds.height, newY));
            
            // Check if point would actually move
            const wouldMove =
              Math.abs(constrainedX - currentPoint.x) > toleranceCheck ||
              Math.abs(constrainedY - currentPoint.y) > toleranceCheck;
            
            // If point wouldn't move, prevent drag
            if (!wouldMove) {
              return oldPos;
            }
          }
        }
        
        return newPos;
      }}
      onTransform={(_e: any) => {
        // Apply proxy coordinates to real points in real-time
        const transformer = transformerRef.current;
        if (transformer && bounds) {
          try {
            // Store transformer state BEFORE applying transformation
            // This is the state we'll revert to if points are constrained
            const transformerStateBeforeTransform = {
              x: transformer.x(),
              y: transformer.y(),
              width: transformer.width(),
              height: transformer.height(),
              rotation: transformer.rotation(),
              scaleX: transformer.scaleX(),
              scaleY: transformer.scaleY(),
            };
            
            // Allow transformer to move freely - points will be constrained individually
            const transformerCenter = {
              x: transformer.x() + transformer.width() / 2,
              y: transformer.y() + transformer.height() / 2,
            };
            const { newPoints, wasPrevented } = applyTransformationToPoints(
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

            // If transformation was prevented (points stopped moving), ALWAYS revert transformer
            // This ensures transformer bbox stops whenever points stop
            if (wasPrevented) {
              // Revert to the state BEFORE this transformation attempt
              const validState = lastValidTransformerStateRef.current || transformerStateBeforeTransform;

              // Revert transformer to last valid state
              // Use setAttrs to update all properties atomically
              transformer.setAttrs({
                x: validState.x,
                y: validState.y,
                width: validState.width,
                height: validState.height,
                rotation: validState.rotation,
                scaleX: validState.scaleX,
                scaleY: validState.scaleY,
              });

              // Restore proxy nodes to match constrained point positions
              // This prevents drift when transformation is prevented
              const nodes = transformer.nodes();
              for (const node of nodes) {
                if (!node || !node.name()) continue;
                const pointIndex = Number.parseInt(node.name().split("-")[1]);
                const constrainedPoint = newPoints[pointIndex];
                if (constrainedPoint) {
                  node.x(constrainedPoint.x);
                  node.y(constrainedPoint.y);
                }
              }

              // Force update the transformer and its layer
              // This ensures proxy nodes are also updated to match the reverted transformer state
              transformer.forceUpdate();
              transformer.getLayer()?.batchDraw();
              
              // Also force update all proxy nodes to ensure they're in sync
              nodes.forEach((node) => {
                node.getLayer()?.batchDraw();
              });

              // Still update points ref with constrained positions (points may have been constrained)
              // This ensures next transformation tick uses the correct constrained positions
              if (updateCurrentPointsRef) {
                updateCurrentPointsRef(newPoints);
              }

              // Early return - don't process control points or call onPointsChange
              return;
            }

            // Transformation was allowed - check if points actually moved
            const pointsMoved = newPoints.some((newPoint, index) => {
              const currentPoint = getCurrentPointsRef ? getCurrentPointsRef()[index] : initialPoints[index];
              if (!currentPoint) return false;
              return (
                Math.abs(newPoint.x - currentPoint.x) > 0.001 ||
                Math.abs(newPoint.y - currentPoint.y) > 0.001
              );
            });

            // Only update last valid state if points actually moved and are in bounds
            if (pointsMoved) {
              const allPointsInBounds = newPoints.every((point) => {
                if (!bounds) return true;
                return (
                  point.x >= 0 &&
                  point.x <= bounds.width &&
                  point.y >= 0 &&
                  point.y <= bounds.height
                );
              });

              if (allPointsInBounds) {
                // All points are in bounds and moved - this is a valid state
                lastValidTransformerStateRef.current = {
                  x: transformer.x(),
                  y: transformer.y(),
                  width: transformer.width(),
                  height: transformer.height(),
                  rotation: transformer.rotation(),
                  scaleX: transformer.scaleX(),
                  scaleY: transformer.scaleY(),
                };
              }
            }

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
        // Check if transformation would move any point out of bounds
        // If so, prevent the transformation to avoid deformation
        // This follows the EXACT same pattern as dragBoundFunc
        if (!bounds) return newBox;

        const transformer = transformerRef.current;
        if (!transformer) return newBox;

        // Check actual point positions, not proxy nodes
        const currentPoints = getCurrentPointsRef ? getCurrentPointsRef() : initialPoints;
        const tolerance = 0.1;
        const toleranceCheck = 0.001;
        
        // Get proxy nodes to see where they would be after transformation
        const nodes = transformer.nodes();
        
        // Check each selected point
        for (const pointIndex of Array.from(selectedPoints)) {
          const currentPoint = currentPoints[pointIndex];
          if (!currentPoint) continue;
          
          // Check if point is at boundary
          const atBoundary = 
            currentPoint.x <= tolerance ||
            currentPoint.x >= bounds.width - tolerance ||
            currentPoint.y <= tolerance ||
            currentPoint.y >= bounds.height - tolerance;
          
          if (atBoundary) {
            // Find the proxy node for this point
            const proxyNode = nodes.find((node) => {
              if (!node || !node.name()) return false;
              const idx = Number.parseInt(node.name().split("-")[1]);
              return idx === pointIndex;
            });
            
            if (!proxyNode) continue;
            
            // Get where the proxy node would be after transformation (Konva has already moved it)
            const transformedX = proxyNode.x();
            const transformedY = proxyNode.y();
            
            // Constrain to bounds (same as dragBoundFunc)
            const constrainedX = Math.max(0, Math.min(bounds.width, transformedX));
            const constrainedY = Math.max(0, Math.min(bounds.height, transformedY));
            
            // Check if point would actually move (same as dragBoundFunc)
            const wouldMove =
              Math.abs(constrainedX - currentPoint.x) > toleranceCheck ||
              Math.abs(constrainedY - currentPoint.y) > toleranceCheck;
            
            // If point wouldn't move, prevent transformation (same as dragBoundFunc)
            if (!wouldMove) {
              return oldBox;
            }
          }
        }

        // All points would stay within bounds - allow transformation
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

        // Store initial transformer state as the last valid state
        const transformer = transformerRef.current;
        if (transformer) {
          lastValidTransformerStateRef.current = {
            x: transformer.x(),
            y: transformer.y(),
            width: transformer.width(),
            height: transformer.height(),
            rotation: transformer.rotation(),
            scaleX: transformer.scaleX(),
            scaleY: transformer.scaleY(),
          };
        }

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
        // Check if rotation would move any point out of bounds
        // Prevent rotation entirely when points are at boundaries to avoid shape corruption
        // This follows the EXACT same pattern as dragBoundFunc
        if (!bounds) return newBox;

        const transformer = transformerRef.current;
        if (!transformer) return newBox;

        // Calculate rotation change
        const rotationChange = (newBox.rotation || 0) - (oldBox.rotation || 0);
        if (Math.abs(rotationChange) < 0.01) {
          // No rotation change - allow transformation
          return newBox;
        }

        // Check actual point positions, not proxy nodes
        const currentPoints = getCurrentPointsRef ? getCurrentPointsRef() : initialPoints;
        const tolerance = 0.1;
        const toleranceCheck = 0.001;
        
        // Get proxy nodes to see where they would be after transformation
        const nodes = transformer.nodes();
        
        // Check each selected point
        for (const pointIndex of Array.from(selectedPoints)) {
          const currentPoint = currentPoints[pointIndex];
          if (!currentPoint) continue;
          
          // Check if point is at boundary
          const atBoundary = 
            currentPoint.x <= tolerance ||
            currentPoint.x >= bounds.width - tolerance ||
            currentPoint.y <= tolerance ||
            currentPoint.y >= bounds.height - tolerance;
          
          if (atBoundary) {
            // Find the proxy node for this point
            const proxyNode = nodes.find((node) => {
              if (!node || !node.name()) return false;
              const idx = Number.parseInt(node.name().split("-")[1]);
              return idx === pointIndex;
            });
            
            if (!proxyNode) continue;
            
            // Get where the proxy node would be after transformation (Konva has already moved it)
            const transformedX = proxyNode.x();
            const transformedY = proxyNode.y();
            
            // Constrain to bounds (same as dragBoundFunc)
            const constrainedX = Math.max(0, Math.min(bounds.width, transformedX));
            const constrainedY = Math.max(0, Math.min(bounds.height, transformedY));
            
            // Check if point would actually move (same as dragBoundFunc)
            const wouldMove =
              Math.abs(constrainedX - currentPoint.x) > toleranceCheck ||
              Math.abs(constrainedY - currentPoint.y) > toleranceCheck;
            
            // If point wouldn't move, prevent rotation (same as dragBoundFunc)
            if (!wouldMove) {
              return oldBox;
            }
          }
        }

        // No points are locked - check if rotation would move any point out of bounds
        // Use proxy nodes to check where points would be after transformation
        for (const pointIndex of Array.from(selectedPoints)) {
          const currentPoint = currentPoints[pointIndex];
          if (!currentPoint) continue;

          // Find the proxy node for this point
          const proxyNode = nodes.find((node) => {
            if (!node || !node.name()) return false;
            const idx = Number.parseInt(node.name().split("-")[1]);
            return idx === pointIndex;
          });
          
          if (!proxyNode) continue;
          
          // Get where the proxy node would be after transformation
          const transformedX = proxyNode.x();
          const transformedY = proxyNode.y();

          // Check if final position would be out of bounds
          const wouldBeOutOfBounds =
            transformedX < 0 ||
            transformedX > bounds.width ||
            transformedY < 0 ||
            transformedY > bounds.height;

          if (wouldBeOutOfBounds) {
            // Point would go out of bounds - prevent rotation
            // Restore proxy nodes to match current point positions to prevent drift
            for (const node of nodes) {
              if (!node || !node.name()) continue;
              const pointIdx = Number.parseInt(node.name().split("-")[1]);
              const point = currentPoints[pointIdx];
              if (point) {
                node.x(point.x);
                node.y(point.y);
              }
            }
            return oldBox;
          }
        }

        // No points are locked and rotation wouldn't move any point out of bounds - allow rotation
        return newBox;
      }}
      onDragMove={(_e: any) => {
        // Apply drag movement to real points in real-time with constraints
        const transformer = transformerRef.current;
        if (transformer && bounds) {
          try {
            // Note: We'll check constraints after applying transformation to points
            // This allows us to detect if points were constrained and revert transformer accordingly

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
            const { newPoints, wasPrevented } = applyTransformationToPoints(
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

            // If transformation was prevented (points stopped moving), revert transformer
            if (wasPrevented && lastValidTransformerStateRef.current) {
              const validState = lastValidTransformerStateRef.current;
              transformer.setAttrs({
                x: validState.x,
                y: validState.y,
                width: validState.width,
                height: validState.height,
                rotation: validState.rotation,
                scaleX: validState.scaleX,
                scaleY: validState.scaleY,
              });
              transformer.forceUpdate();
              transformer.getLayer()?.batchDraw();
              
              // Also force update all proxy nodes to ensure they're in sync
              const nodes = transformer.nodes();
              nodes.forEach((node) => {
                node.getLayer()?.batchDraw();
              });

              // Still update points ref with constrained positions
              if (updateCurrentPointsRef) {
                updateCurrentPointsRef(newPoints);
              }

              return; // Early return - don't process further
            }

            // Update the ref immediately so next transformation tick uses latest points
            if (updateCurrentPointsRef) {
              updateCurrentPointsRef(newPoints);
            }

            // Update last valid state if points moved successfully
            const pointsMoved = newPoints.some((newPoint, index) => {
              const currentPoint = getCurrentPointsRef ? getCurrentPointsRef()[index] : initialPoints[index];
              if (!currentPoint) return false;
              return (
                Math.abs(newPoint.x - currentPoint.x) > 0.001 ||
                Math.abs(newPoint.y - currentPoint.y) > 0.001
              );
            });

            if (pointsMoved) {
              const allPointsInBounds = newPoints.every((point) => {
                if (!bounds) return true;
                return (
                  point.x >= 0 &&
                  point.x <= bounds.width &&
                  point.y >= 0 &&
                  point.y <= bounds.height
                );
              });

              if (allPointsInBounds) {
                lastValidTransformerStateRef.current = {
                  x: transformer.x(),
                  y: transformer.y(),
                  width: transformer.width(),
                  height: transformer.height(),
                  rotation: transformer.rotation(),
                  scaleX: transformer.scaleX(),
                  scaleY: transformer.scaleY(),
                };
              }
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
