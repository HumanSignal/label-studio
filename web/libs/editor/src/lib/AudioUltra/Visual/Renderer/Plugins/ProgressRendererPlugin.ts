// biome-ignore-all lint/correctness/noUnusedPrivateClassMembers: AudioUltra; skip unsafe removal
import type { ColorMapper } from "../../ColorMapper";
import type { LRUCache } from "../../../Common/LRUCache";
import {
  type BatchProgress,
  type DetailedComputationProgress,
  TaskPriority,
} from "../../../Common/Worker/ComputationQueue";
import type { RendererPlugin } from "./RendererPlugin";
import type { WaveformAudio } from "../../../Media/WaveformAudio";
import type { RenderContext } from "../Renderer";

/**
 * Renders a progress bar and text overlay on the spectrogram-progress layer.
 * Should be called after audio is loaded and whenever the scale or FFT size changes.
 *
 * @example
 * const renderer = new SpectrogramRenderer(audio, canvas, {
 *   zoom: 1,
 *   fftSize: 1024,
 *   fftScale: "log",
 *   colorMap: "magma",
 *   showGrid: true,
 })
 */

/**
 * Empty config for ProgressRendererPlugin since it doesn't intersect with SpectrogramRenderConfig.
 */
export interface ProgressRendererPluginConfig {
  visible: boolean;
}

export interface ProgressRendererPluginConfiguration {
  visible?: boolean;
  overlayWidth?: number;
  overlayBgColor?: string;
  overlayTextColor?: string;
  overlayFontSize?: number;
  barHeight?: number;
  barRadius?: number;
  barShadow?: string;
  ariaLabel?: string;
  labels?: {
    view?: string;
    precache?: string;
    cached?: string;
    caching?: string;
  };
}

export class ProgressRendererPlugin implements RendererPlugin<ProgressRendererPluginConfig> {
  private readonly container: HTMLElement;
  private readonly colorMapper: ColorMapper;
  private readonly fftCache: Map<number, LRUCache<number, Float32Array>>;
  config: ProgressRendererPluginConfig;

  // Internal configuration properties
  private visible = true;
  private overlayWidth = 180;
  private overlayBgColor = "rgba(0, 0, 0, 0.7)";
  private overlayTextColor: string;
  private overlayFontSize = 10;
  private barHeight = 12;
  private barRadius = 2;
  private barShadow = "0 1px 4px rgba(0,0,0,0.18)";
  private ariaLabel = "Spectrogram progress overlay";
  private labels: {
    view: string;
    precache: string;
    cached: string;
    caching: string;
  } = {
    view: "VIEW",
    precache: "PRECACHE",
    cached: "Cached",
    caching: "Caching",
  };

  constructor(
    container: HTMLElement,
    colorMapper: ColorMapper,
    fftCache: Map<number, LRUCache<number, Float32Array>>,
    config: ProgressRendererPluginConfiguration & ProgressRendererPluginConfig,
  ) {
    this.container = container;
    this.colorMapper = colorMapper;
    this.fftCache = fftCache;
    this.overlayTextColor = colorMapper.magnitudeToColor(1.0);
    this.config = { visible: config.visible };
    // Apply config if provided
    if (config) {
      if (config.visible !== undefined) this.visible = config.visible;
      if (config.overlayWidth !== undefined) this.overlayWidth = config.overlayWidth;
      if (config.overlayBgColor !== undefined) this.overlayBgColor = config.overlayBgColor;
      if (config.overlayTextColor !== undefined) this.overlayTextColor = config.overlayTextColor;
      if (config.overlayFontSize !== undefined) this.overlayFontSize = config.overlayFontSize;
      if (config.barHeight !== undefined) this.barHeight = config.barHeight;
      if (config.barRadius !== undefined) this.barRadius = config.barRadius;
      if (config.barShadow !== undefined) this.barShadow = config.barShadow;
      if (config.ariaLabel !== undefined) this.ariaLabel = config.ariaLabel;
      if (config.labels) {
        this.labels = {
          ...this.labels,
          ...config.labels,
        };
      }
    }
  }

  /**
   * Update the plugin config and re-render if needed.
   */
  public updateConfig(config: Partial<ProgressRendererPluginConfig>): void {
    const oldConfig = { ...this.config };
    if ("visible" in config) this.visible = config.visible!;

    if (this.visible !== oldConfig.visible) {
      if (this.visible) {
        this._showProgressOverlay();
      } else {
        this._hideProgressOverlay();
      }
    }
  }

  /**
   * Render the progress overlay. Accepts optional progress data.
   */
  public renderProgress(progress?: DetailedComputationProgress) {
    if (
      progress === undefined ||
      progress.overall.overallPercentage === 100 ||
      progress.overall.overallPercentage === 0
    ) {
      this._hideProgressOverlay();
      return;
    }

    if (!this.visible) {
      this._hideProgressOverlay();
      return;
    }
    const overlay = this._ensureProgressOverlay();
    overlay.innerHTML = "";
    overlay.style.display = "block";
    overlay.setAttribute("role", "status");
    overlay.setAttribute("aria-live", "polite");
    overlay.setAttribute("aria-label", this.ariaLabel || "Spectrogram progress overlay");

    // Aggregate progress data
    const { cachingTotal, cachingProcessed } = this._aggregateProgress(progress);
    // Render overall bar and text
    overlay.appendChild(this._createOverallBar(cachingTotal, cachingProcessed));
  }

  /**
   * Aggregate progress data for rendering.
   */
  private _aggregateProgress(progress?: DetailedComputationProgress) {
    let cachingTotal = 0;
    let cachingProcessed = 0;
    const batchGroups: Record<string, BatchProgress[]> = {
      view: [],
      precache: [],
    };
    if (progress?.batches) {
      for (const batch of progress.batches) {
        cachingTotal += batch.totalTasks;
        cachingProcessed += batch.completedTasks;
        if (batch.priority === TaskPriority.HIGH) batchGroups.view.push(batch);
        if (batch.priority === TaskPriority.NORMAL) batchGroups.precache.push(batch);
      }
    }
    return { cachingTotal, cachingProcessed, batchGroups };
  }

  /**
   * Create the overall bar and text overlay DOM element.
   */
  private _createOverallBar(cachingTotal: number, cachingProcessed: number): HTMLElement {
    const colorMapper = this.colorMapper;
    const _fftCache = this.fftCache;
    const wrapper = document.createElement("div");
    wrapper.style.marginBottom = "3px";
    wrapper.style.borderBottom = "1px solid #555";
    wrapper.style.paddingBottom = "2px";

    // Text Label
    const text = document.createElement("div");
    text.style.fontSize = `${this.overlayFontSize ?? 10}px`;
    text.style.fontWeight = "bold";
    text.style.color = this.overlayTextColor ?? colorMapper.magnitudeToColor(1.0);
    text.style.marginBottom = "1px";

    if (cachingTotal === 0) {
      text.textContent = `${this.labels?.cached || "Cached"}`;
    } else {
      text.textContent = `${this.labels?.caching || "Caching"}: ${cachingProcessed} / ${cachingTotal} (${Math.round((cachingProcessed / cachingTotal) * 100)}%)`;
    }

    // Bar: Styled like priority bars
    const bar = this._createBar({
      percent: cachingTotal > 0 ? cachingProcessed / cachingTotal : 1,
      color: colorMapper.magnitudeToColor(1.0),
      bgColor: colorMapper.magnitudeToColor(0),
      height: 4,
      radius: this.barRadius ?? 2,
      shadow: this.barShadow ?? "0 1px 4px rgba(0,0,0,0.18)",
      opacity: 1,
      position: "relative",
    });

    wrapper.appendChild(text);
    wrapper.appendChild(bar);
    return wrapper;
  }

  /**
   * Create a progress bar DOM element.
   */
  private _createBar(opts: {
    percent: number;
    color: string;
    bgColor: string;
    height?: number;
    radius?: number;
    shadow?: string;
    opacity?: number;
    activePercent?: number;
    position?: "absolute" | "relative";
  }): HTMLElement {
    const barContainer = document.createElement("div");
    barContainer.style.position = opts.position ?? "absolute";
    if (opts.position !== "relative") {
      barContainer.style.left = "0";
      barContainer.style.top = "50%";
      barContainer.style.transform = "translateY(-50%)";
    } else {
      barContainer.style.marginTop = "2px";
    }
    barContainer.style.width = "100%";
    barContainer.style.height = `${opts.height ?? 12}px`;
    barContainer.style.backgroundColor = opts.bgColor ?? "#888";
    barContainer.style.borderRadius = `${opts.radius ?? 2}px`;
    barContainer.style.boxShadow = opts.shadow ?? "none";
    barContainer.style.opacity = `${opts.opacity ?? 1}`;
    // Completed segment
    if (opts.percent > 0) {
      const filledBar = document.createElement("div");
      filledBar.style.width = `${opts.percent * 100}%`;
      filledBar.style.backgroundColor = opts.color;
      filledBar.style.height = "100%";
      filledBar.style.borderRadius = `${opts.radius ?? 2}px 0 0 ${opts.radius ?? 2}px`;
      filledBar.style.boxShadow = opts.shadow ?? "none";
      barContainer.appendChild(filledBar);
    }

    return barContainer;
  }

  /**
   * Ensure the overlay container exists and is styled.
   */
  private _ensureProgressOverlay(): HTMLDivElement {
    let overlay = this.container.querySelector("#spectrogram-progress-overlay") as HTMLDivElement;
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "spectrogram-progress-overlay";
      overlay.style.position = "absolute";
      overlay.style.opacity = "1";
      overlay.style.right = "10px";
      overlay.style.bottom = "20px";

      overlay.style.width = `${this.overlayWidth ?? 180}px`;
      overlay.style.backgroundColor = this.overlayBgColor ?? "rgba(0, 0, 0, 0.7)";
      overlay.style.color = this.overlayTextColor ?? "white";
      overlay.style.padding = "5px";
      overlay.style.fontSize = `${this.overlayFontSize ?? 10}px`;
      overlay.style.fontFamily = "monospace";
      overlay.style.zIndex = "100";
      overlay.style.maxHeight = "150px";
      overlay.style.overflowY = "hidden";
      overlay.style.pointerEvents = "none";
      this.container.appendChild(overlay);
    }
    overlay.style.display = "block";
    return overlay;
  }

  /**
   * Hide the overlay if not visible.
   */
  private _hideProgressOverlay() {
    const overlay = this.container.querySelector("#spectrogram-progress-overlay") as HTMLDivElement;
    if (overlay) {
      overlay.style.display = "none";
    }
  }

  private _showProgressOverlay() {
    const overlay = this.container.querySelector("#spectrogram-progress-overlay") as HTMLDivElement;
    if (overlay) {
      overlay.style.display = "block";
    }
  }

  /**
   * RendererPlugin interface: init method.
   */
  public init(_audio: WaveformAudio, _state: RenderContext): void {
    this.renderProgress();
  }

  /**
   * RendererPlugin interface: render method.
   */
  public render(_state: RenderContext): void {
    this.renderProgress();
  }

  /**
   * RendererPlugin interface: destroy method.
   */
  public destroy(): void {
    this._hideProgressOverlay();
  }
}
