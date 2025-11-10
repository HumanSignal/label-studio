import type React from "react";
import { Circle } from "react-konva";
import type Konva from "konva";
import type { BezierPoint } from "../types";

interface VectorPointsProps {
  initialPoints: BezierPoint[];
  selectedPointIndex: number | null;
  selectedPoints: Set<number>;
  transform: { zoom: number; offsetX: number; offsetY: number };
  fitScale: number;
  pointRefs: React.MutableRefObject<{ [key: number]: Konva.Circle | null }>;
  disabled?: boolean;
  pointRadius?: {
    enabled?: number;
    disabled?: number;
  };
  pointFill?: string;
  pointStroke?: string;
  pointStrokeSelected?: string;
  pointStrokeWidth?: number;
  onPointClick?: (e: Konva.KonvaEventObject<MouseEvent>, pointIndex: number) => void;
}

export const VectorPoints: React.FC<VectorPointsProps> = ({
  initialPoints,
  selectedPointIndex,
  selectedPoints,
  transform,
  fitScale,
  pointRefs,
  disabled = false,
  pointRadius,
  pointFill = "#ffffff",
  pointStroke = "#3b82f6",
  pointStrokeSelected = "#ffffff",
  pointStrokeWidth = 2,
  onPointClick,
}) => {
  return (
    <>
      {initialPoints.map((point, index) => {
        // Scale up radius to compensate for Layer scaling
        const scale = transform.zoom * fitScale;
        // Use configurable radius with fallbacks to defaults
        const enabledRadius = pointRadius?.enabled ?? 6;
        const disabledRadius = pointRadius?.disabled ?? 4;
        const baseRadius = disabled ? disabledRadius : enabledRadius;
        const scaledRadius = baseRadius / scale;
        const isSelected = selectedPointIndex === index || selectedPoints.has(index);

        return (
          <Circle
            key={`point-${index}-${point.x}-${point.y}`}
            ref={(node) => {
              pointRefs.current[index] = node;
            }}
            x={point.x}
            y={point.y}
            radius={scaledRadius}
            fill={pointFill}
            stroke={isSelected ? pointStrokeSelected : pointStroke}
            strokeScaleEnabled={false}
            strokeWidth={pointStrokeWidth}
            listening={true}
            name={`point-${index}`}
            onClick={onPointClick ? (e) => onPointClick(e, index) : undefined}
          />
        );
      })}
    </>
  );
};
