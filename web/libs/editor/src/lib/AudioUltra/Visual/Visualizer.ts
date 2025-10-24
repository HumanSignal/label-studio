import { ff } from "@humansignal/core";
import type { WaveformAudio } from "../Media/WaveformAudio";
import { BROWSER_SCROLLBAR_WIDTH, clamp, debounce, warn } from "../Common/Utils";
import type { Waveform, WaveformOptions } from "../Waveform";
import { type CanvasCompositeOperation, Layer, type RenderingContext } from "./Layer";
import { Events } from "../Common/Events";
import { LayerGroup } from "./LayerGroup";
import { Playhead } from "./PlayHead";
import { rgba } from "../Common/Color";
import type { Cursor } from "../Cursor/Cursor";
import type { Padding } from "../Common/Style";
import type { TimelineOptions } from "../Timeline/Timeline";
import { getCurrentTheme } from "@humansignal/ui";
import "./Loader";
import type { WindowFunctionType } from "./WindowFunctions";
import { COLOR_SCHEMES, ColorMapper, type ColorScheme } from "./ColorMapper";
import { SPECTROGRAM_DEFAULTS } from "./constants";
import type { FFTProcessorOptions, SpectrogramScale } from "../Analysis/FFTProcessor";
import { WaveformRenderer } from "./Renderer/WaveformRenderer";
import { SpectrogramRenderer } from "./Renderer/SpectrogramRenderer";
import { ResizeRenderer } from "./Renderer/ResizeRenderer";
import type { LRUCache } from "../Common/LRUCache";
import type { RenderContext, Renderer } from "./Renderer/Renderer";
import { LayerM } from "./Composition/LayerM";
import { isFF, FF_AUDIO_SPECTROGRAMS } from "../../../utils/feature-flags";
import { RateLimitedRenderer } from "./Renderer/RateLimitedRenderer";
import { InteractionManager } from "../Interaction/InteractionManager";
import type { LayerInfo } from "../Interaction/InteractionManager";
import type { Interactive } from "../Interaction/Interactive";

const isSyncedBuffering = ff.isActive(ff.FF_SYNCED_BUFFERING);

interface VisualizerEvents {
  draw: (visualizer: Visualizer) => void;
  initialized: (visualizer: Visualizer) => void;
  destroy: (visualizer: Visualizer) => void;
  mouseMove: (event: MouseEvent, cursor: Cursor) => void;
  layersUpdated: (layers: Map<string, Layer>) => void;
  layerAdded: (layer: Layer) => void;
  layerRemoved: (layer: Layer) => void;
  heightAdjusted: (Visualizer: Visualizer) => void;
}

export type VisualizerOptions = Pick<
  WaveformOptions,
  | "zoomToCursor"
  | "autoCenter"
  | "splitChannels"
  | "cursorWidth"
  | "zoom"
  | "amp"
  | "padding"
  | "playhead"
  | "timeline"
  | "height"
  | "waveHeight"
  | "waveformHeight"
  | "spectrogramHeight"
  | "timelineHeight"
  | "gridWidth"
  | "gridColor"
  | "waveColor"
  | "backgroundColor"
  | "container"
  | "experimental"
> & {
  spectrogramFftSamples?: number;
  numberOfMelBands?: number;
  spectrogramWindowingFunction?: string;
  spectrogramMinDb?: number;
  spectrogramMaxDb?: number;
  spectrogramColorScheme?: string;
  spectrogramHopFactor?: number;
  spectrogramScale?: SpectrogramScale;
};

export class Visualizer extends Events<VisualizerEvents> {
  private wrapper!: HTMLElement;
  private scrollFiller!: HTMLElement;
  private layers = new Map<string, Layer>();
  private observer!: ResizeObserver;
  private currentTime = 0;
  private audio!: WaveformAudio | null;
  private zoom = 1;
  private scrollLeft = 0;
  private renderId = 0;
  private amp = 1;
  private seekLocked = false;
  private wf: Waveform;
  private waveContainer!: HTMLElement | string;
  private playheadPadding = 4;
  private zoomToCursor = false;
  private autoCenter = false;
  private splitChannels = false;
  private padding: Padding = { top: 0, bottom: 0, left: 0, right: 0 };
  private gridWidth = 1;
  private gridColor = rgba("rgba(0, 0, 0, 0.1)");
  private backgroundColor = rgba("#fff");
  private waveColor = rgba("#000");
  private waveformHeight = 32;
  private spectrogramHeight = 32;
  private timelineHeight = 20;
  private _container!: HTMLElement;
  private _loader!: HTMLElement;
  private composer?: LayerM;

  timelinePlacement: TimelineOptions["placement"] = "top";
  maxZoom = 1500;
  playhead: Playhead;
  reservedSpace = 0;
  public samplesPerPx = 0;

  private waveformRenderer!: WaveformRenderer;
  private readonly spectrogramRenderer!: SpectrogramRenderer;
  private waveformResizeRenderer!: ResizeRenderer;
  private spectrogramResizeRenderer!: ResizeRenderer;
  private renderers: Renderer[] = [];
  private rateLimitedTransfer: RateLimitedRenderer;
  private interactionManager!: InteractionManager;
  private initialSpectrogramHeight: number;
  private initialWaveformHeight: number;

  constructor(options: VisualizerOptions, waveform: Waveform) {
    super();

    const isDarkMode = getCurrentTheme() === "Dark";
    this.wf = waveform;
    this.waveContainer = options.container;
    this.waveColor = options.waveColor ? rgba(options.waveColor) : this.waveColor;
    this.padding = { ...this.padding, ...options.padding };
    this.playheadPadding = options.playhead?.padding ?? this.playheadPadding;
    this.zoomToCursor = options.zoomToCursor ?? this.zoomToCursor;
    this.autoCenter = options.autoCenter ?? this.autoCenter;
    this.splitChannels = options.splitChannels ?? this.splitChannels;
    this.waveformHeight = options.waveformHeight ?? options.height ?? options.waveHeight ?? 32;
    this.spectrogramHeight = options.spectrogramHeight ?? options.height ?? options.waveHeight ?? 32;
    // Save initial height for computing adaptive max height during resize
    this.initialWaveformHeight = this.waveformHeight;
    this.initialSpectrogramHeight = this.spectrogramHeight;
    this.timelineHeight = options.timelineHeight ?? options.timeline?.height ?? 20;
    this.timelinePlacement = options?.timeline?.placement ?? this.timelinePlacement;
    this.gridColor = options.gridColor ? rgba(options.gridColor) : this.gridColor;
    this.gridWidth = options.gridWidth ?? this.gridWidth;
    this.backgroundColor = options.backgroundColor ? rgba(options.backgroundColor) : this.backgroundColor;
    this.zoom = options.zoom ?? this.zoom;
    this.amp = options.amp ?? this.amp;
    this.playhead = new Playhead(
      {
        ...options.playhead,
        x: 0,
        color: isDarkMode ? rgba("#fff") : rgba("#000"),
        fillColor: isDarkMode ? rgba("#fff") : rgba("#BAE7FF"),
        width: options.cursorWidth ?? 2,
      },
      this,
      this.wf,
    );

    // Visualizer should handle layer and container setup
    if (this.container) {
      // Set an initial height for the container, so the progress bar is visible during loading
      const initialHeight = this.waveformHeight;
      +this.timelineHeight;
      this.container.style.height = `${initialHeight}px`;
    }
    this.createLayers();

    // Initialize interaction manager - use main canvas for events since that's where content is rendered
    const mainLayer = this.getLayer("main");
    if (!mainLayer?.canvas || !(mainLayer.canvas instanceof HTMLCanvasElement)) {
      throw new Error("Main canvas not found or not an HTMLCanvasElement");
    }

    this.interactionManager = new InteractionManager({
      container: mainLayer.canvas,
      pixelRatio: this.pixelRatio,
      getLayerInfo: this.getLayerInfo.bind(this),
    });

    // Instantiate renderers
    const waveformLayer = this.getLayer("waveform");
    const backgroundLayer = this.getLayer("background");
    if (!waveformLayer) throw new Error("Waveform layer not found");
    if (!backgroundLayer) throw new Error("Background layer not found");
    this.waveformRenderer = new WaveformRenderer({
      layer: waveformLayer,
      backgroundLayer,
      config: {
        renderId: this.renderId,
        waveHeight: this.waveformHeight,
        padding: this.padding,
        reservedSpace: this.reservedSpace,
        waveColor: this.waveColor,
      },
      onRenderTransfer: this.transferImage.bind(this),
    });

    // Initialize waveform resize renderer
    const waveformBorderLayer = this.getLayer("waveform-resize");
    if (waveformBorderLayer) {
      this.waveformResizeRenderer = new ResizeRenderer({
        layer: waveformBorderLayer,
        config: {
          borderColor: isDarkMode ? "#444" : "#ddd",
          borderWidth: 5,
          borderStyle: "solid",
          opacity: 0.3, // More visible
          hoverOpacity: 0.6, // More visible on hover
          handleColor: "#ffffff", // White for blend mode contrast
          handleOpacity: 0.8, // High opacity for visibility
          handleHoverOpacity: 1.0, // Full opacity on hover
          shadowColor: "rgba(0, 0, 0, 0.3)", // Subtle shadow
          shadowBlur: 8, // Increased from 4
          shadowOffsetX: 0,
          shadowOffsetY: 4, // Increased from 2
        },
        componentName: "waveform",
        onNeedsTransfer: this.transferImage.bind(this),
        onHeightChange: this.handleHeightChange,
      });
      // Register with interaction manager
      this.interactionManager.register(this.waveformResizeRenderer);
    }

    this.attachEvents();

    // Prepare a spectrogram-related state for SpectrogramRenderer
    const spectrogramColorScheme = (options.spectrogramColorScheme as ColorScheme) ?? COLOR_SCHEMES.VIRIDIS;
    const colorMapper = new ColorMapper(spectrogramColorScheme);
    const spectrogramScale = options.spectrogramScale ?? "mel";
    const numberOfMelBands = options.numberOfMelBands ?? SPECTROGRAM_DEFAULTS.MEL_BANDS;
    const spectrogramHopFactor = options.spectrogramHopFactor ?? 2;
    const spectrogramMinDb = options.spectrogramMinDb ?? SPECTROGRAM_DEFAULTS.MIN_DB;
    const spectrogramMaxDb = options.spectrogramMaxDb ?? SPECTROGRAM_DEFAULTS.MAX_DB;
    const fftSamples = options.spectrogramFftSamples ?? SPECTROGRAM_DEFAULTS.FFT_SAMPLES;
    const windowFunction =
      (options.spectrogramWindowingFunction as WindowFunctionType) ?? SPECTROGRAM_DEFAULTS.WINDOWING_FUNCTION;
    const fftCache = new Map<number, LRUCache<number, Float32Array>>();

    // Only initialize spectrogram renderer if feature flag is enabled
    if (isFF(FF_AUDIO_SPECTROGRAMS)) {
      this.spectrogramRenderer = new SpectrogramRenderer(
        this._container,
        this.getLayer("spectrogram")!,
        this.getLayer("spectrogram-grid")!,
        {
          channelHeight: this.channelHeight,
          spectrogramMinDb,
          spectrogramScale,
          spectrogramHopFactor,
          colorMapper,
          fftCache,
          spectrogramColorScheme,
          spectrogramMaxDb,
          numberOfMelBands,
          fftSamples,
          windowFunction,
        },
        this.transferImage.bind(this),
      );

      // Initialize spectrogram resize renderer
      const spectrogramBorderLayer = this.getLayer("spectrogram-resize");
      if (spectrogramBorderLayer) {
        this.spectrogramResizeRenderer = new ResizeRenderer({
          layer: spectrogramBorderLayer,
          config: {
            borderColor: isDarkMode ? "#444" : "#ddd",
            borderWidth: 5,
            borderStyle: "solid",
            opacity: 0.3, // More visible
            hoverOpacity: 0.6, // More visible on hover
            handleColor: "#ffffff", // White for blend mode contrast
            handleOpacity: 0.8, // High opacity for visibility
            handleHoverOpacity: 1.0, // Full opacity on hover
            shadowColor: "rgba(0, 0, 0, 0.3)", // Subtle shadow
            shadowBlur: 8, // Increased from 4
            shadowOffsetX: 0,
            shadowOffsetY: 4, // Increased from 2
          },
          componentName: "spectrogram",
          onNeedsTransfer: this.transferImage.bind(this),
          onHeightChange: this.handleHeightChange,
        });
        // Register with interaction manager
        this.interactionManager.register(this.spectrogramResizeRenderer);
      }
    }

    this.rateLimitedTransfer = new RateLimitedRenderer();
  }

  init(audio: WaveformAudio) {
    this.init = () => warn("Visualizer is already initialized");
    this.audio = audio;
    this.setLoading(false);

    // This triggers the resize observer when loading in differing heights
    // as a result of multichannel or differently configured waveformHeight
    this.setContainerHeight();

    // Update regions layer height to match the current visualizer height
    const regionsLayer = this.getLayer("regions");
    if (regionsLayer) {
      regionsLayer.height = this.height;
    }

    // Check if we have decoded data
    const hasDecodedData = this.wf.params.decoderType !== "none";

    if (hasDecodedData) {
      // Set renderers array - only add waveform renderers if we have decoded data
      this.renderers = [this.waveformRenderer];
      if (this.waveformResizeRenderer) {
        this.renderers.push(this.waveformResizeRenderer);
      }
      if (isFF(FF_AUDIO_SPECTROGRAMS) && this.spectrogramRenderer) {
        this.renderers.push(this.spectrogramRenderer);
        if (this.spectrogramResizeRenderer) {
          this.renderers.push(this.spectrogramResizeRenderer);
        }
      }

      // Dynamically set maxZoom so you can zoom to 1:1 (one sample per pixel)
      if (this.audio && this.width > 0) {
        this.maxZoom = Math.max(1, Math.ceil(this.audio.dataLength / this.width));
      }
    } else {
      // No decoded data
      this.renderers = [];
    }

    // Compose all layers together so that we cache the composition of the layers.
    this.createComposer();

    // Listen for timeline visibility changes to regenerate playhead
    const timelineLayer = this.getLayer("timeline");
    if (timelineLayer) {
      timelineLayer.on("layerUpdated", this.playhead.onInit.bind(this.playhead));
    }

    // Update the playhead position
    this.playhead.onInit();

    // Initialize all renderers generically
    for (const renderer of this.renderers) {
      renderer.init(
        {
          scrollLeftPx: this.getScrollLeftPx(),
          width: this.width,
          zoom: this.zoom,
          samplesPerPx: this.samplesPerPx,
          dataLength: this.dataLength,
        },
        this.audio,
      );
    }

    this.invoke("initialized", [this]);
    setTimeout(() => this.draw(), 10);
  }

  private createComposer() {
    const regionsM = LayerM.lift(this.layers.get("regions")!);
    const timelineM = LayerM.lift(this.layers.get("timeline")!);

    const waveform = LayerM.overlay([
      LayerM.lift(this.layers.get("background")!),
      LayerM.lift(this.layers.get("waveform")!),
      LayerM.lift(this.layers.get("waveform-resize")!),
    ]);
    let waveFormAndSpectrogram = waveform;

    if (isFF(FF_AUDIO_SPECTROGRAMS)) {
      const spectrogram = LayerM.overlay([
        LayerM.lift(this.layers.get("spectrogram")!),
        LayerM.lift(this.layers.get("spectrogram-grid")!),
        LayerM.lift(this.layers.get("spectrogram-resize")!),
        LayerM.lift(this.layers.get("progress")!),
      ]);
      // Stack waveform and spectrogram vertically
      waveFormAndSpectrogram = waveform.above(spectrogram);
    }

    // Add timeline padding if visible
    const waveFormAndSpectrogramWithTimeline = LayerM.ifM(
      timelineM.props.isVisible,
      waveFormAndSpectrogram.shift(0, this.timelineHeight),
      waveFormAndSpectrogram,
    );

    // Create final composition with all layers
    this.composer = LayerM.overlay([timelineM, waveFormAndSpectrogramWithTimeline, regionsM]);
  }

  setLoading(loading: boolean) {
    if (loading) {
      this._loader = document.createElement("loading-progress-bar");
      this._container.appendChild(this._loader);
    } else {
      this._container.removeChild(this._loader);
    }
  }

  setLoadingProgress(loaded?: number, total?: number, completed?: boolean) {
    if (this._loader) {
      if (completed) {
        (this._loader as any).total = (this._loader as any).loaded;
      } else {
        if (loaded !== undefined) (this._loader as any).loaded = loaded;
        if (total !== undefined) (this._loader as any).total = total;
      }
      (this._loader as any).update();
    }
  }

  setDecodingProgress(chunk?: number, total?: number) {
    if (this._loader) {
      if (chunk !== undefined) (this._loader as any).loaded = chunk;
      if (total !== undefined) (this._loader as any).total = total;
      (this._loader as any).update();
    }
  }

  setError(error: string) {
    if (this._loader) {
      (this._loader as any).error = error;
      (this._loader as any).update();
    }
  }

  setZoom(value: number) {
    this.zoom = clamp(value, 1, this.maxZoom);

    if (this.zoomToCursor) {
      this.centerToCurrentTime();
    } else {
      this.updatePosition();
    }
    this.getSamplesPerPx();
    this.updateScrollFiller();

    this.wf.invoke("zoom", [this.zoom]);

    this.draw();
  }

  getZoom() {
    return this.zoom;
  }

  setScrollLeft(value: number) {
    const maxScroll = this.scrollWidth / this.fullWidth;
    const clamped = clamp(value, 0, maxScroll);
    this.wrapper.scrollLeft = clamped * this.fullWidth;
  }

  _setScrollLeft(value: number, _redraw = true) {
    const maxScroll = this.scrollWidth / this.fullWidth;
    this.scrollLeft = clamp(value, 0, maxScroll);
    this.draw();
  }

  getScrollLeft() {
    return this.scrollLeft;
  }

  getScrollLeftPx() {
    return this.scrollLeft * this.fullWidth;
  }

  lockSeek() {
    this.seekLocked = true;
  }

  unlockSeek() {
    this.seekLocked = false;
  }

  drawRequestId: number | null = null;
  drawRequestDry = true;
  draw(dry = false) {
    if (!isSyncedBuffering) {
      this._draw(dry);
      return;
    }
    if (this.drawRequestId) {
      this.drawRequestDry = this.drawRequestDry && dry;
    } else {
      this.drawRequestDry = dry;
      this.drawRequestId = requestAnimationFrame(() => {
        this.drawRequestId = null;
        if (this.isDestroyed) return;
        this._draw(this.drawRequestDry);
      });
    }
  }

  _draw(dry = false) {
    if (this.isDestroyed) return;
    if (!dry) {
      // Center to the current time if playing and autoCenter are enabled
      if (this.wf.playing && this.autoCenter) {
        this.centerToCurrentTime();
      }
      // Render all available channels using the renderer
      this.renderAvailableChannels();
    }

    this.invoke("draw", [this]);

    // Ensure compositing is always done after all drawing
    this.transferImage();
  }

  destroy() {
    if (this.isDestroyed) return;

    this.invoke("destroy", [this]);
    this.clear();
    this.playhead.destroy();
    this.audio = null;
    // Call the destroy on all renderers
    for (const renderer of this.renderers) {
      renderer.destroy();
    }
    // Destroy resize renderers specifically
    if (this.waveformResizeRenderer) {
      this.waveformResizeRenderer.destroy();
    }
    if (this.spectrogramResizeRenderer) {
      this.spectrogramResizeRenderer.destroy();
    }
    this.removeEvents();
    this.layers.forEach((layer) => layer.remove());
    this.wrapper.remove();

    // Destroy interaction manager
    if (this.interactionManager) {
      this.interactionManager.destroy();
    }

    super.destroy();
  }

  clear() {
    this.layers.get("main")?.clear();
    this.transferImage();
  }

  centerToCurrentTime() {
    if (this.zoom === 1) {
      this.setScrollLeft(0);
      return;
    }

    const offset = this.width / 2 / this.zoomedWidth;

    this.setScrollLeft(clamp(this.currentTime - offset, 0, 1));
  }

  /**
   * Update the visual render of the cursor in isolation
   */
  updateCursorToTime(time: number) {
    this.playhead.updatePositionFromTime(time);
  }

  /**
   * Render the visible range of waveform channels to the canvas
   */
  public renderAvailableChannels() {
    if (!this.audio) return;

    const renderContext: RenderContext = {
      scrollLeftPx: this.getScrollLeftPx(),
      width: this.width,
      zoom: this.zoom,
      samplesPerPx: this.samplesPerPx,
      dataLength: this.dataLength,
    };

    for (const renderer of this.renderers) {
      renderer.draw(renderContext);
    }
  }

  get pixelRatio() {
    return window.devicePixelRatio;
  }

  get width() {
    return this.container.clientWidth;
  }

  get waveformLayerHeight() {
    if (this.splitChannels && this.audio?.channelCount) {
      return this.waveformHeight * this.audio.channelCount;
    }
    return this.waveformHeight;
  }

  get spectrogramLayerHeight() {
    if (this.splitChannels && this.audio?.channelCount) {
      return this.spectrogramHeight * this.audio.channelCount;
    }
    return this.spectrogramHeight;
  }

  get timelineComponentHeight() {
    return this.timelineHeight;
  }

  get height() {
    let height = 0;
    const timelineLayer = this.getLayer("timeline");
    const waveformLayer = this.getLayer("waveform");
    const spectrogramLayer = this.getLayer("spectrogram");

    // If the timeline layer doesn't exist yet, assume it's visible and use timelineHeight
    height += timelineLayer === undefined ? this.timelineHeight : timelineLayer.isVisible ? this.timelineHeight : 0;
    height += waveformLayer?.isVisible ? this.waveformLayerHeight : 0;
    height += spectrogramLayer?.isVisible ? this.spectrogramLayerHeight : 0;

    return height;
  }

  get scrollWidth() {
    return this.zoomedWidth - this.width;
  }

  get fullWidth() {
    return this.zoomedWidth;
  }

  get zoomedWidth() {
    return this.width * this.zoom;
  }

  get container() {
    if (this._container) return this._container;

    let result: HTMLElement | null = null;

    if (this.waveContainer instanceof HTMLElement) {
      result = this.waveContainer;
    } else if (typeof this.waveContainer === "string") {
      result = document.querySelector(this.waveContainer as string);
    }

    if (!result) throw new Error("Container element does not exist.");

    result.style.position = "relative";

    this._container = result;

    return result;
  }

  protected createLayers() {
    const { container } = this;

    this.wrapper = document.createElement("div");
    this.wrapper.style.height = "100%";

    const mainLayer = this.createLayer({ name: "main" });
    this.createLayer({
      name: "background",
      offscreen: true,
      zIndex: 0,
      isVisible: false,
      height: this.waveformLayerHeight,
    });
    this.createLayer({
      name: "waveform",
      offscreen: true,
      zIndex: 100,
      height: this.waveformLayerHeight,
    });
    this.createLayer({
      name: "waveform-resize",
      offscreen: true,
      zIndex: 200,
      height: this.waveformLayerHeight,
      compositeOperation: "difference", // Use blend mode for better visibility
    });

    // Create spectrogram layers only if feature flag is enabled
    if (isFF(FF_AUDIO_SPECTROGRAMS)) {
      this.createLayer({
        name: "spectrogram",
        offscreen: true,
        zIndex: 100,
        isVisible: true,
        height: this.spectrogramLayerHeight,
      });
      this.createLayer({
        name: "spectrogram-resize",
        offscreen: true,
        zIndex: 200,
        isVisible: true,
        height: this.spectrogramLayerHeight,
        compositeOperation: "difference", // Use blend mode for better visibility
      });
      this.createLayer({
        name: "progress",
        offscreen: true,
        zIndex: 1020,
        isVisible: true,
        height: 0,
      });
      this.createLayer({
        name: "spectrogram-grid",
        offscreen: true,
        zIndex: 1100,
        isVisible: true,
        height: this.spectrogramLayerHeight,
      });
    }

    // Regions only
    this.createLayerGroup({
      name: "regions",
      offscreen: true,
      zIndex: 101,
      compositeOperation: "source-over",
      height: this.height,
    });

    this.initScrollBar();
    mainLayer.appendTo(this.wrapper);
    container.appendChild(this.wrapper);
  }

  initScrollBar() {
    this.wrapper.style.position = "relative";
    this.wrapper.style.overflowX = "scroll";
    this.wrapper.style.overflowY = "hidden";

    const mainLayer = this.getLayer("main") as Layer;
    // The parent element scrolls natively, and the canvas is redrawn accordingly.
    // To maintain its position during scrolling, the element must use "sticky" positioning.
    if (mainLayer.canvas instanceof HTMLCanvasElement) {
      mainLayer.canvas.style.position = "sticky";
      mainLayer.canvas.style.top = "0";
      mainLayer.canvas.style.left = "0";
      mainLayer.canvas.style.zIndex = "2";
    }
    // Adds a scroll filler element to adjust the size of the scrollable area
    this.scrollFiller = document.createElement("div");
    this.scrollFiller.style.position = "absolute";
    this.scrollFiller.style.width = "100%";
    this.scrollFiller.style.height = `${BROWSER_SCROLLBAR_WIDTH}px`;
    this.scrollFiller.style.top = "100%";
    this.scrollFiller.style.minHeight = "1px";
    if (mainLayer.canvas instanceof HTMLCanvasElement) {
      mainLayer.canvas.style.zIndex = "1";
    }
    this.wrapper.appendChild(this.scrollFiller);
  }

  updateScrollFiller() {
    const { fullWidth } = this;
    // Always make the scrollFiller at least 1px wider than the container to force the scrollbar
    this.scrollFiller.style.width = `${fullWidth + 1}px`;
  }

  reserveSpace({ height }: { height: number }) {
    this.reservedSpace = height;
  }

  createLayer(options: {
    name: string;
    groupName?: string;
    offscreen?: boolean;
    zIndex?: number;
    opacity?: number;
    compositeOperation?: CanvasCompositeOperation;
    isVisible?: boolean;
    height?: number;
  }) {
    const {
      name,
      offscreen = false,
      zIndex = 1,
      opacity = 1,
      compositeOperation = "source-over",
      isVisible,
      height,
    } = options;

    if (!options.groupName && this.layers.has(name)) throw new Error(`Layer ${name} already exists.`);

    const layerOptions = {
      groupName: options.groupName,
      name,
      container: this.container,
      height: height ?? this.waveformHeight,
      pixelRatio: this.pixelRatio,
      index: zIndex,
      offscreen,
      compositeOperation,
      opacity,
      isVisible,
    };

    let layer: Layer;

    if (options.groupName) {
      const group = this.layers.get(options.groupName);

      if (!group || !group.isGroup) throw new Error(`LayerGroup ${options.groupName} does not exist.`);

      layer = (group as LayerGroup).addLayer(layerOptions);
      this.layers.set(name, layer);
    } else {
      layer = new Layer(layerOptions);
      this.layers.set(name, layer);
    }

    this.invoke("layerAdded", [layer]);
    layer.on("layerUpdated", (_layer) => {
      const mainLayer = this.getLayer("main");
      this.setContainerHeight();

      if (mainLayer) {
        mainLayer.height = this.height;
      }

      // After we update the fields, let's force a redraw
      setTimeout(() => this.transferImage(), 100);

      this.invokeLayersUpdated();
    });

    return layer;
  }

  createLayerGroup(options: {
    name: string;
    offscreen?: boolean;
    zIndex?: number;
    opacity?: number;
    compositeAsGroup?: boolean;
    compositeOperation?: CanvasCompositeOperation;
    height?: number;
  }) {
    const {
      name,
      offscreen = false,
      zIndex = 1,
      opacity = 1,
      compositeOperation = "source-over",
      compositeAsGroup = true,
      height,
    } = options;

    if (this.layers.has(name)) throw new Error(`LayerGroup ${name} already exists.`);

    const layer = new LayerGroup({
      name,
      container: this.container,
      height: height ?? this.waveformHeight,
      pixelRatio: this.pixelRatio,
      index: zIndex,
      offscreen,
      compositeOperation,
      compositeAsGroup,
      opacity,
    });

    this.invoke("layerAdded", [layer]);
    layer.on("layerUpdated", () => {
      this.invokeLayersUpdated();
    });
    this.layers.set(name, layer);
    return layer;
  }

  removeLayer(name: string) {
    if (!this.layers.has(name)) throw new Error(`Layer ${name} does not exist.`);
    const layer = this.layers.get(name);

    if (layer) {
      this.invoke("layerRemoved", [layer]);
      layer.off("layerUpdated", this.invokeLayersUpdated);
      layer.remove();
    }
    this.layers.delete(name);
  }

  getLayer(name: string) {
    return this.layers.get(name);
  }

  getLayers() {
    return this.layers;
  }

  useLayer(name: string, callback: (layer: Layer, context: RenderingContext) => void) {
    const layer = this.layers.get(name)!;

    if (layer) {
      callback(layer, layer.context!);
    }
  }

  private invokeLayersUpdated = debounce(async () => {
    this.invoke("layersUpdated", [this.layers]);
  }, 150);

  private attachEvents() {
    // Observers
    this.observer = new ResizeObserver(this.handleResize);
    this.observer.observe(this.wrapper);

    // DOM events
    this.wrapper.addEventListener("wheel", this.preventScrollX);
    this.wrapper.addEventListener("wheel", this.handleScroll, {
      passive: true,
    });
    this.wrapper.addEventListener("click", this.handleSeek);
    this.wrapper.addEventListener("mousedown", this.handleMouseDown);

    this.wrapper.addEventListener("scroll", (_e) => {
      const scrollLeft = this.wrapper.scrollLeft / this.fullWidth;
      this.wf.invoke("scroll", [scrollLeft]);
      this._setScrollLeft(scrollLeft);
    });

    // Cursor events
    this.on("mouseMove", this.playHeadMove);

    this.on("layerAdded", this.invokeLayersUpdated);
    this.on("layerRemoved", this.invokeLayersUpdated);

    // WF events
    this.wf.on("playing", this.handlePlaying);
    this.wf.on("seek", this.handlePlaying);
    // Redraw spectrogram on pause to clear artifacts
    this.wf.on("pause", this.draw.bind(this));
  }

  private removeEvents() {
    // Observers
    this.observer.unobserve(this.wrapper);
    this.observer.disconnect();

    // DOM events
    this.wrapper.removeEventListener("wheel", this.preventScrollX);
    this.wrapper.removeEventListener("wheel", this.handleScroll);
    this.wrapper.removeEventListener("click", this.handleSeek);
    this.wrapper.removeEventListener("mousedown", this.handleMouseDown);

    // Cursor events
    this.off("mouseMove", this.playHeadMove);

    this.off("layerAdded", this.invokeLayersUpdated);
    this.off("layerRemoved", this.invokeLayersUpdated);

    // WF events
    this.wf.off("playing", this.handlePlaying);
    this.wf.off("seek", this.handlePlaying);
    // Remove pause event
    this.wf.off("pause", this.draw.bind(this));
  }

  private playHeadMove = (e: MouseEvent, cursor: Cursor) => {
    if (!this.wf.loaded) return;
    if (e.target && this.container.contains(e.target as Node)) {
      const { x, y } = cursor;
      const { playhead, playheadPadding, height } = this;
      const playHeadTop = this.reservedSpace - playhead.capHeight - playhead.capPadding;

      if (
        x >= playhead.x - playheadPadding &&
        x <= playhead.x + playhead.width + playheadPadding &&
        y >= playHeadTop &&
        y <= height
      ) {
        if (!playhead.isHovered) {
          playhead.invoke("mouseEnter", [e]);
        }
        this.draw();
      } else if (playhead.isHovered) {
        playhead.invoke("mouseLeave", [e]);
        this.draw();
      }
    }
  };

  private handleSeek = (e: MouseEvent) => {
    if (e.offsetY > this.height) return;

    const mainLayer = this.getLayer("main");

    if (
      !this.wf.loaded ||
      this.seekLocked ||
      !(
        e.target instanceof Node &&
        mainLayer?.canvas &&
        mainLayer.canvas instanceof HTMLCanvasElement &&
        mainLayer.canvas.contains(e.target)
      )
    )
      return;
    const offset = this.wrapper.getBoundingClientRect().left;
    const x = e.clientX - offset;
    const duration = this.wf.duration;
    const currentPosition = this.scrollLeft + x / this.container.clientWidth / this.zoom;
    const playheadX = clamp(x, 0, this.width);

    this.playhead.setX(playheadX);
    this.wf.currentTime = currentPosition * duration;
  };

  private handleMouseDown = (e: MouseEvent) => {
    if (e.offsetY > this.height) return;
    if (!this.wf.loaded) return;
    (e as any)._pixelRatio = this.pixelRatio || window.devicePixelRatio || 1;
    this.playhead.invoke("mouseDown", [e]);
  };

  private handlePlaying = (currentTime: number) => {
    if (!this.wf.loaded) return;
    this.currentTime = currentTime / this.wf.duration;
    this.draw();
  };

  private handleScroll = (e: WheelEvent) => {
    if (!this.wf.loaded) return;

    if (this.isZooming(e)) {
      // Store the current time position before zooming
      const currentTimePosition = this.wf.currentTime;

      // Calculate zoom delta based on trackpad sensitivity
      const zoomDelta = e.deltaY * 0.1;
      const newZoom = this.zoom * (1 - zoomDelta);

      // Set the new zoom level
      requestAnimationFrame(() => {
        this.setZoom(newZoom);
        this.updateCursorToTime(currentTimePosition);
        // If the audio is not playing, we need to transfer the image to ensure the cursor is updated accurately
        if (!this.wf.playing) {
          this.transferImage();
        }
      });
    } else if (this.zoom > 1) {
      // Base values
      const maxScroll = this.scrollWidth;
      const maxRelativeScroll = (maxScroll / this.fullWidth) * this.zoom;
      const delta = (Math.abs(e.deltaX) === 0 ? e.deltaY : e.deltaX) * this.zoom * 1.25;
      const position = this.scrollLeft * this.zoom;

      // Values for the update
      const currentSroll = maxScroll * position;
      const newPosition = Math.max(0, currentSroll + delta);
      const newRelativePosition = clamp(newPosition / maxScroll, 0, maxRelativeScroll);
      const scrollLeft = newRelativePosition / this.zoom;

      if (scrollLeft !== this.scrollLeft) {
        this.wf.invoke("scroll", [scrollLeft]);
        this.setScrollLeft(scrollLeft);
      }
    }
  };

  private updatePosition() {
    if (!this.wf.loaded) return;
    const maxScroll = this.scrollWidth;
    const maxRelativeScroll = (maxScroll / this.fullWidth) * this.zoom;

    this.setScrollLeft(clamp(this.scrollLeft, 0, maxRelativeScroll));
  }

  private get dataLength() {
    return this.audio?.dataLength ?? 0;
  }

  private getSamplesPerPx() {
    const newValue = this.dataLength / this.fullWidth;

    if (newValue !== this.samplesPerPx) {
      this.samplesPerPx = newValue;
    }

    return this.samplesPerPx;
  }

  private isZooming(e: WheelEvent) {
    return e.ctrlKey || e.metaKey;
  }

  private preventScrollX = (e: WheelEvent) => {
    const [dX, dY] = [Math.abs(e.deltaX), Math.abs(e.deltaY)];

    if (dX >= dY || (this.isZooming(e) && dY >= dX)) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  private setContainerHeight() {
    this.container.style.height = `${this.height + BROWSER_SCROLLBAR_WIDTH}px`;
  }

  private updateSize() {
    this.getSamplesPerPx();
  }

  private handleResize = () => {
    if (!this.wf.duration) return;

    // Update container height
    this.setContainerHeight();

    // Update layer dimensions
    const mainLayer = this.getLayer("main");
    if (mainLayer) {
      mainLayer.pixelRatio = this.pixelRatio;
      mainLayer.width = this.width;
      mainLayer.height = this.height;
    }

    // Update other layers
    this.layers.forEach((layer) => {
      if (layer.name !== "main") {
        layer.pixelRatio = this.pixelRatio;
        layer.width = this.width;
        // Update height for layers according to their type
        if (layer.name === "waveform") {
          layer.height = this.waveformLayerHeight;
        } else if (layer.name === "waveform-resize") {
          layer.height = this.waveformLayerHeight;
        } else if (layer.name === "spectrogram" || layer.name === "spectrogram-grid") {
          layer.height = this.spectrogramLayerHeight;
        } else if (layer.name === "spectrogram-resize") {
          layer.height = this.spectrogramLayerHeight;
        }
        // Update regions layer height to match the full visualizer height
        if (layer.name === "regions") {
          layer.height = this.height;
        }
      }
    });

    this.updateSize();
    this.updateCursorToTime(this.wf.currentTime);
    this.updateScrollFiller();
    this.setScrollLeft(this.scrollLeft);
    this.wf.renderTimeline();

    // Update interaction manager pixel ratio
    if (this.interactionManager) {
      this.interactionManager.setPixelRatio(this.pixelRatio);
    }

    // Notify all renderers about resize
    for (const renderer of this.renderers) {
      if (typeof renderer.onResize === "function") {
        renderer.onResize();
      }
    }

    this.draw();
  };

  public transferImage() {
    this.rateLimitedTransfer.scheduleDraw(
      { visualizer: this },
      ({ visualizer }) => {
        const main = visualizer.layers.get("main")!;
        if (visualizer.composer) {
          main.clear();
          visualizer.composer.renderTo(main);
          // Composite the playhead at its current position
          const playheadX = visualizer.playhead.x;
          // Type guard for CanvasRenderingContext2D
          const ctx = main.context;
          if (ctx && ctx instanceof CanvasRenderingContext2D) {
            visualizer.playhead.renderTo(ctx, playheadX);
          }
        }
      },
      false, // not a zoom operation
    );
  }

  public updateSpectrogramConfig(params: {
    fftSamples?: number;
    melBands?: number;
    windowingFunction?: string;
    colorScheme?: string;
    minDb?: number;
    maxDb?: number;
    hopFactor?: number;
    scale?: SpectrogramScale;
  }) {
    // Return early if feature flag is disabled
    if (!isFF(FF_AUDIO_SPECTROGRAMS) || !this.spectrogramRenderer) {
      return;
    }

    let needsProcessorUpdate = false;
    const processorOptions: Partial<FFTProcessorOptions> = {};

    // Build new config based on current config and params
    const currentConfig = this.spectrogramRenderer.config;
    const newConfig = { ...currentConfig };

    if (params.fftSamples !== undefined && currentConfig.fftSamples !== params.fftSamples) {
      newConfig.fftSamples = params.fftSamples;
      processorOptions.fftSamples = params.fftSamples;
      needsProcessorUpdate = true;
    }
    if (params.melBands !== undefined && currentConfig.numberOfMelBands !== params.melBands) {
      newConfig.numberOfMelBands = params.melBands;
    }
    if (params.windowingFunction !== undefined && currentConfig.windowFunction !== params.windowingFunction) {
      newConfig.windowFunction = params.windowingFunction as WindowFunctionType;
      processorOptions.windowingFunction = newConfig.windowFunction;
      needsProcessorUpdate = true;
    }
    if (params.hopFactor !== undefined && currentConfig.spectrogramHopFactor !== params.hopFactor) {
      newConfig.spectrogramHopFactor = params.hopFactor > 0 ? params.hopFactor : 2;
    }
    if (params.colorScheme !== undefined && currentConfig.spectrogramColorScheme !== params.colorScheme) {
      newConfig.spectrogramColorScheme = params.colorScheme as ColorScheme;
    }
    if (params.minDb !== undefined && currentConfig.spectrogramMinDb !== params.minDb) {
      newConfig.spectrogramMinDb = params.minDb;
    }
    if (params.maxDb !== undefined && currentConfig.spectrogramMaxDb !== params.maxDb) {
      newConfig.spectrogramMaxDb = params.maxDb;
    }
    if (params.scale !== undefined && currentConfig.spectrogramScale !== params.scale) {
      newConfig.spectrogramScale = params.scale;
    }

    // Update FFT Processor if necessary
    if (needsProcessorUpdate && this.spectrogramRenderer.fftProcessor && this.audio?.sampleRate) {
      processorOptions.sampleRate = this.audio.sampleRate; // Ensure the sample rate is included
      this.spectrogramRenderer.fftProcessor.updateParameters(processorOptions);
    }

    // Update colorMapper if colorScheme changed
    if (params.colorScheme !== undefined && this.spectrogramRenderer.colorMapper) {
      this.spectrogramRenderer.colorMapper.setColorScheme(params.colorScheme as ColorScheme);
    }

    // Use updateConfig to update the renderer's config
    this.spectrogramRenderer.updateConfig(newConfig);

    // We need to force a full redrawing here to ensure the spectrogram is updated correctly
    setTimeout(() => this.draw());
  }

  /**
   * Sync the cursor with the current time of the audio.
   * Useful when the audio is getting controlled externally.
   */
  public syncCursor() {
    this.updateCursorToTime(this.currentTime);
  }

  /**
   * Get the vertical space allocated for a single spectrogram channel
   */
  get channelHeight(): number {
    const spectrogramLayer = this.getLayer("spectrogram");
    if (!spectrogramLayer?.isVisible) return 0;

    return this.spectrogramHeight;
  }

  setAmp(amp: number) {
    this.waveformRenderer.updateConfig({ amp: Math.max(1, amp) });
    this.draw();
  }

  /**
   * Get layer position information for interaction management
   */
  getLayerInfo(interactive: Interactive): LayerInfo | null {
    // Determine which component this interactive belongs to
    let componentName: string | null = null;

    if (interactive === this.waveformResizeRenderer) {
      componentName = "waveform";
    } else if (interactive === this.spectrogramResizeRenderer) {
      componentName = "spectrogram";
    }

    if (!componentName) return null;

    const timelineLayer = this.getLayer("timeline");
    const waveformLayer = this.getLayer("waveform");
    const spectrogramLayer = this.getLayer("spectrogram");

    // Calculate Y offset based on composition structure
    let offsetY = 0;

    // Timeline is at the top when visible
    if (timelineLayer?.isVisible) {
      if (componentName === "waveform" || componentName === "spectrogram") {
        offsetY += this.timelineHeight;
      }
    }

    // Waveform is first in the vertical stack
    if (componentName === "spectrogram") {
      // Spectrogram comes after waveform in the vertical stack
      if (waveformLayer?.isVisible) {
        offsetY += this.waveformLayerHeight;
      }
    }

    // Get the appropriate layer dimensions
    const width = this.width;
    let height = 0;

    if (componentName === "waveform") {
      height = this.waveformLayerHeight;
    } else if (componentName === "spectrogram") {
      height = this.spectrogramLayerHeight;
    }

    return {
      offsetX: 0,
      offsetY,
      width,
      height,
    };
  }

  /**
   * Handle height changes from ResizeRenderer
   */
  private handleHeightChange = (componentName: string, newHeight: number): void => {
    let initialHeight = 0;
    if (componentName === "waveform") {
      initialHeight = this.initialWaveformHeight * ((this.splitChannels && this.audio?.channelCount) || 1);
    } else if (componentName === "spectrogram") {
      initialHeight = this.initialSpectrogramHeight * ((this.splitChannels && this.audio?.channelCount) || 1);
    }
    const minHeight = 50;
    const maxHeight = Math.max(500, initialHeight);
    const clampedHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));

    if (componentName === "waveform") {
      if (this.splitChannels && this.audio?.channelCount) {
        this.waveformHeight = clampedHeight / this.audio.channelCount;
      } else {
        this.waveformHeight = clampedHeight;
      }
      // Update the waveform-related layers
      const waveformLayer = this.getLayer("waveform");
      const waveformResizeLayer = this.getLayer("waveform-resize");
      const backgroundLayer = this.getLayer("background");

      if (waveformLayer) waveformLayer.height = this.waveformLayerHeight;
      if (waveformResizeLayer) waveformResizeLayer.height = this.waveformLayerHeight;
      if (backgroundLayer) backgroundLayer.height = this.waveformLayerHeight;

      // Update WaveformRenderer configuration
      if (this.waveformRenderer) {
        // For height changes, we only need to update the waveHeight config
        // without triggering expensive redraws
        this.waveformRenderer.config.waveHeight = this.waveformHeight;

        // Don't call resetRenderState - it forces expensive redraw
        // The waveform data doesn't change, just the rendering height
      }
    } else if (componentName === "spectrogram") {
      if (this.splitChannels && this.audio?.channelCount) {
        this.spectrogramHeight = clampedHeight / this.audio.channelCount;
      } else {
        this.spectrogramHeight = clampedHeight;
      }
      // Update the spectrogram-related layers
      const spectrogramLayer = this.getLayer("spectrogram");
      const spectrogramResizeLayer = this.getLayer("spectrogram-resize");
      const spectrogramGridLayer = this.getLayer("spectrogram-grid");

      if (spectrogramLayer) spectrogramLayer.height = this.spectrogramLayerHeight;
      if (spectrogramResizeLayer) spectrogramResizeLayer.height = this.spectrogramLayerHeight;
      if (spectrogramGridLayer) spectrogramGridLayer.height = this.spectrogramLayerHeight;

      // Update SpectrogramRenderer configuration
      if (this.spectrogramRenderer) {
        // For height changes, we only need to update the channelHeight config
        // without triggering expensive FFT recalculations
        this.spectrogramRenderer.config.channelHeight = this.channelHeight;

        // Don't call resetRenderState or updateConfig - it forces expensive FFT recalculation
        // The spectrogram data doesn't change, just the rendering height
      }
    }

    // Update container height and recreate composer
    this.setContainerHeight();
    this.createComposer();

    // Update the main layer height to match new total height
    const mainLayer = this.getLayer("main");
    if (mainLayer) {
      mainLayer.height = this.height;
    }

    // Update regions layer to match new total height
    const regionsLayer = this.getLayer("regions");
    if (regionsLayer) {
      regionsLayer.height = this.height;
    }

    // Notify all renderers about the resize
    for (const renderer of this.renderers) {
      if (typeof renderer.onResize === "function") {
        renderer.onResize();
      }
    }

    // Update interaction manager pixel ratio (in case it changed)
    if (this.interactionManager) {
      this.interactionManager.setPixelRatio(this.pixelRatio);
    }

    // For height changes, avoid expensive redraws - just transfer the image
    // since the data doesn't change, only the rendering dimensions
    this.transferImage();

    // Update playhead position to reflect new layout
    this.updateCursorToTime(this.wf.currentTime);

    // Re-initialize playhead to ensure it renders at correct height
    this.playhead.onInit();

    // Trigger a full redraw to ensure proper rendering at new dimensions
    // This handles cases where the canvas might appear blank after resize
    setTimeout(() => this.draw());
  };
}
