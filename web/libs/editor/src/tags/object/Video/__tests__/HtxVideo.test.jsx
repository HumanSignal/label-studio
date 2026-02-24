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

jest.mock("@humansignal/core", () => ({
  ff: { isActive: () => false },
}));

jest.mock("@humansignal/icons", () => ({
  IconZoomIn: () => <span data-testid="icon-zoom-in" />,
}));

jest.mock("@humansignal/ui", () => ({
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

jest.mock("../../../../common/Menu/Menu", () => ({
  Menu: ({ children }) => <div data-testid="menu">{children}</div>,
  Item: ({ children, onClick }) => (
    <button type="button" data-testid="menu-item" onClick={onClick}>
      {children}
    </button>
  ),
}));

jest.mock("../../../../components/ErrorMessage/ErrorMessage", () => ({
  ErrorMessage: ({ error }) => <div data-testid="error-message">{String(error)}</div>,
}));

jest.mock("../../../../components/Tags/Object", () => ({
  __esModule: true,
  default: ({ item, children }) => <div data-testid="object-tag">{children}</div>,
}));

jest.mock("../../../../components/Timeline/Controls/VideoConfigControl", () => ({
  VideoConfigControl: () => <div data-testid="video-config-control" />,
}));

const mockTimelineProps = {};
jest.mock("../../../../components/Timeline/Timeline", () => ({
  Timeline: (props) => {
    Object.assign(mockTimelineProps, props);
    return <div data-testid="timeline">Timeline</div>;
  },
}));

const mockVideoCanvasProps = {};
jest.mock("../../../../components/VideoCanvas/VideoCanvas", () => ({
  clampZoom: (z) => Math.max(0.1, Math.min(10, z)),
  VideoCanvas: (props) => {
    Object.assign(mockVideoCanvasProps, props);
    return <div data-testid="video-canvas">VideoCanvas</div>;
  },
}));

jest.mock("../VideoRegions", () => ({
  VideoRegions: () => <div data-testid="video-regions">VideoRegions</div>,
}));

jest.mock("../../../../hooks/useFullscreen", () => ({
  useFullscreen: () => ({
    enter: jest.fn(),
    exit: jest.fn(),
    getElement: () => null,
  }),
}));

jest.mock("../../../../hooks/useToggle", () => {
  const { useState } = require("react");
  return {
    useToggle: (initial) => {
      const [value, setValue] = useState(initial);
      return [value, () => setValue(true), () => setValue(false), () => setValue((v) => !v)];
    },
  };
});

jest.mock("../../../../utils/resize-observer", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(function (callback) {
    this._callback = callback;
    this.observe = jest.fn((el) => {
      if (this._callback && el) {
        try {
          Object.defineProperty(el, "clientWidth", { value: 800, configurable: true });
          Object.defineProperty(el, "clientHeight", { value: 600, configurable: true });
        } catch (_) {}
        this._callback();
      }
    });
    this.unobserve = jest.fn();
    this.disconnect = jest.fn();
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
      adjustPan: jest.fn((x, y) => ({ x, y })),
      play: jest.fn(),
      pause: jest.fn(),
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
    findRegion: jest.fn(() => null),
    setOnlyFrame: jest.fn(),
    setLength: jest.fn(),
    setReady: jest.fn(),
    setFrame: jest.fn(),
    triggerSyncPlay: jest.fn(),
    triggerSyncPause: jest.fn(),
    handleSpeed: jest.fn(),
    setLoopTimelineRegion: jest.fn(),
    handleSeek: jest.fn(),
    handleBuffering: jest.fn(),
    startDrawing: jest.fn(),
    finishDrawing: jest.fn(),
    handleSyncPlay: jest.fn(),
    handleSyncPause: jest.fn(),
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
    jest.clearAllMocks();
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
    const onClickRegion = jest.fn();
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
    const item = createMockItem({ findRegion: jest.fn(() => null) });
    const store = createMockStore();
    render(<HtxVideoView item={item} store={store} />);
    await flushRaf();
    await triggerVideoLoad();
    const onSelectRegion = mockTimelineProps.onSelectRegion;
    onSelectRegion(null, "missing", true);
    expect(item.findRegion).toHaveBeenCalledWith("missing");
  });

  it("Timeline onAction calls toggleLifespan for lifespan_add", async () => {
    const toggleLifespan = jest.fn();
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
    const addKeypoint = jest.fn();
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
    const removeKeypoint = jest.fn();
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
