import { WaveformAudio } from '../Media/WaveformAudio';
import { averageMinMax, clamp, debounce, defaults, warn } from '../Common/Utils';
import { Waveform, WaveformOptions } from '../Waveform';
import { CanvasCompositeOperation, Layer, RenderingContext } from './Layer';
import { Events } from '../Common/Events';
import { LayerGroup } from './LayerGroup';
import { Playhead } from './PlayHead';
import { rgba } from '../Common/Color';
import { Cursor } from '../Cursor/Cursor';
import { Padding } from '../Common/Style';
import { TimelineOptions } from '../Timeline/Timeline';
import './Loader';

// Amount of data samples to buffer on either side of the renderable area
const BUFFER_SAMPLES = 2;
const CACHE_RENDER_THRESHOLD = 10000000;

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

export type VisualizerOptions = Pick<WaveformOptions,
| 'zoomToCursor'
| 'autoCenter'
| 'splitChannels'
| 'cursorWidth'
| 'zoom'
| 'amp'
| 'padding'
| 'playhead'
| 'timeline'
| 'height'
| 'waveHeight'
| 'gridWidth'
| 'gridColor'
| 'waveColor'
| 'backgroundColor'
| 'container'
> 

export class Visualizer extends Events<VisualizerEvents> {
  private wrapper!: HTMLElement;
  private layers = new Map<string, Layer>();
  private observer!: ResizeObserver;
  private currentTime = 0;
  private audio!: WaveformAudio | null;
  private zoom = 1;
  private scrollLeft = 0;
  private drawing = false;
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
  private gridColor = rgba('rgba(0, 0, 0, 0.1)');
  private backgroundColor = rgba('#fff');
  private waveColor = rgba('#000');
  private baseWaveHeight = 96;
  private originalWaveHeight = 0;
  private waveHeight = 32;
  private lastRenderedZoom = 0;
  private lastRenderedWidth = 0;
  private lastRenderedAmp = 0;
  private lastRenderedScrollLeftPx = 0;
  private _container!: HTMLElement;
  private _loader!: HTMLElement;

  timelineHeight: number = defaults.timelineHeight;
  timelinePlacement: TimelineOptions['placement'] = 'top';
  maxZoom = 1500;
  playhead: Playhead;
  reservedSpace = 0;
  samplesPerPx = 0;

  constructor(options: VisualizerOptions, waveform: Waveform) {
    super();

    this.wf = waveform;
    this.waveContainer = options.container;
    this.waveColor = options.waveColor ? rgba(options.waveColor) : this.waveColor;
    this.padding = { ...this.padding, ...options.padding };
    this.playheadPadding = options.playhead?.padding ?? this.playheadPadding;
    this.zoomToCursor = options.zoomToCursor ?? this.zoomToCursor;
    this.autoCenter = options.autoCenter ?? this.autoCenter;
    this.splitChannels = options.splitChannels ?? this.splitChannels;
    this.baseWaveHeight = options.height ?? this.baseWaveHeight;
    this.originalWaveHeight = this.baseWaveHeight;
    this.timelineHeight = options.timeline?.height ?? this.timelineHeight;
    this.waveHeight = options.waveHeight ?? this.waveHeight;
    this.timelinePlacement = options?.timeline?.placement ?? this.timelinePlacement;
    this.gridColor = options.gridColor ? rgba(options.gridColor) : this.gridColor;
    this.gridWidth = options.gridWidth ?? this.gridWidth;
    this.backgroundColor = options.backgroundColor ? rgba(options.backgroundColor) : this.backgroundColor;
    this.zoom = options.zoom ?? this.zoom;
    this.amp = options.amp ?? this.amp;
    this.playhead = new Playhead({ 
      ...options.playhead,
      x: 0, 
      color: rgba('#000'), 
      fillColor: rgba('#BAE7FF'),
      width: options.cursorWidth ?? 1,
    }, this, this.wf);

    this.initialRender();
    this.attachEvents();
  }

  init(audio: WaveformAudio) {
    this.init = () => warn('Visualizer is already initialized');
    this.audio = audio;
    this.setLoading(false);

    // This triggers the resize observer when loading in differing heights
    // as a result of multichannel or differently configured waveHeight
    this.setContainerHeight();
    if (this.height === this.originalWaveHeight) {
      this.handleResize();
    }

    this.invoke('initialized', [this]);
  }

  setLoading(loading: boolean) {
    if (loading) {
      this._loader = document.createElement('loading-progress-bar');
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
      this.updatePosition(false);
    }

    this.getSamplesPerPx();

    this.wf.invoke('zoom', [this.zoom]);
    this.draw();
  }

  getZoom() {
    return this.zoom;
  }

  setScrollLeft(value: number, redraw = true, forceDraw = false) {
    this.scrollLeft = value;

    if (redraw) {
      this.draw(false, forceDraw);
    }
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

  draw(dry = false, forceDraw = false) {
    if (this.isDestroyed) return;
    if (this.drawing && !forceDraw) return warn('Concurrent render detected');

    this.drawing = true;

    setTimeout(async () => {
      if (!dry) {
        this.drawMiddleLine();

        if (this.wf.playing && this.autoCenter) {
          this.centerToCurrentTime();
        }

        // Render all available channels
        await this.renderAvailableChannels();
      }

      this.renderCursor();

      this.invoke('draw', [this]);

      this.transferImage();

      this.drawing = false;
    });
  }

  destroy() {
    if (this.isDestroyed) return;

    this.invoke('destroy', [this]);
    this.clear();
    this.playhead.destroy();
    this.audio = null;
    this.removeEvents();
    this.layers.forEach(layer => layer.remove());
    this.wrapper.remove();

    super.destroy();
  }

  clear() {
    this.layers.get('main')?.clear();
    this.transferImage();
  }

  getAmp() {
    return this.amp;
  }

  setAmp(amp: number) {
    this.amp = clamp(amp, 1, Infinity);
    this.draw();
  }

  centerToCurrentTime() {
    if (this.zoom === 1) {
      this.scrollLeft = 0;
      return;
    }

    const offset = (this.width / 2) / this.zoomedWidth;

    this.scrollLeft = clamp(this.currentTime - offset, 0, 1);
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
  private async renderAvailableChannels() {
    if (!this.audio) return;

    const layer = this.getLayer('waveform');

    if (!layer || !layer.isVisible) {
      this.lastRenderedWidth = 0;
      return;
    }

    this.renderId = performance.now();

    const dataLength = this.dataLength;
    const scrollLeftPx = this.getScrollLeftPx();
    const iStart = clamp(scrollLeftPx * this.samplesPerPx, 0, dataLength);
    const iEnd = clamp(iStart + (this.width * this.samplesPerPx), 0, dataLength);

    const renderableData = iEnd - iStart;
    const zoom = this.zoom;
    const amp = this.amp;

    // Render all channels, full waveform
    if (this.width !== this.lastRenderedWidth || zoom !== this.lastRenderedZoom || amp !== this.lastRenderedAmp || renderableData < CACHE_RENDER_THRESHOLD) {
      for (let i = 0; i < this.audio.channelCount; i++) {
        await this.renderWave(i, layer, iStart, iEnd);
      }
    }
    // Render partial waveform, only the change in scroll position's channel data.
    else {
      await this.renderPartialWave(layer, iStart, iEnd);
    }
  }


  /**
   * Render the waveform for a single channel
   */
  private renderWave(channelNumber: number, layer: Layer, iStart: number, iEnd: number): Promise<boolean> {
    const renderId = this.renderId;
    const height = this.baseWaveHeight / (this.audio?.channelCount ?? 1);
    const scrollLeftPx = this.getScrollLeftPx();

    const zoom = this.zoom;
    const amp = this.amp;

    const x = 0;

    return new Promise(resolve => {
      if (this.isDestroyed || !this.audio) return resolve(false);

      // The waveform layer should be cleared during the render of the first channel, and not subsequent channels in a
      // given render cycle
      if (channelNumber === 0) {
        layer.clear();
      }
      const renderIterator = this.renderSlice(layer, height, iStart, iEnd, channelNumber, x);

      // Render iterator, allowing it to be cancelled if a new render is requested
      const render = () => {
        if (this.renderId !== renderId) return resolve(false);

        const next = renderIterator.next();

        if (!next.done) {
          requestAnimationFrame(render);
        } else {
          this.lastRenderedWidth = this.width;
          this.lastRenderedZoom = zoom;
          this.lastRenderedAmp = amp;
          this.lastRenderedScrollLeftPx = scrollLeftPx;
          resolve(true);
        }
      };

      render();
    });
  }

  /**
   * Render a partial wave for all available channels, reusing the last rendered channel(s) wave as a starting point
   * only drawing the new data on the left or right side of the waveform.
   */
  private async renderPartialWave(layer: Layer, iStart: number, iEnd: number) {
    const renderId = this.renderId;
    let x = 0;
    const channelCount = (this.audio?.channelCount ?? 1);
    const height = this.baseWaveHeight / channelCount;
    const scrollLeftPx = this.getScrollLeftPx();
    const dataLength = this.dataLength;
    let deltaX = this.lastRenderedScrollLeftPx - scrollLeftPx;

    if (deltaX < 1 && deltaX > -1 || !this.audio) return false;

    deltaX = Math.round(deltaX);
    const diff = deltaX * this.samplesPerPx;

    this.lastRenderedScrollLeftPx = scrollLeftPx;

    // Move the canvas to the left by deltaX
    layer.shift(deltaX, 0);

    for (let channelNumber = 0; channelNumber < channelCount; channelNumber++) {
      await new Promise(resolve => {

        let sStart = iStart;
        let sEnd = iEnd;

        // Waveform visually moving to the right
        if (deltaX > 0) {
          // Draw the new data on the left
          sEnd = iStart + diff;
          x = 0;

          // Waveform visually moving to the left
        } else {
          // Draw the new data on the right
          sStart = iEnd + diff;
          x = clamp(this.width + deltaX - BUFFER_SAMPLES, 0, this.width);
        }

        sEnd = clamp(sEnd + (this.samplesPerPx * BUFFER_SAMPLES), 0, dataLength);

        const renderIterator = this.renderSlice(layer, height, sStart, sEnd, channelNumber, x);

        // Render iterator, allowing it to be cancelled if a new render is requested
        const render = () => {
          if (this.renderId !== renderId) return resolve(false);

          const next = renderIterator.next();

          if (!next.done) {
            requestAnimationFrame(render);
          } else {
            resolve(true);
          }
        };

        render();
      });
    }
  }

  /**
   * Render a slice of the waveform for a single channel between iStart and iEnd timestamps,
   * returning an iterator that can be used to render the slice.
   */
  private *renderSlice(layer: Layer, height: number, iStart: number, iEnd: number, channelNumber: number, x = 0): Generator<any, void, any> {
    const bufferChunks = this.audio?.chunks?.[channelNumber];

    if (!bufferChunks) return;

    const bufferChunkSize = bufferChunks.length;
    const paddingTop = this.padding?.top ?? 0;
    const paddingLeft = this.padding?.left ?? 0;
    const zero = height * channelNumber + (defaults.timelinePlacement as number ? this.reservedSpace : 0);
    const y = zero + paddingTop + height / 2;
    let total = 0;

    layer.save();
    const waveColor = this.waveColor.toString();

    layer.strokeStyle = waveColor;
    layer.fillStyle = waveColor;
    layer.lineWidth = 1;

    layer.beginPath();
    layer.moveTo(x, y);

    // Find all chunks in buffer chunks that are between iStart and iEnd
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
          const chunk = chunks.slice(index, index + this.samplesPerPx);

          if (now - performance.now() > 10) {
            yield;
          }

          if (x >= 0 && chunk.length > 0) {
            this.renderChunk(chunk, layer, height, x + paddingLeft, zero);
          }

          x += 1;
          i = clamp(i - this.samplesPerPx, 0, l);
        }
      } catch {
        // Ignore any out of bounds errors if they occur
      }
    }
    layer.stroke();
    layer.restore();
  }

  /**
   * Render a single chunk of waveform data, which is a small set of contiguous samples.
   * This takes an average min and max value for the chunk and draws a line between them.
   */
  private renderChunk(chunk: Float32Array, layer: Layer, height: number, offset: number, zero: number) {
    layer.save();

    const renderable = averageMinMax(chunk);

    renderable.forEach((v: number) => {
      const H2 = height / 2;
      const H = (v * this.amp * H2);

      layer.lineTo(offset + 1, zero + H2 + H);
    });

    layer.restore();
  }

  private renderCursor() {
    this.playhead.render();
  }

  private drawMiddleLine() {
    this.useLayer('background', (layer) => {
      layer.clear();
      if (layer.isVisible) {
        // Set background
        layer.save();
        layer.fillStyle = this.backgroundColor.toString();
        layer.fillRect(0, 0, this.width, this.height);
        layer.restore();

        // Draw middle line
        layer.lineWidth = this.gridWidth;
        layer.strokeStyle = this.gridColor.toString();

        // Draw middle line
        const linePositionY = (this.height + this.reservedSpace) / 2;

        layer.beginPath();
        layer.moveTo(0, linePositionY);
        layer.lineTo(this.width, linePositionY);
        layer.closePath();
        layer.stroke();
        layer.restore();
      }
    });
  }

  get pixelRatio() {
    return window.devicePixelRatio;
  }

  get width() {
    return this.container.clientWidth;
  }

  get height() {
    let height = 0;
    const timelineLayer = this.getLayer('timeline');
    const waveformLayer = this.getLayer('waveform');
    const waveformHeight = Math.max(this.originalWaveHeight, this.waveHeight * (this.splitChannels ? this.audio?.channelCount ?? 1 : 1) + this.timelineHeight) - this.timelineHeight;

    if (this.baseWaveHeight !== waveformHeight) {
      this.baseWaveHeight = waveformHeight;
    }

    height += timelineLayer?.isVisible ? this.timelineHeight : 0;
    height += waveformLayer?.isVisible ? waveformHeight : 0;
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
    } else if (typeof this.waveContainer === 'string') {
      result = document.querySelector(this.waveContainer as string);
    }

    if (!result) throw new Error('Container element does not exist.');

    result.style.position = 'relative';

    this._container = result;

    return result;
  }

  private initialRender() {
    if (this.container) {
      this.container.style.height = `${this.baseWaveHeight}px`;
      this.createLayers();
    } else {
      // TBD
    }

    this.drawMiddleLine();
    this.transferImage();
  }

  private createLayers() {
    const { container } = this;

    this.wrapper = document.createElement('div');
    this.wrapper.style.height = '100%';

    this.createLayer({ name: 'main' });
    this.createLayer({ name: 'background', offscreen: true, zIndex: 0, isVisible: false });
    this.createLayer({ name: 'waveform', offscreen: true, zIndex: 100 });
    this.createLayerGroup({ name: 'regions', offscreen: true, zIndex: 101, compositeOperation: 'source-over' });
    const controlsLayer = this.createLayer({ name: 'controls', offscreen: true, zIndex: 1000 });

    this.playhead.setLayer(controlsLayer);
    this.layers.get('main')?.appendTo(this.wrapper);
    container.appendChild(this.wrapper);
  }

  reserveSpace({ height }: { height: number }) {
    this.reservedSpace = height;
  }

  createLayer(options : {name: string, groupName?:string, offscreen?: boolean, zIndex?: number, opacity?: number, compositeOperation?: CanvasCompositeOperation, isVisible?: boolean}) {
    const { name, offscreen = false, zIndex = 1, opacity = 1, compositeOperation = 'source-over', isVisible } = options;

    if (!options.groupName && this.layers.has(name)) throw new Error(`Layer ${name} already exists.`);

    const layerOptions = {
      groupName: options.groupName,
      name,
      container: this.container,
      height: this.baseWaveHeight,
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
    } else {

      layer = new Layer(layerOptions);
      this.layers.set(name, layer);
    }

    this.invoke('layerAdded', [layer]);
    layer.on('layerUpdated', () => {
      const mainLayer = this.getLayer('main');

      this.setContainerHeight();

      if (mainLayer) {
        mainLayer.height = this.height;
      }
      this.invokeLayersUpdated();
    });

    return layer;
  }

  createLayerGroup(options : {name: string, offscreen?: boolean, zIndex?: number, opacity?: number, compositeAsGroup?: boolean, compositeOperation?: CanvasCompositeOperation}) {
    const { name, offscreen = false, zIndex = 1, opacity = 1, compositeOperation = 'source-over', compositeAsGroup = true } = options;

    if (this.layers.has(name)) throw new Error(`LayerGroup ${name} already exists.`);

    const layer = new LayerGroup({
      name,
      container: this.container,
      height: this.baseWaveHeight,
      pixelRatio: this.pixelRatio,
      index: zIndex,
      offscreen,
      compositeOperation,
      compositeAsGroup,
      opacity,
    });

    this.invoke('layerAdded', [layer]);
    layer.on('layerUpdated', () => {
      this.invokeLayersUpdated();
    });
    this.layers.set(name, layer);
    return layer;
  }

  removeLayer(name: string) {
    if (!this.layers.has(name)) throw new Error(`Layer ${name} does not exist.`);
    const layer = this.layers.get(name);

    if (layer) {
      this.invoke('layerRemoved', [layer]);
      layer.off('layerUpdated', this.invokeLayersUpdated);
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
    this.invoke('layersUpdated', [this.layers]);
  }, 150);

  private attachEvents() {
    // Observers
    this.observer = new ResizeObserver(this.handleResize);
    this.observer.observe(this.wrapper);

    // DOM events
    this.wrapper.addEventListener('wheel', this.preventScrollX);
    this.wrapper.addEventListener('wheel', this.handleScroll, {
      passive: true,
    });
    this.wrapper.addEventListener('click', this.handleSeek);
    this.wrapper.addEventListener('mousedown', this.handleMouseDown);

    // Cursor events
    this.on('mouseMove', this.playHeadMove);

    this.on('layerAdded', this.invokeLayersUpdated);
    this.on('layerRemoved', this.invokeLayersUpdated);

    // WF events
    this.wf.on('playing', this.handlePlaying);
    this.wf.on('seek', this.handlePlaying);
  }

  private removeEvents() {
    // Observers
    this.observer.unobserve(this.wrapper);
    this.observer.disconnect();

    // DOM events
    this.wrapper.removeEventListener('wheel', this.preventScrollX);
    this.wrapper.removeEventListener('wheel', this.handleScroll);
    this.wrapper.removeEventListener('click', this.handleSeek);
    this.wrapper.removeEventListener('mousedown', this.handleMouseDown);

    // Cursor events
    this.off('mouseMove', this.playHeadMove);

    this.off('layerAdded', this.invokeLayersUpdated);
    this.off('layerRemoved', this.invokeLayersUpdated);

    // WF events
    this.wf.off('playing', this.handlePlaying);
    this.wf.off('seek', this.handlePlaying);
  }

  private playHeadMove = (e: MouseEvent, cursor: Cursor) => {
    if (!this.wf.loaded) return;
    if (e.target && this.container.contains(e.target)) {
      const { x, y } = cursor;
      const { playhead, playheadPadding, height } = this;
      const playHeadTop = (this.reservedSpace - playhead.capHeight - playhead.capPadding);

      if (x >= playhead.x - playheadPadding && 
        x <= (playhead.x + playhead.width + playheadPadding) &&
          y >= playHeadTop &&
          y <= height) {
        if (!playhead.isHovered) {
          playhead.invoke('mouseEnter', [e]);
        }
        this.draw(true);
      } else if (playhead.isHovered) {
        playhead.invoke('mouseLeave', [e]);
        this.draw(true);
      }
    }
  };

  private handleSeek = (e: MouseEvent) => {
    const mainLayer = this.getLayer('main');

    if (!this.wf.loaded || this.seekLocked || !(e.target && mainLayer?.canvas?.contains(e.target))) return;
    const offset = this.wrapper.getBoundingClientRect().left;
    const x = e.clientX - offset;
    const duration = this.wf.duration;
    const currentPosition = this.scrollLeft + ((x / this.container.clientWidth) / this.zoom);
    const playheadX = clamp(x, 0, this.width);

    this.playhead.setX(playheadX);
    this.wf.currentTime = currentPosition * duration;
  };

  private handleMouseDown = (e: MouseEvent) => {
    if (!this.wf.loaded) return;
    this.playhead.invoke('mouseDown', [e]);
  };

  private handlePlaying = (currentTime: number) => {
    if (!this.wf.loaded) return;
    this.currentTime = currentTime / this.wf.duration;
    this.draw(this.zoom === 1);
  };

  private handleScroll = (e: WheelEvent) => {
    if (!this.wf.loaded) return;

    if (this.isZooming(e)) {
      const zoom = this.zoom - (e.deltaY * 0.2);

      this.setZoom(zoom);
      this.wf.invoke('zoom', [this.zoom]);
    } else if (this.zoom > 1) {
      // Base values
      const maxScroll = this.scrollWidth;
      const maxRelativeScroll = maxScroll / this.fullWidth * this.zoom;
      const delta = (Math.abs(e.deltaX) === 0 ? e.deltaY : e.deltaX) * this.zoom * 1.25;
      const position = this.scrollLeft * this.zoom;

      // Values for the update
      const currentSroll = maxScroll * position;
      const newPosition = Math.max(0, currentSroll + delta);
      const newRelativePosition = clamp(newPosition / maxScroll, 0, maxRelativeScroll);
      const scrollLeft = newRelativePosition / this.zoom;

      if (scrollLeft !== this.scrollLeft) {
        this.wf.invoke('scroll', [scrollLeft]);
        this.setScrollLeft(scrollLeft);
      }
    }
  };

  private updatePosition(redraw = true) {
    if (!this.wf.loaded) return;
    const maxScroll = this.scrollWidth;
    const maxRelativeScroll = maxScroll / this.fullWidth * this.zoom;

    this.setScrollLeft(clamp(this.scrollLeft, 0, maxRelativeScroll), redraw);
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
    this.container.style.height = `${this.height}px`;
  }

  private updateSize() {
    const newWidth = this.wrapper.clientWidth;
    const newHeight = this.height;

    this.getSamplesPerPx();

    this.layers.forEach(layer => layer.setSize(newWidth, newHeight));
  }

  private handleResize = () => {
    if (!this.wf.duration) return;

    requestAnimationFrame(() => {
      this.updateSize();
      this.wf.renderTimeline();
      this.resetWaveformRender();
      this.draw(false, true);
    });
  };

  // Reset the waveform values so it can be rendered again correctly
  // This is needed when the waveform container is resized, or visibility
  // of a layer is changed. Otherwise its possible to be blank.
  private resetWaveformRender() {
    this.lastRenderedAmp = 0;
    this.lastRenderedWidth = 0;
    this.lastRenderedZoom = 0;
    this.lastRenderedScrollLeftPx = 0;
  }

  private transferImage(layers: string[] = ['background', 'waveform', 'regions', 'controls']) {
    const main = this.layers.get('main')!;

    main.clear();

    if (layers) {
      const list = Array.from(this.layers).sort((a, b) => {
        return a[1].index - b[1].index;
      }).filter(([_, layer]) => layer.offscreen);

      list.forEach(([name, layer]) => {
        if (name === 'main') return;
        layer.transferTo(main);
      });
    }
  }
}
