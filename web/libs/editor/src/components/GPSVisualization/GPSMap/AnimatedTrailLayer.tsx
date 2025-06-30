import { TripsLayer } from "@deck.gl/geo-layers";

interface AnimatedTrailLayerProps {
  tripsData: any;
  currentTime: number;
  viewState: any;
  pathWidthPx: number;
}

export const useAnimatedTrailLayer = ({ tripsData, currentTime, viewState, pathWidthPx }: AnimatedTrailLayerProps) => {
  if (!tripsData || tripsData.length === 0) return null;

  const tripsLayer = new TripsLayer({
    id: "gps-animated-trail",
    data: tripsData,
    getPath: (d: any) => d.path.map(([x, y, z]: [number, number, number]) => [x, y, 0]),
    getTimestamps: (d: any) => d.timestamps,
    getColor: () => [0, 0, 0, 255], // Black trail
    opacity: 0.5,
    trailLength: 4000,
    currentTime: currentTime * 1000,
    fadeTrail: true,
    billboard: false,
    getWidth: pathWidthPx,
    widthUnits: "pixels",
    pickable: true,
    autoHighlight: false,
    parameters: { depthTest: false },
  });

  return tripsLayer;
};
