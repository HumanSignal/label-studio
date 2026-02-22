/**
 * Unit tests for Audio tag model (tags/object/Audio/model.js)
 * Import model only and register with no-op view to avoid pulling in view.tsx (audio-file-decoder uses import.meta).
 */
import { runInAction } from "mobx";
import Tree from "../../../../core/Tree";
import Registry from "../../../../core/Registry";
import "../../../visual/View";
import { AudioModel } from "../model";

Registry.addTag("audio", AudioModel, () => null);
Registry.addObjectType(AudioModel);

const mockAddErrors = jest.fn();
const mockRegionStore = { regions: [] };
const mockToNames = new Map();
const mockAnnotation = {
  toNames: mockToNames,
  id: 1,
  isReadOnly: () => false,
  regionStore: mockRegionStore,
  unselectAll: jest.fn(),
  areas: new Map(),
  createResult: jest.fn(() => ({ setWSRegion: jest.fn(), updateColor: jest.fn() })),
  selectArea: jest.fn(),
};
const mockRoot = {
  task: { dataObj: {} },
  annotationStore: {
    addErrors: mockAddErrors,
    selected: mockAnnotation,
  },
  messages: {
    ERR_LOADING_HTTP: jest.fn(({ attr, url, error }) => `HTTP: ${attr} ${url} ${error}`),
    ERR_LOADING_AUDIO: jest.fn(({ attr, url, error }) => `Audio: ${attr} ${url} ${error}`),
  },
};

const mockLabelsState = {
  isSelected: true,
  selectedColor: "#ff0000",
  selectedValues: () => ["Label1"],
  valueType: "labels",
};

jest.mock("mobx-state-tree", () => {
  const actual = jest.requireActual("mobx-state-tree");
  return {
    ...actual,
    getRoot: (node) => {
      if (node && node.type === "audio") {
        return mockRoot;
      }
      return actual.getRoot(node);
    },
    getEnv: (node) => {
      if (node === mockRoot) {
        return { messages: mockRoot.messages };
      }
      return actual.getEnv(node);
    },
    getType: (node) => {
      if (node === mockLabelsState) {
        return { name: "LabelsModel" };
      }
      return actual.getType(node);
    },
  };
});

jest.mock("../../../../utils/feature-flags", () => ({
  FF_LSDV_E_278: "FF_LSDV_E_278",
  isFF: jest.fn(() => false),
}));

jest.mock("@humansignal/core", () => ({
  ff: {
    isActive: jest.fn(() => false),
    FF_SYNCED_BUFFERING: "FF_SYNCED_BUFFERING",
    FF_MULTIPLE_LABELS_REGIONS: "FF_MULTIPLE_LABELS_REGIONS",
  },
}));

const MINIMAL_CONFIG = `<View><Audio name="audio" value="$audio" /></View>`;

function createAudioNode(storeRef = { task: { dataObj: { audio: "/test.mp3" } } }) {
  const config = Tree.treeToModel(MINIMAL_CONFIG, storeRef);
  const ViewModel = Registry.getModelByTag("view");
  const root = ViewModel.create(config);
  return root.children.find((c) => c.type === "audio");
}

beforeEach(() => {
  jest.clearAllMocks();
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
      expect(node.type).toBe("audio");
      expect(node.name).toBe("audio");
    });

    it("has default TagAttrs", () => {
      const node = createAudioNode();
      expect(node.decoder).toBe("webaudio");
      expect(node.player).toBe("html5");
      expect(node.spectrogram).toBe(false);
      expect(node.splitchannels).toBe(false);
      expect(node.height).toBe("96");
      expect(node.waveheight).toBe("32");
    });
  });

  describe("views", () => {
    it("hasStates is false when toNames has no states for this name", () => {
      const node = createAudioNode();
      expect(node.hasStates).toBeFalsy();
    });

    it("states() returns empty array when no control tags point to this name", () => {
      const node = createAudioNode();
      expect(node.states()).toEqual([]);
    });

    it("activeStates() returns empty when states is empty", () => {
      const node = createAudioNode();
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
      expect(node.activeLabelKey).toBe("");
    });

    it("readonly reflects annotation.isReadOnly()", () => {
      const node = createAudioNode();
      expect(node.readonly).toBe(false);
      mockAnnotation.isReadOnly = () => true;
      expect(node.readonly).toBe(true);
      mockAnnotation.isReadOnly = () => false;
    });

    it("store returns root", () => {
      const node = createAudioNode();
      expect(node.store).toBe(mockRoot);
    });
  });

  describe("sync actions (no _ws)", () => {
    it("triggerSync is no-op when _ws is null", () => {
      const node = createAudioNode();
      expect(node._ws).toBeNull();
      expect(() => node.triggerSync("play", { playing: true })).not.toThrow();
    });

    it("triggerSyncSpeed calls triggerSync with speed", () => {
      const node = createAudioNode();
      node.triggerSyncSpeed(1.5);
      expect(() => node.triggerSyncSpeed(1.5)).not.toThrow();
    });

    it("triggerSyncBuffering is no-op when _ws is null", () => {
      const node = createAudioNode();
      expect(() => node.triggerSyncBuffering(true)).not.toThrow();
    });

    it("triggerSyncSeek calls triggerSync with time", () => {
      const node = createAudioNode();
      expect(() => node.triggerSyncSeek(10)).not.toThrow();
    });

    it("registerSyncHandlers sets syncHandlers for play, pause, seek, speed", () => {
      const node = createAudioNode();
      node.registerSyncHandlers();
      expect(node.syncHandlers.get("play")).toBe(node.handleSync);
      expect(node.syncHandlers.get("pause")).toBe(node.handleSync);
      expect(node.syncHandlers.get("seek")).toBe(node.handleSync);
      expect(node.syncHandlers.get("speed")).toBe(node.handleSyncSpeed);
    });

    it("handleSync does nothing when _ws is not loaded", () => {
      const node = createAudioNode();
      node.onLoad({ loaded: false });
      expect(() => node.handleSync({ playing: true }, "play")).not.toThrow();
    });

    it("handleSyncSpeed is no-op when _ws is null", () => {
      const node = createAudioNode();
      expect(() => node.handleSyncSpeed({ speed: 1.5 })).not.toThrow();
    });

    it("syncMuted is no-op when _ws is null", () => {
      const node = createAudioNode();
      expect(() => node.syncMuted(true)).not.toThrow();
    });

    it("triggerSync sends data when _ws exists", () => {
      const node = createAudioNode();
      node.onLoad({ playing: false, currentTime: 0, rate: 1 });
      node.syncSend = jest.fn();
      node.triggerSync("play", { playing: true });
      expect(node.syncSend).toHaveBeenCalledWith(expect.objectContaining({ playing: true, time: 0, speed: 1 }), "play");
    });
  });

  describe("sync actions (with _ws mock)", () => {
    it("handleSyncPlay sets isPlaying and calls _ws.play when _ws exists", () => {
      const node = createAudioNode();
      const play = jest.fn();
      node.onLoad({ playing: false, play });
      node.handleSyncPlay();
      expect(node.isPlaying).toBe(true);
      expect(play).toHaveBeenCalled();
    });

    it("handleSyncPlay is no-op when _ws already playing", () => {
      const node = createAudioNode();
      const play = jest.fn();
      node.onLoad({ playing: true, play });
      node.handleSyncPlay();
      expect(play).not.toHaveBeenCalled();
    });

    it("handleSyncPause returns early when isPlaying is true (does not call pause)", () => {
      const node = createAudioNode();
      const pause = jest.fn();
      node.onLoad({ pause });
      runInAction(() => {
        node.isPlaying = true;
      });
      node.handleSyncPause();
      expect(pause).not.toHaveBeenCalled();
    });

    it("handleSyncPause calls _ws.pause when isPlaying is false", () => {
      const node = createAudioNode();
      const pause = jest.fn();
      node.onLoad({ pause });
      runInAction(() => {
        node.isPlaying = false;
      });
      node.handleSyncPause();
      expect(pause).toHaveBeenCalled();
    });

    it("handleSyncSeek is no-op when time not defined", () => {
      const node = createAudioNode();
      node.onLoad({ loaded: true, setCurrentTime: jest.fn(), syncCursor: jest.fn() });
      node.handleSyncSeek({});
      expect(node._ws.setCurrentTime).not.toHaveBeenCalled();
    });

    it("handleSyncSpeed sets _ws.rate when _ws exists", () => {
      const node = createAudioNode();
      node.onLoad({ rate: 1 });
      node.handleSyncSpeed({ speed: 1.5 });
      expect(node._ws.rate).toBe(1.5);
    });
  });

  describe("other actions", () => {
    it("setRangeValue sets rangeValue", () => {
      const node = createAudioNode();
      node.setRangeValue([0, 10]);
      expect(node.rangeValue).toEqual([0, 10]);
    });

    it("setPlaybackRate sets playBackRate", () => {
      const node = createAudioNode();
      node.setPlaybackRate(1.25);
      expect(node.playBackRate).toBe(1.25);
    });

    it("getRegionColor returns null when no activeState", () => {
      const node = createAudioNode();
      expect(node.getRegionColor()).toBeNull();
    });

    it("getRegionColor returns activeState.selectedColor when activeState exists", () => {
      mockToNames.set("audio", [mockLabelsState]);
      const node = createAudioNode();
      expect(node.getRegionColor()).toBe("#ff0000");
      mockToNames.set("audio", []);
    });

    it("findRegionByWsRegion returns undefined when no match", () => {
      const node = createAudioNode();
      expect(node.findRegionByWsRegion({ id: "x" })).toBeUndefined();
    });

    it("addRegion returns existing area when annotation.areas has matching id", () => {
      const node = createAudioNode();
      const setWSRegion = jest.fn();
      const updateColor = jest.fn();
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
      const handleSelected = jest.fn();
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
      const setWSRegion = jest.fn();
      const updateColor = jest.fn();
      mockAnnotation.createResult.mockReturnValue({ setWSRegion, updateColor });
      const convertToRegion = jest.fn((labels) => ({ id: "r1", labels }));
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
      expect(() => node.clearRegionMappings()).not.toThrow();
    });

    it("onReady calls setReady(true)", () => {
      const node = createAudioNode();
      node.onReady();
      expect(node.isReady).toBe(true);
    });

    it("onRateChange calls triggerSyncSpeed", () => {
      const node = createAudioNode();
      node.triggerSyncSpeed = jest.fn();
      node.onRateChange(1.5);
      expect(node.triggerSyncSpeed).toHaveBeenCalledWith(1.5);
    });

    it("loadSyncedParagraphs is no-op when no syncManager", () => {
      const node = createAudioNode();
      expect(() => node.loadSyncedParagraphs()).not.toThrow();
    });

    it("needsUpdate calls handleNewRegions and requestWSUpdate", () => {
      const node = createAudioNode();
      node.handleNewRegions = jest.fn();
      node.requestWSUpdate = jest.fn();
      node.needsUpdate();
      expect(node.handleNewRegions).toHaveBeenCalled();
      expect(node.requestWSUpdate).toHaveBeenCalled();
    });

    it("requestWSUpdate is no-op when _ws is null", () => {
      const node = createAudioNode();
      jest.useFakeTimers();
      node.requestWSUpdate();
      jest.advanceTimersByTime(50);
      jest.useRealTimers();
      expect(node._ws).toBeNull();
    });

    it("requestWSUpdate schedules _ws.regions.redraw when _ws exists", () => {
      const node = createAudioNode();
      const redraw = jest.fn();
      node.onLoad({ regions: { redraw } });
      jest.useFakeTimers();
      node.requestWSUpdate();
      jest.advanceTimersByTime(50);
      expect(redraw).toHaveBeenCalled();
      jest.useRealTimers();
    });

    it("syncMuted sets _ws.muted when _ws exists", () => {
      const node = createAudioNode();
      node.onLoad({ muted: false });
      node.syncMuted(true);
      expect(node._ws.muted).toBe(true);
    });

    it("setWFFrame sets _wfFrame", () => {
      const node = createAudioNode();
      const frame = {};
      node.setWFFrame(frame);
      expect(node._wfFrame).toBe(frame);
    });
  });

  describe("onError", () => {
    it("sets errors with ERR_LOADING_HTTP for HTTPError", () => {
      const node = createAudioNode();
      const err = { name: "HTTPError", message: "404" };
      node.onError(err);
      expect(node.errors).toHaveLength(1);
      expect(node.errors[0]).toContain("HTTP");
      expect(mockRoot.messages.ERR_LOADING_HTTP).toHaveBeenCalledWith({
        attr: "$audio",
        url: "",
        error: "404",
      });
    });

    it("sets errors with ERR_LOADING_AUDIO for non-HTTP errors", () => {
      const node = createAudioNode();
      const err = { name: "DecodeError", message: "decode failed" };
      node.onError(err);
      expect(node.errors).toHaveLength(1);
      expect(node.errors[0]).toContain("Audio");
      expect(mockRoot.messages.ERR_LOADING_AUDIO).toHaveBeenCalledWith({
        attr: "$audio",
        url: "",
        error: "decode failed",
      });
    });
  });

  describe("beforeDestroy", () => {
    it("cleans up _ws and dispose without throwing", () => {
      const node = createAudioNode();
      const destroy = jest.fn();
      node.onLoad({ destroy });
      expect(() => node.beforeDestroy()).not.toThrow();
      expect(destroy).toHaveBeenCalled();
      expect(node._ws).toBeNull();
    });

    it("handles already destroyed _ws", () => {
      const node = createAudioNode();
      node.onLoad({
        destroy: jest.fn(() => {
          throw new Error("Already destroyed");
        }),
      });
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
      expect(() => node.beforeDestroy()).not.toThrow();
      expect(node._ws).toBeNull();
      consoleSpy.mockRestore();
    });
  });

  describe("onLoad", () => {
    it("sets _ws and calls clearRegionMappings, checkReady, needsUpdate", () => {
      const node = createAudioNode();
      node.clearRegionMappings = jest.fn();
      node.checkReady = jest.fn();
      node.needsUpdate = jest.fn();
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
      node.onLoad({ pause: jest.fn(), play: jest.fn() });
      expect(() => node.handleSyncBuffering({ playing: true, buffering: true })).not.toThrow();
    });
  });

  describe("handleSync with _ws loaded", () => {
    it("calls _ws.play when data.playing is true and _ws not playing", () => {
      const node = createAudioNode();
      const play = jest.fn();
      node.onLoad({ loaded: true, playing: false, play });
      node.handleSync({ playing: true }, "play");
      expect(node.isPlaying).toBe(true);
      expect(play).toHaveBeenCalled();
    });

    it("calls _ws.pause when data.playing is false and _ws playing", () => {
      const node = createAudioNode();
      const pause = jest.fn();
      node.onLoad({ loaded: true, playing: true, pause });
      node.handleSync({ playing: false }, "pause");
      expect(node.isPlaying).toBe(false);
      expect(pause).toHaveBeenCalled();
    });
  });

  describe("onHotKey", () => {
    it("calls preventDefault and _ws.togglePlay and returns false", () => {
      const node = createAudioNode();
      const e = { preventDefault: jest.fn() };
      const togglePlay = jest.fn();
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
      const setCurrentTime = jest.fn();
      const syncCursor = jest.fn();
      node.onLoad({ loaded: true, setCurrentTime, syncCursor });
      node.handleSyncSeek({ time: 5 });
      expect(setCurrentTime).toHaveBeenCalledWith(5, true);
    });
  });

  describe("onSeek and onPlaying", () => {
    it("onSeek calls triggerSyncSeek", () => {
      const node = createAudioNode();
      node.triggerSyncSeek = jest.fn();
      node.onSeek(10);
      expect(node.triggerSyncSeek).toHaveBeenCalledWith(10);
    });

    it("onPlaying updates isPlaying and triggers sync", () => {
      const node = createAudioNode();
      node.triggerSyncPlay = jest.fn();
      node.triggerSyncPause = jest.fn();
      node.onPlaying(true);
      expect(node.triggerSyncPlay).toHaveBeenCalled();
      expect(node.isPlaying).toBe(true);
      node.onPlaying(false);
      expect(node.triggerSyncPause).toHaveBeenCalled();
      expect(node.isPlaying).toBe(false);
    });
  });

  describe("checkReady", () => {
    it("calls onReady when _ws exists and not isDrawing", () => {
      const node = createAudioNode();
      node.onLoad({ destroyed: false, isDrawing: false });
      node.onReady = jest.fn();
      node.checkReady();
      expect(node.onReady).toHaveBeenCalled();
    });

    it("returns early when _ws is null", () => {
      const node = createAudioNode();
      expect(() => node.checkReady()).not.toThrow();
    });

    it("schedules requestAnimationFrame when _ws.isDrawing", () => {
      const node = createAudioNode();
      node.onLoad({ destroyed: false, isDrawing: true });
      node.onReady = jest.fn();
      const raf = jest.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
        setTimeout(cb, 0);
        return 1;
      });
      node.checkReady();
      expect(node.onReady).not.toHaveBeenCalled();
      raf.mockRestore();
    });
  });
});
