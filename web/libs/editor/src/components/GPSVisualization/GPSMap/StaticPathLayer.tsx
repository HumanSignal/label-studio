import { PathLayer, ScatterplotLayer } from "@deck.gl/layers";
import type { GPSPoint } from "../types";

interface StaticPathLayerProps {
  tripsData: any;
  viewState: any;
  onSeekToTime: (time: number) => void;
  pathWidthPx: number;
  gpsData: GPSPoint[];
}

export const useStaticPathLayer = ({
  tripsData,
  viewState,
  onSeekToTime,
  pathWidthPx,
  gpsData,
}: StaticPathLayerProps) => {
  if (!tripsData || tripsData.length === 0) return [];

  const pathData = tripsData[0] as any;

  // Create individual segments for color variation
  const segments: { path: [number, number, number][]; color: number[] }[] = [];
  if (pathData && pathData.path.length > 1) {
    for (let i = 0; i < pathData.path.length - 1; i++) {
      segments.push({
        path: [pathData.path[i], pathData.path[i + 1]],
        color: pathData.segmentColors[i] || [128, 128, 128, 255],
      });
    }
  }

  // Create a single continuous path for the outline (no color variation)
  const continuousPath =
    pathData && pathData.path.length > 1 ? pathData.path.map(([x, y, z]: [number, number, number]) => [x, y, 0]) : [];

  // Only create path points at segment boundaries to minimize weld points
  const pathPoints =
    pathData && pathData.path.length > 1
      ? pathData.path
          .filter((p: any, i: number) => {
            // Only show points at segment boundaries (every few points) to reduce weld visibility
            return i % Math.max(1, Math.floor(pathData.path.length / 20)) === 0 || i === pathData.path.length - 1;
          })
          .map((p: any, i: number) => ({
            position: [p[0], p[1], 0],
            color: pathData.segmentColors[i] || pathData.segmentColors[Math.max(0, i - 1)] || [128, 128, 128, 255],
          }))
      : [];

  const pathPointsLayer = new ScatterplotLayer({
    id: "path-points",
    data: pathPoints,
    getPosition: (d: any) => d.position,
    getFillColor: (d: any) => d.color,
    getRadius: Math.max(1, pathWidthPx / 2 - 0.5), // Smaller radius to avoid visible weld points
    radiusUnits: "pixels",
    stroked: false,
    parameters: {
      depthTest: false,
      blend: true,
      blendFunc: [770, 771], // GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA
    },
  });

  const pathOutlineLayer = new PathLayer({
    id: "path-outline",
    data: continuousPath.length > 0 ? [{ path: continuousPath }] : [],
    getPath: (d: any) => d.path,
    getColor: () => [0, 0, 0, 255], // Black outline
    getWidth: pathWidthPx + 2, // Slightly wider than the main path
    widthUnits: "pixels",
    jointRounded: true,
    capRounded: true, // Add rounded caps to help with segment connections
    parameters: {
      depthTest: false,
      blend: true,
      blendFunc: [770, 771], // GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA
    },
  });

  // Create a continuous base path layer for smooth foundation
  const basePathLayer = new PathLayer({
    id: "gps-base-path",
    data: continuousPath.length > 0 ? [{ path: continuousPath }] : [],
    getPath: (d: any) => d.path,
    getColor: () => [128, 128, 128, 180], // Gray base color
    getWidth: pathWidthPx,
    widthUnits: "pixels",
    jointRounded: true,
    capRounded: true,
    parameters: {
      depthTest: false,
      blend: true,
      blendFunc: [770, 771], // GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA
    },
  });

  const staticPathLayer = new PathLayer({
    id: "gps-static-path",
    data: segments,
    getPath: (d: any) => d.path.map(([x, y, z]: [number, number, number]) => [x, y, 0]),
    getColor: (d: any) => d.color,
    getWidth: pathWidthPx, // Use the calculated width
    widthUnits: "pixels",
    pickable: true,
    jointRounded: true,
    capRounded: true, // Add rounded caps to help with segment connections
    parameters: {
      depthTest: false,
      blend: true,
      blendFunc: [770, 771], // GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA
    },
    onClick: (info: any) => {
      if (info && info.coordinate && gpsData && gpsData.length > 0) {
        let closestIdx = 0,
          minDistSq = Number.POSITIVE_INFINITY;
        const clickedLng = info.coordinate[0],
          clickedLat = info.coordinate[1];
        for (let i = 0; i < gpsData.length; i++) {
          const dx = gpsData[i].longitude - clickedLng,
            dy = gpsData[i].latitude - clickedLat;
          const distSq = dx * dx + dy * dy;
          if (distSq < minDistSq) {
            minDistSq = distSq;
            closestIdx = i;
          }
        }
        const clickedPoint = gpsData[closestIdx];
        if (clickedPoint && typeof onSeekToTime === "function") onSeekToTime(clickedPoint.timestamp);
      }
    },
  });

  return [pathOutlineLayer, basePathLayer, staticPathLayer]; // Removed pathPointsLayer to eliminate weld points
};
