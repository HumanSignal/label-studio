import { ScatterplotLayer } from "@deck.gl/layers";
import { getColorFromScheme } from "../colors";
import type { StationaryCluster } from "../types";

interface ClusterLayerProps {
  stationaryClustersData: StationaryCluster[];
  settings: any;
  tripsData: any;
  colorScheme: string;
}

export const useClusterLayer = ({ stationaryClustersData, settings, tripsData, colorScheme }: ClusterLayerProps) => {
  if (!settings.showStationaryClusters || !stationaryClustersData || stationaryClustersData.length === 0) return null;

  const { minSpeed, maxSpeed } = tripsData[0] as any;
  const effectiveColorScheme = settings.gpsColorScheme || colorScheme;

  const getClusterColor = () => {
    const speed = 0;
    const t = maxSpeed > minSpeed ? (speed - minSpeed) / (maxSpeed - minSpeed) : 0;
    const normalizedT = Math.max(0, Math.min(1, t));
    return getColorFromScheme(effectiveColorScheme, normalizedT);
  };

  const clusterBaseColor = getClusterColor();
  const clusterFillColor = [...clusterBaseColor, 50];
  const clusterLineColor = [...clusterBaseColor, 200];

  const clusterLayer = new ScatterplotLayer({
    id: "stationary-clusters",
    data: stationaryClustersData,
    getPosition: (d: any) => [d.longitude, d.latitude, 0],
    getFillColor: clusterFillColor,
    getRadius: (d: any) => d.radius,
    radiusUnits: "meters",
    pickable: true,
    stroked: true,
    getLineColor: clusterLineColor,
    lineWidthMinPixels: 2,
    parameters: { depthTest: false },
  });

  return clusterLayer;
};
