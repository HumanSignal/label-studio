import type { Layer } from "../Composition/Layer";
import type { GPSData, GPSPoint } from "../types";
import type { Renderer, RenderContext } from "./Renderer";
import type { Interactive } from "../Interaction/Interactive";

// Helper functions remain the same...
function formatTimeLabel(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  let str = "";
  if (h > 0) str += `${h.toString().padStart(2, "0")}:`;
  str += `${m.toString().padStart(2, "0")}:`;
  str += `${s.toString().padStart(2, "0")}`;
  return str;
}

function formatValueLabel(value: number, suffix = ""): string {
  const digits = suffix === "m" ? 0 : 2; // Limit to 2 decimal places for non-meter values
  const formatted = value.toFixed(digits);
  // Remove unnecessary trailing zeros and decimal point
  const cleaned = formatted.replace(/\.?0+$/, "");
  return `${cleaned}${suffix}`;
}

export type AxisMode = "full" | "x-only" | "y-only";

export interface GridOptions {
  axisMode?: AxisMode;
  yLabelSuffix?: string;
  lineColor?: string;
  lineWidth?: number;
  labelColor?: string;
  approxYTicks?: number;
  approxXTicks?: number;
  lineDash?: number[];
  xLabelFormatter?: (value: number) => string;
  yLabelFormatter?: (value: number) => string;
  borderColor?: string;
  borderWidth?: number;
  metric?: keyof GPSPoint;
  // Callbacks for interactivity
  onHover?: (x: number, y: number) => void;
  onHoverExit?: () => void;
  onClick?: (x: number, y: number) => void;
}

function defaultXLabelFormatter(value: number): string {
  const formatted = value.toFixed(2);
  // Remove unnecessary trailing zeros and decimal point
  const cleaned = formatted.replace(/\.?0+$/, "");
  return cleaned + "s";
}
function defaultYLabelFormatter(value: number): string {
  const formatted = value.toFixed(2);
  // Remove unnecessary trailing zeros and decimal point
  return formatted.replace(/\.?0+$/, "");
}

export class Grid implements Renderer<GridOptions>, Interactive {
  private layer: Layer;
  private _config: Required<GridOptions>;
  private isHovering = false;

  constructor(layer: Layer, options?: GridOptions) {
    this.layer = layer;
    this._config = {
      axisMode: options?.axisMode ?? "x-only",
      yLabelSuffix: options?.yLabelSuffix ?? "",
      lineColor: options?.lineColor ?? "#e0e0e0",
      lineWidth: options?.lineWidth ?? 1,
      labelColor: options?.labelColor ?? "",
      approxYTicks: options?.approxYTicks ?? 4, // Reduced from 5 to 4 for less cramped labels
      approxXTicks: options?.approxXTicks ?? 10, // Reduced from 20 to 15 for less cramped labels
      lineDash: options?.lineDash ?? [4, 4],
      xLabelFormatter: options?.xLabelFormatter ?? defaultXLabelFormatter,
      yLabelFormatter: options?.yLabelFormatter ?? ((v) => formatValueLabel(v, options?.yLabelSuffix)),
      borderColor: options?.borderColor ?? "",
      borderWidth: options?.borderWidth ?? 1,
      metric: options?.metric ?? "altitude",
      onHover: options?.onHover ?? (() => {}),
      onHoverExit: options?.onHoverExit ?? (() => {}),
      onClick: options?.onClick ?? (() => {}),
    };
  }

  // --- Interactive Implementation ---
  zIndex = 0;

  hitTest(x: number, y: number): boolean {
    // Grid is only interactive if a callback is provided.
    if (!this._config.onHover && !this._config.onClick) return false;
    // Interaction area is the entire layer this grid is drawn on.
    return x >= 0 && x <= this.layer.width && y >= 0 && y <= this.layer.height;
  }

  onPointerHover(e: PointerEvent): void {
    // Use the same coordinate conversion as InteractionManager
    const canvas = e.currentTarget as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    this._config.onHover?.(x, y);
    this.isHovering = true;
  }

  onHoverChange(isHovering: boolean): void {
    this.isHovering = isHovering;
    if (!this.isHovering) {
      this._config.onHoverExit?.();
    }
  }

  onPointerDown(e: PointerEvent): boolean {
    if (this.isHovering) {
      // Use the same coordinate conversion as InteractionManager
      const canvas = e.currentTarget as HTMLCanvasElement;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this._config.onHover?.(x, y);
    }
    return false;
  }
  onPointerUp(e: PointerEvent): boolean {
    if (this.isHovering && this._config.onClick) {
      // Use the same coordinate conversion as InteractionManager
      const canvas = e.currentTarget as HTMLCanvasElement;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this._config.onClick(x, y);
      return true; // Consume the event
    }
    return false;
  }

  onPointerMove(e: PointerEvent): boolean {
    if (this.isHovering) {
      // Use the same coordinate conversion as InteractionManager
      const canvas = e.currentTarget as HTMLCanvasElement;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      this._config.onHover?.(x, y);
    }
    return false;
  }

  // --- End of Interactive Implementation ---

  get config(): Required<GridOptions> {
    return this._config;
  }

  // The original draw logic, which still uses this.waveform.
  // This is acceptable as per our discussion, as we are only changing the *interaction*.
  public draw(context: RenderContext, data: GPSData): void {
    const timeStart = context.scrollLeftPx / context.zoom;
    const timeEnd = timeStart + context.width / context.zoom;

    let yMin = 0;
    let yMax = 1;

    if (this._config.axisMode === "full" || this._config.axisMode === "y-only") {
      // Use metric ranges from context (required for synchronization)
      if (context.metricRanges && context.metricRanges[this._config.metric]) {
        const metricRange = context.metricRanges[this._config.metric]!;
        yMin = metricRange.min;
        yMax = metricRange.max;
      }
      // No fallback - metric ranges must be provided in context for proper synchronization
    } else if (data.points && data.points.length > 0) {
      // For x-only grids, we don't need specific metric ranges
      yMin = Math.min(...data.points.map((p) => p.altitude ?? 0));
      yMax = Math.max(...data.points.map((p) => p.altitude ?? 1));
    }

    if (yMin === yMax) {
      yMax = yMin + 1;
    }

    this.drawGrid({ start: timeStart, end: timeEnd }, { min: yMin, max: yMax });
  }

  // This method remains unchanged.
  private drawGrid(visibleTimeRange: { start: number; end: number }, valueRange: { min: number; max: number }) {
    this.layer.clear();
    this.layer.save();

    const { width, height } = this.layer;
    const { start: timeStart, end: timeEnd } = visibleTimeRange;
    const { min: valueMin, max: valueMax } = valueRange;
    const timeDuration = timeEnd - timeStart;
    let valueDuration = valueMax - valueMin;

    if (this._config.borderWidth > 0 && this._config.borderColor) {
      this.layer.strokeStyle = this._config.borderColor;
      this.layer.lineWidth = this._config.borderWidth;
      this.layer.strokeRect(0, 0, width, height);
    }

    this.layer.strokeStyle = this._config.lineColor;
    this.layer.lineWidth = this._config.lineWidth;
    this.layer.fillStyle = this._config.labelColor;
    this.layer.font = "10px Arial";
    if (this._config.lineDash) {
      this.layer.context.setLineDash(this._config.lineDash);
    } else {
      this.layer.context.setLineDash([]);
    }

    if (valueDuration === 0 && (this._config.axisMode === "full" || this._config.axisMode === "y-only")) {
      const padding = Math.abs(valueMin * 0.1) || 0.5;
      const adjustedMin = valueMin - padding;
      const adjustedMax = valueMax + padding;
      valueDuration = adjustedMax - adjustedMin;
      if (this._config.axisMode === "full" || this._config.axisMode === "y-only") {
        if (valueDuration > 0 || (adjustedMin === adjustedMax && valueMin === valueMax)) {
          const yTicks = this._calculateNiceTicks(adjustedMin, adjustedMax, this._config.approxYTicks);
          yTicks.forEach((value) => {
            const y = height - ((value - adjustedMin) / valueDuration) * height;
            this.layer.beginPath();
            this.layer.moveTo(0, y);
            this.layer.lineTo(width, y);
            this.layer.stroke();
            const label = this._config.yLabelFormatter(value);
            if (y - 5 > 0 && y + 5 < height) {
              this.layer.fillStyle = this._config.labelColor;
              this.layer.fillText(label, 5, y - 5);
            }
          });
        }
      }
    }

    if (this._config.axisMode === "full" || this._config.axisMode === "x-only") {
      if (timeDuration > 0) {
        const xTicks = this._calculateNiceTicks(timeStart, timeEnd, this._config.approxXTicks);
        xTicks.forEach((time) => {
          const x = ((time - timeStart) / timeDuration) * width;
          this.layer.beginPath();
          this.layer.moveTo(x, 0);
          this.layer.lineTo(x, height);
          this.layer.stroke();
          const label = this._config.xLabelFormatter(time);
          const textWidth = this.layer.context.measureText(label).width;
          if (x - textWidth / 2 > 0 && x + textWidth / 2 < width) {
            this.layer.fillStyle = this._config.labelColor;
            this.layer.fillText(label, x - textWidth / 2, height - 5);
          }
        });
      }
    }

    if (this._config.axisMode === "full" || this._config.axisMode === "y-only") {
      if (valueDuration > 0) {
        const yTicks = this._calculateNiceTicks(valueMin, valueMax, this._config.approxYTicks);
        yTicks.forEach((value) => {
          const y = height - ((value - valueMin) / valueDuration) * height;
          this.layer.beginPath();
          this.layer.moveTo(0, y);
          this.layer.lineTo(width, y);
          this.layer.stroke();
          const label = this._config.yLabelFormatter(value);
          if (y - 5 > 0 && y + 5 < height) {
            this.layer.fillStyle = this._config.labelColor;
            this.layer.fillText(label, 5, y - 5);
          }
        });
      }
    }

    this.layer.restore();
  }

  // _calculateNiceTicks remains unchanged
  private _calculateNiceTicks(minValue: number, maxValue: number, approxTicks: number): number[] {
    if (minValue === maxValue) {
    }
    if (maxValue < minValue) {
      [minValue, maxValue] = [maxValue, minValue];
    }
    const range = maxValue - minValue;
    if (range === 0) {
    }
    const rawStep = range / Math.max(1, approxTicks - 1);
    const exponent = Math.floor(Math.log10(rawStep));
    const mantissa = rawStep / Math.pow(10, exponent);
    let niceMantissa: number;
    if (mantissa < 1.5) niceMantissa = 1;
    else if (mantissa < 2.25) niceMantissa = 2;
    else if (mantissa < 3.5) niceMantissa = 2.5;
    else if (mantissa < 7.5) niceMantissa = 5;
    else niceMantissa = 10;
    const niceStep = niceMantissa * Math.pow(10, exponent);
    const firstTick = Math.ceil(minValue / niceStep) * niceStep;
    const lastTick = Math.floor(maxValue / niceStep) * niceStep;
    const ticks: number[] = [];
    for (let currentTick = firstTick; currentTick <= lastTick + niceStep * 0.5; currentTick += niceStep) {
      if (
        ticks.length > 0 &&
        currentTick > maxValue + niceStep * 0.5 &&
        Math.abs(ticks[ticks.length - 1] - maxValue) < niceStep * 0.1
      ) {
        break;
      }
      ticks.push(Number.parseFloat(currentTick.toPrecision(10)));
    }
    if (ticks.length === 0) {
      ticks.push(Number.parseFloat(minValue.toPrecision(10)));
      if (maxValue !== minValue) ticks.push(Number.parseFloat(maxValue.toPrecision(10)));
    }
    return ticks;
  }

  public updateConfig(config: Partial<GridOptions>): void {
    Object.assign(this._config, config);
  }

  public destroy(): void {
    this.layer.clear();
  }

  public onResize(): void {}
}
