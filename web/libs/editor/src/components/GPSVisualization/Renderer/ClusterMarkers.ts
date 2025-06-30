import type { Layer } from "../Composition/Layer";
import type { GPSData } from "../types";
import type { Renderer, RenderContext } from "./Renderer";
import type { Cluster as ClusterPoint } from "../../../tags/object/GPSMap/clusters";
import type { Interactive } from "../Interaction/Interactive";
import { getCurrentTheme } from "@humansignal/ui";

export interface ClusterMarkersOptions {
  lineColor: string;
  lineWidth: number;
  activeSegmentColor: string;
  activeSegmentWidth: number;
  barHeight: number;
  barColor: string;
  barBorderColor: string;
  highlightedBarColor: string;
  highlightedBarBorderColor: string;
  highlightedLineColor: string;
  highlightedLineWidth: number;
  normalLineWidth: number;
  durationTextColor: string;
  durationTextFont: string;
  minBarWidthForText: number;
  distanceTextColor: string;
  distanceTextFont: string;
  distanceLabelBgColor: string;
  distanceLabelPadding: number;
}

// Helper function to get theme-aware cluster marker colors
const getThemeAwareClusterMarkerColors = () => {
  const currentTheme = getCurrentTheme();
  const isDarkMode = currentTheme?.toLowerCase() === "dark";

  if (isDarkMode) {
    return {
      lineColor: "rgba(100, 100, 100, 0.6)",
      barColor: "rgba(52, 152, 219, 0.8)",
      barBorderColor: "rgba(41, 128, 185, 1)",
      highlightedBarColor: "rgba(255, 165, 0, 1)",
      highlightedBarBorderColor: "rgba(204, 132, 0, 1)",
      highlightedLineColor: "rgba(255, 165, 0, 0.9)",
      durationTextColor: "rgba(255, 255, 255, 0.9)",
      distanceTextColor: "rgba(220, 220, 220, 1)",
      distanceLabelBgColor: "rgba(40, 40, 40, 0.85)",
    };
  } else {
    return {
      lineColor: "rgba(120, 120, 120, 0.4)",
      barColor: "rgba(41, 128, 185, 0.7)", // Slightly more opaque for light theme
      barBorderColor: "rgba(31, 97, 141, 1)", // Darker border for light theme
      highlightedBarColor: "rgba(230, 126, 34, 1)", // Orange for light theme
      highlightedBarBorderColor: "rgba(175, 96, 26, 1)", // Darker orange border
      highlightedLineColor: "rgba(230, 126, 34, 0.8)",
      durationTextColor: "rgba(40, 40, 40, 0.9)", // Dark text for light theme
      distanceTextColor: "rgba(60, 60, 60, 1)", // Dark text for light theme
      distanceLabelBgColor: "rgba(255, 255, 255, 0.9)", // Light background for light theme
    };
  }
};

export class ClusterMarkers implements Renderer<ClusterMarkersOptions>, Interactive {
  private layer: Layer;
  public config: ClusterMarkersOptions;
  /** Map timestamp → ClusterBar instance */
  private clusterBars: Map<number, ClusterBar> = new Map();
  private hoveredBar: ClusterBar | null = null;

  // Component responsible for drawing distance labels between clusters
  private clusterLabels: ClusterLabels;

  zIndex = 1;

  constructor(layer: Layer, options: Partial<ClusterMarkersOptions> = {}) {
    this.layer = layer;
    const themeColors = getThemeAwareClusterMarkerColors();

    this.config = {
      lineColor: options.lineColor ?? themeColors.lineColor,
      lineWidth: options.lineWidth ?? 1,
      activeSegmentColor: options.activeSegmentColor ?? "rgba(255, 165, 0, 1)",
      activeSegmentWidth: options.activeSegmentWidth ?? 3,
      barHeight: options.barHeight ?? 20,
      barColor: options.barColor ?? themeColors.barColor,
      barBorderColor: options.barBorderColor ?? themeColors.barBorderColor,
      highlightedBarColor: options.highlightedBarColor ?? themeColors.highlightedBarColor,
      highlightedBarBorderColor: options.highlightedBarBorderColor ?? themeColors.highlightedBarBorderColor,
      highlightedLineColor: options.highlightedLineColor ?? themeColors.highlightedLineColor,
      highlightedLineWidth: options.highlightedLineWidth ?? 3,
      normalLineWidth: options.normalLineWidth ?? 2,
      durationTextColor: options.durationTextColor ?? themeColors.durationTextColor,
      durationTextFont: options.durationTextFont ?? "10px Arial",
      minBarWidthForText: options.minBarWidthForText ?? 30,
      distanceTextColor: options.distanceTextColor ?? themeColors.distanceTextColor,
      distanceTextFont: options.distanceTextFont ?? "12px Arial",
      distanceLabelBgColor: options.distanceLabelBgColor ?? themeColors.distanceLabelBgColor,
      distanceLabelPadding: options.distanceLabelPadding ?? 4,
    };

    // Initialize labels component with same layer & config
    this.clusterLabels = new ClusterLabels(this.layer, this.config);
  }

  /** Hit-test succeeds if *any* bar or a label reports a hit */
  public hitTest(x: number, y: number): boolean {
    for (const bar of this.clusterBars.values()) {
      if (bar.hitTest(x, y)) return true;
    }
    if (this.clusterLabels.hitTest(x, y)) return true;
    return false;
  }

  public onPointerDown(e: PointerEvent): boolean {
    return false;
  }

  public onPointerMove(e: PointerEvent, keys: Set<string>): boolean {
    return false;
  }

  public onPointerUp(e: PointerEvent): boolean {
    return false;
  }

  /** Called by InteractionManager when the pointer enters/leaves this aggregated area */
  public onHoverChange(isHovering: boolean): void {
    if (!isHovering && this.hoveredBar) {
      this.hoveredBar.onHoverChange(false);
      this.hoveredBar = null;
    }
  }

  /** Called on every move while the pointer is over the cluster marker row */
  public onPointerHover(e: PointerEvent, _pressedKeys?: Set<string>): void {
    const x = e.offsetX;
    const y = e.offsetY;

    let newHovered: ClusterBar | null = null;
    for (const bar of this.clusterBars.values()) {
      if (bar.hitTest(x, y)) {
        newHovered = bar;
        break;
      }
    }

    if (newHovered !== this.hoveredBar) {
      if (this.hoveredBar) this.hoveredBar.onHoverChange(false);
      if (newHovered) newHovered.onHoverChange(true);
      this.hoveredBar = newHovered;
    }

    // Update label hover state
    this.clusterLabels.updateHover(x, y);
  }

  draw(context: RenderContext, data: GPSData): void {
    const { clusters } = data;
    if (!clusters?.length) return;

    // Get theme-aware colors for each draw call (in case theme changed)
    const themeColors = getThemeAwareClusterMarkerColors();

    // Sync clusterBars with current clusters based on timestamp
    const existingTimestamps = new Set<number>();
    clusters.forEach((cluster) => {
      existingTimestamps.add(cluster.timestamp);
      if (!this.clusterBars.has(cluster.timestamp)) {
        this.clusterBars.set(cluster.timestamp, new ClusterBar(this.layer, cluster, this.config));
      } else {
        // Update reference to latest cluster object
        const bar = this.clusterBars.get(cluster.timestamp)!;
        bar.cluster = cluster;
      }
    });

    // Remove stale bars
    for (const ts of [...this.clusterBars.keys()]) {
      if (!existingTimestamps.has(ts)) {
        this.clusterBars.delete(ts);
      }
    }

    const ctx = this.layer.context;
    const { scrollLeftPx, width, zoom } = context;

    ctx.clearRect(0, 0, width, this.layer.height);
    ctx.save();

    const barHeight = this.config.barHeight;
    const barYPosition = barHeight / 2 + 2;

    // --- Draw connecting lines & distance labels first (so bars overlay them) ---

    // Helper function to check if a point is within a cluster's time range
    const isPointInCluster = (pointTime: number, cluster: any) => {
      return pointTime >= cluster.timestamp && pointTime <= cluster.timestamp + cluster.duration;
    };

    // Draw arc from start to first cluster (if start point not in first cluster)
    if (clusters.length > 0 && data.points?.length > 0) {
      const firstPoint = data.points[0];
      const firstCluster = clusters[0];

      if (firstPoint && firstCluster && !isPointInCluster(firstPoint.timestamp, firstCluster)) {
        const xStart = firstPoint.timestamp * zoom - scrollLeftPx;
        const xClusterStart = firstCluster.timestamp * zoom - scrollLeftPx;

        // Check if current time is in this start-to-first-cluster segment
        const isStartArcActive =
          data.currentTime !== undefined &&
          data.currentTime >= firstPoint.timestamp &&
          data.currentTime < firstCluster.timestamp;

        // Only draw if visible on screen
        if (xClusterStart >= 0 && xStart <= width) {
          ctx.beginPath();
          ctx.moveTo(xStart, barYPosition);
          ctx.lineTo(xClusterStart, barYPosition);
          ctx.strokeStyle = isStartArcActive ? themeColors.highlightedLineColor : themeColors.lineColor;
          ctx.lineWidth = isStartArcActive ? this.config.highlightedLineWidth : this.config.normalLineWidth;
          ctx.setLineDash(isStartArcActive ? [] : [4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    }

    // Draw connecting lines between consecutive clusters
    for (let i = 0; i < clusters.length - 1; i++) {
      const cluster = clusters[i];
      const nextCluster = clusters[i + 1];

      const xCurrentEnd = (cluster.timestamp + cluster.duration) * zoom - scrollLeftPx;
      const xNextStart = nextCluster.timestamp * zoom - scrollLeftPx;

      if (xCurrentEnd > width || xNextStart < 0) continue;

      const isConnectingActive =
        data.activeClusterSegment?.startCluster.timestamp === cluster.timestamp &&
        data.activeClusterSegment?.endCluster.timestamp === nextCluster.timestamp;

      ctx.beginPath();
      ctx.moveTo(xCurrentEnd, barYPosition);
      ctx.lineTo(xNextStart, barYPosition);
      ctx.strokeStyle = isConnectingActive ? themeColors.highlightedLineColor : themeColors.lineColor;
      ctx.lineWidth = isConnectingActive ? this.config.highlightedLineWidth : this.config.normalLineWidth;
      ctx.setLineDash(isConnectingActive ? [] : [4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw arc from last cluster to end point (if end point not in last cluster)
    if (clusters.length > 0 && data.points?.length > 0) {
      const lastPoint = data.points[data.points.length - 1];
      const lastCluster = clusters[clusters.length - 1];

      if (lastPoint && lastCluster && !isPointInCluster(lastPoint.timestamp, lastCluster)) {
        const xClusterEnd = (lastCluster.timestamp + lastCluster.duration) * zoom - scrollLeftPx;
        const xEnd = lastPoint.timestamp * zoom - scrollLeftPx;

        // Check if current time is in this last-cluster-to-end segment
        const isEndArcActive =
          data.currentTime !== undefined &&
          data.currentTime > lastCluster.timestamp + lastCluster.duration &&
          data.currentTime <= lastPoint.timestamp;

        // Only draw if visible on screen
        if (xClusterEnd <= width && xEnd >= 0) {
          ctx.beginPath();
          ctx.moveTo(xClusterEnd, barYPosition);
          ctx.lineTo(xEnd, barYPosition);
          ctx.strokeStyle = isEndArcActive ? themeColors.highlightedLineColor : themeColors.lineColor;
          ctx.lineWidth = isEndArcActive ? this.config.highlightedLineWidth : this.config.normalLineWidth;
          ctx.setLineDash(isEndArcActive ? [] : [4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    }

    // Collect renderables (bars + labels) and draw sorted by zIndex
    const renderables: Array<{
      zIndex: number;
      draw: (ctx: RenderContext, data: GPSData) => void;
      hovered?: boolean;
    }> = [];

    // Bars
    const bars = clusters.map((c) => this.clusterBars.get(c.timestamp)!).filter(Boolean);
    bars.forEach((bar) =>
      renderables.push({
        zIndex: bar.zIndex ?? 0,
        draw: bar.draw.bind(bar),
        hovered: bar.hovered,
      }),
    );

    // Cluster labels
    renderables.push({
      zIndex: this.clusterLabels.zIndex,
      draw: this.clusterLabels.draw.bind(this.clusterLabels),
    });

    // Sort so higher zIndex drawn last
    renderables.sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));

    for (const item of renderables) {
      // If bar and it's hovered, we'll draw later to ensure overlay; skip for now
      if ((item as any).hovered) continue;
      item.draw(context, data);
    }

    // draw hovered bar last (highest visual priority)
    if (this.hoveredBar) this.hoveredBar.draw(context, data);

    ctx.restore();
  }

  updateConfig(config: Partial<ClusterMarkersOptions>): void {
    this.config = { ...this.config, ...config };
    // Propagate configuration changes to individual bars
    this.clusterBars.forEach((bar) => bar.updateConfig(config));
    this.clusterLabels.updateConfig(config);
  }

  destroy(): void {
    this.clusterBars.forEach((bar) => bar.destroy());
    this.clusterBars.clear();
    this.clusterLabels.destroy();
  }

  onResize(): void {
    this.clusterBars.forEach((bar) => bar.onResize?.());
    this.clusterLabels.onResize?.();
  }

  /** Expose child interactives for InteractionManager traversal */
  children(): Interactive[] {
    return [this.clusterLabels, ...Array.from(this.clusterBars.values())];
  }
}

// Component responsible for rendering distance labels under cluster bars
export class ClusterLabels implements Renderer<ClusterMarkersOptions>, Interactive {
  private layer: Layer;
  public config: ClusterMarkersOptions;

  zIndex = 1; // labels above bars

  /** Map start-cluster-timestamp → ClusterLabel */
  private labelMap: Map<number, ClusterLabel> = new Map();
  private hoveredLabel: ClusterLabel | null = null;

  constructor(layer: Layer, config: ClusterMarkersOptions) {
    this.layer = layer;
    this.config = { ...config };
  }

  updateConfig(config: Partial<ClusterMarkersOptions>): void {
    this.config = { ...this.config, ...config };
  }

  draw(context: RenderContext, data: GPSData): void {
    const { clusters } = data;
    if (!clusters || clusters.length < 2) return;

    // Sync labelMap with clusters
    const neededKeys = new Set<number>();
    clusters.forEach((cluster, i) => {
      if (i >= clusters.length - 1) return;
      if (cluster.distance === undefined) return;
      neededKeys.add(cluster.timestamp);
      if (!this.labelMap.has(cluster.timestamp)) {
        const nextCluster = clusters[i + 1];
        this.labelMap.set(cluster.timestamp, new ClusterLabel(this.layer, cluster, nextCluster, this.config));
      }
    });

    // Remove stale labels
    [...this.labelMap.keys()].forEach((k) => {
      if (!neededKeys.has(k)) this.labelMap.delete(k);
    });

    // Draw labels sorted by zIndex (higher drawn last)
    const sorted = Array.from(this.labelMap.values()).sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
    sorted.forEach((label) => label.draw(context));
  }

  destroy(): void {
    // nothing specific
  }

  onResize(): void {
    // no-op for now
  }

  /** Child interactives are the individual ClusterLabel objects */
  children(): Interactive[] {
    return Array.from(this.labelMap.values());
  }

  /* ----------------------------- Interactive ----------------------------- */

  hitTest(x: number, y: number): boolean {
    for (const label of this.labelMap.values()) {
      if (label.hitTest(x, y)) return true;
    }
    return false;
  }

  onPointerDown(_e: PointerEvent): boolean {
    return false;
  }

  onPointerMove(_e: PointerEvent, _pressedKeys: Set<string>): boolean {
    return false;
  }

  onPointerUp(_e: PointerEvent): boolean {
    return false;
  }

  onHoverChange(_isHovering: boolean): void {
    // Could add visual feedback; skipped for now
  }

  /** Determine which label (if any) is under the pointer and update hover index */
  public updateHover(x: number, y: number): void {
    let closest: ClusterLabel | null = null;
    let minDx = Number.POSITIVE_INFINITY;

    for (const label of this.labelMap.values()) {
      const { xStart, xEnd, yTop, yBottom } = (label as any).bounds;
      if (y < yTop || y > yBottom) continue; // outside vertical span
      if (x < xStart || x > xEnd) continue; // outside horizontal span

      const center = (xStart + xEnd) / 2;
      const dx = Math.abs(x - center);
      if (dx < minDx) {
        minDx = dx;
        closest = label;
      }
    }

    if (closest !== this.hoveredLabel) {
      if (this.hoveredLabel) {
        this.hoveredLabel.onHoverChange(false);
        this.hoveredLabel.zIndex = 300;
      }
      if (closest) {
        closest.onHoverChange(true);
        closest.zIndex = 400;
      }
      this.hoveredLabel = closest;
    }
  }

  // No separate overlay now; incorporated into draw
  renderInteractionOverlay(): void {}
}

// Individual cluster bar (rectangle) that can render itself and react to pointer hovers
export class ClusterBar implements Renderer<ClusterMarkersOptions>, Interactive {
  private layer: Layer;
  public config: ClusterMarkersOptions;
  public cluster: ClusterPoint;

  /** Whether the pointer is currently hovering this bar */
  private _hovered = false;

  /** Cached bounding box in canvas-pixel coordinates updated on every draw */
  private bounds = {
    xStart: 0,
    xEnd: 0,
    yTop: 0,
    yBottom: 0,
  };

  /** z-index used by parent ClusterMarkers for rendering order */
  public zIndex = 0;

  constructor(layer: Layer, cluster: ClusterPoint, config: ClusterMarkersOptions) {
    this.layer = layer;
    this.cluster = cluster;
    // Make a shallow copy so updates on parent don't mutate our reference unless updateConfig is called
    this.config = { ...config };
  }

  /** Public getter so parent can query hover state */
  public get hovered() {
    return this._hovered;
  }

  /**
   * Draws the bar into the provided layer. This DOES NOT clear the layer – caller is responsible.
   */
  draw(context: RenderContext, data: GPSData): void {
    const ctx = this.layer.context;

    const { scrollLeftPx, zoom, width } = context;

    // Get theme-aware colors for each draw call (in case theme changed)
    const themeColors = getThemeAwareClusterMarkerColors();

    // Geometry in pixels
    const barHeight = this.config.barHeight;
    const barYPosition = barHeight / 2 + 2;

    const tStart = this.cluster.timestamp;
    const tEnd = this.cluster.timestamp + this.cluster.duration;
    const xStart = tStart * zoom - scrollLeftPx;
    const xEnd = tEnd * zoom - scrollLeftPx;

    // Update cached bounds for hit-testing (even if off-screen)
    this.bounds = {
      xStart,
      xEnd,
      yTop: barYPosition - barHeight / 2,
      yBottom: barYPosition + barHeight / 2,
    };

    // Cull if outside viewport
    if (xEnd < 0 || xStart > width) return;

    const barWidth = Math.max(1, xEnd - xStart);

    // Determine whether this bar should be highlighted
    const isStart = data.activeClusterSegment?.startCluster.timestamp === this.cluster.timestamp;
    const isEnd = data.activeClusterSegment?.endCluster.timestamp === this.cluster.timestamp;

    // Also highlight first cluster if current time is in the start arc (before first cluster)
    const isFirstCluster =
      data.clusters && data.clusters.length > 0 && data.clusters[0].timestamp === this.cluster.timestamp;
    const isInStartArc =
      isFirstCluster &&
      data.currentTime !== undefined &&
      data.points &&
      data.points.length > 0 &&
      data.currentTime >= data.points[0].timestamp &&
      data.currentTime < this.cluster.timestamp;

    // Also highlight last cluster if current time is in the end arc (after last cluster)
    const isLastCluster =
      data.clusters &&
      data.clusters.length > 0 &&
      data.clusters[data.clusters.length - 1].timestamp === this.cluster.timestamp;
    const isInEndArc =
      isLastCluster &&
      data.currentTime !== undefined &&
      data.points &&
      data.points.length > 0 &&
      data.currentTime > this.cluster.timestamp + this.cluster.duration &&
      data.currentTime <= data.points[data.points.length - 1].timestamp;

    const highlighted = isStart || isEnd || isInStartArc || isInEndArc;

    ctx.beginPath();
    ctx.rect(xStart, barYPosition - barHeight / 2, barWidth, barHeight);

    ctx.fillStyle = highlighted ? themeColors.highlightedBarColor : themeColors.barColor;
    ctx.fill();

    ctx.strokeStyle = highlighted ? themeColors.highlightedBarBorderColor : themeColors.barBorderColor;
    ctx.lineWidth = highlighted ? this.config.highlightedLineWidth : this.config.normalLineWidth;
    ctx.stroke();

    // Optional duration text in the middle of the bar
    if (barWidth >= this.config.minBarWidthForText) {
      ctx.font = this.config.durationTextFont;
      ctx.fillStyle = themeColors.durationTextColor;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const durationText = `${this.cluster.duration.toFixed(1)}s`;
      ctx.fillText(durationText, xStart + barWidth / 2, barYPosition);
    }
  }

  updateConfig(config: Partial<ClusterMarkersOptions>): void {
    this.config = { ...this.config, ...config };
  }

  destroy(): void {
    // Nothing to clean specifically for the moment
  }

  onResize(): void {
    // No-op
  }

  /* ----------------------------- Interactive ----------------------------- */

  hitTest(x: number, y: number): boolean {
    return false;
  }

  onPointerDown(_e: PointerEvent): boolean {
    return false;
  }

  onPointerMove(_e: PointerEvent, _keys: Set<string>): boolean {
    return false;
  }

  onPointerUp(_e: PointerEvent): boolean {
    return false;
  }

  onHoverChange(_h: boolean): void {}
}

// Individual distance label renderer & interactive
class ClusterLabel implements Renderer<ClusterMarkersOptions>, Interactive {
  public hovered = false;
  private bounds = { xStart: 0, xEnd: 0, yTop: 0, yBottom: 0 };
  zIndex = 2;

  constructor(
    private layer: Layer,
    public cluster: ClusterPoint,
    private nextCluster: ClusterPoint,
    public config: ClusterMarkersOptions,
  ) {}

  private computeGeometry(context: RenderContext) {
    const extraPad = 2; // extra visual padding
    const { scrollLeftPx, zoom } = context;
    const barHeight = this.config.barHeight;
    const padding = this.config.distanceLabelPadding + extraPad;

    const xCurrentEnd = (this.cluster.timestamp + this.cluster.duration) * zoom - scrollLeftPx;
    const xNextStart = this.nextCluster.timestamp * zoom - scrollLeftPx;

    const midX = (xCurrentEnd + xNextStart) / 2;

    const labelText = `${this.cluster.distance?.toFixed(1) ?? 0}m`;
    const textHeight = Number.parseInt(this.config.distanceTextFont, 10) * 1.2;
    const textWidth = this.layer.context.measureText(labelText).width;
    const barYPosition = barHeight / 2 + 2;
    const labelY = barYPosition + barHeight / 2 + 6;

    const bgX = midX - textWidth / 2 - padding;
    const bgWidth = textWidth + padding * 2;

    this.bounds = {
      xStart: bgX,
      xEnd: bgX + bgWidth,
      yTop: labelY - padding / 2,
      yBottom: labelY - padding / 2 + textHeight + padding,
    };

    return { labelText, labelY, bgX, bgWidth, textWidth, textHeight, padding };
  }

  draw(context: RenderContext): void {
    const ctx = this.layer.context;
    const { scrollLeftPx, width } = context;

    // Cull if off screen
    const xCurrentEnd = (this.cluster.timestamp + this.cluster.duration) * context.zoom - scrollLeftPx;
    const xNextStart = this.nextCluster.timestamp * context.zoom - scrollLeftPx;
    if (xCurrentEnd > width || xNextStart < 0) return;

    const { labelText, labelY, bgX, bgWidth, padding, textHeight } = this.computeGeometry(context);

    // Get theme-aware colors for each draw call
    const themeColors = getThemeAwareClusterMarkerColors();
    const currentTheme = getCurrentTheme();
    const prefersDark = currentTheme?.toLowerCase() === "dark";

    let bgColor = themeColors.distanceLabelBgColor;
    let textColor = themeColors.distanceTextColor;

    // High-contrast hover background & text
    if (this.hovered) {
      if (prefersDark) {
        bgColor = "rgba(255,255,255,0.95)"; // almost-white on dark bg
        textColor = "#000000";
      } else {
        bgColor = "rgba(0,0,0,0.85)"; // almost-black on light bg
        textColor = "#FFFFFF";
      }
    }

    ctx.save();
    ctx.font = this.config.distanceTextFont;

    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.roundRect(bgX, labelY - padding / 2, bgWidth, textHeight + padding, padding);
    ctx.fill();

    // Border: subtle normally, pronounced when hovered
    const baseAlpha = this.hovered ? 0.8 : 0.25;
    ctx.strokeStyle = prefersDark ? `rgba(255,255,255,${baseAlpha})` : `rgba(0,0,0,${baseAlpha})`;
    ctx.lineWidth = this.hovered ? 2 : 1;
    ctx.stroke();

    ctx.fillStyle = textColor;
    ctx.textBaseline = "top";
    ctx.textAlign = "center";
    ctx.fillText(labelText, bgX + bgWidth / 2, labelY);
    ctx.restore();
  }

  updateConfig(config: Partial<ClusterMarkersOptions>): void {
    this.config = { ...this.config, ...config };
  }

  destroy(): void {}
  onResize(): void {}

  /* Interactive */
  hitTest(x: number, y: number): boolean {
    const { xStart, xEnd, yTop, yBottom } = this.bounds;
    return x >= xStart && x <= xEnd && y >= yTop && y <= yBottom;
  }
  onPointerDown(): boolean {
    return false;
  }
  onPointerMove(): boolean {
    return false;
  }
  onPointerUp(): boolean {
    return false;
  }
  onHoverChange(isHovering: boolean): void {
    this.hovered = isHovering;
  }
}
