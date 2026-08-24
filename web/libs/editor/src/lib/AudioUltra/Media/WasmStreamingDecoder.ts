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
  // Priority load queue (chunkIndex -> isPrefetch). A single drain worker
  // decodes the highest-priority pending chunk first: in-view chunks ascending
  // (left-to-right), then the nearest out-of-view prefetch. This keeps the
  // visible waveform filling in predictably instead of jumping to off-screen
  // chunks (which makes decoding feel stuck/broken to the user).
  private loadQueue = new Map<number, boolean>();
  private draining = false;
  private waveforms = new Set<any>();
  private wf?: any;
  private refreshPromise: Promise<string> | null = null;
  private lastRefreshAt = 0;
  private consecutiveRefreshAttempts = 0;
  private static readonly REFRESH_COOLDOWN_MS = 2000;
  private static readonly MAX_CONSECUTIVE_REFRESHES = 5;

  // Decode serialization: the WASM worker is single-threaded and reads byte
  // ranges via *synchronous* (blocking) XHR. If we post many decode requests
  // they queue in the worker and each one re-scans the file from byte 0 with
  // whatever URL is current. Worse, an updateUrl() message posted after a
  // refresh sits behind that backlog, so a freshly-refreshed URL is not applied
  // until every stale decode drains — producing seconds of redundant, doomed
  // requests. Serializing decode calls keeps the worker's queue empty so a
  // refresh takes effect on the very next decode.
  private decodeChain: Promise<unknown> = Promise.resolve();

  // Refresh gate: while a URL refresh is in flight, all decodes wait on this so
  // none run against the known-stale URL.
  private refreshGate: { promise: Promise<void>; resolve: () => void } | null = null;

  // Proactive refresh: presigned URLs carry an expiry. Refresh shortly before
  // it lapses so steady-state playback never hits a 403 storm.
  private urlExpiresAt = 0;
  private proactiveTimer: ReturnType<typeof setTimeout> | null = null;
  private isDisposed = false;
  private static readonly PROACTIVE_MIN_LEAD_MS = 10000;
  private static readonly PROACTIVE_FALLBACK_TTL_MS = 45000;

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

    // Schedule a proactive refresh so the initial presigned URL is replaced
    // before it expires (falls back to a conservative TTL since the resolve URL
    // itself carries no expiry).
    this.scheduleProactiveRefresh(this.src);

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

    // Check if zoomed in enough to load and if the chunk is in the visible padded range
    if (!this.shouldLoadChunk(chunkIndex)) {
      return;
    }

    // Enqueue for the ordered drain. A direct (non-prefetch) request always
    // outranks a prefetch one for the same chunk.
    const existing = this.loadQueue.get(chunkIndex);
    this.loadQueue.set(chunkIndex, existing === undefined ? isPrefetch : existing && isPrefetch);
    this.kickDrain();
  }

  private kickDrain() {
    if (this.draining || this.isDisposed) return;
    this.draining = true;
    // Coalesce a burst of loadChunk calls (e.g. a full waveform render pass that
    // touches every visible chunk) into a single ordered drain rather than
    // racing many independent timers that resolve in arrival order.
    Promise.resolve().then(() => this.drainQueue());
  }

  /** Current unpadded visible window in seconds, or null when unknown. */
  private computeVisibleRange(): { start: number; end: number } | null {
    const activeWfs = this.getActiveWaveforms();
    const wf = activeWfs[0] ?? (this.wf && !this.wf.isDestroyed ? this.wf : undefined);
    if (!wf || !this._duration) return null;
    const zoom = wf.zoom || 1;
    const visibleDuration = this._duration / zoom;
    const scrollLeft = wf.visualizer?.getScrollLeft?.() ?? 0;
    const start = scrollLeft * this._duration;
    return { start, end: start + visibleDuration };
  }

  /**
   * Pick the highest-priority queued chunk: in-view chunks first, ascending by
   * time (left-to-right fill), then the nearest out-of-view prefetch chunk.
   */
  private pickNextChunk(): number | undefined {
    const vis = this.computeVisibleRange();
    let best: number | undefined;
    let bestScore = Number.POSITIVE_INFINITY;
    for (const idx of this.loadQueue.keys()) {
      const chunkStart = idx * 10;
      const chunkEnd = chunkStart + 10;
      let score: number;
      if (vis && chunkEnd >= vis.start && chunkStart <= vis.end) {
        // In view: fill left-to-right.
        score = chunkStart;
      } else if (vis) {
        // Out of view (prefetch/padding): nearest to the viewport first, but
        // always after every in-view chunk (large base offset).
        const dist = chunkStart > vis.end ? chunkStart - vis.end : vis.start - chunkEnd;
        score = 1e9 + dist;
      } else {
        score = chunkStart;
      }
      if (score < bestScore) {
        bestScore = score;
        best = idx;
      }
    }
    return best;
  }

  private async drainQueue() {
    try {
      while (!this.isDisposed && this.worker && this.loadQueue.size > 0) {
        const chunkIndex = this.pickNextChunk();
        if (chunkIndex === undefined) break;
        const isPrefetch = this.loadQueue.get(chunkIndex) ?? false;
        this.loadQueue.delete(chunkIndex);

        if (this.loadingChunks.has(chunkIndex) || this.rawChunks[0][chunkIndex]) continue;
        if (!this.shouldLoadChunk(chunkIndex)) continue;

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
      }
    } finally {
      this.draining = false;
      // Chunks enqueued during the final await (e.g. prefetch or a view change)
      // get their own ordered pass.
      if (!this.isDisposed && this.loadQueue.size > 0) this.kickDrain();
    }
  }

  private openRefreshGate() {
    if (this.refreshGate) return;
    let resolve!: () => void;
    const promise = new Promise<void>((r) => {
      resolve = r;
    });
    this.refreshGate = { promise, resolve };
  }

  private closeRefreshGate() {
    const gate = this.refreshGate;
    this.refreshGate = null;
    gate?.resolve();
  }

  /**
   * Runs a decode exclusively: waits for any prior decode and any in-flight URL
   * refresh so the worker's message queue stays empty and every decode uses the
   * current (never stale) URL.
   */
  private async runDecodeExclusive<T>(fn: () => Promise<T>): Promise<T> {
    const prior = this.decodeChain;
    let release!: () => void;
    this.decodeChain = new Promise<void>((r) => {
      release = r;
    });
    try {
      await prior.catch(() => {});
      // Hold decodes until any refresh has applied a fresh URL to the worker.
      while (this.refreshGate) {
        await this.refreshGate.promise;
      }
      return await fn();
    } finally {
      release();
    }
  }

  /** Parse a presigned URL's absolute expiry (epoch ms), or 0 if unknown. */
  private parsePresignExpiry(url: string): number {
    try {
      const base = typeof location !== "undefined" ? location.href : "http://localhost";
      const q = new URL(url, base).searchParams;

      const parseCompactDate = (s: string): number => {
        const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(s);
        if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
        const t = Date.parse(s);
        return Number.isNaN(t) ? 0 : t;
      };

      // AWS SigV4
      const amzDate = q.get("X-Amz-Date");
      const amzExp = q.get("X-Amz-Expires");
      if (amzDate && amzExp) {
        const start = parseCompactDate(amzDate);
        if (start) return start + Number(amzExp) * 1000;
      }
      // GCS V4
      const gDate = q.get("X-Goog-Date");
      const gExp = q.get("X-Goog-Expires");
      if (gDate && gExp) {
        const start = parseCompactDate(gDate);
        if (start) return start + Number(gExp) * 1000;
      }
      // S3 legacy / GCS V2: absolute epoch seconds
      const expires = q.get("Expires");
      if (expires && /^\d+$/.test(expires)) return Number(expires) * 1000;
      // Azure SAS
      const se = q.get("se");
      if (se) {
        const t = Date.parse(se);
        if (!Number.isNaN(t)) return t;
      }
    } catch {
      // ignore malformed URLs
    }
    return 0;
  }

  private scheduleProactiveRefresh(url: string) {
    if (this.isDisposed) return;

    const expiresAt = this.parsePresignExpiry(url);
    this.urlExpiresAt = expiresAt;

    if (this.proactiveTimer) {
      clearTimeout(this.proactiveTimer);
      this.proactiveTimer = null;
    }

    const now = Date.now();
    const ttl = expiresAt > now ? expiresAt - now : WasmStreamingDecoder.PROACTIVE_FALLBACK_TTL_MS;
    const lead = Math.max(WasmStreamingDecoder.PROACTIVE_MIN_LEAD_MS, ttl * 0.2);
    const delay = Math.max(1000, ttl - lead);

    this.proactiveTimer = setTimeout(() => {
      this.proactiveTimer = null;
      // Non-reactive refresh: does not count against the reactive retry cap.
      this.refreshPresignedUrl(false).catch((e) => {
        console.warn("WasmStreamingDecoder: proactive URL refresh failed", e);
      });
    }, delay);
  }

  private async refreshPresignedUrl(reactive = true): Promise<string> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    if (reactive && this.consecutiveRefreshAttempts >= WasmStreamingDecoder.MAX_CONSECUTIVE_REFRESHES) {
      throw new Error("WasmStreamingDecoder: refresh cap exceeded");
    }

    const now = Date.now();
    if (reactive && now - this.lastRefreshAt < WasmStreamingDecoder.REFRESH_COOLDOWN_MS) {
      // A refresh applied very recently; the worker already holds a fresh URL.
      return this.src;
    }

    // Gate decodes for the duration of the refresh so none run against a stale URL.
    this.openRefreshGate();

    this.refreshPromise = (async () => {
      if (reactive) this.consecutiveRefreshAttempts += 1;
      try {
        let freshUrl: string | undefined;

        if (this.wf && typeof this.wf.refreshUrl === "function") {
          freshUrl = await this.wf.refreshUrl(this.src);
        }

        if (!freshUrl) {
          const response = await fetch(this.src, {
            cache: "no-store",
            headers: {
              Range: "bytes=0-0",
            },
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          freshUrl = response.url;
        }

        this.worker?.updateUrl(freshUrl);
        this.lastRefreshAt = Date.now();
        this.scheduleProactiveRefresh(freshUrl);
        return freshUrl;
      } finally {
        this.refreshPromise = null;
        this.closeRefreshGate();
      }
    })();

    return this.refreshPromise;
  }

  private async fetchChunkData(chunkIndex: number, isRetry = false) {
    const worker = this.worker;
    if (!worker) {
      return;
    }

    const startSeconds = chunkIndex * 10;
    const chunkDuration = Math.min(10, this._duration - startSeconds);
    if (chunkDuration <= 0) return;

    try {
      // Decode this chunk. Since we want all channels separated, we set multiChannel: true.
      // Serialize decodes so the single-threaded worker never backs up and always
      // decodes with the current URL.
      const decodedSamples = await this.runDecodeExclusive(() =>
        worker.decodeAudioData(startSeconds, chunkDuration, {
          multiChannel: true,
        }),
      );

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
      this.consecutiveRefreshAttempts = 0;
    } catch (e: any) {
      const isAuthError =
        e?.message?.includes("HTTP_STATUS_403") ||
        e?.message?.includes("HTTP_STATUS_401") ||
        (typeof e === "string" && (e.includes("HTTP_STATUS_403") || e.includes("HTTP_STATUS_401")));

      if (isAuthError && !isRetry) {
        console.warn("WasmStreamingDecoder: Presigned URL expired (403/401). Refreshing URL and retrying...");
        try {
          await this.refreshPresignedUrl(true);

          // Retry decoding this chunk (serialized; runs once the fresh URL is applied)
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
    this.isDisposed = true;
    if (this.proactiveTimer) {
      clearTimeout(this.proactiveTimer);
      this.proactiveTimer = null;
    }
    // Release any decodes waiting on a refresh so they don't hang forever.
    this.closeRefreshGate();
    this.loadQueue.clear();
    this.loadingChunks.clear();
    if (this.worker) {
      this.worker.dispose();
      this.worker = undefined;
      info("decode:worker:disposed", this.src);
    }
    this.cleanupResolvers();
  }
}
