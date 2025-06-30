import type React from "react";
import { useMemo, useRef, useEffect, useCallback, useState } from "react";
import GPSVisualization from "./GPSMap/GPSVisualization";
import "./GPSVisualizationWithWaveform.scss";
import { Hotkey } from "../../core/Hotkey";
import "./GPSVisualization.scss";
import { ActiveClusterSegment } from "../../tags/object/GPSMap/clusters";
import { GPSMetricsWaveform, GPSMetricsWaveformOptions } from "./GPSMetricsWaveform";
import type { GPSPoint, StationaryCluster } from "./types";

interface GPSVisualizationWithWaveformProps {
  gpsData: GPSPoint[];
  stationaryClustersData: StationaryCluster[];
  activeSegmentFromModel?: ActiveClusterSegment;
  currentTime: number;
  playing?: boolean;
  onSeekToTime: (time: number) => void;
  settings: {
    gpsColorScheme?: string;
    followMap?: boolean;
    showWaveform?: boolean;
    showStationaryClusters?: boolean;
    showClustersOnMap?: boolean;
    showClustersOnWaveform?: boolean;
    showClustersOnGrid?: boolean;
    showSpeedWaveform?: boolean;
    showAltitudeWaveform?: boolean;
    speedUnit?: "m/s" | "km/h";
    [key: string]: any;
  };
  colorScheme?: string;
  regionColor: string | null;
  regionLabels?: string[];
  onRegionCreated?: (region: any) => void;
  onRegionSelected?: (region: any, event?: MouseEvent) => void;
  onRegionUpdatedEnd?: (region: any) => void;
  onLoad?: (ws: GPSMetricsWaveform) => void;
  onDestroy?: () => void;
}



export const GPSVisualizationWithWaveform: React.FC<GPSVisualizationWithWaveformProps> = ({
  gpsData,
  stationaryClustersData,
  activeSegmentFromModel,
  currentTime,
  playing = false,
  onSeekToTime,
  settings,
  colorScheme = "magma",
  regionColor,
  regionLabels,
  onRegionCreated,
  onRegionSelected,
  onRegionUpdatedEnd,
  onLoad,
  onDestroy,
}) => {
  const waveformContainerRef = useRef<HTMLDivElement>(null);
  const waveformRef = useRef<GPSMetricsWaveform | null>(null);

  const showWaveform = settings?.showWaveform ?? true;

  // Internal state to track the current time for immediate map updates
  const [currentMapTime, setCurrentMapTime] = useState(currentTime);

  // Store callback refs to avoid stale closures
  const onLoadRef = useRef(onLoad);
  const onDestroyRef = useRef(onDestroy);
  const onRegionCreatedRef = useRef(onRegionCreated);
  const onRegionSelectedRef = useRef(onRegionSelected);
  const onRegionUpdatedEndRef = useRef(onRegionUpdatedEnd);
  const onSeekToTimeRef = useRef(onSeekToTime);

  // Update refs when callbacks change
  onLoadRef.current = onLoad;
  onDestroyRef.current = onDestroy;
  onRegionCreatedRef.current = onRegionCreated;
  onRegionSelectedRef.current = onRegionSelected;
  onRegionUpdatedEndRef.current = onRegionUpdatedEnd;
  onSeekToTimeRef.current = onSeekToTime;



  const handleSeekFromMap = useCallback((time: number) => {
    if (waveformRef.current) {
      waveformRef.current.seek(time);
    }
    setCurrentMapTime(time); // Update map time immediately
  }, []);

  // Main effect: Create waveform instance once (like AudioUltra's useWaveform)
  useEffect(() => {
    if (!waveformContainerRef.current) return;

    const options: GPSMetricsWaveformOptions = {
      container: waveformContainerRef.current,
      initialVisibleDuration: 30,
      showClusters: settings?.showClustersOnWaveform ?? true, // Controls cluster markers on timeline
      showClusterVisualization: settings?.showClustersOnGrid ?? true, // Controls cluster overlay behind grid
      showRegions: true, // Always show regions and relationships
      speedUnit: settings?.speedUnit,
      showSpeedWaveform: settings?.showSpeedWaveform,
      showAltitudeWaveform: settings?.showAltitudeWaveform,
    };

    const waveform = new GPSMetricsWaveform(options);
    waveformRef.current = waveform;

    // Set up event listeners
    const handleRegionCreated = (region: any) => {
      onRegionCreatedRef.current?.(region);
    };

    const handleRegionSelected = (region: any, event?: MouseEvent) => {
      onRegionSelectedRef.current?.(region, event);
    };

    const handleRegionUpdatedEnd = (region: any) => {
      onRegionUpdatedEndRef.current?.(region);
    };

    const handleTimeChange = (newTime: number) => {
      setCurrentMapTime(newTime); // Update map immediately
      onSeekToTimeRef.current?.(newTime);
    };

    const handleSeek = (newTime: number) => {
      setCurrentMapTime(newTime); // Update map immediately
      onSeekToTimeRef.current?.(newTime);
    };

    const handleTimeUpdate = (newTime: number) => {
      setCurrentMapTime(newTime); // Update map immediately during playhead drag
      // Don't call onSeekToTimeRef here - timeUpdate is for visual updates only
      // The model should only be updated on actual seek events, not during dragging
    };

    // Attach event listeners
    waveform.on("regionCreated", handleRegionCreated);
    waveform.on("regionSelected", handleRegionSelected);
    waveform.on("regionUpdatedEnd", handleRegionUpdatedEnd);
    waveform.on("timeChange", handleTimeChange);
    waveform.on("seek", handleSeek);
    waveform.on("timeUpdate", handleTimeUpdate);

    // Set up hotkeys
    const hotkeys = Hotkey("GPS", "GPS Visualization");

    hotkeys.addNamed("region:delete", () => {
      waveform.regions?.clearSegments(false);
    });

    hotkeys.addNamed("segment:delete", () => {
      waveform.regions?.clearSegments(false);
    });

    hotkeys.addNamed("region:delete-all", () => {
      waveform.regions?.clearSegments();
    });

    // Call onLoad to notify parent component
    onLoadRef.current?.(waveform);

    // Force initial draw after a short delay to ensure everything is ready
    setTimeout(() => {
      waveform.draw();
    }, 50);

    // Cleanup function
    return () => {
      waveform.off("regionCreated", handleRegionCreated);
      waveform.off("regionSelected", handleRegionSelected);
      waveform.off("regionUpdatedEnd", handleRegionUpdatedEnd);
      waveform.off("timeChange", handleTimeChange);
      waveform.off("seek", handleSeek);
      waveform.off("timeUpdate", handleTimeUpdate);

      hotkeys.unbindAll();
      onDestroyRef.current?.();
      waveform.destroy();
      waveformRef.current = null;
    };
  }, []); // Empty dependency array - create once like AudioUltra

  // Separate effect for dynamic region drawing handlers that depend on regionColor and regionLabels
  useEffect(() => {
    if (!waveformRef.current) return;

    const waveform = waveformRef.current;

    const updateBeforeRegionDraw = () => {
      if (regionColor && regionLabels) {
        waveform.regions.regionDrawableTarget();
        waveform.regions.setDrawingColor(regionColor);
        waveform.regions.setLabels(regionLabels);
      }
    };

    const updateAfterRegionDraw = () => {
      waveform.regions.resetDrawingColor();
      waveform.regions.resetLabels();
      waveform.regions.resetDrawableTarget();
    };

    waveform.on("beforeRegionsDraw", updateBeforeRegionDraw);
    waveform.on("afterRegionsDraw", updateAfterRegionDraw);

    return () => {
      waveform.off("beforeRegionsDraw", updateBeforeRegionDraw);
      waveform.off("afterRegionsDraw", updateAfterRegionDraw);
    };
  }, [regionColor, regionLabels]);

  // Separate effects to update waveform when data/settings change
  useEffect(() => {
    if (waveformRef.current && gpsData && gpsData.length > 0) {
      waveformRef.current.setData(gpsData);
      // Force redraw after setting data
      setTimeout(() => {
        waveformRef.current?.draw();
      }, 10);
    }
  }, [gpsData]);

  useEffect(() => {
    if (waveformRef.current && stationaryClustersData) {
      waveformRef.current.setClusterData(stationaryClustersData);
      // Force redraw after setting cluster data
      setTimeout(() => {
        waveformRef.current?.draw();
      }, 10);
    }
  }, [stationaryClustersData]);

  useEffect(() => {
    if (waveformRef.current) {
      waveformRef.current.updateShowClusters(settings?.showClustersOnWaveform ?? true);
      // Force redraw after updating cluster visibility with a small delay
      setTimeout(() => {
        waveformRef.current?.draw();
      }, 10);
    }
  }, [settings?.showClustersOnWaveform]);

  useEffect(() => {
    if (waveformRef.current) {
      waveformRef.current.updateShowClusterVisualization(settings?.showClustersOnGrid ?? true);
      // Force redraw after updating cluster visualization with a small delay
      setTimeout(() => {
        waveformRef.current?.draw();
      }, 10);
    }
  }, [settings?.showClustersOnGrid]);

  useEffect(() => {
    if (waveformRef.current) {
      waveformRef.current.updateSpeedUnit(settings?.speedUnit ?? "m/s");
    }
  }, [settings?.speedUnit]);

  useEffect(() => {
    if (waveformRef.current) {
      waveformRef.current.updateShowSpeedWaveform(settings?.showSpeedWaveform ?? true);
      // Force redraw after updating speed waveform visibility with a small delay
      setTimeout(() => {
        waveformRef.current?.draw();
      }, 10);
    }
  }, [settings?.showSpeedWaveform]);

  useEffect(() => {
    if (waveformRef.current) {
      waveformRef.current.updateShowAltitudeWaveform(settings?.showAltitudeWaveform ?? true);
      // Force redraw after updating altitude waveform visibility with a small delay
      setTimeout(() => {
        waveformRef.current?.draw();
      }, 10);
    }
  }, [settings?.showAltitudeWaveform]);

  useEffect(() => {
    if (waveformRef.current) {
      waveformRef.current.setTime(currentTime, true);
    }
  }, [currentTime]);

  // Sync internal map time with external currentTime prop
  useEffect(() => {
    setCurrentMapTime(currentTime);
  }, [currentTime]);

  useEffect(() => {
    if (waveformRef.current && typeof waveformRef.current.updateActiveSegment === "function") {
      waveformRef.current.updateActiveSegment(activeSegmentFromModel);
    }
  }, [activeSegmentFromModel]);

  return (
    <div className="gps-visualization">
      <div className="gps-visualization__map" style={{ height: "500px" }}>
        <GPSVisualization
          gpsData={gpsData}
          stationaryClustersData={stationaryClustersData}
          activeMapSegment={activeSegmentFromModel ?? null}
          currentTime={currentMapTime}
          playing={playing}
          onSeekToTime={handleSeekFromMap}
          settings={settings}
          colorScheme={colorScheme}
        />
      </div>
      {showWaveform && <div className="gps-visualization__waveform" ref={waveformContainerRef} />}
    </div>
  );
};
