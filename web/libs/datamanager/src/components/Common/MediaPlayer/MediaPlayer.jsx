import {
  createRef,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  forwardRef,
  createElement,
} from "react";
import { IconTimelinePause, IconTimelinePlay } from "@humansignal/icons";
import { cn } from "../../../utils/bem";
import { filename } from "../../../utils/helpers";
import { Space } from "../Space/Space";
import { Spinner } from "../Spinner";
import "./MediaPlayer.scss";
import { MediaSeeker } from "./MediaSeeker";
import { Duration } from "./Duration";

const mediaDefaultProps = { crossOrigin: "anonymous" };

const initialState = {
  duration: 0,
  currentTime: 0,
  buffer: null,
  error: false,
  loaded: false,
  playing: false,
  loading: false,
  resetSource: 0,
};

const globalAudioRef = createRef();

export const MediaPlayer = ({ src, video = false }) => {
  /** @type {import("react").RefObject<HTMLAudioElement>} */
  const media = useRef();
  const wasPlaying = useRef(false);
  const hasReloaded = useRef(false);
  const currentTimeRef = useRef(0);
  const [enabled, setEnabled] = useState(false);

  const [state, dispatch] = useReducer((state, action) => {
    switch (action.type) {
      case "duration":
        return { ...state, duration: action.payload };
      case "current":
        return { ...state, currentTime: action.payload };
      case "loaded":
        return { ...state, loaded: true };
      case "error":
        return { ...state, error: true, resetSource: state.loaded ? state.resetSource + 1 : state.resetSource };
      case "play":
        return { ...state, playing: true };
      case "pause":
        return { ...state, playing: false };
      case "buffer":
        return { ...state, buffer: action.payload };
      case "resetSource":
        return { ...state, resetSource: 0, loaded: false, error: false };
    }
  }, initialState);

  const format = useMemo(() => {
    if (state.duration >= 3600) {
      return ["hours", "minutes", "seconds"];
    }
    return ["minutes", "seconds"];
  }, [state.duration]);

  const play = useCallback(() => {
    media?.current?.play?.();
  }, []);

  const pause = useCallback(() => {
    media?.current?.pause?.();
  }, []);

  const togglePlay = useCallback(() => {
    globalAudioRef.current?.pause();
    state.playing ? pause() : play();
    globalAudioRef.current = media.current;
  }, [state, play, pause]);

  const onSeekStart = useCallback(() => {
    wasPlaying.current = state.playing;
    if (state.playing) media.current.pause();
  }, [state, wasPlaying]);

  const onSeekEnd = useCallback(() => {
    if (wasPlaying.current) {
      media.current.play();
    }
  }, [wasPlaying]);

  const onSeek = useCallback((time) => {
    currentTimeRef.current = time;
    media.current.currentTime = time;
  }, []);

  const waitForPlayer = useCallback(() => {
    if (state?.error) {
      return;
    }
    if (state?.loaded) {
      play();
    } else {
      setTimeout(() => waitForPlayer(), 10);
    }
  }, [state]);

  const mediaProps = {
    src,
    ref: media,
    controls: false,
    preload: "metadata",
    onPlay: () => dispatch({ type: "play" }),
    onPause: () => dispatch({ type: "pause" }),
    onTimeUpdate: () => dispatch({ type: "current", payload: media.current.currentTime }),
    onDurationChange: () => dispatch({ type: "duration", payload: media.current.duration }),
    onCanPlay: () => dispatch({ type: "loaded" }),
    onProgress: () => dispatch({ type: "buffer", payload: media.current.buffered }),
    onError: () => dispatch({ type: "error" }),
  };

  useEffect(() => {
    // force reload on error if the source previously loaded,
    // as it may just require a new presigned url
    if (state.resetSource > 0) {
      dispatch({ type: "resetSource" });
      hasReloaded.current = true;
      media.current.load();
    }
  }, [state.resetSource]);

  useEffect(() => {
    // if the source was reloaded due to error, we need to wait for it to load
    // before we can set the current time and play if it was previously playing
    if (hasReloaded.current && state.loaded) {
      hasReloaded.current = false;
      media.current.currentTime = currentTimeRef.current;

      if (wasPlaying.current) media.current.play();
    }
  }, [state.loaded]);

  const showError = !state.resetSource && state.error;

  return enabled ? (
    <div className={cn("player").mod({ video }).toClassName()} onClick={(e) => e.stopPropagation()}>
      {video && <MediaSource type="video" onClick={togglePlay} {...mediaProps} />}
      {showError ? (
        <div className={cn("player").elem("loading").toClassName()}>Unable to play</div>
      ) : state.loaded ? (
        <div className={cn("player").elem("playback").toClassName()}>
          <Space className={cn("player").elem("controls").toClassName()} spread>
            <Space size="small">
              <div className={cn("player").elem("play").toClassName()} onClick={togglePlay}>
                {state.playing ? <IconTimelinePause /> : <IconTimelinePlay />}
              </div>
              {!video && <div className={cn("player").elem("track").toClassName()}>{filename(src)}</div>}
            </Space>
            <Space className={cn("player").elem("time").toClassName()} size="small">
              <Duration value={state.currentTime} format={format} />
              {" / "}
              <Duration value={state.duration} format={format} />
            </Space>
          </Space>

          <MediaSeeker
            video={video}
            currentTime={state.currentTime}
            duration={state.duration}
            buffer={state.buffer}
            onSeekStart={onSeekStart}
            onSeekEnd={onSeekEnd}
            onChange={onSeek}
          />
        </div>
      ) : (
        <div className={cn("player").elem("loading").toClassName()}>
          <Spinner size="24" />
        </div>
      )}

      {!video && <MediaSource type="audio" {...mediaProps} ref={media} />}
    </div>
  ) : (
    <div
      className={cn("player").toClassName()}
      onClick={(e) => {
        e.stopPropagation();
        setEnabled(true);
        waitForPlayer();
      }}
    >
      <Space className={cn("player").elem("controls").toClassName()} spread>
        <Space size="small">
          <div className={cn("player").elem("play").toClassName()}>
            <IconTimelinePlay />
          </div>
          <div className={cn("player").elem("track").toClassName()}>Click to load</div>
        </Space>
        <Space className={cn("player").elem("time").toClassName()} size="small" />
      </Space>
    </div>
  );
};

const MediaSource = forwardRef(({ type = "audio", src, ...props }, ref) => {
  return createElement(
    type,
    {
      ...mediaDefaultProps,
      className: cn("player").elem("media").toClassName(),
      ref,
      ...props,
    },
    <source src={src} />,
  );
});
