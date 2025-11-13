import { Circle } from "react-konva";
import { useRef, useEffect, useImperativeHandle, forwardRef } from "react";
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

export interface GhostPointRef {
  updatePosition: (x: number, y: number) => void;
}

export const GhostPoint = forwardRef<GhostPointRef, GhostPointProps>(
  ({ ghostPoint, transform, fitScale, isShiftKeyHeld, maxPoints, initialPointsLength, isDragging = false }, ref) => {
    if (!ghostPoint) {
      return null;
    }

    // Hide ghost point when maxPoints is reached
    if (maxPoints !== undefined && initialPointsLength >= maxPoints) {
      return null;
    }

    // Scale radius to compensate for Layer scaling
    const scale = transform.zoom * fitScale;
    const radius = 6 / scale;

    // Use a ref to force Konva to update position
    const circleRef = useRef<Konva.Circle>(null);

    // Expose updatePosition method via ref
    useImperativeHandle(ref, () => ({
      updatePosition: (x: number, y: number) => {
        if (circleRef.current) {
          circleRef.current.setPosition({ x, y });
          // Force Konva to redraw
          const stage = circleRef.current.getStage();
          if (stage) {
            stage.batchDraw();
          }
        }
      },
    }));

    // Update position whenever ghostPoint changes
    useEffect(() => {
      if (circleRef.current && ghostPoint) {
        circleRef.current.setPosition({ x: ghostPoint.x, y: ghostPoint.y });
        // Force Konva to redraw
        const stage = circleRef.current.getStage();
        if (stage) {
          stage.batchDraw();
        }
      }
    }, [ghostPoint?.x, ghostPoint?.y]);

    // Use a key that includes position to force re-render when position changes
    // Round position to avoid key changes from floating point precision
    const keyX = Math.round(ghostPoint.x * 100) / 100;
    const keyY = Math.round(ghostPoint.y * 100) / 100;

    return (
      <Circle
        ref={circleRef}
        key={`ghost-point-${keyX}-${keyY}-${ghostPoint.prevPointId}-${ghostPoint.nextPointId}`}
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
  },
);
