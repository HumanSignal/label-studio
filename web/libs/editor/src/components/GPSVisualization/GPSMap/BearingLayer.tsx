import { IconLayer } from "@deck.gl/layers";
import type { GPSPoint } from "../types";

const filterBearingPoints = (points: GPSPoint[], zoom: number, pixelSpacing: number) => {
  if (!points || points.length === 0) return [] as any[];

  const EARTH_RADIUS = 6378137; // meters

  // Calculate meters-per-pixel at the given latitude & zoom
  const metersPerPixel = (lat: number) =>
    (Math.cos((lat * Math.PI) / 180) * 2 * Math.PI * EARTH_RADIUS) / (256 * Math.pow(2, zoom));

  const filtered: any[] = [];
  let lastShown: GPSPoint | null = null;

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (!lastShown) {
      filtered.push({ ...p, __segIdx: i });
      lastShown = p;
      continue;
    }

    // Haversine distance in meters
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(p.latitude - lastShown.latitude);
    const dLon = toRad(p.longitude - lastShown.longitude);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lastShown.latitude)) * Math.cos(toRad(p.latitude)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceMeters = EARTH_RADIUS * c;

    // Use latitude of current point for metersPerPixel computation
    const mPerPx = metersPerPixel(p.latitude);
    const requiredMeters = pixelSpacing * mPerPx;

    if (distanceMeters >= requiredMeters) {
      filtered.push({ ...p, __segIdx: i });
      lastShown = p;
    }
  }

  return filtered;
};

interface BearingLayerProps {
  tripsData: any;
  viewState: any;
  onSeekToTime: (time: number) => void;
  bearingFillSize: number;
  bearingOutlineSize: number;
}

export const useBearingLayer = ({
  tripsData,
  viewState,
  onSeekToTime,
  bearingFillSize,
  bearingOutlineSize,
}: BearingLayerProps) => {
  const bearingPointsFiltered = filterBearingPoints(
    (tripsData[0] as any)?.pointsWithCourse ?? [],
    viewState?.zoom ?? 0,
    15, // slightly increased pixel spacing for cleaner look
  );

  const segmentColorsAll = (tripsData[0] as any)?.segmentColors ?? [];
  const iconConfig = {
    billboard: false,
    pickable: true,
    parameters: { depthTest: false },
    getAngle: 0,
    iconAtlas: "https://raw.githubusercontent.com/visgl/deck.gl-data/master/website/icon-atlas.png",
    iconMapping: { "arrow-filled": { x: 128, y: 0, width: 128, height: 128, mask: true } },
  };

  // Add a subtle black background layer for contrast with light colors
  const bearingBackgroundLayer = new IconLayer({
    ...iconConfig,
    id: "gps-points-bearing-background",
    data: bearingPointsFiltered,
    getIcon: () => "arrow-filled",
    getPosition: (d: any) => [d.longitude, d.latitude, -0.01], // Slightly below the main layer
    getSize: bearingFillSize + 1, // Slightly larger to create a subtle border effect
    sizeUnits: "pixels",
    sizeScale: 1.2,
    getColor: [0, 0, 0, 200], // Very subtle black background (10% opacity)
    getAngle: (d: any) => (d.course !== undefined ? -(180 + d.course) : 0),
    pickable: false,
    autoHighlight: false,
  });

  const bearingLayer = new IconLayer({
    ...iconConfig,
    id: "gps-points-bearing",
    data: bearingPointsFiltered,
    getIcon: () => "arrow-filled",
    getPosition: (d: any) => [d.longitude, d.latitude, 0],
    getSize: bearingFillSize, // Use original fill size
    sizeUnits: "pixels",
    sizeScale: 1,
    getColor: (d: any) => {
      const segmentColor = segmentColorsAll[d.__segIdx] ?? [128, 128, 128, 255];
      // Use the actual segment color with higher opacity for better visibility
      return [segmentColor[0], segmentColor[1], segmentColor[2], 180]; // More opaque for better visibility
    },
    getAngle: (d: any) => (d.course !== undefined ? -(180 + d.course) : 0),
    // Make this layer clickable
    pickable: true,
    autoHighlight: true,
    onClick: (info: any) => {
      console.log("Main bearing layer clicked:", info); // Debug log
      if (info && info.object && typeof onSeekToTime === "function") {
        console.log("Seeking to time:", info.object.timestamp); // Debug log
        onSeekToTime(info.object.timestamp);
      }
    },
  });

  return [bearingBackgroundLayer, bearingLayer]; // Shadow, background, hover outline, outline, then fill
};
