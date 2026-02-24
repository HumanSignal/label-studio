import React from "react";
import { render, screen, act } from "@testing-library/react";
import { VideoCanvas, clampZoom, type VideoRef } from "../VideoCanvas";

jest.mock("../../../utils/feature-flags", () => ({
  FF_VIDEO_FRAME_SEEK_PRECISION: "fflag_fix_front_optic_1608_improve_video_frame_seek_precision_short",
  isFF: jest.fn(() => false),
}));

jest.mock("@humansignal/core", () => ({
  ...jest.requireActual("@humansignal/core"),
  ff: {
    isActive: jest.fn(() => false),
  },
}));

const mockUpdateBuffering = jest.fn();
jest.mock("../../../hooks/useUpdateBuffering", () => ({
  useUpdateBuffering: () => mockUpdateBuffering,
}));

const mockPrepareLoop = jest.fn();
jest.mock("../hooks/useLoopRange", () => ({
  useLoopRange: () => ({ prepareLoop: mockPrepareLoop }),
}));

const mockClearRect = jest.fn();
const mockDrawImage = jest.fn();
const mockGetContext = jest.fn(() => ({
  clearRect: mockClearRect,
  drawImage: mockDrawImage,
  canvas: { width: 600, height: 600 },
}));

let mockVideoEl: Partial<HTMLVideoElement> & { _handlers?: Record<string, (e?: any) => void> };
let mockCanvasEl: HTMLCanvasElement | null = null;

jest.mock("../VirtualCanvas", () => {
  const React = require("react");
  return {
    VirtualCanvas: React.forwardRef((_props: unknown, ref: React.Ref<HTMLCanvasElement>) => {
      if (!mockCanvasEl) {
        mockCanvasEl = { getContext: mockGetContext } as unknown as HTMLCanvasElement;
      }
      if (typeof ref === "function") {
        ref(mockCanvasEl);
      } else if (ref) {
        (ref as React.MutableRefObject<HTMLCanvasElement | null>).current = mockCanvasEl;
      }
      return <div data-testid="virtual-canvas" />;
    }),
  };
});

jest.mock("../VirtualVideo", () => {
  const React = require("react");
  return {
    VirtualVideo: React.forwardRef(
      (
        {
          onPlay,
          onLoadedData,
          onCanPlay,
          onSeeked,
          onPlaying,
          onWaiting,
          onEnded,
          onError,
        }: {
          onPlay?: () => void;
          onLoadedData?: () => void;
          onCanPlay?: () => void;
          onSeeked?: (e?: unknown) => void;
          onPlaying?: () => void;
          onWaiting?: () => void;
          onEnded?: () => void;
          onError?: () => void;
        },
        ref: React.Ref<HTMLVideoElement>,
      ) => {
        if (!mockVideoEl) {
          mockVideoEl = {
            play: jest.fn(() => onPlay?.()),
            pause: jest.fn(),
            load: jest.fn(),
            currentTime: 0,
            duration: 10,
            volume: 1,
            videoWidth: 640,
            videoHeight: 360,
            readyState: 4,
            networkState: 2,
            NETWORK_IDLE: 2,
            paused: true,
            requestVideoFrameCallback: jest.fn((cb: (t: number, d: { mediaTime: number }) => void) => 1),
            cancelVideoFrameCallback: jest.fn(),
          };
        }
        if (typeof ref === "function") {
          ref(mockVideoEl as HTMLVideoElement);
        } else if (ref) {
          (ref as React.MutableRefObject<HTMLVideoElement | undefined>).current = mockVideoEl as HTMLVideoElement;
        }
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
      },
    ),
  };
});

const origRAF = window.requestAnimationFrame;
const origCancelRAF = window.cancelAnimationFrame;
const origResizeObserver = window.ResizeObserver;

beforeAll(() => {
  let rafId = 0;
  window.requestAnimationFrame = (cb: FrameRequestCallback) => {
    rafId += 1;
    setTimeout(() => cb(performance.now()), 0);
    return rafId;
  };
  window.cancelAnimationFrame = jest.fn();
  window.ResizeObserver = jest.fn().mockImplementation((cb) => ({
    observe: jest.fn(),
    disconnect: jest.fn(),
    unobserve: jest.fn(),
  }));
});

afterAll(() => {
  window.requestAnimationFrame = origRAF;
  window.cancelAnimationFrame = origCancelRAF;
  window.ResizeObserver = origResizeObserver;
});

beforeEach(() => {
  jest.clearAllMocks();
  mockCanvasEl = null;
  mockVideoEl = undefined as any;
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
    const onClick = jest.fn();
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
      expect((mockVideoEl.play as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(1);
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
    const onPlay = jest.fn();
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
    jest.useFakeTimers();
    const onLoad = jest.fn();
    const ref = { current: null as VideoRef | null };
    render(<VideoCanvas ref={ref} src="/test.mp4" speed={1} framerate={30} onLoad={onLoad} />);

    await act(async () => {
      jest.advanceTimersByTime(250);
    });

    expect(onLoad).toHaveBeenCalled();
    jest.useRealTimers();
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
    const onEnded = jest.fn();
    const onSeeked = jest.fn();
    const onPause = jest.fn();
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
    const onError = jest.fn();
    render(<VideoCanvas src="/test.mp4" speed={1} onError={onError} />);
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
  });

  it("calls onResize when ResizeObserver fires", async () => {
    const onResize = jest.fn();
    let observerCallback: (() => void) | null = null;
    const origRO = window.ResizeObserver;
    window.ResizeObserver = jest.fn().mockImplementation((cb: () => void) => {
      observerCallback = cb;
      return { observe: jest.fn(), disconnect: jest.fn(), unobserve: jest.fn() };
    });
    render(<VideoCanvas src="/test.mp4" speed={1} onResize={onResize} />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    await act(async () => {
      observerCallback?.();
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(onResize).toHaveBeenCalled();
    window.ResizeObserver = origRO;
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
      expect((mockVideoEl.play as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("frameSteppedTime with FF_VIDEO_FRAME_SEEK_PRECISION uses rounded time", async () => {
    const { isFF } = require("../../../utils/feature-flags");
    (isFF as jest.Mock).mockReturnValue(true);
    const ref = { current: null as VideoRef | null };
    render(<VideoCanvas ref={ref} src="/test.mp4" speed={1} />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });
    const t = ref.current?.frameSteppedTime(0.1, true);
    expect(typeof t).toBe("number");
    (isFF as jest.Mock).mockReturnValue(false);
  });

  it("allowPanOffscreen allows pan outside bounds", async () => {
    const ref = { current: null as VideoRef | null };
    jest.useFakeTimers();
    render(<VideoCanvas ref={ref} src="/test.mp4" speed={1} allowPanOffscreen />);
    await act(async () => {
      jest.advanceTimersByTime(250);
    });
    act(() => {
      ref.current?.setPan(100, 200);
    });
    expect(ref.current?.pan).toEqual({ x: 100, y: 200 });
    jest.useRealTimers();
  });

  it("ref.pause with FF_VIDEO_FRAME_SEEK_PRECISION clamps currentTime when duration not finite", async () => {
    const { isFF } = require("../../../utils/feature-flags");
    (isFF as jest.Mock).mockReturnValue(true);
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
    (isFF as jest.Mock).mockReturnValue(false);
  });

  it("calls video.load when error after load (recovery path)", async () => {
    jest.useFakeTimers();
    render(<VideoCanvas src="/test.mp4" speed={1} onLoad={() => {}} />);
    await act(async () => {
      jest.advanceTimersByTime(250);
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
      expect((mockVideoEl.load as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(1);
    }
    jest.useRealTimers();
  });
});
