import { observer } from 'mobx-react';
import { FC, useEffect, useMemo, useRef, useState } from 'react';
import { useLocalStorageState } from '../../hooks/useLocalStorageState';
import { useMemoizedHandlers } from '../../hooks/useMemoizedHandlers';
import { Block, Elem } from '../../utils/bem';
import { clamp, isDefined } from '../../utils/utilities';
import { TimelineContextProvider } from './Context';
import { Controls } from './Controls';
import { Seeker } from './Seeker';
import './Timeline.styl';
import { TimelineContextValue, TimelineControlsStepHandler, TimelineProps } from './Types';
import { default as Views } from './Views';

const TimelineComponent: FC<TimelineProps> = ({
  regions,
  zoom = 1,
  mode = 'frames',
  length = 1024,
  position = 1,
  framerate = 24,
  hopSize = 1,
  playing = false,
  fullscreen = false,
  disableView = false,
  defaultStepSize = 10,
  allowSeek = true,
  allowFullscreen = true,
  allowViewCollapse = true,
  controlsOnTop = true,
  data,
  speed,
  className,
  formatPosition,
  ...props
}) => {
  const View = Views[mode];

  const [currentPosition, setCurrentPosition] = useState(clamp(position, 1, Infinity));
  const [seekOffset, setSeekOffset] = useState(0);
  const [seekVisibleWidth, setSeekVisibleWidth] = useState(0);
  const [viewCollapsed, setViewCollapsed] = useLocalStorageState('video-timeline', false, {
    fromString(value) { return value === 'true' ? true : false; },
    toString(value) { return String(value); },
  });
  const getCurrentPosition = useRef(() => {
    return currentPosition;
  });

  const step = useMemo(() => defaultStepSize * zoom, [zoom, defaultStepSize]);

  const handlers = useMemoizedHandlers({
    onReady: props.onReady,
    onPlay: props.onPlay,
    onPause: props.onPause,
    onSeek: props.onSeek,
    onPositionChange: props.onPositionChange,
    onToggleVisibility: props.onToggleVisibility,
    onAddRegion: props.onAddRegion,
    onDeleteRegion: props.onDeleteRegion,
    onSelectRegion: props.onSelectRegion,
    onAction: props.onAction,
    onFullscreenToggle: props.onFullscreenToggle,
    onSpeedChange: props.onSpeedChange,
  });

  const setInternalPosition = (newPosition: number) => {
    setCurrentPosition((currentPosition) => {
      const clampedValue = clamp(newPosition, 1, length);

      if (clampedValue !== currentPosition) {
        handlers.onPositionChange?.(clampedValue);
        return clampedValue;
      }

      return currentPosition;
    });
  };

  const increasePosition: TimelineControlsStepHandler = (_, stepSize) => {
    const nextPosition = stepSize?.(length, currentPosition, regions, 1) ?? currentPosition + hopSize;

    setInternalPosition(nextPosition);
  };

  const decreasePosition: TimelineControlsStepHandler = (_, stepSize) => {
    const nextPosition = stepSize?.(length, currentPosition, regions, -1) ?? currentPosition - hopSize;

    setInternalPosition(nextPosition);
  };

  const contextValue = useMemo<TimelineContextValue>(() => ({
    position,
    length,
    regions,
    step,
    data,
    playing,
    seekOffset,
    settings: View.settings,
    visibleWidth: seekVisibleWidth,
  }), [
    position,
    seekOffset,
    seekVisibleWidth,
    length,
    regions,
    step,
    playing,
    View.settings,
    data,
  ]);

  useEffect(() => {
    // Using ref hack to avoid running effect on current position change
    // when position is updated from props
    const currentPosition = getCurrentPosition.current();

    if (position !== currentPosition) {
      setCurrentPosition(clamp(position, 1, length));
    }
  }, [position, length]);

  const controls = (
    <Elem name="topbar">
      <Controls
        length={length}
        position={currentPosition}
        frameRate={framerate}
        playing={playing}
        volume={props.volume}
        controls={props.controls}
        altHopSize={props.altHopSize}
        customControls={props.customControls}
        collapsed={viewCollapsed}
        onPlay={() => handlers.onPlay?.()}
        onPause={() => handlers.onPause?.()}
        fullscreen={fullscreen}
        disableFrames={disableView}
        allowFullscreen={allowFullscreen}
        allowViewCollapse={allowViewCollapse}
        onFullScreenToggle={(fullscreen) => handlers.onFullscreenToggle?.(fullscreen)}
        onVolumeChange={props.onVolumeChange}
        onStepBackward={decreasePosition}
        onStepForward={increasePosition}
        onRewind={(steps) => setInternalPosition(isDefined(steps) ? currentPosition - steps : 0)}
        onForward={(steps) => setInternalPosition(isDefined(steps) ? currentPosition + steps : length)}
        onPositionChange={setInternalPosition} 
        onToggleCollapsed={setViewCollapsed}
        formatPosition={formatPosition}
        extraControls={View.Controls && !disableView ? (
          <View.Controls
            onAction={(e, action, data) => {
              handlers.onAction?.(e, action, data);
            }}
          />
        ) : null}
        mediaType="timeline"
      />

      {allowSeek && (
        <Seeker
          length={length}
          step={step}
          leftOffset={View.settings?.leftOffset}
          position={currentPosition}
          seekOffset={seekOffset}
          seekVisible={seekVisibleWidth}
          onIndicatorMove={setSeekOffset}
          onSeek={setInternalPosition}
          minimap={View.Minimap ? (
            <View.Minimap/>
          ) : null}
        />
      )}
    </Elem>
  );

  const view = !viewCollapsed && !disableView && (
    <Elem name="view">
      <View.View
        step={step}
        length={length}
        regions={regions}
        playing={playing}
        zoom={zoom}
        speed={speed}
        volume={props.volume}
        controls={props.controls}
        position={currentPosition}
        offset={seekOffset}
        leftOffset={View.settings?.leftOffset}
        onReady={(data) => handlers.onReady?.(data)}
        onScroll={setSeekOffset}
        onResize={setSeekVisibleWidth}
        onPositionChange={setInternalPosition}
        onPlay={() => handlers.onPlay?.()}
        onPause={() => handlers.onPause?.()}
        onSeek={(position) => handlers.onSeek?.(position) }
        onToggleVisibility={(id, visible) => handlers.onToggleVisibility?.(id, visible)}
        onAddRegion={(reg) => handlers.onAddRegion?.(reg)}
        onDeleteRegion={(id) => handlers.onDeleteRegion?.(id)}
        onSelectRegion={(e, id, select) => handlers.onSelectRegion?.(e, id, select)}
        onSpeedChange={(speed) => handlers.onSpeedChange?.(speed)}
        onZoom={props.onZoom}
      />
    </Elem>
  );

  return (
    <TimelineContextProvider value={contextValue}>
      <Block name="timeline" className={className}>
        {controlsOnTop ? (
          <>
            {controls}
            {view}
          </>
        ) : (
          <>
            {view}
            {controls}
          </>
        )}
      </Block>
    </TimelineContextProvider>
  );
};

export const Timeline = observer(TimelineComponent);
