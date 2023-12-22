import { Destructable } from '../Common/Destructable';
import { WaveformAudio } from '../Media/WaveformAudio';
import { clamp } from '../Common/Utils';
import { Waveform } from '../Waveform';

export abstract class Player extends Destructable {
  protected audio?: WaveformAudio;
  protected wf: Waveform;
  protected timer!: number;
  protected loop: { start: number, end: number } | null = null;
  protected timestamp = 0;
  protected time = 0;
  protected connected = false;
  protected bufferPromise?: Promise<void>;
  protected bufferResolve?: () => void;
  protected ended = false;
  protected _rate = 1;
  protected _volume = 1;
  protected _savedVolume = 1;

  playing = false;
  hasPlayed = false;

  constructor(wf: Waveform) {
    super();

    this.wf = wf;
    this._rate = wf.params.rate ?? this._rate;
    this.volume = wf.params.volume ?? this._volume;
    this._savedVolume = this.volume;
    if (wf.params.muted) {
      this.muted = true;
    }
  }

  get currentTime() {
    return this.time;
  }

  protected set currentTime(value: number) {
    this.ended = false;
    this.setCurrentTime(value, true);
  }

  setCurrentTime(value: number, notify = false) {
    const timeChanged = this.time !== value;

    this.time = value;

    this.updateCurrentSourceTime(timeChanged);

    if (notify && timeChanged) {
      this.wf.invoke('seek', [this.time]);
    }
  }

  protected abstract updateCurrentSourceTime(timeChanged: boolean): void;

  protected canPause() {
    return this.hasPlayed;
  }

  get volume() {
    return this._volume ?? 1;
  }

  set volume(value: number) {
    const volumeChanged = this.volume !== value;

    if (volumeChanged) {
      if (value === 0) {
        this.muted = true;
      } else if (this.muted) {
        this.muted = false;
      } else {
        this._volume = value;
      }
      this.adjustVolume();

      this.wf.invoke('volumeChanged', [this.volume]);
    }
  }

  protected abstract adjustVolume(): void;

  get muted() {
    return this._volume === 0 ;
  }

  set muted(muted: boolean) {
    if (this.muted === muted) return;

    if (muted) {
      this.mute();
    } else {
      this.unmute();
    }

    this.wf.invoke('muted', [this.muted]);
  }

  mute() {
    this._savedVolume = this.volume || 1;
    this._volume = 0;
  }

  unmute() {
    this._volume = this._savedVolume || 1; // 1 is the default volume, if manually muted this will be 0 and we want to restore to 1
  }

  /**
   * Get current playback speed
   */
  get rate() {
    return this._rate;
  }

  /**
   * Set playback speed
   */
  set rate(value: number) {
    const rateChanged = this._rate !== value;

    this._rate = value;

    if (rateChanged) {
      this.wf.invoke('rateChanged', [value]);
    }
  }

  get duration() {
    return this.audio?.duration ?? 0;
  }

  init(audio: WaveformAudio) {
    this.audio = audio;
    this.audio.on('canplay', this.handleCanPlay);
  }

  seek(time: number) {
    const newTime = clamp(time, 0, this.duration);

    this.currentTime = newTime;

    if (this.playing) {
      this.updatePlayback();
    }
  }

  seekSilent(time: number) {
    const newTime = clamp(time, 0, this.duration);

    this.ended = false;
    this.setCurrentTime(newTime);

    if (this.playing) {
      this.updatePlayback();
    }
  }

  play(from?: number, to?: number) {
    if (this.isDestroyed || this.playing || !this.audio) return;
    if (this.ended) {
      this.currentTime = from ?? 0;
    }
    const { start, end } = this.playSelection(from, to);

    this.playRange(start, end);
  }

  protected handlePlayed = () => {
    this.hasPlayed = true;
  };

  protected handlePaused = () => {
    this.hasPlayed = false;
  };

  protected handleEnded = () => {
    if (this.loop) return;
    this.updateCurrentTime(true);
  };

  protected handleCanPlay = () => {
    this.bufferResolve?.();
  };

  private playEnded() {
    this.ended = true;
    this.pause();
    this.wf.invoke('playend');
  }

  pause() {
    if (this.isDestroyed || !this.playing || !this.audio) return;
    this.stopWatch();
    this.disconnectSource();
    this.playing = false;
    this.loop = null;
    this.wf.invoke('pause');
    this.wf.invoke('seek', [this.currentTime]);
  }

  stop() {
    if (this.isDestroyed) return;
    this.stopWatch();
    this.disconnectSource();
    this.playing = false;
    this.loop = null;
  }

  destroy() {
    this.stop();
    this.cleanupSource();
    this.bufferPromise = undefined;
    this.bufferResolve = undefined;
    super.destroy();
  }

  protected updatePlayback() {
    const { start, end } = this.playSelection();

    this.playSource(start, end);
  }

  protected playRange(start?: number, end?: number) {
    if (start) {
      this.currentTime = start;
    }
    this.playSource(start, end);
    this.wf.invoke('play');
  }

  protected playSource(start?: number, duration?: number) {
    this.stopWatch();
    this.connectSource();

    if (!this.audio) return;

    this.playing = true;

    if (this.loop) {
      if (this.currentTime < this.loop.start || this.currentTime > this.loop.end) {
        this.currentTime = this.loop.start;
      }

      duration = clamp(this.loop.end, 0, this.duration);
      start = clamp(this.loop.start, 0, duration);
    }

    this.playAudio(start, duration);
  }

  protected abstract playAudio(start?: number, duration?: number): void;

  protected playSelection(from?: number, to?: number) {
    const selected = this.wf.regions.selected;

    const looping = selected.length > 0;

    if (looping) {
      const regionsStart = Math.min(...selected.map(r => r.start));
      const regionsEnd = Math.max(...selected.map(r => r.end));

      const start = clamp(this.currentTime, regionsStart, regionsEnd);

      this.loop = { start: regionsStart, end: regionsEnd };

      return {
        start,
        end: regionsEnd,
      };
    }
    const start = from ?? this.currentTime;
    const end = to !== undefined ? to - start : undefined;

    return { start, end };
  }

  protected connectSource() {
    if (this.isDestroyed || !this.audio || this.connected) return;
    this.connected = true;

    // Control pausing playback with checks to whether the audio has been asynchronously played already
    // This is to prevent DomException: The play() request was interrupted by a call to pause()
    if (this.canPause()) {
      this.audio.disconnect();
    }
  }

  protected disconnectSource(): boolean {
    if (this.isDestroyed || !this.audio || !this.connected) return false;
    this.connected = false;

    // Control pausing playback with checks to whether the audio has been asynchronously played already
    // This is to prevent DomException: The play() request was interrupted by a call to pause()
    if (this.canPause()) {
      this.audio.disconnect();
    }

    return true;
  }

  protected cleanupSource() {
    if (this.isDestroyed || !this.audio) return;
    this.disconnectSource();
    this.audio.destroy();
    delete this.audio;
  }

  protected watch = () => {
    if (!this.playing) return;

    this.updateCurrentTime();
    this.updateLoop(this.time);

    this.timer = requestAnimationFrame(this.watch);
  };

  protected updateLoop(time: number) {
    if (this.isDestroyed || !this.loop) return;
    if (time >= this.loop.end) {
      this.currentTime = this.loop.start;
      this.playing = false;
      this.play();
    }
  }

  protected updateCurrentTime(forceEnd = false) {
    const now = performance.now();
    const tick = ((now - this.timestamp) / 1000) * this.rate;

    this.timestamp = now;

    const end = this.loop?.end ?? this.duration;

    const newTime = forceEnd ? this.duration : clamp(this.time + tick, 0, end);

    this.time = newTime;

    if (!this.loop && this.time >= this.duration - tick) {
      this.time = this.duration;
      this.wf.invoke('playing', [this.duration]);
      this.playEnded();
    } else {
      this.wf.invoke('playing', [this.time]);
    }
  }

  protected stopWatch() {
    cancelAnimationFrame(this.timer);
  }
}
