// biome-ignore-all lint/correctness/noUnusedPrivateClassMembers: AudioUltra; skip unsafe removal
import type { Layer } from "../Layer";
import { clamp } from "../../Common/Utils";
import { ComputationQueue, type DetailedComputationProgress, TaskPriority } from "../../Common/Worker/ComputationQueue";
import {
  MAX_LINEAR_DISPLAY_BINS,
  MAX_LOG_DISPLAY_BINS,
  MAX_MEL_DISPLAY_BINS,
  PRECACHE,
  SEAM_GAP_FILL,
  SPECTROGRAM_BUFFER_NORMAL_SEC,
  SPECTROGRAM_BUFFER_NORMAL_WINDOWS,
  SPECTROGRAM_CACHE_CLEAR_FACTOR,
  SPECTROGRAM_FFT_CACHE_MAX_ENTRIES,
  SPECTROGRAM_HIGH_BATCH_SIZE,
  SPECTROGRAM_MAX_COMPUTATIONS,
  SPECTROGRAM_NORMAL_BATCH_SIZE,
  RATE_LIMITED_RENDER_FPS,
} from "../constants";
import { LRUCache } from "../../Common/LRUCache";
import type { FFTProcessor, SpectrogramScale } from "../../Analysis/FFTProcessor";
import type { ColorMapper, ColorScheme } from "../ColorMapper";
import type { WindowFunctionType } from "../WindowFunctions";
import { downsampleLinear, downsampleLog, downsampleMel } from "./Downsampler";
import { ProgressRendererPlugin } from "./Plugins/ProgressRendererPlugin";
import { GridRendererPlugin } from "./Plugins/GridRendererPlugin";
import type { RenderContext, Renderer } from "./Renderer";
import type { WaveformAudio } from "../../Media/WaveformAudio";
import type { RendererPlugin } from "./Plugins/RendererPlugin";
import { RateLimitedRenderer } from "./RateLimitedRenderer";

export interface SpectrogramRendererConfig {
  channelHeight: number;
  spectrogramMinDb: number;
  spectrogramScale: SpectrogramScale;
  spectrogramHopFactor: number;
  colorMapper: ColorMapper;
  fftCache: Map<number, LRUCache<number, Float32Array>>;
  spectrogramColorScheme: ColorScheme;
  spectrogramMaxDb: number;
  numberOfMelBands: number;
  fftSamples: number;
  windowFunction: WindowFunctionType;
}

export class SpectrogramRenderer implements Renderer<SpectrogramRendererConfig> {
  public config: SpectrogramRendererConfig;
  private audio?: WaveformAudio;
  private readonly onRenderTransfer?: () => void;
  public spectrogramDrawing = false;
  public forceCachedExcedLimit = 0;
  // Spectrogram state moved from Visualizer
  public spectrogramMinDb: number;
  public spectrogramScale: SpectrogramScale;
  public spectrogramHopFactor: number;
  public colorMapper: ColorMapper;
  public fftCache: Map<number, LRUCache<number, Float32Array>>;
  public computationQueue: ComputationQueue<void>;
  public spectrogramColorScheme: ColorScheme;
  public spectrogramMaxDb: number;
  public numberOfMelBands: number;
  public spectrogramNeedsRedraw = false;
  public fftProcessor: FFTProcessor | null = null;
  public fftSamples: number;
  public windowFunction: WindowFunctionType;
  private spectrogramHighCompleteDebounce: any = null;
  private spectrogramHighCompleteDebounceTime = 100;
  private progressRendererPlugin: ProgressRendererPlugin;
  private gridRendererPlugin: GridRendererPlugin;
  private plugins: RendererPlugin[];
  public lastSpectrogramRenderedWidth = 0;
  public lastSpectrogramRenderedZoom = 0;
  public lastSpectrogramRenderedScrollLeftPx = 0;
  private isDestroyed = false;
  private lastRenderContext?: RenderContext;
  private readonly spectrogram: Layer;
  private readonly progressContainer: HTMLElement;
  private rateLimitedRenderer: RateLimitedRenderer;

  constructor(
    progressContainer: HTMLElement,
    spectrogram: Layer,
    gridLayer: Layer,
    config: SpectrogramRendererConfig,
    onRenderTransfer?: () => void,
  ) {
    this.config = config;
    this.spectrogram = spectrogram;
    this.gridLayer = gridLayer;
    this.onRenderTransfer = onRenderTransfer;
    this.progressContainer = progressContainer;
    // The spectrogram renderer requires a lower fps to accommodate the spectrogram rendering and maintain a smooth experience
    // with the waveform renderer, and other external tags.
    this.rateLimitedRenderer = new RateLimitedRenderer(RATE_LIMITED_RENDER_FPS / 4);
    // Move all config fields to this.config
    this.spectrogramMinDb = config.spectrogramMinDb;
    this.spectrogramScale = config.spectrogramScale;
    this.spectrogramHopFactor = config.spectrogramHopFactor;
    this.colorMapper = config.colorMapper;
    this.fftCache = config.fftCache;
    this.spectrogramColorScheme = config.spectrogramColorScheme;
    this.spectrogramMaxDb = config.spectrogramMaxDb;
    this.numberOfMelBands = config.numberOfMelBands;
    this.fftSamples = config.fftSamples;
    this.windowFunction = config.windowFunction;

    this.computationQueue = new ComputationQueue<void>({
      highBatchSize: SPECTROGRAM_HIGH_BATCH_SIZE,
      normalBatchSize: SPECTROGRAM_NORMAL_BATCH_SIZE,
      onCleared: () => {
        this.renderProgress();
        this.onRenderTransfer?.();
      },
      onProgress: (progress: DetailedComputationProgress) => {
        this.renderProgress(progress);
        this.onRenderTransfer?.();
      },
      onBatchComplete: (_batchId, metadata) => {
        if (!metadata) return;
        if (
          metadata.type === "current-view-partial" &&
          metadata.startSample !== undefined &&
          metadata.endSample !== undefined
        ) {
          this.redrawSpectrogramSliceFromCache(metadata.correlationId, metadata.startSample, metadata.endSample);
          this.onRenderTransfer?.();
        } else if (metadata.type === "current-view") {
          this.redrawSpectrogramFromCache(metadata.correlationId);
          this.onRenderTransfer?.();
        }
      },
      onAllCategoryComplete: (priority) => {
        if (priority === TaskPriority.HIGH) {
          if (this.spectrogramHighCompleteDebounce) {
            clearTimeout(this.spectrogramHighCompleteDebounce);
          }
          this.spectrogramHighCompleteDebounce = setTimeout(() => {
            this.redrawSpectrogramFromCache("all-high-complete");
            this.onRenderTransfer?.();
          }, this.spectrogramHighCompleteDebounceTime);
        }
      },
    });

    // Hook the layer updated so that we propogate the visibility change to the progress renderer plugin
    spectrogram.on("layerUpdated", () => {
      this.setVisibility(this.spectrogram.isVisible);
    });

    // Initialize the progress renderer plugin with the correct visibility, note that all the plugins depend on
    this.progressRendererPlugin = new ProgressRendererPlugin(this.progressContainer, this.colorMapper, this.fftCache, {
      visible: this.spectrogram.isVisible,
    });
    if (!gridLayer) throw new Error("Spectrogram grid layer not found");

    this.gridRendererPlugin = new GridRendererPlugin(gridLayer, this.colorMapper, {
      visible: this.spectrogram.isVisible,
      fontSize: 11,
      height: config.channelHeight,
      spectrogramScale: this.config.spectrogramScale,
    });

    // Set the spectrogramScale in the GridRendererPlugin config
    this.gridRendererPlugin.updateConfig({
      spectrogramScale: this.spectrogramScale,
    });

    this.plugins = [this.progressRendererPlugin, this.gridRendererPlugin];
  }

  public renderProgress(progress?: DetailedComputationProgress) {
    this.progressRendererPlugin.renderProgress(progress);
  }

  init(context: RenderContext, audio: WaveformAudio): void {
    this.audio = audio;
    this.lastRenderContext = context;
    // Initialize FFT processor if not already set and sampleRate is available
    if (!this.fftProcessor && audio.sampleRate) {
      import("../../Analysis/FFTProcessor").then((processor) => {
        this.fftProcessor = new processor.FFTProcessor({
          fftSamples: this.fftSamples,
          windowingFunction: this.windowFunction,
          sampleRate: audio.sampleRate,
        });
      });
    }

    for (const plugin of this.plugins) {
      plugin.init(audio, context);
    }
  }

  public draw(context: RenderContext): void {
    if (
      this.isDestroyed ||
      !this.spectrogram?.isVisible ||
      !this.audio ||
      !this.fftProcessor ||
      !this.spectrogram.isVisible
    ) {
      return;
    }
    // Use rate-limited draw for spectrogram
    this.rateLimitedRenderer.scheduleDraw(
      { context, renderer: this },
      ({ context, renderer }) => {
        renderer._draw(context);
      },
      false, // not a zoom operation
    );
  }

  private _draw(context: RenderContext): void {
    this.lastRenderContext = context;
    const scrollLeftPx = context.scrollLeftPx;
    const deltaX = scrollLeftPx - this.lastSpectrogramRenderedScrollLeftPx;
    try {
      const dataLength = this.audio?.dataLength ?? 0;
      const cacheLimitExceeded =
        this.computationQueue.getQueueSizes().high > context.width * SPECTROGRAM_CACHE_CLEAR_FACTOR;
      const needsFullRender =
        !this.audio ||
        context.width !== this.lastSpectrogramRenderedWidth ||
        context.zoom !== this.lastSpectrogramRenderedZoom ||
        this.spectrogramNeedsRedraw ||
        Math.abs(deltaX) >= context.width ||
        cacheLimitExceeded;

      if (needsFullRender || deltaX > 0) {
        this.computationQueue.cancelBatchesByPriority([TaskPriority.NORMAL, TaskPriority.LOW]);
      }

      if (needsFullRender) {
        if (cacheLimitExceeded) this.forceCachedExcedLimit += 1;
        this.computationQueue.clear();
        this.spectrogram.clear();
        const hopSize = this._getCurrentHopSize();
        if (!this.fftProcessor) return;
        const fftSize = this.fftProcessor.fftSamples;
        const visibleStartSample = Math.floor(clamp(scrollLeftPx * context.samplesPerPx, 0, dataLength));
        const visibleEndSample = Math.ceil(
          clamp(visibleStartSample + context.width * context.samplesPerPx, 0, dataLength),
        );
        const highStart = visibleStartSample;
        const highEnd = visibleEndSample;
        const visibleWindowSamples = highEnd - highStart;
        const tasksScheduled = this._scheduleSpectrogramTasks(
          highStart,
          highEnd,
          TaskPriority.HIGH,
          hopSize,
          fftSize,
          dataLength,
          "current-view",
          SPECTROGRAM_HIGH_BATCH_SIZE,
        );

        if (tasksScheduled === 0) {
          this.redrawSpectrogramFromCache("all-in-cache");
        }

        if (PRECACHE && this.audio) {
          const sampleRate = this.audio.sampleRate;
          const normalBufferSamples = Math.max(
            visibleWindowSamples,
            Math.round(SPECTROGRAM_BUFFER_NORMAL_SEC * sampleRate),
          );
          const normalStart = highEnd;
          const normalEnd = normalStart + normalBufferSamples;
          this._scheduleSpectrogramTasks(
            normalStart,
            normalEnd,
            TaskPriority.NORMAL,
            hopSize,
            fftSize,
            dataLength,
            "precache-view-normal",
            SPECTROGRAM_NORMAL_BATCH_SIZE,
          );
        }

        this.lastSpectrogramRenderedScrollLeftPx = scrollLeftPx;
        this.lastSpectrogramRenderedWidth = context.width;
        this.lastSpectrogramRenderedZoom = context.zoom;
        this.spectrogramNeedsRedraw = false;
      } else if (Math.abs(deltaX) > 0) {
        const shiftAmount = -deltaX;
        this.spectrogram.shift(shiftAmount, 0);
        this.lastSpectrogramRenderedScrollLeftPx = scrollLeftPx;
        const iStart = Math.floor(clamp(scrollLeftPx * context.samplesPerPx, 0, dataLength));
        const iEnd = Math.ceil(clamp(iStart + context.width * context.samplesPerPx, 0, dataLength));
        const sampleDiff = Math.round(deltaX * context.samplesPerPx);
        let sliceStartSample: number;
        let sliceEndSample: number;
        const seamPxSamples = Math.ceil(context.samplesPerPx * SEAM_GAP_FILL);
        if (deltaX > 0) {
          sliceStartSample = Math.max(0, iEnd - sampleDiff - seamPxSamples);
          sliceEndSample = iEnd;
        } else {
          sliceStartSample = iStart;
          sliceEndSample = Math.min(dataLength, iStart - sampleDiff + seamPxSamples);
        }
        const bufferSamples = 0;
        sliceStartSample = Math.floor(clamp(sliceStartSample - bufferSamples, 0, dataLength));
        sliceEndSample = Math.ceil(clamp(sliceEndSample + bufferSamples, 0, dataLength));
        const tasksScheduled = this.schedulePartialSpectrogramComputations(sliceStartSample, sliceEndSample);
        if (tasksScheduled === 0) {
          this.redrawSpectrogramSliceFromCache("all-in-cache", sliceStartSample, sliceEndSample);
        }
      } else {
        this.redrawSpectrogramFromCache("delta-0");
      }
    } catch (error) {
      console.warn(`Error during spectrogram sync/schedule phase:${error}`);
    }

    for (const plugin of this.plugins) {
      plugin.render(context);
    }

    // Call transfer immediately since we want to show the waveform updates right away
    this.onRenderTransfer?.();
  }

  destroy(): void {
    this.fftProcessor?.dispose();
    this.fftProcessor = null;
  }

  renderFFTData(fftData: Float32Array | null, layer: Layer, channelHeight: number, x: number, zero: number) {
    const pixelX = Math.floor(x);
    if (!fftData) {
      layer.save();
      layer.fillStyle = "rgba(128, 128, 128, 0.05)";
      layer.fillRect(pixelX, Math.floor(zero), 1, Math.ceil(channelHeight));
      layer.restore();
      return;
    }
    // Downsample for a linear scale
    const scale = this.spectrogramScale;
    let displayData = fftData;
    if (scale === "linear") {
      const bins = Math.min(MAX_LINEAR_DISPLAY_BINS, fftData.length);
      displayData = downsampleLinear(fftData, bins);
    } else if (scale === "log") {
      const bins = Math.min(MAX_LOG_DISPLAY_BINS, fftData.length);
      displayData = downsampleLog(fftData, bins);
    } else if (scale === "mel") {
      const bins = Math.min(MAX_MEL_DISPLAY_BINS, fftData.length);
      displayData = downsampleMel(fftData, bins);
    }
    const binCount = displayData.length;
    if (binCount <= 0 || channelHeight <= 0) return;
    const minDb = this.spectrogramMinDb;
    const maxDb = this.spectrogramMaxDb;
    const dbRange = maxDb - minDb;
    if (dbRange <= 0) return;
    for (let i = 0; i < binCount; i++) {
      const magnitude = displayData[i];
      const magDB = 10 * Math.log10(Math.max(1e-9, magnitude));
      const normalizedDb = Math.max(0, Math.min(1, (magDB - minDb) / dbRange));
      const color = this.colorMapper.magnitudeToColor(normalizedDb);
      let yTop: number;
      let yBottom: number;
      let binHeight: number;
      switch (scale) {
        case "log": {
          const logTotal = Math.log(binCount + 1);
          const logCurrent = Math.log(i + 1);
          const logNext = Math.log(i + 2);
          yBottom = zero + channelHeight * (1 - logCurrent / logTotal);
          yTop = zero + channelHeight * (1 - logNext / logTotal);
          binHeight = yBottom - yTop;
          break;
        }
        case "linear":
          yBottom = zero + channelHeight * (1 - i / binCount);
          yTop = zero + channelHeight * (1 - (i + 1) / binCount);
          binHeight = channelHeight / binCount;
          break;
        default:
          yBottom = zero + channelHeight * (1 - i / binCount);
          yTop = zero + channelHeight * (1 - (i + 1) / binCount);
          binHeight = channelHeight / binCount;
          break;
      }
      const rectHeight = Math.max(1, Math.ceil(binHeight));
      layer.fillStyle = color;
      layer.fillRect(pixelX, Math.floor(yTop), 1, rectHeight);
    }
  }

  renderSpectrogramSlice(
    layer: Layer,
    channelHeight: number,
    iStart: number,
    iEnd: number,
    channelNumber: number,
    startX = 0,
  ) {
    if (
      !this.lastRenderContext ||
      !this.audio ||
      channelHeight <= 0 ||
      this.lastRenderContext.samplesPerPx <= 0 ||
      !this.fftProcessor
    ) {
      return;
    }
    const samplesPerPx = this.lastRenderContext.samplesPerPx;
    const width = this.lastRenderContext.width;
    const hopSize = this._getCurrentHopSize();
    const fftSize = this.fftProcessor.fftSamples;
    const fftWindowHalf = Math.floor(fftSize / 2);
    const zero = channelNumber * channelHeight;
    layer.save();
    const pixelStartX = Math.max(0, Math.floor(startX));
    const numSamplesInSlice = iEnd - iStart;
    const sliceWidthInPixels = Math.ceil(numSamplesInSlice / samplesPerPx);
    const pixelEndX = Math.min(width, pixelStartX + sliceWidthInPixels);

    for (let x = pixelStartX; x < pixelEndX; x++) {
      const centerSample = iStart + (x - pixelStartX + 0.5) * samplesPerPx;
      const hopIndex = Math.max(0, Math.floor((centerSample - fftWindowHalf) / hopSize + 0.5));
      const hopStartSample = hopIndex * hopSize;
      const hopSpectrum = this.getFFTFromCache(channelNumber, hopStartSample);
      if (hopSpectrum !== null) {
        this.renderFFTData(hopSpectrum, layer, channelHeight, x, zero);
      }
    }
    layer.restore();
  }

  private _scheduleSpectrogramTasks(
    startSample: number,
    endSample: number,
    priority: TaskPriority,
    hopSize: number,
    fftSize: number,
    dataLength: number,
    metaType: string,
    batchSize?: number,
  ): number {
    const tasks: { id: string; priority: TaskPriority; taskFn: () => any }[] = [];
    if (!this.audio) return 0;
    // Ensure integer sample indices
    const intStartSample = Math.floor(startSample);
    const intEndSample = Math.ceil(endSample);
    for (let channelIndex = 0; channelIndex < this.audio.channelCount; channelIndex++) {
      const startHop = Math.floor((intStartSample - Math.floor(fftSize / 2)) / hopSize);
      const endHop = Math.ceil((intEndSample + Math.floor(fftSize / 2)) / hopSize);
      for (let hopIndex = startHop; hopIndex <= endHop; hopIndex++) {
        const hopStartSample = hopIndex * hopSize;
        if (hopStartSample + fftSize > dataLength || hopStartSample < 0) continue;
        const hopKey = `${channelIndex}:${hopStartSample}`;
        if (!this.hasFFTInCache(channelIndex, hopStartSample)) {
          tasks.push({
            id: hopKey,
            priority,
            taskFn: () => this.calculateHopSpectrum(channelIndex, hopStartSample),
          });
        }
      }
    }
    if (tasks.length > 0) {
      const correlationId = `${metaType}-${priority}-${intStartSample}-${intEndSample}`;
      const meta: any = {
        type: metaType,
        priority,
        startSample: intStartSample,
        endSample: intEndSample,
        correlationId,
      };
      if (batchSize !== undefined) meta.batchSize = batchSize;
      this.computationQueue.addBatch(tasks, meta);
    }
    return tasks.length;
  }

  schedulePartialSpectrogramComputations(sliceStartSample: number, sliceEndSample: number): number {
    if (!this.lastRenderContext || !this.audio || !this.fftProcessor || sliceStartSample >= sliceEndSample) return 0;
    const fftSize = this.fftProcessor.fftSamples;
    const dataLength = this.lastRenderContext.dataLength;
    const hopSize = this._getCurrentHopSize();

    // Ensure integer sample indices
    const intSliceStartSample = Math.floor(sliceStartSample);
    const intSliceEndSample = Math.ceil(sliceEndSample);

    // Only count high-priority (visible slice) tasks for the return value
    const highTasks = this._scheduleSpectrogramTasks(
      intSliceStartSample,
      intSliceEndSample,
      TaskPriority.HIGH,
      hopSize,
      fftSize,
      dataLength,
      "current-view-partial",
    );

    if (PRECACHE) {
      // Use max(window-based, sec-based) buffer windows, contiguous
      const sampleRate = this.audio.sampleRate;
      const visibleWindowSec = (this.lastRenderContext.width * this.lastRenderContext.samplesPerPx) / sampleRate;
      const normalBufferSec = this.getBufferDurationSec(
        SPECTROGRAM_BUFFER_NORMAL_WINDOWS,
        SPECTROGRAM_BUFFER_NORMAL_SEC,
        visibleWindowSec,
      );
      const normalBufferSamples = Math.round(sampleRate * normalBufferSec);
      // NORMAL: next buffer window (immediately after HIGH)
      const normalStart = intSliceEndSample;
      const normalEnd = normalStart + normalBufferSamples;
      this._scheduleSpectrogramTasks(
        normalStart,
        normalEnd,
        TaskPriority.NORMAL,
        hopSize,
        fftSize,
        dataLength,
        "precache-view-normal",
        SPECTROGRAM_NORMAL_BATCH_SIZE,
      );
    }

    return highTasks;
  }

  public _getCurrentHopSize(): number {
    if (!this.lastRenderContext || !this.audio) return 0;
    if (!this.fftProcessor) {
      return Math.max(1, Math.floor(this.fftSamples / this.spectrogramHopFactor));
    }
    const samplesPerPx = this.lastRenderContext.samplesPerPx;
    const width = this.lastRenderContext.width;
    const dataLength = this.audio?.dataLength ?? 0;
    // Compute visible sample range
    const scrollLeftPx = this.lastRenderContext.scrollLeftPx;
    const visibleStartSample = Math.floor(clamp(scrollLeftPx * samplesPerPx, 0, dataLength));
    const visibleEndSample = Math.ceil(clamp(visibleStartSample + width * samplesPerPx, 0, dataLength));
    const visibleLen = visibleEndSample - visibleStartSample;
    // Cap the number of computations
    const maxComputations = Math.min(width, SPECTROGRAM_MAX_COMPUTATIONS);
    return Math.max(1, Math.floor(visibleLen / maxComputations));
  }

  private hasFFTInCache(channelIndex: number, hopStartSample: number): boolean {
    if (!this.fftCache.has(channelIndex)) return false;
    return this.fftCache.get(channelIndex)!.has(hopStartSample);
  }

  public getFFTFromCache(channelIndex: number, hopStartSample: number): Float32Array | null {
    if (!this.hasFFTInCache(channelIndex, hopStartSample)) return null;
    return this.fftCache.get(channelIndex)!.get(hopStartSample) || null;
  }

  private calculateHopSpectrum(channelIndex: number, hopStartSample: number): Float32Array | null {
    if (!this.lastRenderContext || !this.audio || !this.fftProcessor) return null;
    const fftSize = this.fftProcessor.fftSamples;
    const dataLength = this.lastRenderContext.dataLength;
    const requiredEndSample = hopStartSample + fftSize;
    if (requiredEndSample > dataLength) {
      return null;
    }
    const buffer = this.getChannelDataSlice(channelIndex, hopStartSample, requiredEndSample);
    if (!buffer) return null;
    const linearSpectrum = this.fftProcessor.calculatePowerSpectrum(buffer);
    if (!linearSpectrum) return null;
    let finalSpectrum: Float32Array | null = null;
    if (this.spectrogramScale === "mel") {
      finalSpectrum = this.fftProcessor.convertToMelScale(linearSpectrum, this.numberOfMelBands);
    } else if (this.spectrogramScale === "log") {
      finalSpectrum = linearSpectrum;
    } else {
      finalSpectrum = linearSpectrum;
    }
    if (finalSpectrum) {
      if (!this.fftCache.has(channelIndex)) {
        this.fftCache.set(channelIndex, new LRUCache<number, Float32Array>(SPECTROGRAM_FFT_CACHE_MAX_ENTRIES));
      }
      this.fftCache.get(channelIndex)!.set(hopStartSample, finalSpectrum);
    }
    return finalSpectrum;
  }

  public redrawSpectrogramFromCache(correlationId?: string) {
    if (!this.lastRenderContext) return;
    const c = this.lastRenderContext;
    const scrollLeftPx = this.lastRenderContext?.scrollLeftPx;
    const iStart = clamp(scrollLeftPx * c.samplesPerPx, 0, c.dataLength);
    const iEnd = clamp(iStart + c.width * c.samplesPerPx, 0, c.dataLength);
    this.redrawSpectrogramSliceFromCache(correlationId, iStart, iEnd);
  }

  public redrawSpectrogramSliceFromCache(_correlationId: string | undefined, startSample: number, endSample: number) {
    if (!this.lastRenderContext || this.isDestroyed || !this.spectrogram?.isVisible || !this.audio) return;

    if (this.spectrogramDrawing) return console.warn("redrawSpectrogramSliceFromCache already running.");
    this.spectrogramDrawing = true;

    try {
      const dataLength = this.lastRenderContext.dataLength;
      const scrollLeftPx = this.lastRenderContext.scrollLeftPx;
      const samplesPerPx = this.lastRenderContext.samplesPerPx;
      const clampedStart = clamp(startSample, 0, dataLength);
      const clampedEnd = clamp(Math.ceil(endSample), 0, dataLength);
      const startX = clampedStart / samplesPerPx - scrollLeftPx;
      for (let channelIndex = 0; channelIndex < this.audio!.channelCount; channelIndex++) {
        this.renderSpectrogramSlice(
          this.spectrogram,
          this.config.channelHeight,
          clampedStart,
          clampedEnd,
          channelIndex,
          startX,
        );
      }
    } catch (error) {
      console.error("Error during redrawSpectrogramSliceFromCache:", error);
    } finally {
      this.spectrogramDrawing = false;
    }
  }

  // Move getChannelDataSlice from Visualizer
  private getChannelDataSlice(channelIndex: number, startSample: number, endSample: number): Float32Array | null {
    if (
      !this.audio ||
      !this.audio.chunks ||
      !this.audio.chunks[channelIndex] ||
      startSample >= endSample ||
      channelIndex < 0 ||
      channelIndex >= this.audio.channelCount
    ) {
      return null;
    }
    const sourceChunks = this.audio.chunks[channelIndex];
    const requestedLength = endSample - startSample;
    const outputBuffer = new Float32Array(requestedLength);
    let currentSampleOffset = 0;
    for (const sourceChunk of sourceChunks) {
      const chunkStartSample = currentSampleOffset;
      const chunkEndSample = chunkStartSample + sourceChunk.length;
      const overlapStart = Math.max(startSample, chunkStartSample);
      const overlapEnd = Math.min(endSample, chunkEndSample);
      if (overlapStart < overlapEnd) {
        const copyLength = overlapEnd - overlapStart;
        const sourceStartIndex = overlapStart - chunkStartSample;
        const outputStartIndex = overlapStart - startSample;
        if (
          sourceStartIndex >= 0 &&
          sourceStartIndex + copyLength <= sourceChunk.length &&
          outputStartIndex >= 0 &&
          outputStartIndex + copyLength <= outputBuffer.length
        ) {
          const segment = sourceChunk.subarray(sourceStartIndex, sourceStartIndex + copyLength);
          outputBuffer.set(segment, outputStartIndex);
        } else {
          console.error("getChannelDataSlice: Calculated indices out of bounds during copy.");
        }
      }
      currentSampleOffset = chunkEndSample;
      if (chunkEndSample >= endSample) {
        break;
      }
    }
    return outputBuffer;
  }

  public getForceClearCount(): number {
    return this.forceCachedExcedLimit ?? 0;
  }

  public getCurrentHopSize(): number {
    return this._getCurrentHopSize();
  }

  /**
   * Returns the buffer duration in seconds, as the max of (windows * visibleWindowSec) and sec.
   */
  private getBufferDurationSec(windows: number, sec: number, visibleWindowSec: number): number {
    return Math.max(windows * visibleWindowSec, sec);
  }

  updateConfig(config: Partial<SpectrogramRendererConfig>): void {
    // Track which properties are changing
    const shouldClearCache =
      (config.spectrogramScale !== undefined && config.spectrogramScale !== this.spectrogramScale) ||
      (config.spectrogramHopFactor !== undefined && config.spectrogramHopFactor !== this.spectrogramHopFactor) ||
      (config.colorMapper !== undefined && config.colorMapper !== this.colorMapper) ||
      (config.fftCache !== undefined && config.fftCache !== this.fftCache) ||
      (config.fftSamples !== undefined && config.fftSamples !== this.fftSamples) ||
      (config.windowFunction !== undefined && config.windowFunction !== this.windowFunction) ||
      (config.numberOfMelBands !== undefined && config.numberOfMelBands !== this.numberOfMelBands);
    // Note: minDb, maxDb, and spectrogramColorScheme are intentionally excluded

    this.config = { ...this.config, ...config };
    if (config.spectrogramMinDb !== undefined) this.spectrogramMinDb = config.spectrogramMinDb;
    if (config.spectrogramScale !== undefined) this.spectrogramScale = config.spectrogramScale;
    if (config.spectrogramHopFactor !== undefined) this.spectrogramHopFactor = config.spectrogramHopFactor;
    if (config.colorMapper !== undefined) this.colorMapper = config.colorMapper;
    if (config.fftCache !== undefined) this.fftCache = config.fftCache;
    if (config.spectrogramColorScheme !== undefined) this.spectrogramColorScheme = config.spectrogramColorScheme;
    if (config.spectrogramMaxDb !== undefined) this.spectrogramMaxDb = config.spectrogramMaxDb;
    if (config.numberOfMelBands !== undefined) this.numberOfMelBands = config.numberOfMelBands;
    if (config.fftSamples !== undefined) this.fftSamples = config.fftSamples;
    if (config.windowFunction !== undefined) this.windowFunction = config.windowFunction;

    // Mark for redraw and trigger redraw logic
    this.spectrogramNeedsRedraw = true;
    if (shouldClearCache) {
      this.fftCache.clear();
    }

    // Update all plugins with the new configuration
    for (const plugin of this.plugins) {
      plugin.updateConfig(config);
    }
  }

  public resetRenderState() {
    this.lastSpectrogramRenderedWidth = 0;
    this.lastSpectrogramRenderedZoom = 0;
    this.lastSpectrogramRenderedScrollLeftPx = 0;
    this.spectrogramNeedsRedraw = true;
  }

  /**
   * Set the visibility of the spectrogram and its progress overlay in a single place.
   */
  public setVisibility(visible: boolean) {
    if (!this.spectrogram) return;

    // Update all plugins with the new visibility
    for (const plugin of this.plugins) {
      plugin.updateConfig({ visible });
    }

    // this.resetRenderState();
    // this.draw(this.lastRenderContext!);
  }

  // Add onResize to reset state and delegate to plugins
  onResize() {
    this.resetRenderState();
    for (const plugin of this.plugins) {
      if (typeof plugin.onResize === "function") {
        plugin.onResize();
      }
    }
  }
}
