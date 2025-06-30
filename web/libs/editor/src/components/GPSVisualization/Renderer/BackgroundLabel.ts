import type { Layer } from "../Composition/Layer";
import type { GPSData } from "../types";
import type { Renderer, RenderContext } from "./Renderer";

export interface BackgroundLabelOptions {
  text?: string;
  color?: string;
  font?: string;
  opacity?: number;
  position?: "center" | "left" | "right";
  verticalPosition?: "center" | "top" | "bottom";
}

export class BackgroundLabel implements Renderer<BackgroundLabelOptions> {
  private layer: Layer;
  private _config: Required<BackgroundLabelOptions>;

  constructor(layer: Layer, text: string, options?: BackgroundLabelOptions) {
    this.layer = layer;

    this._config = {
      text: text ?? options?.text ?? "",
      color: options?.color ?? "rgba(128, 128, 128, 0.3)",
      font: options?.font ?? "bold 48px Arial",
      opacity: options?.opacity ?? 0.3,
      position: options?.position ?? "center",
      verticalPosition: options?.verticalPosition ?? "center",
    };
  }

  public get config(): Required<BackgroundLabelOptions> {
    return this._config;
  }

  public updateConfig(config: Partial<BackgroundLabelOptions>): void {
    Object.assign(this._config, config);
  }

  public draw(context: RenderContext, _data: GPSData): void {
    const ctx = this.layer.context;

    ctx.save();

    // Set font and measure text
    ctx.font = this._config.font;
    ctx.textBaseline = "middle";

    const textMetrics = ctx.measureText(this._config.text);
    const textWidth = textMetrics.width;
    const textHeight = textMetrics.actualBoundingBoxAscent + textMetrics.actualBoundingBoxDescent;

    // Calculate position
    let x: number;
    switch (this._config.position) {
      case "left":
        ctx.textAlign = "left";
        x = 60; // Larger margin from left to clear y-axis labels
        break;
      case "right":
        ctx.textAlign = "right";
        x = context.width - 20; // Small margin from right
        break;
      case "center":
      default:
        ctx.textAlign = "center";
        x = context.width / 2;
        break;
    }

    let y: number;
    const layerHeight = this.layer.height;
    switch (this._config.verticalPosition) {
      case "top":
        y = textHeight / 2 + 20; // Small margin from top
        break;
      case "bottom":
        y = layerHeight - textHeight / 2 - 20; // Small margin from bottom
        break;
      case "center":
      default:
        y = layerHeight / 2;
        break;
    }

    // Set color with opacity
    ctx.fillStyle = this._config.color;
    ctx.globalAlpha = this._config.opacity;

    // Draw the text
    ctx.fillText(this._config.text, x, y);

    ctx.restore();
  }

  public destroy(): void {
    this.layer.clear();
  }

  public onResize(): void {
    // No special resize handling needed
  }
}
