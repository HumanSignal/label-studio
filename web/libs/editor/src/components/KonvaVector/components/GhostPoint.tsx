import type React from "react";
import { Circle } from "react-konva";
import type { GhostPoint as GhostPointType } from "../types";

interface GhostPointProps {
  ghostPoint: GhostPointType | null;
  transform: { zoom: number; offsetX: number; offsetY: number };
  fitScale: number;
  isShiftKeyHeld?: boolean; // Made optional - if ghostPoint is set, Shift was held
  maxPoints?: number;
  initialPointsLength: number;
  isDragging?: boolean;
}

export const GhostPoint: React.FC<GhostPointProps> = ({
  ghostPoint,
  transform,
  fitScale,
  isShiftKeyHeld,
  maxPoints,
  initialPointsLength,
  isDragging = false,
}) => {
  // Debug logging
  console.log("🔵 GhostPoint render:", {
    hasGhostPoint: !!ghostPoint,
    ghostPoint: ghostPoint ? { x: ghostPoint.x, y: ghostPoint.y } : null,
    isShiftKeyHeld,
    maxPoints,
    initialPointsLength,
    isDragging,
    transform,
    fitScale,
  });

  // TEMPORARY: Force render to debug - remove all conditions
  if (!ghostPoint) {
    console.log("🔴 GhostPoint: No ghostPoint, returning null");
    return null;
  }

  // TEMPORARY: Comment out all conditions to force rendering
  // if (isShiftKeyHeld !== undefined && !isShiftKeyHeld) {
  //   console.log("🔴 GhostPoint: Shift not held, returning null");
  //   return null;
  // }

  // if (maxPoints !== undefined && initialPointsLength >= maxPoints) {
  //   console.log("🔴 GhostPoint: Max points reached, returning null");
  //   return null;
  // }

  // if (isDragging) {
  //   console.log("🔴 GhostPoint: Dragging, returning null");
  //   return null;
  // }

  // Scale up radius to compensate for Layer scaling
  const scale = transform.zoom * fitScale;
  const outerRadius = 4 / scale;
  const innerRadius = 2 / scale;

  // Debug: Check if coordinates are reasonable
  const isCoordinateReasonable = (coord: number) => coord >= -10000 && coord <= 100000;
  const coordsReasonable = isCoordinateReasonable(ghostPoint.x) && isCoordinateReasonable(ghostPoint.y);
  
  console.log("🟢 GhostPoint: Rendering at", { 
    x: ghostPoint.x, 
    y: ghostPoint.y, 
    outerRadius, 
    innerRadius, 
    scale,
    coordsReasonable,
    transform,
    fitScale,
  });
  
  if (!coordsReasonable) {
    console.warn("⚠️ GhostPoint: Coordinates seem unreasonable!", { x: ghostPoint.x, y: ghostPoint.y });
  }

  // TEMPORARY: Use fixed large radius to make it super visible
  const debugRadius = 50; // Fixed large radius for debugging
  
  console.log("🟢🟢🟢 FORCING GHOST POINT RENDER 🟢🟢🟢", {
    x: ghostPoint.x,
    y: ghostPoint.y,
    outerRadius,
    innerRadius,
    scale,
    debugRadius,
  });
  
  return (
    <>
      {/* TEMPORARY: Huge red circle to verify it's rendering */}
      <Circle
        x={ghostPoint.x}
        y={ghostPoint.y}
        radius={debugRadius}
        fill="rgba(255, 0, 0, 0.5)" // Bright red, 50% opacity
        stroke="#ff0000"
        strokeWidth={5}
        strokeScaleEnabled={false}
        listening={false}
      />
      {/* TEMPORARY: Even larger circle */}
      <Circle
        x={ghostPoint.x}
        y={ghostPoint.y}
        radius={debugRadius * 2}
        fill="rgba(0, 0, 255, 0.3)" // Blue circle
        stroke="#0000ff"
        strokeWidth={3}
        strokeScaleEnabled={false}
        listening={false}
      />
      {/* Original outer ring */}
      <Circle
        x={ghostPoint.x}
        y={ghostPoint.y}
        radius={outerRadius}
        fill="rgba(34, 197, 94, 0.2)"
        stroke="#22c55e"
        strokeWidth={1.5}
        strokeScaleEnabled={false}
        listening={false}
      />
      {/* Original white center */}
      <Circle
        x={ghostPoint.x}
        y={ghostPoint.y}
        radius={innerRadius}
        fill="#ffffff"
        stroke="#22c55e"
        strokeWidth={0.5}
        strokeScaleEnabled={false}
        listening={false}
      />
    </>
  );
};
