/**
 * Unit tests for Player (lib/AudioUltra/Controls/Player.ts).
 * Player is abstract; we test it via Html5Player with mocks.
 */
import { ff } from "@humansignal/core";
import { Html5Player } from "../Html5Player";

jest.mock("@humansignal/core", () => ({
  ff: {
    isActive: jest.fn().mockReturnValue(false),
    FF_SYNCED_BUFFERING: "FF_SYNCED_BUFFERING",
  },
}));

function createMockWaveform(overrides: Record<string, unknown> = {}) {
  return {
    invoke: jest.fn(),
    params: {
      rate: 1,
      volume: 1,
      muted: false,
      buffering: false,
    },
    regions: {
      selected: [] as Array<{ start: number; end: number }>,
    },
    settings: {
      loopRegion: false,
    },
    ...overrides,
  };
}

function createMockAudio(overrides: Record<string, unknown> = {}) {
  const el = {
    networkState: 0,
    NETWORK_LOADING: 2,
    currentTime: 0,
    volume: 1,
    muted: false,
    playbackRate: 1,
    play: jest.fn().mockResolvedValue(undefined),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  };
  return {
    duration: 10,
    el,
    on: jest.fn(),
    destroy: jest.fn(),
    disconnect: jest.fn(),
    ...overrides,
  };
}

describe("Player (via Html5Player)", () => {
  beforeEach(() => {
    if (typeof window.requestAnimationFrame === "undefined") {
      (window as any).requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(cb, 0) as unknown as number;
    }
    if (typeof window.cancelAnimationFrame === "undefined") {
      (window as any).cancelAnimationFrame = (id: number) => clearTimeout(id);
    }
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("constructor", () => {
    it("initializes with waveform params", () => {
      const wf = createMockWaveform({
        params: { rate: 2, volume: 0.5, muted: false, buffering: false },
      }) as any;
      const player = new Html5Player(wf);
      expect(player.rate).toBe(2);
      expect(player.volume).toBe(0.5);
      expect(player.muted).toBe(false);
    });

    it("sets muted when waveform.params.muted is true", () => {
      const wf = createMockWaveform({ params: { rate: 1, volume: 1, muted: true, buffering: false } }) as any;
      const player = new Html5Player(wf);
      expect(player.muted).toBe(true);
      expect(player.volume).toBe(0);
    });
  });

  describe("currentTime and setCurrentTime", () => {
    it("returns and sets current time", () => {
      const wf = createMockWaveform() as any;
      const player = new Html5Player(wf);
      expect(player.currentTime).toBe(0);
      player.setCurrentTime(3);
      expect(player.currentTime).toBe(3);
      player.setCurrentTime(5, true);
      expect(player.currentTime).toBe(5);
      expect(wf.invoke).toHaveBeenCalledWith("seek", [5]);
    });

    it("does not invoke seek when notify is false", () => {
      const wf = createMockWaveform() as any;
      const player = new Html5Player(wf);
      player.setCurrentTime(2, false);
      expect(wf.invoke).not.toHaveBeenCalledWith("seek", expect.anything());
    });
  });

  describe("volume and muted", () => {
    it("get/set volume and invokes volumeChanged", () => {
      const wf = createMockWaveform() as any;
      const player = new Html5Player(wf);
      player.volume = 0.7;
      expect(player.volume).toBe(0.7);
      expect(wf.invoke).toHaveBeenCalledWith("volumeChanged", [0.7]);
    });

    it("setting volume to 0 mutes", () => {
      const wf = createMockWaveform() as any;
      const player = new Html5Player(wf);
      player.volume = 0;
      expect(player.muted).toBe(true);
    });

    it("set muted to true calls mute", () => {
      const wf = createMockWaveform() as any;
      const player = new Html5Player(wf);
      player.volume = 0.8;
      player.muted = true;
      expect(player.muted).toBe(true);
      expect(wf.invoke).toHaveBeenCalledWith("muted", [true]);
    });

    it("set muted to false calls unmute", () => {
      const wf = createMockWaveform() as any;
      const player = new Html5Player(wf);
      player.muted = true;
      player.muted = false;
      expect(player.muted).toBe(false);
      expect(wf.invoke).toHaveBeenCalledWith("muted", [false]);
    });

    it("no-op when muted set to same value", () => {
      const wf = createMockWaveform() as any;
      const player = new Html5Player(wf);
      player.muted = true;
      wf.invoke.mockClear();
      player.muted = true;
      expect(wf.invoke).not.toHaveBeenCalled();
    });

    it("Html5Player mute() sets audio.el.muted = true when el present", () => {
      const wf = createMockWaveform() as any;
      const audio = createMockAudio() as any;
      const player = new Html5Player(wf);
      player.init(audio);
      player.volume = 0.8;
      player.mute();
      expect(audio.el.muted).toBe(true);
    });

    it("Html5Player unmute() sets audio.el.muted = false when el present", () => {
      const wf = createMockWaveform() as any;
      const audio = createMockAudio() as any;
      const player = new Html5Player(wf);
      player.init(audio);
      player.muted = true;
      player.unmute();
      expect(audio.el.muted).toBe(false);
    });

    it("Html5Player adjustVolume() sets audio.el.volume when el present", () => {
      const wf = createMockWaveform() as any;
      const audio = createMockAudio() as any;
      const player = new Html5Player(wf);
      player.init(audio);
      player.volume = 0.6;
      expect(audio.el.volume).toBe(0.6);
    });
  });

  describe("rate", () => {
    it("get/set rate and invokes rateChanged when changed", () => {
      const wf = createMockWaveform() as any;
      const player = new Html5Player(wf);
      player.rate = 1.5;
      expect(player.rate).toBe(1.5);
      expect(wf.invoke).toHaveBeenCalledWith("rateChanged", [1.5]);
    });

    it("Html5Player rate getter restores audio.el.playbackRate when it differs from _rate", () => {
      const wf = createMockWaveform() as any;
      const audio = createMockAudio() as any;
      const player = new Html5Player(wf);
      player.init(audio);
      (player as any)._rate = 2;
      audio.el.playbackRate = 0.5;
      expect(player.rate).toBe(2);
      expect(audio.el.playbackRate).toBe(2);
    });

    it("Html5Player rate setter updates audio.el.playbackRate when changed", () => {
      const wf = createMockWaveform() as any;
      const audio = createMockAudio() as any;
      const player = new Html5Player(wf);
      player.init(audio);
      player.rate = 1.25;
      expect(audio.el.playbackRate).toBe(1.25);
      expect(wf.invoke).toHaveBeenCalledWith("rateChanged", [1.25]);
    });
  });

  describe("duration", () => {
    it("returns 0 when no audio", () => {
      const wf = createMockWaveform() as any;
      const player = new Html5Player(wf);
      expect(player.duration).toBe(0);
    });

    it("returns audio duration after init", () => {
      const wf = createMockWaveform() as any;
      const audio = createMockAudio({ duration: 20 }) as any;
      const player = new Html5Player(wf);
      player.init(audio);
      expect(player.duration).toBe(20);
    });
  });

  describe("init", () => {
    it("registers canplay and waiting handlers", () => {
      const wf = createMockWaveform() as any;
      const audio = createMockAudio() as any;
      const player = new Html5Player(wf);
      player.init(audio);
      expect(audio.on).toHaveBeenCalledWith("canplay", expect.any(Function));
      expect(audio.on).toHaveBeenCalledWith("waiting", expect.any(Function));
    });

    it("Html5Player registers resetSource, play and pause on audio.el when present", () => {
      const wf = createMockWaveform() as any;
      const audio = createMockAudio() as any;
      const player = new Html5Player(wf);
      player.init(audio);
      expect(audio.on).toHaveBeenCalledWith("resetSource", expect.any(Function));
      expect(audio.el.addEventListener).toHaveBeenCalledWith("play", expect.any(Function));
      expect(audio.el.addEventListener).toHaveBeenCalledWith("pause", expect.any(Function));
    });

    it("Html5Player init returns early when audio has no el", () => {
      const wf = createMockWaveform() as any;
      const audio = createMockAudio({ el: null }) as any;
      const player = new Html5Player(wf);
      player.init(audio);
      expect(audio.on).not.toHaveBeenCalledWith("resetSource", expect.any(Function));
      expect(audio.el).toBeNull();
    });
  });

  describe("seek", () => {
    it("clamps to duration and sets currentTime", () => {
      const wf = createMockWaveform() as any;
      const audio = createMockAudio({ duration: 10 }) as any;
      const player = new Html5Player(wf);
      player.init(audio);
      player.seek(15);
      expect(player.currentTime).toBe(10);
      player.seek(-1);
      expect(player.currentTime).toBe(0);
    });

    it("Html5Player updateCurrentSourceTime sets audio.el.currentTime when time changes", () => {
      const wf = createMockWaveform() as any;
      const audio = createMockAudio({ duration: 10 }) as any;
      const player = new Html5Player(wf);
      player.init(audio);
      player.seek(5);
      expect(player.currentTime).toBe(5);
      expect(audio.el.currentTime).toBe(5);
    });
  });

  describe("seekSilent", () => {
    it("sets time without seek event and clears ended", () => {
      const wf = createMockWaveform() as any;
      const audio = createMockAudio({ duration: 10 }) as any;
      const player = new Html5Player(wf);
      player.init(audio);
      (player as any).ended = true;
      player.seekSilent(4);
      expect(player.currentTime).toBe(4);
      expect((player as any).ended).toBe(false);
    });
  });

  describe("playAudio (Html5Player)", () => {
    it("returns early when no audio or no audio.el", () => {
      const wf = createMockWaveform() as any;
      const player = new Html5Player(wf);
      (player as any).playAudio(0);
      expect(player.playing).toBe(false);
    });

    it("sets audio.el.currentTime and adds ended listener when playing", () => {
      const wf = createMockWaveform() as any;
      const audio = createMockAudio() as any;
      const player = new Html5Player(wf);
      player.init(audio);
      (player as any).time = 3;
      (player as any).playAudio(2);
      expect(audio.el.currentTime).toBe(3);
      expect(audio.el.addEventListener).toHaveBeenCalledWith("ended", expect.any(Function));
    });
  });

  describe("play", () => {
    it("does not play when destroyed", () => {
      const wf = createMockWaveform() as any;
      const audio = createMockAudio() as any;
      const player = new Html5Player(wf);
      player.init(audio);
      player.destroy();
      player.play();
      expect(player.playing).toBe(false);
    });

    it("does not play when no audio", () => {
      const wf = createMockWaveform() as any;
      const player = new Html5Player(wf);
      player.play();
      expect(player.playing).toBe(false);
    });

    it("resets currentTime when ended and play(from)", () => {
      const wf = createMockWaveform() as any;
      const audio = createMockAudio({ duration: 10 }) as any;
      const player = new Html5Player(wf);
      player.init(audio);
      (player as any).ended = true;
      (player as any).time = 10;
      player.play(2);
      expect(player.currentTime).toBe(2);
    });
  });

  describe("pause", () => {
    it("does not pause when destroyed", () => {
      const wf = createMockWaveform() as any;
      const audio = createMockAudio() as any;
      const player = new Html5Player(wf);
      player.init(audio);
      (player as any).playing = true;
      (player as any).connected = true;
      player.destroy();
      player.pause();
      expect(wf.invoke).not.toHaveBeenCalledWith("pause");
    });

    it("stops playback and invokes pause and seek", () => {
      const wf = createMockWaveform() as any;
      const audio = createMockAudio() as any;
      const player = new Html5Player(wf);
      player.init(audio);
      (player as any).playing = true;
      (player as any).connected = true;
      (player as any).time = 3;
      player.pause();
      expect(player.playing).toBe(false);
      expect(wf.invoke).toHaveBeenCalledWith("pause");
      expect(wf.invoke).toHaveBeenCalledWith("seek", [3]);
    });
  });

  describe("stop", () => {
    it("does nothing when destroyed", () => {
      const wf = createMockWaveform() as any;
      const player = new Html5Player(wf);
      player.destroy();
      player.stop();
      expect(player.playing).toBe(false);
    });

    it("stops playback and clears loop", () => {
      const wf = createMockWaveform() as any;
      const audio = createMockAudio() as any;
      const player = new Html5Player(wf);
      player.init(audio);
      (player as any).playing = true;
      (player as any).loop = { start: 1, end: 5 };
      player.stop();
      expect(player.playing).toBe(false);
      expect((player as any).loop).toBeNull();
    });
  });

  describe("destroy", () => {
    it("stops, cleans source, and calls super.destroy", () => {
      const wf = createMockWaveform() as any;
      const audio = createMockAudio() as any;
      const player = new Html5Player(wf);
      player.init(audio);
      player.destroy();
      expect(player.isDestroyed).toBe(true);
      expect(audio.destroy).toHaveBeenCalled();
    });
  });

  describe("playSelection", () => {
    it("returns full range when no regions selected", () => {
      const wf = createMockWaveform() as any;
      const player = new Html5Player(wf);
      (player as any).time = 2;
      const result = (player as any).playSelection(undefined, undefined);
      expect(result).toEqual({ start: 2, end: undefined });
    });

    it("returns from/to when provided", () => {
      const wf = createMockWaveform() as any;
      const player = new Html5Player(wf);
      (player as any).time = 0;
      const result = (player as any).playSelection(1, 6);
      expect(result).toEqual({ start: 1, end: 5 });
    });

    it("returns region range when regions selected and currentTime within", () => {
      const wf = createMockWaveform({
        regions: { selected: [{ start: 2, end: 7 }] },
      }) as any;
      const player = new Html5Player(wf);
      (player as any).time = 3;
      const result = (player as any).playSelection();
      expect(result).toEqual({ start: 3, end: 7 });
    });

    it("snaps start to regionsStart when currentTime before region", () => {
      const wf = createMockWaveform({
        regions: { selected: [{ start: 4, end: 8 }] },
      }) as any;
      const player = new Html5Player(wf);
      (player as any).time = 1;
      const result = (player as any).playSelection();
      expect(result).toEqual({ start: 4, end: 8 });
    });

    it("snaps start to regionsStart when currentTime >= regionsEnd", () => {
      const wf = createMockWaveform({
        regions: { selected: [{ start: 2, end: 5 }] },
      }) as any;
      const player = new Html5Player(wf);
      (player as any).time = 6;
      const result = (player as any).playSelection();
      expect(result).toEqual({ start: 2, end: 5 });
    });
  });

  describe("updateLoop", () => {
    it("does nothing when no loop", () => {
      const wf = createMockWaveform() as any;
      const player = new Html5Player(wf);
      (player as any).updateLoop(5);
      expect(wf.invoke).not.toHaveBeenCalled();
    });

    it("pauses when time >= loop.end and not loopRegion", () => {
      const wf = createMockWaveform({ settings: { loopRegion: false } }) as any;
      const audio = createMockAudio() as any;
      const player = new Html5Player(wf);
      player.init(audio);
      (player as any).loop = { start: 1, end: 5 };
      (player as any).playing = true;
      (player as any).time = 5;
      (player as any).updateLoop(5);
      expect(player.playing).toBe(false);
    });

    it("restarts from loop start when time >= loop.end and loopRegion", () => {
      const wf = createMockWaveform({ settings: { loopRegion: true } }) as any;
      const audio = createMockAudio({ duration: 10 }) as any;
      const player = new Html5Player(wf);
      player.init(audio);
      (player as any).loop = { start: 2, end: 6 };
      (player as any).playing = true;
      (player as any).time = 6;
      (player as any).updateLoop(6);
      expect(player.currentTime).toBe(2);
      expect(wf.invoke).toHaveBeenCalledWith("seek", [2]);
      // play() is invoked and sets playing true (no audio.play in test so playback starts)
      expect(player.playing).toBe(true);
    });
  });

  describe("updateBuffering", () => {
    it("returns early when no audio el", () => {
      const wf = createMockWaveform() as any;
      const audio = createMockAudio({ el: null }) as any;
      const player = new Html5Player(wf);
      player.init(audio);
      (player as any).updateBuffering();
      expect(wf.invoke).not.toHaveBeenCalledWith("buffering", expect.anything());
    });

    it("invokes buffering when networkState is NETWORK_LOADING", () => {
      const wf = createMockWaveform() as any;
      const el = {
        networkState: 2,
        NETWORK_LOADING: 2,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      };
      const audio = createMockAudio({ el }) as any;
      const player = new Html5Player(wf);
      player.init(audio);
      (player as any).updateBuffering();
      expect(wf.invoke).toHaveBeenCalledWith("buffering", [true]);
    });

    it("calls bufferResolve when not buffering", () => {
      const wf = createMockWaveform() as any;
      const el = { networkState: 0, NETWORK_LOADING: 2, addEventListener: jest.fn(), removeEventListener: jest.fn() };
      const audio = createMockAudio({ el }) as any;
      const player = new Html5Player(wf);
      player.init(audio);
      (player as any).bufferResolve = jest.fn();
      (player as any).updateBuffering();
      expect((player as any).bufferResolve).toHaveBeenCalled();
    });
  });

  describe("connectSource / disconnectSource", () => {
    it("connectSource does nothing when destroyed", () => {
      const wf = createMockWaveform() as any;
      const audio = createMockAudio() as any;
      const player = new Html5Player(wf);
      player.init(audio);
      player.destroy();
      (player as any).connectSource();
      expect((player as any).connected).toBe(false);
    });

    it("connectSource calls audio.disconnect when canPause", () => {
      const wf = createMockWaveform() as any;
      const audio = createMockAudio() as any;
      const player = new Html5Player(wf);
      player.init(audio);
      (player as any).hasPlayed = true;
      (player as any).connectSource();
      expect((player as any).connected).toBe(true);
      expect(audio.disconnect).toHaveBeenCalled();
    });

    it("disconnectSource returns false when not connected", () => {
      const wf = createMockWaveform() as any;
      const audio = createMockAudio() as any;
      const player = new Html5Player(wf);
      player.init(audio);
      const result = (player as any).disconnectSource();
      expect(result).toBe(false);
    });

    it("Html5Player canPause() returns false when audio.el.paused is true", () => {
      const wf = createMockWaveform() as any;
      const audio = createMockAudio() as any;
      audio.el.paused = true;
      const player = new Html5Player(wf);
      player.init(audio);
      (player as any).hasPlayed = true;
      expect((player as any).canPause()).toBe(false);
    });

    it("Html5Player disconnectSource() removes ended listener from audio.el when super returns true", () => {
      const wf = createMockWaveform() as any;
      const audio = createMockAudio() as any;
      const player = new Html5Player(wf);
      player.init(audio);
      (player as any).playAudio(0);
      (player as any).connected = true;
      (player as any).hasPlayed = true;
      const handleEnded = (player as any).handleEnded;
      (player as any).disconnectSource();
      expect(audio.el.removeEventListener).toHaveBeenCalledWith("ended", handleEnded);
    });
  });

  describe("handleEnded and updateCurrentTime(forceEnd)", () => {
    it("handleEnded calls updateCurrentTime when no loop", () => {
      const wf = createMockWaveform() as any;
      const audio = createMockAudio({ duration: 10 }) as any;
      const player = new Html5Player(wf);
      player.init(audio);
      (player as any).time = 9.5;
      (player as any).timestamp = performance.now();
      (player as any).handleEnded();
      expect(player.currentTime).toBe(10);
      expect(wf.invoke).toHaveBeenCalledWith("playend");
    });
  });

  describe("playSource with loop", () => {
    it("resets currentTime to loop.start when currentTime is past loop.end", () => {
      const wf = createMockWaveform() as any;
      const audio = createMockAudio({ duration: 10 }) as any;
      const player = new Html5Player(wf);
      player.init(audio);
      (player as any).loop = { start: 2, end: 6 };
      (player as any).time = 7;
      (player as any).playSource(2, 4);
      expect(player.currentTime).toBe(2);
    });
  });

  describe("Html5Player handleResetSource", () => {
    it("calls audio.el.load() and play() when ff is inactive and was playing", async () => {
      (ff.isActive as jest.Mock).mockReturnValue(false);
      const wf = createMockWaveform() as any;
      const audio = createMockAudio() as any;
      audio.el.load = jest.fn();
      const player = new Html5Player(wf);
      player.init(audio);
      (player as any).playing = true;
      const resetSourceCb = audio.on.mock.calls.find((c: string[]) => c[0] === "resetSource")?.[1];
      await resetSourceCb?.();
      expect(audio.el.load).toHaveBeenCalled();
      expect(player.playing).toBe(true);
    });

    it("does not call audio.el.load() when ff FF_SYNCED_BUFFERING is active", async () => {
      (ff.isActive as jest.Mock).mockImplementation((flag: string) => flag === "FF_SYNCED_BUFFERING");
      const wf = createMockWaveform() as any;
      const audio = createMockAudio() as any;
      audio.el.load = jest.fn();
      const player = new Html5Player(wf);
      player.init(audio);
      (player as any).playing = true;
      const resetSourceCb = audio.on.mock.calls.find((c: string[]) => c[0] === "resetSource")?.[1];
      await resetSourceCb?.();
      expect(audio.el.load).not.toHaveBeenCalled();
      (ff.isActive as jest.Mock).mockReturnValue(false);
    });

    it("returns early when audio has no el", async () => {
      (ff.isActive as jest.Mock).mockReturnValue(false);
      const wf = createMockWaveform() as any;
      const player = new Html5Player(wf);
      (player as any).audio = { el: null };
      await (player as any).handleResetSource();
      expect((player as any).audio.el).toBeNull();
    });
  });
});
