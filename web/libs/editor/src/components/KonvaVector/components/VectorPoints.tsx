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
  activePointId?: string | null;
  maxPoints?: number;
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
  activePointId = null,
  maxPoints,
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
        // Check if maxPoints is reached
        const isMaxPointsReached = maxPoints !== undefined && initialPoints.length >= maxPoints;
        // Check if multiple points are selected
        const isMultiSelection = selectedPoints.size > 1;
        // Point is explicitly selected if it's in selectedPoints or is the selectedPointIndex
        const isExplicitlySelected = selectedPointIndex === index || selectedPoints.has(index);
        // Active point should only be rendered as selected if:
        // - It's explicitly selected, OR
        // - (Not disabled AND maxPoints not reached AND not in multi-selection AND it's the active point)
        const isSelected =
          isExplicitlySelected ||
          (!disabled &&
            !isMaxPointsReached &&
            !isMultiSelection &&
            activePointId !== null &&
            point.id === activePointId);
        // Make selected points larger
        const radiusMultiplier = isSelected ? 1.3 : 1;
        const scaledRadius = (baseRadius * radiusMultiplier) / scale;

        return (
          <>
            {/* White outline ring for selected points - rendered outside the colored stroke */}
            {!disabled && isSelected && (
              <Circle
                key={`point-outline-${index}-${point.x}-${point.y}`}
                x={point.x}
                y={point.y}
                radius={scaledRadius}
                fill="transparent"
                stroke={pointStrokeSelected}
                strokeScaleEnabled={false}
                strokeWidth={pointStrokeWidth + 5}
                listening={false}
                name={`point-outline-${index}`}
              />
            )}
            {/* Main point circle with colored stroke */}
            <Circle
              key={`point-${index}-${point.x}-${point.y}`}
              ref={(node) => {
                pointRefs.current[index] = node;
              }}
              x={point.x}
              y={point.y}
              radius={scaledRadius}
              fill={pointFill}
              stroke={pointStroke}
              strokeScaleEnabled={false}
              strokeWidth={pointStrokeWidth}
              listening={!disabled}
              name={`point-${index}`}
              onClick={
                onPointClick
                  ? (e) => {
                      // Stop propagation immediately to prevent the event from bubbling to VectorShape onClick
                      // This prevents the shape from being selected/unselected when clicking on points
                      e.evt.stopImmediatePropagation();
                      e.evt.stopPropagation();
                      e.evt.preventDefault();
                      e.cancelBubble = true;
                      onPointClick(e, index);
                    }
                  : undefined
              }
            />
          </>
        );
      })}
    </>
  );
};
