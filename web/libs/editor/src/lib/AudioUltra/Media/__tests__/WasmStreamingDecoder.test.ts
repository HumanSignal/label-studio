import { mock, describe, it, expect, beforeEach, spyOn, afterEach } from "bun:test";
import { WasmStreamingDecoder } from "../WasmStreamingDecoder";
import * as utilsModule from "../../Common/Utils";

const mockDecodeAudioData = mock().mockImplementation(() => {
  // Return dummy interleaved data for 10 seconds of 2-channel audio
  // 10s * 44100Hz * 2 channels = 882000 samples
  return Promise.resolve(new Float32Array(882000));
});

const mockDispose = mock();

mock.module("@humansignal/audio-file-decoder", () => {
  return {
    getAudioDecoderWorker: mock().mockResolvedValue({
      channelCount: 2,
      sampleRate: 44100,
      duration: 100, // 100 seconds
      decodeAudioData: mockDecodeAudioData,
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

  describe("dispose", () => {
    it("calls worker dispose and cleans up pending timers", async () => {
      await decoder.init();
      decoder.destroy();

      expect(mockDispose).toHaveBeenCalled();
    });
  });
});
