import { IconLayer } from "@deck.gl/layers";
import { getColorFromScheme } from "../colors";
import type { GPSPoint } from "../types";

// This could be moved to a shared util if needed elsewhere
const getInterpolatedPointSimple = (sorted: GPSPoint[], targetTimestamp: number): GPSPoint | null => {
  if (!sorted || sorted.length === 0) return null;
  if (targetTimestamp <= sorted[0].timestamp) return sorted[0];
  if (targetTimestamp >= sorted[sorted.length - 1].timestamp) return sorted[sorted.length - 1];

  let p1 = sorted[0],
    p2 = sorted[sorted.length - 1];
  for (let i = 0; i < sorted.length - 1; i++) {
    if (targetTimestamp >= sorted[i].timestamp && targetTimestamp <= sorted[i + 1].timestamp) {
      p1 = sorted[i];
      p2 = sorted[i + 1];
      break;
    }
  }

  const t = p2.timestamp - p1.timestamp > 0 ? (targetTimestamp - p1.timestamp) / (p2.timestamp - p1.timestamp) : 0;
  const lerp = (a: number, b: number) => a + (b - a) * t;

  return {
    longitude: lerp(p1.longitude, p2.longitude),
    latitude: lerp(p1.latitude, p2.latitude),
    altitude: lerp(p1.altitude, p2.altitude),
    speed: lerp(p1.speed, p2.speed),
    course: p1.course, // Bearing interpolation is complex, use simpler value for display
    timestamp: targetTimestamp,
  };
};

interface CurrentPointLayerProps {
  tripsData: any;
  currentTime: number;
  settings: any;
  colorScheme: string;
  markerFillSize: number;
  markerOutlineSize: number;
  playing: boolean;
}

export const useCurrentPointLayer = ({
  tripsData,
  currentTime,
  settings,
  colorScheme,
  markerFillSize,
  markerOutlineSize,
  playing,
}: CurrentPointLayerProps) => {
  if (!tripsData || tripsData.length === 0) return [];

  const sortedData = (tripsData[0] as any)?.pointsWithCourse as GPSPoint[];
  if (!sortedData || sortedData.length === 0) return [];

  const interpolatedPointOriginal = getInterpolatedPointSimple(sortedData, currentTime);

  // Add bouncing animation to the altitude and scale only when playing
  const animationTime = Date.now() / 1000; // Convert to seconds
  const bounceOffset = playing ? Math.abs(Math.sin(animationTime * 3) * 0.3) : 0; // 3 Hz frequency, 0.3 altitude units when playing
  const scaleMultiplier = playing ? 1 + Math.abs(Math.sin(animationTime * 3)) * 0.2 : 1; // Scale from 1 to 1.2 when playing, static 1 when paused

  const currentPointWithOffset = interpolatedPointOriginal
    ? {
        ...interpolatedPointOriginal,
        altitude: bounceOffset, // Use bounce offset when playing, 0 when paused
      }
    : null;

  const { minSpeed, maxSpeed } = tripsData[0] as any;
  const effectiveColorScheme = settings.gpsColorScheme || colorScheme;

  const speed = interpolatedPointOriginal?.speed || 0;
  const t = maxSpeed > minSpeed ? (speed - minSpeed) / (maxSpeed - minSpeed) : 0;
  const baseColor = getColorFromScheme(effectiveColorScheme, t);
  const outlineColor: number[] = baseColor.length === 4 ? baseColor : [...baseColor, 255];
  const markerColor: number[] = [255, 255, 255, 255];

  const iconConfig = {
    pickable: true,
    billboard: false,
    parameters: { depthTest: false },
    iconAtlas: "https://raw.githubusercontent.com/visgl/deck.gl-data/master/website/icon-atlas.png",
    iconMapping: { "arrow-filled": { x: 128, y: 0, width: 128, height: 128, mask: true } },
    getIcon: () => "arrow-filled",
    getAngle: (d: any) => (d.course !== undefined ? -(180 + d.course) : 0),
  };

  // Add shadow layer for the current point marker
  const currentPointMarkerShadow = new IconLayer({
    ...iconConfig,
    id: "current-point-marker-shadow",
    data: currentPointWithOffset ? [currentPointWithOffset] : [],
    getPosition: (d: any) => [d.longitude, d.latitude, d.altitude - 0.01], // Slightly below
    getColor: [0, 0, 0, 180], // Black shadow with moderate opacity
    getSize: ((markerOutlineSize ?? 10) + 2) * scaleMultiplier, // Apply scale animation
    sizeScale: 1.2,
    sizeUnits: "pixels",
    pickable: false,
    autoHighlight: false,
  });

  const currentPointMarkerOutline = new IconLayer({
    ...iconConfig,
    id: "current-point-marker-outline",
    data: currentPointWithOffset ? [currentPointWithOffset] : [],
    getPosition: (d: any) => [d.longitude, d.latitude, d.altitude],
    getColor: outlineColor,
    getSize: (markerOutlineSize ?? 10) * scaleMultiplier, // Apply scale animation
    sizeScale: 1,
    sizeUnits: "pixels",
  });

  const currentPointMarker = new IconLayer({
    ...iconConfig,
    id: "current-point-marker",
    data: currentPointWithOffset ? [currentPointWithOffset] : [],
    getPosition: (d: any) => [d.longitude, d.latitude, d.altitude],
    getColor: markerColor,
    getSize: (markerFillSize ?? 9) * scaleMultiplier, // Apply scale animation
    sizeScale: 1,
    sizeUnits: "pixels",
  });

  return [currentPointMarkerShadow, currentPointMarkerOutline, currentPointMarker];
};
