import { info } from "../Common/Utils";
import type { BaseAudioDecoder } from "./BaseAudioDecoder";
import { WebAudioDecoder } from "./WebAudioDecoder";
import { AudioDecoder } from "./AudioDecoder";
import { WasmStreamingDecoder } from "./WasmStreamingDecoder";

export type DecoderCache = Map<string, BaseAudioDecoder>;
export type DecoderProxy = ReturnType<typeof decoderProxy>;

const REMOVAL_GRACE_PERIOD = 5000; // 5s grace period for removal of the decoder from the cache

function decoderProxy(
  cache: DecoderCache,
  src: string,
  splitChannels: boolean,
  decoderType: "webaudio" | "ffmpeg" | "wasm-stream" = "ffmpeg",
  wf?: any,
) {
  const key = `${src}:${splitChannels}:${decoderType}`;
  const decoder =
    cache.get(key) ??
    (decoderType === "wasm-stream"
      ? new WasmStreamingDecoder(src, wf)
      : decoderType === "ffmpeg"
        ? new AudioDecoder(src)
        : new WebAudioDecoder(src));

  if (decoderType === "wasm-stream" && wf) {
    (decoder as any).addWaveform?.(wf);
  }

  decoder.renew();
  cache.set(key, decoder);

  return new Proxy(decoder, {
    get(target, prop) {
      if (prop in target) {
        const instance = (cache.get(key) as BaseAudioDecoder) || target;

        // Cancel the removal of the decoder from the cache
        // It is still in use
        if (instance?.removalId) {
          clearTimeout(instance.removalId);
          info("decode:renew", key);
          instance.removalId = null;
          instance.renew();
          cache.set(key, instance);
        }

        const val = instance[prop as keyof BaseAudioDecoder];

        // When the instance is no longer in use, remove it from the cache
        // Allow for a grace period before removal so that the decoded results can be reused
        if (prop === "destroy" && typeof val === "function") {
          return (...args: any[]) => {
            if (instance.removalId) {
              clearTimeout(instance.removalId);
            }
            instance.removalId = setTimeout(() => {
              info("decodepool:destroy", key);
              cache.delete(key);
              (val.bind(instance) as any)(...args);
            }, REMOVAL_GRACE_PERIOD);
            cache.set(key, instance);
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

  getDecoder(
    src: string,
    splitChannels: boolean,
    decoderType: "webaudio" | "ffmpeg" | "wasm-stream" = "ffmpeg",
    wf?: any,
  ): DecoderProxy {
    const decoder = decoderProxy(AudioDecoderPool.cache, src, splitChannels, decoderType, wf);

    return decoder;
  }
}

export const audioDecoderPool = new AudioDecoderPool();
