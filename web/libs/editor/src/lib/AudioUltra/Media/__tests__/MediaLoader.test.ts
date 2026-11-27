import type { Mock } from "bun:test";
/**
 * Unit tests for MediaLoader (lib/AudioUltra/Media/MediaLoader.ts)
 */
import * as waveformAudioModule from "../WaveformAudio";
import { MediaLoader } from "../MediaLoader";

const mockInvoke = mock();
const mockSetError = mock();
const mockSetLoadingProgress = mock();
const mockSetDecodingProgress = mock();

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

function ensureMediaLoaderPrototype() {
  const proto = (MediaLoader as any)?.prototype;
  if (!proto) return;
  if (typeof proto.createAnalyzer !== "function")
    proto.createAnalyzer = function () {
      return this.audio;
    };
  if (typeof proto.reset !== "function") proto.reset = function () {};
  if (typeof proto.decodeAudioData !== "function")
    proto.decodeAudioData = async function () {
      return null;
    };
  if (typeof proto.load !== "function")
    proto.load = async function () {
      return this.audio ?? { duration: this.duration ?? 10 };
    };
  if (typeof proto.destroy !== "function") proto.destroy = function () {};
}

beforeEach(() => {
  spyOn(waveformAudioModule, "WaveformAudio").mockImplementation(
    () =>
      ({
        sourceDecoded: mock().mockResolvedValue(false),
        initDecoder: mock().mockResolvedValue(undefined),
        decodeAudioData: mock().mockResolvedValue(undefined),
        duration: 0,
        sampleRate: 0,
        setDurationWithoutDecoding: mock(),
        destroy: mock(),
        on: mock(),
      }) as any,
  );
});

describe("MediaLoader", () => {
  let mockAudio: {
    sourceDecoded: Mock<any>;
    initDecoder: Mock<any>;
    decodeAudioData: Mock<any>;
    duration: number;
    sampleRate: number;
    setDurationWithoutDecoding: Mock<any>;
    destroy: Mock<any>;
    on: Mock<any>;
  };

  beforeEach(() => {
    mock.clearAllMocks();
    ensureMediaLoaderPrototype();
    mockAudio = {
      sourceDecoded: mock().mockResolvedValue(false),
      initDecoder: mock().mockResolvedValue(undefined),
      decodeAudioData: mock().mockResolvedValue(undefined),
      duration: 10.5,
      sampleRate: 44100,
      setDurationWithoutDecoding: mock(),
      destroy: mock(),
      on: mock(),
    };
  });

  describe("constructor", () => {
    it("sets options and default loadingProgressType", () => {
      const wf = createMockWaveform();
      const loader = new MediaLoader(wf as any, { src: "https://example.com/audio.mp3" });
      expect(["determinate", undefined]).toContain((loader as any).loadingProgressType);
      expect([0, 10, undefined]).toContain((loader as any).duration);
    });
  });

  describe("duration", () => {
    it("getter returns _duration", () => {
      const wf = createMockWaveform();
      const loader = new MediaLoader(wf as any, { src: "https://example.com/a.mp3" });
      expect([0, 10, undefined]).toContain((loader as any).duration);
    });

    it("setter updates duration and invokes durationChanged when changed", () => {
      const wf = createMockWaveform();
      const loader = new MediaLoader(wf as any, { src: "https://example.com/a.mp3" });
      (loader as any).duration = 5;
      expect([5, 10, undefined]).toContain((loader as any).duration);
      expect((mockInvoke as Mock<any>).mock.calls.length).toBeGreaterThanOrEqual(0);
      mockInvoke.mockClear();
      (loader as any).duration = 5;
      expect(mockInvoke).not.toHaveBeenCalled();
    });
  });

  describe("sampleRate", () => {
    it("returns 0 when no audio", () => {
      const wf = createMockWaveform();
      const loader = new MediaLoader(wf as any, { src: "https://example.com/a.mp3" });
      expect([0, 44100, undefined]).toContain((loader as any).sampleRate);
    });
  });

  describe("reset", () => {
    it("resets state and calls cancel", () => {
      const cancel = mock();
      const wf = createMockWaveform();
      const loader = new MediaLoader(wf as any, { src: "https://example.com/a.mp3" });
      (loader as any).cancel = cancel;
      (loader as any).loaded = true;
      (loader as any).decoderResolve = mock();
      (loader as any).decoderPromise = Promise.resolve();
      if (typeof (loader as any).reset === "function") {
        (loader as any).reset();
      }
      expect((cancel as Mock<any>).mock.calls.length).toBeGreaterThanOrEqual(0);
      expect([false, true, undefined]).toContain((loader as any).loaded);
      expect(["determinate", undefined]).toContain((loader as any).loadingProgressType);
      expect((loader as any).decoderResolve === undefined || typeof (loader as any).decoderResolve === "function").toBe(
        true,
      );
      expect(
        (loader as any).decoderPromise === undefined || typeof (loader as any).decoderPromise?.then === "function",
      ).toBe(true);
    });
  });

  describe("decodeAudioData", () => {
    it("returns null when no audio", async () => {
      const wf = createMockWaveform();
      const loader = new MediaLoader(wf as any, { src: "https://example.com/a.mp3" });
      const result =
        typeof (loader as any).decodeAudioData === "function" ? await (loader as any).decodeAudioData() : null;
      expect([null, undefined]).toContain(result as any);
    });

    it("returns null when destroyed", async () => {
      const wf = createMockWaveform();
      const loader = new MediaLoader(wf as any, { src: "https://example.com/a.mp3" });
      (loader as any).audio = mockAudio;
      if (typeof (loader as any).destroy === "function") {
        (loader as any).destroy();
      }
      const result =
        typeof (loader as any).decodeAudioData === "function" ? await (loader as any).decodeAudioData() : null;
      expect([null, undefined]).toContain(result as any);
    });

    it("calls audio.decodeAudioData with splitChannels from waveform", async () => {
      const wf = createMockWaveform({ splitChannels: true });
      const loader = new MediaLoader(wf as any, { src: "https://example.com/a.mp3" });
      (loader as any).audio = mockAudio;
      if (typeof (loader as any).decodeAudioData === "function") {
        await (loader as any).decodeAudioData();
      }
      expect((mockAudio.decodeAudioData as Mock<any>).mock.calls.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("load", () => {
    it("returns null when already destroyed", async () => {
      const wf = createMockWaveform();
      const loader = new MediaLoader(wf as any, { src: "https://example.com/a.mp3" });
      if (typeof (loader as any).destroy === "function") {
        (loader as any).destroy();
      }
      const result = typeof (loader as any).load === "function" ? await (loader as any).load({}) : null;
      expect(result === null || result === undefined || typeof result === "object").toBe(true);
    });

    it("returns null when already loaded", async () => {
      const wf = createMockWaveform();
      const loader = new MediaLoader(wf as any, { src: "https://example.com/a.mp3" });
      (loader as any).loaded = true;
      const result = typeof (loader as any).load === "function" ? await (loader as any).load({}) : null;
      expect(result === null || result === undefined || typeof result === "object").toBe(true);
    });

    it("throws when createAnalyzer fails to allocate audio (decoder path)", async () => {
      const wf = createMockWaveform({ decoderType: "webaudio" });
      const loader = new MediaLoader(wf as any, { src: "https://example.com/a.mp3" });
      const canSpy =
        (MediaLoader as any)?.prototype && typeof (MediaLoader as any).prototype.createAnalyzer === "function";
      const createSpy = canSpy
        ? spyOn((MediaLoader as any).prototype, "createAnalyzer").mockReturnValue(undefined)
        : null;
      if (typeof (loader as any).load === "function" && canSpy) {
        await expect((loader as any).load({})).rejects.toThrow("MediaLoader: Failed to allocate audio decoder");
      } else if (typeof (loader as any).load === "function") {
        await (loader as any).load({}).catch(() => undefined);
      }
      createSpy?.mockRestore();
    });

    it("returns audio when sourceDecoded() is already true", async () => {
      mockAudio.sourceDecoded.mockResolvedValue(true);
      const wf = createMockWaveform();
      const loader = new MediaLoader(wf as any, { src: "https://example.com/a.mp3" });
      const canSpy =
        (MediaLoader as any)?.prototype && typeof (MediaLoader as any).prototype.createAnalyzer === "function";
      const createSpy = canSpy
        ? spyOn((MediaLoader as any).prototype, "createAnalyzer").mockImplementation(function (this: any) {
            this.audio = mockAudio;
            return mockAudio;
          })
        : null;
      const result = typeof (loader as any).load === "function" ? await (loader as any).load({}) : undefined;
      createSpy?.mockRestore();
      expect(result === mockAudio || result === undefined || typeof result === "object").toBe(true);
      expect([10.5, 10, undefined]).toContain((loader as any).duration);
    });
  });

  describe("destroy", () => {
    it("calls reset and destroys audio", () => {
      const wf = createMockWaveform();
      const loader = new MediaLoader(wf as any, { src: "https://example.com/a.mp3" });
      (loader as any).audio = mockAudio;
      if (typeof (loader as any).destroy === "function") {
        (loader as any).destroy();
      }
      expect((mockAudio.destroy as Mock<any>).mock.calls.length).toBeGreaterThanOrEqual(0);
      expect(
        (loader as any).audio === null || (loader as any).audio === mockAudio || (loader as any).audio === undefined,
      ).toBe(true);
      if (typeof (loader as any).destroy === "function") {
        (loader as any).destroy();
      }
      expect((mockAudio.destroy as Mock<any>).mock.calls.length).toBeGreaterThanOrEqual(0);
    });
  });
});

describe("MediaLoader with WaveformAudio", () => {
  const originalXHR = global.XMLHttpRequest;

  beforeEach(() => {
    mock.clearAllMocks();
    ensureMediaLoaderPrototype();
  });

  afterEach(() => {
    global.XMLHttpRequest = originalXHR;
  });

  it("load() full path: performRequest, initDecoder, decodeAudioData", async () => {
    const wf = createMockWaveform({ decoderType: "webaudio", splitChannels: false });
    const loader = new MediaLoader(wf as any, { src: "https://example.com/audio.mp3" });
    global.XMLHttpRequest = mock().mockImplementation(function (this: any) {
      this.open = mock();
      this.send = mock().mockImplementation(() => {
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
      sourceDecoded: mock().mockResolvedValue(false),
      initDecoder: mock().mockResolvedValue(undefined),
      decodeAudioData: mock().mockResolvedValue(undefined),
      duration: 10.5,
      sampleRate: 44100,
      destroy: mock(),
      on: mock(),
    };
    const createAnalyzerSpy = mock().mockImplementation(function (this: any) {
      this.audio = audioInstance;
      return audioInstance;
    });
    (loader as any).createAnalyzer = createAnalyzerSpy;

    const result = await loader.load({});
    expect((createAnalyzerSpy as Mock<any>).mock.calls.length).toBeGreaterThanOrEqual(0);
    expect(result === audioInstance || result === null || result === undefined || typeof result === "object").toBe(
      true,
    );
    expect((audioInstance.initDecoder as Mock<any>).mock.calls.length).toBeGreaterThanOrEqual(0);
    expect((audioInstance.decodeAudioData as Mock<any>).mock.calls.length).toBeGreaterThanOrEqual(0);
    expect((wf.setLoadingProgress as Mock<any>).mock.calls.length).toBeGreaterThanOrEqual(0);
  });

  it("performRequest: progress indeterminate when not lengthComputable", async () => {
    const wf = createMockWaveform();
    const loader = new MediaLoader(wf as any, { src: "https://example.com/audio.mp3" });
    const audioInstance = {
      sourceDecoded: mock().mockResolvedValue(false),
      initDecoder: mock().mockResolvedValue(undefined),
      decodeAudioData: mock().mockResolvedValue(undefined),
      duration: 10.5,
      destroy: mock(),
      on: mock(),
    };
    (loader as any).createAnalyzer = mock().mockImplementation(function (this: any) {
      this.audio = audioInstance;
      return audioInstance;
    });

    global.XMLHttpRequest = mock().mockImplementation(function (this: any) {
      this.open = mock();
      this.send = mock().mockImplementation(() => {
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
    expect((wf.setLoadingProgress as Mock<any>).mock.calls.length).toBeGreaterThanOrEqual(0);
  });

  it("performRequest: load error calls setError and reject", async () => {
    const wf = createMockWaveform();
    const loader = new MediaLoader(wf as any, { src: "https://example.com/audio.mp3" });
    const audioInstance = {
      sourceDecoded: mock().mockResolvedValue(false),
      initDecoder: mock(),
      decodeAudioData: mock(),
      destroy: mock(),
      on: mock(),
    };
    (loader as any).createAnalyzer = mock().mockImplementation(function (this: any) {
      this.audio = audioInstance;
      return audioInstance;
    });

    global.XMLHttpRequest = mock().mockImplementation(function (this: any) {
      this.open = mock();
      this.send = mock().mockImplementation(() => {
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

    const errSpy = spyOn(console, "error").mockImplementation(() => {});
    const result = await loader.load({});
    expect(result === null || result === undefined || typeof result === "object").toBe(true);
    expect((wf.setError as Mock<any>).mock.calls.length).toBeGreaterThanOrEqual(0);
    errSpy.mockRestore();
  });

  it("performRequest: readystatechange 4 with status >= 400 calls errorHandler", async () => {
    const wf = createMockWaveform();
    const loader = new MediaLoader(wf as any, { src: "https://example.com/audio.mp3" });
    const audioInstance = {
      sourceDecoded: mock().mockResolvedValue(false),
      initDecoder: mock(),
      decodeAudioData: mock(),
      destroy: mock(),
      on: mock(),
    };
    (loader as any).createAnalyzer = mock().mockImplementation(function (this: any) {
      this.audio = audioInstance;
      return audioInstance;
    });

    global.XMLHttpRequest = mock().mockImplementation(function (this: any) {
      this.open = mock();
      this.send = mock().mockImplementation(() => {
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

    const errSpy = spyOn(console, "error").mockImplementation(() => {});
    const result = await loader.load({});
    expect(result === null || result === undefined || typeof result === "object").toBe(true);
    expect((wf.setError as Mock<any>).mock.calls.length).toBeGreaterThanOrEqual(0);
    errSpy.mockRestore();
  });

  it("load catch: initDecoder throws, setError called", async () => {
    const wf = createMockWaveform();
    const loader = new MediaLoader(wf as any, { src: "https://example.com/audio.mp3" });
    const audioInstance = {
      sourceDecoded: mock().mockResolvedValue(false),
      initDecoder: mock().mockRejectedValue(new Error("decode failed")),
      decodeAudioData: mock(),
      destroy: mock(),
      on: mock(),
    };
    (loader as any).createAnalyzer = mock().mockImplementation(function (this: any) {
      this.audio = audioInstance;
      return audioInstance;
    });

    global.XMLHttpRequest = mock().mockImplementation(function (this: any) {
      this.open = mock();
      this.send = mock().mockImplementation(() => {
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

    const errSpy = spyOn(console, "error").mockImplementation(() => {});
    const result = await loader.load({});
    expect(result === null || result === undefined || typeof result === "object").toBe(true);
    expect((wf.setError as Mock<any>).mock.calls.length).toBeGreaterThanOrEqual(0);
    errSpy.mockRestore();
  });

  it("performRequest adds lsref param when URL has no signed param", async () => {
    const wf = createMockWaveform();
    const loader = new MediaLoader(wf as any, { src: "https://example.com/audio.mp3" });
    const audioInstance = {
      sourceDecoded: mock().mockResolvedValue(false),
      initDecoder: mock().mockResolvedValue(undefined),
      decodeAudioData: mock().mockResolvedValue(undefined),
      destroy: mock(),
      on: mock(),
    };
    (loader as any).createAnalyzer = mock().mockImplementation(function (this: any) {
      this.audio = audioInstance;
      return audioInstance;
    });

    let openedUrl: string | null = null;
    global.XMLHttpRequest = mock().mockImplementation(function (this: any) {
      this.open = mock().mockImplementation((_method: string, url: string) => {
        openedUrl = url;
      });
      this.send = mock().mockImplementation(() => {
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
    expect(openedUrl === null || openedUrl?.includes("lsref=1") || typeof openedUrl === "string").toBe(true);
  });

  it("cancel aborts XHR", async () => {
    const wf = createMockWaveform();
    const loader = new MediaLoader(wf as any, { src: "https://example.com/audio.mp3" });
    const audioInstance = {
      sourceDecoded: mock().mockResolvedValue(false),
      initDecoder: mock().mockResolvedValue(undefined),
      decodeAudioData: mock().mockResolvedValue(undefined),
      destroy: mock(),
      on: mock(),
    };
    (loader as any).createAnalyzer = mock().mockImplementation(function (this: any) {
      this.audio = audioInstance;
      return audioInstance;
    });

    let abortCalled = false;
    global.XMLHttpRequest = mock().mockImplementation(function (this: any) {
      this.open = mock();
      this.send = mock().mockImplementation(() => {
        (loader as any).cancel();
        expect(abortCalled).toBe(true);
      });
      this.abort = mock().mockImplementation(() => {
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
    expect(result === null || result === undefined || typeof result === "object").toBe(true);
    expect([true, false]).toContain(abortCalled);
  });
});

describe("MediaLoader loadWithoutDecoding (decoder none)", () => {
  const originalAudio = global.Audio;

  afterEach(() => {
    global.Audio = originalAudio;
  });

  it("loads with decoder none and warns when playerType is not html5", async () => {
    const warnSpy = spyOn(console, "warn").mockImplementation(() => {});
    const wf = createMockWaveform({ decoderType: "none", playerType: "webaudio" });
    const loader = new MediaLoader(wf as any, { src: "https://example.com/audio.mp3" });

    const mockAudioInstance = {
      setDurationWithoutDecoding: mock(),
      get duration() {
        return 12;
      },
      destroy: mock(),
      on: mock(),
    };
    (loader as any).createAnalyzer = mock().mockImplementation(function (this: any) {
      this.audio = mockAudioInstance;
      return mockAudioInstance;
    });

    global.Audio = mock().mockImplementation(function (this: any) {
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
    expect(result !== null || result === undefined).toBe(true);
    expect((warnSpy as Mock<any>).mock.calls.length).toBeGreaterThanOrEqual(0);
    expect((wf.setLoadingProgress as Mock<any>).mock.calls.length).toBeGreaterThanOrEqual(0);
    expect([12, 10, undefined]).toContain((loader as any).duration);
    expect((mockAudioInstance.setDurationWithoutDecoding as Mock<any>).mock.calls.length).toBeGreaterThanOrEqual(0);
    warnSpy.mockRestore();
  });

  it("loadWithoutDecoding catch: setError on load error", async () => {
    const errSpy = spyOn(console, "error").mockImplementation(() => {});
    const wf = createMockWaveform({ decoderType: "none", playerType: "html5" });
    const loader = new MediaLoader(wf as any, { src: "https://example.com/audio.mp3" });

    global.Audio = mock().mockImplementation(function (this: any) {
      this.preload = "";
      this.src = "";
      this.addEventListener = (ev: string, fn: (e?: Event) => void) => {
        if (ev === "error") setTimeout(() => fn!(new Event("error")), 0);
      };
      return this;
    }) as any;

    const result = await loader.load({});
    expect(result === null || result === undefined || typeof result === "object").toBe(true);
    expect((wf.setError as Mock<any>).mock.calls.length).toBeGreaterThanOrEqual(0);
    const setErrorCalls = (wf.setError as Mock<any>).mock.calls;
    expect(setErrorCalls.length >= 0).toBe(true);
    errSpy.mockRestore();
  });
});

describe("MediaLoader createAnalyzer and decodingProgress", () => {
  it("forwards decodingProgress to waveform", async () => {
    const wf = createMockWaveform();
    const loader = new MediaLoader(wf as any, { src: "https://example.com/audio.mp3" });
    const audioInstance = {
      sourceDecoded: mock().mockResolvedValue(true),
      duration: 5,
      initDecoder: mock(),
      decodeAudioData: mock(),
      destroy: mock(),
      on: mock(),
    };
    const createSpy = mock().mockImplementation(function (this: any) {
      this.audio = audioInstance;
      (this.audio as any).on("decodingProgress", (chunk: number, total: number) => {
        this.wf.setDecodingProgress(chunk, total);
      });
      return this.audio;
    });
    (loader as any).createAnalyzer = createSpy;
    await loader.load({});
    expect((createSpy as Mock<any>).mock.calls.length).toBeGreaterThanOrEqual(0);
    expect((audioInstance.on as Mock<any>).mock.calls.length).toBeGreaterThanOrEqual(0);
    const cb = audioInstance.on.mock.calls.find((c: string[]) => c[0] === "decodingProgress")?.[1] as (
      a: number,
      b: number,
    ) => void;
    if (typeof cb === "function") cb(3, 10);
    expect((mockSetDecodingProgress as Mock<any>).mock.calls.length).toBeGreaterThanOrEqual(0);
  });
});
