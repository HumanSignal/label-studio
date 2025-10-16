import {
  IconBackward,
  IconChevronLeft,
  IconChevronRight,
  IconCollapse,
  IconExpand,
  IconFastForward,
  IconForward,
  IconFullscreen,
  IconFullscreenExit,
  IconNext,
  IconPrev,
  IconRewind,
  IconTimelinePause,
  IconTimelinePlay,
} from "@humansignal/icons";
import { Button, type ButtonProps, Space } from "@humansignal/ui";
import { type FC, memo, type MouseEvent, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { WithHotkey } from "../../common/Hotkey/WithHotkey";
import { Hotkey, type HotkeyList } from "../../core/Hotkey";
import { cn } from "../../utils/bem";
import { isDefined } from "../../utils/utilities";
import { TimelineContext } from "./Context";
import "./Controls.scss";
import * as SideControls from "./SideControls";
import type {
  TimelineControlsFormatterOptions,
  TimelineControlsProps,
  TimelineControlsStepHandler,
  TimelineCustomControls,
  TimelineProps,
  TimelineStepFunction,
} from "./Types";
import { AudioControl } from "./Controls/AudioControl";
import { ConfigControl } from "./Controls/ConfigControl";
import { TimeDurationControl } from "../TimeDurationControl/TimeDurationControl";

const positionFromTime = ({ time, fps }: TimelineControlsFormatterOptions) => {
  const roundedFps = Math.round(fps).toString();
  const fpsMs = 1000 / fps;
  const currentSecond = (time * 1000) % 1000;
  const result = Math.round(currentSecond / fpsMs).toString();

  return result.padStart(roundedFps.length, "0");
};

export const Controls: FC<TimelineControlsProps> = memo(
  ({
    length = 1000,
    position,
    frameRate = 1024,
    playing,
    buffering = false,
    collapsed,
    duration,
    extraControls,
    fullscreen,
    altHopSize,
    disableFrames,
    allowFullscreen,
    allowViewCollapse,
    onRewind,
    onForward,
    onPlay,
    onPause,
    onFullScreenToggle,
    onStepBackward,
    onPositionChange,
    onStepForward,
    onSpeedChange,
    onToggleCollapsed,
    formatPosition,
    toggleVisibility,
    layerVisibility,
    mediaType,
    ...props
  }) => {
    const { settings } = useContext(TimelineContext);
    const [altControlsMode, setAltControlsMode] = useState(false);
    const [configModal, setConfigModal] = useState(false);
    const [audioModal, setAudioModal] = useState(false);
    const [startReached, endReached] = [position === 1, position === length];

    const durationFormatted = useMemo(() => {
      return Math.max((length - 1) / frameRate, 0);
    }, [length, frameRate]);

    const currentTime = useMemo(() => {
      return (position - 1) / frameRate;
    }, [position, frameRate]);

    const customControls = useCustomControls(props.customControls);
    const stepHandlerWrapper =
      (handler: TimelineControlsStepHandler, stepSize?: TimelineStepFunction) => (e: MouseEvent<HTMLButtonElement>) => {
        handler(e, stepSize ?? undefined);
      };

    const handlePlay = useCallback(() => {
      playing ? onPause?.() : onPlay?.();
    }, [playing, onPlay, onPause]);

    const onSetVolumeModal = (e: MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      if (configModal) setConfigModal(false);

      setAudioModal(!audioModal);
    };

    const onSetConfigModal = (e: MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();

      if (audioModal) setAudioModal(false);

      setConfigModal(!configModal);
    };

    const renderControls = () => {
      return (
        <Space
          className={cn("timeline-controls").elem("group").toClassName()}
          size="small"
          style={{ gridAutoColumns: "auto" }}
        >
          <ConfigControl
            onSetModal={onSetConfigModal}
            onAmpChange={props.onAmpChange}
            onSpectrogramFftSamplesChange={props.onSpectrogramFftSamplesChange}
            onNumberOfMelBandsChange={props.onNumberOfMelBandsChange}
            onSpectrogramWindowingFunctionChange={props.onSpectrogramWindowingFunctionChange}
            onSpectrogramColorSchemeChange={props.onSpectrogramColorSchemeChange}
            configModal={configModal}
            onSpeedChange={(speed: number) => onSpeedChange?.(speed)}
            speed={props.speed || 0}
            amp={props.amp || 0}
            toggleVisibility={toggleVisibility}
            layerVisibility={layerVisibility}
          />
          <AudioControl
            volume={props.volume || 0}
            onVolumeChange={props.onVolumeChange}
            onSetModal={onSetVolumeModal}
            audioModal={audioModal}
          />
        </Space>
      );
    };

    const closeModalHandler = () => {
      setConfigModal(false);
      setAudioModal(false);
    };

    useEffect(() => {
      const keyboardHandler = (e: KeyboardEvent) => {
        if (!settings?.stepSize) return;
        const altMode = e.key === "Shift";

        if (e.type === "keydown" && altMode && !altControlsMode) {
          setAltControlsMode(true);
        } else if (e.type === "keyup" && altMode && altControlsMode) {
          setAltControlsMode(false);
        }
      };

      document.addEventListener("keydown", keyboardHandler);
      document.addEventListener("keyup", keyboardHandler);
      document.addEventListener("click", closeModalHandler);

      return () => {
        document.removeEventListener("keydown", keyboardHandler);
        document.removeEventListener("keyup", keyboardHandler);
        document.removeEventListener("click", closeModalHandler);
      };
    }, [altControlsMode]);

    const onTimeUpdateChange = (value: number) => {
      onPositionChange(value);
    };

    return (
      <Space className={cn("timeline-controls").toClassName()} spread style={{ gridAutoColumns: "auto" }}>
        {buffering && (
          <div
            className={cn("timeline-controls").elem("buffering").toClassName()}
            aria-label="Buffering Media Source"
          />
        )}
        {mediaType === "audio" ? (
          renderControls()
        ) : (
          <Space size="small">
            {props.controls &&
              Object.entries(props.controls).map(([name, enabled]) => {
                if (enabled === false) return;

                const Component = SideControls[name as keyof typeof SideControls];

                return (
                  isDefined(Component) && (
                    <Component
                      key={name}
                      length={length}
                      position={position - 1}
                      volume={props.volume}
                      onPositionChange={onPositionChange}
                      onVolumeChange={props.onVolumeChange}
                    />
                  )
                );
              })}
            {customControls?.left}
          </Space>
        )}
        <Space size="small" className="justify-between max-w-[310px]">
          <Space size="small">{extraControls}</Space>
          <Space size="small">
            {customControls?.leftCenter}
            <AltControls
              showAlterantive={altControlsMode && !disableFrames}
              main={
                <>
                  {settings?.stepSize && !disableFrames && (
                    <ControlButton
                      onClick={stepHandlerWrapper(onStepBackward, settings.stepSize)}
                      hotkey={settings?.stepAltBack}
                      disabled={startReached}
                      aria-label="Hop backward"
                    >
                      {<IconPrev />}
                    </ControlButton>
                  )}
                  <ControlButton
                    onClick={stepHandlerWrapper(onStepBackward)}
                    hotkey={settings?.stepBackHotkey}
                    disabled={startReached}
                    aria-label="Step backward"
                  >
                    <IconChevronLeft />
                  </ControlButton>
                </>
              }
              alt={
                <>
                  <ControlButton
                    onClick={() => onRewind?.()}
                    disabled={startReached}
                    hotkey={settings?.skipToBeginning}
                    aria-label="Skip to start"
                  >
                    <IconRewind />
                  </ControlButton>
                  <ControlButton
                    onClick={() => onRewind?.(altHopSize)}
                    disabled={startReached}
                    hotkey={settings?.hopBackward}
                    aria-label="Media rewind"
                  >
                    <IconBackward />
                  </ControlButton>
                </>
              }
            />
            <ControlButton
              data-testid={`playback-button:${playing ? "pause" : "play"}`}
              onClick={handlePlay}
              hotkey={settings?.playpauseHotkey}
              hotkeyScope={Hotkey.ALL_SCOPES}
              aria-label="Play"
            >
              {playing ? <IconTimelinePause /> : <IconTimelinePlay />}
            </ControlButton>
            <AltControls
              showAlterantive={altControlsMode && !disableFrames}
              main={
                <>
                  <ControlButton
                    onClick={stepHandlerWrapper(onStepForward)}
                    hotkey={settings?.stepForwardHotkey}
                    disabled={endReached}
                    aria-label="Step forward"
                  >
                    <IconChevronRight />
                  </ControlButton>
                  {settings?.stepSize && !disableFrames && (
                    <ControlButton
                      disabled={endReached}
                      onClick={stepHandlerWrapper(onStepForward, settings.stepSize)}
                      hotkey={settings?.stepAltForward}
                      aria-label="Hop forward"
                    >
                      <IconNext />
                    </ControlButton>
                  )}
                </>
              }
              alt={
                <>
                  <ControlButton
                    onClick={() => onForward?.(altHopSize)}
                    disabled={endReached}
                    hotkey={settings?.hopForward}
                    aria-label="Media fast forward"
                  >
                    <IconForward />
                  </ControlButton>
                  <ControlButton
                    aria-label="Skip to end"
                    onClick={() => onForward?.()}
                    disabled={endReached}
                    hotkey={settings?.skipToEnd}
                  >
                    <IconFastForward />
                  </ControlButton>
                </>
              }
            />
            {customControls?.rightCenter}
          </Space>
          <Space className={cn("timeline-controls").elem("group").toClassName()} collapsed>
            {!disableFrames && allowViewCollapse && (
              <ControlButton tooltip="Toggle Timeline" onClick={() => onToggleCollapsed?.(!collapsed)}>
                {collapsed ? <IconExpand /> : <IconCollapse />}
              </ControlButton>
            )}
            {allowFullscreen && (
              <ControlButton tooltip="Fullscreen" onClick={() => onFullScreenToggle?.(false)}>
                {fullscreen ? <IconFullscreenExit /> : <IconFullscreen />}
              </ControlButton>
            )}
          </Space>
        </Space>

        <Space className={cn("timeline-controls").elem("group").toClassName()} size="small">
          {mediaType === "audio" ? (
            <>
              {customControls?.right}
              <TimeDurationControl
                startTime={0}
                endTime={duration}
                minTime={0}
                maxTime={duration}
                endTimeReadonly={true}
                currentTime={position}
                onChangeStartTime={onTimeUpdateChange}
              />
            </>
          ) : (
            <>
              {customControls?.right}
              <TimeDisplay
                currentTime={currentTime}
                duration={durationFormatted}
                length={length}
                position={position}
                framerate={frameRate}
                formatPosition={formatPosition}
              />
            </>
          )}
        </Space>
      </Space>
    );
  },
);

export const ControlButton: FC<ButtonProps & { hotkey?: string }> = ({ children, hotkey, hotkeyScope, ...props }) => {
  return (
    <WithHotkey binging={hotkey as HotkeyList} hotkeyScope={hotkeyScope}>
      <Button {...props} look="string" size="small" variant="neutral">
        {children}
      </Button>
    </WithHotkey>
  );
};

interface TimeDisplay {
  currentTime: number;
  position: number;
  duration: number;
  framerate: number;
  length: number;
  formatPosition?: TimelineProps["formatPosition"];
}

const TimeDisplay: FC<TimeDisplay> = ({ currentTime, position, duration, framerate, length, formatPosition }) => {
  const pos = position - 1;
  const formatter = formatPosition ?? positionFromTime;
  const commonOptions = { position: pos, fps: framerate, length };
  const currentTimeFormatted = formatter({ time: currentTime, ...commonOptions });
  const totalTimeFormatted = formatter({ time: duration, ...commonOptions });

  return (
    <div className={cn("timeline-controls").elem("time").toClassName()}>
      <div className={cn("timeline-controls").elem("time-section").toClassName()}>
        <Time time={currentTime} position={currentTimeFormatted} />
      </div>
      <div className={cn("timeline-controls").elem("time-section").toClassName()}>
        <Time time={Math.max(duration, 0)} position={totalTimeFormatted} />
      </div>
    </div>
  );
};

const Time: FC<{ time: number; position: string }> = ({ time, position }) => {
  const timeDate = new Date(time * 1000).toISOString();
  const formatted = time > 3600 ? timeDate.substr(11, 8) : timeDate.substr(14, 5);

  return (
    <>
      {formatted}
      {position ? <span>{position}</span> : null}
    </>
  );
};

type AltControlsProps = {
  showAlterantive: boolean;
  main: JSX.Element;
  alt: JSX.Element;
  hidden?: boolean;
};

const AltControls: FC<AltControlsProps> = (props) => {
  if (props.hidden) return null;
  return props.showAlterantive ? props.alt : props.main;
};

type ControlGroups = Record<TimelineCustomControls["position"], JSX.Element[]>;

const useCustomControls = (customControls?: TimelineCustomControls[]): ControlGroups | null => {
  if (!customControls) return null;

  const groups = customControls?.reduce<ControlGroups>((groups, item) => {
    const group = groups[item.position] ?? [];
    const component = item.component instanceof Function ? item.component() : item.component;

    group.push(component);
    groups[item.position] = group;

    return groups;
  }, {} as ControlGroups);

  return groups;
};
