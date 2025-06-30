import type { Layer } from "../Composition/Layer";
import type { GPSData } from "../types";
import type { Renderer, RenderContext } from "./Renderer";

export interface BadgeOptions {
  text?: string;
  color?: string;
  background?: string;
  borderColor?: string;
  font?: string;
  padding?: { top: number; right: number; bottom: number; left: number };
  margin?: { top: number; right: number; bottom: number; left: number };
}

export class Badge implements Renderer<BadgeOptions> {
  private layer: Layer;
  private _config: Required<BadgeOptions>;

  constructor(layer: Layer, text: string, options?: BadgeOptions) {
    this.layer = layer;

    this._config = {
      text: text ?? options?.text ?? "",
      color: options?.color ?? "white",
      background: options?.background ?? "rgba(0,0,0,0.5)",
      borderColor: options?.borderColor ?? "rgba(255,255,255,0.ba)",
      font: options?.font ?? "10px Arial",
      padding: options?.padding ?? { top: 2, right: 4, bottom: 2, left: 4 },
      margin: options?.margin ?? { top: 5, right: 5, bottom: 5, left: 5 },
    };
  }

  public get config(): Required<BadgeOptions> {
    return this._config;
  }

  public updateConfig(config: Partial<BadgeOptions>): void {
    Object.assign(this._config, config);
  }

  public draw(context: RenderContext, _data: GPSData): void {
    this.layer.context.textBaseline = "middle";
    this.layer.context.textAlign = "left";

    const textWidth = this.layer.context.measureText(this._config.text).width;
    const badgeWidth = textWidth + this._config.padding.left + this._config.padding.right;
    const badgeHeight = 14; // Simple fixed height
    const x = context.width - badgeWidth - this._config.margin.right;
    const y = this._config.margin.top;

    // Draw background
    this.layer.fillStyle = this._config.background;
    this.layer.fillRect(x, y, badgeWidth, badgeHeight);

    // Draw border
    this.layer.strokeStyle = this._config.borderColor;
    this.layer.lineWidth = 1;
    this.layer.strokeRect(x, y, badgeWidth, badgeHeight);

    // Draw text
    this.layer.fillStyle = this._config.color;
    const textX = x + this._config.padding.left;
    const textY = y + badgeHeight / 2;
    this.layer.fillText(this._config.text, textX, textY);
  }

  public getWidth(): number {
    const ctx = this.layer.context;
    ctx.save();
    ctx.font = this._config.font;
    const textMetrics = ctx.measureText(this._config.text);
    ctx.restore();
    return textMetrics.width + this._config.padding.left + this._config.padding.right;
  }

  public destroy(): void {
    this.layer.clear();
  }

  public onResize(): void {
    // No special resize handling needed
  }
}
