// Cluster utility functions for GPS and related features

import { calculateDistance } from "../../../components/GPSVisualization/Common/Utils";

export interface RawGPSPoint {
  latitude: number;
  longitude: number;
  altitude?: number;
  speed: number;
  timestamp: number;
}

export interface Cluster {
  longitude: number;
  latitude: number;
  altitude: number;
  count: number;
  radius: number;
  points: RawGPSPoint[];
  timestamp: number;
  duration: number;
  distance?: number;
}

export interface ActiveClusterSegment {
  startCluster: Cluster;
  endCluster: Cluster;
}

export function calculateAveragePosition(points: RawGPSPoint[]): Cluster {
  if (!points || points.length === 0) {
    return {
      latitude: 0,
      longitude: 0,
      altitude: 0,
      count: 0,
      radius: 0,
      points: [],
      timestamp: 0,
      duration: 0,
    };
  }

  const sum = points.reduce(
    (acc, point) => ({
      latitude: acc.latitude + point.latitude,
      longitude: acc.longitude + point.longitude,
      altitude: acc.altitude + (point.altitude || 0),
    }),
    { latitude: 0, longitude: 0, altitude: 0 },
  );

  const count = points.length;
  const timestamp = points[0].timestamp;
  const duration = points.length > 1 ? points[points.length - 1].timestamp - points[0].timestamp : 0;

  return {
    latitude: sum.latitude / count,
    longitude: sum.longitude / count,
    altitude: sum.altitude / count,
    count,
    radius: 0,
    points,
    timestamp,
    duration,
  };
}

export function calculateRadius(
  points: RawGPSPoint[],
  center: { latitude: number; longitude: number; altitude?: number },
): number {
  return Math.max(...points.map((point) => calculateDistance(center, point)));
}

function createCluster(points: RawGPSPoint[]): Cluster {
  const center = calculateAveragePosition(points);
  return {
    ...center,
    count: points.length,
    radius: calculateRadius(points, center),
    points: [...points],
    timestamp: points[0].timestamp,
  };
}

export function detectStationaryClustersInternal(
  points: RawGPSPoint[],
  maxGap = 5,
  mergeDistance = 50,
  minPoints = 3,
  speedRange = [0, 1.0], // [minSpeed, maxSpeed] range in m/s for stationary points
): Cluster[] {
  if (!points || points.length < minPoints) return [];

  const [minSpeed, maxSpeed] = speedRange;
  const clusters: Cluster[] = [];
  let currentCluster: RawGPSPoint[] = [];
  let lastPoint: RawGPSPoint | null = null;

  // First pass: group points into potential clusters based on speed and time gaps
  for (let i = 0; i < points.length; i++) {
    const point = points[i];

    if (!lastPoint) {
      currentCluster.push(point);
      lastPoint = point;
      continue;
    }

    const timeGap = point.timestamp - lastPoint.timestamp;
    const distance = calculateDistance(lastPoint, point);

    // Use stored speed from GPS data if available, otherwise calculate from distance/time
    let speed: number;
    if (typeof point.speed === "number" && !isNaN(point.speed)) {
      speed = point.speed; // Use stored speed (already corrected during data loading)
    } else {
      speed = timeGap > 0 ? distance / timeGap : 0; // Calculate speed from distance and time
    }

    if (speed >= minSpeed && speed <= maxSpeed && timeGap <= maxGap) {
      currentCluster.push(point);
    } else {
      if (currentCluster.length >= minPoints) {
        clusters.push(createCluster(currentCluster));
      }
      currentCluster = [point];
    }
    lastPoint = point;
  }

  if (currentCluster.length >= minPoints) {
    clusters.push(createCluster(currentCluster));
  }

  // Second pass: merge nearby clusters
  const mergedClusters: Cluster[] = [];
  let i = 0;

  while (i < clusters.length) {
    let current = clusters[i];
    let j = i + 1;

    while (j < clusters.length) {
      const next = clusters[j];
      const distance = calculateDistance(current, next);

      if (distance <= mergeDistance) {
        const allPoints = [...current.points, ...next.points];
        current = createCluster(allPoints);
        j++;
      } else {
        break;
      }
    }

    mergedClusters.push(current);
    i = j;
  }

  // Calculate distances between adjacent clusters
  return mergedClusters.map((cluster, index) => {
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
}
