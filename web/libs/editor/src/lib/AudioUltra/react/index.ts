import { type MutableRefObject, useContext, useEffect, useMemo, useRef, useState } from "react";

import { TimelineContext } from "../../../components/Timeline/Context";
import { isTimeRelativelySimilar } from "../Common/Utils";
import type { Layer } from "../Visual/Layer";
import { Waveform, type WaveformFrameState, type WaveformOptions } from "../Waveform";

export const useWaveform = (
  containter: MutableRefObject<HTMLElement | null | undefined>,
  options: Omit<WaveformOptions, "container"> & {
    onLoad?: (wf: Waveform) => void;
    onSeek?: (time: number) => void;
    onPlaying?: (playing: boolean) => void;
    onRateChange?: (rate: number) => void;
    onError?: (error: Error) => void;
    autoLoad?: boolean;
    showLabels?: boolean;
    onFrameChanged?: (frame: { width: number; height: number; zoom: number; scroll: number }) => void;
  },
) => {
  const waveform = useRef<Waveform>();
  const { showLabels = true } = options;
  const [zoom, setZoom] = useState(1);
  const [volume, setVolume] = useState(options?.volume ?? 1);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [amp, setAmp] = useState(options?.amp ?? 1);
  const [rate, setRate] = useState(options?.rate ?? 1);
  const [muted, setMuted] = useState(options?.muted ?? false);
  const [layers, setLayers] = useState<Layer[]>([]);
  const [layerVisibility, setLayerVisibility] = useState(new Map());

  const { settings } = useContext(TimelineContext);
  useEffect(() => {
    if (!waveform.current || !settings) return;
    waveform.current.settings = settings;
  }, [settings, waveform.current]);

  const onFrameChangedRef = useRef(options?.onFrameChanged);
  onFrameChangedRef.current = options?.onFrameChanged;

  const updateAfterRegionDraw = useMemo(() => {
    let prevFrameState: WaveformFrameState | null = null;
    let requestId = -1;
    return (frameState: WaveformFrameState) => {
      cancelAnimationFrame(requestId);
      requestId = requestAnimationFrame(() => {
        if (
          !prevFrameState ||
          frameState.width !== prevFrameState.width ||
          frameState.height !== prevFrameState.height ||
          frameState.zoom !== prevFrameState.zoom ||
          frameState.scroll !== prevFrameState.scroll
        ) {
          onFrameChangedRef.current?.(frameState);
          prevFrameState = frameState;
        }
      });
    };
  }, []);

  useEffect(() => {
    const wf = new Waveform({
      ...(options ?? {}),
      container: containter.current!,
    });

    if (options?.autoLoad === undefined || options?.autoLoad) {
      wf.load();
    }

    wf.on("load", () => {
      options?.onLoad?.(wf);
    });
    wf.on("play", () => {
      setPlaying(true);
    });
    wf.on("pause", () => {
      setPlaying(false);
    });
    wf.on("error", (error) => {
      options?.onError?.(error);
    });
    wf.on("playing", (time: number) => {
      if (playing && !isTimeRelativelySimilar(time, currentTime, duration)) {
        options?.onSeek?.(time);
      }
      setCurrentTime(time);
    });
    wf.on("seek", (time: number) => {
      if (!isTimeRelativelySimilar(time, currentTime, duration)) {
        options?.onSeek?.(time);
        setCurrentTime(time);
      }
    });
    wf.on("zoom", setZoom);
    wf.on("frameDrawn", updateAfterRegionDraw);
    wf.on("muted", setMuted);
    wf.on("durationChanged", setDuration);
    wf.on("volumeChanged", setVolume);
    wf.on("rateChanged", (newRate) => {
      options?.onRateChange?.(newRate);
      setRate(newRate);
    });
    wf.on("layersUpdated", (layers) => {
      const layersArray = [];
      const layerVis = new Map();

      for (const layer of layers.values()) {
        layersArray.push(layer);
        layerVis.set(layer.name, layer.isVisible);
      }
      setLayers(layersArray);
      setLayerVisibility(layerVis);
    });

    waveform.current = wf;

    return () => {
      waveform.current?.destroy();
    };
  }, []);

  useEffect(() => {
    const animationFrameId = requestAnimationFrame(() => {
      if (!waveform.current) return;

      const isWfPlaying = waveform.current.playing ?? false;
      if (playing !== isWfPlaying) {
        if (playing) {
          waveform.current.play();
        } else {
          waveform.current.pause();
        }
      }
    });

    options?.onPlaying?.(playing);

    return () => cancelAnimationFrame(animationFrameId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  useEffect(() => {
    const animationFrameId = requestAnimationFrame(() => {
      if (waveform.current && waveform.current.zoom !== zoom) waveform.current.zoom = zoom;
    });
    return () => cancelAnimationFrame(animationFrameId);
  }, [zoom]);

  useEffect(() => {
    const animationFrameId = requestAnimationFrame(() => {
      if (waveform.current && waveform.current.volume !== volume) waveform.current.volume = volume;
    });
    return () => cancelAnimationFrame(animationFrameId);
  }, [volume]);

  useEffect(() => {
    const animationFrameId = requestAnimationFrame(() => {
      if (waveform.current && waveform.current.rate !== rate) waveform.current.rate = rate;
    });
    return () => cancelAnimationFrame(animationFrameId);
  }, [rate]);

  useEffect(() => {
    const animationFrameId = requestAnimationFrame(() => {
      if (waveform.current && waveform.current.amp !== amp) waveform.current.amp = amp;
    });
    return () => cancelAnimationFrame(animationFrameId);
  }, [amp]);

  useEffect(() => {
    const animationFrameId = requestAnimationFrame(() => {
      if (waveform.current && waveform.current.muted !== muted) waveform.current.muted = muted;
    });
    return () => cancelAnimationFrame(animationFrameId);
  }, [muted]);

  useEffect(() => {
    const animationFrameId = requestAnimationFrame(() => {
      waveform.current?.updateLabelVisibility(showLabels);
    });
    return () => cancelAnimationFrame(animationFrameId);
  }, [showLabels]);

  return {
    waveform,
    zoom,
    setZoom,
    volume,
    setVolume,
    playing,
    setPlaying,
    duration,
    currentTime,
    setCurrentTime,
    amp,
    setAmp,
    rate,
    setRate,
    muted,
    setMuted,
    layers,
    layerVisibility,
  };
};
