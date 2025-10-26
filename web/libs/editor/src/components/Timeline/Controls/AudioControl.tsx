import type React from "react";
import { type FC, type MouseEvent, useEffect, useState } from "react";
import { cn } from "../../../utils/bem";

import "./AudioControl.scss";
import { IconSoundConfig, IconSoundMutedConfig } from "@humansignal/ui";
import { ControlButton } from "../Controls";
import { Slider } from "./Slider";

const MAX_VOL = 100;

export interface AudioControlProps {
  volume: number;
  audioModal: boolean;
  onVolumeChange?: (volume: number) => void;
  onSetModal?: (e: MouseEvent<HTMLButtonElement>) => void;
}

export const AudioControl: FC<AudioControlProps> = ({ volume, onVolumeChange, onSetModal, audioModal }) => {
  const [isMuted, setMute] = useState(false);

  useEffect(() => {
    if (volume <= 0) {
      setMute(true);
    } else {
      setMute(false);
    }
  }, [volume]);

  const handleSetVolume = (e: React.FormEvent<HTMLInputElement>) => {
    const _volumeValue = Number.parseInt(e.currentTarget.value);

    if (!_volumeValue) {
      onVolumeChange?.(0);
      return;
    }
    if (_volumeValue > MAX_VOL) {
      onVolumeChange?.(MAX_VOL / 100);
      return;
    }
    if (_volumeValue < 0) {
      onVolumeChange?.(0);
      return;
    }

    onVolumeChange?.(_volumeValue / MAX_VOL);
  };

  const handleSetMute = () => {
    setMute(!isMuted);
    onVolumeChange?.(!isMuted ? 0 : 1);
  };

  const renderModal = () => {
    return (
      <div className={cn("audio-control").elem("modal").toClassName()}>
        <Slider
          min={0}
          max={MAX_VOL}
          value={Math.round(volume * MAX_VOL)}
          onChange={handleSetVolume}
          description={"Volume"}
          info={"Increase or decrease the volume of the audio"}
        />
        {renderMuteButton()}
      </div>
    );
  };

  const renderMuteButton = () => {
    return (
      <div className={cn("audio-control").elem("mute").toClassName()}>
        <div className={cn("audio-control").elem("mute-button").toClassName()} onClick={handleSetMute}>
          {isMuted ? "Unmute" : "Mute"}
        </div>
      </div>
    );
  };

  return (
    <div
      className={cn("audio-control").toClassName()}
      onClick={(e: MouseEvent<HTMLButtonElement>) => e.stopPropagation()}
    >
      <ControlButton look={audioModal ? "filled" : undefined} onClick={onSetModal}>
        {isMuted ? <IconSoundMutedConfig /> : <IconSoundConfig />}
      </ControlButton>
      {audioModal && renderModal()}
    </div>
  );
};
