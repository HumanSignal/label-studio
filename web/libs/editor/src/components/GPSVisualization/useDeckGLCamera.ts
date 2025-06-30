import { useState, useEffect, useRef, useCallback } from "react";
import type { MapViewState } from "@deck.gl/core/typed";
import type { GPSPoint } from "./GPSVisualization";

interface InteractionState {
  inTransition?: boolean;
  isDragging?: boolean;
  isPanning?: boolean;
  isRotating?: boolean;
  isZooming?: boolean;
}

// Constants for camera behavior
const REENGAGE_DELAY_MS = 3000;
const OFFSET_DECAY_FACTOR = 0.9;
const SMOOTH_FACTOR = 0.4;
const INTERACTION_RESET_DEBOUNCE_MS = 150;
const DEFAULT_ZOOM = 18;
const DEFAULT_PITCH = 45;
const BEARING_SNAP_THRESHOLD = 0.1; // degrees for snapping remainder
const ZOOM_DECAY_THRESHOLD = 0.01; // zoom units threshold for user zoom detection

// Speed-based zoom constants
const MAX_SPEED_ZOOM_OFFSET = 0.3; // Maximum zoom offset from speed (applied as negative for zoom out when fast)
const SPEED_SMOOTHING_FACTOR = 0.8; // How quickly speed-based zoom changes (0.1 = slow, 1.0 = immediate)

// Linear interpolation helper
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// Interpolate bearing along shortest path
function interpolateBearing(a: number, b: number, t: number): number {
  const normA = ((a % 360) + 360) % 360;
  const normB = ((b % 360) + 360) % 360;
  let diff = normB - normA;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return (normA + diff * t + 360) % 360;
}

// Get interpolated GPS point at given timestamp
function getInterpolatedPoint(data: GPSPoint[], timestamp: number): GPSPoint | null {
  if (data.length === 0) return null;
  if (timestamp <= data[0].timestamp) return data[0];
  if (timestamp >= data[data.length - 1].timestamp) return data[data.length - 1];

  let i = 0;
  while (i < data.length - 1 && data[i + 1].timestamp < timestamp) i++;
  const p0 = data[i];
  const p1 = data[i + 1];
  const dt = p1.timestamp - p0.timestamp;
  const t = dt > 0 ? (timestamp - p0.timestamp) / dt : 0;

  return {
    longitude: lerp(p0.longitude, p1.longitude, t),
    latitude: lerp(p0.latitude, p1.latitude, t),
    altitude: lerp(p0.altitude || 0, p1.altitude || 0, t),
    speed: lerp(p0.speed || 0, p1.speed || 0, t),
    course:
      p0.course !== undefined && p1.course !== undefined
        ? interpolateBearing(p0.course, p1.course, t)
        : (p0.course ?? p1.course),
    timestamp,
  };
}

// Main hook
export function useDeckGLCamera({
  gpsData,
  currentTime,
  settings,
  tripsData,
}: {
  gpsData: GPSPoint[];
  currentTime: number;
  settings: {
    followPosition: boolean;
    followBearing: boolean;
    speedBasedZoom?: boolean;
    speedZoomIntensity?: number;
    speedZoomMaxSpeed?: number;
    speedZoomSmoothness?: number;
  };
  tripsData: { pointsWithCourse: GPSPoint[] }[];
}): {
  viewState: MapViewState;
  onViewStateChange: (args: { viewState: MapViewState }) => void;
  onInteractionStateChange: (interactionState: InteractionState) => void;
} {
  const [viewState, setViewState] = useState<MapViewState>({
    longitude: 0,
    latitude: 0,
    zoom: DEFAULT_ZOOM,
    bearing: 0,
    pitch: DEFAULT_PITCH,
    transitionDuration: 0,
  });

  // Offsets for pan, bearing, zoom
  const posOffset = useRef<[number, number]>([0, 0]);
  const bearOffset = useRef(0);
  const zoomOffset = useRef(0);
  const speedZoomOffset = useRef(0); // Speed-based zoom offset

  // One-time init flag
  const hasInitial = useRef(false);

  // Interaction tracking
  const isInteracting = useRef(false);
  const lastInteraction = useRef(0);
  const timeoutRef = useRef<number | null>(null);

  // Live refs
  const timeRef = useRef(currentTime);
  const tripsRef = useRef(tripsData);
  const settingsRef = useRef(settings);

  // Sync props into refs
  useEffect(() => {
    timeRef.current = currentTime;
  }, [currentTime]);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);
  useEffect(() => {
    tripsRef.current = tripsData;
  }, [tripsData]);

  const onInteractionStateChange = useCallback((interactionState: InteractionState) => {
    if (interactionState.isDragging) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      isInteracting.current = true;
      lastInteraction.current = Date.now();
    } else {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => {
        isInteracting.current = false;
      }, INTERACTION_RESET_DEBOUNCE_MS);
    }
  }, []);

  // Handle user pan/rotate/zoom
  const onViewStateChange = useCallback(
    ({ viewState: vs }: { viewState: MapViewState }) => {
      const prev = viewState;
      const panMoved = Math.hypot(vs.longitude - prev.longitude, vs.latitude - prev.latitude) > 1e-6;
      const bearMoved = Math.abs((vs.bearing || 0) - (prev.bearing || 0)) > 0.5;
      const zoomMoved = Math.abs(vs.zoom - prev.zoom) > ZOOM_DECAY_THRESHOLD;

      if (panMoved || bearMoved || zoomMoved) {
        // Compute offsets against current track point
        const pts = tripsRef.current[0]?.pointsWithCourse || [];
        const ip = getInterpolatedPoint(pts, timeRef.current);
        if (ip) {
          if (settingsRef.current.followPosition) {
            if (zoomMoved) {
              // Recenter on zoom
              vs.longitude = ip.longitude;
              vs.latitude = ip.latitude;
              posOffset.current = [0, 0];
            } else if (panMoved) {
              // Update pan offset
              posOffset.current = [vs.longitude - ip.longitude, vs.latitude - ip.latitude];
            }
          }
          if (settingsRef.current.followBearing) {
            if (zoomMoved) {
              // Reset bearing on zoom
              vs.bearing = ip.course || 0;
              bearOffset.current = 0;
            } else if (bearMoved) {
              // Update bearing offset
              const VSBearing = vs.bearing || 0;
              const IPCourse = ip.course || 0;
              let diff = VSBearing - IPCourse;
              if (diff > 180) diff -= 360;
              if (diff < -180) diff += 360;
              bearOffset.current = diff;
            }
          }

          if (zoomMoved) {
            // When user manually zooms, update their base zoom preference
            // but preserve the speed-based zoom component
            zoomOffset.current = vs.zoom - DEFAULT_ZOOM - speedZoomOffset.current;
          }
        }

        // Cancel deck.gl transitions
        vs.transitionDuration = 0;
      }
      setViewState(vs);
    },
    [viewState],
  );

  // Initial camera center
  useEffect(() => {
    if (gpsData.length > 0 && !hasInitial.current) {
      const p = gpsData[0];
      setViewState((v) => ({
        ...v,
        longitude: p.longitude,
        latitude: p.latitude,
        // preserve existing zoomOffset
        bearing: settings.followBearing ? p.course || 0 : v.bearing || 0,
        transitionDuration: 1000,
      }));
      hasInitial.current = true;
    }
  }, [gpsData, settings.followBearing]);

  // Continuous follow loop
  useEffect(() => {
    let id: number;
    const animate = () => {
      const pts = tripsRef.current[0]?.pointsWithCourse || [];
      const ip = getInterpolatedPoint(pts, timeRef.current);
      if (ip) {
        // Calculate speed-based zoom offset (if enabled)
        if (settingsRef.current.speedBasedZoom ?? true) {
          const currentSpeed = ip.speed || 0; // Speed in m/s
          // Convert speed to km/h for more intuitive scaling
          const speedKmh = currentSpeed * 3.6;
          // Get settings values with defaults
          const maxSpeedRef = settingsRef.current.speedZoomMaxSpeed ?? 50;
          const zoomIntensity = settingsRef.current.speedZoomIntensity ?? 0.8;
          const smoothness = settingsRef.current.speedZoomSmoothness ?? 0.3;

          // Calculate target speed zoom offset (higher speed = zoom out more, lower speed = zoom in more)
          // Negative offset = zoom out, positive offset = zoom in
          const normalizedSpeed = Math.min(speedKmh / maxSpeedRef, 1); // Normalize to 0-1 range
          const targetSpeedZoom = -normalizedSpeed * zoomIntensity; // Negative for zoom out when fast
          // Smooth the speed zoom transition
          speedZoomOffset.current = lerp(speedZoomOffset.current, targetSpeedZoom, smoothness);
        } else {
          // If speed-based zoom is disabled, gradually return to zero offset
          speedZoomOffset.current = lerp(speedZoomOffset.current, 0, 0.1);
        }

        const dt = Date.now() - lastInteraction.current;
        const canRe = dt > REENGAGE_DELAY_MS;
        if (!isInteracting.current && canRe) {
          // decay pos and bear, but keep zoomOffset constant
          bearOffset.current *= OFFSET_DECAY_FACTOR;
          posOffset.current[0] *= OFFSET_DECAY_FACTOR;
          posOffset.current[1] *= OFFSET_DECAY_FACTOR;
        }
        setViewState((prev) => {
          if (isInteracting.current) return prev;

          const { followPosition, followBearing } = settingsRef.current;
          const nextState = { ...prev };
          let stateChanged = false;

          if (followPosition) {
            const targetLon = ip.longitude + posOffset.current[0];
            const targetLat = ip.latitude + posOffset.current[1];
            nextState.longitude = lerp(prev.longitude, targetLon, SMOOTH_FACTOR);
            nextState.latitude = lerp(prev.latitude, targetLat, SMOOTH_FACTOR);
            stateChanged = true;
          }
          if (followBearing) {
            const rawBear = (ip.course || 0) + bearOffset.current;
            const normPrev = ((prev.bearing || 0) + 360) % 360;
            const normTarget = (rawBear + 360) % 360;
            let diff = normTarget - normPrev;
            if (diff > 180) diff -= 360;
            if (diff < -180) diff += 360;
            const newBear =
              Math.abs(diff) < BEARING_SNAP_THRESHOLD
                ? normTarget
                : interpolateBearing(normPrev, normTarget, SMOOTH_FACTOR);
            nextState.bearing = newBear;
            stateChanged = true;
          }

          if (stateChanged || speedZoomOffset.current !== 0) {
            // Include speed-based zoom in the total zoom calculation
            const targetZoom = DEFAULT_ZOOM + zoomOffset.current + speedZoomOffset.current;
            nextState.zoom = targetZoom;
            nextState.transitionDuration = 0;
            return nextState;
          }

          return prev;
        });
      }
      id = requestAnimationFrame(animate);
    };
    id = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(id);
  }, []);

  return { viewState, onViewStateChange, onInteractionStateChange };
}
