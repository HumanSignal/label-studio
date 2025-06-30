export type CanvasCompositeOperation =
  | "source-over"
  | "source-in"
  | "source-out"
  | "source-atop"
  | "destination-over"
  | "destination-in"
  | "destination-out"
  | "destination-atop"
  | "lighter"
  | "copy"
  | "xor"
  | "multiply"
  | "screen"
  | "overlay"
  | "darken"
  | "lighten"
  | "color-dodge"
  | "color-burn"
  | "hard-light"
  | "soft-light"
  | "difference"
  | "exclusion"
  | "hue"
  | "saturation"
  | "color"
  | "luminosity";

export interface LayerOptions {
  container?: HTMLElement;
  name?: string;
  width: number;
  height: number;
  zIndex?: number;
  offscreen?: boolean;
  pointerEvents?: string;
}

export class Layer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private _width: number;
  private _height: number;
  private pixelRatio: number;
  public visible = true;
  public zIndex: number;
  public opacity = 1;
  public compositeOperation: CanvasCompositeOperation = "source-over";
  public isOffscreen: boolean;
  public isVisible = true;

  constructor(options: LayerOptions) {
    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d")!;
    this.pixelRatio = window.devicePixelRatio || 1;
    this._width = options.width;
    this._height = options.height;
    this.setSize(options.width, options.height);
    this.isOffscreen = !options.container || options.offscreen === true;
    this.zIndex = options.zIndex ?? 0;

    // Configure canvas for high DPI displays
    this.ctx.imageSmoothingEnabled = false;

    if (!this.isOffscreen && options.container) {
      this.canvas.style.position = "absolute";
      this.canvas.style.top = "0";
      this.canvas.style.left = "0";
      this.canvas.style.width = `${this._width}px`;
      this.canvas.style.height = `${this._height}px`;
      this.canvas.style.pointerEvents = options.pointerEvents ?? "none";
      options.container.appendChild(this.canvas);
    }
  }

  get width(): number {
    return this._width;
  }

  get height(): number {
    return this._height;
  }

  get context(): CanvasRenderingContext2D {
    return this.ctx;
  }

  get element(): HTMLCanvasElement {
    return this.canvas;
  }

  get devicePixelRatio(): number {
    return this.pixelRatio;
  }

  setVisibility(visibility: boolean) {
    this.isVisible = visibility;
    // Do not clear or reset the canvas when hiding as this leads to the canvas context being lost.
    if (visibility) {
      if (this.canvas instanceof HTMLCanvasElement) {
        this.canvas.style.visibility = "visible";
      }
      this.context.resetTransform();
    } else {
      if (this.canvas instanceof HTMLCanvasElement) {
        this.canvas.style.visibility = "hidden";
      }
    }
    this.save();
  }

  show() {
    this.setVisibility(true);
  }

  hide() {
    this.setVisibility(false);
  }

  setSize(width: number, height: number) {
    // Ensure minimum dimensions to prevent zero-size canvas issues
    const safeWidth = Math.max(width, 1);
    const safeHeight = Math.max(height, 1);

    this._width = safeWidth;
    this._height = safeHeight;

    // Set canvas dimensions accounting for device pixel ratio
    this.canvas.width = safeWidth * this.pixelRatio;
    this.canvas.height = safeHeight * this.pixelRatio;

    // Scale the context to ensure correct drawing operations
    this.ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);

    // If the layer is attached to the DOM, update its style dimensions too
    if (!this.isOffscreen) {
      this.canvas.style.width = `${safeWidth}px`;
      this.canvas.style.height = `${safeHeight}px`;
    }
  }

  clear(): void {
    // Clear the entire canvas accounting for pixel ratio
    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.restore();
  }

  save(): void {
    this.ctx.save();
  }

  restore(): void {
    this.ctx.restore();
  }

  beginPath(): void {
    this.ctx.beginPath();
  }

  moveTo(x: number, y: number): void {
    this.ctx.moveTo(x, y);
  }

  lineTo(x: number, y: number): void {
    this.ctx.lineTo(x, y);
  }

  stroke(): void {
    this.ctx.stroke();
  }

  fill(): void {
    this.ctx.fill();
  }

  fillRect(x: number, y: number, width: number, height: number): void {
    this.ctx.fillRect(x, y, width, height);
  }

  strokeRect(x: number, y: number, width: number, height: number): void {
    this.ctx.strokeRect(x, y, width, height);
  }

  fillText(text: string, x: number, y: number) {
    this.ctx.fillText(text, x, y);
  }

  get fillStyle(): string | CanvasGradient | CanvasPattern {
    return this.ctx.fillStyle;
  }

  set fillStyle(value: string | CanvasGradient | CanvasPattern) {
    this.ctx.fillStyle = value;
  }

  get strokeStyle(): string | CanvasGradient | CanvasPattern {
    return this.ctx.strokeStyle;
  }

  set strokeStyle(value: string | CanvasGradient | CanvasPattern) {
    this.ctx.strokeStyle = value;
  }

  get lineWidth(): number {
    return this.ctx.lineWidth;
  }

  set lineWidth(value: number) {
    this.ctx.lineWidth = value;
  }

  get font(): string {
    return this.ctx.font;
  }

  set font(value: string) {
    this.ctx.font = value;
  }

  transferTo(target: Layer, dx = 0, dy = 0, dw?: number, dh?: number) {
    const sourceWidth = this.canvas.width;
    const sourceHeight = this.canvas.height;
    const destWidth = dw ?? sourceWidth;
    const destHeight = dh ?? sourceHeight;

    // Guard against zero-dimension canvas to prevent InvalidStateError
    if (sourceWidth === 0 || sourceHeight === 0 || destWidth === 0 || destHeight === 0) {
      return; // Skip drawing if any dimension is zero
    }

    target.ctx.globalCompositeOperation = this.compositeOperation;
    target.ctx.globalAlpha = this.opacity;
    target.ctx.drawImage(this.canvas, 0, 0, sourceWidth, sourceHeight, dx, dy, destWidth, destHeight);
    target.ctx.globalCompositeOperation = "source-over";
    target.ctx.globalAlpha = 1;
  }

  destroy(): void {
    if (!this.isOffscreen && this.canvas.parentElement) {
      this.canvas.remove();
    }
  }
}
