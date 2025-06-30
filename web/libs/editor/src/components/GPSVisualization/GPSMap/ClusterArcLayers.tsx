import { ArcLayer } from "@deck.gl/layers";
import type { GPSPoint, StationaryCluster } from "../types";
import type { ActiveClusterSegment } from "../../../tags/object/GPSMap/clusters";
import { calculateDistance } from "../Common/Utils";
import { getColorFromScheme } from "../colors";

interface ClusterArcLayersProps {
  settings: any;
  stationaryClustersData: StationaryCluster[];
  tripsData: any;
  colorScheme: string;
  activeMapSegment: ActiveClusterSegment | null;
}

export const useClusterArcLayers = ({
  settings,
  stationaryClustersData,
  tripsData,
  colorScheme,
  activeMapSegment,
}: ClusterArcLayersProps) => {
  const layers = [];
  const effectiveColorScheme = settings.gpsColorScheme || colorScheme;
  const { pointsWithCourse, minSpeed, maxSpeed } = (tripsData?.[0] as any) ?? {};

  // Create arcs if cluster arcs are enabled and we have the necessary data
  if (
    settings.showStationaryClusters &&
    settings.showStationaryClusterArc &&
    pointsWithCourse?.length &&
    stationaryClustersData.length > 0
  ) {
    const arcs = [];

    // Helper function to create arc data
    const createArc = (fromPoint: any, toPoint: any, segmentPoints: GPSPoint[]) => {
      const distance = calculateDistance(fromPoint, toPoint);
      let avgSpeed = 0;
      if (segmentPoints.length > 0) {
        avgSpeed = segmentPoints.reduce((sum: number, p: GPSPoint) => sum + (p.speed || 0), 0) / segmentPoints.length;
      }
      const t = maxSpeed > minSpeed ? (avgSpeed - minSpeed) / (maxSpeed - minSpeed) : 0;
      const colorVal = [...getColorFromScheme(effectiveColorScheme, t), 150];

      return {
        sourcePosition: [fromPoint.longitude, fromPoint.latitude, 0],
        targetPosition: [toPoint.longitude, toPoint.latitude, 0],
        distance,
        color: colorVal,
      };
    };

    // Helper function to check if a point is within a cluster's time range
    const isPointInCluster = (point: GPSPoint, cluster: StationaryCluster) => {
      return point.timestamp >= cluster.timestamp && point.timestamp <= cluster.timestamp + cluster.duration;
    };

    const firstPoint = pointsWithCourse[0];
    const lastPoint = pointsWithCourse[pointsWithCourse.length - 1];
    const firstCluster = stationaryClustersData[0];
    const lastCluster = stationaryClustersData[stationaryClustersData.length - 1];

    // Arc from first point to first cluster (if first point is not within first cluster)
    if (firstPoint && firstCluster && !isPointInCluster(firstPoint, firstCluster)) {
      const segmentPoints = pointsWithCourse.filter(
        (p: GPSPoint) => p.timestamp >= firstPoint.timestamp && p.timestamp <= firstCluster.timestamp,
      );
      console.log("Creating START arc:", {
        firstPointTime: firstPoint.timestamp,
        firstClusterTime: firstCluster.timestamp,
        segmentPointsCount: segmentPoints.length,
        timeDiff: firstCluster.timestamp - firstPoint.timestamp,
      });
      arcs.push(createArc(firstPoint, firstCluster, segmentPoints));
    } else {
      console.log("Skipping START arc:", {
        hasFirstPoint: !!firstPoint,
        hasFirstCluster: !!firstCluster,
        firstPointInCluster: firstPoint && firstCluster ? isPointInCluster(firstPoint, firstCluster) : false,
        firstPointTime: firstPoint?.timestamp,
        firstClusterTime: firstCluster?.timestamp,
        firstClusterDuration: firstCluster?.duration,
      });
    }

    // Arcs between consecutive clusters
    for (let i = 0; i < stationaryClustersData.length - 1; i++) {
      const from = stationaryClustersData[i];
      const to = stationaryClustersData[i + 1];
      const segmentPoints = pointsWithCourse.filter(
        (p: GPSPoint) => p.timestamp >= from.timestamp && p.timestamp <= to.timestamp,
      );
      arcs.push(createArc(from, to, segmentPoints));
    }

    // Arc from last cluster to last point (if last point is not within last cluster)
    if (lastPoint && lastCluster && !isPointInCluster(lastPoint, lastCluster)) {
      const clusterEndTime = lastCluster.timestamp + lastCluster.duration;
      const segmentPoints = pointsWithCourse.filter(
        (p: GPSPoint) => p.timestamp >= clusterEndTime && p.timestamp <= lastPoint.timestamp,
      );
      console.log("Creating END arc:", {
        lastPointTime: lastPoint.timestamp,
        lastClusterTime: lastCluster.timestamp,
        lastClusterDuration: lastCluster.duration,
        clusterEndTime: clusterEndTime,
        segmentPointsCount: segmentPoints.length,
        timeDiff: lastPoint.timestamp - clusterEndTime,
      });
      arcs.push(createArc(lastCluster, lastPoint, segmentPoints));
    } else {
      console.log("Skipping END arc:", {
        hasLastPoint: !!lastPoint,
        hasLastCluster: !!lastCluster,
        lastPointInCluster: lastPoint && lastCluster ? isPointInCluster(lastPoint, lastCluster) : false,
        lastPointTime: lastPoint?.timestamp,
        lastClusterTime: lastCluster?.timestamp,
        lastClusterDuration: lastCluster?.duration,
        clusterEndTime: lastCluster ? lastCluster.timestamp + lastCluster.duration : null,
      });
    }

    console.log("Total arcs created:", arcs.length);

    // Create the arc layer if we have arcs to display
    if (arcs.length > 0) {
      const arcLayer = new ArcLayer({
        id: "stationary-centroid-arcs",
        data: arcs,
        getSourcePosition: (d: any) => d.sourcePosition,
        getTargetPosition: (d: any) => d.targetPosition,
        getSourceColor: (d: any) => d.color,
        getTargetColor: (d: any) => d.color,
        getWidth: 4,
        pickable: true,
        parameters: { depthTest: false },
        autoHighlight: true,
        highlightColor: [200, 200, 200, 255],
      });
      layers.push(arcLayer);
    }
  }

  // Highlighted arc for the active segment
  if (activeMapSegment && settings.showStationaryClusterArc) {
    const { startCluster, endCluster } = activeMapSegment;
    const segmentPoints = pointsWithCourse.filter(
      (p: GPSPoint) => p.timestamp >= startCluster.timestamp && p.timestamp <= endCluster.timestamp,
    );
    let avgSpeed = 0;
    if (segmentPoints.length > 0) {
      avgSpeed = segmentPoints.reduce((sum: number, p: GPSPoint) => sum + (p.speed || 0), 0) / segmentPoints.length;
    }
    const t = maxSpeed > minSpeed ? (avgSpeed - minSpeed) / (maxSpeed - minSpeed) : 0;
    const normalizedT = Math.max(0, Math.min(1, t));
    const baseColor = getColorFromScheme(effectiveColorScheme, normalizedT);
    const highlightColor = [
      Math.round(baseColor[0] * 0.7 + 255 * 0.3),
      Math.round(baseColor[1] * 0.7 + 255 * 0.3),
      Math.round(baseColor[2] * 0.7 + 255 * 0.3),
      220,
    ];
    const arcData = [
      {
        sourcePosition: [startCluster.longitude, startCluster.latitude, 0],
        targetPosition: [endCluster.longitude, endCluster.latitude, 0],
      },
    ];

    const highlightedClusterArcLayer = new ArcLayer({
      id: "highlighted-cluster-arc",
      data: arcData,
      getSourcePosition: (d: any) => d.sourcePosition,
      getTargetPosition: (d: any) => d.targetPosition,
      getSourceColor: highlightColor,
      getTargetColor: highlightColor,
      getWidth: 6,
      pickable: false,
      parameters: { depthTest: false },
    });
    layers.push(highlightedClusterArcLayer);
  }

  return layers;
};
