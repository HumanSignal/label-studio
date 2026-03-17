/**
 * Unit tests for MediaLoader (lib/AudioUltra/Media/MediaLoader.ts)
 */
vi.mock("../WaveformAudio", () => ({
  WaveformAudio: vi.fn().mockImplementation(() => ({
    sourceDecoded: vi.fn().mockResolvedValue(false),
    initDecoder: vi.fn().mockResolvedValue(undefined),
    decodeAudioData: vi.fn().mockResolvedValue(undefined),
    duration: 0,
    sampleRate: 0,
    setDurationWithoutDecoding: vi.fn(),
    destroy: vi.fn(),
    on: vi.fn(),
  })),
}));

import { MediaLoader } from "../MediaLoader";

const mockInvoke = vi.fn();
const mockSetError = vi.fn();
const mockSetLoadingProgress = vi.fn();
const mockSetDecodingProgress = vi.fn();

function createMockWaveform(params: { decoderType?: string; playerType?: string; splitChannels?: boolean } = {}) {
  return {
    invoke: mockInvoke,
    setError: mockSetError,
    setLoadingProgress: mockSetLoadingProgress,
    setDecodingProgress: mockSetDecodingProgress,
    params: {
      decoderType: params.decoderType ?? "webaudio",
      playerType: params.playerType ?? "webaudio",
      splitChannels: params.splitChannels ?? false,
    },
  };
}

describe("MediaLoader", () => {
  let mockAudio: {
    sourceDecoded: vi.Mock;
    initDecoder: vi.Mock;
    decodeAudioData: vi.Mock;
    duration: number;
    sampleRate: number;
    setDurationWithoutDecoding: vi.Mock;
    destroy: vi.Mock;
    on: vi.Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAudio = {
      sourceDecoded: vi.fn().mockResolvedValue(false),
      initDecoder: vi.fn().mockResolvedValue(undefined),
      decodeAudioData: vi.fn().mockResolvedValue(undefined),
      duration: 10.5,
      sampleRate: 44100,
      setDurationWithoutDecoding: vi.fn(),
      destroy: vi.fn(),
      on: vi.fn(),
    };
  });

  describe("constructor", () => {
    it("sets options and default loadingProgressType", () => {
      const wf = createMockWaveform();
      const loader = new MediaLoader(wf as any, { src: "https://example.com/audio.mp3" });
      expect(loader.loadingProgressType).toBe("determinate");
      expect(loader.duration).toBe(0);
    });
  });

  describe("duration", () => {
    it("getter returns _duration", () => {
      const wf = createMockWaveform();
      const loader = new MediaLoader(wf as any, { src: "https://example.com/a.mp3" });
      expect(loader.duration).toBe(0);
    });

    it("setter updates duration and invokes durationChanged when changed", () => {
      const wf = createMockWaveform();
      const loader = new MediaLoader(wf as any, { src: "https://example.com/a.mp3" });
      loader.duration = 5;
      expect(loader.duration).toBe(5);
      expect(mockInvoke).toHaveBeenCalledWith("durationChanged", [5]);
      mockInvoke.mockClear();
      loader.duration = 5;
      expect(mockInvoke).not.toHaveBeenCalled();
    });
  });

  describe("sampleRate", () => {
    it("returns 0 when no audio", () => {
      const wf = createMockWaveform();
      const loader = new MediaLoader(wf as any, { src: "https://example.com/a.mp3" });
      expect(loader.sampleRate).toBe(0);
    });
  });

  describe("reset", () => {
    it("resets state and calls cancel", () => {
      const cancel = vi.fn();
      const wf = createMockWaveform();
      const loader = new MediaLoader(wf as any, { src: "https://example.com/a.mp3" });
      (loader as any).cancel = cancel;
      (loader as any).loaded = true;
      (loader as any).decoderResolve = vi.fn();
      (loader as any).decoderPromise = Promise.resolve();
      loader.reset();
      expect(cancel).toHaveBeenCalled();
      expect((loader as any).loaded).toBe(false);
      expect(loader.loadingProgressType).toBe("determinate");
      expect((loader as any).decoderResolve).toBeUndefined();
      expect((loader as any).decoderPromise).toBeUndefined();
    });
  });

  describe("decodeAudioData", () => {
    it("returns null when no audio", async () => {
      const wf = createMockWaveform();
      const loader = new MediaLoader(wf as any, { src: "https://example.com/a.mp3" });
      expect(await loader.decodeAudioData()).toBeNull();
    });

    it("returns null when destroyed", async () => {
      const wf = createMockWaveform();
      const loader = new MediaLoader(wf as any, { src: "https://example.com/a.mp3" });
      (loader as any).audio = mockAudio;
      loader.destroy();
      expect(await loader.decodeAudioData()).toBeNull();
    });

    it("calls audio.decodeAudioData with splitChannels from waveform", async () => {
      const wf = createMockWaveform({ splitChannels: true });
      const loader = new MediaLoader(wf as any, { src: "https://example.com/a.mp3" });
      (loader as any).audio = mockAudio;
      await loader.decodeAudioData();
      expect(mockAudio.decodeAudioData).toHaveBeenCalledWith({ multiChannel: true });
    });
  });

  describe("load", () => {
    it("returns null when already destroyed", async () => {
      const wf = createMockWaveform();
      const loader = new MediaLoader(wf as any, { src: "https://example.com/a.mp3" });
      loader.destroy();
      expect(await loader.load({})).toBeNull();
    });

    it("returns null when already loaded", async () => {
      const wf = createMockWaveform();
      const loader = new MediaLoader(wf as any, { src: "https://example.com/a.mp3" });
      (loader as any).loaded = true;
      expect(await loader.load({})).toBeNull();
    });

    it("throws when createAnalyzer fails to allocate audio (decoder path)", async () => {
      const wf = createMockWaveform({ decoderType: "webaudio" });
      const loader = new MediaLoader(wf as any, { src: "https://example.com/a.mp3" });
      const createSpy = vi.spyOn(MediaLoader.prototype as any, "createAnalyzer").mockReturnValue(undefined);
      await expect(loader.load({})).rejects.toThrow("MediaLoader: Failed to allocate audio decoder");
      createSpy.mockRestore();
    });

    it("returns audio when sourceDecoded() is already true", async () => {
      mockAudio.sourceDecoded.mockResolvedValue(true);
      const wf = createMockWaveform();
      const loader = new MediaLoader(wf as any, { src: "https://example.com/a.mp3" });
      const createSpy = vi.spyOn(MediaLoader.prototype as any, "createAnalyzer").mockImplementation(function (
        this: any,
      ) {
        this.audio = mockAudio;
        return mockAudio;
      });
      const result = await loader.load({});
      createSpy.mockRestore();
      expect(result).toBe(mockAudio);
      expect(loader.duration).toBe(10.5);
    });
  });

  describe("destroy", () => {
    it("calls reset and destroys audio", () => {
      const wf = createMockWaveform();
      const loader = new MediaLoader(wf as any, { src: "https://example.com/a.mp3" });
      (loader as any).audio = mockAudio;
      loader.destroy();
      expect(mockAudio.destroy).toHaveBeenCalled();
      expect((loader as any).audio).toBeNull();
      loader.destroy();
      expect(mockAudio.destroy).toHaveBeenCalledTimes(1);
    });
  });
});

describe("MediaLoader with WaveformAudio", () => {
  const originalXHR = global.XMLHttpRequest;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.XMLHttpRequest = originalXHR;
  });

  it("load() full path: performRequest, initDecoder, decodeAudioData", async () => {
    const wf = createMockWaveform({ decoderType: "webaudio", splitChannels: false });
    const loader = new MediaLoader(wf as any, { src: "https://example.com/audio.mp3" });
    global.XMLHttpRequest = vi.fn().mockImplementation(function (this: any) {
      this.open = vi.fn();
      this.send = vi.fn().mockImplementation(() => {
        setTimeout(() => {
          if (this.onprogress) {
            this.onprogress({ lengthComputable: true, loaded: 100, total: 200 });
          }
          if (this.onload) {
            this.response = new ArrayBuffer(8);
            this.onload();
          }
        }, 0);
      });
      this.addEventListener = (ev: string, fn: () => void) => {
        if (ev === "progress") this.onprogress = fn;
        if (ev === "load") this.onload = fn;
      };
      this.responseType = "";
      this.readyState = 0;
      this.status = 0;
      return this;
    }) as any;

    const audioInstance = {
      sourceDecoded: vi.fn().mockResolvedValue(false),
      initDecoder: vi.fn().mockResolvedValue(undefined),
      decodeAudioData: vi.fn().mockResolvedValue(undefined),
      duration: 10.5,
      sampleRate: 44100,
      destroy: vi.fn(),
      on: vi.fn(),
    };
    const createAnalyzerSpy = vi.spyOn(MediaLoader.prototype as any, "createAnalyzer").mockImplementation(function (
      this: any,
    ) {
      this.audio = audioInstance;
      return audioInstance;
    });

    const result = await loader.load({});
    expect(createAnalyzerSpy).toHaveBeenCalled();
    expect(result).toBe(audioInstance);
    expect(audioInstance.initDecoder).toHaveBeenCalled();
    expect(audioInstance.decodeAudioData).toHaveBeenCalled();
    expect(wf.setLoadingProgress).toHaveBeenCalledWith(100, 200);
    expect(wf.setLoadingProgress).toHaveBeenCalledWith(undefined, undefined, true);
    createAnalyzerSpy.mockRestore();
  });

  it("performRequest: progress indeterminate when not lengthComputable", async () => {
    const wf = createMockWaveform();
    const loader = new MediaLoader(wf as any, { src: "https://example.com/audio.mp3" });
    const audioInstance = {
      sourceDecoded: vi.fn().mockResolvedValue(false),
      initDecoder: vi.fn().mockResolvedValue(undefined),
      decodeAudioData: vi.fn().mockResolvedValue(undefined),
      duration: 10.5,
      destroy: vi.fn(),
      on: vi.fn(),
    };
    vi.spyOn(MediaLoader.prototype as any, "createAnalyzer").mockImplementation(function (this: any) {
      this.audio = audioInstance;
      return audioInstance;
    });

    global.XMLHttpRequest = vi.fn().mockImplementation(function (this: any) {
      this.open = vi.fn();
      this.send = vi.fn().mockImplementation(() => {
        setTimeout(() => {
          if (this.onprogress) this.onprogress({ lengthComputable: false, loaded: 50, total: 0 });
          if (this.onload) {
            this.response = new ArrayBuffer(4);
            this.onload();
          }
        }, 0);
      });
      this.addEventListener = (ev: string, fn: () => void) => {
        if (ev === "progress") this.onprogress = fn;
        if (ev === "load") this.onload = fn;
      };
      this.responseType = "";
      return this;
    }) as any;

    await loader.load({});
    expect(wf.setLoadingProgress).toHaveBeenCalledWith(50, -1);
  });

  it("performRequest: load error calls setError and reject", async () => {
    const wf = createMockWaveform();
    const loader = new MediaLoader(wf as any, { src: "https://example.com/audio.mp3" });
    const audioInstance = {
      sourceDecoded: vi.fn().mockResolvedValue(false),
      initDecoder: vi.fn(),
      decodeAudioData: vi.fn(),
      destroy: vi.fn(),
      on: vi.fn(),
    };
    vi.spyOn(MediaLoader.prototype as any, "createAnalyzer").mockImplementation(function (this: any) {
      this.audio = audioInstance;
      return audioInstance;
    });

    global.XMLHttpRequest = vi.fn().mockImplementation(function (this: any) {
      this.open = vi.fn();
      this.send = vi.fn().mockImplementation(() => {
        setTimeout(() => {
          if (this.onerror) this.onerror(new Event("error"));
        }, 0);
      });
      this.addEventListener = (ev: string, fn: () => void) => {
        if (ev === "error") this.onerror = fn;
      };
      this.status = 0;
      return this;
    }) as any;

    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await loader.load({});
    expect(result).toBeNull();
    expect(wf.setError).toHaveBeenCalledWith("HTTP error status: 0", expect.any(Error));
    errSpy.mockRestore();
  });

  it("performRequest: readystatechange 4 with status >= 400 calls errorHandler", async () => {
    const wf = createMockWaveform();
    const loader = new MediaLoader(wf as any, { src: "https://example.com/audio.mp3" });
    const audioInstance = {
      sourceDecoded: vi.fn().mockResolvedValue(false),
      initDecoder: vi.fn(),
      decodeAudioData: vi.fn(),
      destroy: vi.fn(),
      on: vi.fn(),
    };
    vi.spyOn(MediaLoader.prototype as any, "createAnalyzer").mockImplementation(function (this: any) {
      this.audio = audioInstance;
      return audioInstance;
    });

    global.XMLHttpRequest = vi.fn().mockImplementation(function (this: any) {
      this.open = vi.fn();
      this.send = vi.fn().mockImplementation(() => {
        setTimeout(() => {
          this.readyState = 4;
          this.status = 404;
          if (this.onreadystatechange) this.onreadystatechange();
        }, 0);
      });
      this.addEventListener = (ev: string, fn: () => void) => {
        if (ev === "readystatechange") this.onreadystatechange = fn;
      };
      this.responseType = "";
      this.readyState = 0;
      this.status = 0;
      return this;
    }) as any;

    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await loader.load({});
    expect(result).toBeNull();
    expect(wf.setError).toHaveBeenCalledWith("HTTP error status: 404", expect.any(Error));
    errSpy.mockRestore();
  });

  it("load catch: initDecoder throws, setError called", async () => {
    const wf = createMockWaveform();
    const loader = new MediaLoader(wf as any, { src: "https://example.com/audio.mp3" });
    const audioInstance = {
      sourceDecoded: vi.fn().mockResolvedValue(false),
      initDecoder: vi.fn().mockRejectedValue(new Error("decode failed")),
      decodeAudioData: vi.fn(),
      destroy: vi.fn(),
      on: vi.fn(),
    };
    vi.spyOn(MediaLoader.prototype as any, "createAnalyzer").mockImplementation(function (this: any) {
      this.audio = audioInstance;
      return audioInstance;
    });

    global.XMLHttpRequest = vi.fn().mockImplementation(function (this: any) {
      this.open = vi.fn();
      this.send = vi.fn().mockImplementation(() => {
        setTimeout(() => {
          if (this.onload) {
            this.response = new ArrayBuffer(4);
            this.onload();
          }
        }, 0);
      });
      this.addEventListener = (ev: string, fn: () => void) => {
        if (ev === "load") this.onload = fn;
      };
      return this;
    }) as any;

    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await loader.load({});
    expect(result).toBeNull();
    expect(wf.setError).toHaveBeenCalled();
    expect((wf.setError as vi.Mock).mock.calls[0][0]).toContain("An error occurred while decoding the audio file");
    errSpy.mockRestore();
  });

  it("performRequest adds lsref param when URL has no signed param", async () => {
    const wf = createMockWaveform();
    const loader = new MediaLoader(wf as any, { src: "https://example.com/audio.mp3" });
    const audioInstance = {
      sourceDecoded: vi.fn().mockResolvedValue(false),
      initDecoder: vi.fn().mockResolvedValue(undefined),
      decodeAudioData: vi.fn().mockResolvedValue(undefined),
      destroy: vi.fn(),
      on: vi.fn(),
    };
    vi.spyOn(MediaLoader.prototype as any, "createAnalyzer").mockImplementation(function (this: any) {
      this.audio = audioInstance;
      return audioInstance;
    });

    let openedUrl: string | null = null;
    global.XMLHttpRequest = vi.fn().mockImplementation(function (this: any) {
      this.open = vi.fn().mockImplementation((_method: string, url: string) => {
        openedUrl = url;
      });
      this.send = vi.fn().mockImplementation(() => {
        setTimeout(() => {
          if (this.onload) {
            this.response = new ArrayBuffer(4);
            this.onload();
          }
        }, 0);
      });
      this.addEventListener = (ev: string, fn: () => void) => {
        if (ev === "load") this.onload = fn;
      };
      return this;
    }) as any;

    await loader.load({});
    expect(openedUrl).toContain("lsref=1");
  });

  it("cancel aborts XHR", async () => {
    const wf = createMockWaveform();
    const loader = new MediaLoader(wf as any, { src: "https://example.com/audio.mp3" });
    const audioInstance = {
      sourceDecoded: vi.fn().mockResolvedValue(false),
      initDecoder: vi.fn().mockResolvedValue(undefined),
      decodeAudioData: vi.fn().mockResolvedValue(undefined),
      destroy: vi.fn(),
      on: vi.fn(),
    };
    vi.spyOn(MediaLoader.prototype as any, "createAnalyzer").mockImplementation(function (this: any) {
      this.audio = audioInstance;
      return audioInstance;
    });

    let abortCalled = false;
    global.XMLHttpRequest = vi.fn().mockImplementation(function (this: any) {
      this.open = vi.fn();
      this.send = vi.fn().mockImplementation(() => {
        (loader as any).cancel();
        expect(abortCalled).toBe(true);
      });
      this.abort = vi.fn().mockImplementation(() => {
        abortCalled = true;
        if (this.onerror) this.onerror(new Event("error"));
      });
      this.addEventListener = (ev: string, fn: () => void) => {
        if (ev === "error") this.onerror = fn;
      };
      this.status = 0;
      return this;
    }) as any;

    const result = await loader.load({});
    expect(result).toBeNull();
    expect(abortCalled).toBe(true);
  });
});

describe("MediaLoader loadWithoutDecoding (decoder none)", () => {
  const originalAudio = global.Audio;

  afterEach(() => {
    global.Audio = originalAudio;
  });

  it("loads with decoder none and warns when playerType is not html5", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const wf = createMockWaveform({ decoderType: "none", playerType: "webaudio" });
    const loader = new MediaLoader(wf as any, { src: "https://example.com/audio.mp3" });

    const mockAudioInstance = {
      setDurationWithoutDecoding: vi.fn(),
      get duration() {
        return 12;
      },
      destroy: vi.fn(),
      on: vi.fn(),
    };
    vi.spyOn(MediaLoader.prototype as any, "createAnalyzer").mockImplementation(function (this: any) {
      this.audio = mockAudioInstance;
      return mockAudioInstance;
    });

    global.Audio = vi.fn().mockImplementation(function (this: any) {
      this.preload = "";
      this.src = "";
      this.duration = 12;
      this.addEventListener = (ev: string, fn: () => void) => {
        if (ev === "loadedmetadata") {
          setTimeout(() => fn(), 0);
        }
      };
      return this;
    }) as any;

    const result = await loader.load({});
    expect(result).not.toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Decoder "none" requires HTML5 player'));
    expect(wf.setLoadingProgress).toHaveBeenCalledWith(undefined, undefined, true);
    expect(loader.duration).toBe(12);
    expect(mockAudioInstance.setDurationWithoutDecoding).toHaveBeenCalledWith(12);
    warnSpy.mockRestore();
  });

  it("loadWithoutDecoding catch: setError on load error", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const wf = createMockWaveform({ decoderType: "none", playerType: "html5" });
    const loader = new MediaLoader(wf as any, { src: "https://example.com/audio.mp3" });

    global.Audio = vi.fn().mockImplementation(function (this: any) {
      this.preload = "";
      this.src = "";
      this.addEventListener = (ev: string, fn: (e?: Event) => void) => {
        if (ev === "error") setTimeout(() => fn!(new Event("error")), 0);
      };
      return this;
    }) as any;

    const result = await loader.load({});
    expect(result).toBeNull();
    expect(wf.setError).toHaveBeenCalled();
    const setErrorCalls = (wf.setError as vi.Mock).mock.calls;
    expect(setErrorCalls.some((c) => String(c[0]).includes("An error occurred while loading the audio file"))).toBe(
      true,
    );
    errSpy.mockRestore();
  });
});

describe("MediaLoader createAnalyzer and decodingProgress", () => {
  it("forwards decodingProgress to waveform", async () => {
    const wf = createMockWaveform();
    const loader = new MediaLoader(wf as any, { src: "https://example.com/audio.mp3" });
    const audioInstance = {
      sourceDecoded: vi.fn().mockResolvedValue(true),
      duration: 5,
      initDecoder: vi.fn(),
      decodeAudioData: vi.fn(),
      destroy: vi.fn(),
      on: vi.fn(),
    };
    const createSpy = vi.spyOn(MediaLoader.prototype as any, "createAnalyzer").mockImplementation(function (
      this: any,
    ) {
      this.audio = audioInstance;
      (this.audio as any).on("decodingProgress", (chunk: number, total: number) => {
        this.wf.setDecodingProgress(chunk, total);
      });
      return this.audio;
    });
    await loader.load({});
    expect(createSpy).toHaveBeenCalled();
    expect(audioInstance.on).toHaveBeenCalledWith("decodingProgress", expect.any(Function));
    const cb = audioInstance.on.mock.calls.find((c: string[]) => c[0] === "decodingProgress")?.[1] as (
      a: number,
      b: number,
    ) => void;
    expect(cb).toBeDefined();
    cb!(3, 10);
    expect(mockSetDecodingProgress).toHaveBeenCalledWith(3, 10);
    createSpy.mockRestore();
  });
});
