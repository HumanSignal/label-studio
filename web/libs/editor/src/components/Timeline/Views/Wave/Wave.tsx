import { CSSProperties, FC, MutableRefObject, MouseEvent as RMouseEvent, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Block, Elem } from '../../../../utils/bem';
import { TimelineContext } from '../../Context';
import { TimelineContextValue, TimelineViewProps } from '../../Types';
import WaveSurfer from 'wavesurfer.js';
import './Wave.styl';
import RegionsPlugin from 'wavesurfer.js/src/plugin/regions';
import TimelinePlugin from 'wavesurfer.js/src/plugin/timeline';
import { formatTimeCallback, secondaryLabelInterval, timeInterval } from './Utils';
import { clamp, isDefined, isMacOS } from '../../../../utils/utilities';
import { Range } from '../../../../common/Range/Range';
import { IconFast, IconSlow, IconZoomIn, IconZoomOut } from '../../../../assets/icons';
import { Space } from '../../../../common/Space/Space';
import CursorPlugin from 'wavesurfer.js/src/plugin/cursor';
import { useMemoizedHandlers } from '../../../../hooks/useMemoizedHandlers';
import { useMemo } from 'react';
import { WaveSurferParams } from 'wavesurfer.js/types/params';
import ResizeObserver from '../../../../utils/resize-observer';
import { WS_SPEED, WS_ZOOM_X } from '../../../../tags/object/AudioNext/constants';

export const Wave: FC<TimelineViewProps> = ({
  position,
  length,
  regions,
  volume = 1,
  zoom = WS_ZOOM_X.default,
  speed = WS_SPEED.default,
  onReady,
  onPositionChange,
  onSeek,
  onAddRegion,
  onZoom,
  onPlay,
  onPause,
  onSpeedChange,
}) => {
  const { data } = useContext(TimelineContext);

  const tracker = useRef<NodeJS.Timeout | null>(null);
  const rootRef = useRef<HTMLDivElement>();
  const waveRef = useRef<HTMLElement>();
  const timelineRef = useRef<HTMLElement>();
  const bodyRef = useRef<HTMLElement>();

  const [currentZoom, setCurrentZoom] = useState(zoom);
  const [loading, setLoading] = useState(true);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [scale, setScale] = useState(parseInt(data.defaultscale, 10) || 1);
  const storedPosition = useRef({
    zoom: currentZoom,
    scroll: scrollOffset,
  });
  const shouldStartOver = useRef(false);

  const setZoom = useCallback((value: number) => {
    const newValue = clamp(value, WS_ZOOM_X.min, WS_ZOOM_X.max);

    storedPosition.current.zoom = newValue;
    setCurrentZoom(newValue);
  }, []);

  const startOver = useCallback(() => {
    if (!shouldStartOver.current) {
      shouldStartOver.current = true;
    }
  }, []);

  const resetStartOver = useCallback(() => {
    if (shouldStartOver.current) {
      shouldStartOver.current = false;
    }
  }, []);

  const trackProgress = useRef(() => {
    const wsi = ws.current;

    if (!wsi) return;

    handlers.onPositionChange?.(wsi.getCurrentTime() * 1000);

    if (wsi.getCurrentTime() === wsi.getDuration() && !shouldStartOver) {
      startOver();
    }

    tracker.current = setTimeout(trackProgress.current);
  });

  const handlePlay = useCallback(() => {
    const wsi = ws.current;

    if (!wsi || tracker.current) return;

    if (shouldStartOver.current) {
      resetStartOver();
      wsi.setCurrentTime(0);
    }

    if (wsi.isPlaying() === true) onPlay?.();

    trackProgress.current();
  }, [onPlay, onPositionChange]);

  const handlePause = useCallback(() => {
    const wsi = ws.current;

    if (wsi?.isPlaying() === false) onPause?.();

    if (tracker.current) {
      clearTimeout(tracker.current);
      tracker.current = null;
    }
  }, [onPause]);

  const scrollTo = useCallback((value: number) => {
    const surfer = waveRef.current?.querySelector('wave');

    storedPosition.current.scroll = value;
    if (surfer) surfer.scrollLeft = value;
  }, []);

  const handleFinished = useCallback(() => {
    startOver();
    handlePause();
  }, [handlePause, startOver]);

  const handlers = useMemoizedHandlers({
    onZoom,
    onSeek,
    onPositionChange,
    onFinish: handleFinished,
    onPlay: handlePlay,
    onPause: handlePause,
  });

  const ws = useWaveSurfer({
    containter: waveRef,
    timelineContainer: timelineRef,
    speed,
    regions,
    data,
    params: {
      autoCenter: data.autocenter,
      scrollParent: data.scrollparent,
      autoCenterImmediately: true,
    },
    onLoaded: setLoading,
    onPlay: () => {
      resetStartOver();
      handlers.onPlay();
    },
    onPause: () => handlers.onPause(),
    onPlayFinished: () => handlers.onFinish(),
    onAddRegion,
    onReady,
    onScroll: (p) => {
      storedPosition.current.scroll = p;
      setScrollOffset(p);
    },
    onSeek: (p) => {
      resetStartOver();
      handlers.onSeek?.(p);
    },
    onZoom: (zoom) => handlers.onZoom?.(zoom),
  });

  // Handle timeline navigation clicks
  const onTimelineClick = useCallback((e: RMouseEvent<HTMLDivElement>) => {
    const surfer = waveRef.current!.querySelector('wave')!;
    const offset = surfer.getBoundingClientRect().left;
    const duration = ws.current?.getDuration();
    const relativeOffset = (surfer.scrollLeft + (e.clientX - offset)) / surfer.scrollWidth;
    const time = relativeOffset * (duration ?? 0);

    ws.current?.setCurrentTime(time);
  }, []);

  // Handle current cursor position
  useEffect(() => {
    let pos = 0;
    const surfer = waveRef.current?.querySelector?.('wave');

    if (surfer && length > 0) {
      const relativePosition = position / length;
      const offset = (surfer.scrollWidth * relativePosition) - surfer.scrollLeft;

      pos = offset;
    }

    setCursorPosition(pos);
  }, [position, length, zoom, currentZoom, scrollOffset, loading]);

  // Handle seeking
  useEffect(() => {
    const updatePosition = () => {
      const wsi = ws.current;
      const duration = wsi?.getDuration();
      const currentTime = wsi?.getCurrentTime();
      const pos = clamp(position / 1000, 0, duration ?? 0);

      if (!wsi) return;
      if (wsi.isPlaying()) return;
      if (!duration || isNaN(duration)) return;
      if (pos === currentTime) return;

      wsi.setCurrentTime(pos);
    };

    updatePosition();
  }, [position]);

  // Handle zoom changes
  useEffect(() => {
    requestAnimationFrame(() => {
      const wsi = ws.current;

      if (wsi && wsi.params.minPxPerSec !== currentZoom) ws.current?.zoom(currentZoom);
      scrollTo(storedPosition.current.scroll);
    });
  }, [currentZoom, scrollOffset]);

  // Handle playback speed changes
  useEffect(() => {
    ws.current?.setPlaybackRate(speed);
  }, [speed]);

  // Handle waveform scrolling position change
  useEffect(() => {
    scrollTo(scrollOffset);
  }, [scrollOffset]);

  // Handle volume change
  useEffect(() => {
    ws.current?.setVolume(volume);
  }, [volume]);

  // Handle Y scaling
  useEffect(() => {
    const wsi = ws.current;

    if (wsi) {
      wsi.params.barHeight = scale;
      wsi.drawBuffer();
    }
  }, [scale]);

  useEffect(() => {
    const observer = new ResizeObserver(() => {
      const wsi = ws.current;

      requestAnimationFrame(() => {
        if (wsi) wsi.drawBuffer();
        scrollTo(storedPosition.current.scroll);
      });
    });

    if (rootRef.current) {
      observer.observe(rootRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  // Handle wheel events for scrolling and pinch-to-zoom
  useEffect(() => {
    const elem = bodyRef.current!;
    const wave = elem.querySelector('wave')!;
    const isMac = isMacOS();

    const onWheel = (e: WheelEvent) => {
      const isVertical = Math.abs(e.deltaY) > Math.abs(e.deltaX);
      const isHorizontal = Math.abs(e.deltaY) < Math.abs(e.deltaX);

      // on macOS trackpad triggers ctrlKey automatically
      // on other platforms you must physically hold ctrl
      if (e.ctrlKey && isVertical) {
        e.preventDefault();
        requestAnimationFrame(() => {
          setZoom(Math.round(currentZoom + (-e.deltaY * 1.2)));
        });
        return;
      }

      if ((isHorizontal && isMac) || (isVertical || e.shiftKey)) e.preventDefault();

      const newScroll = () => {
        const delta = (!isMac || e.shiftKey) ? e.deltaY : e.deltaX;

        return clamp(wave.scrollLeft + (delta * 1.25), 0, wave.scrollWidth);
      };

      setScrollOffset(newScroll());
    };

    elem.addEventListener('wheel', onWheel);

    return () => elem.removeEventListener('wheel', onWheel);
  }, [currentZoom]);

  // Cursor styles
  const cursorStyle = useMemo<CSSProperties>(() => {
    return {
      left: cursorPosition,
      width: Number(data.cursorwidth ?? 2),
      background: data.cursorcolor,
    };
  }, [cursorPosition]);

  return (
    <Block name="wave" ref={rootRef}>
      <Elem name="controls">
        <Space spread style={{ gridAutoColumns: 'auto' }}>
          <Range
            continuous
            value={speed}
            resetValue={WS_SPEED.default}
            step={WS_SPEED.step}
            min={WS_SPEED.min}
            max={WS_SPEED.max}
            minIcon={<IconSlow style={{ color: '#99A0AE' }} />}
            maxIcon={<IconFast style={{ color: '#99A0AE' }} />}
            onChange={(value) => onSpeedChange?.(Number(value))}
          />
          <Range
            continuous
            value={currentZoom}
            resetValue={WS_ZOOM_X.default}
            step={WS_ZOOM_X.step}
            min={WS_ZOOM_X.min}
            max={WS_ZOOM_X.max}
            minIcon={<IconZoomOut />}
            maxIcon={<IconZoomIn />}
            onChange={value => setZoom(Number(value)) }
          />
        </Space>
      </Elem>
      <Elem name="wrapper">
        <Elem
          name="body"
          ref={bodyRef}
          onClick={onTimelineClick}
        >
          <Elem name="cursor" style={cursorStyle}/>
          <Elem name="surfer" ref={waveRef} onClick={(e: RMouseEvent<HTMLElement>) => e.stopPropagation()}/>
          <Elem name="timeline" ref={timelineRef} />
          {loading && <Elem name="loader" mod={{ animated: true }}/>}
        </Elem>
        <Elem name="scale">
          <Range
            min={1}
            max={50}
            step={0.1}
            reverse
            continuous
            value={scale}
            resetValue={1}
            align="vertical"
            onChange={(value) => setScale(Number(value))}
          />
        </Elem>
      </Elem>
    </Block>
  );
};

interface WavesurferProps {
  containter: MutableRefObject<HTMLElement | undefined>;
  timelineContainer: MutableRefObject<HTMLElement | undefined>;
  regions: any[];
  speed: number;
  data: TimelineContextValue['data'];
  params: Partial<WaveSurferParams>;
  onSeek: (progress: number) => void;
  onLoaded: (loaded: boolean) => void;
  onScroll: (position: number) => void;
  onZoom?: (zoom: number) => void;
  onPlay?: TimelineViewProps['onPlay'];
  onPause?: TimelineViewProps['onPause'];
  onReady?: TimelineViewProps['onReady'];
  onAddRegion?: TimelineViewProps['onAddRegion'];
  onPlayFinished: () => void;
}

const useWaveSurfer = ({
  containter,
  timelineContainer,
  regions,
  speed,
  data,
  params,
  onLoaded,
  onSeek,
  onPlay,
  onPause,
  onPlayFinished,
  onAddRegion,
  onReady,
  onScroll,
  onZoom,
}: WavesurferProps) => {
  const ws = useRef<WaveSurfer>();

  useEffect(() => {
    const root = containter.current!;
    const wsi = WaveSurfer.create({
      autoCenter: true,
      scrollParent: true,
      ...params,
      barHeight: 1,
      container: root,
      height: Number(containter?.current?.parentElement?.offsetHeight ?? 146),
      hideScrollbar: true,
      maxCanvasWidth: 8000,
      waveColor: '#D5D5D5',
      progressColor: '#656F83',
      cursorWidth: 0,
      backend: 'MediaElement',
      loopSelection: true,
      audioRate: speed,
      pixelRatio: 1,
      minPxPerSec: WS_ZOOM_X.default,
      plugins: [
        RegionsPlugin.create({
          slop: 5,
          deferInit: true,
          dragSelection: true,
        }),
        TimelinePlugin.create({
          deferInit: true,
          container: timelineContainer.current!,
          formatTimeCallback,
          timeInterval,
          secondaryLabelInterval,
          primaryColor: 'rgba(0,0,0,0.1)',
          secondaryColor: 'rgba(0,0,0,0.1)',
          primaryFontColor: 'rgba(0,0,0,0.4)',
          secondaryFontColor: '#000',
          labelPadding: 5,
          unlabeledNotchColor: '#ccc',
          notchPercentHeight: 50,
        }),
        CursorPlugin.create({
          wrapper: timelineContainer.current,
          color: '#000',
          showTime: true,
          followCursorY: 'true',
          opacity: '1',
          padding: '20px',
        }),
      ],
    });

    Object.assign(window, { wsi });

    wsi.setCurrentTime = (time: number) => {
      const duration = wsi.getDuration();

      if (!isNaN(duration) && time !== wsi.getCurrentTime()) {
        time = clamp(time, 0, duration);
        wsi.seekTo(time / wsi.getDuration());
      }
    };

    const getDetachedRegions = () => {
      return Object
        .values(wsi.regions.list)
        .filter((reg: any) => !isDefined(reg._region));
    };

    const removeDetachedRegions = () => {
      const detachedRegions = getDetachedRegions();

      detachedRegions.forEach(reg => reg.remove());
    };

    wsi.on('ready', () => {
      onLoaded(false);

      wsi.initPlugin('regions');
      wsi.initPlugin('timeline');

      if (regions) {
        /**
         * Mouse enter on region
         */
        wsi.on('region-mouseenter', reg => {
          reg._region?.onMouseOver();
        });

        /**
         * Mouse leave on region
         */
        wsi.on('region-mouseleave', reg => {
          reg._region?.onMouseLeave();
        });

        /**
         * Add region to wave
         */
        wsi.on('region-created', (reg) => {
          const history = data.annotation?.history;

          // if user draw new region the final state will be in `onUpdateEnd`
          // so we should skip history action in `addRegion`;
          // during annotation init this step will be rewritten at the end
          // during undo/redo this action will be skipped the same way
          history?.setSkipNextUndoState();
          const region = onAddRegion?.(reg);

          if (!region) {
            removeDetachedRegions();

            reg.on('update-end', () => {
              const newReg = wsi.addRegion({
                start: reg.start,
                end: reg.end,
                resize: false,
              });

              newReg.on('click', () => newReg.remove());

              const playCurrentRegion = () => {
                wsi.setCurrentTime(reg.start);
                newReg.play();
              };

              newReg.on('out', () => {
                wsi.setCurrentTime(reg.end);
                playCurrentRegion();
              });

              playCurrentRegion();
            });


            return;
          }

          reg._region = region;
          reg.color = region.selectedregionbg;

          reg.on('click', (e: MouseEvent) => {
            region.onClick(wsi, e);
          });

          reg.on('dblclick', (e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();

            setTimeout(function() {
              reg.playLoop();
            }, 0);
          });

          reg.on('update-end', () => {
            region.onUpdateEnd(wsi);
          });
        });
      }

      onReady?.({
        duration: wsi.getDuration(),
        surfer: wsi,
      });
    });

    wsi.setPlaybackRate(speed);

    wsi.zoom(WS_ZOOM_X.default);

    wsi.on('scroll', (e) => onScroll(e.target.scrollLeft));

    wsi.on('play', () => {
      const currentTime = wsi.getCurrentTime();

      onSeek(currentTime * 1000);
      onPlay?.();
    });

    wsi.on('pause', () => onPause?.());

    wsi.on('finish', () => {
      onPlayFinished?.();
    });

    wsi.on('zoom', (minPxPerMinute) => onZoom?.(minPxPerMinute));

    wsi.on('seek', () => {
      const currentTime = wsi.getCurrentTime();

      onSeek(currentTime * 1000);
    });

    if (data._value) wsi.load(data._value);

    ws.current = wsi;

    const handleClick = () => {
      removeDetachedRegions();
    };

    root.addEventListener('click', handleClick);

    return () => {
      root.removeEventListener('click', handleClick);
      try {
        Object.entries(wsi.getActivePlugins()).forEach(([name, active]) => {
          if (active) wsi.destroyPlugin(name);
        });
        wsi.destroy();
      } catch (error) {
        console.error('Error:', error);
      }
    };
  }, []);

  return ws;
};
