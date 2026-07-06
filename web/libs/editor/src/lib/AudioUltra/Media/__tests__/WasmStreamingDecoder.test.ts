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
