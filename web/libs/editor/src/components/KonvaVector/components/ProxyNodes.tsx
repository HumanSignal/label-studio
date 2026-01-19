import { Rect } from "react-konva";
import type Konva from "konva";
import type { BezierPoint } from "../types";

interface ProxyNodesProps {
  selectedPoints: Set<number>;
  initialPoints: BezierPoint[];
  proxyRefs: React.MutableRefObject<{ [key: number]: Konva.Rect | null }>;
}

export const ProxyNodes: React.FC<ProxyNodesProps> = ({ selectedPoints, initialPoints, proxyRefs }) => {
  if (selectedPoints.size <= 1) return null;

  return (
    <>
      {Array.from(selectedPoints).map((pointIndex) => {
        const point = initialPoints[pointIndex];
        if (!point) return null;

        return (
          <Rect
            key={`proxy-${pointIndex}`}
            ref={(node) => {
              proxyRefs.current[pointIndex] = node;
            }}
            x={point.x}
            y={point.y}
            width={0.001}
            height={0.001}
            fill="transparent"
            stroke="transparent"
            strokeWidth={0}
            listening={true}
            name={`proxy-${pointIndex}`}
          />
        );
      })}
    </>
  );
};
