import { ff } from "@humansignal/core";
import { patchPlayPauseMethods } from "../../../utils/patchPlayPauseMethods";
import { Events } from "../Common/Events";
import { audioDecoderPool } from "./AudioDecoderPool";
import { type BaseAudioDecoder, DEFAULT_FREQUENCY_HZ } from "./BaseAudioDecoder";

const isSyncedBuffering = ff.isActive(ff.FF_SYNCED_BUFFERING);

export interface WaveformAudioOptions {
  src?: string;
  splitChannels?: boolean;
  decoderType?: "ffmpeg" | "webaudio" | "none";
  playerType?: "html5" | "webaudio";
}

interface WaveformAudioEvents {
  decodingProgress: (chunk: number, total: number) => void;
  canplay: () => void;
  resetSource: () => void;
  waiting: () => void;
}

export class WaveformAudio extends Events<WaveformAudioEvents> {
  decoder?: BaseAudioDecoder;
  decoderPromise?: Promise<void>;
  mediaPromise?: Promise<void>;
  mediaReject?: (err: any) => void;
  el?: HTMLAudioElement;
  buffer?: AudioBuffer | void;

  // private backed by audio element and getters/setters
  // underscored to keep the public API clean
  private splitChannels = false;
  private decoderType: "ffmpeg" | "webaudio" | "none" = "ffmpeg";
  private playerType: "html5" | "webaudio" = "html5";
  private src?: string;
  private mediaResolve?: () => void;
  private hasLoadedSource = false;
  private _durationOverride?: number; // Used when decoder is "none"

  constructor(options: WaveformAudioOptions) {
    super();
    this.splitChannels = options.splitChannels ?? false;
    this.decoderType = options.decoderType ?? this.decoderType;
    this.playerType = options.playerType ?? this.playerType;
    this.src = options.src;
    this.createAudioDecoder();
    this.createMediaElement();
  }

  get channelCount() {
    return this.decoder?.channelCount || 1;
  }

  get duration() {
    // Use duration override when decoder is "none"
    if (this._durationOverride !== undefined) return this._durationOverride;
    if (this.el) return this.el?.duration ?? 0;
    return this.decoder?.duration ?? 0;
  }

  get sampleRate() {
    return this.decoder?.sampleRate || DEFAULT_FREQUENCY_HZ;
  }

  get dataLength() {
    return this.decoder?.dataLength || 0;
  }

  get dataSize() {
    return this.decoder?.dataSize || 0;
  }

  disconnect() {
    try {
      if (this.el && !this.el.paused) {
        this.el.pause();
      }
    } catch {
      // ignore
    }
    this.decoder?.cancel();
  }

  /**
   * Set duration without decoding for fast loading mode.
   * Used when decoder type is "none".
   */
  setDurationWithoutDecoding(duration: number) {
    this._durationOverride = duration;
  }

  destroy() {
    super.destroy();
    this.disconnect();

    delete this.mediaResolve;
    delete this.mediaReject;
    delete this.mediaPromise;
    delete this.decoderPromise;
    this.decoder?.destroy();
    delete this.decoder;
    this.el?.removeEventListener("error", this.mediaReady);
    this.el?.removeEventListener("canplaythrough", this.mediaReady);
    this.el?.remove();
    delete this.el;
    delete this.buffer;
  }

  get chunks(): Float32Array[][] | undefined {
    if (!this.decoder) return;

    return this.decoder.chunks;
  }

  async sourceDecoded() {
    // When decoder is "none", there's no decoding to wait for
    if (this.decoderType === "none") return true;

    if (!this.decoder) return false;
    try {
      if (this.mediaPromise) {
        await this.mediaPromise;
      }
      if (this.decoderPromise) {
        await this.decoderPromise;
      }

      if (this.playerType === "webaudio" && this.decoder.buffer) {
        this.buffer = this.decoder.buffer;
      }

      return this.decoder.sourceDecoded;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  async initDecoder(arraybuffer?: ArrayBuffer) {
    if (!this.decoder) return;

    if (!this.decoderPromise && arraybuffer) {
      this.decoderPromise = this.decoder.init(arraybuffer);
    }

    return this.decoderPromise;
  }

  async decodeAudioData(options: { multiChannel?: boolean; captureAudioBuffer?: boolean } = {}) {
    // Skip decoding entirely if decoder type is "none"
    if (this.decoderType === "none") {
      return;
    }

    if (!this.decoder) return;

    // need to capture the actual AudioBuffer from the decoder
    // so we can use it in the audio element
    options.captureAudioBuffer = this.playerType === "webaudio";

    const buffer = await this.decoder.decode(options);

    if (options.captureAudioBuffer && buffer) {
      this.buffer = buffer;
    }

    return;
  }

  private createMediaElement() {
    if (!this.src || this.el || this.playerType !== "html5") return;

    this.el = patchPlayPauseMethods(document.createElement("audio"));
    this.el.preload = "auto";
    this.el.setAttribute("data-testid", "waveform-audio");
    this.el.style.display = "none";

    this.el.crossOrigin = "anonymous";

    document.body.appendChild(this.el);

    this.mediaPromise = new Promise((resolve, reject) => {
      this.mediaResolve = resolve;
      this.mediaReject = reject;
    });

    this.el.addEventListener("canplaythrough", this.mediaReady);
    this.el.addEventListener("error", this.mediaError);
    if (isSyncedBuffering) {
      this.el.addEventListener("waiting", this.mediaWaiting);
    }
    this.loadMedia();
  }

  mediaError = () => {
    // If this source has already loaded, we will retry the source url
    if (this.hasLoadedSource && this.el) {
      this.hasLoadedSource = false;
      this.invoke("resetSource");
    } else {
      // otherwise it's an unrecoverable error
      this.mediaReject?.(this.el?.error);
    }
  };

  mediaWaiting = () => {
    // If this has already buffered the time segment we are on, we don't need to report waiting
    if (this.el && this.el.buffered.length > 0 && this.el.currentTime > this.el.buffered.end(0)) {
      return;
    }

    this.invoke("waiting");
  };

  mediaReady = () => {
    if (this.mediaResolve) {
      this.mediaResolve?.();
      this.mediaResolve = undefined;
    }

    this.hasLoadedSource = true;
    this.invoke("canplay");
  };

  /**
   * Load the media element with the audio source and begin an initial playback buffer
   */
  private loadMedia() {
    if (!this.src || !this.el) return;

    this.el.src = this.src;
  }

  private createAudioDecoder() {
    // Skip decoder creation when decoderType is "none"
    if (this.decoderType === "none") return;

    if (!this.src || this.decoder) return;

    this.decoder = audioDecoderPool.getDecoder(this.src, this.splitChannels, this.decoderType);

    this.decoder.on("progress", (chunk, total) => {
      this.invoke("decodingProgress", [chunk, total]);
    });
  }
}
