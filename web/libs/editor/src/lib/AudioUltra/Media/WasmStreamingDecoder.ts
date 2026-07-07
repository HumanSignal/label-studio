import { BaseAudioDecoder } from "./BaseAudioDecoder";
import { info } from "../Common/Utils";
import { type AudioDecoderWorker, getAudioDecoderWorker } from "@humansignal/audio-file-decoder";
import decodeAudioWasmUrl from "@humansignal/audio-file-decoder/decode-audio.wasm?url";

export class WasmStreamingDecoder extends BaseAudioDecoder {
  private worker: AudioDecoderWorker | undefined;
  private rawChunks: (Float32Array | undefined)[][] = [];
  private chunkAccessHistory: number[] = [];
  private MAX_CACHED_CHUNKS = 200;
  samplesPerChunk = 160000;
  private totalChunks = 0;

  private loadingChunks = new Set<number>();
  private pendingThrottles = new Map<number, any>();
  private waveforms = new Set<any>();
  private wf?: any;
  private refreshPromise: Promise<string> | null = null;

  constructor(src: string, wf?: any) {
    super(src);
    this.wf = wf;
    if (wf) {
      this.addWaveform(wf);
    }
  }

  addWaveform(wf: any) {
    if (wf) {
      this.waveforms.add(wf);
    }
  }

  private getActiveWaveforms(): any[] {
    const active: any[] = [];
    for (const wf of this.waveforms) {
      if (wf.isDestroyed) {
        this.waveforms.delete(wf);
      } else {
        active.push(wf);
      }
    }
    return active;
  }

  shouldLoadChunk(chunkIndex: number): boolean {
    const activeWfs = this.getActiveWaveforms();
    if (activeWfs.length === 0) {
      if (this.wf && !this.wf.isDestroyed) {
        activeWfs.push(this.wf);
      } else {
        return true; // Default to true if no waveforms are registered
      }
    }

    const chunkStart = chunkIndex * 10;
    const chunkEnd = chunkStart + 10;

    let maxVisibleDuration = 0;
    let loaded = false;

    for (const wf of activeWfs) {
      const zoom = wf.zoom;
      const visibleDuration = this._duration / zoom;
      maxVisibleDuration = Math.max(maxVisibleDuration, visibleDuration);

      const threshold = wf.loadingThreshold ?? 1800;

      // Check if zoomed in enough to load (threshold: 30 minutes / 1800s, or custom)
      if (visibleDuration <= threshold) {
        const scrollLeft = wf.visualizer?.getScrollLeft() ?? 0;
        const visibleStart = scrollLeft * this._duration;
        const visibleEnd = visibleStart + visibleDuration;

        // Add 30 seconds of padding on both sides to buffer/prefetch ahead/behind
        const paddedStart = Math.max(0, visibleStart - 30);
        const paddedEnd = Math.min(this._duration, visibleEnd + 30);

        if (chunkEnd >= paddedStart && chunkStart <= paddedEnd) {
          loaded = true;
        }
      }
    }

    // Dynamically adjust MAX_CACHED_CHUNKS to prevent cache thrashing/eviction loop when zoomed out
    if (maxVisibleDuration > 0) {
      const visibleChunks = Math.ceil(maxVisibleDuration / 10);
      this.MAX_CACHED_CHUNKS = Math.max(200, Math.min(this.totalChunks, visibleChunks + 10));
    }

    return loaded;
  }

  async init(arraybuffer?: ArrayBuffer): Promise<void> {
    if (this.worker) return;

    // Initialize the WASM worker in streaming mode
    this.worker = await getAudioDecoderWorker(decodeAudioWasmUrl, this.src, { stream: true });

    this._channelCount = this.worker.channelCount;
    this._sampleRate = this.worker.sampleRate;
    this._duration = this.worker.duration;
    this._dataLength = this._duration * this._sampleRate;
    this._dataSize = this._dataLength * this._channelCount * 4; // Float32 size

    // Use 10-second chunks
    this.samplesPerChunk = this._sampleRate * 10;
    this.totalChunks = Math.ceil(this._dataLength / this.samplesPerChunk);

    // Initialize raw chunks storage
    this.rawChunks = Array.from({ length: this._channelCount }).map(() => new Array(this.totalChunks).fill(undefined));

    // Initialize chunks proxy arrays
    const self = this;
    const totalChunks = this.totalChunks;
    const samplesPerChunk = this.samplesPerChunk;

    this.chunks = Array.from({ length: this._channelCount }).map((_, channelIndex) => {
      const targetArray = this.rawChunks[channelIndex];
      return new Proxy(targetArray, {
        get(target, prop) {
          if (prop === "__rawTarget") return target;
          if (typeof prop === "symbol") return target[prop as any];

          const chunkIndex = Number(prop);
          if (!isNaN(chunkIndex) && chunkIndex >= 0 && chunkIndex < totalChunks) {
            if (!target[chunkIndex]) {
              self.loadChunk(chunkIndex);
              return new Float32Array(samplesPerChunk);
            }
            self.touchChunk(chunkIndex);
            return target[chunkIndex];
          }
          return target[prop as any];
        },
      }) as any;
    });

    info("decode:worker:ready", this.src);
  }

  async decode(options?: { multiChannel?: boolean }): Promise<void> {
    // Progressive decoder loads lazily, no full decode step needed
    return Promise.resolve();
  }

  getProxyTarget(proxy: any) {
    return proxy.__rawTarget || proxy;
  }

  private touchChunk(chunkIndex: number) {
    const idx = this.chunkAccessHistory.indexOf(chunkIndex);
    if (idx > -1) {
      this.chunkAccessHistory.splice(idx, 1);
    }
    this.chunkAccessHistory.push(chunkIndex);
  }

  private evictLRU() {
    // Count how many are loaded
    const loadedIndices = new Set<number>();
    for (let i = 0; i < this.totalChunks; i++) {
      if (this.rawChunks[0][i]) {
        loadedIndices.add(i);
      }
    }

    if (loadedIndices.size <= this.MAX_CACHED_CHUNKS) return;

    // Evict least recently accessed chunk
    for (let i = 0; i < this.chunkAccessHistory.length; i++) {
      const chunkIndex = this.chunkAccessHistory[i];
      if (loadedIndices.has(chunkIndex)) {
        for (let c = 0; c < this._channelCount; c++) {
          this.rawChunks[c][chunkIndex] = undefined;
        }
        this.chunkAccessHistory.splice(i, 1);
        info("decode:evicted", `Chunk ${chunkIndex} evicted from cache`);
        break;
      }
    }
  }

  private loadChunk(chunkIndex: number, isPrefetch = false) {
    if (this.loadingChunks.has(chunkIndex) || this.rawChunks[0][chunkIndex]) return;
    if (this.pendingThrottles.has(chunkIndex)) return;

    // Check if zoomed in enough to load and if the chunk is in the visible padded range
    if (!this.shouldLoadChunk(chunkIndex)) {
      return;
    }

    const timer = setTimeout(async () => {
      this.pendingThrottles.delete(chunkIndex);
      if (this.loadingChunks.has(chunkIndex) || this.rawChunks[0][chunkIndex]) {
        return;
      }
      if (!this.shouldLoadChunk(chunkIndex)) {
        return;
      }
      this.loadingChunks.add(chunkIndex);

      try {
        await this.fetchChunkData(chunkIndex);
        if (!isPrefetch) {
          this.prefetchAdjacent(chunkIndex);
        }
        this.evictLRU();
      } catch (e) {
        console.error(`Error loading WASM stream chunk ${chunkIndex}:`, e);
      } finally {
        this.loadingChunks.delete(chunkIndex);
      }
    }, 50);

    this.pendingThrottles.set(chunkIndex, timer);
  }

  private async refreshPresignedUrl(): Promise<string> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        if (this.wf && typeof this.wf.refreshUrl === "function") {
          const freshUrl = await this.wf.refreshUrl(this.src);
          if (freshUrl) {
            this.src = freshUrl;
            this.worker?.updateUrl(freshUrl);
            this.invoke("urlRefreshed", [freshUrl]);
            return freshUrl;
          }
        }

        const response = await fetch(this.src, {
          cache: "no-store",
          headers: {
            Range: "bytes=0-0",
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const freshUrl = response.url;
        this.worker?.updateUrl(freshUrl);
        return freshUrl;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  private async fetchChunkData(chunkIndex: number, isRetry = false) {
    if (!this.worker) {
      return;
    }

    const startSeconds = chunkIndex * 10;
    const chunkDuration = Math.min(10, this._duration - startSeconds);
    if (chunkDuration <= 0) return;

    try {
      // Decode this chunk. Since we want all channels separated, we set multiChannel: true
      const decodedSamples = await this.worker.decodeAudioData(startSeconds, chunkDuration, {
        multiChannel: true,
      });

      const samplesInChunk = Math.round(chunkDuration * this._sampleRate);

      // Split the interleaved channel samples into rawChunks
      for (let c = 0; c < this._channelCount; c++) {
        const channelData = new Float32Array(samplesInChunk);
        for (let s = 0; s < samplesInChunk; s++) {
          const sampleIdx = s * this._channelCount + c;
          channelData[s] = sampleIdx < decodedSamples.length ? decodedSamples[sampleIdx] : 0;
        }
        this.rawChunks[c][chunkIndex] = channelData;
      }

      this.touchChunk(chunkIndex);

      this.invoke("progress", [chunkIndex, this.totalChunks]);
      this.invoke("chunkLoaded", [chunkIndex]);
    } catch (e: any) {
      const isAuthError =
        e?.message?.includes("HTTP_STATUS_403") ||
        e?.message?.includes("HTTP_STATUS_401") ||
        (typeof e === "string" && (e.includes("HTTP_STATUS_403") || e.includes("HTTP_STATUS_401")));

      if (isAuthError && !isRetry) {
        console.warn("WasmStreamingDecoder: Presigned URL expired (403/401). Refreshing URL and retrying...");
        try {
          await this.refreshPresignedUrl();

          // Retry decoding this chunk
          await this.fetchChunkData(chunkIndex, true);
          return;
        } catch (refreshErr) {
          console.error("WasmStreamingDecoder: Failed to refresh presigned URL:", refreshErr);
        }
      }

      throw e;
    }
  }

  private prefetchAdjacent(chunkIndex: number) {
    const next1 = chunkIndex + 1;
    const next2 = chunkIndex + 2;
    if (next1 < this.totalChunks && !this.rawChunks[0][next1]) {
      this.loadChunk(next1, true);
    }
    if (next2 < this.totalChunks && !this.rawChunks[0][next2]) {
      this.loadChunk(next2, true);
    }

    const prev1 = chunkIndex - 1;
    if (prev1 >= 0 && !this.rawChunks[0][prev1]) {
      this.loadChunk(prev1, true);
    }
  }

  protected dispose() {
    this.pendingThrottles.forEach(clearTimeout);
    this.pendingThrottles.clear();
    this.loadingChunks.clear();
    if (this.worker) {
      this.worker.dispose();
      this.worker = undefined;
      info("decode:worker:disposed", this.src);
    }
    this.cleanupResolvers();
  }
}
