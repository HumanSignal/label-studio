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
  // TEMPORARY: Force render to debug - remove all conditions
  if (!ghostPoint) {
    return null;
  }

  // TEMPORARY: Comment out all conditions to force rendering
  // if (isShiftKeyHeld !== undefined && !isShiftKeyHeld) {
  //   return null;
  // }

  // if (maxPoints !== undefined && initialPointsLength >= maxPoints) {
  //   return null;
  // }

  // if (isDragging) {
  //   return null;
  // }

  // Scale radius to compensate for Layer scaling
  const scale = transform.zoom * fitScale;
  const radius = 6 / scale;

  return (
    <Circle
      x={ghostPoint.x}
      y={ghostPoint.y}
      radius={radius}
      fill="#87CEEB"
      stroke="white"
      strokeWidth={2}
      strokeScaleEnabled={false}
      listening={false}
    />
  );
};
