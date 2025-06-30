import { Events } from "./Common/Events";
import { Layer } from "./Composition/Layer";
import { Grid } from "./Renderer/Grid";
import { PlayHead, type PlayHeadController } from "./Renderer/PlayHead";
import { clamp } from "./Common/Utils";
import { BackgroundLabel } from "./Renderer/BackgroundLabel";
import { ClusterMarkers } from "./Renderer/ClusterMarkers";
import { ClusterVisualization } from "./Renderer/ClusterVisualization";
import { Regions } from "./Renderer/Regions";
import type { RegionOptions } from "./Renderer/Region";
import type { ActiveClusterSegment, Cluster as ClusterPoint } from "../../tags/object/GPSMap/clusters";

// Import new metric waveforms
import { MetricWaveform } from "./Renderer/MetricWaveform";
import type { Renderer, RenderContext } from "./Renderer/Renderer";
import { compose } from "./Renderer/CompositeRenderer";
import { LayerM } from "./Composition/LayerM";
import { InteractionManager } from "./Interaction/InteractionManager";
import { PanAndZoom } from "./Interaction/PanAndZoom";
import type { GPSData, GPSPoint } from "./types";
import { getCurrentTheme } from "@humansignal/ui";

const CLUSTER_MARKER_LAYER_HEIGHT = 40; // Height for the dedicated cluster marker strip

export interface GPSMetricsWaveformOptions {
  container: HTMLElement;
  height?: number; // Total height for all metrics
  metricContainerHeight?: number; // Height for each individual metric container (if metrics are stacked)
  initialZoom?: number;
  initialVisibleDuration?: number; // This remains optional
  minZoom?: number;
  maxZoom?: number;
  regionsOptions?: any; // Added for Regions, replace 'any' with actual RegionsOptions if defined
  showClusters?: boolean; // Controls cluster markers/bars on timeline
  showClusterVisualization?: boolean; // Controls cluster overlay behind grid
  showRegions?: boolean; // Controls regions and relationships visibility
  speedUnit?: "m/s" | "km/h";
  showSpeedWaveform?: boolean;
  showAltitudeWaveform?: boolean;
}

export interface GPSMetricsWaveformEvents {
  ready: () => void;
  error: (err: Error) => void;
  resize: (width: number, height: number) => void;
  zoom: (zoomLevel: number, visibleTimeRange: { start: number; end: number }) => void;
  pan: (visibleTimeRange: { start: number; end: number }) => void;
  timeUpdate: (currentTime: number) => void;
  seek: (time: number) => void;
  timeChange: (currentTime: number, visibleTimeRange: { start: number; end: number }) => void;

  // Region specific events, to be invoked by the Regions class instance
  beforeRegionsDraw: (regions: any) => void;
  afterRegionsDraw: (regions: any) => void;
  regionCreated: (region: any) => void;
  regionUpdated: (region: any) => void;
  regionRemoved: (region: any) => void;
  regionSelected: (region: any | null, event?: MouseEvent) => void;
  regionUpdatedEnd: (region: any) => void;
  draw: () => void;
}

export class GPSMetricsWaveform extends Events<GPSMetricsWaveformEvents> implements PlayHeadController {
  // Simplified internal options storage with concrete types after defaults are applied.
  private fullOptions: {
    container: HTMLElement;
    height: number;
    metricContainerHeight: number;
    initialZoom: number;
    initialVisibleDuration?: number; // Still optional here
    minZoom: number;
    maxZoom: number;
    regionsOptions?: any; // Added for Regions, replace 'any' with actual RegionsOptions if defined
    showClusters: boolean; // Controls cluster markers/bars on timeline
    showClusterVisualization: boolean; // Controls cluster overlay behind grid
    showRegions: boolean; // Controls regions and relationships visibility
    speedUnit: "m/s" | "km/h";
    showSpeedWaveform: boolean;
    showAltitudeWaveform: boolean;
  };

  public container: HTMLElement; // Made public for PlayHeadController, though PlayHead uses `width` directly now
  public width: number;
  public height: number; // Total height of the component
  private metricContainerHeight: number; // Height for each individual metric's drawing area

  public data: GPSPoint[] = [];
  private _currentTime = 0;
  private _zoom = 1;
  public visibleTimeStart = 0;
  private _cursorTime?: number = undefined;
  private _manualTimeOverride = false; // Flag to prevent external time updates during manual control
  private _manualOverrideTimeout?: number; // Timeout to auto-clear manual override

  private mainLayer: Layer;
  public layers: {
    background: Layer;
    grid: Layer;
    altitudeMetric: Layer;
    speedMetric: Layer;
    regions: Layer;
    selection: Layer;
    playhead: Layer;
    clusters: Layer;
    clusterVisualization: Layer;
  };

  private interactionLayer: Layer;
  private showClusters = true;

  public regions: Regions; // Made public
  private renderers: Array<{
    renderer: Renderer<any>;
    layer: Layer;
  }> = [];

  private composer: LayerM;
  private interactionManager: InteractionManager;
  private panAndZoom: PanAndZoom;

  private isResizing = false;

  private currentActiveSegmentForDrawing?: ActiveClusterSegment = undefined; // New private member to store active segment from outside
  private resizeObserver?: ResizeObserver;
  private clusterData: ClusterPoint[] = [];
  private themeObserver?: MutationObserver;

  // Performance optimization: cache theme colors and only update when theme changes
  private cachedThemeColors: {
    gridLineColor: string;
    gridBorderColor: string;
    gridLabelColor: string;
    altitudeColor: string;
    speedColor: string;
    playheadColor: string;
    labelColor: string;
    currentTheme: string;
  } | null = null;

  // Performance optimization: cache transformed speed data
  private cachedSpeedTransformedData: GPSPoint[] | null = null;
  private lastSpeedUnit: "m/s" | "km/h" | null = null;

  constructor(options: GPSMetricsWaveformOptions) {
    super();
    this.container = options.container;
    // Ensure the main container establishes a positioning context
    this.container.style.position = "relative";
    this.container.style.width = "100%"; // Make container responsive

    // Observe container size changes with debouncing for better performance
    this.resizeObserver = new ResizeObserver((entries) => {
      // Use requestAnimationFrame to ensure DOM has updated
      requestAnimationFrame(() => {
        this.handleResize();
      });
    });
    this.resizeObserver.observe(this.container);

    const defaultMetricHeight = options.metricContainerHeight ?? 100;
    this.width = Math.max(this.container.clientWidth, 1); // Ensure minimum width of 1px

    let calculatedInitialZoom = options.initialZoom ?? 1;
    if (options.initialVisibleDuration && this.width > 0 && options.initialVisibleDuration > 0) {
      calculatedInitialZoom = this.width / options.initialVisibleDuration;
    }

    // Populate fullOptions with defaults
    this.fullOptions = {
      container: options.container, // This is always provided
      height: options.height ?? defaultMetricHeight * 2 + CLUSTER_MARKER_LAYER_HEIGHT,
      metricContainerHeight: defaultMetricHeight,
      initialZoom: calculatedInitialZoom,
      initialVisibleDuration: options.initialVisibleDuration, // Stays optional
      minZoom: options.minZoom ?? 0.1,
      maxZoom: options.maxZoom ?? 1000,
      regionsOptions: options.regionsOptions,
      showClusters: options.showClusters ?? true,
      showClusterVisualization: options.showClusterVisualization ?? false,
      showRegions: options.showRegions ?? true,
      speedUnit: options.speedUnit ?? "m/s",
      showSpeedWaveform: options.showSpeedWaveform ?? true,
      showAltitudeWaveform: options.showAltitudeWaveform ?? true,
    };

    this.showClusters = this.fullOptions.showClusters;
    this._zoom = clamp(this.fullOptions.initialZoom, this.fullOptions.minZoom, this.fullOptions.maxZoom);

    this.metricContainerHeight = this.fullOptions.metricContainerHeight;
    this.height = this._calculateHeight();
    this.container.style.height = `${this.height}px`;

    // Create the main visible layer (covers the entire component area)
    this.mainLayer = new Layer({
      container: this.container,
      width: this.width,
      height: this.height,
      pointerEvents: "none", // Main layer is just for compositing, no events
    });

    // The new interaction layer sits on top and handles all pointer events.
    this.interactionLayer = new Layer({
      container: this.container,
      width: this.width,
      height: this.height,
      pointerEvents: "auto",
    });

    // Initialize InteractionManager with the dedicated interaction layer
    this.interactionManager = new InteractionManager(this.interactionLayer.element, () => this.draw());

    // Create offscreen layers
    const metricAreaHeight = this.metricContainerHeight * 2;
    this.layers = {
      background: new Layer({ width: this.width, height: this.height, offscreen: true }), // Background for the whole area
      clusters: new Layer({ width: this.width, height: CLUSTER_MARKER_LAYER_HEIGHT, offscreen: true }), // Offscreen for clusters
      grid: new Layer({ width: this.width, height: metricAreaHeight, offscreen: true }), // Grid for metric area
      altitudeMetric: new Layer({ width: this.width, height: this.metricContainerHeight, offscreen: true }),
      speedMetric: new Layer({ width: this.width, height: this.metricContainerHeight, offscreen: true }),
      regions: new Layer({ width: this.width, height: metricAreaHeight, offscreen: true }),
      selection: new Layer({ width: this.width, height: metricAreaHeight, offscreen: true }),
      playhead: new Layer({ width: this.width, height: this.height, offscreen: true }), // Full height
      clusterVisualization: new Layer({ width: this.width, height: metricAreaHeight, offscreen: true }), // Cluster visualization layer
    };

    // Attach events before initializing Regions
    this.attachEvents();

    // Initialize Regions here, after layers are created
    this.regions = new Regions(this.fullOptions.regionsOptions, this, this.interactionManager);

    // Re-enable speed waveform and grid initialization
    this.layers.regions.setSize(this.width, metricAreaHeight);
    this.layers.selection.setSize(this.width, metricAreaHeight);
    this.layers.playhead.setSize(this.width, this.height); // Resize playhead to full height
    this.layers.clusters.setSize(this.width, CLUSTER_MARKER_LAYER_HEIGHT); // Resize new clusters layer
    this.layers.clusterVisualization.setSize(this.width, metricAreaHeight); // Resize cluster visualization layer

    // Ensure speed layer is also resized and positioned correctly
    this.layers.speedMetric.setSize(this.width, this.metricContainerHeight);

    this.composer = this.createComposer();

    // Initialize renderers
    const playheadRenderer = new PlayHead(this, this.layers.playhead, {});

    this.panAndZoom = new PanAndZoom({
      onPan: (deltaTimeSeconds: number) => this.pan(deltaTimeSeconds),
      onZoom: (newZoom: number, anchorTime: number) => this.setZoom(newZoom, anchorTime),
      onSeek: (time: number) => this.seek(time),
      getCurrentTime: () => this.currentTime,
      getCurrentZoom: () => this.zoom,
      pxToTime: (px: number) => this.pxToTime(px),
    });

    const clusterMarkers = new ClusterMarkers(this.layers.clusters, {});
    const clusterVisualization = new ClusterVisualization(this.layers.clusterVisualization, {});

    // Calculate theme-aware colors for initial Grid creation
    const computedStyle = getComputedStyle(this.container);
    const currentTheme = getCurrentTheme();
    const isDarkMode = currentTheme === "Dark";

    const gridLineColor =
      computedStyle.getPropertyValue("--grid-line-color").trim() || (isDarkMode ? "#707070" : "#D5D5D5");
    const gridBorderColor =
      computedStyle.getPropertyValue("--grid-border-color").trim() || (isDarkMode ? "#707070" : "#C4C4C4");
    const gridLabelColor =
      computedStyle.getPropertyValue("--grid-label-color").trim() || (isDarkMode ? "#FFFFFF" : "#666666");

    this.renderers = [
      {
        renderer: new Grid(this.layers.grid, {
          axisMode: "x-only",
          approxXTicks: 20,
          lineColor: gridLineColor,
          borderColor: gridBorderColor,
          labelColor: gridLabelColor,

          onHover: (x: number, y: number) => {
            // Clear cursor if PlayHead is being interacted with or hovered
            if (this.interactionManager.hasActive() || this.isPlayHeadHovered()) {
              if (this._cursorTime !== undefined) {
                this._cursorTime = undefined;
                this.draw();
              }
              return;
            }

            const time = this.pxToTime(x);
            this._cursorTime = time;
            this.draw();
          },
          onHoverExit: () => {
            this._cursorTime = undefined;
            this.draw();
          },
          onClick: (x: number, y: number) => {
            // Seek to the clicked time position
            const time = this.pxToTime(x);
            this.seek(time);
          },
        }),
        layer: this.layers.grid,
      },
      {
        renderer: clusterVisualization,
        layer: this.layers.clusterVisualization,
      },
      {
        renderer: compose(
          clusterMarkers,
          new BackgroundLabel(this.layers.clusters, "Clusters", {
            position: "left",
            verticalPosition: "center",
            font: "bold 32px Arial",
            opacity: 0.4,
          }),
        ),
        layer: this.layers.clusters,
      },
      {
        renderer: compose(
          new Grid(this.layers.altitudeMetric, {
            axisMode: "y-only",
            yLabelSuffix: "m",
            approxYTicks: 10,
            approxXTicks: 0,
            borderWidth: 1,
            metric: "altitude",
            lineColor: gridLineColor,
            borderColor: gridBorderColor,
            labelColor: gridLabelColor,
          }),
          new BackgroundLabel(this.layers.altitudeMetric, "Altitude", {
            position: "left",
            verticalPosition: "top",
            font: "bold 32px Arial",
            opacity: 0.4,
          }),
          new MetricWaveform(this.layers.altitudeMetric, {
            metric: "altitude",
            lineWidth: 2,
            showDotsThreshold: 5,
            dotRadius: 3,
          }),
        ),
        layer: this.layers.altitudeMetric,
      },
      {
        renderer: compose(
          new Grid(this.layers.speedMetric, {
            axisMode: "y-only",
            yLabelSuffix: this.fullOptions.speedUnit,
            approxYTicks: 10,
            approxXTicks: 0,
            borderWidth: 1,
            metric: "speed",
            lineColor: gridLineColor,
            borderColor: gridBorderColor,
            labelColor: gridLabelColor,
          }),
          new BackgroundLabel(this.layers.speedMetric, "Speed", {
            position: "left",
            verticalPosition: "top",
            font: "bold 32px Arial",
            opacity: 0.4,
          }),
          new MetricWaveform(this.layers.speedMetric, {
            metric: "speed",
            lineWidth: 2,
            showDotsThreshold: 5,
            dotRadius: 3,
            speedUnit: this.fullOptions.speedUnit,
          }),
        ),
        layer: this.layers.speedMetric,
      },
      {
        renderer: playheadRenderer,
        layer: this.layers.playhead,
      },
      {
        renderer: this.regions,
        layer: this.layers.regions,
      },
    ];

    this.interactionManager.add(playheadRenderer);
    this.interactionManager.add(this.panAndZoom);
    this.interactionManager.add(this.regions);
    this.interactionManager.add(clusterMarkers);
    this.interactionManager.add(clusterVisualization);

    // Add the Grid renderer to enable hover interactions
    const gridRenderer = this.renderers[0].renderer as Grid;
    this.interactionManager.add(gridRenderer);

    // Delay initial draw to ensure container is fully sized
    setTimeout(() => {
      if (this.container.clientWidth > 0) {
        this.draw();
      } else {
        // Wait a bit longer if container still isn't sized
        setTimeout(() => this.draw(), 200);
      }
    }, 100);
    this.invoke("ready", []);
  }

  private attachEvents() {
    // All pointer events are now handled by InteractionManager.
    // The wheel event is handled by the PanAndZoom interactive.
    window.addEventListener("resize", this.handleResize);

    // Listen for theme changes
    this.themeObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "attributes" && mutation.attributeName === "data-color-scheme") {
          // Theme changed, invalidate cached colors and redraw
          this.cachedThemeColors = null;
          this.draw();
        }
      });
    });

    this.themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-color-scheme"],
    });
  }

  private detachEvents() {
    // All pointer events are now handled by InteractionManager.
    // The wheel event is handled by the PanAndZoom interactive.
    window.removeEventListener("resize", this.handleResize);
    // PanAndZoom no longer has a destroy method since it doesn't manage its own event listeners

    // Clean up theme observer
    this.themeObserver?.disconnect();
  }

  public setData(gpsData: GPSPoint[]) {
    const wasEmpty = this.data.length === 0;

    this.data = gpsData.sort((a, b) => a.timestamp - b.timestamp);

    // Invalidate cached speed-transformed data when data changes
    this.cachedSpeedTransformedData = null;
    this.lastSpeedUnit = null;

    if (this.data.length > 0) {
      if (wasEmpty) {
        // Initial data load
        this._currentTime = this.data[0].timestamp;
        // visibleTimeStart will be correctly set by setZoom based on the anchor.
        // this.visibleTimeStart = this.data[0].timestamp; // Not strictly needed here if anchorTime is passed to setZoom

        const totalTimeSpan = this.data[this.data.length - 1].timestamp - this.data[0].timestamp;
        const minDurationForZoomCalc = 0.000001; // A very small duration to avoid issues with zero span
        let targetZoom = this.fullOptions.initialZoom; // Default if data has no span or width is 0

        if (totalTimeSpan > minDurationForZoomCalc && this.width > 0) {
          targetZoom = this.width / totalTimeSpan;
        }

        // setZoom will clamp targetZoom and then use its internal logic
        // to fit the data if newVisibleDuration >= totalTimeSpan.
        // The anchorTime is this._currentTime (start of data).
        this.setZoom(targetZoom, this._currentTime);
      } else {
        // Subsequent data updates:
        const dataStart = this.data[0].timestamp;
        const dataEnd = this.data[this.data.length - 1].timestamp;

        // Ensure currentTime is within new data bounds
        this._currentTime = clamp(this._currentTime, dataStart, dataEnd);

        // Re-apply current zoom, anchored at the (now potentially clamped) currentTime.
        // setZoom will handle clamping of visibleTimeStart if it's now out of bounds.
        this.setZoom(this._zoom, this._currentTime);
      }
    } else {
      // Data is empty
      this.visibleTimeStart = 0;
      this._currentTime = 0;
      this._zoom = this.fullOptions.initialZoom; // Reset to initial zoom
      this.draw(); // setZoom is not called in this branch, so draw explicitly
    }
    // If setZoom is called (data is not empty), it calls draw().
    // So, no need for an additional draw() here for the non-empty case.
    this.invoke("timeUpdate", [this._currentTime]);
  }

  public setTime(time: number, centerView = false) {
    if (!this.data || this.data.length === 0) return;

    // If manual override is active, ignore external time updates
    if (this._manualTimeOverride) return;

    const clampedTime = clamp(time, this.data[0].timestamp, this.data[this.data.length - 1].timestamp);

    if (this._currentTime !== clampedTime) {
      this._currentTime = clampedTime;

      if (centerView) {
        this.centerOnTime(this._currentTime);
      }

      this.draw();
      this.invoke("timeUpdate", [this._currentTime]);
    }
  }

  public seek(time: number) {
    this.setTime(time, true);
    this.invoke("seek", [this.currentTime]);
  }

  public setTimeWithSync(time: number) {
    // Used during playhead dragging - update time without centering view
    // Enable manual override to prevent external time updates from interfering
    this._manualTimeOverride = true;

    // Set a timeout to auto-clear manual override (safety net)
    if (this._manualOverrideTimeout) {
      clearTimeout(this._manualOverrideTimeout);
    }
    this._manualOverrideTimeout = window.setTimeout(() => {
      this._manualTimeOverride = false;
    }, 1000); // Clear after 1 second of inactivity

    if (!this.data || this.data.length === 0) return;
    const clampedTime = clamp(time, this.data[0].timestamp, this.data[this.data.length - 1].timestamp);

    if (this._currentTime !== clampedTime) {
      this._currentTime = clampedTime;
      this.draw();
      // Emit timeUpdate for GPS map synchronization
      this.invoke("timeUpdate", [this._currentTime]);
    }
  }

  public clearManualTimeOverride() {
    // Clear manual override to resume normal time synchronization
    this._manualTimeOverride = false;
    if (this._manualOverrideTimeout) {
      clearTimeout(this._manualOverrideTimeout);
      this._manualOverrideTimeout = undefined;
    }
  }

  public get currentTime(): number {
    return this._currentTime;
  }

  public get zoom(): number {
    return this._zoom;
  }

  public setZoom(level: number, anchorTime?: number) {
    const newZoom = clamp(level, this.fullOptions.minZoom, this.fullOptions.maxZoom);

    if (this._zoom === newZoom) return;

    const anchor = anchorTime ?? this.pxToTime(this.width / 2);
    const timeAtAnchor = anchor;
    const timeBeforeZoom = this.pxToTime(this.width / 2);

    this._zoom = newZoom;

    // Recalculate visibleTimeStart to keep the anchor time at the same pixel position
    const newVisibleTimeStart = timeAtAnchor - this.width / 2 / this._zoom;

    const dataStartTime = this.data.length > 0 ? this.data[0].timestamp : 0;
    const dataEndTime = this.data.length > 0 ? this.data[this.data.length - 1].timestamp : 0;
    const totalDuration = dataEndTime - dataStartTime;

    const newVisibleDuration = this.width / this._zoom;

    if (newVisibleDuration >= totalDuration) {
      // If the view is wider than the data, show all data
      this.visibleTimeStart = dataStartTime;
      this._zoom = this.width / totalDuration; // Adjust zoom to fit
    } else {
      // Clamp visibleTimeStart to not go out of bounds
      this.visibleTimeStart = clamp(newVisibleTimeStart, dataStartTime, dataEndTime - newVisibleDuration);
    }

    this.draw();
    this.invoke("zoom", [this._zoom, this.getVisibleTimeRange()]);
  }

  public pan(deltaTimeSeconds: number) {
    if (!this.data || this.data.length === 0) return;

    const dataStartTime = this.data[0].timestamp;
    const dataEndTime = this.data[this.data.length - 1].timestamp;
    const visibleDuration = this.visibleTimeDuration;

    const newVisibleTimeStart = this.visibleTimeStart + deltaTimeSeconds;

    // Clamp the new start time
    this.visibleTimeStart = clamp(newVisibleTimeStart, dataStartTime, dataEndTime - visibleDuration);

    this.draw();
    this.invoke("pan", [this.getVisibleTimeRange()]);
  }

  public getVisibleTimeRange(): { start: number; end: number } {
    return { start: this.visibleTimeStart, end: this.visibleTimeStart + this.visibleTimeDuration };
  }

  private get visibleTimeDuration(): number {
    return this.width / this._zoom;
  }

  public centerOnTime(time: number) {
    if (!this.data || this.data.length === 0) return;

    const dataStartTime = this.data[0].timestamp;
    const dataEndTime = this.data[this.data.length - 1].timestamp;
    const visibleDuration = this.visibleTimeDuration;

    // Calculate the ideal start time to center the given time
    let newVisibleTimeStart = time - visibleDuration / 2;

    // Clamp the start time to ensure we don't show time outside the data's range
    newVisibleTimeStart = Math.max(dataStartTime, newVisibleTimeStart);
    newVisibleTimeStart = Math.min(dataEndTime - visibleDuration, newVisibleTimeStart);

    // Final check for edge case where visible duration is larger than total duration
    if (newVisibleTimeStart < dataStartTime) {
      newVisibleTimeStart = dataStartTime;
    }

    if (this.visibleTimeStart !== newVisibleTimeStart) {
      this.visibleTimeStart = newVisibleTimeStart;
      this.draw(); // Redraw to reflect the new visible range
      this.invoke("pan", [this.getVisibleTimeRange()]);
    }
  }

  public timeToPx(time: number): number {
    return (time - this.visibleTimeStart) * this._zoom;
  }

  public pxToTime(px: number): number {
    return this.visibleTimeStart + px / this._zoom;
  }

  public getVisibleMetricRange(
    metricKey: keyof GPSPoint,
    timeRange: { start: number; end: number },
  ): { min: number; max: number } {
    if (!this.data.length) return { min: 0, max: 1 };

    let firstVisibleIndex = this.data.findIndex((p) => p.timestamp >= timeRange.start);

    // If no points are after the start time, we are past all data; use the last point.
    if (firstVisibleIndex === -1) {
      firstVisibleIndex = this.data.length > 0 ? this.data.length - 1 : 0;
    }

    // Start checking from the point just before the first visible one.
    const startIndex = Math.max(0, firstVisibleIndex - 1);

    let lastVisibleIndex = -1;
    for (let i = startIndex; i < this.data.length; i++) {
      if (this.data[i].timestamp <= timeRange.end) {
        lastVisibleIndex = i;
      } else {
        // First point after visible range. Include it for interpolation and stop.
        lastVisibleIndex = i;
        break;
      }
    }

    // If the loop finishes, all remaining points were visible.
    if (lastVisibleIndex === -1) {
      lastVisibleIndex = this.data.length - 1;
    }

    let minVal = Number.POSITIVE_INFINITY;
    let maxVal = Number.NEGATIVE_INFINITY;
    let foundDataInRange = false;

    // Now find min/max in the expanded range of points.
    for (let i = startIndex; i <= lastVisibleIndex; i++) {
      const point = this.data[i];
      if (!point) continue;

      const value = point[metricKey] as number;
      let displayValue = value;
      if (metricKey === "speed" && this.fullOptions.speedUnit === "km/h") {
        displayValue = value * 3.6;
      }
      if (typeof displayValue === "number" && !isNaN(displayValue)) {
        minVal = Math.min(minVal, displayValue);
        maxVal = Math.max(maxVal, displayValue);
        foundDataInRange = true;
      }
    }

    if (!foundDataInRange) return { min: 0, max: 1 };

    // If all points in range have the exact same valid numeric value, provide a default spread.
    if (minVal === maxVal) {
      return { min: minVal - 0.5, max: maxVal + 0.5 };
    }

    // Add 10% padding to the top and bottom of the Y-axis
    const PADDING_FACTOR = 0.1;
    const currentRange = maxVal - minVal;
    const padding = currentRange * PADDING_FACTOR;

    minVal -= padding;
    maxVal += padding;

    return { min: minVal, max: maxVal };
  }

  private resizeLayers() {
    // Get the actual container dimensions, accounting for any CSS transitions
    const containerRect = this.container.getBoundingClientRect();
    const newWidth = Math.max(Math.floor(containerRect.width), 1); // Use getBoundingClientRect for accurate dimensions
    const newHeight = Math.max(this._calculateHeight(), 1);

    // Only proceed if dimensions actually changed
    const dimensionsChanged = this.width !== newWidth || this.height !== newHeight;

    // Update internal dimensions
    this.width = newWidth;
    this.height = newHeight;
    this.container.style.height = `${this.height}px`;

    // Resize all layers in one place
    const metricAreaHeight = this.getMetricsAreaHeight();
    const sizes: Array<[Layer, number, number]> = [
      [this.mainLayer, this.width, this.height],
      [this.layers.background, this.width, this.height],
      [this.layers.clusters, this.width, CLUSTER_MARKER_LAYER_HEIGHT],
      [this.layers.grid, this.width, metricAreaHeight], // Correctly size the grid to the metrics area
      [this.layers.altitudeMetric, this.width, this.metricContainerHeight],
      [this.layers.speedMetric, this.width, this.metricContainerHeight],
      [this.layers.regions, this.width, metricAreaHeight],
      [this.layers.selection, this.width, metricAreaHeight],
      [this.layers.playhead, this.width, this.height],
      [this.layers.clusterVisualization, this.width, metricAreaHeight],
    ];

    for (const [layer, w, h] of sizes) {
      layer.setSize(w, h);
      layer.clear();
    }

    // Also resize the interaction layer
    this.interactionLayer.setSize(this.width, this.height);

    return dimensionsChanged;
  }

  private handleResize = () => {
    if (this.isResizing) return;

    this.isResizing = true;
    const oldWidth = this.width;
    const oldHeight = this.height;

    // Resize layers and check if dimensions actually changed
    const dimensionsChanged = this.resizeLayers();

    // Only proceed with expensive operations if dimensions actually changed
    if (dimensionsChanged) {
      console.log(`GPS Waveform resize: ${oldWidth}x${oldHeight} → ${this.width}x${this.height}`);

      if (oldWidth > 0 && this.visibleTimeDuration > 0 && oldWidth !== this.width) {
        this._zoom = this.width / this.visibleTimeDuration;
      }

      // Force clear all layers to ensure clean state after resize
      this.forceRedraw();

      // Notify all renderers of resize
      for (const { renderer } of this.renderers) {
        renderer.onResize?.();
      }

      // Force a complete redraw after resize
      this.draw();

      // Notify listeners
      this.invoke("resize", [this.width, this.height]);
    }

    this.isResizing = false;
  };

  private forceRedraw() {
    // Force clear all layers to ensure clean state
    this.layers.background.clear();
    this.layers.clusters.clear();
    this.layers.grid.clear();
    this.layers.altitudeMetric.clear();
    this.layers.speedMetric.clear();
    this.layers.regions.clear();
    this.layers.selection.clear();
    this.layers.playhead.clear();
    this.layers.clusterVisualization.clear();
    this.mainLayer.clear();

    // Invalidate cached data to force recalculation
    this.cachedThemeColors = null;
    this.cachedSpeedTransformedData = null;
  }

  public draw() {
    if (this.width === 0 || this.height === 0) return;

    // Also check that all layers have valid dimensions
    const layersToCheck = [this.mainLayer, ...Object.values(this.layers)];

    for (const layer of layersToCheck) {
      if (layer && (layer.width === 0 || layer.height === 0)) {
        console.warn("GPSMetricsWaveform: Skipping draw due to zero-dimension layer", {
          width: layer.width,
          height: layer.height,
        });
        return;
      }
    }

    // Get theme colors efficiently with caching
    const colors = this.getThemeColors();

    for (const { renderer } of this.renderers) {
      const composed = (renderer as any).renderers;

      if (composed) {
        for (const r of composed) {
          if (r instanceof Grid) {
            r.updateConfig({
              lineColor: colors.gridLineColor,
              borderColor: colors.gridBorderColor,
              labelColor: colors.gridLabelColor,
            });
          }
          if (r instanceof MetricWaveform) {
            if (r.config.metric === "altitude") {
              r.updateConfig({ lineColor: colors.altitudeColor });
            } else if (r.config.metric === "speed") {
              r.updateConfig({ lineColor: colors.speedColor });
            }
          }
          if (r instanceof BackgroundLabel) {
            r.updateConfig({ color: colors.labelColor });
          }
        }
      } else {
        // Not composed
        if (renderer instanceof Grid) {
          renderer.updateConfig({
            lineColor: colors.gridLineColor,
            borderColor: colors.gridBorderColor,
            labelColor: colors.gridLabelColor,
          });
        }
        if (renderer instanceof PlayHead) {
          renderer.updateConfig({ color: colors.playheadColor });
        }
      }
    }

    // Clear all offscreen layers first
    this.layers.background.clear();
    this.layers.clusters.clear();
    this.layers.grid.clear();
    this.layers.altitudeMetric.clear();
    this.layers.speedMetric.clear();
    this.layers.regions.clear();
    this.layers.clusterVisualization.clear();
    this.layers.selection.clear();
    this.layers.playhead.clear();

    // Calculate visible time range for metric range calculations
    const timeStart = this.visibleTimeStart;
    const timeEnd = timeStart + this.width / this._zoom;
    const timeRange = { start: timeStart, end: timeEnd };

    // Calculate metric ranges for all metrics that have renderers to prevent errors
    const metricRanges: { [K in keyof GPSPoint]?: { min: number; max: number } } = {};
    if (this.data.length > 0) {
      // Always calculate ranges for all metrics that have renderers, regardless of visibility
      // This prevents errors when renderers exist but metric ranges are missing
      const requiredMetrics: (keyof GPSPoint)[] = ["altitude", "speed"];
      // Always include latitude/longitude for potential future use
      requiredMetrics.push("latitude", "longitude");

      for (const metricKey of requiredMetrics) {
        metricRanges[metricKey] = this.getVisibleMetricRange(metricKey, timeRange);
      }
    }

    // Create render context once
    const renderContext: RenderContext = {
      scrollLeftPx: this.visibleTimeStart * this._zoom,
      width: this.width,
      zoom: this._zoom,
      notifyRenderComplete: () => this.composer.renderTo(this.mainLayer),
      metricRanges,
    };

    // Use cached speed-transformed data for better performance
    const renderData: GPSData = {
      points: this.getSpeedTransformedData(),
      clusters: this.clusterData,
      activeClusterSegment: this.currentActiveSegmentForDrawing,
      currentTime: this._currentTime,
      cursorTime: this._cursorTime,
    };

    // Draw all renderers
    for (const { renderer } of this.renderers) {
      renderer.draw(renderContext, renderData);
    }

    this.mainLayer.clear();
    this.composer.renderTo(this.mainLayer);
  }

  private createComposer(): LayerM {
    const metricStackItems = [];

    if (this.fullOptions.showAltitudeWaveform) {
      metricStackItems.push(LayerM.lift(this.layers.altitudeMetric));
    }
    if (this.fullOptions.showSpeedWaveform) {
      metricStackItems.push(LayerM.lift(this.layers.speedMetric));
    }

    const vStackItems = [];

    // Add clusters layer if visible
    if (this.fullOptions.showClusters) {
      vStackItems.push(LayerM.lift(this.layers.clusters));
    }

    // Add metric layers if any are visible
    if (metricStackItems.length > 0) {
      const metricStack = LayerM.vStack(metricStackItems);
      const metricsWithGrid = LayerM.overlay([
        // Cluster visualization goes behind everything else
        ...(this.fullOptions.showClusterVisualization ? [LayerM.lift(this.layers.clusterVisualization)] : []),
        LayerM.lift(this.layers.grid),
        LayerM.lift(this.layers.selection),
        metricStack,
        ...(this.fullOptions.showRegions ? [LayerM.lift(this.layers.regions)] : []),
      ]);
      vStackItems.push(metricsWithGrid);
    } else {
      // If no metrics are visible, still show grid, regions, selection, and cluster visualization
      const emptyMetricsArea = LayerM.overlay([
        // Cluster visualization goes behind everything else
        ...(this.fullOptions.showClusterVisualization ? [LayerM.lift(this.layers.clusterVisualization)] : []),
        LayerM.lift(this.layers.grid),
        LayerM.lift(this.layers.selection),
        ...(this.fullOptions.showRegions ? [LayerM.lift(this.layers.regions)] : []),
      ]);
      vStackItems.push(emptyMetricsArea);
    }

    // If there are any vertical items, stack them. Otherwise, we have an empty layout.
    const mainLayout = vStackItems.length > 0 ? LayerM.vStack(vStackItems) : null;

    const finalOverlayItems = [
      LayerM.lift(this.layers.background),
      LayerM.lift(this.layers.playhead), // Add playhead at the top level but behind everything
    ];

    if (mainLayout) {
      finalOverlayItems.push(mainLayout);
    }

    return LayerM.overlay(finalOverlayItems);
  }

  public destroy() {
    this.detachEvents();
    this.mainLayer?.destroy(); // Destroy the main visible layer
    Object.values(this.layers).forEach((layer) => layer?.destroy());
    this.resizeObserver?.disconnect();

    // Destroy all renderers
    for (const { renderer } of this.renderers) {
      renderer.destroy();
    }

    super.destroy();
  }

  // Method to accept cluster data
  public setClusterData(clusters: ClusterPoint[]) {
    this.clusterData = clusters;
    // When cluster data changes, the active segment might need re-evaluation by the model,
    // but this component doesn't need to do anything special other than redraw.
    this.draw();
  }

  // New public method to update the active segment from outside (e.g., from React component via ref)
  public updateActiveSegment(segment?: ActiveClusterSegment) {
    this.currentActiveSegmentForDrawing = segment;
    this.draw(); // Redraw to reflect the new active segment
  }

  // Add this public method to the GPSMetricsWaveform class
  public clearRegions(selectedOnly = false) {
    this.regions.clearSegments(selectedOnly);
  }

  // Add these methods before the destroy() method
  public addRegions(regions: RegionOptions[], render = true) {
    this.regions.addRegions(regions, render);
  }

  public addRegion(options: RegionOptions, render = true) {
    return this.regions.addRegion(options, render);
  }

  public updateRegion(options: RegionOptions, render = true) {
    return this.regions.updateRegion(options, render);
  }

  public updateLabelVisibility(visible: boolean) {
    this.regions.updateLabelVisibility(visible);
  }

  public removeRegion(regionId: string, render = true) {
    this.regions.removeRegion(regionId, render);
  }

  public getCanvasRelativeCoords(e: PointerEvent) {
    const rect = this.container.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  // Public method to force a resize check - useful when external layout changes occur
  public checkResize() {
    // Use a small delay to ensure CSS transitions have completed
    setTimeout(() => {
      this.handleResize();
    }, 50);
  }

  private getMetricsAreaHeight(): number {
    let numMetrics = 0;

    if (this.fullOptions.showAltitudeWaveform) numMetrics++;
    if (this.fullOptions.showSpeedWaveform) numMetrics++;

    return this.metricContainerHeight * numMetrics;
  }

  private _calculateHeight(): number {
    let numMetrics = 0;

    if (this.fullOptions.showAltitudeWaveform) numMetrics++;
    if (this.fullOptions.showSpeedWaveform) numMetrics++;

    const metricsHeight = this.metricContainerHeight * numMetrics;
    const clustersHeight = this.fullOptions.showClusters ? CLUSTER_MARKER_LAYER_HEIGHT : 0;

    return metricsHeight + clustersHeight;
  }

  public updateShowClusters(show: boolean) {
    if (this.fullOptions.showClusters === show) return;

    this.fullOptions.showClusters = show;
    this.composer = this.createComposer();
    this.handleResize();
  }

  public updateShowClusterVisualization(show: boolean) {
    if (this.fullOptions.showClusterVisualization === show) return;

    this.fullOptions.showClusterVisualization = show;
    this.composer = this.createComposer();
    this.draw();
  }

  public updateShowRegions(show: boolean) {
    if (this.fullOptions.showRegions === show) return;

    this.fullOptions.showRegions = show;
    this.composer = this.createComposer();
    this.draw();
  }

  public updateShowSpeedWaveform(show: boolean) {
    if (this.fullOptions.showSpeedWaveform === show) return;

    this.fullOptions.showSpeedWaveform = show;
    this.composer = this.createComposer();
    this.handleResize();
  }

  public updateShowAltitudeWaveform(show: boolean) {
    if (this.fullOptions.showAltitudeWaveform === show) return;

    this.fullOptions.showAltitudeWaveform = show;
    this.composer = this.createComposer();
    this.handleResize();
  }

  public updateSpeedUnit(unit: "m/s" | "km/h") {
    if (this.fullOptions.speedUnit === unit) return;

    this.fullOptions.speedUnit = unit;

    // Invalidate cached speed-transformed data when unit changes
    this.cachedSpeedTransformedData = null;
    this.lastSpeedUnit = null;

    const speedGridRenderer = this.renderers.find(({ renderer }) => {
      // This is a bit brittle. It assumes the grid is the first composed renderer.
      const composed = (renderer as any).renderers;
      return composed && composed[0] instanceof Grid && composed[0].config.metric === "speed";
    })?.renderer as any;
    if (speedGridRenderer) {
      speedGridRenderer.renderers[0].updateConfig({ yLabelSuffix: unit });
      // Also update the MetricWaveform renderer (second in the composition)
      if (speedGridRenderer.renderers[2]) {
        speedGridRenderer.renderers[2].updateConfig({ speedUnit: unit });
      }
    }

    this.draw();
  }

  private isPlayHeadHovered(): boolean {
    // Find the PlayHead renderer and check if it's hovered
    const playHeadRenderer = this.renderers.find(({ renderer }) => renderer instanceof PlayHead)?.renderer as PlayHead;

    return playHeadRenderer ? playHeadRenderer.isHovering : false;
  }

  // Performance optimization: get theme colors efficiently with caching
  private getThemeColors() {
    const currentTheme = getCurrentTheme();

    // Return cached colors if theme hasn't changed
    if (this.cachedThemeColors && this.cachedThemeColors.currentTheme === currentTheme) {
      return this.cachedThemeColors;
    }

    // Only compute styles when theme actually changes
    const computedStyle = getComputedStyle(this.container);
    const isDarkMode = currentTheme === "Dark";

    this.cachedThemeColors = {
      gridLineColor: computedStyle.getPropertyValue("--grid-line-color").trim() || (isDarkMode ? "#707070" : "#D5D5D5"),
      gridBorderColor:
        computedStyle.getPropertyValue("--grid-border-color").trim() || (isDarkMode ? "#707070" : "#C4C4C4"),
      gridLabelColor:
        computedStyle.getPropertyValue("--grid-label-color").trim() || (isDarkMode ? "#FFFFFF" : "#666666"),
      altitudeColor: computedStyle.getPropertyValue("--metric-altitude-color").trim() || "red",
      speedColor: computedStyle.getPropertyValue("--metric-speed-color").trim() || "orange",
      playheadColor: computedStyle.getPropertyValue("--playhead-color").trim() || "gray",
      labelColor:
        computedStyle.getPropertyValue("--label-text-color").trim() ||
        (isDarkMode ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.35)"),
      currentTheme,
    };

    return this.cachedThemeColors;
  }

  // Performance optimization: get speed-transformed data efficiently with caching
  private getSpeedTransformedData(): GPSPoint[] {
    if (this.fullOptions.speedUnit === "m/s") {
      return this.data; // No transformation needed
    }

    // Return cached data if speed unit hasn't changed
    if (this.cachedSpeedTransformedData && this.lastSpeedUnit === this.fullOptions.speedUnit) {
      return this.cachedSpeedTransformedData;
    }

    // Only transform when speed unit actually changes
    this.cachedSpeedTransformedData = this.data.map((p) => ({ ...p, speed: p.speed * 3.6 }));
    this.lastSpeedUnit = this.fullOptions.speedUnit;

    return this.cachedSpeedTransformedData;
  }
}
