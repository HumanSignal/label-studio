import React from "react";
import { Transformer as KonvaTransformer } from "react-konva";
import type Konva from "konva";
import type { BezierPoint } from "../types";
import { applyTransformationToPoints, resetTransformState } from "../utils/transformUtils";

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
  constrainToBounds?: boolean;
  bounds?: { x: number; y: number; width: number; height: number };
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
  constrainToBounds,
  bounds,
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
  }>({});

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
      // boundBoxFunc={(_oldBox: any, newBox: any) => {
      //   // Temporarily disable bounds checking for rotation/resize
      //   // Only apply bounds checking to drag operations
      //   return newBox;
      // }}
      dragBoundFunc={(pos: any) => {
        // Reject drag if it would go outside image bounds
        if (constrainToBounds && bounds) {
          const transformer = transformerRef.current;
          if (transformer) {
            const width = transformer.width();
            const height = transformer.height();

            // Check if the new position would extend beyond image bounds
            if (
              pos.x < bounds.x ||
              pos.y < bounds.y ||
              pos.x + width > bounds.x + bounds.width ||
              pos.y + height > bounds.y + bounds.height
            ) {
              // Return the current position to prevent the drag
              return { x: transformer.x(), y: transformer.y() };
            }
          }
        }

        return pos;
      }}
      resizeBoundFunc={(oldBox: any, newBox: any) => {
        // Reject resize if it would go outside image bounds
        if (constrainToBounds && bounds) {
          // Check if the new bounding box would extend beyond image bounds
          if (
            newBox.x < bounds.x ||
            newBox.y < bounds.y ||
            newBox.x + newBox.width > bounds.x + bounds.width ||
            newBox.y + newBox.height > bounds.y + bounds.height
          ) {
            // Return the old box to prevent the resize
            return oldBox;
          }
        }

        return newBox;
      }}
      onTransform={(_e: any) => {
        // Apply proxy coordinates to real points in real-time
        const transformer = transformerRef.current;
        if (transformer) {
          try {
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
              constrainToBounds,
              bounds,
            );
            onPointsChange?.(newPoints);
          } catch (error) {
            console.warn("Transform error:", error);
          }
        }
      }}
      onTransformStart={(_e: any) => {
        // Notify that transformation has started
        onTransformationStart?.();

        // Store the initial state when transformation starts
        const transformer = transformerRef.current;
        if (transformer) {
          const initialState = {
            rotation: transformer.rotation(),
            scaleX: transformer.scaleX(),
            scaleY: transformer.scaleY(),
            centerX: transformer.x() + transformer.width() / 2,
            centerY: transformer.y() + transformer.height() / 2,
          };
          transformerStateRef.current = initialState;
        }

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

        // Reset the first transform flag to ensure proper rotation tracking
        resetTransformState();
      }}
      onDragStart={(_e: any) => {
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
      }}
      onDragMove={(_e: any) => {
        // Apply drag movement to real points in real-time
        const transformer = transformerRef.current;
        if (transformer) {
          try {
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
              constrainToBounds,
              bounds,
            );
            onPointsChange?.(newPoints);
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
            constrainToBounds,
            bounds,
          );
          onPointsChange?.(newPoints);

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
            constrainToBounds,
            bounds,
          );
          onPointsChange?.(newPoints);

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
