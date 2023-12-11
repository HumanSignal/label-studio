import { Events } from './Common/Events';
import { MediaLoader } from './Media/MediaLoader';
import { Player } from './Controls/Player';
import { Html5Player } from './Controls/Html5Player';
import { WebAudioPlayer } from './Controls/WebAudioPlayer';
import { Tooltip, TooltipOptions } from './Tooltip/Tooltip';
import { Cursor, CursorOptions, CursorSymbol } from './Cursor/Cursor';
import { RegionGlobalEvents, RegionOptions } from './Regions/Region';
import { Visualizer } from './Visual/Visualizer';
import { Regions, RegionsGlobalEvents, RegionsOptions } from './Regions/Regions';
import { Timeline, TimelineOptions } from './Timeline/Timeline';
import { Padding } from './Common/Style';
import { clamp, getCursorTime } from './Common/Utils';
import { PlayheadOptions } from './Visual/PlayHead';
import { Layer } from './Visual/Layer';

export interface WaveformOptions {
  /** URL of an audio or video */
  src: string;

  /** Container to render to */
  container: string | HTMLElement;

  /**
   * Height of the interface. Inferred from the container size
   * @default 110
   * */
  height?: number;

  /**
   * Height of a single waveform per channel.
   * @default 30
   * */
  waveHeight?: number;

  /**
   * Zoom factor. 1 – no zoom
   * @default 1
   * */
  zoom?: number;

  /**
   * Amplitude factor. 1 – no zoom
   * @default 1
   * */
  amp?: number;

  /**
   * Volume 0..1, 0 – muted
   * @default 1
   * */
  volume?: number;

  /**
   * Muted true/false. Preserves the latest set volume
   * @default false
   * */
  muted?: boolean;

  /**
   * Playback speed rate. 1 – normal speed
   * @default 1
   * */
  rate?: number;

  /**
   * Auto-center the view to the cursor
   * @default false
   * */
  autoCenter?: boolean;

  /**
   * Show channels separately
   * */
  splitChannels?: boolean;

  /**
   * Decoder used to decode the audio to waveform data.
   */
  decoderType?: 'webaudio' | 'ffmpeg';

  /**
   * Player used to play the audio data.
   */
  playerType?: 'html5' | 'webaudio';

  /**
   * Center the view to the cursor when zoomin
   * @default false
   */
  zoomToCursor?: boolean;

  /**
   * Color of the grid
   */
  gridColor?: string;

  /**
   * Thickness of the grid
   */
  gridWidth?: number;

  /**
   * Width of the cursor in pixels
   */
  cursorWidth?: number;

  /**
   * Color of the wave
   */
  waveColor?: string;

  /**
   * Color of the progress
   */
  waveProgressColor?: string;

  /**
   * Waveform background color
   */
  backgroundColor?: string;

  /**
   * How to follow the cursor
   * - center - center the view to the cursor
   * - paged - move the view to the cursor
   */
  followCursor?: 'center' | 'paged' | false;

  // Spectro styles
  // @todo: implement the sepctrogram

  // Other options
  seekStep?: number;

  // Regions
  regions?: RegionsOptions;

  padding?: Padding;

  autoPlayNewSegments?: boolean;

  // Cursor options
  cursor?: CursorOptions;

  // Tooltip options
  tooltip?: TooltipOptions;

  // Playhead options
  playhead?: PlayheadOptions;

  // Timeline options
  timeline?: TimelineOptions;

  /**
   * Experimental features
   */
  experimental?: {
    backgroundCompute: boolean,
    denoize: boolean,
  };
}
interface WaveformEventTypes extends RegionsGlobalEvents, RegionGlobalEvents {
  load: () => void;
  error: (error: Error) => void;
  resize: (wf: Waveform, width: number, height: number) => void;
  pause: () => void;
  play: () => void;
  playing: (currentTime: number) => void;
  seek: (currentTime: number) => void;
  playend: () => void;
  zoom: (zoom: number) => void;
  muted: (muted: boolean) => void;
  volumeChanged: (value: number) => void;
  rateChanged: (value: number) => void;
  durationChanged: (duration: number) => void;
  scroll: (scroll: number) => void;
  layersUpdated: (layers: Map<string, Layer>) => void;
}

export class Waveform extends Events<WaveformEventTypes> {
  private src: string;
  private media!: MediaLoader;
  private visualizer!: Visualizer;
  private timeline!: Timeline;
  private focusTimeout: any = null;

  tooltip!: Tooltip;
  cursor!: Cursor;
  player!: Player;
  params: WaveformOptions;
  regions!: Regions;
  loaded = false;
  renderedChannels = false;
  autoPlayNewSegments = false;

  constructor(params: WaveformOptions) {
    super();

    if (!params?.timeline) {
      params.timeline = { placement: 'top' };
    }

    params.decoderType = params.decoderType ?? 'webaudio';
    // Need to restrict ffmpeg to html5 player as it doesn't support webaudio
    // because of chunked decoding raw Float32Arrays and no AudioBuffer support
    params.playerType = params.decoderType === 'ffmpeg' ? 'html5' : params.playerType ?? 'html5';

    this.src = params.src;
    this.params = params;

    this.init();
  }

  private init() {
    this.media = new MediaLoader(this, {
      src: this.src,
    });

    this.tooltip = new Tooltip(this.params?.tooltip);
    this.visualizer = new Visualizer(this.params, this);
    this.cursor = new Cursor(
      {
        x: 0,
        y: 0,
        width: this.params?.cursorWidth ?? 1,
        ...this.params?.cursor,
      },
      this.visualizer,
    );
    this.timeline = new Timeline(
      {
        gridColor: this.params.gridColor,
        gridWidth: this.params.gridWidth,
        ...this.params?.timeline,
      },
      this,
      this.visualizer,
    );
    this.regions = new Regions(
      {
        ...this.params?.regions,
      },
      this,
      this.visualizer,
    );

    this.autoPlayNewSegments = this.params.autoPlayNewSegments ?? this.autoPlayNewSegments;

    this.player = this.params.playerType === 'html5' ? new Html5Player(this) : new WebAudioPlayer(this);

    this.initEvents();

    this.loadingState();
  }

  renderTimeline() {
    this.timeline.render();
  }

  loadingState() {
    this.visualizer.setLoading(true);
    this.renderTimeline();
    this.visualizer.draw(true);
  }

  async load() {
    if (this.isDestroyed) return;

    const loader = this.media.load({
      muted: this.params.muted ?? false,
      volume: this.params.volume ?? 1,
      rate: this.params.rate ?? 1,
    });

    // Draw the timeline as soon as possible
    if (this.media.decoderPromise) {
      await this.media.decoderPromise;

      this.renderTimeline();
      this.visualizer.draw(true);
    }

    // Wait for the file to be decoded
    const audio = await loader;

    if (this.isDestroyed) return;

    // Initialize the visualizer and player
    if (audio) {
      // Draw the timeline once the audio is decoded.
      // This is only required for webaudio as it requires the entire file to be decoded
      // to render the timline with the correct duration.
      if (this.params.playerType === 'webaudio') {
        this.media.duration = audio.duration;
        this.renderTimeline();
        this.visualizer.draw(true);
      }

      this.player.init(audio);
      this.visualizer.init(audio);
      this.loaded = true;
      this.invoke('load');
    }
  }

  /**
   * Sync the cursor with the current time of the audio.
   * Useful when the audio is getting controlled externally.
   */
  syncCursor() {
    const time = this.currentTime;

    // @todo - find a less hacky way to consistently update just the cursor
    this.visualizer.updateCursorToTime(time);
    this.visualizer.draw(true);
  }

  seek(value: number) {
    this.player.seek(value);
  }

  seekForward(value?: number) {
    this.seek(this.currentTime + (value ?? this.params.seekStep ?? 1));
  }

  seekBackward(value?: number) {
    this.seek(this.currentTime - (value ?? this.params.seekStep ?? 1));
  }

  scrollToRegion(time: number) {
    if (this.zoom === 1) return;

    const offset = this.visualizer.width / 2 / this.visualizer.zoomedWidth;

    const scrollLeft = clamp(time / this.duration - offset, 0, 1);

    this.visualizer.setScrollLeft(scrollLeft, true, true);
    this.invoke('scroll', [scrollLeft]);
  }

  /**
   * Play the track
   * @param start Optionally defines start of the playback in seconds
   * @param end Optionally defines the end of the playback in seconds
   */
  play(start?: number, end?: number) {
    this.player.play(start, end);
  }

  /**
   * Pause playback
   */
  pause() {
    this.player.pause();
  }

  /**
   * Toggle playback
   */
  togglePlay() {
    if (this.playing) {
      this.pause();
    } else {
      this.play();
    }
  }

  setLoadingProgress(loaded?: number, total?: number, complete?: boolean) {
    this.visualizer.setLoadingProgress(loaded, total, complete);
  }

  setDecodingProgress(chunk?: number, total?: number) {
    this.visualizer.setDecodingProgress(chunk, total);
  }

  setError(errorMessage: string, error?: Error) {
    this.invoke('error', [error || new Error(errorMessage)]);
    this.visualizer.setError(errorMessage);
  }

  /**
   * Stop playback
   */
  stop() {
    this.player.stop();
  }

  /**
   * Detach all the event handlers, cleanup the cache, remove Waveform from the dom
   */
  destroy() {
    if (this.isDestroyed) return;

    this.regions.destroy();
    this.media.destroy();
    this.player.destroy();
    this.visualizer.destroy();
    this.cursor.destroy();
    this.tooltip.destroy();

    super.destroy(); // Events -> Destructable
  }

  addRegions(regions: RegionOptions[], render = true) {
    this.regions.addRegions(regions, render);
  }

  addRegion(options: RegionOptions, render = true) {
    return this.regions.addRegion(options, render);
  }

  updateRegion(options: RegionOptions, render = true) {
    return this.regions.updateRegion(options, render);
  }

  updateLabelVisibility(visible: boolean) {
    this.regions.updateLabelVisibility(visible);
  }

  removeRegion(regionId: string, render = true) {
    this.regions.removeRegion(regionId, render);
  }

  getLayers() {
    return this.visualizer.getLayers();
  }

  getLayer(name: string) {
    return this.visualizer.getLayer(name);
  }

  /**
   * Current playback state
   */
  get playing() {
    return this.player.playing;
  }

  /**
   * Sets zoom multiplier 1-150
   * @default 1
   */
  get zoom() {
    return this.visualizer.getZoom();
  }

  set zoom(value: number) {
    this.visualizer.setZoom(value);
  }

  /**
   * Current volume 0..1, 0 is muted
   * @default 1
   */
  get volume() {
    return this.player.volume;
  }

  set volume(value: number) {
    this.player.volume = value;
  }

  /**
   * Mute playback
   */
  get muted() {
    return this.player.muted;
  }

  set muted(value: boolean) {
    this.player.muted = value;
  }

  /**
   * Scroll to a particular second of the track
   * @default 1
   */
  get scroll() {
    return ((this.duration * this.visualizer.getScrollLeft()) / this.zoom) * 1000;
  }

  set scroll(time: number) {
    const scrollLeft = (time / this.duration) * this.zoom;

    this.visualizer.setScrollLeft(scrollLeft);
    this.invoke('scroll', [scrollLeft]);
  }

  /**
   * Playback speed
   * @default 1
   */
  get rate() {
    return this.player.rate;
  }

  set rate(value: number) {
    this.player.rate = value;
  }

  /**
   * Current playback time in seconds
   */
  get currentTime() {
    return this.player.currentTime;
  }

  set currentTime(value: number) {
    this.setCurrentTime(value, true);
  }

  setCurrentTime(value: number, notify = false) {
    if (notify) {
      this.player.seek(value);
    } else {
      this.player.seekSilent(value);
    }
  }

  /**
   * Waveform amplification factor
   */
  get amp() {
    return this.visualizer.getAmp();
  }

  set amp(value: number) {
    this.visualizer.setAmp(value);
  }

  /**
   * Track duration in seconds
   */
  get duration() {
    return this.media.duration;
  }

  /**
   * Returns audio frequency data
   */
  get sampleRate() {
    return this.media.sampleRate;
  }

  /**
   * Initialize events
   */
  private initEvents() {
    this.cursor.on('mouseMove', this.handleCursorMove);
    this.visualizer.on('layersUpdated', () => this.invoke('layersUpdated', [this.getLayers()]));
  }

  /**
   * Handle cursor move event
   */
  private handleCursorMove = (e: MouseEvent) => {
    if (e.target && this.visualizer.container.contains(e.target as Node)) {
      if (this.loaded && this.cursor.inView) {
        if (this.focusTimeout) clearTimeout(this.focusTimeout);

        this.focusTimeout = setTimeout(() => {
          if (!this.cursor.hasFocus()) {
            this.cursor.set(CursorSymbol.crosshair);
          }
        }, 1);

        const cursorTime = getCursorTime(e, this.visualizer, this.duration);
        const timeDate = new Date(cursorTime * 1000);
        const onlyTime = timeDate.toISOString().match(/T(.*?)Z/)?.[1];

        this.tooltip.show(e.pageX, e.pageY + 16, onlyTime);
      } else {
        this.cursor.set(CursorSymbol.default);
      }
      this.cursor.show();
    } else {
      this.cursor.hide();
      this.tooltip.hide();
    }
  };
}
