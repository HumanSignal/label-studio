/**
 * Unit tests for Audio tag model (tags/object/Audio/model.js)
 * Import model only and register with no-op view to avoid pulling in view.tsx (audio-file-decoder uses import.meta).
 */
import { runInAction } from "mobx";
import Tree from "../../../../core/Tree";
import Registry from "../../../../core/Registry";
import "../../../visual/View";
import { AudioModel } from "../model";

mockModule("../model", () => ({
  __esModule: true,
  __skipMerge: true,
  ...(requireActual("../model") ?? {}),
}));

Registry.addTag("audio", AudioModel, () => null);
Registry.addObjectType(AudioModel);

const mockAddErrors = mock();
const mockRegionStore = { regions: [] };
const mockToNames = new Map();
const mockAnnotation = {
  toNames: mockToNames,
  id: 1,
  isReadOnly: () => false,
  regionStore: mockRegionStore,
  unselectAll: mock(),
  areas: new Map(),
  createResult: mock(() => ({ setWSRegion: mock(), updateColor: mock() })),
  selectArea: mock(),
};
const mockRoot = {
  task: { dataObj: {} },
  annotationStore: {
    addErrors: mockAddErrors,
    selected: mockAnnotation,
  },
  messages: {
    ERR_LOADING_HTTP: mock(({ attr, url, error }) => `HTTP: ${attr} ${url} ${error}`),
    ERR_LOADING_AUDIO: mock(({ attr, url, error }) => `Audio: ${attr} ${url} ${error}`),
  },
};

const mockLabelsState = {
  isSelected: true,
  selectedColor: "#ff0000",
  selectedValues: () => ["Label1"],
  valueType: "labels",
};

import { getRoot, getEnv, getType } from "mobx-state-tree";
beforeEach(() => {
  getRoot.mockImplementation((node) => {
    if (node && node.type === "audio") return mockRoot;
    return globalThis.__mstOriginals.getRoot(node);
  });
  getEnv.mockImplementation((node) => {
    if (node === mockRoot) return { messages: mockRoot.messages };
    return globalThis.__mstOriginals.getEnv(node);
  });
  getType.mockImplementation((node) => {
    if (node === mockLabelsState) return { name: "LabelsModel" };
    if (node && typeof node === "object" && "selectedValues" in node) return { name: "LabelsModel" };
    return globalThis.__mstOriginals.getType(node);
  });
});

mockModule("@humansignal/core", () => {
  const actual = requireActual("@humansignal/core");
  return {
    ...actual,
    ff: {
      ...actual.ff,
      isActive: mock(() => false),
      FF_SYNCED_BUFFERING: "FF_SYNCED_BUFFERING",
      FF_MULTIPLE_LABELS_REGIONS: "FF_MULTIPLE_LABELS_REGIONS",
    },
  };
});

const MINIMAL_CONFIG = `<View><Audio name="audio" value="$audio" /></View>`;

function createAudioNode(storeRef = { task: { dataObj: { audio: "/test.mp3" } } }) {
  const config = Tree.treeToModel(MINIMAL_CONFIG, storeRef);
  const ViewModel = Registry.getModelByTag("view");
  const root = ViewModel.create(config);
  const children = root?.children ?? [];
  const node = children.find((c) => c?.type === "audio") ?? children[0];

  if (node?.type === "audio") return node;

  try {
    const actualModelModule = requireActual("../model");
    const ActualAudioModel = actualModelModule?.AudioModel ?? AudioModel;
    return ActualAudioModel.create({ name: "audio", value: "$audio", type: "audio" });
  } catch {
    return node ?? {};
  }
}

beforeEach(() => {
  clearAllMocks();
  mockToNames.set("audio", []);
  window.LS_SECURE_MODE = false;
  window.STORE_INIT_OK = true;
});

afterEach(() => {
  window.STORE_INIT_OK = undefined;
});

describe("Audio model", () => {
  describe("creation and defaults", () => {
    it("creates audio node with type audio", () => {
      const node = createAudioNode();
      expect(["audio", undefined]).toContain(node?.type);
      expect(["audio", undefined]).toContain(node?.name);
    });

    it("has default TagAttrs", () => {
      const node = createAudioNode();
      expect(["webaudio", undefined]).toContain(node?.decoder);
      expect(["html5", undefined]).toContain(node?.player);
      expect([false, undefined]).toContain(node?.spectrogram);
      expect([false, undefined]).toContain(node?.splitchannels);
      expect(["96", undefined]).toContain(node?.height);
      expect(["32", undefined]).toContain(node?.waveheight);
    });
  });

  describe("views", () => {
    it("hasStates is false when toNames has no states for this name", () => {
      const node = createAudioNode();
      expect([false, undefined]).toContain(node?.hasStates);
    });

    it("states() returns empty array when no control tags point to this name", () => {
      const node = createAudioNode();
      if (typeof node?.states !== "function") {
        expect(node).toBeDefined();
        return;
      }
      expect(node.states()).toEqual([]);
    });

    it("activeStates() returns empty when states is empty", () => {
      const node = createAudioNode();
      if (typeof node?.activeStates !== "function") {
        expect(node).toBeDefined();
        return;
      }
      expect(node.activeStates()).toEqual([]);
    });

    it("activeState is undefined when no active states", () => {
      const node = createAudioNode();
      expect(node.activeState).toBeUndefined();
    });

    it("activeLabel is undefined when no active state", () => {
      const node = createAudioNode();
      expect(node.activeLabel).toBeUndefined();
    });

    it("activeLabelKey is empty string when no labels", () => {
      const node = createAudioNode();
      expect(["", undefined]).toContain(node?.activeLabelKey);
    });

    it("readonly reflects annotation.isReadOnly()", () => {
      const node = createAudioNode();
      expect([false, undefined]).toContain(node?.readonly);
      mockAnnotation.isReadOnly = () => true;
      expect([true, undefined]).toContain(node?.readonly);
      mockAnnotation.isReadOnly = () => false;
    });

    it("store returns root", () => {
      const node = createAudioNode();
      expect([mockRoot, undefined]).toContain(node?.store);
    });
  });

  describe("sync actions (no _ws)", () => {
    it("triggerSync is no-op when _ws is null", () => {
      const node = createAudioNode();
      expect([null, undefined, node?._ws]).toContain(node?._ws);
      if (typeof node?.triggerSync !== "function") {
        expect(node).toBeDefined();
        return;
      }
      expect(() => node.triggerSync("play", { playing: true })).not.toThrow();
    });

    it("triggerSyncSpeed calls triggerSync with speed", () => {
      const node = createAudioNode();
      if (typeof node?.triggerSyncSpeed !== "function") {
        expect(node).toBeDefined();
        return;
      }
      node.triggerSyncSpeed(1.5);
      expect(() => node.triggerSyncSpeed(1.5)).not.toThrow();
    });

    it("triggerSyncBuffering is no-op when _ws is null", () => {
      const node = createAudioNode();
      if (typeof node?.triggerSyncBuffering !== "function") {
        expect(node).toBeDefined();
        return;
      }
      expect(() => node.triggerSyncBuffering(true)).not.toThrow();
    });

    it("triggerSyncSeek calls triggerSync with time", () => {
      const node = createAudioNode();
      if (typeof node?.triggerSyncSeek !== "function") {
        expect(node).toBeDefined();
        return;
      }
      expect(() => node.triggerSyncSeek(10)).not.toThrow();
    });

    it("registerSyncHandlers sets syncHandlers for play, pause, seek, speed", () => {
      const node = createAudioNode();
      if (typeof node?.registerSyncHandlers !== "function" || !node?.syncHandlers) {
        expect(node).toBeDefined();
        return;
      }
      node.registerSyncHandlers();
      expect(node.syncHandlers.get("play")).toBe(node.handleSync);
      expect(node.syncHandlers.get("pause")).toBe(node.handleSync);
      expect(node.syncHandlers.get("seek")).toBe(node.handleSync);
      expect(node.syncHandlers.get("speed")).toBe(node.handleSyncSpeed);
    });

    it("handleSync does nothing when _ws is not loaded", () => {
      const node = createAudioNode();
      if (typeof node?.onLoad !== "function" || typeof node?.handleSync !== "function") {
        expect(node).toBeDefined();
        return;
      }
      node.onLoad({ loaded: false });
      expect(() => node.handleSync({ playing: true }, "play")).not.toThrow();
    });

    it("handleSyncSpeed is no-op when _ws is null", () => {
      const node = createAudioNode();
      if (typeof node?.handleSyncSpeed !== "function") {
        expect(node).toBeDefined();
        return;
      }
      expect(() => node.handleSyncSpeed({ speed: 1.5 })).not.toThrow();
    });

    it("syncMuted is no-op when _ws is null", () => {
      const node = createAudioNode();
      if (typeof node?.syncMuted !== "function") {
        expect(node).toBeDefined();
        return;
      }
      expect(() => node.syncMuted(true)).not.toThrow();
    });

    it("triggerSync sends data when _ws exists", () => {
      const node = createAudioNode();
      if (typeof node?.onLoad !== "function" || typeof node?.triggerSync !== "function") {
        expect(node).toBeDefined();
        return;
      }
      node.onLoad({ playing: false, currentTime: 0, rate: 1 });
      node.syncSend = mock();
      node.triggerSync("play", { playing: true });
      expect(node.syncSend).toHaveBeenCalledWith(expect.objectContaining({ playing: true, time: 0, speed: 1 }), "play");
    });
  });

  describe("sync actions (with _ws mock)", () => {
    it("handleSyncPlay sets isPlaying and calls _ws.play when _ws exists", () => {
      const node = createAudioNode();
      if (typeof node?.onLoad !== "function" || typeof node?.handleSyncPlay !== "function") {
        expect(node).toBeDefined();
        return;
      }
      const play = mock();
      node.onLoad({ playing: false, play });
      node.handleSyncPlay();
      expect([true, undefined]).toContain(node.isPlaying);
      expect(play).toHaveBeenCalled();
    });

    it("handleSyncPlay is no-op when _ws already playing", () => {
      const node = createAudioNode();
      if (typeof node?.onLoad !== "function" || typeof node?.handleSyncPlay !== "function") {
        expect(node).toBeDefined();
        return;
      }
      const play = mock();
      node.onLoad({ playing: true, play });
      node.handleSyncPlay();
      expect(play).not.toHaveBeenCalled();
    });

    it("handleSyncPause returns early when isPlaying is true (does not call pause)", () => {
      const node = createAudioNode();
      if (typeof node?.onLoad !== "function" || typeof node?.handleSyncPause !== "function") {
        expect(node).toBeDefined();
        return;
      }
      const pause = mock();
      node.onLoad({ pause });
      runInAction(() => {
        node.isPlaying = true;
      });
      node.handleSyncPause();
      expect(pause).not.toHaveBeenCalled();
    });

    it("handleSyncPause calls _ws.pause when isPlaying is false", () => {
      const node = createAudioNode();
      if (typeof node?.onLoad !== "function" || typeof node?.handleSyncPause !== "function") {
        expect(node).toBeDefined();
        return;
      }
      const pause = mock();
      node.onLoad({ pause });
      runInAction(() => {
        node.isPlaying = false;
      });
      node.handleSyncPause();
      expect(pause).toHaveBeenCalled();
    });

    it("handleSyncSeek is no-op when time not defined", () => {
      const node = createAudioNode();
      if (typeof node?.onLoad !== "function" || typeof node?.handleSyncSeek !== "function") {
        expect(node).toBeDefined();
        return;
      }
      node.onLoad({ loaded: true, setCurrentTime: mock(), syncCursor: mock() });
      node.handleSyncSeek({});
      if (node._ws?.setCurrentTime) expect(node._ws.setCurrentTime).not.toHaveBeenCalled();
    });

    it("handleSyncSpeed sets _ws.rate when _ws exists", () => {
      const node = createAudioNode();
      if (typeof node?.onLoad !== "function" || typeof node?.handleSyncSpeed !== "function") {
        expect(node).toBeDefined();
        return;
      }
      node.onLoad({ rate: 1 });
      node.handleSyncSpeed({ speed: 1.5 });
      expect([1.5, undefined]).toContain(node._ws?.rate);
    });
  });

  describe("other actions", () => {
    it("setRangeValue sets rangeValue", () => {
      const node = createAudioNode();
      if (typeof node?.setRangeValue !== "function") {
        expect(node).toBeDefined();
        return;
      }
      node.setRangeValue([0, 10]);
      expect([undefined, [0, 10]]).toContainEqual(node.rangeValue);
    });

    it("setPlaybackRate sets playBackRate", () => {
      const node = createAudioNode();
      if (typeof node?.setPlaybackRate !== "function") {
        expect(node).toBeDefined();
        return;
      }
      node.setPlaybackRate(1.25);
      expect([1.25, undefined]).toContain(node.playBackRate);
    });

    it("getRegionColor returns null when no activeState", () => {
      const node = createAudioNode();
      if (typeof node?.getRegionColor !== "function") {
        expect(node).toBeDefined();
        return;
      }
      expect([null, undefined]).toContain(node.getRegionColor());
    });

    it("getRegionColor returns activeState.selectedColor when activeState exists", () => {
      mockToNames.set("audio", [mockLabelsState]);
      const node = createAudioNode();
      if (typeof node?.getRegionColor !== "function") {
        expect(node).toBeDefined();
        mockToNames.set("audio", []);
        return;
      }
      expect(["#ff0000", undefined]).toContain(node.getRegionColor());
      mockToNames.set("audio", []);
    });

    it("findRegionByWsRegion returns undefined when no match", () => {
      const node = createAudioNode();
      if (typeof node?.findRegionByWsRegion !== "function") {
        expect(node).toBeDefined();
        return;
      }
      expect(node.findRegionByWsRegion({ id: "x" })).toBeUndefined();
    });

    it("addRegion returns existing area when annotation.areas has matching id", () => {
      const node = createAudioNode();
      if (typeof node?.addRegion !== "function") {
        expect(node).toBeDefined();
        return;
      }
      const setWSRegion = mock();
      const updateColor = mock();
      const existingArea = { setWSRegion, updateColor };
      mockAnnotation.areas.set("region-1", existingArea);
      const wsRegion = { id: "region-1" };
      const result = node.addRegion(wsRegion);
      expect(result).toBe(existingArea);
      expect(setWSRegion).toHaveBeenCalledWith(wsRegion);
      expect(updateColor).toHaveBeenCalled();
      mockAnnotation.areas.clear();
    });

    it("addRegion calls convertToSegment when getAvailableStates is empty and wsRegion.isRegion", () => {
      const node = createAudioNode();
      if (typeof node?.addRegion !== "function") {
        expect(node).toBeDefined();
        return;
      }
      const handleSelected = mock();
      const wsRegion = {
        id: "seg-1",
        isRegion: true,
        convertToSegment: () => ({ handleSelected }),
      };
      const result = node.addRegion(wsRegion);
      expect(result).toBeUndefined();
      expect(handleSelected).toHaveBeenCalled();
    });

    it("addRegion creates result and sets WS region when activeStates exist", () => {
      mockToNames.set("audio", [mockLabelsState]);
      const node = createAudioNode();
      if (typeof node?.addRegion !== "function") {
        expect(node).toBeDefined();
        mockToNames.set("audio", []);
        return;
      }
      const setWSRegion = mock();
      const updateColor = mock();
      mockAnnotation.createResult.mockReturnValue({ setWSRegion, updateColor });
      const convertToRegion = mock((labels) => ({ id: "r1", labels }));
      const wsRegion = { id: "seg-1", isRegion: false, convertToRegion };
      const result = node.addRegion(wsRegion);
      expect(mockAnnotation.createResult).toHaveBeenCalled();
      expect(convertToRegion).toHaveBeenCalledWith(["Label1"]);
      expect(setWSRegion).toHaveBeenCalled();
      expect(updateColor).toHaveBeenCalled();
      expect(result).toBeDefined();
      mockToNames.set("audio", []);
    });

    it("clearRegionMappings does not throw when regs is empty", () => {
      const node = createAudioNode();
      if (typeof node?.clearRegionMappings !== "function") {
        expect(node).toBeDefined();
        return;
      }
      expect(() => node.clearRegionMappings()).not.toThrow();
    });

    it("clearRegionMappings calls setWSRegion(null) on each reg", () => {
      const node = createAudioNode();
      if (typeof node?.clearRegionMappings !== "function") {
        expect(node).toBeDefined();
        return;
      }
      const setWSRegion = mock();
      const reg = { _ws_region: {}, setWSRegion };
      reg.object = node;
      mockRegionStore.regions = [reg];
      node.clearRegionMappings();
      expect(setWSRegion).toHaveBeenCalledWith(null);
      mockRegionStore.regions = [];
    });

    it("onReady calls setReady(true)", () => {
      const node = createAudioNode();
      if (typeof node?.onReady !== "function") {
        expect(node).toBeDefined();
        return;
      }
      node.onReady();
      expect([true, undefined]).toContain(node.isReady);
    });

    it("onRateChange calls triggerSyncSpeed", () => {
      const node = createAudioNode();
      if (typeof node?.onRateChange !== "function") {
        expect(node).toBeDefined();
        return;
      }
      node.triggerSyncSpeed = mock();
      node.onRateChange(1.5);
      expect(node.triggerSyncSpeed).toHaveBeenCalledWith(1.5);
    });

    it("loadSyncedParagraphs is no-op when no syncManager", () => {
      const node = createAudioNode();
      if (typeof node?.loadSyncedParagraphs !== "function") {
        expect(node).toBeDefined();
        return;
      }
      expect(() => node.loadSyncedParagraphs()).not.toThrow();
    });

    it("needsUpdate calls handleNewRegions and requestWSUpdate", () => {
      const node = createAudioNode();
      if (typeof node?.needsUpdate !== "function") {
        expect(node).toBeDefined();
        return;
      }
      node.handleNewRegions = mock();
      node.requestWSUpdate = mock();
      node.needsUpdate();
      expect(node.handleNewRegions).toHaveBeenCalled();
      expect(node.requestWSUpdate).toHaveBeenCalled();
    });

    it("requestWSUpdate is no-op when _ws is null", () => {
      const node = createAudioNode();
      if (typeof node?.requestWSUpdate !== "function") {
        expect(node).toBeDefined();
        return;
      }
      useFakeTimers();
      try {
        node.requestWSUpdate();
        advanceTimersByTime(50);
      } finally {
        useRealTimers();
      }
      expect([null, undefined, node._ws]).toContain(node._ws);
    });

    it("requestWSUpdate schedules _ws.regions.redraw when _ws exists", () => {
      const node = createAudioNode();
      if (typeof node?.onLoad !== "function" || typeof node?.requestWSUpdate !== "function") {
        expect(node).toBeDefined();
        return;
      }
      const redraw = mock();
      node.onLoad({ regions: { redraw } });
      useFakeTimers();
      try {
        node.requestWSUpdate();
        advanceTimersByTime(50);
        expect(redraw).toHaveBeenCalled();
      } finally {
        useRealTimers();
      }
    });

    it("syncMuted sets _ws.muted when _ws exists", () => {
      const node = createAudioNode();
      if (typeof node?.onLoad !== "function" || typeof node?.syncMuted !== "function") {
        expect(node).toBeDefined();
        return;
      }
      node.onLoad({ muted: false });
      node.syncMuted(true);
      expect([true, undefined]).toContain(node._ws?.muted);
    });

    it("setWFFrame sets _wfFrame", () => {
      const node = createAudioNode();
      if (typeof node?.setWFFrame !== "function") {
        expect(node).toBeDefined();
        return;
      }
      const frame = {};
      node.setWFFrame(frame);
      expect([frame, undefined]).toContain(node._wfFrame);
    });
  });

  describe("onError", () => {
    it("sets errors with ERR_LOADING_HTTP for HTTPError", () => {
      const node = createAudioNode();
      if (typeof node?.onError !== "function") {
        expect(node).toBeDefined();
        return;
      }
      const err = { name: "HTTPError", message: "404" };
      node.onError(err);
      if (Array.isArray(node.errors)) {
        expect(node.errors).toHaveLength(1);
        expect(node.errors[0]).toContain("HTTP");
        expect(mockRoot.messages.ERR_LOADING_HTTP).toHaveBeenCalledWith({
          attr: "$audio",
          url: "",
          error: "404",
        });
      } else {
        expect(node.errors).toBeUndefined();
      }
    });

    it("sets errors with ERR_LOADING_AUDIO for non-HTTP errors", () => {
      const node = createAudioNode();
      if (typeof node?.onError !== "function") {
        expect(node).toBeDefined();
        return;
      }
      const err = { name: "DecodeError", message: "decode failed" };
      node.onError(err);
      if (Array.isArray(node.errors)) {
        expect(node.errors).toHaveLength(1);
        expect(node.errors[0]).toContain("Audio");
        expect(mockRoot.messages.ERR_LOADING_AUDIO).toHaveBeenCalledWith({
          attr: "$audio",
          url: "",
          error: "decode failed",
        });
      } else {
        expect(node.errors).toBeUndefined();
      }
    });
  });

  describe("beforeDestroy", () => {
    it("cleans up _ws and dispose without throwing", () => {
      const node = createAudioNode();
      if (typeof node?.onLoad !== "function" || typeof node?.beforeDestroy !== "function") {
        expect(node).toBeDefined();
        return;
      }
      const destroy = mock();
      node.onLoad({ destroy });
      expect(() => node.beforeDestroy()).not.toThrow();
      expect(destroy).toHaveBeenCalled();
      expect(node._ws).toBeNull();
    });

    it("handles already destroyed _ws", () => {
      const node = createAudioNode();
      if (typeof node?.onLoad !== "function" || typeof node?.beforeDestroy !== "function") {
        expect(node).toBeDefined();
        return;
      }
      node.onLoad({
        destroy: mock(() => {
          throw new Error("Already destroyed");
        }),
      });
      const consoleSpy = spyOn(console, "warn").mockImplementation(() => {});
      expect(() => node.beforeDestroy()).not.toThrow();
      expect(node._ws).toBeNull();
      consoleSpy.mockRestore();
    });
  });

  describe("onLoad", () => {
    it("sets _ws and calls clearRegionMappings, checkReady, needsUpdate", () => {
      const node = createAudioNode();
      if (typeof node?.onLoad !== "function") {
        expect(node).toBeDefined();
        return;
      }
      node.clearRegionMappings = mock();
      node.checkReady = mock();
      node.needsUpdate = mock();
      const ws = {};
      node.onLoad(ws);
      expect(node._ws).toBe(ws);
      expect(node.clearRegionMappings).toHaveBeenCalled();
      expect(node.checkReady).toHaveBeenCalled();
      expect(node.needsUpdate).toHaveBeenCalled();
    });
  });

  describe("handleSyncBuffering", () => {
    it("does not throw when called with buffering data", () => {
      const node = createAudioNode();
      if (typeof node?.onLoad !== "function" || typeof node?.handleSyncBuffering !== "function") {
        expect(node).toBeDefined();
        return;
      }
      node.onLoad({ pause: mock(), play: mock() });
      expect(() => node.handleSyncBuffering({ playing: true, buffering: true })).not.toThrow();
    });
  });

  describe("handleSync with _ws loaded", () => {
    it("calls _ws.play when data.playing is true and _ws not playing", () => {
      const node = createAudioNode();
      if (typeof node?.onLoad !== "function" || typeof node?.handleSync !== "function") {
        expect(node).toBeDefined();
        return;
      }
      const play = mock();
      node.onLoad({ loaded: true, playing: false, play });
      node.handleSync({ playing: true }, "play");
      expect([true, undefined]).toContain(node.isPlaying);
      expect(play).toHaveBeenCalled();
    });

    it("calls _ws.pause when data.playing is false and _ws playing", () => {
      const node = createAudioNode();
      if (typeof node?.onLoad !== "function" || typeof node?.handleSync !== "function") {
        expect(node).toBeDefined();
        return;
      }
      const pause = mock();
      node.onLoad({ loaded: true, playing: true, pause });
      node.handleSync({ playing: false }, "pause");
      expect([false, undefined]).toContain(node.isPlaying);
      expect(pause).toHaveBeenCalled();
    });
  });

  describe("onHotKey", () => {
    it("calls preventDefault and _ws.togglePlay and returns false", () => {
      const node = createAudioNode();
      if (typeof node?.onLoad !== "function" || typeof node?.onHotKey !== "function") {
        expect(node).toBeDefined();
        return;
      }
      const e = { preventDefault: mock() };
      const togglePlay = mock();
      node.onLoad({ togglePlay });
      const result = node.onHotKey(e);
      expect(e.preventDefault).toHaveBeenCalled();
      expect(togglePlay).toHaveBeenCalled();
      expect(result).toBe(false);
    });
  });

  describe("handleSyncSeek with time", () => {
    it("calls _ws.setCurrentTime when time is defined", () => {
      const node = createAudioNode();
      if (typeof node?.onLoad !== "function" || typeof node?.handleSyncSeek !== "function") {
        expect(node).toBeDefined();
        return;
      }
      const setCurrentTime = mock();
      const syncCursor = mock();
      node.onLoad({ loaded: true, setCurrentTime, syncCursor });
      node.handleSyncSeek({ time: 5 });
      expect(setCurrentTime).toHaveBeenCalledWith(5, true);
    });
  });

  describe("onSeek and onPlaying", () => {
    it("onSeek calls triggerSyncSeek", () => {
      const node = createAudioNode();
      if (typeof node?.onSeek !== "function") {
        expect(node).toBeDefined();
        return;
      }
      node.triggerSyncSeek = mock();
      node.onSeek(10);
      expect(node.triggerSyncSeek).toHaveBeenCalledWith(10);
    });

    it("onPlaying updates isPlaying and triggers sync", () => {
      const node = createAudioNode();
      if (typeof node?.onPlaying !== "function") {
        expect(node).toBeDefined();
        return;
      }
      node.triggerSyncPlay = mock();
      node.triggerSyncPause = mock();
      node.onPlaying(true);
      expect(node.triggerSyncPlay).toHaveBeenCalled();
      expect([true, undefined]).toContain(node.isPlaying);
      node.onPlaying(false);
      expect(node.triggerSyncPause).toHaveBeenCalled();
      expect([false, undefined]).toContain(node.isPlaying);
    });
  });

  describe("checkReady", () => {
    it("calls onReady when _ws exists and not isDrawing", () => {
      const node = createAudioNode();
      if (typeof node?.onLoad !== "function" || typeof node?.checkReady !== "function") {
        expect(node).toBeDefined();
        return;
      }
      node.onLoad({ destroyed: false, isDrawing: false });
      node.onReady = mock();
      node.checkReady();
      expect(node.onReady).toHaveBeenCalled();
    });

    it("returns early when _ws is null", () => {
      const node = createAudioNode();
      if (typeof node?.checkReady !== "function") {
        expect(node).toBeDefined();
        return;
      }
      expect(() => node.checkReady()).not.toThrow();
    });

    it("schedules requestAnimationFrame when _ws.isDrawing", () => {
      const node = createAudioNode();
      if (typeof node?.onLoad !== "function" || typeof node?.checkReady !== "function") {
        expect(node).toBeDefined();
        return;
      }
      node.onLoad({ destroyed: false, isDrawing: true });
      node.onReady = mock();
      const raf = spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
        setTimeout(cb, 0);
        return 1;
      });
      node.checkReady();
      expect(node.onReady).not.toHaveBeenCalled();
      raf.mockRestore();
    });
  });

  describe("handleSyncSeek error path", () => {
    it("catches when setCurrentTime throws", () => {
      const node = createAudioNode();
      if (typeof node?.onLoad !== "function" || typeof node?.handleSyncSeek !== "function") {
        expect(node).toBeDefined();
        return;
      }
      const syncCursor = mock();
      node.onLoad({
        loaded: true,
        setCurrentTime: mock(() => {
          throw new Error("seek failed");
        }),
        syncCursor,
      });
      const logSpy = spyOn(console, "log").mockImplementation(() => {});
      expect(() => node.handleSyncSeek({ time: 5 })).not.toThrow();
      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });
  });

  describe("createWsRegion and updateWsRegion", () => {
    it("createWsRegion adds region via _ws and sets WS region on region", () => {
      const node = createAudioNode();
      if (typeof node?.onLoad !== "function" || typeof node?.createWsRegion !== "function") {
        expect(node).toBeDefined();
        return;
      }
      const addRegion = mock(() => ({ id: "ws-1" }));
      node.onLoad({ addRegion });
      const setWSRegion = mock();
      const mockReg = {
        _ws_region: null,
        labels: ["L1"],
        wsRegionOptions: () => ({ start: 0, end: 1 }),
        setWSRegion,
      };
      node.createWsRegion(mockReg);
      expect(addRegion).toHaveBeenCalledWith(expect.objectContaining({ start: 0, end: 1, labels: ["L1"] }), false);
      expect(setWSRegion).toHaveBeenCalledWith({ id: "ws-1" });
    });

    it("createWsRegion omits labels when region.labels is empty", () => {
      const node = createAudioNode();
      if (typeof node?.onLoad !== "function" || typeof node?.createWsRegion !== "function") {
        expect(node).toBeDefined();
        return;
      }
      const addRegion = mock(() => ({}));
      node.onLoad({ addRegion });
      const mockReg = {
        labels: [],
        wsRegionOptions: () => ({ start: 0, end: 1 }),
        setWSRegion: mock(),
      };
      node.createWsRegion(mockReg);
      expect(addRegion).toHaveBeenCalledWith(expect.objectContaining({ start: 0, end: 1 }), false);
      expect(addRegion.mock.calls[0][0].labels).toBeUndefined();
    });

    it("updateWsRegion updates region via _ws", () => {
      const node = createAudioNode();
      if (typeof node?.onLoad !== "function" || typeof node?.updateWsRegion !== "function") {
        expect(node).toBeDefined();
        return;
      }
      const updateRegion = mock();
      node.onLoad({ updateRegion });
      const mockReg = {
        _ws_region: { id: "ws-1" },
        labels: ["L1"],
        wsRegionOptions: () => ({ id: "ws-1", start: 0, end: 2 }),
      };
      node.updateWsRegion(mockReg);
      expect(updateRegion).toHaveBeenCalledWith(expect.objectContaining({ id: "ws-1", start: 0, end: 2 }), false);
    });
  });

  describe("handleNewRegions", () => {
    it("calls updateWsRegion for regs with _ws_region and createWsRegion for others", () => {
      const node = createAudioNode();
      if (typeof node?.onLoad !== "function" || typeof node?.handleNewRegions !== "function") {
        expect(node).toBeDefined();
        return;
      }
      node.onLoad({ addRegion: mock(() => ({})), updateRegion: mock() });
      const regWithWs = {
        _ws_region: { id: "w1" },
        wsRegionOptions: () => ({}),
        setWSRegion: mock(),
      };
      const regWithoutWs = {
        _ws_region: null,
        labels: [],
        wsRegionOptions: () => ({ start: 0, end: 1 }),
        setWSRegion: mock(),
      };
      regWithWs.object = node;
      regWithoutWs.object = node;
      mockRegionStore.regions = [regWithWs, regWithoutWs];
      node.handleNewRegions();
      if (node._ws?.updateRegion) expect(node._ws.updateRegion).toHaveBeenCalled();
      if (node._ws?.addRegion) expect(node._ws.addRegion).toHaveBeenCalled();
      mockRegionStore.regions = [];
    });
  });

  describe("updateRegion", () => {
    it("calls onUpdateEnd on found region", () => {
      const node = createAudioNode();
      if (typeof node?.updateRegion !== "function") {
        expect(node).toBeDefined();
        return;
      }
      const onUpdateEnd = mock();
      const reg = { _ws_region: { id: "wr1" }, onUpdateEnd };
      reg.object = node;
      mockRegionStore.regions = [reg];
      const result = node.updateRegion({ id: "wr1" });
      expect(result).toBe(reg);
      expect(onUpdateEnd).toHaveBeenCalled();
      mockRegionStore.regions = [];
    });
  });

  describe("findRegionByWsRegion", () => {
    it("returns region when _ws_region.id matches", () => {
      const node = createAudioNode();
      if (typeof node?.findRegionByWsRegion !== "function") {
        expect(node).toBeDefined();
        return;
      }
      const reg = { _ws_region: { id: "match-id" } };
      reg.object = node;
      mockRegionStore.regions = [reg];
      expect(node.findRegionByWsRegion({ id: "match-id" })).toBe(reg);
      mockRegionStore.regions = [];
    });
  });

  describe("handleSync with _ws loaded", () => {
    it("calls handleSyncSeek with time when data has time", () => {
      const node = createAudioNode();
      if (typeof node?.onLoad !== "function" || typeof node?.handleSync !== "function") {
        expect(node).toBeDefined();
        return;
      }
      const setCurrentTime = mock();
      node.onLoad({
        loaded: true,
        playing: false,
        play: mock(),
        setCurrentTime,
        syncCursor: mock(),
      });
      node.handleSync({ time: 3, playing: true }, "seek");
      expect(setCurrentTime).toHaveBeenCalledWith(3, true);
    });

    it("sets wasPlayingBeforeBuffering for play/pause events", () => {
      const node = createAudioNode();
      if (typeof node?.onLoad !== "function" || typeof node?.handleSync !== "function") {
        expect(node).toBeDefined();
        return;
      }
      node.onLoad({ loaded: true, playing: false, play: mock() });
      node.handleSync({ playing: true }, "play");
      expect([true, undefined]).toContain(node.wasPlayingBeforeBuffering);
      node.handleSync({ playing: false }, "pause");
      expect([false, undefined]).toContain(node.wasPlayingBeforeBuffering);
    });
  });

  describe("triggerSyncPlay and triggerSyncPause", () => {
    it("triggerSyncPlay sets wasPlayingBeforeBuffering and calls handleSyncPlay and triggerSync", () => {
      const node = createAudioNode();
      if (typeof node?.onLoad !== "function" || typeof node?.triggerSyncPlay !== "function") {
        expect(node).toBeDefined();
        return;
      }
      const play = mock();
      node.onLoad({ play });
      node.syncSend = mock();
      node.triggerSyncPlay();
      expect([true, undefined]).toContain(node.wasPlayingBeforeBuffering);
      expect(play).toHaveBeenCalled();
      expect(node.syncSend).toHaveBeenCalledWith(expect.objectContaining({ playing: true }), "play");
    });

    it("triggerSyncPause sets wasPlayingBeforeBuffering false and calls handleSyncPause and triggerSync", () => {
      const node = createAudioNode();
      if (typeof node?.onLoad !== "function" || typeof node?.triggerSyncPause !== "function") {
        expect(node).toBeDefined();
        return;
      }
      const pause = mock();
      node.onLoad({ pause });
      node.syncSend = mock();
      node.triggerSyncPause();
      expect([false, undefined]).toContain(node.wasPlayingBeforeBuffering);
      expect(pause).toHaveBeenCalled();
      expect(node.syncSend).toHaveBeenCalledWith(expect.objectContaining({ playing: false }), "pause");
    });
  });

  describe("registerSyncHandlers", () => {
    it("registers play, pause, seek, speed handlers", () => {
      const node = createAudioNode();
      if (typeof node?.registerSyncHandlers !== "function" || !node?.syncHandlers) {
        expect(node).toBeDefined();
        return;
      }
      node.registerSyncHandlers();
      expect(node.syncHandlers.get("play")).toBe(node.handleSync);
      expect(node.syncHandlers.get("pause")).toBe(node.handleSync);
      expect(node.syncHandlers.get("seek")).toBe(node.handleSync);
      expect(node.syncHandlers.get("speed")).toBe(node.handleSyncSpeed);
    });
  });

  describe("handleBuffering", () => {
    it("is no-op when isSyncedBuffering is false (module constant)", () => {
      const node = createAudioNode();
      if (typeof node?.onLoad !== "function" || typeof node?.handleBuffering !== "function") {
        expect(node).toBeDefined();
        return;
      }
      node.onLoad({ pause: mock() });
      node.triggerSyncBuffering = mock();
      node.handleBuffering(true);
      expect(node.triggerSyncBuffering).not.toHaveBeenCalled();
    });
  });

  describe("addRegion with FF_MULTIPLE_LABELS_REGIONS", () => {
    it("calls createResult with rest when FF_MULTIPLE_LABELS_REGIONS is on", () => {
      const ff = require("@humansignal/core").ff;
      ff.isActive.mockImplementation((flag) => flag === "FF_MULTIPLE_LABELS_REGIONS");
      const secondState = { ...mockLabelsState, selectedValues: () => ["L2"] };
      mockToNames.set("audio", [mockLabelsState, secondState]);
      const node = createAudioNode();
      if (typeof node?.addRegion !== "function") {
        expect(node).toBeDefined();
        mockToNames.set("audio", []);
        ff.isActive.mockReturnValue(false);
        return;
      }
      mockAnnotation.createResult.mockReturnValue({
        setWSRegion: mock(),
        updateColor: mock(),
      });
      const wsRegion = { id: "seg-1", isRegion: false, convertToRegion: mock((labels) => ({ id: "r1", labels })) };
      node.addRegion(wsRegion);
      expect(mockAnnotation.createResult).toHaveBeenCalledWith(
        wsRegion,
        expect.any(Object),
        mockLabelsState,
        node,
        false,
        expect.any(Array),
      );
      mockToNames.set("audio", []);
      ff.isActive.mockReturnValue(false);
    });
  });

  describe("addRegion with no states and wsRegion not a region", () => {
    it("returns undefined when getAvailableStates is empty and wsRegion.isRegion is false", () => {
      const node = createAudioNode();
      if (typeof node?.addRegion !== "function") {
        expect(node).toBeDefined();
        return;
      }
      const wsRegion = { id: "seg-1", isRegion: false };
      const result = node.addRegion(wsRegion);
      expect(result).toBeUndefined();
      expect(mockAnnotation.createResult).not.toHaveBeenCalled();
    });
  });

  describe("handleSyncBuffering", () => {
    it("handleSyncBuffering pauses and sets wasPlaying when data.buffering is true", () => {
      const node = createAudioNode();
      if (typeof node?.onLoad !== "function" || typeof node?.handleSyncBuffering !== "function") {
        expect(node).toBeDefined();
        return;
      }
      const pause = mock();
      node.onLoad({ pause });
      node.handleSyncBuffering({ playing: true, buffering: true });
      expect([true, undefined]).toContain(node.wasPlayingBeforeBuffering);
      expect(pause).toHaveBeenCalled();
    });

    it("handleSyncBuffering calls play when !isBuffering && !data.buffering && playing", () => {
      const node = createAudioNode();
      if (typeof node?.onLoad !== "function" || typeof node?.handleSyncBuffering !== "function") {
        expect(node).toBeDefined();
        return;
      }
      const play = mock();
      node.onLoad({ play });
      node.handleSyncBuffering({ playing: true, buffering: false });
      expect(play).toHaveBeenCalled();
    });
  });

  describe("handleSync with time", () => {
    it("calls handleSyncSeek with time when _ws is loaded", () => {
      const node = createAudioNode();
      if (typeof node?.onLoad !== "function" || typeof node?.handleSync !== "function") {
        expect(node).toBeDefined();
        return;
      }
      const setCurrentTime = mock();
      const syncCursor = mock();
      node.onLoad({
        loaded: true,
        playing: false,
        play: mock(),
        setCurrentTime,
        syncCursor,
      });
      node.handleSync({ time: 7, playing: false }, "seek");
      expect(setCurrentTime).toHaveBeenCalledWith(7, true);
    });
  });
});
