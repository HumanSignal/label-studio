import { WaveformAudio } from '../Media/WaveformAudio';
import { Waveform } from '../Waveform';
import { Player } from './Player';

export class WebAudioPlayer extends Player {
  private audioContext?: AudioContext;
  private audioBufferSource?: AudioBufferSourceNode;
  private gainNode?: GainNode;

  constructor(wf: Waveform) {
    super(wf);

    this.audioContext = new AudioContext();
    this.gainNode = this.audioContext.createGain();
    this.gainNode.connect(this.audioContext.destination);
  }

  async init(audio: WaveformAudio) {
    super.init(audio);

    if (!this.audioContext) return;

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  /**
   * Get current playback speed
   */
  get rate() {
    // restore the correct rate
    if (this.audioBufferSource?.playbackRate && this._rate !== this.audioBufferSource.playbackRate.value) {
      this.audioBufferSource.playbackRate.value = this._rate;
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
      if (this.audioBufferSource?.playbackRate) {
        this.audioBufferSource.playbackRate.value = this._rate;
      }
      this.wf.invoke('rateChanged', [value]);
    }
  }

  protected adjustVolume(): void {
    if (this.gainNode) {
      this.gainNode.gain.value = this.volume;
    }
  }

  destroy() {
    super.destroy();

    if (this.audioContext) {
      this.audioContext.close().finally(() => {
        delete this.audioContext;
      });
    }
  }

  protected playAudio(start?: number, _duration?: number) {
    if (!this.audioBufferSource) return;

    try {
      if (start) {
        this.audioBufferSource.start(0, start);
      } else {
        this.audioBufferSource.start(0);
      }
    } catch (err: any) {
      // InvalidStateError is thrown when the audio is already playing
      if (err.name !== 'InvalidStateError') throw err;
    }

    this.timestamp = performance.now();
    this.watch();
  }

  protected connectSource() {
    if (this.isDestroyed || !this.audioContext || !this.audio?.buffer || !this.gainNode || this.connected) return;
    this.connected = true;
    this.audioBufferSource = this.audioContext.createBufferSource();
    this.audioBufferSource.buffer = this.audio.buffer;
    this.audioBufferSource.connect(this.gainNode);
    this.audioBufferSource.onended = this.handleEnded;
  }

  protected disconnectSource(): boolean {
    if (this.isDestroyed || !this.connected || !this.audioBufferSource) return false;
    this.connected = false;

    try {
      this.audioBufferSource.stop();
    } catch (err: any) {
      // InvalidStateError is thrown when the audio is already stopped
      if (err.name !== 'InvalidStateError') throw err;
    }
    this.audioBufferSource.disconnect();
    this.audioBufferSource.onended = null;
    this.audioBufferSource = undefined;

    return true;
  }

  protected playSource(start?: number, end?: number) {
    this.disconnectSource();
    super.playSource(start, end);
  }

  protected updateCurrentSourceTime(timeChanged: boolean) {
    if (timeChanged && this.audioBufferSource) {
      this.disconnectSource();
      this.connectSource();
      this.audioBufferSource.start(0, this.time);
    }
  }

  protected cleanupSource() {
    super.cleanupSource();
    this.audioBufferSource = undefined;
  }
}
