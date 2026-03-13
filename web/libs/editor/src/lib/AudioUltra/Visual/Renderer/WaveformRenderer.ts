// biome-ignore-all lint/correctness/noUnusedPrivateClassMembers: AudioUltra; skip unsafe removal
import type { Layer } from "../Layer";
import { averageMinMax, clamp } from "../../Common/Utils";
import type { Renderer, RenderContext } from "./Renderer";
import type { WaveformAudio } from "../../Media/WaveformAudio";
import { RateLimitedRenderer } from "./RateLimitedRenderer";
import { CACHE_RENDER_THRESHOLD } from "../constants";
import { isFF, FF_AUDIO_SPECTROGRAMS } from "../../../../utils/feature-flags";

const isAudioSpectrograms = isFF(FF_AUDIO_SPECTROGRAMS);
export interface WaveformRendererConfig {
  renderId: number;
  waveHeight: number;
  padding?: { top?: number; bottom?: number; left?: number; right?: number };
  reservedSpace?: number;
  waveColor?: any;
  backgroundColor?: any;
  middleLineColor?: any;
  amp?: number;
  // Add any other configurable options for waveform rendering here
}

export interface WaveformRendererConstructorConfig {
  layer: Layer;
  backgroundLayer: Layer;
  config: WaveformRendererConfig;
  onRenderTransfer?: () => void;
}

export class WaveformRenderer implements Renderer<WaveformRendererConfig> {
  public config: WaveformRendererConfig;
  private readonly layer: Layer;
  private readonly backgroundLayer: Layer;
  private readonly onRenderTransfer?: () => void;
  private audio?: WaveformAudio;
  private rateLimitedRenderer: RateLimitedRenderer;

  constructor({ layer, backgroundLayer, config, onRenderTransfer }: WaveformRendererConstructorConfig) {
    this.layer = layer;
    this.backgroundLayer = backgroundLayer;
    this.config = config;
    this.onRenderTransfer = onRenderTransfer;
    this.rateLimitedRenderer = new RateLimitedRenderer();
  }

  init(_context: RenderContext, audio: WaveformAudio): void {
    this.audio = audio;
  }

  draw(context: RenderContext): void {
    this.lastRenderContext = context;
    this.drawMiddleLine();

    this.rateLimitedRenderer.scheduleDraw(
      { context, renderer: this },
      ({ context, renderer }) => {
        const audio = renderer.audio;
        const layer = renderer.layer;
        if (!audio || !layer || !layer.isVisible) {
          renderer.lastWaveformRenderedWidth = 0;
          return;
        }

        const dataLength = context.dataLength;
        const scrollLeftPx = context.scrollLeftPx;
        const samplesPerPx = context.samplesPerPx;
        const iStart = clamp(scrollLeftPx * samplesPerPx, 0, dataLength);
        const iEnd = clamp(iStart + context.width * samplesPerPx, 0, dataLength);
        const renderableData = iEnd - iStart;
        const zoom = context.zoom;
        const amp = renderer.config.amp ?? 1;
        const deltaX = scrollLeftPx - renderer.lastWaveformRenderedScrollLeftPx;
        const waveformWillFullRender = isAudioSpectrograms
          ? Math.abs(deltaX) >= context.width
          : renderableData < CACHE_RENDER_THRESHOLD;

        if (
          context.width !== renderer.lastWaveformRenderedWidth ||
          zoom !== renderer.lastWaveformRenderedZoom ||
          amp !== renderer.lastRenderedAmp ||
          waveformWillFullRender
        ) {
          for (let i = 0; i < audio.channelCount; i++) {
            renderer.renderWave(context, i, layer, iStart, iEnd);
          }
        } else {
          renderer.renderPartialWave(context, layer, iStart, iEnd, deltaX);
        }
      },
      false,
    );
  }

  destroy(): void {
    this.isDestroyed = true;
    this.rateLimitedRenderer.reset();
  }

  public lastRenderedAmp = 0;
  public lastWaveformRenderedWidth = 0;
  public lastWaveformRenderedZoom = 0;
  public lastWaveformRenderedScrollLeftPx = 0;

  renderWave(context: RenderContext, channelNumber: number, layer: Layer, iStart: number, iEnd: number): boolean {
    const renderId = this.config.renderId;
    const audio = this.audio;
    const height = this.config.waveHeight;
    const scrollLeftPx = context.scrollLeftPx;
    const zoom = context.zoom;
    const amp = this.config.amp ?? 1;
    const x = 0;
    if (!audio) return false;
    if (channelNumber === 0) {
      layer.clear();
    }
    // Ensure full opacity for waveform drawing
    const renderIterator = this.renderSlice(layer, height, iStart, iEnd, channelNumber, x, context);
    const render = () => {
      if (this.config.renderId !== renderId) return false;
      const next = renderIterator.next();
      if (!next.done) {
        requestAnimationFrame(render);
      } else {
        this.lastWaveformRenderedWidth = context.width;
        this.lastWaveformRenderedZoom = zoom;
        this.lastRenderedAmp = amp;
        this.lastWaveformRenderedScrollLeftPx = scrollLeftPx;
        this.onRenderTransfer?.();
        return true;
      }
    };
    render();
    return false;
  }

  renderPartialWave(context: RenderContext, layer: Layer, iStart: number, iEnd: number, deltaX: number) {
    const renderId = this.config.renderId;
    let x = 0;
    const audio = this.audio;
    const channelCount = audio?.channelCount ?? 1;
    const height = this.config.waveHeight;
    const scrollLeftPx = context.scrollLeftPx;
    const dataLength = context.dataLength;
    this.lastWaveformRenderedScrollLeftPx = scrollLeftPx;
    const samplesPerPx = context.samplesPerPx;
    const shiftAmount = -deltaX;
    const sampleDiff = Math.round(deltaX * samplesPerPx);
    layer.shift(shiftAmount, 0);
    for (let channelNumber = 0; channelNumber < channelCount; channelNumber++) {
      let sStart = iStart;
      let sEnd = iEnd;
      if (deltaX > 0) {
        sStart = iEnd - sampleDiff;
        x = clamp(context.width + shiftAmount - 2, 0, context.width);
      } else {
        sEnd = iStart - sampleDiff;
        x = 0;
      }
      sEnd = clamp(sEnd + samplesPerPx * 2, 0, dataLength);
      const renderIterator = this.renderSlice(layer, height, sStart, sEnd, channelNumber, x, context);
      const render = () => {
        if (this.config.renderId !== renderId) return;
        const next = renderIterator.next();
        if (!next.done) {
          requestAnimationFrame(render);
        } else {
          if (context && context.notifyRenderComplete) context.notifyRenderComplete();
          this.onRenderTransfer?.();
        }
      };
      render();
    }
  }

  *renderSlice(
    layer: Layer,
    height: number,
    iStart: number,
    iEnd: number,
    channelNumber: number,
    x = 0,
    context: RenderContext,
  ): Generator<any, void, any> {
    const audio = this.audio;
    const bufferChunks = audio?.chunks?.[channelNumber];
    if (!bufferChunks) return;
    const bufferChunkSize = bufferChunks.length;
    const paddingTop = this.config.padding?.top ?? 0;
    const paddingLeft = this.config.padding?.left ?? 0;
    const zero = height * channelNumber + (this.config.reservedSpace ?? 0);
    const y = zero + paddingTop + height / 2;
    let total = 0;
    layer.save();
    const waveColor = this.config.waveColor?.toString?.() ?? "#000";
    layer.strokeStyle = waveColor;
    layer.fillStyle = waveColor;
    layer.lineWidth = 1;
    layer.beginPath();
    layer.moveTo(x, y);
    const now = performance.now();
    for (let i = 0; i < bufferChunkSize; i++) {
      const slice = bufferChunks[i];
      const sliceLength = slice.length;
      const chunkStart = Math.floor(clamp(iStart - total, 0, sliceLength));
      const chunkEnd = Math.ceil(clamp(iEnd - total, 0, sliceLength));
      total += sliceLength;
      try {
        const chunks = slice.slice(chunkStart, chunkEnd);
        const l = chunks.length - 1;
        let i = l + 1;
        while (i > 0) {
          const index = l - i;
          const chunk = chunks.slice(index, index + context.samplesPerPx);
          if (now - performance.now() > 10) {
            yield;
          }
          if (x >= 0 && chunk.length > 0) {
            this.renderChunk(chunk, layer, height, x + paddingLeft, zero, context);
          }
          x += 1;
          i = clamp(i - context.samplesPerPx, 0, l);
        }
      } catch {
        // Ignore any out-of-bounds errors if they occur
      }
    }
    layer.stroke();
    layer.restore();
  }

  renderChunk(
    chunk: Float32Array,
    layer: Layer,
    height: number,
    offset: number,
    zero: number,
    _context: RenderContext,
  ) {
    layer.save();
    const renderable = averageMinMax(chunk);
    const amp = this.config.amp ?? 1;
    renderable.forEach((val: number) => {
      const H2 = height / 2;
      const H = val * amp * H2;
      layer.lineTo(offset + 1, zero + H2 + H);
    });
    layer.restore();
  }

  updateConfig(config: Partial<WaveformRendererConfig>): void {
    this.config = { ...this.config, ...config };
  }

  public resetRenderState() {
    this.lastRenderedAmp = 0;
    this.lastWaveformRenderedWidth = 0;
    this.lastWaveformRenderedZoom = 0;
    this.lastWaveformRenderedScrollLeftPx = 0;
  }

  public drawMiddleLine() {
    const layer = this.backgroundLayer;
    layer.clear();
    if (!layer.isVisible) return;

    // Fill background (optional, can be commented out if not needed)
    if (this.config.backgroundColor) {
      layer.save();
      layer.fillStyle = this.config.backgroundColor.toString?.() ?? "#fff";
      layer.fillRect(0, 0, layer.width, layer.height);
      layer.restore();
    }

    // Draw the middle line
    const y = this.config.waveHeight / 2;
    layer.save();
    layer.strokeStyle = this.config.middleLineColor?.toString?.() ?? "#888";
    layer.lineWidth = 1;
    layer.beginPath();
    layer.moveTo(0, y);
    layer.lineTo(layer.width, y);
    layer.stroke();
    layer.restore();
  }

  onResize() {
    this.resetRenderState();
  }
}
