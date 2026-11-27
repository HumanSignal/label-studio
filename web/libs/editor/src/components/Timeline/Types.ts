import type { FC, MouseEvent } from "react";
import type { ViewTypes } from "./Views";
import type * as Controls from "./SideControls";
import type { SpectrogramScale } from "../../lib/AudioUltra/Analysis/FFTProcessor";

export type TimelineControls = Partial<Record<keyof typeof Controls, boolean>> & {
  ZoomControl: boolean;
  SpeedControl: boolean;
};

export interface TimelineProps<D extends ViewTypes = "frames"> {
  regions: any[];
  length: number;
  position: number;
  height?: number;
  mode: D;
  framerate: number;
  playing: boolean;
  buffering?: boolean;
  zoom?: number;
  volume?: number;
  speed?: number;
  fullscreen?: boolean;
  disableView?: boolean;
  className?: string;
  defaultStepSize?: number;
  allowFullscreen?: boolean;
  allowViewCollapse?: boolean;
  allowSeek?: boolean;
  hopSize?: number;
  altHopSize?: number;
  data?: any;
  controlsOnTop?: boolean;
  controls?: TimelineControls;
  customControls?: TimelineCustomControls[];
  readonly?: boolean;
  navigationBlocked?: boolean;
  navigationBlockedTooltip?: string;
  onReady?: (data: Record<string, any>) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onFinished?: () => void;
  onSeek?: (position: number) => void;
  onPositionChange: (value: number) => void | false;
  onToggleVisibility?: (id: string, visibility: boolean) => void;
  onAddRegion?: (region: Record<string, any>) => any;
  onDeleteRegion?: (id: string) => void;
  onStartDrawing?: (options: { frame: number; region?: string }) => MSTTimelineRegion | undefined;
  onFinishDrawing?: (options: { mode?: "new" | "edit" }) => void;
  onZoom?: (zoom: number) => void;
  onSelectRegion?: (event: MouseEvent<HTMLDivElement>, id: string, select?: boolean) => void;
  onAction?: (event: MouseEvent, action: string, data?: any) => void;
  onVolumeChange?: (volume: number) => void;
  onFullscreenToggle?: (fullscreen: boolean) => void;
  onSpeedChange?: (speed: number) => void;
  formatPosition?: (options: TimelineControlsFormatterOptions) => string;
}

export interface TimelineViewProps {
  step: number;
  offset: number;
  position: number;
  length: number;
  playing: boolean;
  zoom?: number;
  speed?: number;
  volume?: number;
  regions: TimelineRegion[];
  height?: number;
  leftOffset?: number;
  controls?: TimelineControls;
  onScroll: (position: number) => void;
  onPositionChange: (position: number) => void;
  onResize: (position: number) => void;
  onPlay?: TimelineProps["onPlay"];
  onPause?: TimelineProps["onPause"];
  onSeek?: TimelineProps["onSeek"];
  onFinished?: TimelineProps["onFinished"];
  onToggleVisibility?: TimelineProps["onToggleVisibility"];
  onReady?: TimelineProps["onReady"];
  onZoom?: TimelineProps["onZoom"];
  onAddRegion?: TimelineProps["onAddRegion"];
  onDeleteRegion?: TimelineProps["onDeleteRegion"];
  onSelectRegion?: TimelineProps["onSelectRegion"];
  onStartDrawing?: TimelineProps["onStartDrawing"];
  onFinishDrawing?: TimelineProps["onFinishDrawing"];
  onVolumeChange?: TimelineProps["onVolumeChange"];
  onSpeedChange?: TimelineProps["onSpeedChange"];
}

// Full region stored in MST store
export interface MSTTimelineRegion {
  id: string;
  ranges: { start: number; end: number }[];
  object: { length: number }; // Video tag
  setRange: (range: [number, number], options?: { mode?: "new" | "edit" }) => void;
}

export interface TimelineRegion {
  id: string;
  index?: number;
  label: string;
  color: string;
  visible: boolean;
  selected: boolean;
  sequence: TimelineRegionKeyframe[];
  /** is this timeline region with spans */
  timeline?: boolean;
  locked?: boolean;
}

export interface TimelineRegionKeyframe {
  frame: number;
  enabled: boolean;
}

export interface TimelineContextValue {
  position: number;
  length: number;
  regions: TimelineRegion[];
  step: number;
  playing: boolean;
  visibleWidth: number;
  seekOffset: number;
  settings?: TimelineSettings;
  changeSetting?: (key: string, value: any) => void;
  data?: any;
  readonly?: boolean;
}

export interface TimelineMinimapProps {
  regions: TimelineRegion[];
  step: number;
  length: number;
}

export type TimelineSettings = {
  stepBackHotkey?: string;
  stepForwardHotkey?: string;
  playpauseHotkey?: string;
  stepAltBack?: string;
  stepAltForward?: string;
  skipToBeginning?: string;
  skipToEnd?: string;
  hopBackward?: string;
  hopForward?: string;
  fastTravelSize?: TimelineStepFunction;
  stepSize?: TimelineStepFunction;
  leftOffset?: number;
  loopRegion?: boolean;
  autoPlayNewSegments?: boolean;

  spectrogramFftSamples?: number;
  spectrogramWindowingFunction?: "hanning" | "hamming" | "blackman" | "sine";
  spectrogramColorScheme?: string;
  numberOfMelBands?: number;
  spectrogramMinDb?: number;
  spectrogramMaxDb?: number;
  spectrogramVisible?: boolean;
  spectrogramScale?: SpectrogramScale;
};

export type TimelineStepFunction = (
  length: number,
  position: number,
  regions: TimelineRegion[],
  direction: -1 | 1,
) => number;

export interface TimelineExtraControls<A extends string, D> {
  onAction?: <T extends Element>(e: MouseEvent<T>, action: A, data?: D) => void;
}

export type TimelineView<D extends FC<TimelineExtraControls<any, any>> = any> = {
  View: FC<TimelineViewProps>;
  Minimap?: FC<any>;
  Controls?: D;
  settings?: TimelineSettings;
};

export type TimelineControlsStepHandler = (e?: MouseEvent<HTMLButtonElement>, stepSize?: TimelineStepFunction) => void;

export interface TimelineControlsProps {
  length: number;
  position: number;
  frameRate: number;
  playing: boolean;
  collapsed: boolean;
  fullscreen: boolean;
  buffering?: boolean;
  volume?: number;
  speed?: number;
  zoom?: number;
  amp?: number;
  duration?: number;
  disableFrames?: boolean;
  extraControls?: JSX.Element | null;
  allowFullscreen?: boolean;
  allowViewCollapse?: boolean;
  controls?: TimelineProps["controls"];
  altHopSize?: TimelineProps["altHopSize"];
  customControls?: TimelineCustomControls[];
  mediaType: string;
  layerVisibility?: Map<string, boolean>;
  onRewind: (steps?: number) => void;
  onForward: (steps?: number) => void;
  onPositionChange: (position: number) => void;
  onToggleCollapsed: (collapsed: boolean) => void;
  onStepBackward: TimelineControlsStepHandler;
  onStepForward: TimelineControlsStepHandler;
  formatPosition?: TimelineProps["formatPosition"];
  onPlay?: TimelineProps["onPlay"];
  onPause?: TimelineProps["onPause"];
  onFullScreenToggle: TimelineProps["onFullscreenToggle"];
  onVolumeChange: TimelineProps["onVolumeChange"];
  onSpeedChange?: TimelineProps["onSpeedChange"];
  onZoom?: TimelineProps["onZoom"];
  onAmpChange?: (amp: number) => void;
  onSpectrogramFftSamplesChange?: (samples: number) => void;
  onNumberOfMelBandsChange?: (bands: number) => void;
  onSpectrogramWindowingFunctionChange?: (windowFunction: string) => void;
  onSpectrogramColorSchemeChange?: (colorScheme: string) => void;
  toggleVisibility?: (layerName: string, isVisible: boolean) => void;
  navigationBlocked?: boolean;
  navigationBlockedTooltip?: string;
}

export interface TimelineCustomControls {
  position: "left" | "right" | "leftCenter" | "rightCenter";
  component: JSX.Element | (() => JSX.Element);
}

export interface TimelineSideControlProps {
  position?: number;
  length?: number;
  volume?: number;
  onPositionChange?: TimelineControlsProps["onPositionChange"];
  onVolumeChange?: TimelineProps["onVolumeChange"];
}

export type TimelineControlsFormatterOptions = {
  time: number;
  position: number;
  fps: number;
  length: number;
};
