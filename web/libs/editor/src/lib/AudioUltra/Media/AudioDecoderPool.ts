import { info } from '../Common/Utils';
import { BaseAudioDecoder } from './BaseAudioDecoder';
import { WebAudioDecoder } from './WebAudioDecoder';
import { AudioDecoder } from './AudioDecoder';

export type DecoderCache = Map<string, BaseAudioDecoder>;
export type DecoderProxy = ReturnType<typeof decoderProxy>;

const REMOVAL_GRACE_PERIOD = 5000; // 5s grace period for removal of the decoder from the cache

function decoderProxy(cache: DecoderCache, src: string, splitChannels: boolean, decoderType: 'webaudio' | 'ffmpeg' = 'ffmpeg') {
  const key = `${src}:${splitChannels}:${decoderType}`;
  const decoder = cache.get(key) ?? (decoderType === 'ffmpeg' ? new AudioDecoder(src) : new WebAudioDecoder(src));

  decoder.renew();
  cache.set(key, decoder);

  return new Proxy(decoder, {
    get(target, prop) {
      if (prop in target) {
        // Operate on the instance, and cache it
        const instance = cache.get(key) as BaseAudioDecoder;

        // Cancel the removal of the decoder from the cache
        // It is still in use
        if (instance?.removalId) {
          clearTimeout(instance.removalId);
          info('decode:renew', key);
          instance.removalId = null;
          instance.renew();
          cache.set(key, instance);
        }

        const val = instance[prop as keyof BaseAudioDecoder];

        // When the instance is no longer in use, remove it from the cache
        // Allow for a grace period before removal so that the decoded results can be reused
        if (prop === 'destroy' && typeof val === 'function') {
          return (...args: any[]) => {
            instance.removalId = setTimeout(() => {
              info('decodepool:destroy', key);
              cache.delete(key);
            }, REMOVAL_GRACE_PERIOD);
            cache.set(key, instance);
            return (val.bind(instance) as any)(...args);
          };
        }

        return val;
      }
      return undefined;
    },
  });
}

export class AudioDecoderPool {
  static cache: DecoderCache = new Map();

  getDecoder(src: string, splitChannels: boolean, decoderType: 'webaudio' | 'ffmpeg' = 'ffmpeg'): DecoderProxy {
    const decoder = decoderProxy(AudioDecoderPool.cache, src, splitChannels, decoderType);

    return decoder;
  }
}

export const audioDecoderPool = new AudioDecoderPool();

