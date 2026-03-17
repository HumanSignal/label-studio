/**
 * Unit tests for Playhead (lib/AudioUltra/Visual/PlayHead.ts)
 */
import { Playhead } from "../PlayHead";
import { rgba } from "../../Common/Color";

function createMockVisualizer(overrides = {}) {
  return {
    height: 100,
    width: 800,
    reservedSpace: 10,
    fullWidth: 800,
    pixelRatio: 1,
    zoomedWidth: 800,
    getScrollLeftPx: () => 0,
    container: {
      clientWidth: 800,
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 100 }),
    },
    getScrollLeft: () => 0,
    transferImage: jest.fn(),
    draw: jest.fn(),
    ...overrides,
  };
}

function createMockWaveform(overrides = {}) {
  return {
    duration: 10,
    currentTime: 0,
    zoom: 1,
    cursor: {
      set: jest.fn(),
      hasFocus: jest.fn(() => false),
      isFocused: jest.fn(() => false),
    },
    on: jest.fn(),
    off: jest.fn(),
    ...overrides,
  };
}

describe("Playhead", () => {
  describe("constructor", () => {
    it("throws when options.x is negative", () => {
      const visualizer = createMockVisualizer();
      const wf = createMockWaveform();
      expect(() => new Playhead({ x: -1 }, visualizer as any, wf as any)).toThrow(
        "Playhead start must be greater than 0",
      );
    });

    it("initializes with default options when x is 0", () => {
      const visualizer = createMockVisualizer();
      const wf = createMockWaveform();
      const playhead = new Playhead({}, visualizer as any, wf as any);
      expect(playhead.x).toBe(0);
      expect(playhead.width).toBe(1);
      expect(playhead.capHeight).toBe(5);
      expect(playhead.capPadding).toBe(3);
    });

    it("uses provided options", () => {
      const visualizer = createMockVisualizer();
      const wf = createMockWaveform();
      const color = rgba("#f00");
      const fillColor = rgba("#0f0");
      const playhead = new Playhead(
        { x: 50, width: 2, capWidth: 10, capHeight: 6, capPadding: 4, color, fillColor },
        visualizer as any,
        wf as any,
      );
      expect(playhead.x).toBe(50);
      expect(playhead.width).toBe(2);
      expect(playhead.capHeight).toBe(6);
      expect(playhead.capPadding).toBe(4);
    });
  });

  describe("onInit", () => {
    it("calls drawPlayheadSlice and registers events", () => {
      const visualizer = createMockVisualizer();
      const wf = createMockWaveform();
      const playhead = new Playhead({ x: 0 }, visualizer as any, wf as any);
      const drawSpy = jest.spyOn(playhead, "drawPlayheadSlice");
      playhead.onInit();
      expect(drawSpy).toHaveBeenCalled();
      expect(wf.on).toHaveBeenCalledWith("playing", expect.any(Function));
      expect(wf.on).toHaveBeenCalledWith("zoom", expect.any(Function));
      expect(wf.on).toHaveBeenCalledWith("scroll", expect.any(Function));
    });
  });

  describe("drawPlayheadSlice", () => {
    it("resizes canvas and draws with hovered style when isHovered", () => {
      const visualizer = createMockVisualizer();
      const wf = createMockWaveform();
      const playhead = new Playhead({ x: 0 }, visualizer as any, wf as any);
      playhead.isHovered = true;
      playhead.drawPlayheadSlice();
      expect(playhead["playheadCanvas"].width).toBeGreaterThan(0);
      expect(playhead["playheadCanvas"].height).toBeGreaterThan(0);
    });

    it("draws with non-hovered style when not hovered", () => {
      const visualizer = createMockVisualizer();
      const wf = createMockWaveform();
      const playhead = new Playhead({ x: 0 }, visualizer as any, wf as any);
      playhead.isHovered = false;
      playhead.drawPlayheadSlice();
      expect(playhead["playheadCanvas"].width).toBeGreaterThan(0);
    });
  });

  describe("renderTo", () => {
    it("returns early when ctx is null", () => {
      const visualizer = createMockVisualizer();
      const wf = createMockWaveform();
      const playhead = new Playhead({ x: 0 }, visualizer as any, wf as any);
      playhead.onInit();
      playhead.renderTo(null as any, 10);
    });

    it("returns early when target canvas has zero dimensions", () => {
      const visualizer = createMockVisualizer();
      const wf = createMockWaveform();
      const playhead = new Playhead({ x: 0 }, visualizer as any, wf as any);
      playhead.onInit();
      const ctx = {
        canvas: { width: 0, height: 0 },
        save: jest.fn(),
        restore: jest.fn(),
        drawImage: jest.fn(),
        globalAlpha: 1,
      } as unknown as CanvasRenderingContext2D;
      playhead.renderTo(ctx, 10);
      expect(ctx.drawImage).not.toHaveBeenCalled();
    });

    it("draws to ctx when canvas is initialized", () => {
      const visualizer = createMockVisualizer();
      const wf = createMockWaveform();
      const playhead = new Playhead({ x: 0 }, visualizer as any, wf as any);
      playhead.onInit();
      const drawImageSpy = jest.fn();
      const ctx = {
        canvas: { width: 800, height: 100 },
        save: jest.fn(),
        restore: jest.fn(),
        drawImage: drawImageSpy,
        globalAlpha: 1,
      } as unknown as CanvasRenderingContext2D;
      playhead.renderTo(ctx, 50);
      expect(drawImageSpy).toHaveBeenCalled();
    });
  });

  describe("updatePositionFromTime", () => {
    it("updates x from time with clamping", () => {
      const visualizer = createMockVisualizer();
      const wf = createMockWaveform();
      const playhead = new Playhead({ x: 0 }, visualizer as any, wf as any);
      playhead.onInit();
      playhead.updatePositionFromTime(5, false, true);
      expect(playhead.x).toBeGreaterThanOrEqual(0);
      expect(playhead.x).toBeLessThanOrEqual(800);
    });

    it("updates x without clamping when useClamp is false", () => {
      const visualizer = createMockVisualizer();
      const wf = createMockWaveform();
      const playhead = new Playhead({ x: 0 }, visualizer as any, wf as any);
      playhead.onInit();
      playhead.updatePositionFromTime(20, false, false);
      expect(playhead.x).toBe(1600);
    });
  });

  describe("getters", () => {
    it("time returns wf.currentTime", () => {
      const visualizer = createMockVisualizer();
      const wf = createMockWaveform();
      (wf as any).currentTime = 3.5;
      const playhead = new Playhead({ x: 0 }, visualizer as any, wf as any);
      expect(playhead.time).toBe(3.5);
    });

    it("x returns _x + scroll", () => {
      const visualizer = createMockVisualizer();
      (visualizer as any).getScrollLeft = () => 100;
      const wf = createMockWaveform();
      const playhead = new Playhead({ x: 50 }, visualizer as any, wf as any);
      expect(playhead.x).toBe(150);
    });

    it("containerWidth returns visualizer.container.clientWidth", () => {
      const visualizer = createMockVisualizer();
      const wf = createMockWaveform();
      const playhead = new Playhead({ x: 0 }, visualizer as any, wf as any);
      expect(playhead.containerWidth).toBe(800);
    });

    it("fullWidth returns visualizer.fullWidth", () => {
      const visualizer = createMockVisualizer({ fullWidth: 1600 });
      const wf = createMockWaveform();
      const playhead = new Playhead({ x: 0 }, visualizer as any, wf as any);
      expect(playhead.fullWidth).toBe(1600);
    });
  });

  describe("setX", () => {
    it("updates _x", () => {
      const visualizer = createMockVisualizer();
      const wf = createMockWaveform();
      const playhead = new Playhead({ x: 0 }, visualizer as any, wf as any);
      playhead.setX(100);
      expect(playhead.x).toBe(100);
    });
  });

  describe("toJSON", () => {
    it("returns serialized playhead", () => {
      const visualizer = createMockVisualizer();
      const wf = createMockWaveform();
      const playhead = new Playhead({ x: 50 }, visualizer as any, wf as any);
      const json = playhead.toJSON();
      expect(json).toHaveProperty("x", 50);
      expect(json).toHaveProperty("layerName", "playhead");
      expect(json).toHaveProperty("id");
      expect(json).toHaveProperty("color");
    });
  });

  describe("event handlers", () => {
    it("mouseEnter sets isHovered and calls transferImage when not dragging", () => {
      const visualizer = createMockVisualizer();
      const wf = createMockWaveform();
      const playhead = new Playhead({ x: 0 }, visualizer as any, wf as any);
      playhead.onInit();
      (playhead as any).invoke("mouseEnter");
      expect(playhead.isHovered).toBe(true);
      expect(visualizer.transferImage).toHaveBeenCalled();
      expect(wf.cursor.set).toHaveBeenCalledWith(expect.anything(), "playhead");
    });

    it("mouseEnter does not set cursor when cursor has focus", () => {
      const visualizer = createMockVisualizer();
      const wf = createMockWaveform();
      (wf.cursor as any).hasFocus = jest.fn(() => true);
      const playhead = new Playhead({ x: 0 }, visualizer as any, wf as any);
      playhead.onInit();
      wf.cursor.set.mockClear();
      (playhead as any).invoke("mouseEnter");
      expect(playhead.isHovered).toBe(true);
      expect(wf.cursor.set).not.toHaveBeenCalled();
    });

    it("mouseLeave clears isHovered and resets cursor when focused on playhead", () => {
      const visualizer = createMockVisualizer();
      const wf = createMockWaveform();
      (wf.cursor as any).isFocused = jest.fn((id: string) => id === "playhead");
      const CursorSymbol = require("../../Cursor/Cursor").CursorSymbol;
      const playhead = new Playhead({ x: 0 }, visualizer as any, wf as any);
      playhead.onInit();
      (playhead as any).invoke("mouseEnter");
      (playhead as any).invoke("mouseLeave");
      expect(playhead.isHovered).toBe(false);
      expect(wf.cursor.set).toHaveBeenLastCalledWith(CursorSymbol.default);
    });

    it("playing callback updates position when not dragging", () => {
      const visualizer = createMockVisualizer();
      const wf = createMockWaveform();
      const playhead = new Playhead({ x: 0 }, visualizer as any, wf as any);
      playhead.onInit();
      const playingCb = (wf.on as jest.Mock).mock.calls.find((c: any[]) => c[0] === "playing")?.[1];
      expect(playingCb).toBeDefined();
      playingCb(5, true, true);
      expect(playhead.x).toBe(400);
    });

    it("onZoom callback updates position", () => {
      const visualizer = createMockVisualizer();
      const wf = createMockWaveform();
      (wf as any).currentTime = 2;
      const playhead = new Playhead({ x: 0 }, visualizer as any, wf as any);
      playhead.onInit();
      const onZoomCb = (wf.on as jest.Mock).mock.calls.find((c: any[]) => c[0] === "zoom")?.[1];
      expect(onZoomCb).toBeDefined();
      onZoomCb();
      expect(playhead.x).toBeGreaterThanOrEqual(0);
    });

    it("onScroll callback updates position", () => {
      const visualizer = createMockVisualizer();
      const wf = createMockWaveform();
      (wf as any).currentTime = 1;
      const playhead = new Playhead({ x: 0 }, visualizer as any, wf as any);
      playhead.onInit();
      const onScrollCb = (wf.on as jest.Mock).mock.calls.find((c: any[]) => c[0] === "scroll")?.[1];
      expect(onScrollCb).toBeDefined();
      onScrollCb();
      expect(playhead.x).toBeGreaterThanOrEqual(0);
    });

    it("mouseDown when hovered sets dragging and adds document listeners", () => {
      const visualizer = createMockVisualizer();
      const wf = createMockWaveform();
      const playhead = new Playhead({ x: 0 }, visualizer as any, wf as any);
      playhead.onInit();
      playhead.isHovered = true;
      const addSpy = jest.spyOn(document, "addEventListener");
      const removeSpy = jest.spyOn(document, "removeEventListener");
      const e = new MouseEvent("mousedown", { clientX: 100 });
      (playhead as any).invoke("mouseDown", [e]);
      expect(playhead.isDragging).toBe(true);
      expect(addSpy).toHaveBeenCalledWith("mousemove", expect.any(Function));
      expect(addSpy).toHaveBeenCalledWith("mouseup", expect.any(Function));
      const mouseUpHandler = addSpy.mock.calls.find((c) => c[0] === "mouseup")?.[1];
      const mouseUpEvent = new MouseEvent("mouseup");
      (mouseUpHandler as (e: MouseEvent) => void)(mouseUpEvent);
      expect(playhead.isDragging).toBe(false);
      expect(removeSpy).toHaveBeenCalledWith("mousemove", expect.any(Function));
      expect(removeSpy).toHaveBeenCalledWith("mouseup", mouseUpHandler);
      addSpy.mockRestore();
      removeSpy.mockRestore();
    });

    it("mouseDown drag mousemove updates position and currentTime", () => {
      const visualizer = createMockVisualizer();
      const wf = createMockWaveform();
      const playhead = new Playhead({ x: 0 }, visualizer as any, wf as any);
      playhead.onInit();
      playhead.isHovered = true;
      const addSpy = jest.spyOn(document, "addEventListener");
      const e = new MouseEvent("mousedown", { clientX: 100 });
      (playhead as any).invoke("mouseDown", [e]);
      const mouseMoveHandler = addSpy.mock.calls.find((c) => c[0] === "mousemove")?.[1] as (ev: MouseEvent) => void;
      const moveEvent = new MouseEvent("mousemove", { clientX: 200 });
      mouseMoveHandler(moveEvent);
      expect(playhead.x).toBe(200);
      expect((wf as any).currentTime).toBeGreaterThan(0);
      expect(visualizer.transferImage).toHaveBeenCalled();
      addSpy.mockRestore();
    });
  });

  describe("destroy", () => {
    it("removes event listeners and calls super.destroy", () => {
      const visualizer = createMockVisualizer();
      const wf = createMockWaveform();
      const playhead = new Playhead({ x: 0 }, visualizer as any, wf as any);
      playhead.onInit();
      playhead.destroy();
      expect(wf.off).toHaveBeenCalledWith("playing", expect.any(Function));
      expect(wf.off).toHaveBeenCalledWith("zoom", expect.any(Function));
      expect(wf.off).toHaveBeenCalledWith("scroll", expect.any(Function));
      expect(playhead.isDestroyed).toBe(true);
    });

    it("is no-op when already destroyed", () => {
      const visualizer = createMockVisualizer();
      const wf = createMockWaveform();
      const playhead = new Playhead({ x: 0 }, visualizer as any, wf as any);
      playhead.onInit();
      wf.off.mockClear();
      playhead.destroy();
      const offCallCount = wf.off.mock.calls.length;
      playhead.destroy();
      expect(wf.off.mock.calls.length).toBe(offCallCount);
    });
  });
});
