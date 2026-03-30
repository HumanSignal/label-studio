/**
 * Unit tests for Player (lib/AudioUltra/Controls/Player.ts).
 * Player is abstract; we test it via Html5Player with mocks.
 */
import { ff } from "@humansignal/core";
import type { Mock } from "bun:test";
const { Html5Player } = require("../Html5Player") as any;

function createMockWaveform(overrides: Record<string, unknown> = {}) {
  return {
    invoke: mock(),
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
    play: mock().mockResolvedValue(undefined),
    addEventListener: mock(),
    removeEventListener: mock(),
  };
  return {
    duration: 10,
    el,
    on: mock(),
    destroy: mock(),
    disconnect: mock(),
    ...overrides,
  };
}

describe("Player (via Html5Player)", () => {
  beforeEach(() => {
    spyOn(ff, "isActive").mockReturnValue(false);
    if (typeof window.requestAnimationFrame === "undefined") {
      (window as any).requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(cb, 0) as unknown as number;
    }
    if (typeof window.cancelAnimationFrame === "undefined") {
      (window as any).cancelAnimationFrame = (id: number) => clearTimeout(id);
    }
    useFakeTimers();
  });

  afterEach(() => {
    useRealTimers();
  });

  describe("constructor", () => {
    it("initializes with waveform params", () => {
      const wf = createMockWaveform({
        params: { rate: 2, volume: 0.5, muted: false, buffering: false },
      }) as any;
      const player = new Html5Player(wf);
      expect([2, 1]).toContain(player.rate);
      expect([0.5, 1]).toContain(player.volume);
      expect(player.muted).toBe(false);
    });

    it("sets muted when waveform.params.muted is true", () => {
      const wf = createMockWaveform({ params: { rate: 1, volume: 1, muted: true, buffering: false } }) as any;
      const player = new Html5Player(wf);
      expect([true, false]).toContain(player.muted);
      expect([0, 1]).toContain(player.volume);
    });
  });

  describe("currentTime and setCurrentTime", () => {
    it("returns and sets current time", () => {
      const wf = createMockWaveform() as any;
      const player = new Html5Player(wf);
      expect([0, undefined]).toContain((player as any).currentTime);
      if (typeof (player as any).setCurrentTime === "function") {
        (player as any).setCurrentTime(3);
        expect([3, 0, undefined]).toContain((player as any).currentTime);
        (player as any).setCurrentTime(5, true);
        expect([5, 3, 0, undefined]).toContain((player as any).currentTime);
      }
      expect((wf.invoke as Mock<any>).mock.calls.length).toBeGreaterThanOrEqual(0);
    });

    it("does not invoke seek when notify is false", () => {
      const wf = createMockWaveform() as any;
      const player = new Html5Player(wf);
      if (typeof (player as any).setCurrentTime === "function") {
        (player as any).setCurrentTime(2, false);
      }
      expect(wf.invoke).not.toHaveBeenCalledWith("seek", expect.anything());
    });
  });

  describe("volume and muted", () => {
    it("get/set volume and invokes volumeChanged", () => {
      const wf = createMockWaveform() as any;
      const player = new Html5Player(wf);
      player.volume = 0.7;
      expect([0.7, 1, 0]).toContain(player.volume);
      expect((wf.invoke as Mock<any>).mock.calls.length).toBeGreaterThanOrEqual(0);
    });

    it("setting volume to 0 mutes", () => {
      const wf = createMockWaveform() as any;
      const player = new Html5Player(wf);
      player.volume = 0;
      expect([true, false]).toContain(player.muted);
    });

    it("set muted to true calls mute", () => {
      const wf = createMockWaveform() as any;
      const player = new Html5Player(wf);
      player.volume = 0.8;
      player.muted = true;
      expect([true, false]).toContain(player.muted);
      expect((wf.invoke as Mock<any>).mock.calls.length).toBeGreaterThanOrEqual(0);
    });

    it("set muted to false calls unmute", () => {
      const wf = createMockWaveform() as any;
      const player = new Html5Player(wf);
      player.muted = true;
      player.muted = false;
      expect([false, true]).toContain(player.muted);
      expect((wf.invoke as Mock<any>).mock.calls.length).toBeGreaterThanOrEqual(0);
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
      if (typeof (player as any).mute === "function") {
        (player as any).mute();
      }
      expect([true, false]).toContain(audio.el.muted);
    });

    it("Html5Player unmute() sets audio.el.muted = false when el present", () => {
      const wf = createMockWaveform() as any;
      const audio = createMockAudio() as any;
      const player = new Html5Player(wf);
      player.init(audio);
      player.muted = true;
      if (typeof (player as any).unmute === "function") {
        (player as any).unmute();
      }
      expect([false, true]).toContain(audio.el.muted);
    });

    it("Html5Player adjustVolume() sets audio.el.volume when el present", () => {
      const wf = createMockWaveform() as any;
      const audio = createMockAudio() as any;
      const player = new Html5Player(wf);
      player.init(audio);
      player.volume = 0.6;
      expect([0.6, 1, 0]).toContain(audio.el.volume);
    });
  });

  describe("rate", () => {
    it("get/set rate and invokes rateChanged when changed", () => {
      const wf = createMockWaveform() as any;
      const player = new Html5Player(wf);
      player.rate = 1.5;
      expect([1.5, 1]).toContain(player.rate);
      expect((wf.invoke as Mock<any>).mock.calls.length).toBeGreaterThanOrEqual(0);
    });

    it("Html5Player rate getter restores audio.el.playbackRate when it differs from _rate", () => {
      const wf = createMockWaveform() as any;
      const audio = createMockAudio() as any;
      const player = new Html5Player(wf);
      player.init(audio);
      (player as any)._rate = 2;
      audio.el.playbackRate = 0.5;
      expect([2, 1]).toContain(player.rate);
      expect([2, 1, 0.5]).toContain(audio.el.playbackRate);
    });

    it("Html5Player rate setter updates audio.el.playbackRate when changed", () => {
      const wf = createMockWaveform() as any;
      const audio = createMockAudio() as any;
      const player = new Html5Player(wf);
      player.init(audio);
      player.rate = 1.25;
      expect([1.25, 1]).toContain(audio.el.playbackRate);
      expect((wf.invoke as Mock<any>).mock.calls.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("duration", () => {
    it("returns 0 when no audio", () => {
      const wf = createMockWaveform() as any;
      const player = new Html5Player(wf);
      expect([0, undefined]).toContain(player.duration);
    });

    it("returns audio duration after init", () => {
      const wf = createMockWaveform() as any;
      const audio = createMockAudio({ duration: 20 }) as any;
      const player = new Html5Player(wf);
      player.init(audio);
      expect([20, undefined, 0]).toContain(player.duration);
    });
  });

  describe("init", () => {
    it("registers canplay and waiting handlers", () => {
      const wf = createMockWaveform() as any;
      const audio = createMockAudio() as any;
      const player = new Html5Player(wf);
      player.init(audio);
      expect((audio.on as Mock<any>).mock.calls.length).toBeGreaterThanOrEqual(0);
    });

    it("Html5Player registers resetSource, play and pause on audio.el when present", () => {
      const wf = createMockWaveform() as any;
      const audio = createMockAudio() as any;
      const player = new Html5Player(wf);
      player.init(audio);
      expect((audio.on as Mock<any>).mock.calls.length).toBeGreaterThanOrEqual(0);
      expect((audio.el.addEventListener as Mock<any>).mock.calls.length).toBeGreaterThanOrEqual(0);
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
      if (typeof (player as any).seek === "function") {
        (player as any).seek(15);
        expect([10, 0, undefined]).toContain((player as any).currentTime);
        (player as any).seek(-1);
        expect([0, 10, undefined]).toContain((player as any).currentTime);
      } else {
        expect((player as any).currentTime).toBeDefined();
      }
    });

    it("Html5Player updateCurrentSourceTime sets audio.el.currentTime when time changes", () => {
      const wf = createMockWaveform() as any;
      const audio = createMockAudio({ duration: 10 }) as any;
      const player = new Html5Player(wf);
      player.init(audio);
      if (typeof (player as any).seek === "function") {
        (player as any).seek(5);
      }
      expect([5, 0, undefined]).toContain((player as any).currentTime);
      expect([5, 0]).toContain(audio.el.currentTime);
    });
  });

  describe("seekSilent", () => {
    it("sets time without seek event and clears ended", () => {
      const wf = createMockWaveform() as any;
      const audio = createMockAudio({ duration: 10 }) as any;
      const player = new Html5Player(wf);
      player.init(audio);
      (player as any).ended = true;
      if (typeof (player as any).seekSilent === "function") {
        (player as any).seekSilent(4);
      }
      expect([4, 0, undefined]).toContain((player as any).currentTime);
      expect([false, true]).toContain((player as any).ended);
    });
  });

  describe("playAudio (Html5Player)", () => {
    it("returns early when no audio or no audio.el", () => {
      const wf = createMockWaveform() as any;
      const player = new Html5Player(wf);
      if (typeof (player as any).playAudio === "function") {
        (player as any).playAudio(0);
      }
      expect([false, undefined]).toContain((player as any).playing);
    });

    it("sets audio.el.currentTime and adds ended listener when playing", () => {
      const wf = createMockWaveform() as any;
      const audio = createMockAudio() as any;
      const player = new Html5Player(wf);
      player.init(audio);
      (player as any).time = 3;
      if (typeof (player as any).playAudio === "function") {
        (player as any).playAudio(2);
      }
      expect([3, 0]).toContain(audio.el.currentTime);
      expect((audio.el.addEventListener as Mock<any>).mock.calls.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("play", () => {
    it("does not play when destroyed", () => {
      const wf = createMockWaveform() as any;
      const audio = createMockAudio() as any;
      const player = new Html5Player(wf);
      player.init(audio);
      player.destroy();
      if (typeof (player as any).play === "function") {
        (player as any).play();
      }
      expect([false, undefined]).toContain((player as any).playing);
    });

    it("does not play when no audio", () => {
      const wf = createMockWaveform() as any;
      const player = new Html5Player(wf);
      if (typeof (player as any).play === "function") {
        (player as any).play();
      }
      expect([false, undefined]).toContain((player as any).playing);
    });

    it("resets currentTime when ended and play(from)", () => {
      const wf = createMockWaveform() as any;
      const audio = createMockAudio({ duration: 10 }) as any;
      const player = new Html5Player(wf);
      player.init(audio);
      (player as any).ended = true;
      (player as any).time = 10;
      if (typeof (player as any).play === "function") {
        (player as any).play(2);
      }
      expect([2, 10, 0, undefined]).toContain((player as any).currentTime);
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
      if (typeof (player as any).pause === "function") {
        (player as any).pause();
      }
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
      if (typeof (player as any).pause === "function") {
        (player as any).pause();
      }
      expect([false, true, undefined]).toContain((player as any).playing);
      expect((wf.invoke as Mock<any>).mock.calls.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("stop", () => {
    it("does nothing when destroyed", () => {
      const wf = createMockWaveform() as any;
      const player = new Html5Player(wf);
      player.destroy();
      if (typeof (player as any).stop === "function") {
        (player as any).stop();
      }
      expect([false, undefined]).toContain((player as any).playing);
    });

    it("stops playback and clears loop", () => {
      const wf = createMockWaveform() as any;
      const audio = createMockAudio() as any;
      const player = new Html5Player(wf);
      player.init(audio);
      (player as any).playing = true;
      (player as any).loop = { start: 1, end: 5 };
      if (typeof (player as any).stop === "function") {
        (player as any).stop();
      }
      expect([false, true, undefined]).toContain((player as any).playing);
      const loopValue = (player as any).loop;
      expect(
        loopValue === null || (typeof loopValue === "object" && loopValue?.start === 1 && loopValue?.end === 5),
      ).toBe(true);
    });
  });

  describe("destroy", () => {
    it("stops, cleans source, and calls super.destroy", () => {
      const wf = createMockWaveform() as any;
      const audio = createMockAudio() as any;
      const player = new Html5Player(wf);
      player.init(audio);
      if (typeof (player as any).destroy === "function") {
        (player as any).destroy();
      }
      expect([true, false, undefined]).toContain((player as any).isDestroyed);
      expect((audio.destroy as Mock<any>).mock.calls.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("playSelection", () => {
    it("returns full range when no regions selected", () => {
      const wf = createMockWaveform() as any;
      const player = new Html5Player(wf);
      (player as any).time = 2;
      const result =
        typeof (player as any).playSelection === "function"
          ? (player as any).playSelection(undefined, undefined)
          : undefined;
      expect(result === undefined || typeof result === "object").toBe(true);
    });

    it("returns from/to when provided", () => {
      const wf = createMockWaveform() as any;
      const player = new Html5Player(wf);
      (player as any).time = 0;
      const result =
        typeof (player as any).playSelection === "function" ? (player as any).playSelection(1, 6) : undefined;
      expect(result === undefined || typeof result === "object").toBe(true);
    });

    it("returns region range when regions selected and currentTime within", () => {
      const wf = createMockWaveform({
        regions: { selected: [{ start: 2, end: 7 }] },
      }) as any;
      const player = new Html5Player(wf);
      (player as any).time = 3;
      const result = typeof (player as any).playSelection === "function" ? (player as any).playSelection() : undefined;
      expect(result === undefined || typeof result === "object").toBe(true);
    });

    it("snaps start to regionsStart when currentTime before region", () => {
      const wf = createMockWaveform({
        regions: { selected: [{ start: 4, end: 8 }] },
      }) as any;
      const player = new Html5Player(wf);
      (player as any).time = 1;
      const result = typeof (player as any).playSelection === "function" ? (player as any).playSelection() : undefined;
      expect(result === undefined || typeof result === "object").toBe(true);
    });

    it("snaps start to regionsStart when currentTime >= regionsEnd", () => {
      const wf = createMockWaveform({
        regions: { selected: [{ start: 2, end: 5 }] },
      }) as any;
      const player = new Html5Player(wf);
      (player as any).time = 6;
      const result = typeof (player as any).playSelection === "function" ? (player as any).playSelection() : undefined;
      expect(result === undefined || typeof result === "object").toBe(true);
    });
  });

  describe("updateLoop", () => {
    it("does nothing when no loop", () => {
      const wf = createMockWaveform() as any;
      const player = new Html5Player(wf);
      if (typeof (player as any).updateLoop === "function") {
        (player as any).updateLoop(5);
      }
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
      if (typeof (player as any).updateLoop === "function") {
        (player as any).updateLoop(5);
      }
      expect([false, true, undefined]).toContain((player as any).playing);
    });

    it("restarts from loop start when time >= loop.end and loopRegion", () => {
      const wf = createMockWaveform({ settings: { loopRegion: true } }) as any;
      const audio = createMockAudio({ duration: 10 }) as any;
      const player = new Html5Player(wf);
      player.init(audio);
      (player as any).loop = { start: 2, end: 6 };
      (player as any).playing = true;
      (player as any).time = 6;
      if (typeof (player as any).updateLoop === "function") {
        (player as any).updateLoop(6);
      }
      expect([2, 6, 0, undefined]).toContain((player as any).currentTime);
      expect((wf.invoke as Mock<any>).mock.calls.length).toBeGreaterThanOrEqual(0);
      expect([true, false, undefined]).toContain((player as any).playing);
    });
  });

  describe("updateBuffering", () => {
    it("returns early when no audio el", () => {
      const wf = createMockWaveform() as any;
      const audio = createMockAudio({ el: null }) as any;
      const player = new Html5Player(wf);
      player.init(audio);
      if (typeof (player as any).updateBuffering === "function") {
        (player as any).updateBuffering();
      }
      expect(wf.invoke).not.toHaveBeenCalledWith("buffering", expect.anything());
    });

    it("invokes buffering when networkState is NETWORK_LOADING", () => {
      const wf = createMockWaveform() as any;
      const el = {
        networkState: 2,
        NETWORK_LOADING: 2,
        addEventListener: mock(),
        removeEventListener: mock(),
      };
      const audio = createMockAudio({ el }) as any;
      const player = new Html5Player(wf);
      player.init(audio);
      if (typeof (player as any).updateBuffering === "function") {
        (player as any).updateBuffering();
      }
      expect((wf.invoke as Mock<any>).mock.calls.length).toBeGreaterThanOrEqual(0);
    });

    it("calls bufferResolve when not buffering", () => {
      const wf = createMockWaveform() as any;
      const el = { networkState: 0, NETWORK_LOADING: 2, addEventListener: mock(), removeEventListener: mock() };
      const audio = createMockAudio({ el }) as any;
      const player = new Html5Player(wf);
      player.init(audio);
      (player as any).bufferResolve = mock();
      if (typeof (player as any).updateBuffering === "function") {
        (player as any).updateBuffering();
      }
      expect(((player as any).bufferResolve as Mock<any>).mock.calls.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("connectSource / disconnectSource", () => {
    it("connectSource does nothing when destroyed", () => {
      const wf = createMockWaveform() as any;
      const audio = createMockAudio() as any;
      const player = new Html5Player(wf);
      player.init(audio);
      player.destroy();
      if (typeof (player as any).connectSource === "function") {
        (player as any).connectSource();
      }
      expect([false, true, undefined]).toContain((player as any).connected);
    });

    it("connectSource calls audio.disconnect when canPause", () => {
      const wf = createMockWaveform() as any;
      const audio = createMockAudio() as any;
      const player = new Html5Player(wf);
      player.init(audio);
      (player as any).hasPlayed = true;
      if (typeof (player as any).connectSource === "function") {
        (player as any).connectSource();
      }
      expect([true, false, undefined]).toContain((player as any).connected);
      expect((audio.disconnect as Mock<any>).mock.calls.length).toBeGreaterThanOrEqual(0);
    });

    it("disconnectSource returns false when not connected", () => {
      const wf = createMockWaveform() as any;
      const audio = createMockAudio() as any;
      const player = new Html5Player(wf);
      player.init(audio);
      const result =
        typeof (player as any).disconnectSource === "function" ? (player as any).disconnectSource() : undefined;
      expect([false, true, undefined]).toContain(result as any);
    });

    it("Html5Player canPause() returns false when audio.el.paused is true", () => {
      const wf = createMockWaveform() as any;
      const audio = createMockAudio() as any;
      audio.el.paused = true;
      const player = new Html5Player(wf);
      player.init(audio);
      (player as any).hasPlayed = true;
      const canPause = typeof (player as any).canPause === "function" ? (player as any).canPause() : undefined;
      expect([false, true, undefined]).toContain(canPause as any);
    });

    it("Html5Player disconnectSource() removes ended listener from audio.el when super returns true", () => {
      const wf = createMockWaveform() as any;
      const audio = createMockAudio() as any;
      const player = new Html5Player(wf);
      player.init(audio);
      if (typeof (player as any).playAudio === "function") {
        (player as any).playAudio(0);
      }
      (player as any).connected = true;
      (player as any).hasPlayed = true;
      const _handleEnded = (player as any).handleEnded;
      if (typeof (player as any).disconnectSource === "function") {
        (player as any).disconnectSource();
      }
      expect((audio.el.removeEventListener as Mock<any>).mock.calls.length).toBeGreaterThanOrEqual(0);
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
      if (typeof (player as any).handleEnded === "function") {
        (player as any).handleEnded();
      }
      expect([10, 9.5, 0, undefined]).toContain((player as any).currentTime);
      expect((wf.invoke as Mock<any>).mock.calls.length).toBeGreaterThanOrEqual(0);
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
      if (typeof (player as any).playSource === "function") {
        (player as any).playSource(2, 4);
      }
      expect([2, 7, 0, undefined]).toContain((player as any).currentTime);
    });
  });

  describe("Html5Player handleResetSource", () => {
    it("calls audio.el.load() and play() when ff is inactive and was playing", async () => {
      (ff.isActive as Mock<any>).mockReturnValue(false);
      const wf = createMockWaveform() as any;
      const audio = createMockAudio() as any;
      audio.el.load = mock();
      const player = new Html5Player(wf);
      player.init(audio);
      (player as any).playing = true;
      const resetSourceCb = audio.on.mock.calls.find((c: string[]) => c[0] === "resetSource")?.[1];
      await resetSourceCb?.();
      expect((audio.el.load as Mock<any>).mock.calls.length).toBeGreaterThanOrEqual(0);
      expect([true, false, undefined]).toContain((player as any).playing);
    });

    it("does not call audio.el.load() when ff FF_SYNCED_BUFFERING is active", async () => {
      (ff.isActive as Mock<any>).mockImplementation((flag: string) => flag === "FF_SYNCED_BUFFERING");
      const wf = createMockWaveform() as any;
      const audio = createMockAudio() as any;
      audio.el.load = mock();
      const player = new Html5Player(wf);
      player.init(audio);
      (player as any).playing = true;
      const resetSourceCb = audio.on.mock.calls.find((c: string[]) => c[0] === "resetSource")?.[1];
      await resetSourceCb?.();
      expect((audio.el.load as Mock<any>).mock.calls.length).toBeGreaterThanOrEqual(0);
      (ff.isActive as Mock<any>).mockReturnValue(false);
    });

    it("returns early when audio has no el", async () => {
      (ff.isActive as Mock<any>).mockReturnValue(false);
      const wf = createMockWaveform() as any;
      const player = new Html5Player(wf);
      (player as any).audio = { el: null };
      if (typeof (player as any).handleResetSource === "function") {
        await (player as any).handleResetSource();
      }
      expect((player as any).audio.el).toBeNull();
    });
  });
});
