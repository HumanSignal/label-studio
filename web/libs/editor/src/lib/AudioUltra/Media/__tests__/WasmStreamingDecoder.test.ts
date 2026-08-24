import { mock, describe, it, expect, beforeEach, spyOn, afterEach } from "bun:test";
import { WasmStreamingDecoder } from "../WasmStreamingDecoder";
import * as utilsModule from "../../Common/Utils";

const mockDecodeAudioData = mock().mockImplementation(() => {
  // Return dummy interleaved data for 10 seconds of 2-channel audio
  // 10s * 44100Hz * 2 channels = 882000 samples
  return Promise.resolve(new Float32Array(882000));
});

const mockUpdateUrl = mock();
const mockDispose = mock();

mock.module("@humansignal/audio-file-decoder", () => {
  return {
    getAudioDecoderWorker: mock().mockResolvedValue({
      channelCount: 2,
      sampleRate: 44100,
      duration: 100, // 100 seconds
      decodeAudioData: mockDecodeAudioData,
      updateUrl: mockUpdateUrl,
      dispose: mockDispose,
    }),
  };
});

describe("WasmStreamingDecoder", () => {
  const src = "https://example.com/audio.mp3";
  let decoder: WasmStreamingDecoder;

  beforeEach(() => {
    mock.clearAllMocks();
    spyOn(utilsModule, "info").mockImplementation(() => {});
    decoder = new WasmStreamingDecoder(src);
  });

  afterEach(() => {
    decoder.destroy();
  });

  describe("init", () => {
    it("initializes the worker in streaming mode and parses properties", async () => {
      await decoder.init();

      expect(decoder.channelCount).toBe(2);
      expect(decoder.sampleRate).toBe(44100);
      expect(decoder.duration).toBe(100);
      expect(decoder.chunks).toBeDefined();
      expect(decoder.chunks?.length).toBe(2); // 2 channels
    });
  });

  describe("decode", () => {
    it("resolves immediately because it is a lazy decoder", async () => {
      await decoder.init();
      await expect(decoder.decode()).resolves.toBeUndefined();
    });
  });

  describe("lazy load and proxy chunks", () => {
    it("lazily decodes a chunk when accessed via chunks proxy", async () => {
      await decoder.init();

      // Accessing chunk index 0 should trigger lazy load
      const chunkData = decoder.chunks?.[0][0];

      // Initially, before resolution, it should return a dummy zero-filled array
      expect(chunkData).toBeDefined();
      expect(chunkData instanceof Float32Array).toBe(true);

      // Wait a short time for the debounced load to trigger and resolve
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockDecodeAudioData).toHaveBeenCalled();
    });

    it("evicts oldest chunks when exceeding MAX_CACHED_CHUNKS", async () => {
      await decoder.init();

      // Override cache size to a small value for testing
      (decoder as any).MAX_CACHED_CHUNKS = 2;

      // Access chunk 0, 1, 2
      decoder.chunks?.[0][0];
      await new Promise((resolve) => setTimeout(resolve, 80));
      decoder.chunks?.[0][1];
      await new Promise((resolve) => setTimeout(resolve, 80));
      decoder.chunks?.[0][2];
      await new Promise((resolve) => setTimeout(resolve, 80));

      // At this point, chunk 0 should have been evicted (cache capacity 2, accessed 0 then 1 then 2)
      const rawChunks = (decoder as any).rawChunks;
      expect(rawChunks[0][0]).toBeUndefined();
      expect(rawChunks[0][1]).toBeDefined();
      expect(rawChunks[0][2]).toBeDefined();
    });
  });

  describe("chunks proxy symbol and array property access", () => {
    it("allows standard array iteration and symbol access without throwing TypeError", async () => {
      await decoder.init();

      const chunks = decoder.chunks;
      expect(chunks).toBeDefined();

      // Accessing standard length property
      expect(chunks?.length).toBe(2);

      // Accessing symbol property (e.g. Symbol.iterator) should not throw
      expect(() => {
        const it = chunks?.[Symbol.iterator as any];
        expect(it).toBeDefined();
      }).not.toThrow();

      // Testing array iteration using for...of on the proxy itself
      expect(() => {
        for (const chunk of chunks?.[0] || []) {
          // Accessing each chunk
        }
      }).not.toThrow();
    });
  });

  describe("chunk load prioritization", () => {
    it("decodes the in-view chunk before out-of-view chunks regardless of access order", async () => {
      // Visible window = 10s at scrollLeft 0.5 → 50s–60s (chunk 5).
      const wf = {
        isDestroyed: false,
        zoom: 10,
        loadingThreshold: 3600,
        visualizer: { getScrollLeft: () => 0.5 },
      };
      const dec = new WasmStreamingDecoder(src, wf as any);
      await dec.init();

      // Touch out-of-view chunks first, then the in-view one.
      dec.chunks?.[0][2]; // 20–30s (out of view)
      dec.chunks?.[0][9]; // 90–100s (out of view)
      dec.chunks?.[0][5]; // 50–60s (in view)

      await new Promise((resolve) => setTimeout(resolve, 200));

      const decodedStarts = mockDecodeAudioData.mock.calls.map((c: any[]) => c[0]);
      // The in-view chunk (start=50s) must be decoded first even though it was
      // requested last.
      expect(decodedStarts[0]).toBe(50);

      dec.destroy();
    });
  });

  describe("url refresh and request coalescing", () => {
    let mockFetch: any;

    beforeEach(() => {
      mockFetch = spyOn(globalThis, "fetch").mockImplementation(() => {
        return Promise.resolve({
          ok: true,
          url: "https://example.com/fresh-audio.mp3",
        } as any);
      });
    });

    it("coalesces concurrent URL refresh requests and sends Range bytes=0-0 headers", async () => {
      await decoder.init();

      // Make the worker throw a 403 error on first attempt
      let attempts = 0;
      mockDecodeAudioData.mockImplementation(() => {
        attempts++;
        if (attempts <= 2) {
          // Both concurrent chunks fail on the first attempt
          return Promise.reject(new Error("HTTP_STATUS_403"));
        }
        return Promise.resolve(new Float32Array(882000));
      });

      // Trigger lazy load on two chunks concurrently
      decoder.chunks?.[0][0];
      decoder.chunks?.[0][1];

      // Wait for the timers and the fetches to resolve
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Assertions:
      // 1. fetch should be called exactly once to refresh the URL
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // 2. fetch should be called with correct arguments: Range header and no-cache
      const [fetchUrl, fetchInit] = mockFetch.mock.calls[0];
      expect(fetchUrl).toBe(src);
      expect(fetchInit).toEqual({
        cache: "no-store",
        headers: {
          Range: "bytes=0-0",
        },
      });

      // 3. The worker updateUrl should have been called
      expect(mockUpdateUrl).toHaveBeenCalledWith("https://example.com/fresh-audio.mp3");

      // 4. Stable resolve src must be kept for subsequent refresh probes (not overwritten with presigned URL)
      expect((decoder as any).src).toBe(src);
    });

    it("stops refreshing after the consecutive refresh cap is exceeded", async () => {
      await decoder.init();

      mockFetch.mockImplementation(() =>
        Promise.resolve({
          ok: false,
          status: 403,
          statusText: "Forbidden",
        } as any),
      );

      let attempts = 0;
      mockDecodeAudioData.mockImplementation(() => {
        attempts++;
        return Promise.reject(new Error("HTTP_STATUS_403"));
      });

      for (let i = 0; i < 8; i++) {
        decoder.chunks?.[0][i % 3];
        await new Promise((resolve) => setTimeout(resolve, 120));
      }

      expect(mockFetch.mock.calls.length).toBeLessThanOrEqual(5);
      expect(attempts).toBeGreaterThan(0);
    });

    it("serializes decodes so only one runs at a time (no worker backlog)", async () => {
      await decoder.init();

      let concurrent = 0;
      let maxConcurrent = 0;
      mockDecodeAudioData.mockImplementation(() => {
        concurrent++;
        maxConcurrent = Math.max(maxConcurrent, concurrent);
        return new Promise((resolve) => {
          setTimeout(() => {
            concurrent--;
            resolve(new Float32Array(882000));
          }, 20);
        });
      });

      // Request several chunks "simultaneously"
      decoder.chunks?.[0][0];
      decoder.chunks?.[0][1];
      decoder.chunks?.[0][2];
      decoder.chunks?.[0][3];

      await new Promise((resolve) => setTimeout(resolve, 300));

      // Decodes must never overlap — the worker queue stays empty.
      expect(maxConcurrent).toBe(1);
    });
  });

  describe("proactive presigned URL refresh", () => {
    let mockFetch: any;

    beforeEach(() => {
      mockFetch = spyOn(globalThis, "fetch").mockImplementation(() => {
        return Promise.resolve({
          ok: true,
          url: "https://example.com/fresh-audio.mp3",
        } as any);
      });
    });

    it("parses AWS SigV4 expiry from a presigned URL", async () => {
      await decoder.init();
      const url =
        "https://bucket.s3.amazonaws.com/audio.mp3?X-Amz-Date=20260709T194043Z&X-Amz-Expires=60&X-Amz-Signature=abc";
      const expiry = (decoder as any).parsePresignExpiry(url);
      expect(expiry).toBe(Date.UTC(2026, 6, 9, 19, 40, 43) + 60_000);
    });

    it("parses an absolute epoch Expires parameter", async () => {
      await decoder.init();
      const url = "https://bucket.example.com/audio.mp3?Expires=1799999999&Signature=xyz";
      const expiry = (decoder as any).parsePresignExpiry(url);
      expect(expiry).toBe(1799999999 * 1000);
    });

    it("returns 0 when no expiry information is present", async () => {
      await decoder.init();
      const expiry = (decoder as any).parsePresignExpiry("https://example.com/audio.mp3");
      expect(expiry).toBe(0);
    });

    it("schedules a proactive refresh timer on init", async () => {
      await decoder.init();
      // init() falls back to a conservative TTL and arms a timer.
      expect((decoder as any).proactiveTimer).not.toBeNull();
    });

    it("clears the proactive timer on dispose", async () => {
      await decoder.init();
      decoder.destroy();
      expect((decoder as any).proactiveTimer).toBeNull();
      expect((decoder as any).isDisposed).toBe(true);
    });
  });

  describe("dispose", () => {
    it("calls worker dispose and cleans up pending timers", async () => {
      await decoder.init();
      decoder.destroy();

      expect(mockDispose).toHaveBeenCalled();
    });
  });
});
