import { useRefCallback } from "@humansignal/core/hooks/useRefCallback";
import { useValueRef } from "@humansignal/core/hooks/useValueRef";
import { forwardRef, memo, type MutableRefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../../utils/bem";
import { FF_VIDEO_FRAME_SEEK_PRECISION, isFF } from "../../utils/feature-flags";
import { clamp, isDefined } from "../../utils/utilities";
import { useUpdateBuffering } from "../../hooks/useUpdateBuffering";
import "./VideoCanvas.scss";
import { useLoopRange } from "./hooks/useLoopRange";
import { MAX_ZOOM, MIN_ZOOM } from "./VideoConstants";
import { VirtualCanvas } from "./VirtualCanvas";
import { VirtualVideo } from "./VirtualVideo";
import { ff } from "@humansignal/core";

const isSyncedBuffering = ff.isActive(ff.FF_SYNCED_BUFFERING);

type VideoProps = {
  src: string;
  width?: number;
  height?: number;
  position?: number;
  currentTime?: number;
  playing?: boolean;
  buffering?: boolean;
  framerate?: number;
  muted?: boolean;
  zoom?: number;
  pan?: PanOptions;
  allowInteractions?: boolean;
  speed: number;

  allowPanOffscreen?: boolean;

  contrast?: number;
  brightness?: number;
  saturation?: number;

  onPlay?: () => void;
  onPause?: () => void;
  onClick?: () => void;
  onSeeked?: (event?: any) => void;
  onTimeUpdate?: (event: any) => void;
  onLoad?: (data: VideoRef) => void;
  onFrameChange?: (frame: number, length: number) => void;
  onEnded?: () => void;
  onResize?: (dimensions: VideoDimentions) => void;
  onError?: (error: any) => void;
  onBuffering?: (isBuffering: boolean) => void;

  loopFrameRange?: boolean;
  selectedFrameRange?: {
    start: number;
    end: number;
  };
};

type PanOptions = {
  x: number;
  y: number;
};

type VideoDimentions = {
  width: number;
  height: number;
  ratio: number;
};

export const clampZoom = (value: number) => clamp(value, MIN_ZOOM, MAX_ZOOM);

const zoomRatio = (canvasWidth: number, canvasHeight: number, width: number, height: number) =>
  Math.min(1, Math.min(canvasWidth / width, canvasHeight / height));

// Browsers can only handle time to the nearest 2ms, so we need to round to that precision when seeking by frames
// https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/currentTime
const BROWSER_TIME_PRECISION = 0.002;

export interface VideoRef {
  currentFrame: number;
  length: number;
  playing: boolean;
  width: number;
  height: number;
  zoom: number;
  pan: PanOptions;
  volume: number;
  currentTime: number;
  videoDimensions: {
    width: number;
    height: number;
    ratio: number;
  };
  readonly duration: number;
  play: () => void;
  pause: () => void;
  goToFrame: (frame: number) => void;
  frameSteppedTime: (time?: number, isZeroBasedFrame?: boolean) => number;
  seek: (time: number) => void;
  setContrast: (value: number) => void;
  setBrightness: (value: number) => void;
  setSaturation: (value: number) => void;
  setZoom: (value: number) => void;
  setPan: (x: number, y: number) => void;
  adjustPan: (x: number, y: number) => PanOptions;
}

const useBufferingWrapper = (props: VideoProps): [boolean, (isBuffering: boolean) => void] => {
  if (isSyncedBuffering) {
    const setBuffering = useRefCallback(props.onBuffering ?? (() => {}));
    return [false, setBuffering];
  }
  const [buffering, setBuffering] = useState(false);
  return [buffering, setBuffering];
};

export const VideoCanvas = memo(
  forwardRef<VideoRef, VideoProps>((props, ref) => {
    const raf = useRef<number>();
    const rootRef = useRef<HTMLDivElement>();
    const canvasRef = useRef<HTMLCanvasElement>();
    const contextRef = useRef<CanvasRenderingContext2D | null>();
    const videoRef = useRef<HTMLVideoElement>();
    const supportedFileTypeRef = useRef<boolean | null>(null);
    const hasLoadedRef = useRef<boolean>(false);

    const canvasWidth = useMemo(() => props.width ?? 600, [props.width]);
    const canvasHeight = useMemo(() => props.height ?? 600, [props.height]);

    const framerate = props.framerate ?? 29.97;
    const [loading, setLoading] = useState(true);
    const [length, setLength] = useState(0);
    const [currentFrame, setCurrentFrame] = useState(props.position ?? 1);
    const [playing, setPlaying] = useState(false);
    const [buffering, setBuffering] = useBufferingWrapper(props);
    const [zoom, setZoom] = useState(props.zoom ?? 1);
    const [pan, setPan] = useState<PanOptions>(props.pan ?? { x: 0, y: 0 });

    const [videoDimensions, setVideoDimensions] = useState<VideoDimentions>({ width: 0, height: 0, ratio: 1 });

    const [contrast, setContrast] = useState(1);
    const [brightness, setBrightness] = useState(1);
    const [saturation, setSaturation] = useState(1);
    const bufferingRef = useValueRef(props.buffering);

    const filters = useMemo(() => {
      const result: string[] = [];

      if (contrast !== 1) result.push(`contrast(${contrast})`);
      if (brightness !== 1) result.push(`brightness(${brightness})`);
      if (saturation !== 1) result.push(`saturate(${saturation})`);

      return result.join(" ");
    }, [brightness, contrast, saturation]);

    const processPan = useCallback(
      (pan: PanOptions) => {
        const { width, height } = videoDimensions;
        const resultWidth = width * zoom;
        const resultHeight = height * zoom;

        const xMinMax = clamp((resultWidth - canvasWidth) / 2, 0, Number.POSITIVE_INFINITY);
        const yMinMax = clamp((resultHeight - canvasHeight) / 2, 0, Number.POSITIVE_INFINITY);

        const panX = props.allowPanOffscreen ? pan.x : clamp(pan.x, -xMinMax, xMinMax);
        const panY = props.allowPanOffscreen ? pan.y : clamp(pan.y, -yMinMax, yMinMax);

        return { x: panX, y: panY };
      },
      [props.allowPanOffscreen, canvasWidth, canvasHeight, zoom],
    );

    const drawVideo = useCallback(() => {
      try {
        if (contextRef.current && videoRef.current) {
          const context = contextRef.current;
          const { width, height } = videoDimensions;

          if (width === 0 && height === 0) return;

          const resultWidth = width * zoom;
          const resultHeight = height * zoom;

          const offsetLeft = (canvasWidth - resultWidth) / 2 + pan.x;
          const offsetTop = (canvasHeight - resultHeight) / 2 + pan.y;

          context.clearRect(0, 0, canvasWidth, canvasHeight);

          context.filter = filters;
          context.drawImage(videoRef.current, 0, 0, width, height, offsetLeft, offsetTop, resultWidth, resultHeight);
        }
      } catch (e) {
        console.log("Error rendering video", e);
      }
    }, [videoDimensions, zoom, pan, filters, canvasWidth, canvasHeight]);

    const updateFrame = useCallback(
      (force = false) => {
        if (!contextRef.current) return;

        const currentTime = videoRef.current?.currentTime ?? 0;
        const frameNumber = isFF(FF_VIDEO_FRAME_SEEK_PRECISION)
          ? Math.ceil(currentTime * framerate)
          : Math.round(currentTime * framerate);
        const frame = clamp(frameNumber, 1, length || 1);
        const onChange = props.onFrameChange ?? (() => {});

        if (frame !== currentFrame || force === true) {
          setCurrentFrame(frame);
          drawVideo();
          onChange(frame, length);
        }
      },
      [framerate, currentFrame, drawVideo, props.onFrameChange, length],
    );

    const handleVideoBuffering = useCallback(
      (isBuffering: boolean) => {
        if (!contextRef.current) return;

        if (!isBuffering) {
          hasLoadedRef.current = true;
        }

        setBuffering(isBuffering);
      },
      [setBuffering],
    );

    const updateBuffering = useUpdateBuffering(videoRef, handleVideoBuffering);

    const delayedUpdate = useCallback(() => {
      if (!videoRef.current) return;
      if (!contextRef.current) return;

      const video = videoRef.current;

      if (video) {
        if (!playing) updateFrame(true);

        if (isSyncedBuffering) {
          updateBuffering();
        } else {
          if (video.networkState === video.NETWORK_IDLE) {
            hasLoadedRef.current = true;
            setBuffering(false);
          } else {
            setBuffering(true);
          }
        }
      }
    }, [playing, updateFrame]);

    // VIDEO EVENTS'
    const handleVideoPlay = useCallback(() => {
      setPlaying(true);
      if (!isSyncedBuffering) {
        setBuffering(false);
      } else {
        updateBuffering();
      }
      props.onPlay?.();
    }, [props.onPlay]);

    const handleVideoPause = useCallback(() => {
      setPlaying(false);
      if (!isSyncedBuffering) {
        setBuffering(false);
      } else {
        updateBuffering();
      }
      props.onPause?.();
    }, [props.onPause]);

    const handleVideoPlaying = useCallback(() => {
      if (!isSyncedBuffering) {
        setBuffering(false);
      }
      delayedUpdate();
    }, [delayedUpdate]);

    const handleVideoWaiting = useCallback(() => {
      if (!isSyncedBuffering) {
        setBuffering(true);
      } else {
        updateBuffering();
      }
    }, []);

    const handleVideoEnded = useCallback(() => {
      setPlaying(false);
      if (!isSyncedBuffering) {
        setBuffering(false);
      }
      props.onSeeked?.();
      props.onEnded?.();
      props.onPause?.();
    }, [props.onEnded]);

    const handleVideoError = useCallback(() => {
      const video = videoRef.current;

      if (video?.error && hasLoadedRef.current) {
        hasLoadedRef.current = false;

        // If the video errored after loading, we can try to reload it
        // as it may have been a temporary network issue or signed url that expired
        video.load();
      } else if (video) {
        // If the video never loaded and errored, we can't do anything about it
        // so report it to the consumer
        props.onError?.(video.error);
      }
    }, [props.onError]);

    const handleAnimationFrame = () => {
      updateFrame();

      if (playing) {
        raf.current = requestAnimationFrame(handleAnimationFrameRef.current);
      } else {
        cancelAnimationFrame(raf.current!);
      }
    };
    const handleAnimationFrameRef = useRef(handleAnimationFrame);
    handleAnimationFrameRef.current = handleAnimationFrame;

    useEffect(() => {
      if (!playing) {
        drawVideo();
      }
    }, [drawVideo, playing]);

    useEffect(() => {
      if (playing) raf.current = requestAnimationFrame(handleAnimationFrameRef.current);

      return () => {
        cancelAnimationFrame(raf.current!);
      };
    }, [playing]);

    useEffect(() => {
      if (videoRef.current && props.speed) videoRef.current.playbackRate = props.speed;
    }, [props.speed]);

    // Handle extrnal state change [position]
    useEffect(() => {
      if (videoRef.current && props.position) {
        videoRef.current.currentTime = props.position / framerate;
      }
    }, [framerate, props.position]);

    // Handle extrnal state change [current time]
    useEffect(() => {
      const updateId = requestAnimationFrame(() => {
        if (isSyncedBuffering && bufferingRef.current) return;
        if (videoRef.current && props.currentTime) videoRef.current.currentTime = props.currentTime;
      });

      return () => cancelAnimationFrame(updateId);
    }, [props.currentTime, bufferingRef]);

    // Handle extrnal state change [play/pause]
    useEffect(() => {
      if (videoRef.current) {
        if (props.playing && !playing) {
          videoRef.current.play();
        } else if (props.playing === false && playing) {
          videoRef.current.pause();
        }
      }
    }, [playing, props.playing]);

    useEffect(() => {
      if (!props.allowInteractions) return;
      rootRef.current?.addEventListener("wheel", (e) => {
        e.preventDefault();
      });
    }, []);

    useEffect(() => {
      if (isDefined(props.zoom)) {
        setZoom(clampZoom(props.zoom));
      }
    }, [props.zoom]);

    useEffect(() => {
      if (isDefined(props.pan)) {
        setPan(processPan(props.pan));
      }
    }, [props.pan, processPan]);

    useEffect(() => {
      if (isDefined(props.brightness)) {
        setBrightness(props.brightness);
      }
    }, [props.brightness]);

    useEffect(() => {
      if (isDefined(props.contrast)) {
        setContrast(props.contrast);
      }
    }, [props.contrast]);

    useEffect(() => {
      if (isDefined(props.saturation)) {
        setSaturation(props.saturation);
      }
    }, [props.saturation]);

    useEffect(() => {
      drawVideo();
    }, [filters, zoom, pan, canvasWidth, canvasHeight]);

    useEffect(() => {
      let rafId: number;
      const observer = new ResizeObserver(() => {
        rafId && cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          props.onResize?.(videoDimensions);
        });
      });

      observer.observe(rootRef.current!);

      return () => {
        rafId && cancelAnimationFrame(rafId);
        observer.disconnect();
      };
    }, [videoDimensions]);

    const refSource: VideoRef = {
      currentFrame,
      length,
      playing,
      zoom,
      pan,
      videoDimensions,
      width: canvasWidth,
      height: canvasHeight,
      set currentTime(time: number) {
        const video = videoRef.current;

        if (video && time !== this.currentTime) {
          video.currentTime = time;
        }
      },
      get currentTime() {
        return videoRef.current?.currentTime ?? 0;
      },
      get duration() {
        return videoRef.current?.duration ?? 0;
      },
      get volume() {
        return videoRef.current?.volume ?? 1;
      },
      set volume(value: number) {
        const video = videoRef.current;

        if (video) {
          video.currentTime = value;
        }
      },
      adjustPan(x, y) {
        return processPan({ x, y });
      },
      setZoom(value) {
        setZoom(clampZoom(value));
      },
      setPan(x, y) {
        const pan = this.adjustPan(x, y);

        setPan(pan);
      },
      setContrast(value) {
        setContrast(value);
      },
      setBrightness(value) {
        setBrightness(value);
      },
      setSaturation(value) {
        setSaturation(value);
      },
      play() {
        prepareLoop();
        videoRef.current?.play();
      },
      pause() {
        videoRef.current?.pause();
        if (isFF(FF_VIDEO_FRAME_SEEK_PRECISION)) {
          // If duration is not finite,
          // then we are trying to pause (most probably caused by buffering) before video is loaded
          // so we need to correct the duration to 0 to avoid NaN currentTime
          this.currentTime = clamp(this.frameSteppedTime(), 0, this.duration || 0);
        }
      },
      seek(time) {
        this.currentTime = clamp(time, 0, this.duration);
        requestAnimationFrame(() => drawVideo());
      },
      frameSteppedTime(time?: number, isZeroBasedFrame = false): number {
        if (isFF(FF_VIDEO_FRAME_SEEK_PRECISION)) {
          return (
            Math.round((time ?? this.currentTime) / BROWSER_TIME_PRECISION) * BROWSER_TIME_PRECISION +
            (isZeroBasedFrame ? BROWSER_TIME_PRECISION : 0)
          );
        }
        return time ?? this.currentTime;
      },
      goToFrame(frame: number) {
        const frameClamped = clamp(frame, 1, length);

        // We need to subtract 1 from the frame number because the frame number is 1-based
        // and the currentTime is 0-based
        const frameZeroBased = frameClamped - 1;

        // Calculate exact frame time
        const exactTime = frameZeroBased / framerate;

        // Round to next closest browser precision frame time
        this.currentTime = this.frameSteppedTime(exactTime, true);
      },
    };

    if (ref instanceof Function) {
      ref(refSource);
    } else if (ref) {
      ref.current = refSource;
    }

    const { prepareLoop } = useLoopRange({
      loopFrameRange: props.loopFrameRange,
      selectedFrameRange: props.selectedFrameRange,
      videoRef,
      refSource,
      framerate,
      onRedrawRequest: () => {
        updateFrame(true);
      },
    });

    useEffect(() => {
      const { width, height } = videoDimensions;
      const ratio = zoomRatio(canvasWidth, canvasHeight, width, height);

      if (videoDimensions.ratio !== ratio) {
        const result = { ...videoDimensions, ratio };

        setVideoDimensions(result);

        if (props.zoom !== videoDimensions.ratio) {
          props.onResize?.(result);
        }
      }
    }, [zoom, canvasWidth, canvasHeight, videoDimensions]);

    useEffect(() => {
      let isLoaded = false;
      let loadTimeout: ReturnType<typeof setTimeout> | undefined = undefined;
      let timeout: ReturnType<typeof setTimeout> | undefined = undefined;

      const checkVideoLoaded = () => {
        if (isLoaded) return;

        if (supportedFileTypeRef.current === false) {
          setLoading(false);
          return;
        }

        if (videoRef.current?.readyState === 4) {
          isLoaded = true;
          const video = videoRef.current;

          loadTimeout = setTimeout(() => {
            const length = isFF(FF_VIDEO_FRAME_SEEK_PRECISION)
              ? Math.round(video.duration * framerate)
              : Math.ceil(video.duration * framerate);
            const [width, height] = [video.videoWidth, video.videoHeight];

            const dimensions = {
              width,
              height,
              ratio: zoomRatio(canvasWidth, canvasHeight, width, height),
            };

            setVideoDimensions(dimensions);
            setLength(length);
            setLoading(false);
            updateFrame(true);

            props.onLoad?.({
              ...refSource,
              videoDimensions: dimensions,
              length,
            });
          }, 200);
          return;
        }

        timeout = setTimeout(checkVideoLoaded, 10);
      };

      checkVideoLoaded();

      return () => {
        if (timeout) {
          clearTimeout(timeout);
        }
        if (loadTimeout) {
          clearTimeout(loadTimeout);
        }
      };
    }, []);

    // Trick to load/dispose the video
    useEffect(() => {
      return () => {
        const context = contextRef.current;

        if (context) {
          context.clearRect(0, 0, context.canvas.width, context.canvas.height);
        }

        contextRef.current = undefined;
        canvasRef.current = undefined;
        videoRef.current = undefined;
        rootRef.current = undefined;
      };
    }, []);

    return (
      <div ref={rootRef as any} className={cn("video-canvas").toClassName()}>
        {loading && (
          <div className={cn("video-canvas").elem("loading").toClassName()}>
            <div className={cn("spinner").toClassName()} />
          </div>
        )}
        <div
          className={cn("video-canvas").elem("view").toClassName()}
          onClick={props.onClick}
          style={{
            width: canvasWidth,
            height: canvasHeight,
          }}
        >
          <VirtualCanvas
            ref={(instance) => {
              if (instance && canvasRef.current !== instance) {
                canvasRef.current = instance;
                contextRef.current = instance.getContext("2d");
              }
            }}
            width={canvasWidth}
            height={canvasHeight}
          />
          {!isSyncedBuffering && !loading && buffering && (
            <div className={cn("video-canvas").elem("buffering").toClassName()} aria-label="Buffering Media Source" />
          )}
        </div>

        <VirtualVideo
          ref={videoRef as MutableRefObject<HTMLVideoElement>}
          controls={false}
          preload="auto"
          src={props.src}
          speed={props.speed}
          muted={props.muted ?? false}
          canPlayType={(supported) => (supportedFileTypeRef.current = supported)}
          onPlay={handleVideoPlay}
          onPause={handleVideoPause}
          onLoadedData={delayedUpdate}
          onCanPlay={delayedUpdate}
          onSeeked={(event) => {
            if (!isSyncedBuffering) {
              delayedUpdate();
            }
            props.onSeeked?.(event);
          }}
          onSeeking={(event) => {
            if (!isSyncedBuffering) {
              delayedUpdate();
            }
            props.onSeeked?.(event);
          }}
          onTimeUpdate={(event) => {
            if (!isSyncedBuffering) {
              delayedUpdate();
            }
            props.onTimeUpdate?.(event);
          }}
          onProgress={delayedUpdate}
          onPlaying={handleVideoPlaying}
          onWaiting={handleVideoWaiting}
          onEnded={handleVideoEnded}
          onError={handleVideoError}
        />
      </div>
    );
  }),
);

VideoCanvas.displayName = "VideoCanvas";
