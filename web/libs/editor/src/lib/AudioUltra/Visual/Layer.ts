import { clamp, OFFSCREEN_CANVAS_SUPPORTED } from '../Common/Utils';
import { Events } from '../Common/Events';
import { LayerGroup } from './LayerGroup';

export type CanvasCompositeOperation =
  | 'source-over'
  | 'source-in'
  | 'source-out'
  | 'source-atop'
  | 'destination-over'
  | 'destination-in'
  | 'destination-out'
  | 'destination-atop'
  | 'lighter'
  | 'copy'
  | 'xor'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'hard-light'
  | 'soft-light'
  | 'difference'
  | 'exclusion'
  | 'hue'
  | 'saturation'
  | 'color'
  | 'luminosity';

export interface RendererOptions {
  container: HTMLElement;
  group?: LayerGroup;
  name: string;
  height?: number;
  offscreen?: boolean;
  pixelRatio?: number;
  index?: number;
  compositeOperation?: CanvasCompositeOperation;
  compositeAsGroup?: boolean;
  opacity?: number;
  isVisible?: boolean;
}

interface LayerEvents {
  layerUpdated: (layer: Layer) => void;
}

export type RenderingContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export type TextMetricKeys = keyof TextMetrics;

const USE_FALLBACK = false;

const textMetricKeys: TextMetricKeys[] = [
  'actualBoundingBoxAscent',
  'actualBoundingBoxDescent',
  'actualBoundingBoxLeft',
  'actualBoundingBoxRight',
  'fontBoundingBoxAscent',
  'fontBoundingBoxDescent',
  'width',
];

export class Layer extends Events<LayerEvents> {
  private container: HTMLElement;
  private group?: LayerGroup;

  private options: RendererOptions;
  private _context!: RenderingContext;
  private _bufferContext!: RenderingContext;
  private _bufferCanvas!: HTMLCanvasElement | OffscreenCanvas;
  private compositeOperation: CanvasCompositeOperation = 'source-over';
  private compositeAsGroup = false;


  /**
   * Float value of the layer opacity between 0 and 1.
   */
  private opacity = 1;
  private pixelRatio = 1;

  name: string;

  index = 1;

  offscreen = false;

  canvas!: HTMLCanvasElement | OffscreenCanvas;

  isVisible = true;

  get context() {
    return this._context;
  }

  get width() {
    return this.canvas.width;
  }

  set width(value: number) {
    if (!this.canvas) return;

    this.canvas.width = value * this.pixelRatio;

    if (this.canvas instanceof HTMLCanvasElement) {
      this.canvas.style.width = `${value}px`;
    }
  }

  get height() {
    return this.isVisible ? this.canvas.height : 0;
  }

  set height(value: number) {
    if (!this.canvas) return;

    this.canvas.height = value * this.pixelRatio;

    if (this.canvas instanceof HTMLCanvasElement) {
      this.canvas.style.height = `${value}px`;
    }
  }

  get isGroup() {
    return false;
  }

  constructor(options: RendererOptions) {
    super();
    this.options = options;
    this.name = options.name;
    this.group = options.group ?? undefined;
    this.container = options.container;
    this.offscreen = options.offscreen ?? false;
    this.pixelRatio = options.pixelRatio ?? 1;
    this.index = options.index ?? this.index;
    this.compositeOperation = options.compositeOperation ?? this.compositeOperation;
    this.compositeAsGroup = options.compositeAsGroup ?? this.compositeAsGroup;
    this.opacity = options.opacity ?? this.opacity;
    this.isVisible = options.isVisible ?? true;

    this.createCanvas();
  }

  setVisibility(visibility: boolean) {
    this.isVisible = visibility;
    if (visibility) {
      this.context.resetTransform();
    } else {
      this.clear();
      this.context.setTransform(0, 0, 0, 0, 0, 0);
    }
    this.save();
    this.invoke('layerUpdated', [this]);
  }

  show() {
    this.setVisibility(true);
  }

  hide() {
    this.setVisibility(false);
  }

  // Methods to operate the canvas
  // Those take care of pixel ratio and stuff

  /**
   * Move the cursor to the given position
   * @param x Point X
   * @param y Point Y
   */
  moveTo(x: number, y: number) {
    this.context?.moveTo(x * this.pixelRatio, y * this.pixelRatio);
  }

  lineTo(x: number, y: number) {
    this.context?.lineTo(x * this.pixelRatio, y * this.pixelRatio);
  }

  fillRect(x: number, y: number, width: number, height: number) {
    this.context?.fillRect(x * this.pixelRatio, y * this.pixelRatio, width * this.pixelRatio, height * this.pixelRatio);
  }

  roundRect(x: number, y: number, width: number, height: number, radius: number) {
    this.context?.beginPath();
    this.context?.roundRect(x * this.pixelRatio, y * this.pixelRatio, width * this.pixelRatio, height * this.pixelRatio, radius);
    this.context?.fill();
  }

  fillText(text: string, x: number, y: number, maxWidth?: number) {
    this.context?.fillText(text, x * this.pixelRatio, y * this.pixelRatio, maxWidth);
  }

  fitText(text: string, x: number, y: number, maxWidth: number) {
    if (!this.context) return;
    const finalWidth = maxWidth / this.pixelRatio;
    const ellipsisWidth = this.measureText('...').width;
    let textWidth = this.measureText(text).width;
    let finalText = text;

    if (textWidth <= finalWidth || textWidth <= ellipsisWidth) {
      finalText = text;
    } else {
      let len = text.length;

      while (textWidth >= finalWidth - ellipsisWidth && len-- > 0) {
        finalText = text.substring(0, len);
        textWidth = this.measureText(finalText).width;
      }

      finalText += '...';
    }

    this.fillText(finalText, x, y, maxWidth);
  }

  measureText(text: string) {
    if (!this.context) return { width: 0 };

    const data = this.context.measureText(text);

    const result: Partial<Record<TextMetricKeys, number>> = {};

    textMetricKeys.forEach(key => {
      result[key as TextMetricKeys] = data[key];
    });

    return result as Record<TextMetricKeys, number>;
  }

  save() {
    this.context?.save();
  }

  restore() {
    this.context?.restore();
  }

  beginPath() {
    this.context?.beginPath();
  }

  closePath() {
    this.context?.closePath();
  }

  stroke() {
    this.context?.stroke();
  }

  fill() {
    this.context?.fill();
  }

  copyToBuffer() {
    this.createBufferCanvas();

    // Copy the current canvas to the buffer
    this._bufferContext.imageSmoothingEnabled = false;
    this._bufferContext.clearRect(0, 0, this._bufferCanvas.width, this._bufferCanvas.height);
    this._bufferContext.drawImage(this.canvas, 0, 0);
  }

  restoreFromBuffer(x = 0, y = 0) {
    // Clear the current canvas
    this.clear();

    // Draw the buffer canvas to the current canvas shifted by x and y
    this.context.drawImage(this._bufferCanvas, x * this.pixelRatio, y * this.pixelRatio);
  }

  shift(x: number, y: number) {
    this.copyToBuffer();

    this.restoreFromBuffer(x, y);
  }

  set strokeStyle(color: string | CanvasGradient | CanvasPattern) {
    if (!this.context) return;
    this.context.strokeStyle = color;
  }

  get strokeStyle() {
    if (!this.context) return '';
    return this.context.strokeStyle;
  }

  set fillStyle(color: string | CanvasGradient | CanvasPattern) {
    if (!this.context) return;
    this.context.fillStyle = color;
  }

  get fillStyle() {
    if (!this.context) return '';
    return this.context.fillStyle;
  }

  set lineWidth(width: number) {
    if (!this.context) return;
    this.context.lineWidth = width * this.pixelRatio;
  }

  get lineWidth() {
    if (!this.context) return 0;
    return this.context.lineWidth / this.pixelRatio;
  }

  set font(font: string) {
    if (!this.context) return;
    this.context.font = font;
  }

  get font() {
    if (!this.context) return '';
    return this.context.font;
  }

  clear() {
    if (this.context) {
      this.context.globalAlpha = this.compositeAsGroup ? clamp(this.opacity * 1.5, 0, 1) : this.opacity;
      this.context.globalCompositeOperation = this.compositeOperation;
      this.context.imageSmoothingEnabled = false;
      this.context.clearRect(0, 0, this.width, this.height);
    }
  }

  remove() {
    if (this.canvas instanceof HTMLCanvasElement) {
      this.canvas.remove();
    }
  }

  appendTo(container: HTMLElement) {
    this.container = container;
    if (!this.offscreen && this.canvas instanceof HTMLCanvasElement) {
      container.appendChild(this.canvas);
    }
  }

  transferTo(targetCanvas: Layer | HTMLCanvasElement) {
    try {
      if (!this.canvas) return;

      let context: RenderingContext | null;

      let targetOpacity = 1;

      if (targetCanvas instanceof Layer) {
        context = targetCanvas.context;
        targetOpacity = targetCanvas.opacity;
      } else {
        context = targetCanvas.getContext('2d');
      }

      if (!context) return;

      if (this.compositeAsGroup) {
        context.globalAlpha = this.opacity;
      }

      if (this.height > 0 && this.width > 0) {
        context.drawImage(this.canvas, 0, 0, this.width, this.height);
      }

      if (this.compositeAsGroup) {
        context.globalAlpha = targetOpacity;
      }
    } catch (e) {
      console.error(e);
    }
  }

  setSize(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  private createCanvas() {
    if (this.group) { // Do not create canvas if it is apart of a group
      this.canvas = this.group.canvas;
      this._context = this.group.context;
      return;
    }

    if (this.offscreen) {
      this.canvas = this.createOffscreenCanvas();
    } else {
      this.canvas = this.createVisibleCanvas();
    }

    if (this.offscreen && this.canvas instanceof HTMLCanvasElement) {
      document.body.appendChild(this.canvas);
    }
  }

  private createVisibleCanvas() {
    const canvas = document.createElement('canvas');
    const { pixelRatio } = this;

    const width = this.container.clientWidth;
    const height = (this.options.height ?? 100);

    canvas.id = `waveform-layer-${this.options.name ?? 'default'}`;
    canvas.width = width * pixelRatio;
    canvas.height = this.isVisible ? height * pixelRatio : 0;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.style.visibility = this.isVisible ? 'visible' : 'hidden';

    this._context = canvas.getContext('2d')!;

    this._context.globalAlpha = this.compositeAsGroup ? clamp(this.opacity * 1.5, 0, 1) : this.opacity;
    this._context.globalCompositeOperation = this.compositeOperation;
    this._context.imageSmoothingEnabled = false;

    return canvas;
  }

  private createOffscreenCanvas() {
    let canvas: HTMLCanvasElement | OffscreenCanvas;

    if (OFFSCREEN_CANVAS_SUPPORTED && !USE_FALLBACK) {
      const { pixelRatio } = this;
      const width = this.container.clientWidth;
      const height = (this.options.height ?? 100);

      // For better performance we're using experimental
      // OffscreenCanvas as a rendering backend
      canvas = new OffscreenCanvas(width * pixelRatio, height * pixelRatio);

      this._context = canvas.getContext('2d')!;

      const globalAlpha = this.compositeAsGroup ? clamp(this.opacity * 1.5, 0, 1) : this.opacity;

      this._context.globalAlpha = globalAlpha;
      this._context.globalCompositeOperation = this.compositeOperation;
      this._context.imageSmoothingEnabled = false;
    } else {
      canvas = this.createVisibleCanvas();

      Object.assign(canvas.style, {
        right: '100%',
        bottom: '100%',
        opacity: 0,
        position: 'absolute',
        visibility: this.isVisible ? 'visible' : 'hidden',
      });
    }

    return canvas;
  }

  private createBufferCanvas() {
    if (this._bufferCanvas) return;

    let canvas: HTMLCanvasElement | OffscreenCanvas;

    if (OFFSCREEN_CANVAS_SUPPORTED && !USE_FALLBACK) {
      const { pixelRatio } = this;

      // Base this on the existing canvas size
      // Otherwise we will get possibly a missing portion of buffer content
      // if the canvas is resized while the buffer is not
      const width = this.canvas.width;
      const height = this.canvas.height;

      // For better performance we're using experimental
      // OffscreenCanvas as a rendering backend
      canvas = new OffscreenCanvas(width * pixelRatio, height * pixelRatio);

      this._bufferContext = canvas.getContext('2d')!;

      const globalAlpha = this.compositeAsGroup ? clamp(this.opacity * 1.5, 0, 1) : this.opacity;

      this._bufferContext.globalAlpha = globalAlpha;
      this._bufferContext.globalCompositeOperation = this.compositeOperation;
      this._bufferContext.imageSmoothingEnabled = false;
    } else {
      canvas = this.createVisibleCanvas();

      Object.assign(canvas.style, {
        right: '100%',
        bottom: '100%',
        opacity: 0,
        position: 'absolute',
        visibility: 'hidden',
      });
    }

    this._bufferCanvas = canvas;
  }
}
