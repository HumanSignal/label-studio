import React, { useMemo, useRef } from "react";
import DeckGL from "@deck.gl/react";
import { TileLayer } from "@deck.gl/geo-layers";
import { BitmapLayer } from "@deck.gl/layers";
import "../GPSVisualization.scss";
import { useDeckGLCamera } from "../useDeckGLCamera";
import { useBearingLayer } from "./BearingLayer";
import { useStartFinishFlags } from "./StartFinishFlags";
import { useClusterLayer } from "./ClusterLayer";
import { useClusterArcLayers } from "./ClusterArcLayers";
import { useCurrentPointLayer } from "./CurrentPointLayer";
import { useStaticPathLayer } from "./StaticPathLayer";
import { useAnimatedTrailLayer } from "./AnimatedTrailLayer";
import { getColorFromScheme } from "../colors";
import type { GPSPoint, StationaryCluster, GPSVisualizationProps } from "../types";
import type { ActiveClusterSegment } from "../../../tags/object/GPSMap/clusters";
import { createGPSPointTooltip, createClusterTooltip, createDistanceTooltip, getTooltipStyle } from "./tooltips";
import TechnicalInfoOverlay from "./TechnicalInfoOverlay";
import { getCurrentTheme } from "@humansignal/ui";

// Gentler linear scaling: 2 px @ zoom12 → ~12 px @ zoom20. Clamp 2–20.
const getPathWidthPx = (zoom = 12) => {
  const z = Math.max(0, zoom);
  const width = 2 + (z - 12) * 1.25; // each zoom step adds 1.25 px
  return Math.round(Math.max(2, Math.min(20, width)));
};



const formatTime = (seconds: number): string => {
  if (typeof seconds !== "number" || isNaN(seconds)) return "00:00:00";
  const correctedSeconds = Math.max(0, seconds);
  try {
    const date = new Date(0);
    date.setSeconds(correctedSeconds);
    const timeString = date.toISOString().substring(11, 19);
    return timeString;
  } catch (e) {
    console.error("Error formatting time:", e);
    return "00:00:00";
  }
};

const getCardinalDirection = (bearing: number): string => {
  const directions = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ];
  const index = Math.round(bearing / 22.5) % 16;
  return directions[index];
};

const CompassDisplay: React.FC<{ bearing: number }> = ({ bearing }) => {
  const compassContainerStyle: React.CSSProperties = {
    position: "absolute",
    top: "15px",
    right: "15px",
    width: "48px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    zIndex: 10,
  };
  const compassCircleStyle: React.CSSProperties = {
    width: "40px",
    height: "40px",
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    borderRadius: "50%",
    border: "1.5px solid black",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
    position: "relative",
  };
  const svgArrow = (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      style={{ transform: `rotate(${bearing * -1}deg)`, transition: "transform 0.3s ease-out" }}
      fill="black"
    >
      <path d="M12 2 L2 22 L12 17 L22 22 Z" />
    </svg>
  );
  const northLetterStyle: React.CSSProperties = {
    marginTop: "4px",
    fontWeight: "bold",
    fontSize: "16px",
    color: "black",
  };
  return (
    <div style={compassContainerStyle} title={`Bearing: ${bearing.toFixed(1)}°`}>
      <div style={compassCircleStyle}>{svgArrow}</div>
      <div style={northLetterStyle}>N</div>
    </div>
  );
};

// Helper function to get interpolated point (extracted from CurrentPointLayer)
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

// Helper function to get theme-aware UI colors
const getThemeAwareUIColors = () => {
  const currentTheme = getCurrentTheme();
  const isDarkMode = currentTheme?.toLowerCase() === "dark";

  if (isDarkMode) {
    return {
      attributionBackground: "rgba(0, 0, 0, 0.8)",
      attributionColor: "white",
      zoomBackground: "rgba(0, 0, 0, 0.9)",
      zoomColor: "#fff",
      zoomBorder: "1px solid rgba(255,255,255,0.3)",
    };
  } else {
    return {
      attributionBackground: "rgba(255, 255, 255, 0.9)",
      attributionColor: "black",
      zoomBackground: "rgba(255, 255, 255, 0.95)",
      zoomColor: "#000",
      zoomBorder: "1px solid rgba(0,0,0,0.2)",
    };
  }
};

const GPSVisualization: React.FC<GPSVisualizationProps> = ({
  gpsData = [],
  stationaryClustersData = [],
  activeMapSegment = null,
  currentTime = 0,
  playing = false,
  onSeekToTime,
  settings = {},
  colorScheme = "magma",
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const tileLayerKey = `${settings.tileProvider}-${settings.tileLayerUrl}-${settings.tileLayerAttribution}`;

  const tripsData = useMemo(() => {
    if (!gpsData || gpsData.length === 0) return [];

    const effectiveColorScheme = settings.gpsColorScheme || colorScheme;
    const altitudeOffsetFactor = settings.timestampAltitudeOffsetFactor ?? 0.001;

    // Check if data is already sorted to avoid unnecessary sorting
    const needsSorting = gpsData.length > 1 && gpsData.some((p, i) => i > 0 && p.timestamp < gpsData[i - 1].timestamp);
    const sortedData = needsSorting ? [...gpsData].sort((a, b) => a.timestamp - b.timestamp) : gpsData;

    const startTime = sortedData.length > 0 ? sortedData[0].timestamp : 0;
    const dataLength = sortedData.length;

    // Pre-allocate arrays for better performance
    const pathCoords = new Array(dataLength);
    const timestamps = new Array(dataLength);
    const speeds = new Array(dataLength);

    // Single pass through data for all calculations
    for (let i = 0; i < dataLength; i++) {
      const p = sortedData[i];
      pathCoords[i] = [p.longitude, p.latitude, (p.altitude || 0) + (p.timestamp - startTime) * altitudeOffsetFactor];
      timestamps[i] = Math.round(p.timestamp * 1000);
      speeds[i] = typeof p.speed === "number" ? p.speed : 0;
    }

    // Calculate segment speeds more efficiently
    const segmentSpeeds = new Array(dataLength);
    if (dataLength > 1) {
      for (let i = 0; i < dataLength - 1; i++) {
        segmentSpeeds[i] = (speeds[i] + speeds[i + 1]) * 0.5; // Optimized lerp
      }
      segmentSpeeds[dataLength - 1] = speeds[dataLength - 1];
    } else if (dataLength === 1) {
      segmentSpeeds[0] = speeds[0];
    }

    // Find min/max in single pass
    let minSpeed = segmentSpeeds[0] || 0;
    let maxSpeed = segmentSpeeds[0] || 0;
    for (let i = 1; i < segmentSpeeds.length; i++) {
      const speed = segmentSpeeds[i];
      if (speed < minSpeed) minSpeed = speed;
      if (speed > maxSpeed) maxSpeed = speed;
    }

    // Normalize speeds and calculate colors
    const speedRange = maxSpeed - minSpeed;
    const segmentColors = new Array(dataLength);
    for (let i = 0; i < dataLength; i++) {
      const normalizedSpeed = speedRange > 0 ? (segmentSpeeds[i] - minSpeed) / speedRange : 0;
      segmentColors[i] = getColorFromScheme(effectiveColorScheme, normalizedSpeed);
    }

    return [
      { path: pathCoords, timestamps, segmentColors, pointsWithCourse: sortedData, startTime, minSpeed, maxSpeed },
    ];
  }, [gpsData, colorScheme, settings.gpsColorScheme, settings.timestampAltitudeOffsetFactor]);

  const { viewState, onViewStateChange, onInteractionStateChange } = useDeckGLCamera({
    gpsData,
    currentTime,
    settings: {
      followPosition: settings.followPosition ?? false,
      followBearing: settings.followBearing ?? false,
      speedBasedZoom: settings.speedBasedZoom ?? true,
      speedZoomIntensity: settings.speedZoomIntensity ?? 0.8,
      speedZoomMaxSpeed: settings.speedZoomMaxSpeed ?? 50,
      speedZoomSmoothness: settings.speedZoomSmoothness ?? 0.3,
    },
    tripsData,
  });

  const defaultTileLayerUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  const defaultTileLayerAttribution =
    '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  const baseMapLayer = useMemo(() => {
    const url = settings.tileLayerUrl || defaultTileLayerUrl;
    const attribution = settings.tileLayerAttribution || defaultTileLayerAttribution;
    const maxZoom = settings.tileLayerMaxZoom || 19;

    return new TileLayer({
      id: "tile-layer",
      data: url,
      minZoom: 0,
      maxZoom: maxZoom,
      tileSize: 256,
      attribution: attribution,
      // Tile loading optimizations to reduce glitches
      maxCacheSize: 32, // Reduce cache size for better memory management
      maxRequests: 4, // Reduce concurrent requests to prevent network congestion
      debounceTime: 100, // Increase debounce to reduce tile requests during rapid movement
      refinementStrategy: "no-overlap", // Prevent overlapping tile requests
      maxCacheByteSize: 32 * 1024 * 1024, // 32MB cache limit
      onTileError: (error: any) => {
        console.warn("Tile loading error:", error);
      },
      renderSubLayers: (props: any) => {
        const {
          bbox: { west, south, east, north },
        } = props.tile;

        // Add error handling for tile rendering
        try {
          return new BitmapLayer({
            ...props,
            data: null,
            image: props.data,
            bounds: [west, south, east, north],
            // Smooth tile transitions
            parameters: {
              blend: true,
              blendFunc: [770, 771], // GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA
              blendEquation: 32774, // GL_FUNC_ADD
            },
          });
        } catch (error) {
          console.warn("Tile render error:", error);
          return null;
        }
      },
    });
  }, [settings.tileLayerUrl, settings.tileLayerAttribution, settings.tileLayerMaxZoom]);

  const { zoom = 12 } = viewState ?? {};
  const pathWidthPx = getPathWidthPx(zoom);

  // Bearing Arrow Sizes
  const bearingFillSize = Math.max(2, pathWidthPx * 1.0);
  const bearingOutlineSize = bearingFillSize; // Remove outline by making it same size as fill

  // Interpolated Marker Sizes
  const markerOutlineSize = Math.max(5, Math.round(pathWidthPx * 2.0));
  const markerFillSize = markerOutlineSize - 1;

  // Start & End Marker Sizes
  const startEndFillSize = Math.max(2, pathWidthPx * 1.5);
  const startEndOutlineSize = startEndFillSize + 1;

  const bearingLayers = useBearingLayer({
    tripsData,
    viewState,
    onSeekToTime,
    bearingFillSize,
    bearingOutlineSize,
  });

  const startFinishFlags = useStartFinishFlags({
    gpsData,
    tripsData,
    colorScheme: settings.gpsColorScheme || colorScheme,
    startEndFillSize,
    startEndOutlineSize,
  });

  const clusterLayer = useClusterLayer({
    stationaryClustersData: stationaryClustersData || [],
    settings,
    tripsData,
    colorScheme: settings.gpsColorScheme || colorScheme,
  });

  const clusterArcLayers = useClusterArcLayers({
    settings,
    stationaryClustersData: stationaryClustersData || [],
    tripsData,
    colorScheme: settings.gpsColorScheme || colorScheme,
    activeMapSegment,
  });

  const staticPathLayers = useStaticPathLayer({
    tripsData,
    viewState,
    onSeekToTime,
    pathWidthPx,
    gpsData,
  });

  const currentPointLayers = useCurrentPointLayer({
    tripsData,
    currentTime,
    settings,
    colorScheme: settings.gpsColorScheme || colorScheme,
    markerFillSize,
    markerOutlineSize,
    playing,
  });

  const animatedTrailLayer = useAnimatedTrailLayer({
    tripsData,
    currentTime,
    viewState,
    pathWidthPx,
  });

  // Calculate current interpolated point for technical overlay
  const currentInterpolatedPoint = useMemo(() => {
    if (!tripsData || tripsData.length === 0) return null;
    const sortedData = (tripsData[0] as any)?.pointsWithCourse as GPSPoint[];
    if (!sortedData || sortedData.length === 0) return null;
    return getInterpolatedPointSimple(sortedData, currentTime);
  }, [tripsData, currentTime]);

  const layers = useMemo(() => {
    if (!tripsData || tripsData.length === 0) return [baseMapLayer];

    const showClustersOnMap = settings?.showClustersOnMap ?? true;
    const showStationaryClusterArc = settings?.showStationaryClusterArc ?? false;

    // Only include layers that exist and are not null/undefined
    const allLayers = [
      baseMapLayer,
      // Cluster layers should be rendered early (low z-index) so tooltips appear above them
      ...(showClustersOnMap ? [clusterLayer] : []),
      // Path layers
      ...(Array.isArray(staticPathLayers) ? staticPathLayers : []),
      animatedTrailLayer,
      // Interactive elements should be on top for better tooltip visibility
      ...(Array.isArray(bearingLayers) ? bearingLayers : []),
      ...(Array.isArray(startFinishFlags) ? startFinishFlags : []),
      ...(Array.isArray(currentPointLayers) ? currentPointLayers : []),
      // Arcs should be rendered on top of everything else
      ...(showStationaryClusterArc && Array.isArray(clusterArcLayers) ? clusterArcLayers : []),
    ];
    return allLayers.filter((layer) => layer != null);
  }, [
    baseMapLayer,
    clusterLayer,
    clusterArcLayers,
    staticPathLayers,
    animatedTrailLayer,
    bearingLayers,
    startFinishFlags,
    currentPointLayers,
    settings?.showClustersOnMap,
    settings?.showStationaryClusterArc,
    // Remove tripsData dependency to prevent unnecessary re-renders
  ]);

  const handleMapError = (error: any) => {
    console.error("Deck.GL Error:", error);
  };

  const controllerSettings = {
    inertia: true, // Enable smooth inertial panning for better UX
    zoomAroundCursor: true, // Enable zoom around cursor position
    scrollZoom: { speed: 0.01, smooth: true }, // Smooth scroll zoom
    dragPan: { inertia: 300 }, // Add inertia to drag panning
    doubleClickZoom: true, // Enable double-click zoom
    touchZoom: true, // Enable touch zoom on mobile
    touchRotate: true, // Enable touch rotation
    keyboard: true, // Enable keyboard navigation
  };

  const themeColors = getThemeAwareUIColors();

  return (
    <div
      ref={mapContainerRef}
      style={{
        position: "relative",
        width: "100%",
        height: "500px",
        backgroundColor: "#f0f0f0",
        zIndex: 1, // Ensure map container has proper stacking context
      }}
    >
      <DeckGL
        key={tileLayerKey}
        viewState={viewState}
        onViewStateChange={onViewStateChange}
        onInteractionStateChange={onInteractionStateChange}
        layers={layers}
        controller={{ ...controllerSettings }}
        style={{ position: "relative", zIndex: 1 }}
        // High-performance optimizations to prevent throttling
        useDevicePixels={true} // Enable high DPI rendering for better quality on high-res displays
        parameters={{
          clearColor: [0.94, 0.94, 0.94, 1], // Match background color
          blend: true,
          blendFunc: [770, 771], // GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA
        }}
        pickingRadius={5} // Adequate picking radius for good UX
        _framebuffer={null} // Disable framebuffer for better performance
        _animate={true} // Enable animation loop for smoother interactions
        glOptions={{
          // High-performance WebGL context settings
          antialias: true, // Enable antialiasing for better visual quality
          alpha: true,
          preserveDrawingBuffer: false,
          powerPreference: "high-performance", // Force dedicated GPU usage
          failIfMajorPerformanceCaveat: false, // Accept even if performance caveats exist
          stencil: false, // Disable stencil buffer (not needed for 2D mapping)
          depth: false, // Disable depth buffer for 2D rendering
          desynchronized: true, // Reduce input lag and improve responsiveness
          premultipliedAlpha: false, // Better color accuracy
        }}
        getTooltip={({ layer, object }: any) => {
          if (layer?.id === "stationary-centroid-arcs" && object) {
            return {
              html: createDistanceTooltip(object.distance),
              style: getTooltipStyle(),
            };
          }

          if ((layer?.id === "gps-points-bearing" || layer?.id === "gps-points-bearing-hit-area") && object) {
            const pointIndex = gpsData.findIndex(
              (p) =>
                p.timestamp === object.timestamp && p.latitude === object.latitude && p.longitude === object.longitude,
            );

            return {
              html: createGPSPointTooltip(object, pointIndex, formatTime, getCardinalDirection),
              style: getTooltipStyle(),
            };
          }

          if (layer?.id === "stationary-clusters" && object) {
            return {
              html: createClusterTooltip(object),
              style: getTooltipStyle(),
            };
          }

          return null;
        }}
        onClick={(info: any) => {
          if (info && info.coordinate && gpsData && gpsData.length > 0 && !info.layer && !info.handled) {
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
            onSeekToTime(clickedPoint.timestamp);
          }
        }}
        onError={handleMapError}
      />
      <div
        style={{
          position: "absolute",
          bottom: "8px",
          right: "8px",
          fontSize: "10px",
          backgroundColor: themeColors.attributionBackground,
          color: themeColors.attributionColor,
          padding: "4px",
          borderRadius: "4px",
          zIndex: 1,
        }}
        dangerouslySetInnerHTML={{ __html: settings.tileLayerAttribution || defaultTileLayerAttribution }}
      />

      {/* Zoom level display */}
      <div
        style={{
          position: "absolute",
          bottom: "8px",
          left: "8px",
          fontSize: "10px",
          backgroundColor: themeColors.zoomBackground,
          color: themeColors.zoomColor,
          padding: "4px",
          borderRadius: "4px",
          border: themeColors.zoomBorder,
          zIndex: 1,
          fontWeight: 600,
        }}
      >
        Zoom: {typeof viewState.zoom === "number" ? viewState.zoom.toFixed(1) : "—"}
      </div>

      <CompassDisplay bearing={viewState.bearing ?? 0} />

      {/* Technical Info Overlay */}
      {(settings?.showTechnicalInfo ?? false) && (
        <TechnicalInfoOverlay
          currentPoint={currentInterpolatedPoint}
          currentTime={currentTime}
          settings={settings}
          formatTime={formatTime}
        />
      )}
    </div>
  );
};

export default React.memo(GPSVisualization);
