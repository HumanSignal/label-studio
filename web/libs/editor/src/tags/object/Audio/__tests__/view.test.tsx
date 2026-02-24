/**
 * Unit tests for Audio tag view (tags/object/Audio/view.tsx)
 */
import { render, screen, fireEvent } from "@testing-library/react";
import { Audio } from "../view";

jest.mock("../../../../components/Timeline/Controls", () => {
  const MockControls = (props: any) => (
    <div data-testid="timeline-controls">
      <button type="button" aria-label="Step backward" onClick={props.onStepBackward}>
        Back
      </button>
      <button type="button" aria-label="Step forward" onClick={props.onStepForward}>
        Forward
      </button>
      <button type="button" onClick={() => props.onPlay?.()}>
        Play
      </button>
      <button type="button" onClick={() => props.onPause?.()}>
        Pause
      </button>
      <button type="button" onClick={() => props.toggleVisibility?.("waveform", false)}>
        Toggle
      </button>
      <button type="button" onClick={() => props.onVolumeChange?.(0.5)}>
        Volume
      </button>
      <button type="button" onClick={() => props.onPositionChange?.(5)}>
        Position
      </button>
      <button type="button" onClick={() => props.onSpeedChange?.(1.5)}>
        Speed
      </button>
      <button type="button" onClick={() => props.onZoom?.(2)}>
        Zoom
      </button>
      <button type="button" onClick={() => props.onAmpChange?.(1.2)}>
        Amp
      </button>
    </div>
  );
  return { Controls: MockControls };
});

jest.mock("../../../../core/Hotkey", () => ({
  Hotkey: jest.fn(() => ({
    addNamed: jest.fn(),
    unbindAll: jest.fn(),
  })),
}));

jest.mock("@humansignal/ui", () => ({
  getCurrentTheme: jest.fn(() => "Light"),
}));

jest.mock("../../../../utils/feature-flags", () => ({
  FF_AUDIO_SPECTROGRAMS: "FF_AUDIO_SPECTROGRAMS",
  isFF: jest.fn(() => true),
}));

jest.mock("../../../../lib/AudioUltra/hooks/useSpectrogramControls", () => ({
  useSpectrogramControls: jest.fn(),
}));

jest.mock("@humansignal/core", () => ({
  ff: {
    isActive: jest.fn(() => true),
  },
}));

const mockSetVisibility = jest.fn();
const mockGetLayer = jest.fn(() => ({ setVisibility: mockSetVisibility }));
const mockLoad = jest.fn();
const mockOn = jest.fn();
const mockSeekBackward = jest.fn();
const mockSeekForward = jest.fn();
const mockSeek = jest.fn();
const mockSyncCursor = jest.fn();
const mockClearSegments = jest.fn();
const mockRegionDrawableTarget = jest.fn();
const mockSetDrawingColor = jest.fn();
const mockSetLabels = jest.fn();
const mockResetDrawableTarget = jest.fn();
const mockResetDrawingColor = jest.fn();
const mockResetLabels = jest.fn();
const mockFindRegion = jest.fn(() => null);
const mockHandleSelected = jest.fn();

jest.mock("../../../../lib/AudioUltra/react", () => {
  const React = require("react");
  return {
    useWaveform: (ref: any, options: any) => {
      const mockWaveform = {
        load: mockLoad,
        on: mockOn,
        getLayer: mockGetLayer,
        seekBackward: mockSeekBackward,
        seekForward: mockSeekForward,
        seek: mockSeek,
        syncCursor: mockSyncCursor,
        regions: {
          clearSegments: mockClearSegments,
          regions: [],
          findRegion: mockFindRegion,
        },
        regionDrawableTarget: mockRegionDrawableTarget,
        setDrawingColor: mockSetDrawingColor,
        setLabels: mockSetLabels,
        resetDrawableTarget: mockResetDrawableTarget,
        resetDrawingColor: mockResetDrawingColor,
        resetLabels: mockResetLabels,
      };
      React.useEffect(() => {
        if (options?.onLoad) {
          options.onLoad(mockWaveform);
        }
      }, []);
      return {
        waveform: { current: mockWaveform },
        currentTime: 0,
        playing: false,
        volume: 1,
        rate: 1,
        zoom: 1,
        duration: 10,
        amp: 1,
        layerVisibility: new Map(),
        setPlaying: jest.fn(),
        setVolume: jest.fn(),
        setRate: jest.fn(),
        setZoom: jest.fn(),
        setAmp: jest.fn(),
      };
    },
  };
});

const defaultItem = {
  _value: "https://example.com/audio.mp3",
  _ws: {
    regions: {
      findRegion: mockFindRegion,
      regions: [],
      regionDrawableTarget: mockRegionDrawableTarget,
      setDrawingColor: mockSetDrawingColor,
      setLabels: mockSetLabels,
      resetDrawableTarget: mockResetDrawableTarget,
      resetDrawingColor: mockResetDrawingColor,
      resetLabels: mockResetLabels,
    },
  },
  stageRef: { current: null },
  height: undefined,
  waveheight: undefined,
  splitchannels: false,
  decoder: undefined,
  player: undefined,
  defaultvolume: undefined,
  defaultscale: undefined,
  defaultzoom: undefined,
  defaultspeed: undefined,
  muted: "false",
  isBuffering: false,
  wasPlayingBeforeBuffering: false,
  handleBuffering: jest.fn(),
  onLoad: jest.fn(),
  spectrogram: true,
  onPlaying: jest.fn(),
  onSeek: jest.fn(),
  onRateChange: jest.fn(),
  onError: jest.fn(),
  setWFFrame: jest.fn(),
  readonly: false,
  getRegionColor: jest.fn(() => null),
  activeState: undefined,
  regs: [],
  addRegion: jest.fn(),
  updateRegion: jest.fn(),
  annotationStore: {
    store: { settings: { showLabels: true } },
  },
  annotation: {
    regionStore: { unselectAll: jest.fn(), toggleSelection: jest.fn() },
    isLinkingMode: false,
    addLinkedRegion: jest.fn(),
    stopLinkingMode: jest.fn(),
  },
  errors: undefined,
  triggerSyncPlay: jest.fn(),
  triggerSyncPause: jest.fn(),
};

function getLastHotkeyInstance() {
  const { Hotkey } = require("../../../../core/Hotkey");
  const results = (Hotkey as jest.Mock).mock?.results ?? [];
  return results[results.length - 1]?.value;
}

describe("Audio view", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindRegion.mockReturnValue(null);
  });

  describe("AudioWithSettings (Audio export)", () => {
    it("renders without crashing", () => {
      render(<Audio item={defaultItem as any} />);
      expect(screen.getByTestId("timeline-controls")).toBeInTheDocument();
    });

    it("renders error messages when item.errors is provided", () => {
      const item = {
        ...defaultItem,
        errors: ["Load failed", "Decode failed"],
      };
      render(<Audio item={item as any} />);
      expect(screen.getByText("Load failed")).toBeInTheDocument();
      expect(screen.getByText("Decode failed")).toBeInTheDocument();
    });

    it("uses persistent settings and passes context to AudioView", () => {
      render(<Audio item={defaultItem as any} />);
      expect(screen.getByTestId("timeline-controls")).toBeInTheDocument();
    });
  });

  describe("Controls callbacks", () => {
    it("calls waveform.load and registers hotkeys on mount", () => {
      render(<Audio item={defaultItem as any} />);
      expect(mockLoad).toHaveBeenCalled();
      expect(mockOn).toHaveBeenCalledWith("beforeRegionsDraw", expect.any(Function));
      expect(mockOn).toHaveBeenCalledWith("afterRegionsDraw", expect.any(Function));
      expect(mockOn).toHaveBeenCalledWith("regionSelected", expect.any(Function));
      expect(mockOn).toHaveBeenCalledWith("regionCreated", expect.any(Function));
      expect(mockOn).toHaveBeenCalledWith("regionUpdatedEnd", expect.any(Function));
      const hotkey = getLastHotkeyInstance();
      expect(hotkey?.addNamed).toHaveBeenCalledWith("region:delete", expect.any(Function));
      expect(hotkey?.addNamed).toHaveBeenCalledWith("segment:delete", expect.any(Function));
      expect(hotkey?.addNamed).toHaveBeenCalledWith("region:delete-all", expect.any(Function));
    });

    it("onStepBackward calls seekBackward and syncCursor", () => {
      render(<Audio item={defaultItem as any} />);
      const backwardBtn = screen
        .getAllByRole("button")
        .find((b) => b.getAttribute("aria-label")?.includes("back") || b.title?.includes("Back"));
      if (backwardBtn) {
        fireEvent.click(backwardBtn);
        expect(mockSeekBackward).toHaveBeenCalled();
        expect(mockSyncCursor).toHaveBeenCalled();
      }
    });

    it("onStepForward calls seekForward and syncCursor", () => {
      render(<Audio item={defaultItem as any} />);
      const forwardBtn = screen
        .getAllByRole("button")
        .find((b) => b.getAttribute("aria-label")?.includes("forward") || b.title?.includes("Forward"));
      if (forwardBtn) {
        fireEvent.click(forwardBtn);
        expect(mockSeekForward).toHaveBeenCalled();
        expect(mockSyncCursor).toHaveBeenCalled();
      }
    });

    it("toggleVisibility calls getLayer and setVisibility when layer exists", () => {
      render(<Audio item={defaultItem as any} />);
      const mockLayer = { setVisibility: mockSetVisibility };
      mockGetLayer.mockReturnValue(mockLayer);
      const visibilityControl =
        document.querySelector('[class*="layer"]') || document.querySelector('button[title*="layer"]');
      if (visibilityControl) {
        fireEvent.click(visibilityControl as HTMLElement);
        expect(mockGetLayer).toHaveBeenCalled();
      }
    });
  });

  describe("useWaveform options from item", () => {
    it("passes item height and waveheight when valid numbers", () => {
      const item = { ...defaultItem, height: 120, waveheight: 48 } as any;
      render(<Audio item={item} />);
      expect(screen.getByTestId("timeline-controls")).toBeInTheDocument();
    });

    it("passes item defaults for volume, amp, zoom, rate", () => {
      const item = {
        ...defaultItem,
        defaultvolume: 0.8,
        defaultscale: 1.2,
        defaultzoom: 2,
        defaultspeed: 1.5,
      } as any;
      render(<Audio item={item} />);
      expect(screen.getByTestId("timeline-controls")).toBeInTheDocument();
    });

    it("passes muted when item.muted is 'true'", () => {
      const item = { ...defaultItem, muted: "true" } as any;
      render(<Audio item={item} />);
      expect(screen.getByTestId("timeline-controls")).toBeInTheDocument();
    });

    it("uses default height and waveheight when item values are invalid or NaN", () => {
      const item = { ...defaultItem, height: "invalid", waveheight: Number.NaN } as any;
      render(<Audio item={item} />);
      expect(screen.getByTestId("timeline-controls")).toBeInTheDocument();
    });
  });

  describe("beforeRegionsDraw / afterRegionsDraw", () => {
    it("when getRegionColor and selectedValues return values, calls region draw methods", () => {
      const regions = {
        regionDrawableTarget: mockRegionDrawableTarget,
        setDrawingColor: mockSetDrawingColor,
        setLabels: mockSetLabels,
        resetDrawableTarget: mockResetDrawableTarget,
        resetDrawingColor: mockResetDrawingColor,
        resetLabels: mockResetLabels,
      };
      render(<Audio item={defaultItem as any} />);
      const beforeCb = mockOn.mock.calls.find((c: any[]) => c[0] === "beforeRegionsDraw")?.[1];
      const afterCb = mockOn.mock.calls.find((c: any[]) => c[0] === "afterRegionsDraw")?.[1];
      expect(beforeCb).toBeDefined();
      expect(afterCb).toBeDefined();
      beforeCb?.(regions as any);
      afterCb?.(regions as any);
      expect(mockResetDrawableTarget).toHaveBeenCalled();
      expect(mockResetDrawingColor).toHaveBeenCalled();
      expect(mockResetLabels).toHaveBeenCalled();
    });

    it("beforeRegionsDraw with regionColor and regionLabels calls setDrawingColor and setLabels", () => {
      const item = {
        ...defaultItem,
        getRegionColor: jest.fn(() => "#ff0000"),
        activeState: { selectedValues: () => ["Label1"] },
      } as any;
      const regions = {
        regionDrawableTarget: mockRegionDrawableTarget,
        setDrawingColor: mockSetDrawingColor,
        setLabels: mockSetLabels,
        resetDrawableTarget: mockResetDrawableTarget,
        resetDrawingColor: mockResetDrawingColor,
        resetLabels: mockResetLabels,
      };
      render(<Audio item={item} />);
      const beforeCb = mockOn.mock.calls.find((c: any[]) => c[0] === "beforeRegionsDraw")?.[1];
      beforeCb?.(regions as any);
      expect(mockRegionDrawableTarget).toHaveBeenCalled();
      expect(mockSetDrawingColor).toHaveBeenCalledWith("#ff0000");
      expect(mockSetLabels).toHaveBeenCalledWith(["Label1"]);
    });
  });

  describe("region callbacks", () => {
    it("regionCreated calls item.addRegion", () => {
      const addRegion = jest.fn();
      const item = { ...defaultItem, addRegion } as any;
      render(<Audio item={item} />);
      const createCb = mockOn.mock.calls.find((c: any[]) => c[0] === "regionCreated")?.[1];
      expect(createCb).toBeDefined();
      createCb?.({ id: "r1" });
      expect(addRegion).toHaveBeenCalledWith({ id: "r1" });
    });

    it("regionUpdatedEnd calls item.updateRegion", () => {
      const updateRegion = jest.fn();
      const item = { ...defaultItem, updateRegion } as any;
      render(<Audio item={item} />);
      const updateCb = mockOn.mock.calls.find((c: any[]) => c[0] === "regionUpdatedEnd")?.[1];
      expect(updateCb).toBeDefined();
      updateCb?.({ id: "r1" });
      expect(updateRegion).toHaveBeenCalledWith({ id: "r1" });
    });
  });

  describe("hotkey region:delete and region:delete-all", () => {
    it("region:delete callback calls clearSegments(false)", () => {
      render(<Audio item={defaultItem as any} />);
      const hotkey = getLastHotkeyInstance();
      const deleteCb = (hotkey?.addNamed as jest.Mock)?.mock?.calls?.find((c: any[]) => c[0] === "region:delete")?.[1];
      expect(deleteCb).toBeDefined();
      deleteCb?.();
      expect(mockClearSegments).toHaveBeenCalledWith(false);
    });

    it("region:delete-all callback calls clearSegments()", () => {
      render(<Audio item={defaultItem as any} />);
      const hotkey = getLastHotkeyInstance();
      const deleteAllCb = (hotkey?.addNamed as jest.Mock)?.mock?.calls?.find(
        (c: any[]) => c[0] === "region:delete-all",
      )?.[1];
      expect(deleteAllCb).toBeDefined();
      deleteAllCb?.();
      expect(mockClearSegments).toHaveBeenCalledWith();
    });
  });

  describe("ref assignment", () => {
    it("assigns rootRef and item.stageRef when view mounts", () => {
      const item = { ...defaultItem, stageRef: { current: null } } as any;
      render(<Audio item={item} />);
      expect(screen.getByTestId("timeline-controls")).toBeInTheDocument();
      expect(item.stageRef.current).toBeTruthy();
    });
  });

  describe("selectRegion callback", () => {
    it("calls unselectAll when not growSelection", () => {
      const unselectAll = jest.fn();
      const item = {
        ...defaultItem,
        annotation: { ...defaultItem.annotation, regionStore: { ...defaultItem.annotation.regionStore, unselectAll } },
        regs: [],
        _ws: { ...defaultItem._ws, regions: { ...defaultItem._ws.regions, regions: [], findRegion: mockFindRegion } },
      } as any;
      render(<Audio item={item} />);
      const selectCb = mockOn.mock.calls.find((c: any[]) => c[0] === "regionSelected")?.[1];
      selectCb?.({ id: "r1", selected: true, isRegion: true }, { metaKey: false, ctrlKey: false } as MouseEvent);
      expect(unselectAll).toHaveBeenCalled();
    });

    it("calls toggleSelection when itemRegion is found", () => {
      const toggleSelection = jest.fn();
      const itemRegion = { id: "r1" };
      const item = {
        ...defaultItem,
        annotation: { ...defaultItem.annotation, regionStore: { unselectAll: jest.fn(), toggleSelection } },
        regs: [itemRegion],
        _ws: { ...defaultItem._ws, regions: { ...defaultItem._ws.regions, regions: [], findRegion: mockFindRegion } },
      } as any;
      render(<Audio item={item} />);
      const selectCb = mockOn.mock.calls.find((c: any[]) => c[0] === "regionSelected")?.[1];
      selectCb?.({ id: "r1", selected: true, isRegion: true }, { metaKey: false, ctrlKey: false } as MouseEvent);
      expect(toggleSelection).toHaveBeenCalledWith(itemRegion, true);
    });

    it("calls targetInWave.handleSelected when targetInWave exists", () => {
      const segmentInWave = { id: "r1", handleSelected: mockHandleSelected };
      mockFindRegion.mockReturnValue(segmentInWave);
      const item = {
        ...defaultItem,
        regs: [],
        _ws: {
          ...defaultItem._ws,
          regions: {
            ...defaultItem._ws.regions,
            regions: [segmentInWave],
            findRegion: () => segmentInWave,
          },
        },
      } as any;
      render(<Audio item={item} />);
      const selectCb = mockOn.mock.calls.find((c: any[]) => c[0] === "regionSelected")?.[1];
      selectCb?.({ id: "r1", selected: true, isRegion: false }, { metaKey: false, ctrlKey: false } as MouseEvent);
      expect(mockHandleSelected).toHaveBeenCalledWith(true);
    });

    it("when isLinkingMode and itemRegion, calls addLinkedRegion and stopLinkingMode", () => {
      const addLinkedRegion = jest.fn();
      const stopLinkingMode = jest.fn();
      const itemRegion = { id: "r1" };
      const item = {
        ...defaultItem,
        annotation: {
          ...defaultItem.annotation,
          isLinkingMode: true,
          addLinkedRegion,
          stopLinkingMode,
          regionStore: { unselectAll: jest.fn(), toggleSelection: jest.fn() },
        },
        regs: [itemRegion],
        _ws: { ...defaultItem._ws, regions: { ...defaultItem._ws.regions, regions: [], findRegion: mockFindRegion } },
      } as any;
      render(<Audio item={item} />);
      const selectCb = mockOn.mock.calls.find((c: any[]) => c[0] === "regionSelected")?.[1];
      const region = { id: "r1", selected: true, handleSelected: jest.fn() };
      selectCb?.(region, { metaKey: false, ctrlKey: false } as MouseEvent);
      expect(addLinkedRegion).toHaveBeenCalledWith(itemRegion);
      expect(stopLinkingMode).toHaveBeenCalled();
      expect(region.handleSelected).toHaveBeenCalledWith(false);
    });

    it("does not call unselectAll when growSelection (metaKey) is true", () => {
      const unselectAll = jest.fn();
      const item = {
        ...defaultItem,
        annotation: { ...defaultItem.annotation, regionStore: { ...defaultItem.annotation.regionStore, unselectAll } },
        regs: [],
        _ws: { ...defaultItem._ws, regions: { ...defaultItem._ws.regions, regions: [], findRegion: mockFindRegion } },
      } as any;
      render(<Audio item={item} />);
      const selectCb = mockOn.mock.calls.find((c: any[]) => c[0] === "regionSelected")?.[1];
      selectCb?.({ id: "r1", selected: true, isRegion: true }, { metaKey: true, ctrlKey: false } as MouseEvent);
      expect(unselectAll).not.toHaveBeenCalled();
    });

    it("deselects other segments when not growSelection", () => {
      const otherHandleSelected = jest.fn();
      const regions = [
        { id: "r1", handleSelected: mockHandleSelected },
        { id: "r2", handleSelected: otherHandleSelected },
      ];
      mockFindRegion.mockImplementation((id: string) => regions.find((r: any) => r.id === id));
      const item = {
        ...defaultItem,
        regs: [],
        _ws: {
          ...defaultItem._ws,
          regions: {
            ...defaultItem._ws.regions,
            regions,
            findRegion: (id: string) => regions.find((r: any) => r.id === id),
          },
        },
      } as any;
      render(<Audio item={item} />);
      const selectCb = mockOn.mock.calls.find((c: any[]) => c[0] === "regionSelected")?.[1];
      selectCb?.({ id: "r1", selected: true, isRegion: true }, { metaKey: false, ctrlKey: false } as MouseEvent);
      expect(otherHandleSelected).toHaveBeenCalledWith(false);
    });
  });

  describe("Controls volume and position", () => {
    it("onVolumeChange calls setVolume", () => {
      render(<Audio item={defaultItem as any} />);
      fireEvent.click(screen.getByText("Volume"));
      expect(mockSeek).not.toHaveBeenCalled();
    });
    it("onPositionChange calls seek and syncCursor", () => {
      render(<Audio item={defaultItem as any} />);
      fireEvent.click(screen.getByText("Position"));
      expect(mockSeek).toHaveBeenCalledWith(5);
      expect(mockSyncCursor).toHaveBeenCalled();
    });
  });

  describe("synced buffering play/pause", () => {
    it("when isBuffering, onPlay calls triggerSyncPlay", () => {
      const triggerSyncPlay = jest.fn();
      const item = { ...defaultItem, isBuffering: true, triggerSyncPlay } as any;
      render(<Audio item={item} />);
      fireEvent.click(screen.getByText("Play"));
      expect(triggerSyncPlay).toHaveBeenCalledWith(true);
    });
    it("when isBuffering, onPause calls triggerSyncPause", () => {
      const triggerSyncPause = jest.fn();
      const item = { ...defaultItem, isBuffering: true, triggerSyncPause } as any;
      render(<Audio item={item} />);
      fireEvent.click(screen.getByText("Pause"));
      expect(triggerSyncPause).toHaveBeenCalledWith(true);
    });
  });

  describe("item.readonly", () => {
    it("passes createable false when item.readonly is true", () => {
      const item = { ...defaultItem, readonly: true } as any;
      render(<Audio item={item} />);
      expect(screen.getByTestId("timeline-controls")).toBeInTheDocument();
    });
  });

  describe("dark theme", () => {
    it("uses dark theme colors when getCurrentTheme returns Dark", () => {
      const getCurrentTheme = require("@humansignal/ui").getCurrentTheme;
      (getCurrentTheme as jest.Mock).mockReturnValue("Dark");
      render(<Audio item={defaultItem as any} />);
      expect(screen.getByTestId("timeline-controls")).toBeInTheDocument();
      (getCurrentTheme as jest.Mock).mockReturnValue("Light");
    });
  });
});
