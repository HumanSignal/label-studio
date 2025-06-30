import type { Layer } from "../Composition/Layer";
import type { GPSData, GPSPoint } from "../types";
import type { Renderer, RenderContext } from "./Renderer";
import { getCurrentTheme } from "@humansignal/ui";

export interface MetricWaveformOptions {
  metric: keyof GPSPoint;
  lineColor?: string;
  lineWidth?: number;
  showDotsThreshold?: number;
  dotRadius?: number;
  maxPointsForDots?: number;
  speedUnit?: "m/s" | "km/h"; // Add speed unit option
}

export class MetricWaveform implements Renderer<MetricWaveformOptions> {
  private layer: Layer;
  private _config: Required<MetricWaveformOptions>;

  constructor(layer: Layer, options: MetricWaveformOptions) {
    this.layer = layer;
    this._config = {
      metric: options.metric,
      lineColor: options.lineColor ?? "var(--color-blue-400)",
      lineWidth: options.lineWidth ?? 2,
      dotRadius: options.dotRadius ?? 2,
      showDotsThreshold: options.showDotsThreshold ?? 20,
      maxPointsForDots: options.maxPointsForDots ?? 100,
      speedUnit: options.speedUnit ?? "m/s",
    };
  }

  public get config(): Required<MetricWaveformOptions> {
    return this._config;
  }

  public updateConfig(config: Partial<MetricWaveformOptions>): void {
    Object.assign(this._config, config);
  }

  public draw(context: RenderContext, data: GPSData): void {
    const { points } = data;
    if (!points || points.length === 0) return;

    const { zoom } = context;
    const { metric } = this._config;

    // Calculate visible time range from context - always needed for point filtering
    const timeStart = context.scrollLeftPx / context.zoom;
    const visibleTimeRange = {
      start: timeStart,
      end: timeStart + this.layer.width / context.zoom,
    };

    // Use metric range from context (required for synchronization)
    if (!context.metricRanges || !context.metricRanges[metric]) {
      throw new Error(`MetricWaveform: No metric range provided for ${String(metric)} in RenderContext`);
    }
    const valueRange = context.metricRanges[metric]!;

    const startIndex = Math.max(0, points.findIndex((p) => p.timestamp >= visibleTimeRange.start) - 1);
    let endIndex = points.findIndex((p) => p.timestamp > visibleTimeRange.end);
    if (endIndex === -1) {
      endIndex = points.length;
    } else {
      endIndex = Math.min(points.length, endIndex + 1);
    }
    const pointsToRender = points.slice(startIndex, endIndex);

    if (pointsToRender.length < 2) return;

    this.layer.save();

    this.layer.strokeStyle = this._config.lineColor;
    this.layer.lineWidth = this._config.lineWidth;
    this.layer.beginPath();

    const drawablePoints = this.preparePoints(pointsToRender, valueRange.max - valueRange.min, valueRange.min, context);

    if (drawablePoints.length > 1) {
      this.layer.moveTo(drawablePoints[0].x, drawablePoints[0].y);

      for (let i = 1; i < drawablePoints.length; i++) {
        this.layer.context.lineTo(drawablePoints[i].x, drawablePoints[i].y);
      }
    }

    this.layer.stroke();

    // Show dots if we're zoomed in enough (fewer points visible or high zoom level)
    const shouldShowDots =
      pointsToRender.length <= this._config.maxPointsForDots || zoom >= this._config.showDotsThreshold;

    if (shouldShowDots) {
      this.layer.fillStyle = this._config.lineColor;
      for (const p of drawablePoints) {
        this.layer.beginPath();
        this.layer.context.arc(p.x, p.y, this._config.dotRadius, 0, 2 * Math.PI);
        this.layer.fill();
      }
    }

    // Draw cursor and highlight closest point if present
    if (data.cursorTime !== null && data.cursorTime !== undefined) {
      this.drawCursor(data.cursorTime, context);
      this.highlightClosestPoint(data.cursorTime, points, context, valueRange, "cursor");
    }

    // Draw playhead highlight
    if (data.currentTime !== null && data.currentTime !== undefined) {
      this.highlightClosestPoint(data.currentTime, points, context, valueRange, "playhead");
    }

    this.layer.restore();
  }

  private preparePoints(points: GPSPoint[], valueRange: number, minVal: number, context: RenderContext) {
    const { metric } = this._config;
    const timeStart = context.scrollLeftPx / context.zoom;

    return points.map((p) => {
      const value = p[metric] as number;
      const y =
        valueRange === 0
          ? this.layer.height / 2
          : this.layer.height - ((value - minVal) / valueRange) * this.layer.height;

      // Calculate x position from context instead of using waveform
      const x = (p.timestamp - timeStart) * context.zoom;

      return { x, y };
    });
  }

  private drawCursor(cursorTime: number, context: RenderContext): void {
    const timeStart = context.scrollLeftPx / context.zoom;
    const x = (cursorTime - timeStart) * context.zoom;

    // Only draw cursor if it's within the visible area
    if (x >= 0 && x <= this.layer.width) {
      this.layer.save();

      // Theme-aware cursor color
      const cursorColor = this.getThemeAwareCursorColor();
      this.layer.strokeStyle = cursorColor;
      this.layer.lineWidth = 1;
      this.layer.context.setLineDash([4, 4]); // Dashed line
      this.layer.beginPath();
      this.layer.moveTo(x, 0);
      this.layer.lineTo(x, this.layer.height);
      this.layer.stroke();
      this.layer.restore();
    }
  }

  private highlightClosestPoint(
    time: number,
    points: GPSPoint[],
    context: RenderContext,
    valueRange: { min: number; max: number },
    type: "cursor" | "playhead" = "cursor",
  ): void {
    if (points.length === 0) return;

    // Find the interpolated value at the specified time
    const interpolatedValue = this.getInterpolatedValue(time, points);
    if (interpolatedValue === null) return;

    // Calculate the position at the specified time
    const timeStart = context.scrollLeftPx / context.zoom;
    const x = (time - timeStart) * context.zoom;

    // Only proceed if the point is within the visible area
    if (x < 0 || x > this.layer.width) return;

    const value = interpolatedValue;
    const valueDuration = valueRange.max - valueRange.min;
    const y =
      valueDuration === 0
        ? this.layer.height / 2
        : this.layer.height - ((value - valueRange.min) / valueDuration) * this.layer.height;

    this.layer.save();

    // Get theme-aware colors
    const { highlightStroke, labelText: labelTextColor, labelStroke } = this.getThemeAwareHighlightColors();

    // Draw highlight circle
    this.layer.fillStyle = this._config.lineColor;
    this.layer.strokeStyle = highlightStroke;
    this.layer.lineWidth = 2;
    this.layer.context.setLineDash([]); // Solid line for highlight
    this.layer.beginPath();
    this.layer.context.arc(x, y, 4, 0, 2 * Math.PI);
    this.layer.fill();
    this.layer.stroke();

    // Draw label with value
    const labelText = this.formatValueForLabel(value);
    this.layer.font = "12px Arial";
    this.layer.fillStyle = labelTextColor;
    this.layer.strokeStyle = labelStroke;
    this.layer.lineWidth = 3;

    // Calculate label position (offset above the point)
    const labelX = x;
    const labelY = Math.max(15, y - 15); // Ensure label doesn't go off top

    // Draw label background stroke (for outline effect)
    this.layer.context.strokeText(labelText, labelX, labelY);
    // Draw label text
    this.layer.context.fillText(labelText, labelX, labelY);

    this.layer.restore();
  }

  private getInterpolatedValue(cursorTime: number, points: GPSPoint[]): number | null {
    if (points.length === 0) return null;

    // If cursor is before first point, return first point value
    if (cursorTime <= points[0].timestamp) {
      return points[0][this._config.metric] as number;
    }

    // If cursor is after last point, return last point value
    if (cursorTime >= points[points.length - 1].timestamp) {
      return points[points.length - 1][this._config.metric] as number;
    }

    // Find the two points that bracket the cursor time
    for (let i = 0; i < points.length - 1; i++) {
      const point1 = points[i];
      const point2 = points[i + 1];

      if (cursorTime >= point1.timestamp && cursorTime <= point2.timestamp) {
        // Linear interpolation between the two points
        const t1 = point1.timestamp;
        const t2 = point2.timestamp;
        const v1 = point1[this._config.metric] as number;
        const v2 = point2[this._config.metric] as number;

        // Calculate interpolation factor (0 = point1, 1 = point2)
        const factor = (cursorTime - t1) / (t2 - t1);

        // Linear interpolation: v1 + factor * (v2 - v1)
        return v1 + factor * (v2 - v1);
      }
    }

    // Fallback (should not reach here)
    return points[0][this._config.metric] as number;
  }

  private formatValueForLabel(value: number): string {
    const suffix =
      this._config.metric === "altitude" ? "m" : this._config.metric === "speed" ? this._config.speedUnit : "";
    const digits = suffix === "m" ? 0 : 2; // Use 2 decimal places for non-meter values
    const formatted = value.toFixed(digits);
    // Remove unnecessary trailing zeros and decimal point
    const cleaned = formatted.replace(/\.?0+$/, "");
    return `${cleaned}${suffix}`;
  }

  private getThemeAwareCursorColor(): string {
    const currentTheme = getCurrentTheme();
    const isDarkMode = currentTheme?.toLowerCase() === "dark";

    if (isDarkMode) {
      return "rgba(200, 200, 200, 0.8)"; // Light gray for dark theme
    } else {
      return "rgba(80, 80, 80, 0.8)"; // Dark gray for light theme
    }
  }

  private getThemeAwareHighlightColors(): {
    highlightStroke: string;
    labelText: string;
    labelStroke: string;
  } {
    const currentTheme = getCurrentTheme();
    const isDarkMode = currentTheme?.toLowerCase() === "dark";

    if (isDarkMode) {
      return {
        highlightStroke: "white", // White border for dark theme
        labelText: "white", // White text for dark theme
        labelStroke: "rgba(0, 0, 0, 0.8)", // Dark outline for text readability
      };
    } else {
      return {
        highlightStroke: "rgba(0, 0, 0, 0.7)", // Dark stroke for light theme
        labelText: "black", // Black text for light theme
        labelStroke: "rgba(255, 255, 255, 0.9)", // Light outline for light theme
      };
    }
  }

  public destroy(): void {
    this.layer.clear();
  }

  public onResize(): void {
    // Clear the layer to ensure clean redraw after resize
    this.layer.clear();
    // Note: The layer dimensions are updated by the parent GPSMetricsWaveform
    // This method ensures the layer is cleared and ready for redrawing
  }
}
