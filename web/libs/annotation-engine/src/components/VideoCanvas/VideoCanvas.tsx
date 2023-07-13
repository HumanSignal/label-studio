import { forwardRef, memo, MutableRefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Block, Elem } from '../../utils/bem';
import { FF_LSDV_4711, isFF } from '../../utils/feature-flags';
import { clamp, isDefined } from '../../utils/utilities';
import './VideoCanvas.styl';
import { MAX_ZOOM, MIN_ZOOM } from './VideoConstants';
import { VirtualCanvas } from './VirtualCanvas';
import { VirtualVideo } from './VirtualVideo';

type VideoProps = {
  src: string,
  width?: number,
  height?: number,
  position?: number,
  currentTime?: number,
  playing?: boolean,
  framerate?: number,
  muted?: boolean,
  zoom?: number,
  pan?: PanOptions,
  allowInteractions?: boolean,
  speed: number,

  allowPanOffscreen?: boolean,

  contrast?: number,
  brightness?: number,
  saturation?: number,

  onPlay?: () => void,
  onPause?: () => void,
  onClick?: () => void,
  onSeeked?: (event?: any) => void,
  onTimeUpdate?: (event: any) => void,
  onLoad?: (data: VideoRef) => void,
  onFrameChange?: (frame: number, length: number) => void,
  onEnded?: () => void,
  onResize?: (dimensions: VideoDimentions) => void,
  onError?: (error: any) => void,
}

type PanOptions = {
  x: number,
  y: number,
}

type VideoDimentions = {
  width: number,
  height: number,
  ratio: number,
}

export const clampZoom = (value: number) => clamp(value, MIN_ZOOM, MAX_ZOOM);

const zoomRatio = (
  canvasWidth: number,
  canvasHeight: number,
  width: number,
  height: number,
) => Math.min(1, Math.min((canvasWidth / width), (canvasHeight / height)));

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
    width: number,
    height: number,
    ratio: number,
  };
  readonly duration: number;
  play: () => void;
  pause: () => void;
  goToFrame: (frame: number) => void;
  seek: (time: number) => void;
  setContrast: (value: number) => void;
  setBrightness: (value: number) => void;
  setSaturation: (value: number) => void;
  setZoom: (value: number) => void;
  setPan: (x: number, y: number) => void;
  adjustPan: (x: number, y: number) => PanOptions;
}

export const VideoCanvas = memo(forwardRef<VideoRef, VideoProps>((props, ref) => {
  const raf = useRef<number>();
  const rootRef = useRef<HTMLDivElement>();
  const canvasRef = useRef<HTMLCanvasElement>();
  const contextRef = useRef<CanvasRenderingContext2D | null>();
  const videoRef = useRef<HTMLVideoElement>();
  const supportedFileTypeRef = useRef<boolean|null>(null);
  const hasLoadedRef = useRef<boolean>(false);

  const canvasWidth = useMemo(() => props.width ?? 600, [props.width]);
  const canvasHeight = useMemo(() => props.height ?? 600, [props.height]);

  const framerate = props.framerate ?? 29.97;
  const [loading, setLoading] = useState(true);
  const [length, setLength] = useState(0);
  const [currentFrame, setCurrentFrame] = useState(props.position ?? 1);
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [zoom, setZoom] = useState(props.zoom ?? 1);
  const [pan, setPan] = useState<PanOptions>(props.pan ?? { x: 0, y: 0 });

  const [videoDimensions, setVideoDimensions] = useState<VideoDimentions>({ width: 0, height: 0, ratio: 1 });

  const [contrast, setContrast] = useState(1);
  const [brightness, setBrightness] = useState(1);
  const [saturation, setSaturation] = useState(1);

  const filters = useMemo(() => {
    const result: string[] = [];

    if (contrast !== 1) result.push(`contrast(${contrast})`);
    if (brightness !== 1) result.push(`brightness(${brightness})`);
    if (saturation !== 1) result.push(`saturate(${saturation})`);

    return result.join(' ');
  }, [brightness, contrast, saturation]);

  const processPan = useCallback((pan: PanOptions) => {
    const { width, height } = videoDimensions;
    const resultWidth = width * zoom;
    const resultHeight = height * zoom;

    const xMinMax = clamp((resultWidth - canvasWidth) / 2, 0, Infinity);
    const yMinMax = clamp((resultHeight - canvasHeight) / 2, 0, Infinity);

    const panX = props.allowPanOffscreen ? pan.x : clamp(pan.x, -xMinMax, xMinMax);
    const panY = props.allowPanOffscreen ? pan.y : clamp(pan.y, -yMinMax, yMinMax);

    return { x: panX, y: panY };
  }, [props.allowPanOffscreen, canvasWidth, canvasHeight, zoom]);

  const drawVideo = useCallback(() => {
    try {
      if (contextRef.current && videoRef.current) {
        const context = contextRef.current;
        const { width, height } = videoDimensions;

        if (width === 0 && height === 0) return;

        const resultWidth = width * zoom;
        const resultHeight = height * zoom;

        const offsetLeft = ((canvasWidth - resultWidth) / 2) + pan.x;
        const offsetTop = ((canvasHeight - resultHeight) / 2) + pan.y;

        context.clearRect(0, 0, canvasWidth, canvasHeight);

        context.filter = filters;
        context.drawImage(videoRef.current,
          0, 0, width, height,
          offsetLeft, offsetTop, resultWidth, resultHeight,
        );
      }
    } catch(e) {
      console.log('Error rendering video', e);
    }
  }, [videoDimensions, zoom, pan, filters, canvasWidth, canvasHeight]);

  const updateFrame = useCallback((force = false) => {
    if (!contextRef.current) return;

    const currentTime = videoRef.current?.currentTime ?? 0;
    const frameNumber = Math.round(currentTime * framerate);
    const frame = clamp(frameNumber, 1, length || 1);
    const onChange = props.onFrameChange ?? (() => {});

    if (frame !== currentFrame || force === true) {
      setCurrentFrame(frame);
      drawVideo();
      onChange(frame, length);
    }
  }, [framerate, currentFrame, drawVideo, props.onFrameChange, length]);

  const delayedUpdate = useCallback(() => {
    if (!videoRef.current) return;
    if (!contextRef.current) return;

    const video = videoRef.current;

    if (video) {
      if (!playing) updateFrame(true);

      if (video.networkState === video.NETWORK_IDLE) {
        hasLoadedRef.current = true;
        setBuffering(false);
      } else {
        setBuffering(true);
      }
    }
  }, [playing, updateFrame]);

  // VIDEO EVENTS'
  const handleVideoPlay = useCallback(() => {
    setPlaying(true);
    setBuffering(false);
    props.onPlay?.();
  }, [props.onPlay]);

  const handleVideoPause = useCallback(() => {
    setPlaying(false);
    setBuffering(false);
    props.onPause?.();
  }, [props.onPause]);

  const handleVideoPlaying = useCallback(() => {
    setBuffering(false);
    delayedUpdate();
  }, [delayedUpdate]);

  const handleVideoWaiting = useCallback(() => {
    setBuffering(true);
  }, []);

  const handleVideoEnded = useCallback(() => {
    setPlaying(false);
    setBuffering(false);
    props.onSeeked?.();
    props.onEnded?.();
    props.onPause?.();
  }, [props.onEnded]);

  const handleVideoError = useCallback(() => {
    if (!isFF(FF_LSDV_4711)) return;

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
      raf.current = requestAnimationFrame(handleAnimationFrame);
    } else {
      cancelAnimationFrame(raf.current!);
    }
  };

  useEffect(() => {
    if (!playing) {
      drawVideo();
    }
  }, [drawVideo, playing]);

  useEffect(() => {
    if (playing) raf.current = requestAnimationFrame(handleAnimationFrame);

    return () => {
      cancelAnimationFrame(raf.current!);
    };
  }, [playing]);

  useEffect(() => {
    if (videoRef.current && props.speed)
      videoRef.current.playbackRate = props.speed;
  }, [props.speed]);

  // Handle extrnal state change [position]
  useEffect(() => {
    if (videoRef.current && props.position) {
      videoRef.current.currentTime = props.position / framerate;
    }
  }, [framerate, props.position]);

  // Handle extrnal state change [current time]
  useEffect(() => {
    if (videoRef.current && props.currentTime) {
      videoRef.current.currentTime = props.currentTime;
    }
  }, [props.currentTime]);

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
    rootRef.current?.addEventListener('wheel', (e) => {
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
    if (isDefined(props.brightness)){
      setBrightness(props.brightness);
    }
  }, [props.brightness]);

  useEffect(() => {
    if (isDefined(props.contrast)){
      setContrast(props.contrast);
    }
  }, [props.contrast]);

  useEffect(() => {
    if (isDefined(props.saturation)){
      setSaturation(props.saturation);
    }
  }, [props.saturation]);

  useEffect(() => {
    drawVideo();
  }, [filters, zoom, pan, canvasWidth, canvasHeight]);

  useEffect(() => {
    const observer = new ResizeObserver(() => {
      props.onResize?.(videoDimensions);
    });

    observer.observe(rootRef.current!);

    return () => observer.disconnect();
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
      videoRef.current?.play();
    },
    pause() {
      videoRef.current?.pause();
    },
    seek(time) {
      this.currentTime = clamp(time, 0, this.duration);
      requestAnimationFrame(() => drawVideo());
    },
    goToFrame(frame: number) {
      const frameClamped = clamp(frame, 1, length);

      this.currentTime = frameClamped / framerate;
      requestAnimationFrame(() => drawVideo());
    },
  };

  if (ref instanceof Function) {
    ref(refSource);
  } else if (ref) {
    ref.current = refSource;
  }

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
    let loadTimeout: NodeJS.Timeout | undefined = undefined;
    let timeout: NodeJS.Timeout | undefined = undefined;

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
          const length = Math.ceil(video.duration * framerate);
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
    <Block ref={rootRef} name="video-canvas">
      {loading && (
        <Elem name="loading">
          <Block name="spinner"/>
        </Elem>
      )}
      <Elem
        name="view"
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
              contextRef.current = instance.getContext('2d');
            }
          }}
          width={canvasWidth}
          height={canvasHeight}
        />
        {!loading && buffering && (
          <Elem name="buffering"/>
        )}
      </Elem>

      <VirtualVideo
        ref={videoRef as MutableRefObject<HTMLVideoElement>}
        controls={false}
        preload="auto"
        src={props.src}
        muted={props.muted ?? false}
        canPlayType={supported => (supportedFileTypeRef.current = supported)}
        onPlay={handleVideoPlay}
        onPause={handleVideoPause}
        onLoadedData={delayedUpdate}
        onCanPlay={delayedUpdate}
        onSeeked={(event) => {
          delayedUpdate();
          props.onSeeked?.(event);
        }}
        onSeeking={(event) => {
          delayedUpdate();
          props.onSeeked?.(event);
        }}
        onTimeUpdate={(event) => {
          delayedUpdate();
          props.onTimeUpdate?.(event);
        }}
        onProgress={delayedUpdate}
        onPlaying={handleVideoPlaying}
        onWaiting={handleVideoWaiting}
        onEnded={handleVideoEnded}
        onError={handleVideoError}
      />
    </Block>
  );
}));

VideoCanvas.displayName = 'VideoCanvas';
