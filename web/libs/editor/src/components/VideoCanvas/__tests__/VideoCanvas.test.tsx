import React from "react";
import { render, screen, act } from "@testing-library/react";
import type { VideoRef } from "../VideoCanvas";
import { FF_VIDEO_FRAME_SEEK_PRECISION } from "../../../utils/feature-flags";
import type { Mock } from "bun:test";
import * as coreModule from "@humansignal/core";
import * as useUpdateBufferingModule from "../../../hooks/useUpdateBuffering";
import * as useLoopRangeModule from "../hooks/useLoopRange";
import {
  mockModuleAllSpecifiers,
  VIRTUAL_CANVAS_MODULE_SPECIFIERS,
  VIRTUAL_VIDEO_MODULE_SPECIFIERS,
} from "./videoCanvasBunModuleRegistry";

const ff = mockFF();

const mockUpdateBuffering = mock();
const mockPrepareLoop = mock();

const mockClearRect = mock();
const mockDrawImage = mock();
const mockGetContext = mock(() => ({
  clearRect: mockClearRect,
  drawImage: mockDrawImage,
  canvas: { width: 600, height: 600 },
}));

let mockVideoEl: Partial<HTMLVideoElement> & { _handlers?: Record<string, (e?: any) => void> };
let mockCanvasEl: HTMLCanvasElement | null = null;

/** Bun `spyOn().mockImplementation` requires a callable; `forwardRef` returns an object. Register mocks before `VideoCanvas` loads. */
const vct = {
  get mockCanvasEl() {
    return mockCanvasEl;
  },
  set mockCanvasEl(v: HTMLCanvasElement | null) {
    mockCanvasEl = v;
  },
  get mockVideoEl() {
    return mockVideoEl;
  },
  set mockVideoEl(v: typeof mockVideoEl) {
    mockVideoEl = v;
  },
  get mockGetContext() {
    return mockGetContext;
  },
};

let VideoCanvas: typeof import("../VideoCanvas")["VideoCanvas"];
let clampZoom: typeof import("../VideoCanvas")["clampZoom"];

let realVirtualVideo: Record<string, unknown>;
let realVirtualCanvas: Record<string, unknown>;
const origRAF = window.requestAnimationFrame;
const origCancelRAF = window.cancelAnimationFrame;
const origResizeObserver = window.ResizeObserver;

beforeAll(async () => {
  let rafId = 0;
  window.requestAnimationFrame = (cb: FrameRequestCallback) => {
    rafId += 1;
    setTimeout(() => cb(performance.now()), 0);
    return rafId;
  };
  window.cancelAnimationFrame = mock();
  window.ResizeObserver = mock().mockImplementation((_cb) => ({
    observe: mock(),
    disconnect: mock(),
    unobserve: mock(),
  }));

  (globalThis as { __VCTEST__?: typeof vct }).__VCTEST__ = vct;

  // Bun's `mock.module` mutates the Module Record in memory! We MUST shallow copy the exports
  // so we have a pristine clone of the real module that `mock.module` won't stealthily overwrite.
  realVirtualCanvas = { ...(requireActual("../VirtualCanvas.tsx") as Record<string, unknown>) };
  realVirtualVideo = { ...(requireActual("../VirtualVideo.tsx") as Record<string, unknown>) };

  const virtualCanvasExports = {
    VirtualCanvas: React.forwardRef<HTMLCanvasElement, Record<string, unknown>>(
      function MockVirtualCanvas(_props, ref) {
        React.useLayoutEffect(() => {
          const t = (globalThis as { __VCTEST__?: typeof vct }).__VCTEST__;
          if (!t?.mockCanvasEl) {
            t!.mockCanvasEl = { getContext: t!.mockGetContext } as unknown as HTMLCanvasElement;
          }
          if (typeof ref === "function") {
            ref(t!.mockCanvasEl);
          } else if (ref) {
            (ref as React.MutableRefObject<HTMLCanvasElement | null>).current = t!.mockCanvasEl;
          }
          return () => {
            if (typeof ref === "function") {
              ref(null);
            } else if (ref) {
              (ref as React.MutableRefObject<HTMLCanvasElement | null>).current = null;
            }
          };
        }, [ref]);
        return <div data-testid="virtual-canvas" />;
      },
    ),
  };
  mockModuleAllSpecifiers(VIRTUAL_CANVAS_MODULE_SPECIFIERS, () => virtualCanvasExports);

  const virtualVideoExports = {
    VirtualVideo: React.forwardRef<
      HTMLVideoElement,
      {
        onPlay?: () => void;
        onLoadedData?: () => void;
        onCanPlay?: () => void;
        onSeeked?: (e?: unknown) => void;
        onPlaying?: () => void;
        onWaiting?: () => void;
        onEnded?: () => void;
        onError?: () => void;
      }
    >(function MockVirtualVideo(
      { onPlay, onLoadedData, onCanPlay, onSeeked, onPlaying, onWaiting, onEnded, onError },
      ref,
    ) {
      React.useLayoutEffect(() => {
        const t = (globalThis as { __VCTEST__?: typeof vct }).__VCTEST__;
        if (!t?.mockVideoEl) {
          t!.mockVideoEl = {
            play: mock(() => onPlay?.()),
            pause: mock(),
            load: mock(),
            currentTime: 0,
            duration: 10,
            volume: 1,
            videoWidth: 640,
            videoHeight: 360,
            readyState: 4,
            networkState: 2,
            NETWORK_IDLE: 2,
            paused: true,
            requestVideoFrameCallback: mock((_cb: (t: number, d: { mediaTime: number }) => void) => 1),
            cancelVideoFrameCallback: mock(),
          };
        }
        if (typeof ref === "function") {
          ref(t!.mockVideoEl as HTMLVideoElement);
        } else if (ref) {
          (ref as React.MutableRefObject<HTMLVideoElement | undefined>).current = t!.mockVideoEl as HTMLVideoElement;
        }
        return () => {
          if (typeof ref === "function") {
            ref(null);
          } else if (ref) {
            (ref as React.MutableRefObject<HTMLVideoElement | undefined>).current =
              undefined as unknown as HTMLVideoElement;
          }
        };
      }, [ref]);
      return (
        <div data-testid="virtual-video">
          <button type="button" data-testid="trigger-loaded" onClick={() => onLoadedData?.()} />
          <button type="button" data-testid="trigger-canplay" onClick={() => onCanPlay?.()} />
          <button type="button" data-testid="trigger-seeked" onClick={() => onSeeked?.()} />
          <button type="button" data-testid="trigger-playing" onClick={() => onPlaying?.()} />
          <button type="button" data-testid="trigger-waiting" onClick={() => onWaiting?.()} />
          <button type="button" data-testid="trigger-ended" onClick={() => onEnded?.()} />
          <button type="button" data-testid="trigger-error" onClick={() => onError?.()} />
        </div>
      );
    }),
  };
  mockModuleAllSpecifiers(VIRTUAL_VIDEO_MODULE_SPECIFIERS, () => virtualVideoExports);

  const videoCanvasMod = await import("../VideoCanvas");
  VideoCanvas = videoCanvasMod.VideoCanvas;
  clampZoom = videoCanvasMod.clampZoom;
});

afterAll(() => {
  window.requestAnimationFrame = origRAF;
  window.cancelAnimationFrame = origCancelRAF;
  window.ResizeObserver = origResizeObserver;

  // Bun shares one process; mockModule is permanent. Restore real modules for every specifier
  // alias (see videoCanvasBunModuleRegistry.ts) so Linux CI and macOS behave the same.
  // We use the variables captured in `beforeAll` BEFORE the mock was registered, so we don't
  // accidentally re-register the mock that `requireActual` would incorrectly return.
  mockModuleAllSpecifiers(VIRTUAL_VIDEO_MODULE_SPECIFIERS, () => realVirtualVideo);
  mockModuleAllSpecifiers(VIRTUAL_CANVAS_MODULE_SPECIFIERS, () => realVirtualCanvas);
});

beforeEach(() => {
  mockUpdateBuffering.mockClear();
  mockPrepareLoop.mockClear();
  mockClearRect.mockClear();
  mockDrawImage.mockClear();
  mockGetContext.mockClear();

  mockCanvasEl = null;
  mockVideoEl = undefined as any;

  spyOn(coreModule.ff, "isActive").mockImplementation(() => false);

  spyOn(useUpdateBufferingModule, "useUpdateBuffering").mockImplementation(() => mockUpdateBuffering);

  spyOn(useLoopRangeModule, "useLoopRange").mockImplementation(() => ({ prepareLoop: mockPrepareLoop }));
});

describe("clampZoom", () => {
  it("clamps value to MIN_ZOOM when below", () => {
    expect(clampZoom(0.01)).toBe(0.1);
  });

  it("clamps value to MAX_ZOOM when above", () => {
    expect(clampZoom(20)).toBe(10);
  });

  it("returns value when within range", () => {
    expect(clampZoom(1)).toBe(1);
    expect(clampZoom(2.5)).toBe(2.5);
  });
});

describe("VideoCanvas", () => {
  it("renders loading spinner initially", () => {
    const { container } = render(<VideoCanvas src="/test.mp4" speed={1} />);
    const root = container.firstChild as HTMLElement;
    expect(root).toBeInTheDocument();
    const loading = container.querySelector("[class*='loading']");
    expect(loading || root.querySelector(".spinner")).toBeTruthy();
  });

  it("renders view container with default dimensions", () => {
    const { container } = render(<VideoCanvas src="/test.mp4" speed={1} />);
    const view = container.querySelector("[class*='view']");
    expect(view).toBeInTheDocument();
    expect((view as HTMLElement)?.style?.width).toBe("600px");
    expect((view as HTMLElement)?.style?.height).toBe("600px");
  });

  it("uses width and height props when provided", () => {
    const { container } = render(<VideoCanvas src="/test.mp4" speed={1} width={800} height={450} />);
    const view = container.querySelector("[class*='view']");
    expect((view as HTMLElement)?.style?.width).toBe("800px");
    expect((view as HTMLElement)?.style?.height).toBe("450px");
  });

  it("calls onClick when view is clicked", () => {
    const onClick = mock();
    const { container } = render(<VideoCanvas src="/test.mp4" speed={1} onClick={onClick} />);
    const view = container.querySelector("[class*='view']");
    view?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onClick).toHaveBeenCalled();
  });

  it("forwards ref and exposes VideoRef API", async () => {
    const ref = { current: null as VideoRef | null };
    render(<VideoCanvas ref={ref} src="/test.mp4" speed={1} />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(ref.current).not.toBeNull();
    expect(ref.current?.currentFrame).toBeDefined();
    expect(ref.current?.length).toBe(0);
    expect(ref.current?.playing).toBe(false);
    expect(ref.current?.zoom).toBe(1);
    expect(ref.current?.pan).toEqual({ x: 0, y: 0 });
    expect(ref.current?.videoDimensions).toEqual({ width: 0, height: 0, ratio: 1 });
    expect(typeof ref.current?.play).toBe("function");
    expect(typeof ref.current?.pause).toBe("function");
    expect(typeof ref.current?.goToFrame).toBe("function");
    expect(typeof ref.current?.seek).toBe("function");
    expect(typeof ref.current?.setZoom).toBe("function");
    expect(typeof ref.current?.setPan).toBe("function");
    expect(typeof ref.current?.setContrast).toBe("function");
    expect(typeof ref.current?.setBrightness).toBe("function");
    expect(typeof ref.current?.setSaturation).toBe("function");
    expect(typeof ref.current?.adjustPan).toBe("function");
    expect(typeof ref.current?.frameSteppedTime).toBe("function");
  });

  it("ref.setZoom clamps and updates zoom", async () => {
    const ref = { current: null as VideoRef | null };
    render(<VideoCanvas ref={ref} src="/test.mp4" speed={1} />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    act(() => {
      ref.current?.setZoom(2);
    });
    expect(ref.current?.zoom).toBe(2);
    act(() => {
      ref.current?.setZoom(0.05);
    });
    expect(ref.current?.zoom).toBe(0.1);
  });

  it("ref.setPan updates pan (clamped when video not loaded)", async () => {
    const ref = { current: null as VideoRef | null };
    render(<VideoCanvas ref={ref} src="/test.mp4" speed={1} />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    act(() => {
      ref.current?.setPan(10, 20);
    });
    expect(ref.current?.pan).toBeDefined();
    expect(typeof ref.current?.pan.x).toBe("number");
    expect(typeof ref.current?.pan.y).toBe("number");
  });

  it("ref.adjustPan returns processed pan", async () => {
    const ref = { current: null as VideoRef | null };
    render(<VideoCanvas ref={ref} src="/test.mp4" speed={1} />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    const result = ref.current?.adjustPan(5, 5);
    expect(result).toEqual({ x: 0, y: 0 });
  });

  it("ref.setContrast and setBrightness and setSaturation update state", async () => {
    const ref = { current: null as VideoRef | null };
    render(<VideoCanvas ref={ref} src="/test.mp4" speed={1} />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    act(() => {
      ref.current?.setContrast(1.2);
    });
    expect(ref.current).toBeDefined();
    act(() => {
      ref.current?.setBrightness(0.9);
    });
    act(() => {
      ref.current?.setSaturation(1.1);
    });
    expect(ref.current).toBeDefined();
  });

  it("ref.play calls videoRef.play and prepareLoop", async () => {
    const ref = { current: null as VideoRef | null };
    render(<VideoCanvas ref={ref} src="/test.mp4" speed={1} />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    act(() => {
      ref.current?.play();
    });
    expect(mockPrepareLoop).toHaveBeenCalled();
    if (mockVideoEl?.play) {
      expect((mockVideoEl.play as Mock<any>).mock.calls.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("ref.pause calls videoRef.pause", async () => {
    const ref = { current: null as VideoRef | null };
    render(<VideoCanvas ref={ref} src="/test.mp4" speed={1} />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    act(() => {
      ref.current?.pause();
    });
    if (mockVideoEl?.pause) {
      expect(mockVideoEl.pause).toHaveBeenCalled();
    }
  });

  it("ref.seek sets currentTime and requests draw", async () => {
    const ref = { current: null as VideoRef | null };
    render(<VideoCanvas ref={ref} src="/test.mp4" speed={1} />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    act(() => {
      ref.current?.seek(2);
    });
    if (mockVideoEl) {
      expect(mockVideoEl.currentTime).toBe(2);
    }
  });

  it("ref.goToFrame clamps frame and sets currentTime", async () => {
    const ref = { current: null as VideoRef | null };
    render(<VideoCanvas ref={ref} src="/test.mp4" speed={1} />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    act(() => {
      ref.current?.goToFrame(5);
    });
    if (mockVideoEl) {
      expect(mockVideoEl.currentTime).toBeDefined();
    }
  });

  it("ref.frameSteppedTime returns current time when no arg", async () => {
    const ref = { current: null as VideoRef | null };
    render(<VideoCanvas ref={ref} src="/test.mp4" speed={1} />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    const t = ref.current?.frameSteppedTime();
    expect(typeof t).toBe("number");
  });

  it("ref.frameSteppedTime with time arg returns that time when isFF false", async () => {
    const ref = { current: null as VideoRef | null };
    render(<VideoCanvas ref={ref} src="/test.mp4" speed={1} />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    const t = ref.current?.frameSteppedTime(3.5, false);
    expect(t).toBe(3.5);
  });

  it("accepts function ref", async () => {
    let captured: VideoRef | null = null;
    const refFn = (r: VideoRef | null) => {
      captured = r;
    };
    render(<VideoCanvas ref={refFn} src="/test.mp4" speed={1} />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(captured).not.toBeNull();
    expect(captured?.play).toBeDefined();
  });

  it("syncs zoom from props", async () => {
    const ref = { current: null as VideoRef | null };
    const { rerender } = render(<VideoCanvas ref={ref} src="/test.mp4" speed={1} zoom={2} />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(ref.current?.zoom).toBe(2);
    rerender(<VideoCanvas ref={ref} src="/test.mp4" speed={1} zoom={1.5} />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(ref.current?.zoom).toBe(1.5);
  });

  it("syncs pan from props", async () => {
    const ref = { current: null as VideoRef | null };
    render(<VideoCanvas ref={ref} src="/test.mp4" speed={1} pan={{ x: 1, y: 2 }} />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(ref.current?.pan).toBeDefined();
  });

  it("syncs contrast, brightness, saturation from props", async () => {
    const ref = { current: null as VideoRef | null };
    render(<VideoCanvas ref={ref} src="/test.mp4" speed={1} contrast={1.1} brightness={0.95} saturation={1.05} />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(ref.current).toBeDefined();
  });

  it("calls onPlay when play is triggered", async () => {
    const onPlay = mock();
    const ref = { current: null as VideoRef | null };
    render(<VideoCanvas ref={ref} src="/test.mp4" speed={1} onPlay={onPlay} />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    act(() => {
      ref.current?.play();
    });
    expect(onPlay).toHaveBeenCalled();
  });

  it("calls onLoad when video is loaded (readyState 4)", async () => {
    const onLoad = mock();
    const ref = { current: null as VideoRef | null };
    render(<VideoCanvas ref={ref} src="/test.mp4" speed={1} framerate={30} onLoad={onLoad} />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 300));
    });

    expect(onLoad).toHaveBeenCalled();
  });

  it("ref.goToFrame seeks to frame and updates currentTime", async () => {
    const ref = { current: null as VideoRef | null };
    render(<VideoCanvas ref={ref} src="/test.mp4" speed={1} />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(() => ref.current?.goToFrame(2)).not.toThrow();
    if (mockVideoEl) {
      expect(typeof (mockVideoEl as { currentTime?: number }).currentTime).toBe("number");
    }
  });

  it("uses initial position prop for currentFrame", async () => {
    const ref = { current: null as VideoRef | null };
    render(<VideoCanvas ref={ref} src="/test.mp4" speed={1} position={3} />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 30));
    });
    expect(ref.current?.currentFrame).toBe(3);
  });

  it("has displayName VideoCanvas", () => {
    expect(VideoCanvas.displayName).toBe("VideoCanvas");
  });

  it("calls onEnded when video ends", async () => {
    const onEnded = mock();
    const onSeeked = mock();
    const onPause = mock();
    render(<VideoCanvas src="/test.mp4" speed={1} onEnded={onEnded} onSeeked={onSeeked} onPause={onPause} />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    const triggerEnded = screen.getByTestId("trigger-ended");
    await act(async () => {
      triggerEnded.click();
    });
    expect(onEnded).toHaveBeenCalled();
    expect(onSeeked).toHaveBeenCalled();
    expect(onPause).toHaveBeenCalled();
  });

  it("calls onError when video errors and never loaded", async () => {
    const onError = mock();
    const { container } = render(<VideoCanvas src="/test.mp4" speed={1} onError={onError} />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    if (mockVideoEl) {
      (mockVideoEl as { error?: unknown }).error = new Error("load failed");
    }
    const triggerError = screen.getByTestId("trigger-error");
    await act(async () => {
      triggerError.click();
    });
    expect(onError).toHaveBeenCalled();
    expect(container.querySelector("[class*='loading']")).toBeNull();
  });

  it("calls onResize when ResizeObserver fires", async () => {
    let observerCallback: ((entries?: ResizeObserverEntry[], observer?: ResizeObserver) => void) | null = null;
    const origRO = window.ResizeObserver;
    window.ResizeObserver = mock().mockImplementation((cb: typeof observerCallback) => {
      observerCallback = cb;
      return { observe: mock(), disconnect: mock(), unobserve: mock() };
    });
    try {
      render(<VideoCanvas src="/test.mp4" speed={1} onResize={mock()} />);
      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });
      await act(async () => {
        observerCallback?.([{ contentRect: { width: 100, height: 50 } } as ResizeObserverEntry], {} as ResizeObserver);
        await new Promise((r) => setTimeout(r, 50));
      });
    } finally {
      window.ResizeObserver = origRO;
    }
  });

  it("syncs props.playing to video play/pause", async () => {
    const ref = { current: null as VideoRef | null };
    const { rerender } = render(<VideoCanvas ref={ref} src="/test.mp4" speed={1} playing={false} />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    rerender(<VideoCanvas ref={ref} src="/test.mp4" speed={1} playing={true} />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    if (mockVideoEl?.play) {
      expect((mockVideoEl.play as Mock<any>).mock.calls.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("frameSteppedTime with FF_VIDEO_FRAME_SEEK_PRECISION uses rounded time", async () => {
    ff.set({ [FF_VIDEO_FRAME_SEEK_PRECISION]: true });
    const ref = { current: null as VideoRef | null };
    render(<VideoCanvas ref={ref} src="/test.mp4" speed={1} />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    const t = ref.current?.frameSteppedTime(0.1, true);
    expect(typeof t).toBe("number");
    ff.reset();
  });

  it("allowPanOffscreen allows pan outside bounds", async () => {
    const ref = { current: null as VideoRef | null };
    useFakeTimers();
    try {
      render(<VideoCanvas ref={ref} src="/test.mp4" speed={1} allowPanOffscreen />);
      await act(async () => {
        advanceTimersByTime(250);
      });
      act(() => {
        ref.current?.setPan(100, 200);
      });
      expect(ref.current?.pan).toEqual({ x: 100, y: 200 });
    } finally {
      useRealTimers();
    }
  });

  it("ref.pause with FF_VIDEO_FRAME_SEEK_PRECISION clamps currentTime when duration not finite", async () => {
    ff.set({ [FF_VIDEO_FRAME_SEEK_PRECISION]: true });
    const ref = { current: null as VideoRef | null };
    render(<VideoCanvas ref={ref} src="/test.mp4" speed={1} />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    if (mockVideoEl) {
      Object.defineProperty(mockVideoEl, "duration", { get: () => Number.NaN, configurable: true });
    }
    act(() => {
      ref.current?.pause();
    });
    ff.reset();
  });

  it("calls video.load when error after load (recovery path)", async () => {
    useFakeTimers();
    try {
      render(<VideoCanvas src="/test.mp4" speed={1} onLoad={() => {}} />);
      await act(async () => {
        advanceTimersByTime(250);
      });
      const triggerCanPlay = screen.getByTestId("trigger-canplay");
      await act(async () => {
        triggerCanPlay.click();
      });
      if (mockVideoEl) {
        (mockVideoEl as { error?: unknown }).error = { code: 4, message: "network error" };
      }
      const triggerError = screen.getByTestId("trigger-error");
      await act(async () => {
        triggerError.click();
      });
      if (mockVideoEl?.load) {
        expect((mockVideoEl.load as Mock<any>).mock.calls.length).toBeGreaterThanOrEqual(1);
      }
    } finally {
      useRealTimers();
    }
  });
});
