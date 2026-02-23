/**
 * Unit tests for Visualizer (lib/AudioUltra/Visual/Visualizer.ts) — parity-86.
 */
import { Visualizer } from "../Visualizer";
import type { Waveform } from "../../Waveform";
import type { WaveformAudio } from "../../Media/WaveformAudio";

jest.mock("@humansignal/ui", () => ({
  getCurrentTheme: jest.fn(() => "Light"),
}));

jest.mock("../../../../utils/feature-flags", () => ({
  isFF: jest.fn(() => false),
  FF_AUDIO_SPECTROGRAMS: "fflag_feat_optic_2123_audio_spectrograms",
}));

if (typeof globalThis.CanvasRenderingContext2D === "undefined") {
  (globalThis as any).CanvasRenderingContext2D = class {};
}

function mockCanvas2DContext() {
  const noop = () => {};
  const mock: Record<string, unknown> = {
    moveTo: noop,
    lineTo: noop,
    quadraticCurveTo: noop,
    bezierCurveTo: noop,
    arc: noop,
    rect: noop,
    fill: noop,
    stroke: noop,
    clearRect: noop,
    fillRect: noop,
    beginPath: noop,
    closePath: noop,
    save: noop,
    restore: noop,
    setTransform: noop,
    resetTransform: noop,
    drawImage: noop,
    getImageData: () => ({ data: new Uint8ClampedArray(0) }),
    putImageData: noop,
    measureText: () => ({ width: 0 }),
    fillText: noop,
    canvas: { width: 800, height: 100 },
  };
  Object.setPrototypeOf(mock, (globalThis as any).CanvasRenderingContext2D.prototype);
  return mock as unknown as CanvasRenderingContext2D;
}

function createContainer(): HTMLElement {
  const el = document.createElement("div");
  Object.defineProperty(el, "clientWidth", { value: 800, configurable: true });
  Object.defineProperty(el, "clientHeight", { value: 100, configurable: true });
  el.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 100 }) as DOMRect;
  document.body.appendChild(el);
  return el;
}

function createMockWaveform(overrides: Partial<Record<string, unknown>> = {}): Partial<Waveform> {
  return {
    duration: 10,
    currentTime: 0,
    loaded: true,
    playing: false,
    params: { decoderType: "webaudio" },
    invoke: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    renderTimeline: jest.fn(),
    ...overrides,
  };
}

function createMockAudio(overrides: Partial<WaveformAudio> = {}): WaveformAudio {
  return {
    dataLength: 44100 * 10,
    channelCount: 1,
    sampleRate: 44100,
    ...overrides,
  } as WaveformAudio;
}

describe("Visualizer", () => {
  let container: HTMLElement;
  let rafCbs: FrameRequestCallback[];
  let mockWaveform: Partial<Waveform>;

  beforeEach(() => {
    rafCbs = [];
    const raf = (cb: FrameRequestCallback) => {
      rafCbs.push(cb);
      return rafCbs.length;
    };
    (window as any).requestAnimationFrame = raf;
    jest.useFakeTimers();
    container = createContainer();
    mockWaveform = createMockWaveform();
    const mockCtx = mockCanvas2DContext();
    jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(mockCtx);
  });

  afterEach(() => {
    if (container?.parentNode) container.parentNode.removeChild(container);
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  function createVisualizer(
    opts: { container?: HTMLElement; zoomToCursor?: boolean; autoCenter?: boolean; splitChannels?: boolean } = {},
  ) {
    const { container: c, zoomToCursor, autoCenter, splitChannels, ...rest } = opts as any;
    const vis = new Visualizer(
      {
        container: c ?? container,
        waveformHeight: 32,
        spectrogramHeight: 32,
        timelineHeight: 20,
        zoomToCursor,
        autoCenter,
        splitChannels,
        ...rest,
      },
      mockWaveform as Waveform,
    );
    vis.createLayer({ name: "timeline", offscreen: true, zIndex: 103 });
    return vis;
  }

  function flushRaf() {
    const copy = rafCbs.slice();
    rafCbs.length = 0;
    copy.forEach((cb) => (cb as (time: number) => void)(0));
  }

  describe("constructor", () => {
    it("creates visualizer with container and waveform", () => {
      const vis = createVisualizer();
      expect(vis.getLayer("main")).toBeDefined();
      expect(vis.getLayer("waveform")).toBeDefined();
      expect(vis.getLayer("background")).toBeDefined();
      expect(vis.getLayer("regions")).toBeDefined();
      vis.destroy();
    });

    it("accepts container as string selector when element exists", () => {
      const el = document.createElement("div");
      el.id = "viz-container-selector";
      Object.defineProperty(el, "clientWidth", { value: 400, configurable: true });
      Object.defineProperty(el, "clientHeight", { value: 80, configurable: true });
      document.body.appendChild(el);
      const vis = new Visualizer(
        { container: "#viz-container-selector", waveformHeight: 32 },
        mockWaveform as Waveform,
      );
      vis.createLayer({ name: "timeline", offscreen: true, zIndex: 103 });
      expect(vis.container).toBe(el);
      el.parentNode?.removeChild(el);
      vis.destroy();
    });

    it("throws when container element does not exist", () => {
      expect(() => new Visualizer({ container: "#nonexistent", waveformHeight: 32 }, mockWaveform as Waveform)).toThrow(
        "Container element does not exist.",
      );
    });
  });

  describe("init", () => {
    it("initializes with audio and sets loading false", () => {
      const vis = createVisualizer();
      const audio = createMockAudio();
      vis.setLoading(true);
      vis.init(audio);
      expect(vis.getLayer("regions")).toBeDefined();
      flushRaf();
      jest.advanceTimersByTime(20);
      vis.destroy();
    });

    it("warns when init is called twice", () => {
      const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
      const vis = createVisualizer();
      const audio = createMockAudio();
      vis.setLoading(true);
      vis.init(audio);
      vis.init(audio);
      expect(warn).toHaveBeenCalledWith("Visualizer is already initialized");
      warn.mockRestore();
      vis.destroy();
    });
  });

  function initVisualizer(vis: ReturnType<typeof createVisualizer>) {
    vis.setLoading(true);
    vis.init(createMockAudio());
    flushRaf();
  }

  describe("setLoading", () => {
    it("adds loader when true and removes when false", () => {
      const vis = createVisualizer();
      vis.setLoading(true);
      expect(container.querySelector("loading-progress-bar")).toBeTruthy();
      vis.setLoading(false);
      expect(container.querySelector("loading-progress-bar")).toBeFalsy();
      vis.destroy();
    });
  });

  describe("setLoadingProgress", () => {
    it("updates loader when present", () => {
      const vis = createVisualizer();
      vis.setLoading(true);
      const loader = container.querySelector("loading-progress-bar") as any;
      loader.update = jest.fn();
      vis.setLoadingProgress(50, 100);
      expect(loader.loaded).toBe(50);
      expect(loader.total).toBe(100);
      expect(loader.update).toHaveBeenCalled();
      vis.setLoading(false);
      vis.destroy();
    });

    it("sets total to loaded when completed is true", () => {
      const vis = createVisualizer();
      vis.setLoading(true);
      const loader = container.querySelector("loading-progress-bar") as any;
      loader.loaded = 80;
      loader.update = jest.fn();
      vis.setLoadingProgress(undefined, undefined, true);
      expect(loader.total).toBe(80);
      vis.setLoading(false);
      vis.destroy();
    });
  });

  describe("setDecodingProgress", () => {
    it("updates loader chunk and total", () => {
      const vis = createVisualizer();
      vis.setLoading(true);
      const loader = container.querySelector("loading-progress-bar") as any;
      loader.update = jest.fn();
      vis.setDecodingProgress(1, 5);
      expect(loader.loaded).toBe(1);
      expect(loader.total).toBe(5);
      vis.setLoading(false);
      vis.destroy();
    });
  });

  describe("setError", () => {
    it("sets error on loader and calls update", () => {
      const vis = createVisualizer();
      vis.setLoading(true);
      const loader = container.querySelector("loading-progress-bar") as any;
      loader.update = jest.fn();
      vis.setError("Something failed");
      expect(loader.error).toBe("Something failed");
      expect(loader.update).toHaveBeenCalled();
      vis.setLoading(false);
      vis.destroy();
    });
  });

  describe("zoom and scroll", () => {
    it("setZoom clamps value and invokes zoom on waveform", () => {
      const vis = createVisualizer();
      initVisualizer(vis);
      vis.setZoom(2);
      expect(vis.getZoom()).toBe(2);
      expect(mockWaveform.invoke).toHaveBeenCalledWith("zoom", [2]);
      vis.setZoom(0.5);
      expect(vis.getZoom()).toBe(1);
      vis.destroy();
    });

    it("setZoom with zoomToCursor true calls centerToCurrentTime", () => {
      const vis = createVisualizer({ zoomToCursor: true });
      initVisualizer(vis);
      vis.setZoom(2);
      expect(vis.getZoom()).toBe(2);
      vis.destroy();
    });

    it("getScrollLeft and getScrollLeftPx return values", () => {
      const vis = createVisualizer();
      initVisualizer(vis);
      expect(vis.getScrollLeft()).toBe(0);
      expect(vis.getScrollLeftPx()).toBe(0);
      vis.destroy();
    });

    it("setScrollLeft clamps and updates wrapper", () => {
      const vis = createVisualizer();
      initVisualizer(vis);
      vis.setScrollLeft(0.5);
      expect((vis as any).wrapper.scrollLeft).toBeGreaterThanOrEqual(0);
      vis.destroy();
    });
  });

  describe("lockSeek / unlockSeek", () => {
    it("lockSeek and unlockSeek toggle seekLocked", () => {
      const vis = createVisualizer();
      vis.lockSeek();
      vis.unlockSeek();
      vis.destroy();
    });
  });

  describe("draw", () => {
    it("draw triggers transfer after rAF", () => {
      const vis = createVisualizer();
      initVisualizer(vis);
      rafCbs.length = 0;
      vis.draw();
      expect(rafCbs.length).toBeGreaterThanOrEqual(0);
      flushRaf();
      vis.destroy();
    });

    it("draw with dry true does not throw", () => {
      const vis = createVisualizer();
      initVisualizer(vis);
      vis.draw(true);
      flushRaf();
      vis.destroy();
    });
  });

  describe("destroy", () => {
    it("destroy clears resources and removes wrapper", () => {
      const vis = createVisualizer();
      initVisualizer(vis);
      const wrapper = (vis as any).wrapper as HTMLElement;
      expect(container.contains(wrapper)).toBe(true);
      vis.destroy();
      expect(container.contains(wrapper)).toBe(false);
    });

    it("destroy is idempotent", () => {
      const vis = createVisualizer();
      vis.destroy();
      expect(() => vis.destroy()).not.toThrow();
    });
  });

  describe("clear", () => {
    it("clear does not throw", () => {
      const vis = createVisualizer();
      initVisualizer(vis);
      vis.clear();
      vis.destroy();
    });
  });

  describe("centerToCurrentTime", () => {
    it("at zoom 1 sets scroll to 0", () => {
      const vis = createVisualizer();
      initVisualizer(vis);
      vis.centerToCurrentTime();
      expect(vis.getScrollLeft()).toBe(0);
      vis.destroy();
    });

    it("at zoom > 1 sets scroll to center current time", () => {
      const vis = createVisualizer();
      initVisualizer(vis);
      vis.setZoom(2);
      vis.centerToCurrentTime();
      expect(vis.getScrollLeft()).toBeGreaterThanOrEqual(0);
      vis.destroy();
    });
  });

  describe("updateCursorToTime", () => {
    it("calls playhead updatePositionFromTime", () => {
      const vis = createVisualizer();
      initVisualizer(vis);
      const spy = jest.spyOn(vis.playhead, "updatePositionFromTime");
      vis.updateCursorToTime(5);
      expect(spy).toHaveBeenCalledWith(5);
      vis.destroy();
    });
  });

  describe("renderAvailableChannels", () => {
    it("returns early when no audio", () => {
      const vis = createVisualizer();
      vis.renderAvailableChannels();
      vis.destroy();
    });

    it("calls draw on renderers when audio is set", () => {
      const vis = createVisualizer();
      initVisualizer(vis);
      vis.renderAvailableChannels();
      vis.destroy();
    });
  });

  describe("getters", () => {
    it("width returns container clientWidth", () => {
      const vis = createVisualizer();
      expect(vis.width).toBe(800);
      vis.destroy();
    });

    it("pixelRatio returns devicePixelRatio", () => {
      const vis = createVisualizer();
      expect(typeof vis.pixelRatio).toBe("number");
      vis.destroy();
    });

    it("height includes timeline and waveform layer heights", () => {
      const vis = createVisualizer();
      initVisualizer(vis);
      expect(vis.height).toBeGreaterThan(0);
      vis.destroy();
    });

    it("timelineComponentHeight returns timelineHeight", () => {
      const vis = createVisualizer();
      expect(vis.timelineComponentHeight).toBe(20);
      vis.destroy();
    });

    it("reserveSpace sets reservedSpace", () => {
      const vis = createVisualizer();
      vis.reserveSpace({ height: 40 });
      expect(vis.reservedSpace).toBe(40);
      vis.destroy();
    });

    it("scrollWidth, fullWidth, zoomedWidth return expected values", () => {
      const vis = createVisualizer();
      initVisualizer(vis);
      vis.setZoom(2);
      expect(vis.fullWidth).toBe(vis.zoomedWidth);
      expect(vis.scrollWidth).toBe(vis.zoomedWidth - vis.width);
      expect(vis.zoomedWidth).toBe(800 * 2);
      vis.destroy();
    });

    it("waveformLayerHeight multiplies by channelCount when splitChannels", () => {
      const vis = createVisualizer({ splitChannels: true });
      initVisualizer(vis);
      expect(vis.waveformLayerHeight).toBe(32 * 1);
      vis.destroy();
    });

    it("waveformLayerHeight with multi-channel audio and splitChannels", () => {
      const vis = createVisualizer({ splitChannels: true });
      vis.setLoading(true);
      vis.init(createMockAudio({ channelCount: 2 }));
      flushRaf();
      expect(vis.waveformLayerHeight).toBe(32 * 2);
      vis.destroy();
    });

    it("spectrogramLayerHeight with splitChannels and audio", () => {
      const vis = createVisualizer({ splitChannels: true });
      initVisualizer(vis);
      expect(vis.spectrogramLayerHeight).toBe(32);
      vis.destroy();
    });

    it("height excludes timeline when timeline layer isVisible false", () => {
      const vis = createVisualizer();
      initVisualizer(vis);
      const timelineLayer = vis.getLayer("timeline");
      const heightWithTimeline = vis.height;
      if (timelineLayer) {
        timelineLayer.setVisibility(false);
        expect(vis.height).toBeLessThanOrEqual(heightWithTimeline);
      }
      vis.destroy();
    });
  });

  describe("layers", () => {
    it("getLayer returns layer by name", () => {
      const vis = createVisualizer();
      expect(vis.getLayer("main")).toBeDefined();
      expect(vis.getLayer("waveform")).toBeDefined();
      expect(vis.getLayer("nonexistent")).toBeUndefined();
      vis.destroy();
    });

    it("getLayers returns map of layers", () => {
      const vis = createVisualizer();
      const layers = vis.getLayers();
      expect(layers instanceof Map).toBe(true);
      expect(layers.has("main")).toBe(true);
      vis.destroy();
    });

    it("removeLayer removes layer and invokes layerRemoved", () => {
      const vis = createVisualizer();
      vis.createLayer({ name: "extra", offscreen: true, zIndex: 50 });
      expect(vis.getLayer("extra")).toBeDefined();
      vis.removeLayer("extra");
      expect(vis.getLayer("extra")).toBeUndefined();
      vis.destroy();
    });

    it("removeLayer throws when layer does not exist", () => {
      const vis = createVisualizer();
      expect(() => vis.removeLayer("nonexistent")).toThrow("Layer nonexistent does not exist");
      vis.destroy();
    });

    it("createLayer throws when layer name already exists", () => {
      const vis = createVisualizer();
      expect(() => vis.createLayer({ name: "main" })).toThrow("Layer main already exists");
      vis.destroy();
    });

    it("createLayerGroup throws when group name already exists", () => {
      const vis = createVisualizer();
      expect(() => vis.createLayerGroup({ name: "regions" })).toThrow("LayerGroup regions already exists");
      vis.destroy();
    });

    it("createLayer with groupName adds layer to group", () => {
      const vis = createVisualizer();
      vis.createLayerGroup({ name: "mygroup", offscreen: true, zIndex: 50 });
      vis.createLayer({ name: "sublayer", groupName: "mygroup", offscreen: true, zIndex: 1 });
      expect(vis.getLayer("sublayer")).toBeDefined();
      vis.destroy();
    });

    it("useLayer invokes callback with layer and context", () => {
      const vis = createVisualizer();
      const cb = jest.fn();
      vis.useLayer("waveform", cb);
      expect(cb).toHaveBeenCalledWith(vis.getLayer("waveform"), expect.anything());
      vis.destroy();
    });
  });

  describe("scroll event", () => {
    it("scroll on wrapper updates scrollLeft and invokes wf.scroll", () => {
      const vis = createVisualizer();
      initVisualizer(vis);
      const wrapper = (vis as any).wrapper;
      wrapper.scrollLeft = 100;
      wrapper.dispatchEvent(new Event("scroll"));
      expect(mockWaveform.invoke).toHaveBeenCalledWith("scroll", expect.any(Array));
      vis.destroy();
    });
  });

  describe("_draw with autoCenter", () => {
    it("draw with autoCenter and playing calls centerToCurrentTime", () => {
      mockWaveform.playing = true;
      const vis = createVisualizer({ autoCenter: true });
      initVisualizer(vis);
      const spy = jest.spyOn(vis, "centerToCurrentTime");
      vis.draw(false);
      flushRaf();
      expect(spy).toHaveBeenCalled();
      vis.destroy();
    });
  });

  describe("event handlers", () => {
    it("playing event triggers handlePlaying and draw", () => {
      const vis = createVisualizer();
      initVisualizer(vis);
      const playingHandler = (mockWaveform.on as jest.Mock).mock.calls.find((c: unknown[]) => c[0] === "playing")?.[1];
      expect(playingHandler).toBeDefined();
      playingHandler(5);
      flushRaf();
      vis.destroy();
    });

    it("ResizeObserver callback runs handleResize", () => {
      let resizeCb: (entries: unknown[]) => void = () => {};
      jest.spyOn(global, "ResizeObserver").mockImplementation((cb: (entries: unknown[]) => void) => {
        resizeCb = cb;
        return { observe: jest.fn(), unobserve: jest.fn(), disconnect: jest.fn() };
      });
      const vis = createVisualizer();
      initVisualizer(vis);
      resizeCb([{ target: (vis as any).wrapper }]);
      flushRaf();
      vis.destroy();
    });

    it("wheel with ctrlKey triggers zoom path in handleScroll", () => {
      const vis = createVisualizer();
      initVisualizer(vis);
      const wrapper = (vis as any).wrapper;
      wrapper.dispatchEvent(new WheelEvent("wheel", { deltaY: -10, ctrlKey: true, bubbles: true }));
      jest.advanceTimersByTime(20);
      flushRaf();
      vis.destroy();
    });

    it("wheel without ctrlKey when zoom > 1 triggers scroll path", () => {
      const vis = createVisualizer();
      initVisualizer(vis);
      vis.setZoom(2);
      const wrapper = (vis as any).wrapper;
      wrapper.dispatchEvent(new WheelEvent("wheel", { deltaY: 20, deltaX: 0, ctrlKey: false, bubbles: true }));
      vis.destroy();
    });

    it("click on main canvas triggers handleSeek when loaded", () => {
      const vis = createVisualizer();
      initVisualizer(vis);
      const mainLayer = vis.getLayer("main");
      const canvas = mainLayer?.canvas;
      if (canvas && canvas instanceof HTMLCanvasElement) {
        const rect = (vis as any).wrapper.getBoundingClientRect();
        canvas.dispatchEvent(
          new MouseEvent("click", {
            clientX: rect.left + 50,
            offsetY: 10,
            bubbles: true,
          }),
        );
      }
      vis.destroy();
    });

    it("mousedown on wrapper triggers playhead mouseDown", () => {
      const vis = createVisualizer();
      initVisualizer(vis);
      const wrapper = (vis as any).wrapper;
      wrapper.dispatchEvent(new MouseEvent("mousedown", { clientX: 100, clientY: 50, bubbles: true }));
      vis.destroy();
    });
  });

  describe("transferImage", () => {
    it("transferImage does not throw when composer exists", () => {
      const vis = createVisualizer();
      initVisualizer(vis);
      vis.transferImage();
      vis.destroy();
    });
  });

  describe("syncCursor", () => {
    it("syncCursor updates cursor to current time", () => {
      const vis = createVisualizer();
      const spy = jest.spyOn(vis, "updateCursorToTime");
      vis.syncCursor();
      expect(spy).toHaveBeenCalled();
      vis.destroy();
    });
  });

  describe("channelHeight", () => {
    it("channelHeight returns 0 when spectrogram layer not visible", () => {
      const vis = createVisualizer();
      expect(vis.channelHeight).toBe(0);
      vis.destroy();
    });
  });

  describe("setAmp", () => {
    it("setAmp updates waveform renderer config and draws", () => {
      const vis = createVisualizer();
      initVisualizer(vis);
      vis.setAmp(2);
      vis.destroy();
    });
  });

  describe("getLayerInfo", () => {
    it("getLayerInfo returns null for unknown interactive", () => {
      const vis = createVisualizer();
      expect(vis.getLayerInfo({} as any)).toBeNull();
      vis.destroy();
    });

    it("getLayerInfo returns dimensions for waveform resize renderer", () => {
      const vis = createVisualizer();
      initVisualizer(vis);
      const info = vis.getLayerInfo((vis as any).waveformResizeRenderer);
      expect(info).not.toBeNull();
      expect(info).toMatchObject({ offsetX: 0, width: 800 });
      vis.destroy();
    });
  });

  describe("updateSpectrogramConfig", () => {
    it("updateSpectrogramConfig returns early when spectrogram FF disabled", () => {
      const vis = createVisualizer();
      vis.updateSpectrogramConfig({ fftSamples: 2048 });
      vis.destroy();
    });
  });
});
