import { Events } from '../Common/Events';
import { info } from '../Common/Utils';

interface AudioDecoderEvents {
  progress: (chunk: number, total: number) => void;
}

export const DEFAULT_FREQUENCY_HZ = 44100;

export abstract class BaseAudioDecoder extends Events<AudioDecoderEvents> {
  chunks?: Float32Array[][];
  protected cancelled = false;
  protected decodeId = 0; // if id=0, decode is not in progress
  protected _dataLength = 0;
  protected _dataSize = 0;
  protected _channelCount = 1;
  protected _sampleRate = DEFAULT_FREQUENCY_HZ;
  protected _duration = 0;

  protected decodingResolve?: () => void;
  decodingPromise: Promise<void> | undefined;
  buffer?: AudioBuffer | void;

  /**
   * Timeout for removal of the decoder from the cache.
   * Any subsequent requests for the same source will renew the decoder and cancel the removal.
   */
  removalId: any = null;

  constructor(protected src: string) {
    super();
  }

  get channelCount() {
    return this._channelCount;
  }

  get sampleRate() {
    return this._sampleRate;
  }

  get duration() {
    return this._duration;
  }

  get dataLength() {
    if (this.chunks && !this._dataLength) {
      this._dataLength =
        (this.chunks?.reduce((a, b) => a + b.reduce((_a, _b) => _a + _b.length, 0), 0) ?? 0) / this._channelCount;
    }
    return this._dataLength;
  }

  get dataSize() {
    if (this.chunks && !this._dataSize) {
      this._dataSize =
        (this.chunks?.reduce((a, b) => a + b.reduce((_a, _b) => _a + _b.byteLength, 0), 0) ?? 0) / this._channelCount;
    }
    return this._dataSize;
  }

  get sourceDecoded() {
    return this.chunks !== undefined;
  }

  get sourceDecodeCancelled() {
    return this.cancelled && this.decodeId === 0;
  }

  /**
   * Cancel the decoding process.
   * This will stop the generator and dispose the worker.
   */
  cancel() {
    if (!this.cancelled) {
      info('decode:cancelled', this.src);
    }
    this.cancelled = true;
    this.decodeId = 0;

    this.dispose();
  }

  /**
   * Dispose the decoder, worker, or any other resources.
   */
  protected abstract dispose(): void;

  /**
   * Renew the decoder instance to allow reuse of the same decoder with any resultant encoding data.
   */
  renew() {
    this.cancelled = false;
  }

  /**
   * Since this is a singleton, we don't want to destroy the instance but clear all active
   * subscriptions and cancel any pending decoding work
   */
  destroy() {
    super.removeAllListeners();
    this.cancel();
  }

  /**
   * Resolve and remove the shared decoding promise.
   */
  cleanupResolvers() {
    this.decodingResolve?.();
    this.decodingResolve = undefined;
    this.decodingPromise = undefined;
    info('decode:cleanup', this.src);
  }

  abstract init(arraybuffer: ArrayBuffer): Promise<void>;
  abstract decode(options?: { multiChannel?: boolean }): Promise<void | AudioBuffer>;
}
