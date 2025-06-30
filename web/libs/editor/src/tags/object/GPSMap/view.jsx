import React, { useEffect, useCallback, useMemo, useRef } from "react";
import { observer } from "mobx-react";
import { usePersistentJSONState } from "@humansignal/core/lib/hooks/usePersistentState";
import { getCurrentTheme } from "@humansignal/ui";
import { FramesControl } from "../../../components/Timeline/SideControls/FramesControl";
import { Timeline } from "../../../components/Timeline/Timeline";
import { Block, Elem } from "../../../utils/bem";
import ObjectTag from "../../../components/Tags/Object";
import { GPSVisualizationWithWaveform } from "../../../components/GPSVisualization/GPSVisualizationWithWaveform";
import { GPSMapSettingsControl } from "./GPSMapSettingsControl";
import { MetricWaveform } from "../../../components/GPSVisualization/Renderer/MetricWaveform";

// Default settings constant
const DEFAULT_SETTINGS = {
  gpsColorScheme: "jet",
  followMap: false,
  showWaveform: true,
  showSpeedWaveform: true,
  showAltitudeWaveform: true,
  showTechnicalInfo: false,

  // Cluster settings defaults
  clusterMaxGap: 1, // meters
  clusterMergeDistance: 5, // meters
  clusterMinPoints: 3, // minimum points to form a cluster
  stationarySpeedRange: [0, 1], // [min, max] speed range in m/s for stationary points
  showStationaryClusters: true, // To control visibility on map (deprecated, use showClustersOnMap)
  showClustersOnMap: true, // To control visibility of circles on map
  showClustersOnWaveform: true, // To control visibility of cluster markers on waveform
  showClustersOnGrid: true, // To control visibility on waveform grid
  timestampAltitudeOffsetFactor: 0.001, // Default from GPSVisualization
  tileLayerUrl: "https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png",
  tileLayerAttribution:
    '© <a href="https://stadiamaps.com/" target="_blank" rel="noopener noreferrer">Stadia Maps</a>, © <a href="https://openmaptiles.org/" target="_blank" rel="noopener noreferrer">OpenMapTiles</a>, © <a href="https://www.openstreetmap.org/about" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
  tileLayerMaxZoom: 19,
};

// The React component that renders the UI for the GPSMap tag
const GPSMapComponent = observer(({ item, settings, changeSetting, onSeek, onPlay, onPause }) => {
  const waveformApiRef = useRef(null);
  const altitudeWaveformRendererRef = useRef(null);
  const speedWaveformRendererRef = useRef(null);

  // Get state directly from the item (GPSMapModel instance)
  const gpsData = item.processedGpsData;
  const stationaryClustersData = item.stationaryClusters; // Get clusters from model
  const activeSegmentFromModel = item.activeStationarySegment; // Get active segment from model
  const trackDuration = item.trackDuration;
  const currentPointIndex = item.currentPointIndex;
  const totalPoints = item.totalPoints;

  // Effect to update model's cluster settings when relevant UI settings change
  useEffect(() => {
    if (item && typeof item.setExternalClusterSettings === "function") {
      item.setExternalClusterSettings({
        clusterMaxGap: settings.clusterMaxGap,
        clusterMergeDistance: settings.clusterMergeDistance,
        clusterMinPoints: settings.clusterMinPoints,
        stationarySpeedRange: settings.stationarySpeedRange,
        speedUnit: settings.speedUnit,
      });
    }
  }, [
    item,
    settings.clusterMaxGap,
    settings.clusterMergeDistance,
    settings.clusterMinPoints,
    settings.stationarySpeedRange,
    settings.speedUnit,
  ]);

  // Effect to update waveform visibility settings for relation control
  useEffect(() => {
    if (item && typeof item.updateWaveformSettings === "function") {
      item.updateWaveformSettings({
        showSpeedWaveform: settings.showSpeedWaveform,
        showAltitudeWaveform: settings.showAltitudeWaveform,
      });
    }
  }, [item, settings.showSpeedWaveform, settings.showAltitudeWaveform]);

  const isDarkMode = getCurrentTheme() === "Dark";

  const handleWaveformLoad = useCallback(
    (wfApi) => {
      waveformApiRef.current = wfApi;
      item.onLoad(wfApi);

      // Initialize the altitude waveform renderer if not already initialized
      if (!altitudeWaveformRendererRef.current && wfApi?.layers?.altitudeMetric) {
        altitudeWaveformRendererRef.current = new MetricWaveform(wfApi.layers.altitudeMetric, wfApi, {
          metric: "altitude",
          lineColor: settings?.altitudeLineColor ?? "var(--color-blue-400)",
          lineWidth: settings?.altitudeLineWidth ?? 2,
        });
      }
      // Initialize the speed waveform renderer if not already initialized
      if (!speedWaveformRendererRef.current && wfApi?.layers?.speedMetric) {
        speedWaveformRendererRef.current = new MetricWaveform(wfApi.layers.speedMetric, wfApi, {
          metric: "speed",
          lineColor: settings?.speedLineColor ?? "var(--color-red-400)",
          lineWidth: settings?.speedLineWidth ?? 2,
        });
      }
    },
    [item, settings],
  );

  const handleDestroy = useCallback(() => {
    if (altitudeWaveformRendererRef.current) {
      altitudeWaveformRendererRef.current.destroy();
      altitudeWaveformRendererRef.current = null;
    }
    if (speedWaveformRendererRef.current) {
      speedWaveformRendererRef.current.destroy();
      speedWaveformRendererRef.current = null;
    }
    if (waveformApiRef.current) {
      waveformApiRef.current = null;
    }
  }, []);

  const handleRegionSelect = useCallback(
    (waveformRegion, event) => {
      if (!waveformRegion || !item || !item.annotation) return;

      const annotation = item.annotation;
      const growSelection = event?.metaKey || event?.ctrlKey;

      if (!growSelection || (!waveformRegion.selected && !waveformRegion.isRegion)) {
        annotation.regionStore.unselectAll();
      }

      const itemRegion = item.regs.find((obj) => obj.id === waveformRegion.id);

      if (annotation.isLinkingMode && itemRegion) {
        annotation.addLinkedRegion(itemRegion);
        annotation.stopLinkingMode();
        annotation.regionStore.unselectAll();
        if (typeof waveformRegion.handleSelected === "function") {
          waveformRegion.handleSelected(false);
        }
        return;
      }

      if (itemRegion) {
        // waveformRegion.selected is the state *after* the click, before store update.
        // We tell the store to toggle based on this clicked state.
        annotation.regionStore.toggleSelection(itemRegion, waveformRegion.selected);
      }

      // Sync the visual state of the clicked waveform region with the *new* store state.
      if (typeof waveformRegion.handleSelected === "function") {
        const storeSelected = itemRegion ? annotation.regionStore.isSelected(itemRegion) : waveformRegion.selected;
        waveformRegion.handleSelected(storeSelected);
      }

      if (!growSelection && waveformApiRef.current?.regions?.list) {
        waveformApiRef.current.regions.list.forEach((r) => {
          if (r.id !== waveformRegion.id) {
            if (typeof r.handleSelected === "function") r.handleSelected(false);
          }
        });
      }
      // item.requestWSUpdate(); // Model is no longer responsible for this call directly from selection
      // The waveform or annotation store reactions should handle necessary updates.
    },
    [item, waveformApiRef],
  );

  const handleSeekToTime = useCallback(
    (time) => {
      item.seek(time);
      if (onSeek) onSeek(time);
    },
    [item, onSeek],
  );

  const handlePositionChange = useCallback(
    (position) => {
      // Convert 1-based position to 0-based index
      const index = position - 1;
      if (!item.processedGpsData || index < 0 || index >= item.processedGpsData.length) {
        console.warn("Invalid position for seeking:", position);
        return;
      }
      const point = item.processedGpsData[index];
      if (point && typeof point.timestamp === "number") {
        if (waveformApiRef.current) {
          waveformApiRef.current.seek(point.timestamp);
        }
      }
    },
    [item, waveformApiRef],
  );

  const handlePlay = useCallback(() => {
    item.play();
    if (onPlay) onPlay();
  }, [item, onPlay]);

  const handlePause = useCallback(() => {
    item.pause();
    if (onPause) onPause();
  }, [item, onPause]);

  // Determine color scheme from props
  const currentColorScheme = settings?.gpsColorScheme ?? DEFAULT_SETTINGS.gpsColorScheme;

  // Pass settings and changeSetting down via the component function
  const customTimelineControls = useMemo(
    () => [
      {
        key: "settings-control",
        position: "left",
        component: () => (
          <React.Fragment key="settings-control">
            <GPSMapSettingsControl settings={settings} changeSetting={changeSetting} />
          </React.Fragment>
        ),
      },
      {
        key: "frames-control",
        position: "left",
        component: () => (
          <React.Fragment key="frames-control">
            <FramesControl
              position={item.currentPointIndex}
              length={item.totalPoints}
              onPositionChange={handlePositionChange}
            />
          </React.Fragment>
        ),
      },
    ],
    [item.currentPointIndex, item.totalPoints, handlePositionChange, settings, changeSetting],
  );

  // Show loading/error messages before the main block if not loaded
  if (!item.isReady) {
    if (!item.value) {
      return (
        <div style={{ color: "red", padding: "1em" }}>
          Error: The 'value' attribute is missing or empty for the GPSMap tag.
        </div>
      );
    }
    if (!gpsData || gpsData.length === 0) {
      return (
        <div style={{ padding: "1em", color: "#808080" }}>
          Loading GPS data or data is empty/invalid for field '{item.value}'...
        </div>
      );
    }
  }

  return (
    <ObjectTag item={item}>
      <Block name="gps-map">
        {item.viewInitialized ? (
          <GPSVisualizationWithWaveform
            item={item}
            gpsData={gpsData}
            stationaryClustersData={stationaryClustersData}
            activeSegmentFromModel={activeSegmentFromModel}
            currentTime={item.currentTime}
            playing={item.playing}
            onSeekToTime={handleSeekToTime}
            colorScheme={currentColorScheme}
            settings={settings}
            regionColor={item.activeState?.selectedColor ?? null}
            regionLabels={item.activeState?.selectedValues?.()}
            onRegionCreated={item.onRegionCreated}
            onRegionSelected={handleRegionSelect}
            onRegionUpdatedEnd={item.onRegionUpdatedEnd}
            onLoad={handleWaveformLoad}
            onDestroy={handleDestroy}
          />
        ) : (
          <p>Loading GPS data...</p>
        )}
        <Elem
          name="timeline"
          tag={Timeline}
          key={`timeline-${item.id}`}
          item={item}
          playing={item.playing}
          length={totalPoints}
          position={currentPointIndex}
          framerate={1}
          regions={[]}
          disableView={true}
          controls={{}}
          customControls={customTimelineControls}
          allowFullscreen={false}
          allowViewCollapse={false}
          defaultStepSize={1}
          onPositionChange={handlePositionChange}
          onPlay={handlePlay}
          onPause={handlePause}
        />
      </Block>
    </ObjectTag>
  );
});

const GPSMapWithSettings = ({ item }) => {
  const [settings, setSettings] = usePersistentJSONState("ls:gpsmap:settings", DEFAULT_SETTINGS);

  const changeSetting = useCallback(
    (key, value) => {
      setSettings((prevSettings) => {
        const newState = { ...prevSettings, [key]: value };
        return { ...newState };
      });
    },
    [setSettings],
  );

  const ready = item._valueLoaded;
  return <GPSMapComponent item={item} settings={settings} changeSetting={changeSetting} />;
};

export { GPSMapWithSettings as GPSMapComponent };
