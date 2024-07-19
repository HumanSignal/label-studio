import { createRef, useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { FaPause, FaPlay } from "react-icons/fa";
import { Block, Elem } from "../../../utils/bem";
import { filename } from "../../../utils/helpers";
import { Space } from "../Space/Space";
import { Spinner } from "../Spinner";
import "./MediaPlayer.scss";
import { MediaSeeker } from "./MediaSeeker";
import { Duration } from "./Duration";
import { forwardRef } from "react";
import { FF_LSDV_4711, isFF } from "../../../utils/feature-flags";

const mediaDefaultProps = {};

if (isFF(FF_LSDV_4711)) mediaDefaultProps.crossOrigin = "anonymous";

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
    if (!isFF(FF_LSDV_4711)) return;

    // force reload on error if the source previously loaded,
    // as it may just require a new presigned url
    if (state.resetSource > 0) {
      dispatch({ type: "resetSource" });
      hasReloaded.current = true;
      media.current.load();
    }
  }, [state.resetSource]);

  useEffect(() => {
    if (!isFF(FF_LSDV_4711)) return;

    // if the source was reloaded due to error, we need to wait for it to load
    // before we can set the current time and play if it was previously playing
    if (hasReloaded.current && state.loaded) {
      hasReloaded.current = false;
      media.current.currentTime = currentTimeRef.current;

      if (wasPlaying.current) media.current.play();
    }
  }, [state.loaded]);

  const showError = isFF(FF_LSDV_4711) ? !state.resetSource && state.error : state.error;

  return enabled ? (
    <Block name="player" mod={{ video }} onClick={(e) => e.stopPropagation()}>
      {video && <MediaSource type="video" onClick={togglePlay} {...mediaProps} />}
      {showError ? (
        <Elem name="loading">Unable to play</Elem>
      ) : state.loaded ? (
        <Elem name="playback">
          <Elem name="controls" tag={Space} spread>
            <Space size="small">
              <Elem name="play" onClick={togglePlay}>
                {state.playing ? <FaPause /> : <FaPlay />}
              </Elem>
              {!video && <Elem name="track">{filename(src)}</Elem>}
            </Space>
            <Elem tag={Space} size="small" name="time">
              <Duration value={state.currentTime} format={format} />
              {" / "}
              <Duration value={state.duration} format={format} />
            </Elem>
          </Elem>

          <MediaSeeker
            video={video}
            currentTime={state.currentTime}
            duration={state.duration}
            buffer={state.buffer}
            onSeekStart={onSeekStart}
            onSeekEnd={onSeekEnd}
            onChange={onSeek}
          />
        </Elem>
      ) : (
        <Elem name="loading">
          <Spinner size="24" />
        </Elem>
      )}

      {!video && <MediaSource type="audio" {...mediaProps} ref={media} />}
    </Block>
  ) : (
    <Block
      name="player"
      onClick={(e) => {
        e.stopPropagation();
        setEnabled(true);
        waitForPlayer();
      }}
    >
      <Elem name="controls" tag={Space} spread>
        <Space size="small">
          <Elem name="play">
            <FaPlay />
          </Elem>
          <Elem name="track">Click to load</Elem>
        </Space>
        <Elem tag={Space} size="small" name="time" />
      </Elem>
    </Block>
  );
};

const MediaSource = forwardRef(({ type = "audio", src, ...props }, ref) => {
  return (
    <Elem {...mediaDefaultProps} name="media" tag={type} ref={ref} {...props}>
      <source src={src} />
    </Elem>
  );
});
