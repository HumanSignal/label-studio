import type React from "react";
import { type FC, type MouseEvent, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Toggle } from "@humansignal/ui";
import { cn } from "../../../utils/bem";

import { IconConfig } from "@humansignal/icons";
import { TimelineContext } from "../Context";
import { ControlButton } from "../Controls";
import { Slider } from "./Slider";
import { SpectrogramControl } from "./SpectrogramControl";
import "./ConfigControl.scss";
import { FF_AUDIO_SPECTROGRAMS, isFF } from "../../../utils/feature-flags";

// Define Scale Options Type
type SpectrogramScale = "linear" | "log" | "mel";

const MAX_SPEED = 2.5;
const MAX_ZOOM = 150;
const MIN_SPEED = 0.5;
const MIN_ZOOM = 1;

export interface ConfigControlProps {
  configModal: boolean;
  speed: number;
  amp: number;
  onSetModal?: (e: MouseEvent<HTMLButtonElement>) => void;
  onSpeedChange: (speed: number) => void;
  onAmpChange: (amp: number) => void;
  toggleVisibility?: (layerName: string, isVisible: boolean) => void;
  layerVisibility?: Map<string, boolean>;
  waveform: Waveform;
}

type Waveform = {};

export const ConfigControl: FC<ConfigControlProps> = ({
  configModal,
  speed,
  amp,
  onSpeedChange,
  onSetModal,
  onAmpChange,
  toggleVisibility,
  layerVisibility,
  waveform,
}) => {
  const { settings, changeSetting } = useContext(TimelineContext);
  const playbackSpeed = speed ?? 1;
  const [isTimeline, setTimeline] = useState(true);
  const [isAudioWave, setAudioWave] = useState(true);
  const [isSpectrogram, setSpectrogram] = useState(false);

  // Refs for positioning
  const modalRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Effect to dynamically position the modal within the viewport
  useEffect(() => {
    // Check if modal is open and refs are attached
    if (configModal && modalRef.current && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const modal = modalRef.current;
      // Temporarily make it visible off-screen to measure its actual size
      modal.style.opacity = "0";
      modal.style.position = "fixed"; // Ensure fixed for measurement
      modal.style.top = "-9999px";
      modal.style.left = "-9999px";

      const calculatePosition = () => {
        if (!modalRef.current || !buttonRef.current) return; // Refs might detach
        const modalRect = modal.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        const margin = 10; // Margin from viewport edges

        // Default position: below the button, aligned left
        let top = buttonRect.bottom + 5;
        let left = buttonRect.left;

        // Adjust top if modal goes below viewport
        if (top + modalRect.height > viewportHeight - margin) {
          // Try placing above the button first
          const topAbove = buttonRect.top - modalRect.height - 5;
          if (topAbove > margin) {
            top = topAbove; // Place above if enough space
          } else {
            top = viewportHeight - modalRect.height - margin; // Stick to bottom edge
          }
        }

        // Adjust top if modal goes above viewport
        if (top < margin) {
          top = margin;
        }

        // Adjust left if modal goes beyond right edge
        if (left + modalRect.width > viewportWidth - margin) {
          left = viewportWidth - modalRect.width - margin;
        }

        // Adjust left if modal goes beyond left edge
        if (left < margin) {
          left = margin;
        }

        // Apply calculated styles
        modal.style.top = `${top}px`;
        modal.style.left = `${left}px`;
        modal.style.opacity = "1"; // Make visible after positioning
      };

      // Calculate after a short delay or next frame to allow measurement
      requestAnimationFrame(calculatePosition);
    } else if (modalRef.current) {
      // Reset opacity when closing
      modalRef.current.style.opacity = "0";
    }
  }, [configModal]); // Rerun effect when modal visibility changes

  useEffect(() => {
    if (layerVisibility) {
      const defaultDisplay = true;
      setTimeline(layerVisibility?.get?.("timeline") ?? defaultDisplay);
      setAudioWave(layerVisibility?.get?.("waveform") ?? defaultDisplay);
      setSpectrogram(layerVisibility?.get?.("spectrogram") ?? false);
    }
  }, [layerVisibility]);

  const handleSetTimeline = () => {
    setTimeline(!isTimeline);
    toggleVisibility?.("timeline", !isTimeline);
  };

  const handleSetAudioWave = () => {
    setAudioWave(!isAudioWave);
    toggleVisibility?.("waveform", !isAudioWave);
    toggleVisibility?.("regions", !isAudioWave);
  };

  const handleSetSpectrogram = () => {
    setSpectrogram(!isSpectrogram);
    toggleVisibility?.("spectrogram", !isSpectrogram);
  };

  const handleChangePlaybackSpeed = (e: React.FormEvent<HTMLInputElement>) => {
    const _playbackSpeed = Number.parseFloat(e.currentTarget.value);
    if (isNaN(_playbackSpeed)) return;
    onSpeedChange(_playbackSpeed);
  };

  const handleChangeAmp = (e: React.FormEvent<HTMLInputElement>) => {
    const _amp = Number.parseFloat(e.currentTarget.value);
    onAmpChange(_amp);
  };

  const renderLayerToggles = () => {
    return (
      <div className={cn("audio-config").elem("buttons").toClassName()}>
        <div className={cn("audio-config").elem("menu-button").toClassName()} onClick={handleSetTimeline}>
          {isTimeline ? "Hide" : "Show"} timeline
        </div>
        <div className={cn("audio-config").elem("menu-button").toClassName()} onClick={handleSetAudioWave}>
          {isAudioWave ? "Hide" : "Show"} audio wave
        </div>
        {isFF(FF_AUDIO_SPECTROGRAMS) && (
          <div className={cn("audio-config").elem("menu-button").toClassName()} onClick={handleSetSpectrogram}>
            {isSpectrogram ? "Hide" : "Show"} spectrogram
          </div>
        )}
      </div>
    );
  };

  const renderModal = () => {
    const modalJSX = (
      <div
        className={cn("audio-config").elem("modal").toClassName()}
        ref={modalRef}
        onClick={(e: MouseEvent<HTMLDivElement>) => e.stopPropagation()}
        style={{ opacity: 0, position: "fixed" }}
      >
        <div className={cn("audio-config").elem("scroll-content").toClassName()}>
          <div className={cn("audio-config").elem("section-header").toClassName()}>Playback Settings</div>
          <Slider
            min={MIN_SPEED}
            max={MAX_SPEED}
            step={0.1}
            value={speed}
            description={"Playback speed"}
            info={"Increase or decrease the playback speed"}
            onChange={handleChangePlaybackSpeed}
          />
          <Slider
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.1}
            value={amp}
            description={"Audio zoom y-axis"}
            info={"Increase or decrease the appearance of amplitude"}
            onChange={handleChangeAmp}
          />
          <div className={cn("audio-config").elem("toggle").toClassName()}>
            <Toggle
              checked={settings?.loopRegion}
              onChange={(e) => changeSetting?.("loopRegion", e.target.checked)}
              label="Loop Regions"
              labelProps={{ size: "small" }}
            />
          </div>
          <div className={cn("audio-config").elem("toggle").toClassName()}>
            <Toggle
              checked={settings?.autoPlayNewSegments}
              onChange={(e) => changeSetting?.("autoPlayNewSegments", e.target.checked)}
              label="Auto-play New Regions"
              labelProps={{ size: "small" }}
            />
          </div>

          {isFF(FF_AUDIO_SPECTROGRAMS) && (
            <>
              <div className={cn("audio-config").elem("section-header").toClassName()}>Spectrogram Settings</div>
              <SpectrogramControl waveform={waveform} />
            </>
          )}
        </div>
        {renderLayerToggles()}
      </div>
    );

    return typeof document !== "undefined" ? createPortal(modalJSX, document.body) : null;
  };

  return (
    <div
      className={cn("audio-config").toClassName()}
      ref={buttonRef as any}
      onClick={(e: MouseEvent<HTMLButtonElement>) => e.stopPropagation()}
    >
      <ControlButton look={configModal ? "filled" : undefined} onClick={onSetModal} aria-label="Audio settings">
        {<IconConfig />}
      </ControlButton>
      {configModal && renderModal()}
    </div>
  );
};
