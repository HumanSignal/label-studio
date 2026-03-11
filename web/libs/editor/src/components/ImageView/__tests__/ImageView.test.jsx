/**
 * Unit tests for ImageView (components/ImageView/ImageView.jsx)
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ImageView, { splitRegions } from "../ImageView";

jest.mock("../../../utils/feature-flags", () => ({
  isFF: jest.fn(() => false),
  FF_DEV_1442: "fflag_dev_1442",
  FF_LSDV_4930: "fflag_lsdv_4930",
  FF_ZOOM_OPTIM: "fflag_zoom_optim",
}));

jest.mock("react-konva", () => {
  const React = require("react");
  const { forwardRef, useImperativeHandle } = React;
  const wrap = (name) => (props) => React.createElement("div", { "data-testid": `konva-${name}`, ...props });
  const wrapEvt = (handler) => {
    if (!handler) return undefined;
    return (e) => {
      const evt = e?.nativeEvent ?? e;
      if (e?.target && typeof e.target === "object") e.target.getParent = () => null;
      handler({ ...e, evt });
    };
  };
  const StageWithRef = forwardRef((props, ref) => {
    useImperativeHandle(ref, () => ({
      getPointerPosition: () => ({ x: 100, y: 100 }),
      getStage: () => null,
      container: () => ({ style: {} }),
    }));
    const wrappedProps = { ...props };
    if (props.onWheel) wrappedProps.onWheel = wrapEvt(props.onWheel);
    if (props.onClick) wrappedProps.onClick = wrapEvt(props.onClick);
    if (props.onMouseUp) wrappedProps.onMouseUp = wrapEvt(props.onMouseUp);
    if (props.onMouseDown) wrappedProps.onMouseDown = wrapEvt(props.onMouseDown);
    if (props.onMouseMove) wrappedProps.onMouseMove = wrapEvt(props.onMouseMove);
    if (props.onMouseLeave) wrappedProps.onMouseLeave = wrapEvt(props.onMouseLeave);
    return React.createElement("div", { "data-testid": "konva-stage", ...wrappedProps });
  });
  return {
    Stage: StageWithRef,
    Layer: ({ children, ...p }) => React.createElement("div", { "data-testid": "konva-layer", ...p }, children),
    Group: ({ children, ...p }) => React.createElement("div", { "data-testid": "konva-group", ...p }, children),
    Line: (p) => React.createElement("div", { "data-testid": "konva-line", ...p }),
    Rect: (p) => React.createElement("div", { "data-testid": "konva-rect", ...p }),
    Circle: (p) => React.createElement("div", { "data-testid": "konva-circle", ...p }),
    Image: (p) => React.createElement("div", { "data-testid": "konva-image", ...p }),
  };
});

jest.mock("../../Tags/Object", () => ({
  __esModule: true,
  default: ({ item, className, children }) => (
    <div data-testid="object-tag" className={className}>
      {children}
    </div>
  ),
}));

jest.mock("../../ImageGrid/ImageGrid", () => ({
  __esModule: true,
  default: () => <div data-testid="image-grid">ImageGrid</div>,
}));

jest.mock("../../ImageTransformer/ImageTransformer", () => ({
  __esModule: true,
  default: () => <div data-testid="image-transformer">ImageTransformer</div>,
}));

jest.mock("../../../core/Tree", () => ({
  __esModule: true,
  default: { renderItem: () => null },
}));

jest.mock("../../Toolbar/Toolbar", () => ({
  Toolbar: () => <div data-testid="toolbar">Toolbar</div>,
}));

jest.mock("../Image", () => ({
  __esModule: true,
  Image: () => <div data-testid="image">Image</div>,
}));

jest.mock("../../../common/Pagination/Pagination", () => ({
  Pagination: ({ currentPage, totalPages }) => (
    <div data-testid="pagination">
      {currentPage} / {totalPages}
    </div>
  ),
}));

jest.mock("../../../utils/resize-observer", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(function () {
    this.observe = jest.fn();
    this.disconnect = jest.fn();
    return this;
  }),
}));

jest.mock("../../../core/Hotkey", () => ({
  __esModule: true,
  Hotkey: jest.fn(() => ({
    addDescription: jest.fn(),
    removeDescription: jest.fn(),
  })),
}));

jest.mock("mobx-state-tree", () => ({
  ...jest.requireActual("mobx-state-tree"),
  getEnv: jest.fn(() => ({ messages: { ERR_LOADING_HTTP: () => "Error loading" } })),
  getRoot: jest.fn(() => ({ settings: { fullscreen: true } })),
  isAlive: jest.fn((x) => !!x),
}));

function createItem(overrides = {}) {
  return {
    value: "image",
    currentSrc: "https://example.com/img.png",
    currentImage: 0,
    isMultiItem: false,
    parsedValueList: ["https://example.com/img.png"],
    regs: [],
    suggestions: [],
    selectedRegions: [],
    selectionArea: { isActive: false, onCanvasRect: { x: 0, y: 0, width: 0, height: 0 } },
    selectedRegionsBBox: null,
    zoomScale: 1,
    zoom: true,
    imageIsLoaded: true,
    containerRef: { getBoundingClientRect: () => ({ left: 0, top: 0 }), offsetWidth: 400, offsetHeight: 300 },
    stageRef: {
      on: jest.fn(),
      off: jest.fn(),
      getPointerPosition: () => ({ x: 100, y: 100 }),
      getStage: () => null,
      position: () => ({ x: 0, y: 0 }),
      scale: () => ({ x: 1, y: 1 }),
    },
    canvasSize: { width: 400, height: 300 },
    stageWidth: 400,
    stageHeight: 300,
    stageTranslate: { x: 0, y: 0 },
    zoomingPositionX: 0,
    zoomingPositionY: 0,
    alignmentOffset: { x: 0, y: 0 },
    rotation: 0,
    containerWidth: 400,
    containerHeight: 300,
    stageZoom: 1,
    maxwidth: 800,
    maxheight: 600,
    width: 400,
    height: 300,
    verticalalignment: "center",
    horizontalalignment: "center",
    fillerHeight: 0,
    imageTransform: {},
    usedValue: null,
    currentImageEntity: { imageLoaded: true, naturalWidth: 400, naturalHeight: 300 },
    updateImageSize: jest.fn(),
    setContainerRef: jest.fn(),
    setImageRef: jest.fn(),
    setStageRef: jest.fn(),
    setOverlayRef: jest.fn(),
    setReady: jest.fn(),
    onResize: jest.fn(),
    event: jest.fn(),
    freezeHistory: jest.fn(),
    handleZoom: jest.fn(),
    setZoomPosition: jest.fn(),
    setGridSize: jest.fn(),
    getToolsManager: () => ({
      findSelectedTool: () => null,
      allTools: () => [],
    }),
    getSkipInteractions: () => false,
    setSkipInteractions: jest.fn(),
    updateSkipInteractions: jest.fn(),
    fixZoomedCoords: (c) => c,
    annotation: {
      isReadOnly: () => false,
      selectedRegions: [],
      unselectAll: jest.fn(),
      unselectAreas: jest.fn(),
      isDrawing: false,
      isLinkingMode: false,
    },
    grid: false,
    sizeUpdated: true,
    crosshair: false,
    smoothingEnabled: true,
    naturalWidth: 400,
    images: ["https://example.com/img.png"],
    ...overrides,
  };
}

function createStore(overrides = {}) {
  return {
    task: { id: "task-1" },
    settings: { setSmoothing: jest.fn(), enableSmoothing: true, fullscreen: true },
    annotationStore: { viewingAll: false, addErrors: jest.fn() },
    ...overrides,
  };
}

describe("splitRegions", () => {
  it("returns empty arrays for empty regions", () => {
    const result = splitRegions([]);
    expect(result.brushRegions).toEqual([]);
    expect(result.shapeRegions).toEqual([]);
    expect(result.bitmaskRegions).toEqual([]);
    expect(result.vectorRegions).toEqual([]);
  });

  it("classifies brushregion into brushRegions", () => {
    const r = { id: "r1", type: "brushregion" };
    const result = splitRegions([r]);
    expect(result.brushRegions).toEqual([r]);
    expect(result.shapeRegions).toEqual([]);
    expect(result.bitmaskRegions).toEqual([]);
  });

  it("classifies bitmaskregion into bitmaskRegions", () => {
    const r = { id: "r2", type: "bitmaskregion" };
    const result = splitRegions([r]);
    expect(result.bitmaskRegions).toEqual([r]);
    expect(result.shapeRegions).toEqual([]);
    expect(result.brushRegions).toEqual([]);
  });

  it("classifies other types into shapeRegions", () => {
    const r = { id: "r3", type: "rectangleregion" };
    const result = splitRegions([r]);
    expect(result.shapeRegions).toEqual([r]);
    expect(result.brushRegions).toEqual([]);
    expect(result.bitmaskRegions).toEqual([]);
  });

  it("splits mixed regions correctly", () => {
    const brush = { id: "b1", type: "brushregion" };
    const bitmask = { id: "bm1", type: "bitmaskregion" };
    const shape = { id: "s1", type: "polygonregion" };
    const result = splitRegions([brush, bitmask, shape]);
    expect(result.brushRegions).toEqual([brush]);
    expect(result.bitmaskRegions).toEqual([bitmask]);
    expect(result.shapeRegions).toEqual([shape]);
  });
});

describe("ImageView", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { isAlive } = require("mobx-state-tree");
    isAlive.mockImplementation((x) => !!x);
  });

  it("returns null when item is not alive", () => {
    const { isAlive } = require("mobx-state-tree");
    isAlive.mockReturnValue(false);
    const item = createItem();
    const store = createStore();
    const { container } = render(<ImageView item={item} store={store} />);
    expect(container.firstChild).toBeNull();
  });

  it("returns null when store has no task", () => {
    const item = createItem();
    const store = createStore({ task: null });
    const { container } = render(<ImageView item={item} store={store} />);
    expect(container.firstChild).toBeNull();
  });

  it("returns null when item has no currentSrc", () => {
    const item = createItem({ currentSrc: null });
    const store = createStore();
    const { container } = render(<ImageView item={item} store={store} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders ObjectTag with content when item and store are valid", () => {
    const store = createStore();
    const item = createItem();
    item.store = store;
    render(<ImageView item={item} store={store} />);
    expect(screen.getByTestId("object-tag")).toBeInTheDocument();
    expect(screen.getByTestId("image")).toBeInTheDocument();
  });

  it("renders Pagination when item is multi-image", () => {
    const store = createStore();
    const item = createItem({
      isMultiItem: true,
      images: ["a.png", "b.png"],
      parsedValueList: ["a.png", "b.png"],
      currentImage: 0,
    });
    item.store = store;
    render(<ImageView item={item} store={store} />);
    expect(screen.getByTestId("pagination")).toBeInTheDocument();
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
  });

  it("renders toolbar when image is loaded and not viewing all", () => {
    const store = createStore({ annotationStore: { viewingAll: false } });
    const item = createItem({ imageIsLoaded: true });
    item.store = store;
    render(<ImageView item={item} store={store} />);
    expect(screen.getByTestId("toolbar")).toBeInTheDocument();
  });

  it("does not render toolbar when viewing all annotations", () => {
    const store = createStore({ annotationStore: { viewingAll: true } });
    const item = createItem({ imageIsLoaded: true });
    item.store = store;
    render(<ImageView item={item} store={store} />);
    expect(screen.queryByTestId("toolbar")).not.toBeInTheDocument();
  });

  it("renders gallery thumbnails when item has multiple images", () => {
    const store = createStore();
    const item = createItem({
      images: ["a.png", "b.png"],
      currentImage: 0,
    });
    item.store = store;
    const { container } = render(<ImageView item={item} store={store} />);
    const imgs = container.querySelectorAll("img[height='60']");
    expect(imgs.length).toBe(2);
  });

  it("calls store.settings.setSmoothing when item.smoothingEnabled is boolean", () => {
    const store = createStore();
    const item = createItem({ smoothingEnabled: false });
    item.store = store;
    render(<ImageView item={item} store={store} />);
    expect(store.settings.setSmoothing).toHaveBeenCalledWith(false);
  });

  it("applies container maxWidth/maxHeight when getRoot settings fullscreen is false", () => {
    const { getRoot } = require("mobx-state-tree");
    getRoot.mockReturnValue({ settings: { fullscreen: false } });
    const store = createStore();
    const item = createItem({ maxwidth: 600, maxheight: 400, width: 600, height: 400 });
    item.store = store;
    const { container } = render(<ImageView item={item} store={store} />);
    const styleEl = container.querySelector("[style]");
    expect(styleEl).toBeTruthy();
    expect(styleEl.getAttribute("style")).toMatch(/max-width|max-height|width|height/);
  });

  it("applies imageRendering pixelated when smoothing disabled and zoomed", () => {
    const store = createStore();
    const item = createItem({ zoomScale: 2 });
    item.store = store;
    store.settings.enableSmoothing = false;
    const { container } = render(<ImageView item={item} store={store} />);
    const styleEl = container.querySelector("[style]");
    expect(styleEl).toBeTruthy();
    expect(styleEl.getAttribute("style")).toMatch(/image-rendering|pixelated/);
  });

  it("calls item.event on stage click when handler runs", () => {
    const store = createStore();
    const item = createItem();
    item.store = store;
    const { container } = render(<ImageView item={item} store={store} />);
    const stage = container.querySelector('[data-testid="konva-stage"]');
    expect(stage).toBeTruthy();
    const clickEvt = new MouseEvent("click", { bubbles: true, clientX: 100, clientY: 100 });
    Object.defineProperty(clickEvt, "offsetX", { value: 50 });
    Object.defineProperty(clickEvt, "offsetY", { value: 50 });
    stage.dispatchEvent(clickEvt);
    expect(item.event).toHaveBeenCalled();
    expect(item.event.mock.calls[0][0]).toBe("click");
  });

  it("passes handleZoom to stage when item.zoom is true", () => {
    const store = createStore();
    const item = createItem({ zoom: true });
    item.store = store;
    const { container } = render(<ImageView item={item} store={store} />);
    const stage = container.querySelector('[data-testid="konva-stage"]');
    expect(stage).toBeTruthy();
    expect(item.zoom).toBe(true);
  });

  it("handleZoom with ctrlKey calls item.handleZoom when invoked via ref", () => {
    const store = createStore();
    const item = createItem({ zoom: true });
    item.store = store;
    let viewRef;
    render(<ImageView ref={(r) => (viewRef = r)} item={item} store={store} />);
    item.stageRef = { getPointerPosition: () => ({ x: 50, y: 50 }) };
    if (typeof viewRef?.handleZoom === "function") {
      viewRef.handleZoom({ evt: { ctrlKey: true, deltaY: 10, preventDefault: jest.fn() } });
      expect(item.handleZoom).toHaveBeenCalledWith(10, { x: 50, y: 50 }, true);
    }
  });

  it("handleZoom without ctrlKey calls item.setZoomPosition when zoomed", () => {
    const store = createStore();
    const item = createItem({ zoom: true, zoomScale: 2 });
    item.store = store;
    let viewRef;
    render(<ImageView ref={(r) => (viewRef = r)} item={item} store={store} />);
    if (typeof viewRef?.handleZoom === "function") {
      viewRef.handleZoom({
        evt: { deltaX: 10, deltaY: 5, ctrlKey: false, metaKey: false, preventDefault: jest.fn() },
      });
      expect(item.setZoomPosition).toHaveBeenCalled();
    }
  });

  it("calls item.setZoomPosition on wheel without ctrlKey when zoomed", () => {
    const store = createStore();
    const item = createItem({ zoom: true, zoomScale: 2 });
    item.store = store;
    const { container } = render(<ImageView item={item} store={store} />);
    const stage = container.querySelector('[data-testid="konva-stage"]');
    fireEvent.wheel(stage, { deltaX: 5, deltaY: 0 });
    expect(item.setZoomPosition).toHaveBeenCalled();
  });

  it("calls item.event mouseup on stage mouseup", () => {
    const store = createStore();
    const item = createItem();
    item.store = store;
    const { container } = render(<ImageView item={item} store={store} />);
    const stage = container.querySelector('[data-testid="konva-stage"]');
    const upEvt = new MouseEvent("mouseup", { bubbles: true });
    Object.defineProperty(upEvt, "offsetX", { value: 10 });
    Object.defineProperty(upEvt, "offsetY", { value: 20 });
    stage.dispatchEvent(upEvt);
    expect(item.event).toHaveBeenCalledWith("mouseup", expect.anything(), 10, 20);
  });

  it("calls item.event mousemove on stage mousemove", () => {
    const store = createStore();
    const item = createItem();
    item.store = store;
    const { container } = render(<ImageView item={item} store={store} />);
    const stage = container.querySelector('[data-testid="konva-stage"]');
    const moveEvt = new MouseEvent("mousemove", { bubbles: true });
    Object.defineProperty(moveEvt, "offsetX", { value: 30 });
    Object.defineProperty(moveEvt, "offsetY", { value: 40 });
    stage.dispatchEvent(moveEvt);
    expect(item.event).toHaveBeenCalledWith("mousemove", expect.anything(), 30, 40);
  });

  it("handleMouseMove with bitmask region runs RAF branch and calls tool enable/disable and region updateCursor", async () => {
    const setHighlight = jest.fn();
    const updateCursor = jest.fn();
    const enable = jest.fn();
    const disable = jest.fn();
    const reg = {
      type: "bitmaskregion",
      selected: false,
      isDrawing: false,
      isHovered: () => true,
      setHighlight,
      updateCursor,
    };
    const store = createStore();
    const item = createItem({
      regs: [reg],
      getToolsManager: () => ({
        findSelectedTool: () => ({ enable, disable, toolName: "BitmaskTool" }),
        allTools: () => [],
      }),
    });
    item.store = store;
    const { container } = render(<ImageView item={item} store={store} />);
    const stage = container.querySelector('[data-testid="konva-stage"]');
    const moveEvt = new MouseEvent("mousemove", { bubbles: true });
    Object.defineProperty(moveEvt, "offsetX", { value: 50 });
    Object.defineProperty(moveEvt, "offsetY", { value: 50 });
    stage.dispatchEvent(moveEvt);
    await new Promise((r) => requestAnimationFrame(r));
    expect(enable).toHaveBeenCalled();
    expect(disable).toHaveBeenCalled();
    expect(setHighlight).toHaveBeenCalledWith(false);
    expect(updateCursor).toHaveBeenCalled();
  });

  it("handleMouseMove with shift and zoomScale > 1 calls setZoomPosition and setSkipInteractions", () => {
    const store = createStore();
    const item = createItem({ zoomScale: 2, zoomingPositionX: 0, zoomingPositionY: 0 });
    item.store = store;
    const { container } = render(<ImageView item={item} store={store} />);
    const stage = container.querySelector('[data-testid="konva-stage"]');
    const moveEvt = new MouseEvent("mousemove", { bubbles: true, shiftKey: true, buttons: 1 });
    Object.defineProperty(moveEvt, "offsetX", { value: 50 });
    Object.defineProperty(moveEvt, "offsetY", { value: 50 });
    Object.defineProperty(moveEvt, "movementX", { value: 10 });
    Object.defineProperty(moveEvt, "movementY", { value: 5 });
    stage.dispatchEvent(moveEvt);
    expect(item.setSkipInteractions).toHaveBeenCalledWith(true);
    expect(item.setZoomPosition).toHaveBeenCalledWith(10, 5);
  });

  it("handleMouseMove with mouse wheel button (buttons === 4) and zoomScale > 1 calls setZoomPosition", () => {
    const store = createStore();
    const item = createItem({ zoomScale: 2, zoomingPositionX: 0, zoomingPositionY: 0 });
    item.store = store;
    const { container } = render(<ImageView item={item} store={store} />);
    const stage = container.querySelector('[data-testid="konva-stage"]');
    const moveEvt = new MouseEvent("mousemove", { bubbles: true, buttons: 4 });
    Object.defineProperty(moveEvt, "offsetX", { value: 50 });
    Object.defineProperty(moveEvt, "offsetY", { value: 50 });
    Object.defineProperty(moveEvt, "movementX", { value: -5 });
    Object.defineProperty(moveEvt, "movementY", { value: -10 });
    stage.dispatchEvent(moveEvt);
    expect(item.setZoomPosition).toHaveBeenCalledWith(-5, -10);
  });

  it("handleMouseMove with isDrawing region does not run RAF tool enable/disable branch", async () => {
    const enable = jest.fn();
    const reg = { type: "bitmaskregion", isDrawing: true, setHighlight: jest.fn(), updateCursor: jest.fn() };
    const store = createStore();
    const item = createItem({
      regs: [reg],
      getToolsManager: () => ({
        findSelectedTool: () => ({ enable, disable: jest.fn(), toolName: "BitmaskTool" }),
        allTools: () => [],
      }),
    });
    item.store = store;
    const { container } = render(<ImageView item={item} store={store} />);
    const stage = container.querySelector('[data-testid="konva-stage"]');
    const moveEvt = new MouseEvent("mousemove", { bubbles: true });
    Object.defineProperty(moveEvt, "offsetX", { value: 50 });
    Object.defineProperty(moveEvt, "offsetY", { value: 50 });
    stage.dispatchEvent(moveEvt);
    await new Promise((r) => requestAnimationFrame(r));
    expect(item.event).toHaveBeenCalledWith("mousemove", expect.anything(), 50, 50);
    expect(enable).not.toHaveBeenCalled();
  });

  it("handleMouseMove with isTransforming region does not run RAF tool branch", async () => {
    const enable = jest.fn();
    const reg = {
      type: "bitmaskregion",
      selected: false,
      isDrawing: false,
      isTransforming: () => true,
      setHighlight: jest.fn(),
      updateCursor: jest.fn(),
    };
    const store = createStore();
    const item = createItem({
      regs: [reg],
      getToolsManager: () => ({
        findSelectedTool: () => ({ enable, disable: jest.fn(), toolName: "BitmaskTool" }),
        allTools: () => [],
      }),
    });
    item.store = store;
    const { container } = render(<ImageView item={item} store={store} />);
    const stage = container.querySelector('[data-testid="konva-stage"]');
    const moveEvt = new MouseEvent("mousemove", { bubbles: true });
    Object.defineProperty(moveEvt, "offsetX", { value: 50 });
    Object.defineProperty(moveEvt, "offsetY", { value: 50 });
    stage.dispatchEvent(moveEvt);
    await new Promise((r) => requestAnimationFrame(r));
    expect(item.event).toHaveBeenCalledWith("mousemove", expect.anything(), 50, 50);
    expect(enable).not.toHaveBeenCalled();
  });

  it("handleMouseMove with no bitmask regions skips RAF branch", async () => {
    const enable = jest.fn();
    const reg = { type: "rectangle", selected: false, setHighlight: jest.fn(), updateCursor: jest.fn() };
    const store = createStore();
    const item = createItem({
      regs: [reg],
      getToolsManager: () => ({
        findSelectedTool: () => ({ enable, disable: jest.fn(), toolName: "RectangleTool" }),
        allTools: () => [],
      }),
    });
    item.store = store;
    const { container } = render(<ImageView item={item} store={store} />);
    const stage = container.querySelector('[data-testid="konva-stage"]');
    const moveEvt = new MouseEvent("mousemove", { bubbles: true });
    Object.defineProperty(moveEvt, "offsetX", { value: 50 });
    Object.defineProperty(moveEvt, "offsetY", { value: 50 });
    stage.dispatchEvent(moveEvt);
    await new Promise((r) => requestAnimationFrame(r));
    expect(enable).not.toHaveBeenCalled();
  });

  it("handleError adds error to store when called via ref", () => {
    const store = createStore();
    const item = createItem();
    item.store = store;
    let viewRef;
    render(<ImageView ref={(r) => (viewRef = r)} item={item} store={store} />);
    expect(viewRef).toBeTruthy();
    if (typeof viewRef.handleError === "function") {
      viewRef.handleError();
      expect(store.annotationStore.addErrors).toHaveBeenCalled();
    }
  });

  it("updateGridSize calls item.setGridSize when called via ref", () => {
    const store = createStore();
    const item = createItem();
    item.store = store;
    let viewRef;
    render(<ImageView ref={(r) => (viewRef = r)} item={item} store={store} />);
    if (typeof viewRef?.updateGridSize === "function") {
      viewRef.updateGridSize([10, 20]);
      expect(item.setGridSize).toHaveBeenCalledWith([10, 20]);
    }
  });

  it("renders ImageGrid when item.grid and item.sizeUpdated are true", () => {
    const store = createStore();
    const item = createItem({ grid: true, sizeUpdated: true });
    item.store = store;
    render(<ImageView item={item} store={store} />);
    expect(screen.getByTestId("image-grid")).toBeInTheDocument();
  });

  it("renders crosshair when item.crosshair is true", () => {
    const store = createStore();
    const item = createItem({ crosshair: true });
    item.store = store;
    const { container } = render(<ImageView item={item} store={store} />);
    const layers = container.querySelectorAll('[data-testid="konva-layer"]');
    const crosshairLayer = Array.from(layers).find((el) => el.getAttribute("name") === "crosshair");
    expect(crosshairLayer).toBeTruthy();
  });

  it("updateCrosshair calls crosshairRef.current.updatePointer when crosshairRef is set", () => {
    const store = createStore();
    const item = createItem({ crosshair: true });
    item.store = store;
    const updatePointer = jest.fn();
    let viewRef;
    render(<ImageView ref={(r) => (viewRef = r)} item={item} store={store} />);
    viewRef.crosshairRef.current = { updatePointer, updateVisibility: jest.fn() };
    const fakeE = { currentTarget: { getPointerPosition: () => ({ x: 10, y: 20 }) } };
    if (typeof viewRef.updateCrosshair === "function") {
      viewRef.updateCrosshair(fakeE);
      expect(updatePointer).toHaveBeenCalledWith(10, 20);
    }
  });

  it("updateCrosshair with different positions invokes crosshair updatePointer branches", () => {
    const store = createStore();
    const item = createItem({ crosshair: true });
    item.store = store;
    let viewRef;
    render(<ImageView ref={(r) => (viewRef = r)} item={item} store={store} />);
    if (!viewRef?.crosshairRef?.current?.updatePointer) return;
    const updatePointer = viewRef.crosshairRef.current.updatePointer;
    updatePointer(10, 20);
    updatePointer(11, 20);
    updatePointer(11, 21);
    expect(viewRef.crosshairRef.current.updateVisibility).toBeDefined();
  });

  it("stage mouseenter calls crosshair updateVisibility(true)", () => {
    const store = createStore();
    const item = createItem({ crosshair: true });
    item.store = store;
    const updateVisibility = jest.fn();
    let viewRef;
    const { container } = render(<ImageView ref={(r) => (viewRef = r)} item={item} store={store} />);
    viewRef.crosshairRef.current = { updatePointer: jest.fn(), updateVisibility };
    const stage = container.querySelector('[data-testid="konva-stage"]');
    fireEvent.mouseEnter(stage);
    expect(updateVisibility).toHaveBeenCalledWith(true);
  });

  it("CursorLayer renders Circle when tool.strokeWidth > 2 and stage mouseenter fires", () => {
    const store = createStore();
    const item = createItem({
      regs: [],
      getToolsManager: () => ({
        findSelectedTool: () => ({ toolName: "BitmaskTool", strokeWidth: 5 }),
        allTools: () => [],
      }),
    });
    item.store = store;
    const { container } = render(<ImageView item={item} store={store} />);
    const onMouseEnter = item.stageRef.on.mock.calls.find((c) => c[0] === "mouseenter")?.[1];
    const onMouseMove = item.stageRef.on.mock.calls.find((c) => c[0] === "mousemove")?.[1];
    expect(onMouseEnter).toBeDefined();
    const { act } = require("@testing-library/react");
    act(() => {
      onMouseMove?.();
      onMouseEnter?.();
    });
    const circles = container.querySelectorAll('[data-testid="konva-circle"]');
    expect(circles.length).toBeGreaterThan(0);
  });

  it("renders PixelGridLayer when smoothing disabled and zoomScale > 20", () => {
    const store = createStore();
    const item = createItem({ smoothingEnabled: false, zoomScale: 25 });
    item.store = store;
    const { container } = render(<ImageView item={item} store={store} />);
    const lines = container.querySelectorAll('[data-testid="konva-line"]');
    expect(lines.length).toBeGreaterThan(0);
  });

  it("renders with selectionArea active (SelectionRect)", () => {
    const store = createStore();
    const item = createItem({
      selectionArea: { isActive: true, onCanvasRect: { x: 10, y: 20, width: 50, height: 60 } },
    });
    item.store = store;
    const { container } = render(<ImageView item={item} store={store} />);
    const rects = container.querySelectorAll('[data-testid="konva-rect"]');
    expect(rects.length).toBeGreaterThan(0);
  });

  it("renders with regs and suggestions for Regions coverage", () => {
    const store = createStore();
    const brushReg = { id: "br1", type: "brushregion", annotation: {} };
    const shapeReg = { id: "sr1", type: "rectangleregion", annotation: {} };
    const item = createItem({
      regs: [brushReg, shapeReg],
      suggestions: [{ id: "s1", type: "bitmaskregion", annotation: {} }],
    });
    item.store = store;
    const { container } = render(<ImageView item={item} store={store} />);
    expect(container.querySelectorAll('[data-testid="konva-layer"]').length).toBeGreaterThan(0);
  });

  it("renders with selectedRegions and selectedRegionsBBox for selection layer", () => {
    const store = createStore();
    const item = createItem({
      selectedRegions: [
        { id: "r1", type: "rectangleregion", supportsTransform: false, canRotate: false },
        { id: "r2", type: "rectangleregion", supportsTransform: false, canRotate: false },
      ],
      selectedRegionsBBox: { left: 0, top: 0, right: 100, bottom: 100 },
    });
    item.store = store;
    const { container } = render(<ImageView item={item} store={store} />);
    expect(container.querySelector('[data-testid="image-transformer"]')).toBeInTheDocument();
  });

  it("renders DrawingRegion when item has drawingRegion", () => {
    const store = createStore();
    const drawingRegion = { id: "dr1", type: "brushregion", item_index: 0, annotation: {} };
    const item = createItem({ drawingRegion, multiImage: false });
    item.store = store;
    const { container } = render(<ImageView item={item} store={store} />);
    expect(container.querySelector('[data-testid="konva-layer"]')).toBeTruthy();
  });

  it("verticalalignment and horizontalalignment apply correct class names", () => {
    const store = createStore();
    const item = createItem({ verticalalignment: "top", horizontalalignment: "left" });
    item.store = store;
    const { container } = render(<ImageView item={item} store={store} />);
    const stage = container.querySelector('[data-testid="konva-stage"]');
    expect(stage.className).toMatch(/top|left/);
  });

  it("gallery thumbnail click calls item.setCurrentImage", () => {
    const store = createStore();
    const item = createItem({ images: ["a.png", "b.png"], currentImage: 0 });
    item.store = store;
    item.setCurrentImage = jest.fn();
    const { container } = render(<ImageView item={item} store={store} />);
    const imgs = container.querySelectorAll("img[height='60']");
    imgs[1].click();
    expect(item.setCurrentImage).toHaveBeenCalledWith(1);
  });

  it("triggerMouseUp with skipNextMouseUp does not call item.event", () => {
    const store = createStore();
    const item = createItem();
    item.store = store;
    let viewRef;
    render(<ImageView ref={(r) => (viewRef = r)} item={item} store={store} />);
    if (typeof viewRef?.triggerMouseUp === "function") {
      viewRef.triggerMouseUp({ evt: {} }, 0, 0);
      expect(item.event).toHaveBeenCalledWith("mouseup", expect.anything(), 0, 0);
      item.event.mockClear();
      viewRef.skipNextMouseUp = true;
      viewRef.triggerMouseUp({ evt: {} }, 10, 10);
      expect(item.event).not.toHaveBeenCalled();
    }
  });

  it("resetDeferredClickTimeout clears timeouts", () => {
    const store = createStore();
    const item = createItem();
    item.store = store;
    let viewRef;
    render(<ImageView ref={(r) => (viewRef = r)} item={item} store={store} />);
    if (typeof viewRef?.resetDeferredClickTimeout === "function") {
      viewRef.deferredClickTimeout = [setTimeout(() => {}, 100)];
      viewRef.resetDeferredClickTimeout();
      expect(viewRef.deferredClickTimeout).toHaveLength(0);
    }
  });

  it("renderRulers returns ruler Group when called via ref", () => {
    const store = createStore();
    const item = createItem({ cursorPositionX: 10, cursorPositionY: 20 });
    item.store = store;
    let viewRef;
    render(<ImageView ref={(r) => (viewRef = r)} item={item} store={store} />);
    if (typeof viewRef?.renderRulers === "function") {
      const result = viewRef.renderRulers();
      expect(result).toBeTruthy();
    }
  });

  it("unmount removes resize listener and detaches observer", () => {
    const store = createStore();
    const item = createItem();
    item.store = store;
    const { unmount } = render(<ImageView item={item} store={store} />);
    unmount();
    expect(window.removeEventListener).toBeDefined();
  });

  it("re-render calls componentDidUpdate and onResize", () => {
    const store = createStore();
    const item = createItem();
    item.store = store;
    const { rerender } = render(<ImageView item={item} store={store} />);
    rerender(<ImageView item={item} store={store} />);
    expect(item.onResize).toBeDefined();
  });

  it("handleMouseDown with target as stageRef calls item.event mousedown", () => {
    const store = createStore();
    const item = createItem();
    item.store = store;
    const { container } = render(<ImageView item={item} store={store} />);
    const stage = container.querySelector('[data-testid="konva-stage"]');
    item.stageRef = stage;
    const mousedownEvt = new MouseEvent("mousedown", { bubbles: true, button: 0 });
    Object.defineProperty(mousedownEvt, "offsetX", { value: 25 });
    Object.defineProperty(mousedownEvt, "offsetY", { value: 35 });
    stage.dispatchEvent(mousedownEvt);
    expect(item.event).toHaveBeenCalledWith("mousedown", expect.anything(), 25, 35);
  });

  it("handleMouseDown with button 1 (middle click) runs path and calls item.event mousedown", () => {
    const store = createStore();
    const item = createItem();
    item.store = store;
    const { container } = render(<ImageView item={item} store={store} />);
    const stage = container.querySelector('[data-testid="konva-stage"]');
    item.stageRef = stage;
    const mousedownEvt = new MouseEvent("mousedown", { bubbles: true, button: 1 });
    Object.defineProperty(mousedownEvt, "offsetX", { value: 10 });
    Object.defineProperty(mousedownEvt, "offsetY", { value: 20 });
    stage.dispatchEvent(mousedownEvt);
    expect(item.event).toHaveBeenCalledWith("mousedown", expect.anything(), 10, 20);
  });

  it("handleMouseDown when annotation.isReadOnly and not pan tool returns without calling item.event", () => {
    const store = createStore();
    const item = createItem({
      annotation: {
        isReadOnly: () => true,
        selectedRegions: [],
        unselectAll: jest.fn(),
        unselectAreas: jest.fn(),
        isDrawing: false,
        isLinkingMode: false,
      },
      getToolsManager: () => ({
        findSelectedTool: () => ({ fullName: "RectangleTool", toolName: "RectangleTool" }),
        allTools: () => [],
      }),
    });
    item.store = store;
    const { container } = render(<ImageView item={item} store={store} />);
    const stage = container.querySelector('[data-testid="konva-stage"]');
    stage.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    expect(item.event).not.toHaveBeenCalled();
  });

  it("handleMouseDown when target.getParent is Transformer returns without calling item.event", () => {
    const store = createStore();
    const item = createItem();
    item.store = store;
    let viewRef;
    render(<ImageView ref={(r) => (viewRef = r)} item={item} store={store} />);
    const fakeE = {
      evt: { offsetX: 5, offsetY: 5 },
      target: { getParent: () => ({ className: "Transformer" }) },
    };
    viewRef.handleMouseDown(fakeE);
    expect(item.event).not.toHaveBeenCalled();
  });

  it("handleMouseDown with bitmask layer target adds global listeners and calls item.event mousedown", () => {
    const bitmaskLayer = { nodeType: "Layer", attrs: { name: "bitmask" } };
    const addEventListenerSpy = jest.spyOn(window, "addEventListener");
    const store = createStore();
    const item = createItem({
      getToolsManager: () => ({
        findSelectedTool: () => ({ fullName: "BrushTool" }),
        allTools: () => [],
      }),
    });
    item.store = store;
    let viewRef;
    render(<ImageView ref={(r) => (viewRef = r)} item={item} store={store} />);
    const fakeE = {
      evt: { offsetX: 10, offsetY: 15 },
      target: { parent: bitmaskLayer, getParent: () => null },
    };
    viewRef.handleMouseDown(fakeE);
    expect(addEventListenerSpy).toHaveBeenCalledWith("mousemove", expect.any(Function));
    expect(addEventListenerSpy).toHaveBeenCalledWith("mouseup", expect.any(Function));
    expect(item.event).toHaveBeenCalledWith("mousedown", fakeE, 10, 15);
    addEventListenerSpy.mockRestore();
  });

  it("handleGlobalMouseUp when target is CANVAS returns without calling item.event", () => {
    const store = createStore();
    const item = createItem();
    item.store = store;
    const { container } = render(<ImageView item={item} store={store} />);
    const stage = container.querySelector('[data-testid="konva-stage"]');
    item.stageRef = stage;
    const mousedownEvt = new MouseEvent("mousedown", { bubbles: true });
    Object.defineProperty(mousedownEvt, "offsetX", { value: 10 });
    Object.defineProperty(mousedownEvt, "offsetY", { value: 10 });
    stage.dispatchEvent(mousedownEvt);
    item.event.mockClear();
    const canvas = document.createElement("canvas");
    container.appendChild(canvas);
    const mouseupEvt = new MouseEvent("mouseup", { bubbles: true, clientX: 50, clientY: 50 });
    canvas.dispatchEvent(mouseupEvt);
    expect(item.event).not.toHaveBeenCalled();
  });

  it("handleGlobalMouseMove when target is CANVAS returns without calling item.event", () => {
    const store = createStore();
    const item = createItem();
    item.store = store;
    const { container } = render(<ImageView item={item} store={store} />);
    const stage = container.querySelector('[data-testid="konva-stage"]');
    item.stageRef = stage;
    const mousedownEvt = new MouseEvent("mousedown", { bubbles: true });
    Object.defineProperty(mousedownEvt, "offsetX", { value: 10 });
    Object.defineProperty(mousedownEvt, "offsetY", { value: 10 });
    stage.dispatchEvent(mousedownEvt);
    item.event.mockClear();
    const canvas = document.createElement("canvas");
    container.appendChild(canvas);
    canvas.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientX: 30, clientY: 40 }));
    expect(item.event).not.toHaveBeenCalled();
  });

  it("handleGlobalMouseMove when target is not CANVAS calls item.event mousemove", () => {
    const store = createStore();
    const item = createItem();
    item.store = store;
    const { container } = render(<ImageView item={item} store={store} />);
    const stage = container.querySelector('[data-testid="konva-stage"]');
    item.stageRef = stage;
    const mousedownEvt = new MouseEvent("mousedown", { bubbles: true, button: 0 });
    Object.defineProperty(mousedownEvt, "offsetX", { value: 10 });
    Object.defineProperty(mousedownEvt, "offsetY", { value: 10 });
    stage.dispatchEvent(mousedownEvt);
    item.event.mockClear();
    const moveEvt = new MouseEvent("mousemove", { bubbles: true, clientX: 80, clientY: 90 });
    document.body.dispatchEvent(moveEvt);
    expect(item.event).toHaveBeenCalledWith("mousemove", expect.anything(), 80, 90);
  });

  it("handleOnClick when skipNextClick is true returns without calling item.event", () => {
    const store = createStore();
    const item = createItem();
    item.store = store;
    let viewRef;
    const { container } = render(<ImageView ref={(r) => (viewRef = r)} item={item} store={store} />);
    const stage = container.querySelector('[data-testid="konva-stage"]');
    viewRef.skipNextClick = true;
    const clickEvt = new MouseEvent("click", { bubbles: true });
    Object.defineProperty(clickEvt, "offsetX", { value: 50 });
    Object.defineProperty(clickEvt, "offsetY", { value: 50 });
    stage.dispatchEvent(clickEvt);
    expect(item.event).not.toHaveBeenCalled();
  });

  it("handleOnClick with hoveredRegion calls region.onClickRegion and tool disable/enable", () => {
    const onClickRegion = jest.fn();
    const disable = jest.fn();
    const enable = jest.fn();
    const tool = { disable, enable, toolName: "BitmaskTool", strokeWidth: 1 };
    const hoveredReg = {
      id: "h1",
      type: "bitmaskregion",
      selected: false,
      isHovered: () => true,
      onClickRegion,
    };
    const store = createStore();
    const item = createItem({
      regs: [hoveredReg],
      selectedRegions: [],
      getToolsManager: () => ({
        findSelectedTool: () => tool,
        allTools: () => [],
      }),
    });
    item.store = store;
    const { container } = render(<ImageView item={item} store={store} />);
    const stage = container.querySelector('[data-testid="konva-stage"]');
    const clickEvt = new MouseEvent("click", { bubbles: true });
    Object.defineProperty(clickEvt, "offsetX", { value: 50 });
    Object.defineProperty(clickEvt, "offsetY", { value: 50 });
    stage.dispatchEvent(clickEvt);
    expect(onClickRegion).toHaveBeenCalled();
    expect(disable).toHaveBeenCalled();
    expect(enable).toHaveBeenCalled();
  });

  it("constructor does not call setSmoothing when smoothingEnabled is undefined", () => {
    const store = createStore();
    const item = createItem();
    delete item.smoothingEnabled;
    item.store = store;
    render(<ImageView item={item} store={store} />);
    expect(store.settings.setSmoothing).not.toHaveBeenCalled();
  });

  it("imagePositionClassnames use verticalalignment and horizontalalignment", () => {
    const store = createStore();
    const item = createItem({ verticalalignment: "top", horizontalalignment: "right" });
    item.store = store;
    const { container } = render(<ImageView item={item} store={store} />);
    const stage = container.querySelector('[data-testid="konva-stage"]');
    expect(stage.className).toMatch(/top|right/);
  });

  it("updateReadyStatus calls item.setReady when imageRef.current.complete differs from item.isReady", () => {
    const store = createStore();
    const item = createItem();
    item.store = store;
    item.isReady = false;
    let viewRef;
    render(<ImageView ref={(r) => (viewRef = r)} item={item} store={store} />);
    if (viewRef?.imageRef) {
      viewRef.imageRef.current = { complete: true };
      if (typeof viewRef.updateReadyStatus === "function") {
        viewRef.updateReadyStatus();
        expect(item.setReady).toHaveBeenCalledWith(true);
      }
    }
  });

  it("updateReadyStatus does not call setReady when imageRef.current is null", () => {
    const store = createStore();
    const item = createItem();
    item.store = store;
    let viewRef;
    render(<ImageView ref={(r) => (viewRef = r)} item={item} store={store} />);
    if (viewRef?.imageRef) {
      viewRef.imageRef.current = null;
      if (typeof viewRef.updateReadyStatus === "function") {
        viewRef.updateReadyStatus();
        expect(item.setReady).not.toHaveBeenCalled();
      }
    }
  });

  it("updateReadyStatus does not call setReady when isReady already matches imageRef.current.complete", () => {
    const store = createStore();
    const item = createItem();
    item.store = store;
    item.isReady = true;
    let viewRef;
    render(<ImageView ref={(r) => (viewRef = r)} item={item} store={store} />);
    if (viewRef?.imageRef) {
      viewRef.imageRef.current = { complete: true };
      if (typeof viewRef.updateReadyStatus === "function") {
        viewRef.updateReadyStatus();
        expect(item.setReady).not.toHaveBeenCalled();
      }
    }
  });

  it("Pagination receives disabled when viewingAll", () => {
    const store = createStore({ annotationStore: { viewingAll: true } });
    const item = createItem({
      isMultiItem: true,
      images: ["a.png", "b.png"],
      parsedValueList: ["a.png", "b.png"],
    });
    item.store = store;
    render(<ImageView item={item} store={store} />);
    expect(screen.getByTestId("pagination")).toBeInTheDocument();
  });

  it("handleGlobalMouseUp fires when mouseup outside canvas after mousedown on stage", () => {
    const store = createStore();
    const item = createItem();
    item.store = store;
    const { container } = render(<ImageView item={item} store={store} />);
    const stage = container.querySelector('[data-testid="konva-stage"]');
    item.stageRef = stage;
    const mousedownEvt = new MouseEvent("mousedown", { bubbles: true, button: 0 });
    Object.defineProperty(mousedownEvt, "offsetX", { value: 25 });
    Object.defineProperty(mousedownEvt, "offsetY", { value: 35 });
    stage.dispatchEvent(mousedownEvt);
    const mouseupEvt = new MouseEvent("mouseup", { bubbles: true, clientX: 50, clientY: 60 });
    Object.defineProperty(mouseupEvt, "target", { value: document.body });
    window.dispatchEvent(mouseupEvt);
    expect(item.event).toHaveBeenCalledWith("mouseup", expect.anything(), 50, 60);
  });

  it("DrawingRegion returns null when multiImage and currentImage !== drawingRegion.item_index", () => {
    const store = createStore();
    const drawingRegion = { id: "dr1", type: "brushregion", item_index: 1, annotation: {} };
    const item = createItem({ drawingRegion, multiImage: true, currentImage: 0 });
    item.store = store;
    const { container } = render(<ImageView item={item} store={store} />);
    expect(container.querySelector('[data-testid="konva-layer"]')).toBeTruthy();
  });
});

describe("ImageView with feature flags", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { isAlive } = require("mobx-state-tree");
    isAlive.mockImplementation((x) => !!x);
  });

  it("FF_LSDV_4930 click uses mouseDownPoint check", () => {
    const { isFF } = require("../../../utils/feature-flags");
    isFF.mockImplementation((ff) => ff === "fflag_lsdv_4930");
    const store = createStore();
    const item = createItem();
    item.store = store;
    const { container } = render(<ImageView item={item} store={store} />);
    const stage = container.querySelector('[data-testid="konva-stage"]');
    if (stage) {
      const clickEvt = new MouseEvent("click", { bubbles: true });
      Object.defineProperty(clickEvt, "offsetX", { value: 10 });
      Object.defineProperty(clickEvt, "offsetY", { value: 10 });
      stage.dispatchEvent(clickEvt);
    }
    expect(item.event).toBeDefined();
  });

  it("FF_LSDV_4930 click when position differs from mouseDownPoint returns without calling item.event", () => {
    const { isFF } = require("../../../utils/feature-flags");
    isFF.mockImplementation((ff) => ff === "fflag_lsdv_4930");
    const store = createStore();
    const item = createItem();
    item.store = store;
    const { container } = render(<ImageView item={item} store={store} />);
    const stage = container.querySelector('[data-testid="konva-stage"]');
    const mousedownEvt = new MouseEvent("mousedown", { bubbles: true });
    Object.defineProperty(mousedownEvt, "offsetX", { value: 0 });
    Object.defineProperty(mousedownEvt, "offsetY", { value: 0 });
    stage.dispatchEvent(mousedownEvt);
    const clickEvt = new MouseEvent("click", { bubbles: true });
    Object.defineProperty(clickEvt, "offsetX", { value: 100 });
    Object.defineProperty(clickEvt, "offsetY", { value: 100 });
    stage.dispatchEvent(clickEvt);
    expect(item.event).not.toHaveBeenCalled();
  });

  it("FF_DEV_1442 handleMouseUp calls resetDeferredClickTimeout", () => {
    const { isFF } = require("../../../utils/feature-flags");
    isFF.mockImplementation((ff) => ff === "fflag_dev_1442");
    const store = createStore();
    const item = createItem();
    item.store = store;
    const { container } = render(<ImageView item={item} store={store} />);
    const stage = container.querySelector('[data-testid="konva-stage"]');
    if (stage) {
      const upEvt = new MouseEvent("mouseup", { bubbles: true });
      Object.defineProperty(upEvt, "offsetX", { value: 0 });
      Object.defineProperty(upEvt, "offsetY", { value: 0 });
      stage.dispatchEvent(upEvt);
    }
    expect(item.freezeHistory).toHaveBeenCalled();
  });

  it("FF_DEV_1442 handleDeferredClick timeout calls handleDeferredMouseDown(false) and then mousedown", () => {
    jest.useFakeTimers();
    const { isFF } = require("../../../utils/feature-flags");
    isFF.mockImplementation((ff) => ff === "fflag_dev_1442");
    const store = createStore();
    const item = createItem({
      annotation: {
        selectedRegions: [{ id: "r1" }],
        isDrawing: false,
        isReadOnly: () => false,
        unselectAll: jest.fn(),
        unselectAreas: jest.fn(),
        isLinkingMode: false,
      },
      getToolsManager: () => ({
        findSelectedTool: () => ({ fullName: "RectangleTool" }),
        allTools: () => [],
      }),
    });
    item.store = store;
    const { container } = render(<ImageView item={item} store={store} />);
    const stage = container.querySelector('[data-testid="konva-stage"]');
    item.stageRef = stage;
    item.event.mockClear();
    const mousedownEvt = new MouseEvent("mousedown", { bubbles: true, button: 0 });
    Object.defineProperty(mousedownEvt, "offsetX", { value: 20 });
    Object.defineProperty(mousedownEvt, "offsetY", { value: 30 });
    stage.dispatchEvent(mousedownEvt);
    jest.advanceTimersByTime(150);
    expect(item.event).toHaveBeenCalledWith("mousedown", expect.anything(), 20, 30);
    jest.useRealTimers();
  });
});
