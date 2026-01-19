import { Circle } from "react-konva";
import type Konva from "konva";
import type { BezierPoint } from "../types";

interface ProxyNodesProps {
  selectedPoints: Set<number>;
  initialPoints: BezierPoint[];
  proxyRefs: React.MutableRefObject<{ [key: number]: Konva.Circle | null }>;
}

export const ProxyNodes: React.FC<ProxyNodesProps> = ({ selectedPoints, initialPoints, proxyRefs }) => {
  if (selectedPoints.size <= 1) return null;

  return (
    <>
      {Array.from(selectedPoints).map((pointIndex) => {
        const point = initialPoints[pointIndex];
        if (!point) return null;

        return (
          <Circle
            key={`proxy-${pointIndex}`}
            ref={(node) => {
              proxyRefs.current[pointIndex] = node;
            }}
            x={point.x}
            y={point.y}
            radius={10}
            fill="transparent"
            stroke="transparent"
            strokeWidth={1}
            listening={true}
            name={`proxy-${pointIndex}`}
          />
        );
      })}
    </>
  );
};
