/**
 * Unit tests for WebAudioDecoder (lib/AudioUltra/Media/WebAudioDecoder.ts)
 */
import { info } from "../../Common/Utils";
import { WebAudioDecoder } from "../WebAudioDecoder";

jest.mock("../../Common/Utils", () => ({
  info: jest.fn(),
}));

function createFakeAudioBuffer(
  overrides: { numberOfChannels?: number; sampleRate?: number; duration?: number; channelData?: Float32Array[] } = {},
) {
  const numberOfChannels = overrides.numberOfChannels ?? 2;
  const sampleRate = overrides.sampleRate ?? 44100;
  const duration = overrides.duration ?? 1.0;
  const channelData = overrides.channelData ?? Array.from({ length: numberOfChannels }, () => new Float32Array(100));
  return {
    numberOfChannels,
    sampleRate,
    duration,
    getChannelData: (index: number) => channelData[index] ?? new Float32Array(0),
    ...overrides,
  };
}

function createMockOfflineContext(decodeResolve?: (buffer: unknown) => void) {
  const decodeAudioData = jest
    .fn()
    .mockImplementation((buf: ArrayBuffer, onSuccess?: (b: unknown) => void, onError?: (e: Error) => void) => {
      const buffer = createFakeAudioBuffer();
      if (typeof onSuccess === "function") {
        setTimeout(() => onSuccess(buffer), 0);
      } else {
        return Promise.resolve(buffer);
      }
    });
  const ctx = {
    decodeAudioData,
    sampleRate: 44100,
  };
  return { ctx, decodeAudioData };
}

describe("WebAudioDecoder", () => {
  const src = "https://example.com/audio.mp3";
  let decoder: WebAudioDecoder;
  let mockContext: ReturnType<typeof createMockOfflineContext>;
  const originalOffline = (global as any).OfflineAudioContext;
  const originalWebkit = (global as any).webkitOfflineAudioContext;

  beforeEach(() => {
    jest.clearAllMocks();
    (global as any).WebAudioOfflineAudioContext = undefined;
    mockContext = createMockOfflineContext();
    (global as any).OfflineAudioContext = jest.fn().mockImplementation(() => mockContext.ctx);
    (global as any).webkitOfflineAudioContext = (global as any).OfflineAudioContext;
    decoder = new WebAudioDecoder(src);
  });

  afterEach(() => {
    (global as any).OfflineAudioContext = originalOffline;
    (global as any).webkitOfflineAudioContext = originalWebkit;
    decoder.destroy();
  });

  describe("init", () => {
    it("stores arraybuffer and calls info", async () => {
      const buf = new ArrayBuffer(8);
      await decoder.init(buf);
      expect(info).toHaveBeenCalledWith("decode:worker:ready", src);
      await decoder.decode();
      expect(mockContext.decodeAudioData).toHaveBeenCalledWith(buf);
    });
  });

  describe("decode", () => {
    it("throws when not initialized", async () => {
      await expect(decoder.decode()).rejects.toThrow("WebAudioDecoder not initialized, did you call decoder.init()?");
      expect(info).not.toHaveBeenCalledWith("decode:start", expect.anything());
    });

    it("returns early and logs when source already decoded (cached)", async () => {
      const buf = new ArrayBuffer(8);
      await decoder.init(buf);
      (decoder as any).chunks = [[]];
      await decoder.decode();
      expect(info).toHaveBeenCalledWith("decode:cached", src);
      expect(mockContext.decodeAudioData).not.toHaveBeenCalled();
    });

    it("throws when source was cancelled and not renewed", async () => {
      const buf = new ArrayBuffer(8);
      await decoder.init(buf);
      (decoder as any).cancelled = true;
      (decoder as any).decodeId = 0;
      await expect(decoder.decode()).rejects.toThrow(
        "WebAudioDecoder decode cancelled and contains no data, did you call decoder.renew()?",
      );
    });

    it("returns existing decodingPromise when decode already in progress", async () => {
      const buf = new ArrayBuffer(8);
      await decoder.init(buf);
      let resolveFirst: () => void;
      const firstPromise = new Promise<void>((r) => {
        resolveFirst = r;
      });
      (decoder as any).decodingPromise = firstPromise;
      (decoder as any).decodingResolve = () => resolveFirst!();

      const decodePromise = decoder.decode();
      expect(info).toHaveBeenCalledWith("decode:inprogress", src);
      expect(decodePromise).toBeDefined();
      expect(typeof (decodePromise as Promise<unknown>)?.then).toBe("function");
      (decoder as any).decodingResolve?.();
    });

    it("decodes successfully and sets channelCount, sampleRate, duration, chunks", async () => {
      const buf = new ArrayBuffer(8);
      await decoder.init(buf);
      delete (global as any).webkitOfflineAudioContext;
      const result = await decoder.decode();
      expect(info).toHaveBeenCalledWith("decode:start", src);
      expect(info).toHaveBeenCalledWith("decode:complete", src);
      expect(decoder.channelCount).toBe(1);
      expect(decoder.sampleRate).toBe(44100);
      expect(decoder.duration).toBe(1.0);
      expect(decoder.chunks).toHaveLength(1);
      expect(decoder.chunks![0]).toHaveLength(1);
      expect(result).toBeDefined();
    });

    it("uses multiChannel option to set channelCount from buffer", async () => {
      const buf = new ArrayBuffer(8);
      await decoder.init(buf);
      mockContext.decodeAudioData.mockResolvedValueOnce(
        createFakeAudioBuffer({ numberOfChannels: 3, sampleRate: 48000, duration: 2.0 }),
      );
      delete (global as any).webkitOfflineAudioContext;
      await decoder.decode({ multiChannel: true });
      expect(decoder.channelCount).toBe(3);
      expect(decoder.sampleRate).toBe(48000);
      expect(decoder.duration).toBe(2.0);
      expect(decoder.chunks).toHaveLength(3);
    });

    it("captures buffer when captureAudioBuffer option is true", async () => {
      const buf = new ArrayBuffer(8);
      await decoder.init(buf);
      const fakeBuffer = createFakeAudioBuffer();
      mockContext.decodeAudioData.mockResolvedValueOnce(fakeBuffer);
      delete (global as any).webkitOfflineAudioContext;
      const result = await decoder.decode({ captureAudioBuffer: true });
      expect(decoder.buffer).toBe(fakeBuffer);
      expect(result).toBe(fakeBuffer);
    });

    it("calls dispose in finally after decode", async () => {
      const buf = new ArrayBuffer(8);
      await decoder.init(buf);
      delete (global as any).webkitOfflineAudioContext;
      await decoder.decode();
      expect(decoder.chunks).toBeDefined();
      (decoder as any).arraybuffer = undefined;
      (decoder as any).context = undefined;
      await decoder.init(buf);
      await decoder.decode();
      expect(info).toHaveBeenCalledWith("decode:cleanup", src);
    });

    it("uses webkit decodeAudioData callback form when webkitAudioContext in window", async () => {
      const buf = new ArrayBuffer(8);
      await decoder.init(buf);
      (global as any).webkitAudioContext = {};
      const result = await decoder.decode();
      expect(mockContext.decodeAudioData).toHaveBeenCalledWith(buf, expect.any(Function), expect.any(Function));
      expect(result).toBeDefined();
    });
  });

  describe("dispose", () => {
    it("cleans up resolvers after decode", async () => {
      const buf = new ArrayBuffer(8);
      await decoder.init(buf);
      delete (global as any).webkitOfflineAudioContext;
      await decoder.decode();
      expect(info).toHaveBeenCalledWith("decode:cleanup", src);
    });
  });

  describe("createOfflineAudioContext", () => {
    it("reuses WebAudioOfflineAudioContext when already created", async () => {
      const buf = new ArrayBuffer(8);
      await decoder.init(buf);
      delete (global as any).webkitOfflineAudioContext;
      await decoder.decode();
      await decoder.init(buf);
      (decoder as any).chunks = undefined;
      await decoder.decode();
      expect((global as any).OfflineAudioContext).toHaveBeenCalledTimes(1);
    });
  });
});
