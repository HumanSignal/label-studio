import type { Layer } from "../Composition/Layer";
import type { GPSData } from "../types";
import type { Renderer, RenderContext } from "./Renderer";
import type { Cluster as ClusterPoint } from "../../../tags/object/GPSMap/clusters";
import type { Interactive } from "../Interaction/Interactive";
import { getCurrentTheme } from "@humansignal/ui";

export interface ClusterVisualizationOptions {
  clusterFillColor: string;
  clusterBorderColor: string;
  clusterActiveColor: string;
  clusterActiveBorderColor: string;
  clusterOpacity: number;
  clusterActiveOpacity: number;
  clusterBorderWidth: number;
  clusterActiveBorderWidth: number;
}

// Helper function to get theme-aware cluster colors
const getThemeAwareClusterColors = () => {
  const currentTheme = getCurrentTheme();
  const isDarkMode = currentTheme?.toLowerCase() === "dark";

  if (isDarkMode) {
    return {
      clusterFillColor: "rgba(52, 152, 219, 0.15)",
      clusterBorderColor: "rgba(52, 152, 219, 0.4)",
      clusterActiveColor: "rgba(255, 165, 0, 0.15)",
      clusterActiveBorderColor: "rgba(255, 165, 0, 0.4)",
    };
  } else {
    return {
      clusterFillColor: "rgba(41, 128, 185, 0.08)", // Slightly darker and more transparent for light theme
      clusterBorderColor: "rgba(41, 128, 185, 0.08)", // More visible border for light theme
      clusterActiveColor: "rgba(230, 126, 34, 0.15)", // Orange with less opacity for light theme
      clusterActiveBorderColor: "rgba(230, 126, 34, 0.4)", // More visible active border for light theme
    };
  }
};

export class ClusterVisualization implements Renderer<ClusterVisualizationOptions>, Interactive {
  private layer: Layer;
  public config: ClusterVisualizationOptions;
  private hoveredCluster: ClusterPoint | null = null;
  private clusterRects: Map<number, { x: number; y: number; width: number; height: number; cluster: ClusterPoint }> =
    new Map();

  zIndex = -1; // Behind grid and other elements

  constructor(layer: Layer, options: Partial<ClusterVisualizationOptions> = {}) {
    this.layer = layer;
    const themeColors = getThemeAwareClusterColors();
    this.config = {
      clusterFillColor: options.clusterFillColor ?? themeColors.clusterFillColor,
      clusterBorderColor: options.clusterBorderColor ?? themeColors.clusterBorderColor,
      clusterActiveColor: options.clusterActiveColor ?? themeColors.clusterActiveColor,
      clusterActiveBorderColor: options.clusterActiveBorderColor ?? themeColors.clusterActiveBorderColor,
      clusterOpacity: options.clusterOpacity ?? 0.15,
      clusterActiveOpacity: options.clusterActiveOpacity ?? 0.25,
      clusterBorderWidth: options.clusterBorderWidth ?? 1,
      clusterActiveBorderWidth: options.clusterActiveBorderWidth ?? 2,
    };
  }

  public hitTest(x: number, y: number): boolean {
    for (const rect of this.clusterRects.values()) {
      if (x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height) {
        return true;
      }
    }
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

  public onHoverChange(isHovering: boolean): void {
    if (!isHovering) {
      this.hoveredCluster = null;
    }
  }

  public onPointerHover(e: PointerEvent, _pressedKeys?: Set<string>): void {
    const x = e.offsetX;
    const y = e.offsetY;

    let newHovered: ClusterPoint | null = null;
    for (const rect of this.clusterRects.values()) {
      if (x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height) {
        newHovered = rect.cluster;
        break;
      }
    }

    if (newHovered !== this.hoveredCluster) {
      this.hoveredCluster = newHovered;
    }
  }

  draw(context: RenderContext, data: GPSData): void {
    const { clusters } = data;
    if (!clusters?.length) {
      this.clusterRects.clear();
      return;
    }

    const ctx = this.layer.context;
    const { scrollLeftPx, width, zoom } = context;
    const height = this.layer.height;

    ctx.clearRect(0, 0, width, height);
    ctx.save();

    this.clusterRects.clear();

    // Get theme-aware colors for each draw call (in case theme changed)
    const themeColors = getThemeAwareClusterColors();

    // Draw cluster visualization rectangles
    clusters.forEach((cluster) => {
      const xStart = cluster.timestamp * zoom - scrollLeftPx;
      const xEnd = (cluster.timestamp + cluster.duration) * zoom - scrollLeftPx;
      const clusterWidth = xEnd - xStart;

      // Skip clusters that are not visible
      if (xEnd < 0 || xStart > width) return;

      // Clamp to visible area
      const visibleXStart = Math.max(0, xStart);
      const visibleXEnd = Math.min(width, xEnd);
      const visibleWidth = visibleXEnd - visibleXStart;

      if (visibleWidth <= 0) return;

      // Determine if this cluster is active
      const isActive =
        data.activeClusterSegment?.startCluster.timestamp === cluster.timestamp ||
        data.activeClusterSegment?.endCluster.timestamp === cluster.timestamp;

      // Draw cluster rectangle spanning the full height
      const rectY = 0;
      const rectHeight = height;

      // Store rectangle for hit testing
      this.clusterRects.set(cluster.timestamp, {
        x: visibleXStart,
        y: rectY,
        width: visibleWidth,
        height: rectHeight,
        cluster: cluster,
      });

      // Set colors based on state and theme
      const fillColor = isActive ? themeColors.clusterActiveColor : themeColors.clusterFillColor;
      const borderColor = isActive ? themeColors.clusterActiveBorderColor : themeColors.clusterBorderColor;
      const borderWidth = isActive ? this.config.clusterActiveBorderWidth : this.config.clusterBorderWidth;

      // Draw filled rectangle
      ctx.fillStyle = fillColor;
      ctx.fillRect(visibleXStart, rectY, visibleWidth, rectHeight);

      // Draw border
      if (borderWidth > 0) {
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = borderWidth;
        ctx.strokeRect(visibleXStart, rectY, visibleWidth, rectHeight);
      }
    });

    ctx.restore();
  }

  updateConfig(config: Partial<ClusterVisualizationOptions>): void {
    Object.assign(this.config, config);
  }

  destroy(): void {
    this.clusterRects.clear();
  }

  onResize(): void {
    this.clusterRects.clear();
  }

  children(): Interactive[] {
    return [];
  }
}
