import { IconLayer } from "@deck.gl/layers";
import { getColorFromScheme, getContrastColor } from "../colors";
import type { GPSPoint } from "../types";

interface StartFinishFlagsProps {
  gpsData: GPSPoint[];
  tripsData: any;
  colorScheme: string;
  startEndFillSize: number;
  startEndOutlineSize: number;
}

export const useStartFinishFlags = ({
  gpsData,
  tripsData,
  colorScheme,
  startEndFillSize,
  startEndOutlineSize,
}: StartFinishFlagsProps) => {
  if (!gpsData || gpsData.length === 0) return [];

  const { minSpeed, maxSpeed } = tripsData[0] as any;
  const effectiveColorScheme = colorScheme;

  const iconConfig = {
    billboard: false,
    pickable: true,
    parameters: { depthTest: false },
    getAngle: 0,
    iconAtlas: "https://raw.githubusercontent.com/visgl/deck.gl-data/master/website/icon-atlas.png",
    iconMapping: { "arrow-filled": { x: 128, y: 0, width: 128, height: 128, mask: true } },
  };
  const startData = gpsData.length > 0 ? [gpsData[0]] : [];
  const endData = gpsData.length > 0 ? [gpsData[gpsData.length - 1]] : [];
  const startSpeed = startData.length > 0 && startData[0].speed !== undefined ? startData[0].speed : 0;
  const startT = maxSpeed > minSpeed ? (startSpeed - minSpeed) / (maxSpeed - minSpeed) : 0;
  const startPathColor = getColorFromScheme(effectiveColorScheme, startT);
  const startMarkerColor = getContrastColor(startPathColor);
  const startOutlineColor = startMarkerColor[0] === 0 ? [255, 255, 255, 255] : [0, 0, 0, 255];
  const endSpeed = endData.length > 0 && endData[0].speed !== undefined ? endData[0].speed : 0;
  const endT = maxSpeed > minSpeed ? (endSpeed - minSpeed) / (maxSpeed - minSpeed) : 0;
  const endPathColor = getColorFromScheme(effectiveColorScheme, endT);
  const endMarkerColor = getContrastColor(endPathColor);
  const endOutlineColor = endMarkerColor[0] === 0 ? [255, 255, 255, 255] : [0, 0, 0, 255];

  const startFlagOutline = new IconLayer({
    ...iconConfig,
    id: "start-flag-outline",
    data: startData,
    getPosition: (d: any) => [d.longitude, d.latitude, 0],
    getColor: startOutlineColor,
    getSize: startEndOutlineSize,
    sizeUnits: "pixels",
    sizeScale: 1,
    billboard: false,
    getIcon: () => "arrow-filled",
  });

  const startFlag = new IconLayer({
    ...iconConfig,
    id: "start-flag",
    data: startData,
    getPosition: (d: any) => [d.longitude, d.latitude, 0],
    getColor: startMarkerColor,
    getSize: startEndFillSize,
    sizeUnits: "pixels",
    sizeScale: 1,
    billboard: false,
    getIcon: () => "arrow-filled",
  });

  const finishFlagOutline = new IconLayer({
    ...iconConfig,
    id: "finish-flag-outline",
    data: endData,
    getPosition: (d: any) => [d.longitude, d.latitude, 0],
    getColor: endOutlineColor,
    getSize: startEndOutlineSize,
    sizeUnits: "pixels",
    sizeScale: 1,
    billboard: false,
    getIcon: () => "arrow-filled",
  });

  const finishFlag = new IconLayer({
    ...iconConfig,
    id: "finish-flag",
    data: endData,
    getPosition: (d: any) => [d.longitude, d.latitude, 0],
    getColor: endMarkerColor,
    getSize: startEndFillSize,
    sizeUnits: "pixels",
    sizeScale: 1,
    billboard: false,
    getIcon: () => "arrow-filled",
  });

  return [startFlagOutline, startFlag, finishFlagOutline, finishFlag];
};
