// eslint-disable-next-line
// @ts-ignore
import { info } from '../Common/Utils';
import { BaseAudioDecoder } from './BaseAudioDecoder';

export class WebAudioDecoder extends BaseAudioDecoder {
  private arraybuffer?: ArrayBuffer;
  private context?: OfflineAudioContext;

  /**
   * Initialize the decoder if it has not already been initialized.
   */
  async init(arraybuffer: ArrayBuffer) {
    this.arraybuffer = arraybuffer;

    info('decode:worker:ready', this.src);
  }

  /**
   * Decode the audio file using the WebAudio API.
   */
  async decode(options?: { multiChannel?: boolean, captureAudioBuffer?: boolean }): Promise<void | AudioBuffer> {
    // If the worker has cached data we can skip the decode step
    if (this.sourceDecoded) {
      info('decode:cached', this.src);
      return;
    }
    if (this.sourceDecodeCancelled) {
      throw new Error('WebAudioDecoder decode cancelled and contains no data, did you call decoder.renew()?');
    }
    // The decoding process is already in progress, so wait for it to finish
    if (this.decodingPromise) {
      info('decode:inprogress', this.src);
      return this.decodingPromise;
    }
    if (!this.arraybuffer) throw new Error('WebAudioDecoder not initialized, did you call decoder.init()?');

    info('decode:start', this.src);

    // Generate a unique id for this decode operation
    this.decodeId = Date.now();
    // This is a shared promise which will be observed by all instances of the same source
    this.decodingPromise = new Promise(resolve => (this.decodingResolve = resolve as any));

    try {
      const buffer = (await new Promise((resolve, reject) => {
        if (!this.context) {
          this.context = this.createOfflineAudioContext();
        }
        if (!this.context || !this.arraybuffer)
          return reject(new Error('WebAudioDecoder not initialized, did you call decoder.init()?'));
        // Safari doesn't support promise based decodeAudioData by default
        if ('webkitAudioContext' in window) {
          this.context?.decodeAudioData(
            this.arraybuffer,
            data => resolve(data),
            err => reject(err),
          );
        } else {
          this.context
            ?.decodeAudioData(this.arraybuffer)
            .then(resolve)
            .catch(reject);
        }
      })) as AudioBuffer;

      this._channelCount = options?.multiChannel ? buffer.numberOfChannels : 1;
      this._sampleRate = buffer.sampleRate;
      this._duration = buffer.duration;

      const chunks = Array.from({ length: this._channelCount }).map(() => Array.from({ length: 1 }) as Float32Array[]);

      chunks.forEach((_, index) => {
        chunks[index] = [buffer.getChannelData(index)];
      });

      this.chunks = chunks;

      info('decode:complete', this.src);

      if (options?.captureAudioBuffer) {
        this.buffer = buffer;
      }

      return buffer;
    } finally {
      this.dispose();
    }
  }

  /**
   * Dispose and free up resources.
   */
  protected dispose() {
    delete this.arraybuffer;
    delete this.context;

    this.cleanupResolvers();
  }

  private createOfflineAudioContext(sampleRate?: number) {
    if (!(window as any).WebAudioOfflineAudioContext) {
      (window as any).WebAudioOfflineAudioContext = new (window.OfflineAudioContext ||
        (window as any).webkitOfflineAudioContext)(1, 2, sampleRate ?? this.sampleRate);
    }
    return (window as any).WebAudioOfflineAudioContext;
  }
}
