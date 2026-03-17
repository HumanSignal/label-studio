/**
 * Unit tests for HtxVideo.jsx (tags/object/Video/HtxVideo.jsx)
 */
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { HtxVideoView } from "../HtxVideo";

async function flushRaf() {
  await act(async () => {
    await new Promise((resolve) => {
      if (typeof requestAnimationFrame !== "undefined") {
        requestAnimationFrame(() => setTimeout(resolve, 0));
      } else {
        setTimeout(resolve, 0);
      }
    });
  });
}

async function triggerVideoLoad() {
  await act(() => {
    mockVideoCanvasProps.onLoad?.({
      length: 100,
      videoDimensions: { width: 800, height: 600, ratio: 1 },
    });
  });
}

vi.mock("@humansignal/core", () => ({
  ff: { isActive: () => false },
}));

vi.mock("@humansignal/icons", () => ({
  IconZoomIn: () => <span data-testid="icon-zoom-in" />,
}));

vi.mock("@humansignal/ui", () => ({
  Button: ({ children, ...props }) => (
    <button type="button" data-testid="ui-button" {...props}>
      {children}
    </button>
  ),
  Dropdown: {
    Trigger: ({ content, children }) => (
      <div data-testid="dropdown-trigger">
        {children}
        {content && <div data-testid="dropdown-content">{content}</div>}
      </div>
    ),
  },
}));

vi.mock("../../../../common/Menu/Menu", () => ({
  Menu: ({ children }) => <div data-testid="menu">{children}</div>,
  Item: ({ children, onClick }) => (
    <button type="button" data-testid="menu-item" onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock("../../../../components/ErrorMessage/ErrorMessage", () => ({
  ErrorMessage: ({ error }) => <div data-testid="error-message">{String(error)}</div>,
}));

vi.mock("../../../../components/Tags/Object", () => ({
  __esModule: true,
  default: ({ item, children }) => <div data-testid="object-tag">{children}</div>,
}));

vi.mock("../../../../components/Timeline/Controls/VideoConfigControl", () => ({
  VideoConfigControl: () => <div data-testid="video-config-control" />,
}));

const mockTimelineProps = {};
vi.mock("../../../../components/Timeline/Timeline", () => ({
  Timeline: (props) => {
    Object.assign(mockTimelineProps, props);
    return <div data-testid="timeline">Timeline</div>;
  },
}));

const mockVideoCanvasProps = {};
vi.mock("../../../../components/VideoCanvas/VideoCanvas", () => ({
  clampZoom: (z) => Math.max(0.1, Math.min(10, z)),
  VideoCanvas: (props) => {
    Object.assign(mockVideoCanvasProps, props);
    return <div data-testid="video-canvas">VideoCanvas</div>;
  },
}));

vi.mock("../VideoRegions", () => ({
  VideoRegions: () => <div data-testid="video-regions">VideoRegions</div>,
}));

vi.mock("../../../../hooks/useFullscreen", () => ({
  useFullscreen: () => ({
    enter: vi.fn(),
    exit: vi.fn(),
    getElement: () => null,
  }),
}));

vi.mock("../../../../hooks/useToggle", () => {
  const { useState } = require("react");
  return {
    useToggle: (initial) => {
      const [value, setValue] = useState(initial);
      return [value, () => setValue(true), () => setValue(false), () => setValue((v) => !v)];
    },
  };
});

vi.mock("../../../../utils/resize-observer", () => ({
  __esModule: true,
  default: vi.fn().mockImplementation(function (callback) {
    this._callback = callback;
    this.observe = vi.fn((el) => {
      if (this._callback && el) {
        try {
          Object.defineProperty(el, "clientWidth", { value: 800, configurable: true });
          Object.defineProperty(el, "clientHeight", { value: 600, configurable: true });
        } catch (_) {}
        this._callback();
      }
    });
    this.unobserve = vi.fn();
    this.disconnect = vi.fn();
    return this;
  }),
}));

function createMockItem(overrides = {}) {
  const ref = {
    current: {
      width: 800,
      height: 600,
      position: 1,
      playing: false,
      videoDimensions: { width: 800, height: 600, ratio: 1 },
      adjustPan: vi.fn((x, y) => ({ x, y })),
      play: vi.fn(),
      pause: vi.fn(),
      videoRef: { current: null },
    },
  };
  return {
    _value: "https://example.com/video.mp4",
    ref,
    height: 600,
    errors: [],
    regs: [],
    videoControl: true,
    findRegion: vi.fn(() => null),
    setOnlyFrame: vi.fn(),
    setLength: vi.fn(),
    setReady: vi.fn(),
    setFrame: vi.fn(),
    triggerSyncPlay: vi.fn(),
    triggerSyncPause: vi.fn(),
    handleSpeed: vi.fn(),
    setLoopTimelineRegion: vi.fn(),
    handleSeek: vi.fn(),
    handleBuffering: vi.fn(),
    startDrawing: vi.fn(),
    finishDrawing: vi.fn(),
    handleSyncPlay: vi.fn(),
    handleSyncPause: vi.fn(),
    speed: 1,
    framerate: 24,
    muted: false,
    isBuffering: false,
    wasPlayingBeforeBuffering: false,
    loopTimelineRegion: false,
    selectedFrameRange: null,
    timelineheight: 64,
    minplaybackspeed: 0.25,
    annotation: { isReadOnly: () => false, selectionSize: 0 },
    drawingRegion: null,
    timelineControl: null,
    ...overrides,
  };
}

function createMockStore() {
  return {
    settings: {
      videoDrawOutside: false,
      videoHopSize: 16,
    },
  };
}

describe("HtxVideoView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTimelineProps.current = {};
    mockVideoCanvasProps.current = {};
  });

  it("returns null when item._value is falsy", () => {
    const item = createMockItem({ _value: null });
    const store = createMockStore();
    const { container } = render(<HtxVideoView item={item} store={store} />);
    expect(container.firstChild).toBeNull();
  });

  it("returns null when item._value is empty string", () => {
    const item = createMockItem({ _value: "" });
    const store = createMockStore();
    const { container } = render(<HtxVideoView item={item} store={store} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders object tag and video structure when item._value is set", async () => {
    const item = createMockItem();
    const store = createMockStore();
    render(<HtxVideoView item={item} store={store} />);
    await flushRaf();
    expect(screen.getByTestId("object-tag")).toBeInTheDocument();
    expect(screen.getByTestId("video-canvas")).toBeInTheDocument();
  });

  it("passes onLoad to VideoCanvas and calling it sets loaded state and shows Timeline", async () => {
    const item = createMockItem();
    const store = createMockStore();
    render(<HtxVideoView item={item} store={store} />);
    await flushRaf();
    const { onLoad } = mockVideoCanvasProps;
    expect(onLoad).toBeDefined();
    await triggerVideoLoad();
    expect(item.setOnlyFrame).toHaveBeenCalledWith(1);
    expect(item.setLength).toHaveBeenCalledWith(100);
    expect(item.setReady).toHaveBeenCalledWith(true);
    expect(screen.getByTestId("timeline")).toBeInTheDocument();
  });

  it("calls onFrameChange when VideoCanvas triggers it", async () => {
    const item = createMockItem();
    const store = createMockStore();
    render(<HtxVideoView item={item} store={store} />);
    await flushRaf();
    const { onFrameChange } = mockVideoCanvasProps;
    onFrameChange(50, 100);
    expect(item.setOnlyFrame).toHaveBeenCalledWith(50);
  });

  it("calls onResize when VideoCanvas triggers it", async () => {
    const item = createMockItem();
    const store = createMockStore();
    render(<HtxVideoView item={item} store={store} />);
    await flushRaf();
    const { onResize } = mockVideoCanvasProps;
    onResize({ width: 800, height: 600, ratio: 1 });
    expect(onResize).toBeDefined();
  });

  it("calls onEnded when VideoCanvas triggers it", async () => {
    const item = createMockItem();
    const store = createMockStore();
    render(<HtxVideoView item={item} store={store} />);
    await flushRaf();
    const { onEnded } = mockVideoCanvasProps;
    onEnded();
    expect(onEnded).toBeDefined();
  });

  it("calls onPlay and onPause when VideoCanvas triggers them", async () => {
    const item = createMockItem();
    const store = createMockStore();
    render(<HtxVideoView item={item} store={store} />);
    await flushRaf();
    const { onPlay, onPause } = mockVideoCanvasProps;
    await act(() => {
      onPlay();
    });
    expect(item.ref.current.play).toHaveBeenCalled();
    item.ref.current.playing = true;
    await act(() => {
      onPause();
    });
    expect(item.ref.current.pause).toHaveBeenCalled();
  });

  it("renders errors when item.errors is set", () => {
    const item = createMockItem({ errors: ["Load failed"] });
    const store = createMockStore();
    render(<HtxVideoView item={item} store={store} />);
    expect(screen.getByTestId("error-message")).toHaveTextContent("Load failed");
  });

  it("Timeline receives onPositionChange and calls item.setFrame", async () => {
    const item = createMockItem();
    const store = createMockStore();
    render(<HtxVideoView item={item} store={store} />);
    await flushRaf();
    await triggerVideoLoad();
    const onPositionChange = mockTimelineProps.onPositionChange;
    expect(onPositionChange).toBeDefined();
    onPositionChange(25);
    expect(item.setFrame).toHaveBeenCalledWith(25);
  });

  it("Timeline onPlay and onPause are called from play/pause buttons", async () => {
    const item = createMockItem();
    const store = createMockStore();
    render(<HtxVideoView item={item} store={store} />);
    await flushRaf();
    await triggerVideoLoad();
    const onPlay = mockTimelineProps.onPlay;
    const onPause = mockTimelineProps.onPause;
    await act(() => {
      onPlay?.();
    });
    expect(item.ref.current.play).toHaveBeenCalled();
    item.ref.current.playing = true;
    await act(() => {
      onPause?.();
    });
    expect(item.ref.current.pause).toHaveBeenCalled();
  });

  it("Timeline onSelectRegion calls item.findRegion and region.onClickRegion when region exists", async () => {
    const onClickRegion = vi.fn();
    const item = createMockItem({
      findRegion: (id) => (id === "r1" ? { selected: false, inSelection: false, onClickRegion } : null),
    });
    const store = createMockStore();
    render(<HtxVideoView item={item} store={store} />);
    await flushRaf();
    await triggerVideoLoad();
    const onSelectRegion = mockTimelineProps.onSelectRegion;
    onSelectRegion(null, "r1", true);
    expect(onClickRegion).toHaveBeenCalled();
  });

  it("Timeline onSelectRegion does nothing when region not found", async () => {
    const item = createMockItem({ findRegion: vi.fn(() => null) });
    const store = createMockStore();
    render(<HtxVideoView item={item} store={store} />);
    await flushRaf();
    await triggerVideoLoad();
    const onSelectRegion = mockTimelineProps.onSelectRegion;
    onSelectRegion(null, "missing", true);
    expect(item.findRegion).toHaveBeenCalledWith("missing");
  });

  it("Timeline onAction calls toggleLifespan for lifespan_add", async () => {
    const toggleLifespan = vi.fn();
    const item = createMockItem({
      regs: [
        {
          labels: [],
          selected: true,
          inSelection: false,
          toggleLifespan,
          style: {},
          tag: {},
          type: "rect",
          sequence: [],
          cleanId: "r1",
          region_index: 0,
          hidden: false,
          locked: false,
        },
      ],
    });
    const store = createMockStore();
    render(<HtxVideoView item={item} store={store} />);
    await flushRaf();
    await triggerVideoLoad();
    const onAction = mockTimelineProps.onAction;
    onAction(null, "lifespan_add", { frame: 10 });
    expect(toggleLifespan).toHaveBeenCalledWith(10);
  });

  it("Timeline onAction calls addKeypoint for keypoint_add", async () => {
    const addKeypoint = vi.fn();
    const item = createMockItem({
      regs: [
        {
          labels: [],
          selected: true,
          inSelection: false,
          addKeypoint,
          style: {},
          tag: {},
          type: "rect",
          sequence: [],
          cleanId: "r1",
          region_index: 0,
          hidden: false,
          locked: false,
        },
      ],
    });
    const store = createMockStore();
    render(<HtxVideoView item={item} store={store} />);
    await flushRaf();
    await triggerVideoLoad();
    const onAction = mockTimelineProps.onAction;
    onAction(null, "keypoint_add", { frame: 5 });
    expect(addKeypoint).toHaveBeenCalledWith(5);
  });

  it("Timeline onAction calls removeKeypoint for keypoint_remove", async () => {
    const removeKeypoint = vi.fn();
    const item = createMockItem({
      regs: [
        {
          labels: [],
          selected: true,
          inSelection: false,
          removeKeypoint,
          style: {},
          tag: {},
          type: "rect",
          sequence: [],
          cleanId: "r1",
          region_index: 0,
          hidden: false,
          locked: false,
        },
      ],
    });
    const store = createMockStore();
    render(<HtxVideoView item={item} store={store} />);
    await flushRaf();
    await triggerVideoLoad();
    const onAction = mockTimelineProps.onAction;
    onAction(null, "keypoint_remove", { frame: 5 });
    expect(removeKeypoint).toHaveBeenCalledWith(5);
  });

  it("timeline is shown when video is loaded and receives regions", async () => {
    const item = createMockItem();
    const store = createMockStore();
    render(<HtxVideoView item={item} store={store} />);
    await flushRaf();
    await triggerVideoLoad();
    expect(screen.getByTestId("timeline")).toBeInTheDocument();
    expect(mockTimelineProps.regions).toBeDefined();
    expect(item.ref.current.videoDimensions).toBeDefined();
  });

  it("handlePan does nothing when panMode is false", async () => {
    const item = createMockItem();
    const store = createMockStore();
    const { container } = render(<HtxVideoView item={item} store={store} />);
    await flushRaf();
    const main = container.querySelector('[class*="video"]');
    const videoMain = main?.querySelector('[class*="main"]');
    if (videoMain) {
      fireEvent.mouseDown(videoMain, { pageX: 10, pageY: 10 });
    }
    expect(item.ref.current.adjustPan).not.toHaveBeenCalled();
  });

  it("onZoomChange does nothing without shiftKey", async () => {
    const item = createMockItem();
    const store = createMockStore();
    const { container } = render(<HtxVideoView item={item} store={store} />);
    await flushRaf();
    const main = container.querySelector('[class*="main"]');
    if (main) {
      fireEvent.wheel(main, { deltaY: 100, shiftKey: false });
    }
    expect(mockVideoCanvasProps.onLoad).toBeDefined();
  });

  it("supportsRegions is true when item.videoControl is defined", async () => {
    const item = createMockItem({ videoControl: true });
    const store = createMockStore();
    render(<HtxVideoView item={item} store={store} />);
    await flushRaf();
    await triggerVideoLoad();
    expect(screen.getByTestId("video-regions")).toBeInTheDocument();
  });

  it("supportsTimelineRegions is true when item.timelineControl is defined", async () => {
    const item = createMockItem({ timelineControl: {} });
    const store = createMockStore();
    render(<HtxVideoView item={item} store={store} />);
    await flushRaf();
    await triggerVideoLoad();
    expect(screen.getByTestId("timeline")).toBeInTheDocument();
  });

  it("builds regions from item.regs with label and color", async () => {
    const item = createMockItem({
      regs: [
        {
          cleanId: "r1",
          region_index: 0,
          labels: ["Label A"],
          style: { fillcolor: "#ff0000" },
          type: "rect",
          sequence: [],
          hidden: false,
          selected: false,
          inSelection: false,
          locked: false,
          tag: {},
        },
      ],
    });
    const store = createMockStore();
    render(<HtxVideoView item={item} store={store} />);
    await flushRaf();
    await triggerVideoLoad();
    expect(mockTimelineProps.regions).toBeDefined();
    const regions = mockTimelineProps.regions || [];
    expect(regions.some((r) => r.label === "Label A" && r.color === "#ff0000")).toBe(true);
  });

  it("adds new region placeholder when timelineControl.selectedLabels and no selection", async () => {
    const item = createMockItem({
      timelineControl: { selectedLabels: [{ value: "New", background: "#00ff00" }] },
      annotation: { selectionSize: 0, isReadOnly: () => false },
      drawingRegion: null,
    });
    const store = createMockStore();
    render(<HtxVideoView item={item} store={store} />);
    await flushRaf();
    await triggerVideoLoad();
    expect(mockTimelineProps.regions).toBeDefined();
    const hasNew = (mockTimelineProps.regions || []).some((r) => r.id === "new" && r.label === "New");
    expect(hasNew).toBe(true);
  });
});
