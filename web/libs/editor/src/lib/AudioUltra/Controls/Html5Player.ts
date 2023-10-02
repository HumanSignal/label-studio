import { WaveformAudio } from '../Media/WaveformAudio';
import { Player } from './Player';

export class Html5Player extends Player {
  mute() {
    super.mute();
    if (this.audio?.el) {
      this.audio.el.muted = true;
    }
  }

  unmute() {
    super.unmute();
    if (this.audio?.el) {
      this.audio.el.muted = false;
    }
  }

  /**
   * Get current playback speed
   */
  get rate() {
    if (this.audio?.el) {
      if (this.audio.el.playbackRate !== this._rate) {
        this.audio.el.playbackRate = this._rate; // restore the correct rate
      }
    }

    return this._rate;
  }

  /**
   * Set playback speed
   */
  set rate(value: number) {
    const rateChanged = this._rate !== value;

    this._rate = value;

    if (rateChanged) {
      if (this.audio?.el) {
        this.audio.el.playbackRate = value;
      }
      this.wf.invoke('rateChanged', [value]);
    }
  }

  init(audio: WaveformAudio) {
    super.init(audio);

    if (!this.audio || !this.audio.el) return;

    this.audio.on('resetSource', this.handleResetSource);

    this.audio.el.addEventListener('play', this.handlePlayed);
    this.audio.el.addEventListener('pause', this.handlePaused);
  }

  destroy() {
    super.destroy();

    if (this.audio?.el) {
      this.audio.el.removeEventListener('play', this.handlePlayed);
      this.audio.el.removeEventListener('pause', this.handlePaused);
    }
  }

  protected adjustVolume(): void {
    if (this.audio?.el) {
      this.audio.el.volume = this.volume;
    }
  }

  protected playAudio(_start?: number, _duration?: number): void {
    if (!this.audio || !this.audio.el) return;

    this.audio.el.currentTime = this.currentTime;
    this.audio.el.addEventListener('ended', this.handleEnded);
    this.bufferPromise = new Promise(resolve => {
      this.bufferResolve = resolve;
    });

    const time = this.currentTime;

    Promise.all([
      this.audio.el.play(),
      this.bufferPromise,
    ])
      .then(() => {
        this.timestamp = performance.now();

        // We need to compensate for the time it took to load the buffer
        // otherwise the audio will be out of sync of the timer we use to
        // render updates
        if (this.audio?.el) {
          // This must not be notifying of this adjustment otherwise it can cause sync issues and near infinite loops
          this.setCurrentTime(time);
          this.audio.el.currentTime = this.currentTime;
          this.watch();
        }
      });
  }

  protected updateCurrentSourceTime(timeChanged: boolean) {
    if (timeChanged && this.audio?.el) {
      this.audio.el.currentTime = this.time;
    }
  }

  protected canPause() {
    return !!(this.audio?.el && !this.audio.el.paused && this.hasPlayed);
  }

  protected disconnectSource(): boolean {
    if (super.disconnectSource()) {
      this.audio?.el?.removeEventListener('ended', this.handleEnded);
      return true;
    }
    return false;
  }

  protected handleResetSource = async () => {
    if (!this.audio?.el) return;

    const wasPlaying = this.playing;

    this.stop();
    this.audio.el.load();

    if (wasPlaying) this.play();
  };
}
