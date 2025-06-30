import type { FC } from "react";
import type { Cluster, ActiveClusterSegment } from "../../tags/object/GPSMap/clusters";

// ===================================================================
// CORE GPS DATA INTERFACES
// ===================================================================

export interface GPSPoint {
  timestamp: number;
  altitude: number;
  speed: number;
  latitude: number;
  longitude: number;
  course?: number;
  haccuracy?: number;
  vaccuracy?: number;
}

export interface StationaryCluster {
  longitude: number;
  latitude: number;
  altitude: number;
  count: number;
  radius: number;
  points: GPSPoint[];
  timestamp: number;
  distance?: number;
  duration: number;
}

export interface GPSData {
  points: GPSPoint[];
  clusters?: Cluster[];
  activeClusterSegment?: ActiveClusterSegment;
  currentTime: number;
  cursorTime?: number;
}

// ===================================================================
// COMPONENT PROPS INTERFACES
// ===================================================================

export interface GPSVisualizationProps {
  gpsData: GPSPoint[];
  stationaryClustersData?: StationaryCluster[];
  activeMapSegment?: ActiveClusterSegment | null;
  currentTime: number;
  playing?: boolean;
  onSeekToTime: (time: number) => void;
  settings?: {
    gpsColorScheme?: string;
    followMap?: boolean;
    showWaveform?: boolean;
    followBearing?: boolean;
    followPosition?: boolean;
    followMapTransitionDuration?: number;
    tileLayerUrl?: string;
    tileLayerAttribution?: string;
    tileLayerMaxZoom?: number;
    stationarySpeedThreshold?: number;
    timestampAltitudeOffsetFactor?: number;
    showStationaryClusters?: boolean;
    showClustersOnMap?: boolean;
    showClustersOnWaveform?: boolean;
    showClustersOnGrid?: boolean;
    showStationaryClusterArc?: boolean;
    showTechnicalInfo?: boolean;
    showSpeedWaveform?: boolean;
    showAltitudeWaveform?: boolean;
    speedUnit?: "m/s" | "km/h";
    tileProvider?: string;
    [key: string]: any;
  };
  colorScheme?: string;
}

export interface GPSVisualizationWithWaveformProps {
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
  onLoad?: (ws: any) => void;
  onDestroy?: () => void;
}
