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
  // Only show the visual ghost point when Shift is held, but don't clear the ghostPoint state
  if (!ghostPoint) return null;

  // Only render the visual element when Shift is held
  // If isShiftKeyHeld is not provided, assume true (since ghostPoint is only set when Shift is held)
  if (isShiftKeyHeld !== undefined && !isShiftKeyHeld) return null;

  // Hide ghost point when max points reached
  if (maxPoints !== undefined && initialPointsLength >= maxPoints) return null;

  // Hide ghost point when dragging
  if (isDragging) return null;

  // Scale up radius to compensate for Layer scaling
  const scale = transform.zoom * fitScale;
  const outerRadius = 4 / scale;
  const innerRadius = 2 / scale;

  return (
    <>
      {/* Outer ring */}
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
      {/* White center */}
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
