import { Destructable } from '../Common/Destructable';
import { Waveform } from '../Waveform';
import { WaveformAudio, WaveformAudioOptions } from './WaveformAudio';

export type Options = {
  src: string,
};

type MediaResponse = ArrayBuffer | null;

export class MediaLoader extends Destructable {
  private wf: Waveform;
  private audio?: WaveformAudio | null;
  private loaded = false;
  private options: Options;
  private cancel: () => void;
  private decoderResolve?: () => void;
  private _duration = 0;

  decoderPromise?: Promise<void>;
  loadingProgressType: 'determinate' | 'indeterminate';

  constructor(wf: Waveform, options: Options) {
    super();
    this.wf = wf;
    this.options = options;
    this.cancel = () => {};
    this.loadingProgressType = 'determinate';
  }

  get duration() {
    return this._duration;
  }

  set duration(duration: number) {
    const changed = this._duration !== duration;

    this._duration = duration;

    if (changed) {
      this.wf.invoke('durationChanged', [duration]);
    }
  }

  get sampleRate() {
    return this.audio?.sampleRate || 0;
  }

  reset() {
    this.cancel();
    this.loaded = false;
    this.loadingProgressType = 'determinate';
    this.decoderResolve = undefined;
    this.decoderPromise = undefined;
  }

  async decodeAudioData() {
    if (!this.audio || this.isDestroyed) return null;

    return await this.audio.decodeAudioData({
      multiChannel: this.wf.params.splitChannels,
    });
  }

  async load(options: WaveformAudioOptions): Promise<WaveformAudio | null> {
    if (this.isDestroyed || this.loaded) {
      return null;
    }

    // Create this as soon as possible so that we can
    // update the loading progress from the waveform
    this.decoderPromise = new Promise(resolve => {
      this.decoderResolve = resolve;
    });

    this.createAnalyzer({
      ...options,
      src: this.options.src,
      splitChannels: this.wf.params.splitChannels,
      decoderType: this.wf.params.decoderType,
      playerType: this.wf.params.playerType,
    });

    // If this failed to allocate an audio decoder, we can't continue
    if (!this.audio) {
      throw new Error('MediaLoader: Failed to allocate audio decoder');
    }

    // If there is an existing decoder promise,
    // wait for it to resolve and use the existing
    // audio decoder information
    if (await this.audio.sourceDecoded()) {
      this.duration = this.audio.duration;
      this.decoderResolve?.();
      return this.audio;
    }

    // Get the audio data from the url src
    const req = await this.performRequest(this.options.src).catch((err: any) => {
      console.error('An audio loading error occurred', err);
      return null;
    });

    if (req) {
      try {
        await this.audio.initDecoder(req);

        // Notify the waveform that the audio decoder is ready
        this.decoderResolve?.();

        // The audio instance could be removed if it was destroyed
        // while the decoder was being initialized.
        // If this is the case, we can't continue
        if (!this.audio) return null;

        // Get the duration from the audio file as soon as it is ready
        this.duration = this.audio.duration;

        // Proceed with the rest of the decoding
        await this.decodeAudioData();

        return this.audio ?? null;
      } catch (err) {
        this.wf.setError(
          `An error occurred while decoding the audio file. Please select another file or try again. ${err.message}`,
        );
        console.error('An audio decoding error occurred', err);
      }
    }

    return null;
  }

  destroy() {
    if (this.isDestroyed) return;

    super.destroy();
    this.reset();

    if (this.audio) {
      this.audio.destroy();
      this.audio = null;
    }
  }

  private async performRequest(url: string): Promise<MediaResponse> {
    const xhr = new XMLHttpRequest();

    this.cancel = () => {
      xhr?.abort();
      this.cancel = () => {};
    };

    return new Promise<MediaResponse>((resolve, reject) => {
      xhr.responseType = 'arraybuffer';

      const errorHandler = () => {
        const error = new Error('HTTP error status: ' + xhr.status);

        error.name = 'HTTPError';

        this.wf.setError('HTTP error status: ' + xhr.status, error);
        reject(xhr);
      };

      xhr.addEventListener('progress', e => {
        if (e.lengthComputable) {
          this.loadingProgressType = 'determinate';
          this.wf.setLoadingProgress(e.loaded, e.total);
        } else {
          this.loadingProgressType = 'indeterminate';
          this.wf.setLoadingProgress(e.loaded, -1);
        }
      });

      xhr.addEventListener('load', async () => {
        this.wf.setLoadingProgress(undefined, undefined, true);
        resolve(xhr.response);
      });

      xhr.addEventListener('error', () => {
        errorHandler();
      });

      xhr.addEventListener('readystatechange', () => {
        if (xhr.readyState === 4 && xhr.status !== 200 && xhr.status !== 0) {
          errorHandler();
        }
      });

      // Handle relative urls, by converting them to absolute so any query params can be preserved
      const newUrl = new URL(url, /^https?/.exec(url) ? undefined : window.location.href);

      const signedUrlParams = [
        'X-Goog-Signature', // Google Cloud Storage
        'X-Amz-Signature', // S3|Minio|DigitalOcean|Backblaze
        'sig', // Azure
      ];

      // If the url is signed, we need to preserve the query params otherwise the signature will be invalid
      if (!signedUrlParams.some(p => newUrl.searchParams.has(p))) {
        // Arbitrary setting of query param to stop caching from reusing any media requests which may have less headers
        // cached than this request. This is to prevent a CORS error when the headers are different between partial
        // content and full content requests.
        newUrl.searchParams.set('lsref', '1');
      }

      xhr.open('GET', newUrl.toString(), true);
      xhr.send();
    });
  }

  private createAnalyzer(options: WaveformAudioOptions): WaveformAudio {
    if (this.audio) return this.audio;

    this.audio = new WaveformAudio(options);

    this.audio.on('decodingProgress', (chunk, total) => {
      this.wf.setDecodingProgress(chunk, total);
    });

    return this.audio;
  }
}
