import type { Cluster, RawGPSPoint } from "../../../tags/object/GPSMap/clusters";

export const clamp = (value: number, min: number, max: number) => {
  return Math.min(Math.max(value, min), max);
};

export const calculateDistance = (
  point1: { latitude: number; longitude: number },
  point2: { latitude: number; longitude: number },
) => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (point1.latitude * Math.PI) / 180;
  const φ2 = (point2.latitude * Math.PI) / 180;
  const Δφ = ((point2.latitude - point1.latitude) * Math.PI) / 180;
  const Δλ = ((point2.longitude - point1.longitude) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

// Added from AudioUltra/Common/Utils.ts
export enum defaults {
  timelineHeight = 32, // This might not be directly used but keeping for completeness if other parts of copied code use it
  timelinePlacement = "top",
}

export const isInRange = (value: number, min: number, max: number) => {
  return value >= min && value <= max;
};

export const findLast = <T = any>(array: T[], predicate: (item: T) => boolean): T | undefined => {
  for (let i = array.length - 1; i >= 0; i--) {
    if (predicate(array[i])) {
      return array[i];
    }
  }
  return undefined; // Explicitly return undefined if not found
};

export const getOffsetLeft = (element: HTMLElement) => {
  return element.getBoundingClientRect().left;
};

export const getOffsetTop = (element: HTMLElement) => {
  return element.getBoundingClientRect().top;
};

export const getCursorPositionX = (e: MouseEvent, offsetElement: HTMLElement) => {
  // Add checks for offsetElement and its getBoundingClientRect method
  if (!offsetElement || typeof offsetElement.getBoundingClientRect !== "function") {
    console.warn("getCursorPositionX: offsetElement is invalid");
    return e.clientX; // Fallback or throw error
  }
  return e.clientX - getOffsetLeft(offsetElement);
};

export const getCursorPositionY = (e: MouseEvent, offsetElement: HTMLElement) => {
  if (!offsetElement || typeof offsetElement.getBoundingClientRect !== "function") {
    console.warn("getCursorPositionY: offsetElement is invalid");
    return e.clientY; // Fallback or throw error
  }
  return e.clientY - getOffsetTop(offsetElement);
};

// Added from AudioUltra/Common/Utils.ts
export const toPrecision = (value: number, precision = 2) => {
  const multiplier = 10 ** precision;
  return Math.round(value * multiplier) / multiplier;
};

export const repeat = (str: string, times: number) =>
  Array.from({ length: times })
    .map(() => str)
    .join("");

export const calculateClusterStats = (points: RawGPSPoint[]): Cluster => {
  if (!points || points.length === 0) {
    return {
      longitude: 0,
      latitude: 0,
      altitude: 0,
      count: 0,
      radius: 0,
      points: [],
      timestamp: 0,
      duration: 0,
    };
  }
  const centroid = points.reduce(
    (acc, point) => ({
      longitude: acc.longitude + point.longitude / points.length,
      latitude: acc.latitude + point.latitude / points.length,
      altitude: acc.altitude + (point.altitude || 0) / points.length,
      count: acc.count + 1,
    }),
    { longitude: 0, latitude: 0, altitude: 0, count: 0 },
  );

  const radius = points.length > 0 ? Math.max(...points.map((point) => calculateDistance(centroid, point))) : 0;

  const timestamp = points[0].timestamp;
  const duration = points.length > 1 ? points[points.length - 1].timestamp - points[0].timestamp : 0;

  return { ...centroid, radius, points, timestamp, duration };
};

export const mergeClusters = (cluster1: Cluster, cluster2: Cluster): Cluster => {
  const allPoints = [...cluster1.points, ...cluster2.points];
  const mergedStats = calculateClusterStats(allPoints);
  return { ...mergedStats, distance: cluster1.distance };
};

export const detectStationaryClusters = (
  points: Array<{
    latitude: number;
    longitude: number;
    altitude?: number;
    speed: number;
    timestamp: number;
  }>,
  maxGap: number,
  mergeDistance: number,
  minPoints: number,
  speedThreshold: number,
): Cluster[] => {
  if (!points || points.length === 0) return [];

  const clusters: Cluster[] = [];
  let currentClusterPoints: typeof points = [];

  // First pass: group consecutive stationary points
  for (let i = 0; i < points.length; i++) {
    const point = points[i];

    if (point.speed < speedThreshold) {
      if (
        currentClusterPoints.length === 0 ||
        (currentClusterPoints.length > 0 &&
          calculateDistance(currentClusterPoints[currentClusterPoints.length - 1], point) < maxGap)
      ) {
        currentClusterPoints.push(point);
      } else {
        if (currentClusterPoints.length >= minPoints) {
          clusters.push(calculateClusterStats(currentClusterPoints));
        }
        currentClusterPoints = [point];
      }
    } else {
      if (currentClusterPoints.length >= minPoints) {
        clusters.push(calculateClusterStats(currentClusterPoints));
      }
      currentClusterPoints = [];
    }
  }

  if (currentClusterPoints.length >= minPoints) {
    clusters.push(calculateClusterStats(currentClusterPoints));
  }

  if (clusters.length === 0) return [];

  const mergedClusters: Cluster[] = [];
  const processedIndices = new Set();

  for (let i = 0; i < clusters.length; i++) {
    if (processedIndices.has(i)) continue;

    let currentMergedLogicalCluster = clusters[i];

    for (let j = i + 1; j < clusters.length; j++) {
      if (processedIndices.has(j)) continue;

      const distance = calculateDistance(
        {
          longitude: currentMergedLogicalCluster.longitude,
          latitude: currentMergedLogicalCluster.latitude,
        },
        { longitude: clusters[j].longitude, latitude: clusters[j].latitude },
      );

      if (distance < mergeDistance) {
        currentMergedLogicalCluster = mergeClusters(currentMergedLogicalCluster, clusters[j]);
        processedIndices.add(j);
      } else {
        break;
      }
    }
    mergedClusters.push(currentMergedLogicalCluster);
  }

  const clustersWithDistances = mergedClusters.map((cluster, index) => {
    if (index < mergedClusters.length - 1) {
      const nextCluster = mergedClusters[index + 1];
      const distance = calculateDistance(
        { latitude: cluster.latitude, longitude: cluster.longitude },
        { latitude: nextCluster.latitude, longitude: nextCluster.longitude },
      );
      return { ...cluster, distance };
    }
    return cluster;
  });

  return clustersWithDistances;
};
