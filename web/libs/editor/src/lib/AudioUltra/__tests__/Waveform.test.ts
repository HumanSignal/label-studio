/**
 * Unit tests for Waveform (lib/AudioUltra/Waveform.ts)
 */
import { Waveform } from "../Waveform";

const mockMediaLoad = jest.fn();
const mockDestroy = jest.fn();
const mockRender = jest.fn();
const mockDraw = jest.fn();
const mockSetLoading = jest.fn();
const mockSetScrollLeft = jest.fn();
const mockGetScrollLeft = jest.fn(() => 0);
const mockGetScrollLeftPx = jest.fn(() => 0);
const mockGetZoom = jest.fn(() => 1);
const mockSetZoom = jest.fn();
const mockOn = jest.fn();
const mockShow = jest.fn();
const mockHide = jest.fn();
const mockSet = jest.fn();
const mockAddRegions = jest.fn();
const mockAddRegion = jest.fn();
const mockUpdateRegion = jest.fn();
const mockUpdateLabelVisibility = jest.fn();
const mockRemoveRegion = jest.fn();
const mockGetLayers = jest.fn(() => new Map());
const mockGetLayer = jest.fn(() => null);
const mockSeek = jest.fn();
const mockSeekSilent = jest.fn();
const mockPlay = jest.fn();
const mockPause = jest.fn();
const mockStop = jest.fn();
const mockInit = jest.fn();
const mockUpdateCursorToTime = jest.fn();
const mockTransferImage = jest.fn();
const mockSetLoadingProgress = jest.fn();
const mockSetDecodingProgress = jest.fn();
const mockSetError = jest.fn();
const mockSetAmp = jest.fn();
const mockUpdateSpectrogramConfig = jest.fn();

jest.mock("../Media/MediaLoader", () => ({
  MediaLoader: jest.fn().mockImplementation(() => ({
    load: mockMediaLoad,
    decoderPromise: undefined,
    duration: 10,
    sampleRate: 44100,
    destroy: mockDestroy,
  })),
}));

jest.mock("../Tooltip/Tooltip", () => ({
  Tooltip: jest.fn().mockImplementation(() => ({
    show: mockShow,
    hide: mockHide,
    destroy: mockDestroy,
  })),
}));

jest.mock("../Visual/Visualizer", () => ({
  Visualizer: jest.fn().mockImplementation(() => ({
    setLoading: mockSetLoading,
    draw: mockDraw,
    render: mockRender,
    width: 800,
    height: 100,
    zoomedWidth: 800,
    getScrollLeft: mockGetScrollLeft,
    getScrollLeftPx: mockGetScrollLeftPx,
    setScrollLeft: mockSetScrollLeft,
    getZoom: mockGetZoom,
    setZoom: mockSetZoom,
    getLayers: mockGetLayers,
    getLayer: mockGetLayer,
    on: mockOn,
    destroy: mockDestroy,
    container: { contains: jest.fn(() => false) },
    setLoadingProgress: mockSetLoadingProgress,
    setDecodingProgress: mockSetDecodingProgress,
    setError: mockSetError,
    setAmp: mockSetAmp,
    updateSpectrogramConfig: mockUpdateSpectrogramConfig,
    updateCursorToTime: mockUpdateCursorToTime,
    transferImage: mockTransferImage,
    init: jest.fn(),
  })),
}));

jest.mock("../Cursor/Cursor", () => ({
  Cursor: jest.fn().mockImplementation(() => ({
    on: mockOn,
    set: mockSet,
    show: mockShow,
    hide: mockHide,
    destroy: mockDestroy,
    inView: true,
    hasFocus: jest.fn(() => false),
  })),
}));

jest.mock("../Timeline/Timeline", () => ({
  Timeline: jest.fn().mockImplementation(() => ({
    render: mockRender,
    destroy: mockDestroy,
  })),
}));

jest.mock("../Regions/Regions", () => ({
  Regions: jest.fn().mockImplementation(() => ({
    addRegions: mockAddRegions,
    addRegion: mockAddRegion,
    updateRegion: mockUpdateRegion,
    updateLabelVisibility: mockUpdateLabelVisibility,
    removeRegion: mockRemoveRegion,
    destroy: mockDestroy,
  })),
}));

jest.mock("../Controls/Html5Player", () => ({
  Html5Player: jest.fn().mockImplementation(() => ({
    playing: false,
    buffering: false,
    volume: 1,
    muted: false,
    rate: 1,
    currentTime: 0,
    seek: mockSeek,
    seekSilent: mockSeekSilent,
    play: mockPlay,
    pause: mockPause,
    stop: mockStop,
    init: mockInit,
    destroy: mockDestroy,
  })),
}));

jest.mock("../Controls/WebAudioPlayer", () => ({
  WebAudioPlayer: jest.fn().mockImplementation(() => ({
    playing: false,
    buffering: false,
    volume: 1,
    muted: false,
    rate: 1,
    currentTime: 0,
    seek: mockSeek,
    seekSilent: mockSeekSilent,
    play: mockPlay,
    pause: mockPause,
    stop: mockStop,
    init: mockInit,
    destroy: mockDestroy,
  })),
}));

describe("Waveform", () => {
  const container = document.createElement("div");
  const baseParams = { src: "https://example.com/audio.mp3", container };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetZoom.mockReturnValue(1);
    mockGetScrollLeft.mockReturnValue(0);
    mockGetScrollLeftPx.mockReturnValue(0);
  });

  describe("constructor", () => {
    it("sets default timeline placement when not provided", () => {
      const wf = new Waveform(baseParams);
      expect(wf.params.timeline).toEqual({ placement: "top" });
      wf.destroy();
    });

    it("defaults decoderType to webaudio", () => {
      const wf = new Waveform(baseParams);
      expect(wf.params.decoderType).toBe("webaudio");
      wf.destroy();
    });

    it("uses html5 player when decoderType is webaudio and playerType not set", () => {
      const { Html5Player } = require("../Controls/Html5Player");
      new Waveform(baseParams);
      expect(Html5Player).toHaveBeenCalled();
    });

    it("forces html5 player when decoderType is ffmpeg", () => {
      const { Html5Player } = require("../Controls/Html5Player");
      const { WebAudioPlayer } = require("../Controls/WebAudioPlayer");
      new Waveform({ ...baseParams, decoderType: "ffmpeg" });
      expect(Html5Player).toHaveBeenCalled();
      expect(WebAudioPlayer).not.toHaveBeenCalled();
    });

    it("uses webaudio player when playerType is webaudio", () => {
      const { WebAudioPlayer } = require("../Controls/WebAudioPlayer");
      new Waveform({ ...baseParams, playerType: "webaudio" });
      expect(WebAudioPlayer).toHaveBeenCalled();
    });

    it("calls loadingState on init", () => {
      new Waveform(baseParams);
      expect(mockSetLoading).toHaveBeenCalledWith(true);
      expect(mockRender).toHaveBeenCalled();
      expect(mockDraw).toHaveBeenCalledWith(true);
    });
  });

  describe("renderTimeline", () => {
    it("delegates to timeline.render", () => {
      const wf = new Waveform(baseParams);
      mockRender.mockClear();
      wf.renderTimeline();
      expect(mockRender).toHaveBeenCalled();
      wf.destroy();
    });
  });

  describe("load", () => {
    it("returns early when destroyed", async () => {
      const wf = new Waveform(baseParams);
      wf.destroy();
      mockMediaLoad.mockResolvedValue(null);
      await wf.load();
      expect(mockMediaLoad).not.toHaveBeenCalled();
    });

    it("warns when decoderType is none and splitChannels is set", async () => {
      const warnSpy = jest.spyOn(console, "warn").mockImplementation();
      mockMediaLoad.mockResolvedValue({ duration: 10 });
      const wf = new Waveform({
        ...baseParams,
        decoderType: "none",
        splitChannels: true,
      });
      await wf.load();
      expect(warnSpy).toHaveBeenCalledWith(
        'splitChannels is not available when decoder="none" (requires decoded audio data)',
      );
      warnSpy.mockRestore();
      wf.destroy();
    });

    it("warns when decoderType is none and playerType is webaudio", async () => {
      const warnSpy = jest.spyOn(console, "warn").mockImplementation();
      mockMediaLoad.mockResolvedValue({ duration: 10 });
      const wf = new Waveform({
        ...baseParams,
        decoderType: "none",
        playerType: "webaudio",
      });
      await wf.load();
      expect(warnSpy).toHaveBeenCalledWith(
        'playerType="webaudio" is not available when decoder="none", forcing HTML5 player',
      );
      warnSpy.mockRestore();
      wf.destroy();
    });

    it("calls media.load with muted, volume, rate", async () => {
      mockMediaLoad.mockResolvedValue({ duration: 10 });
      const wf = new Waveform({ ...baseParams, muted: true, volume: 0.5, rate: 1.5 });
      await wf.load();
      expect(mockMediaLoad).toHaveBeenCalledWith({
        muted: true,
        volume: 0.5,
        rate: 1.5,
      });
      wf.destroy();
    });

    it("invokes load event when audio is loaded", async () => {
      const audio = { duration: 10 };
      mockMediaLoad.mockResolvedValue(audio);
      const wf = new Waveform(baseParams);
      const loadSpy = jest.fn();
      wf.on("load", loadSpy);
      await wf.load();
      expect(mockInit).toHaveBeenCalledWith(audio);
      expect(loadSpy).toHaveBeenCalled();
      expect(wf.loaded).toBe(true);
      wf.destroy();
    });
  });

  describe("syncCursor", () => {
    it("updates visualizer cursor to current time and transfers image", () => {
      const wf = new Waveform(baseParams);
      (wf as any).player.currentTime = 5;
      wf.syncCursor();
      expect(mockUpdateCursorToTime).toHaveBeenCalledWith(5);
      expect(mockTransferImage).toHaveBeenCalled();
      wf.destroy();
    });
  });

  describe("seek", () => {
    it("delegates to player.seek", () => {
      const wf = new Waveform(baseParams);
      wf.seek(3);
      expect(mockSeek).toHaveBeenCalledWith(3);
      wf.destroy();
    });
  });

  describe("seekForward / seekBackward", () => {
    it("seekForward uses seekStep or 1", () => {
      const wf = new Waveform(baseParams);
      (wf as any).player.currentTime = 0;
      wf.seekForward(2);
      expect(mockSeek).toHaveBeenCalledWith(2);
      wf.seekForward();
      expect(mockSeek).toHaveBeenCalledTimes(2);
      expect(mockSeek).toHaveBeenLastCalledWith(0 + (wf.params.seekStep ?? 1));
      wf.destroy();
    });

    it("seekBackward uses seekStep or 1", () => {
      const wf = new Waveform(baseParams);
      (wf as any).player.currentTime = 10;
      wf.seekBackward(3);
      expect(mockSeek).toHaveBeenCalledWith(7);
      wf.destroy();
    });
  });

  describe("scrollToRegion", () => {
    it("returns early when zoom is 1", () => {
      const wf = new Waveform(baseParams);
      mockGetZoom.mockReturnValue(1);
      wf.scrollToRegion(5);
      expect(mockSetScrollLeft).not.toHaveBeenCalled();
      wf.destroy();
    });

    it("sets scroll and invokes scroll when zoom > 1", () => {
      const wf = new Waveform(baseParams);
      mockGetZoom.mockReturnValue(2);
      (wf as any).media.duration = 10;
      const scrollSpy = jest.fn();
      wf.on("scroll", scrollSpy);
      wf.scrollToRegion(5);
      expect(mockSetScrollLeft).toHaveBeenCalled();
      expect(scrollSpy).toHaveBeenCalled();
      wf.destroy();
    });
  });

  describe("play / pause / togglePlay", () => {
    it("play delegates to player.play", () => {
      const wf = new Waveform(baseParams);
      wf.play(0, 10);
      expect(mockPlay).toHaveBeenCalledWith(0, 10);
      wf.destroy();
    });

    it("pause delegates to player.pause", () => {
      const wf = new Waveform(baseParams);
      wf.pause();
      expect(mockPause).toHaveBeenCalled();
      wf.destroy();
    });

    it("togglePlay pauses when playing", () => {
      const wf = new Waveform(baseParams);
      (wf as any).player.playing = true;
      wf.togglePlay();
      expect(mockPause).toHaveBeenCalled();
      wf.destroy();
    });

    it("togglePlay plays when not playing", () => {
      const wf = new Waveform(baseParams);
      (wf as any).player.playing = false;
      wf.togglePlay();
      expect(mockPlay).toHaveBeenCalled();
      wf.destroy();
    });
  });

  describe("setLoadingProgress / setDecodingProgress / setError", () => {
    it("setLoadingProgress delegates to visualizer", () => {
      const wf = new Waveform(baseParams);
      wf.setLoadingProgress(50, 100, true);
      expect(mockSetLoadingProgress).toHaveBeenCalledWith(50, 100, true);
      wf.destroy();
    });

    it("setDecodingProgress delegates to visualizer", () => {
      const wf = new Waveform(baseParams);
      wf.setDecodingProgress(1, 5);
      expect(mockSetDecodingProgress).toHaveBeenCalledWith(1, 5);
      wf.destroy();
    });

    it("setError invokes error and sets visualizer error", () => {
      const wf = new Waveform(baseParams);
      const err = new Error("custom");
      const errorSpy = jest.fn();
      wf.on("error", errorSpy);
      wf.setError("msg", err);
      expect(errorSpy).toHaveBeenCalledWith(err);
      expect(mockSetError).toHaveBeenCalledWith("msg");
      wf.destroy();
    });
  });

  describe("stop", () => {
    it("delegates to player.stop", () => {
      const wf = new Waveform(baseParams);
      wf.stop();
      expect(mockStop).toHaveBeenCalled();
      wf.destroy();
    });
  });

  describe("destroy", () => {
    it("destroys regions, media, player, visualizer, cursor, tooltip", () => {
      const wf = new Waveform(baseParams);
      wf.destroy();
      expect(mockDestroy).toHaveBeenCalled();
    });

    it("is idempotent", () => {
      const wf = new Waveform(baseParams);
      wf.destroy();
      mockDestroy.mockClear();
      wf.destroy();
      expect(mockDestroy).not.toHaveBeenCalled();
    });
  });

  describe("region methods", () => {
    it("addRegions delegates to regions.addRegions", () => {
      const wf = new Waveform(baseParams);
      const regions = [{ start: 0, end: 1 }];
      wf.addRegions(regions as any, false);
      expect(mockAddRegions).toHaveBeenCalledWith(regions, false);
      wf.destroy();
    });

    it("addRegion delegates to regions.addRegion", () => {
      const wf = new Waveform(baseParams);
      const options = { start: 0, end: 1 };
      wf.addRegion(options as any, true);
      expect(mockAddRegion).toHaveBeenCalledWith(options, true);
      wf.destroy();
    });

    it("updateRegion delegates to regions.updateRegion", () => {
      const wf = new Waveform(baseParams);
      const options = { id: "r1", start: 0, end: 2 };
      wf.updateRegion(options as any, true);
      expect(mockUpdateRegion).toHaveBeenCalledWith(options, true);
      wf.destroy();
    });

    it("updateLabelVisibility delegates to regions", () => {
      const wf = new Waveform(baseParams);
      wf.updateLabelVisibility(false);
      expect(mockUpdateLabelVisibility).toHaveBeenCalledWith(false);
      wf.destroy();
    });

    it("removeRegion delegates to regions.removeRegion", () => {
      const wf = new Waveform(baseParams);
      wf.removeRegion("r1", true);
      expect(mockRemoveRegion).toHaveBeenCalledWith("r1", true);
      wf.destroy();
    });
  });

  describe("getLayers / getLayer", () => {
    it("getLayers returns visualizer.getLayers()", () => {
      const wf = new Waveform(baseParams);
      const layers = new Map();
      mockGetLayers.mockReturnValue(layers);
      expect(wf.getLayers()).toBe(layers);
      wf.destroy();
    });

    it("getLayer returns visualizer.getLayer(name)", () => {
      const wf = new Waveform(baseParams);
      const layer = {};
      mockGetLayer.mockReturnValue(layer);
      expect(wf.getLayer("timeline")).toBe(layer);
      expect(mockGetLayer).toHaveBeenCalledWith("timeline");
      wf.destroy();
    });
  });

  describe("playing / buffering", () => {
    it("playing returns player.playing", () => {
      const wf = new Waveform(baseParams);
      (wf as any).player.playing = true;
      expect(wf.playing).toBe(true);
      wf.destroy();
    });

    it("buffering get/set delegates to player", () => {
      const wf = new Waveform(baseParams);
      wf.buffering = true;
      expect((wf as any).player.buffering).toBe(true);
      expect(wf.buffering).toBe(true);
      wf.destroy();
    });
  });

  describe("zoom", () => {
    it("get/set delegates to visualizer", () => {
      const wf = new Waveform(baseParams);
      mockGetZoom.mockReturnValue(2);
      expect(wf.zoom).toBe(2);
      wf.zoom = 3;
      expect(mockSetZoom).toHaveBeenCalledWith(3);
      wf.destroy();
    });
  });

  describe("volume / muted", () => {
    it("volume get/set delegates to player", () => {
      const wf = new Waveform(baseParams);
      (wf as any).player.volume = 0.5;
      expect(wf.volume).toBe(0.5);
      wf.volume = 0.8;
      expect((wf as any).player.volume).toBe(0.8);
      wf.destroy();
    });

    it("muted get/set delegates to player", () => {
      const wf = new Waveform(baseParams);
      (wf as any).player.muted = true;
      expect(wf.muted).toBe(true);
      wf.muted = false;
      expect((wf as any).player.muted).toBe(false);
      wf.destroy();
    });
  });

  describe("scroll", () => {
    it("get returns derived scroll from duration, visualizer, zoom", () => {
      const wf = new Waveform(baseParams);
      (wf as any).media.duration = 10;
      mockGetScrollLeft.mockReturnValue(0.5);
      mockGetZoom.mockReturnValue(1);
      expect(wf.scroll).toBe(5 * 1000);
      wf.destroy();
    });

    it("set updates visualizer scroll and invokes scroll", () => {
      const wf = new Waveform(baseParams);
      (wf as any).media.duration = 10;
      const scrollSpy = jest.fn();
      wf.on("scroll", scrollSpy);
      wf.scroll = 5000;
      expect(mockSetScrollLeft).toHaveBeenCalled();
      expect(scrollSpy).toHaveBeenCalled();
      wf.destroy();
    });
  });

  describe("rate", () => {
    it("get/set delegates to player", () => {
      const wf = new Waveform(baseParams);
      (wf as any).player.rate = 1.5;
      expect(wf.rate).toBe(1.5);
      wf.rate = 2;
      expect((wf as any).player.rate).toBe(2);
      wf.destroy();
    });
  });

  describe("currentTime / setCurrentTime", () => {
    it("currentTime returns player.currentTime", () => {
      const wf = new Waveform(baseParams);
      (wf as any).player.currentTime = 7;
      expect(wf.currentTime).toBe(7);
      wf.destroy();
    });

    it("set currentTime calls player.seek when notify true", () => {
      const wf = new Waveform(baseParams);
      wf.currentTime = 5;
      expect(mockSeek).toHaveBeenCalledWith(5);
      wf.destroy();
    });

    it("setCurrentTime with notify true calls player.seek", () => {
      const wf = new Waveform(baseParams);
      wf.setCurrentTime(3, true);
      expect(mockSeek).toHaveBeenCalledWith(3);
      wf.destroy();
    });

    it("setCurrentTime with notify false calls player.seekSilent", () => {
      const wf = new Waveform(baseParams);
      wf.setCurrentTime(3, false);
      expect(mockSeekSilent).toHaveBeenCalledWith(3);
      wf.destroy();
    });
  });

  describe("updateSpectrogramConfig", () => {
    it("delegates to visualizer.updateSpectrogramConfig", () => {
      const wf = new Waveform(baseParams);
      const config = { fftSamples: 2048 };
      wf.updateSpectrogramConfig(config);
      expect(mockUpdateSpectrogramConfig).toHaveBeenCalledWith(config);
      wf.destroy();
    });
  });

  describe("amp", () => {
    it("set delegates to visualizer.setAmp", () => {
      const wf = new Waveform(baseParams);
      wf.amp = 2;
      expect(mockSetAmp).toHaveBeenCalledWith(2);
      wf.destroy();
    });
  });

  describe("duration / sampleRate", () => {
    it("duration returns media.duration", () => {
      const wf = new Waveform(baseParams);
      (wf as any).media.duration = 20;
      expect(wf.duration).toBe(20);
      wf.destroy();
    });

    it("sampleRate returns media.sampleRate", () => {
      const wf = new Waveform(baseParams);
      (wf as any).media.sampleRate = 48000;
      expect(wf.sampleRate).toBe(48000);
      wf.destroy();
    });
  });
});
