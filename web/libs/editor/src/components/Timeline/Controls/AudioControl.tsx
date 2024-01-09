import React, { FC, MouseEvent, useEffect, useState } from 'react';
import { Block, Elem } from '../../../utils/bem';

import './AudioControl.styl';
import { IconSoundConfig, IconSoundMutedConfig } from '../../../assets/icons/timeline';
import { ControlButton } from '../Controls';
import { Slider } from './Slider';

const MAX_VOL = 100;

export interface AudioControlProps {
  volume: number;
  audioModal: boolean;
  onVolumeChange?: (volume: number) => void;
  onSetModal?: (e: MouseEvent<HTMLButtonElement>) => void;
}

export const AudioControl: FC<AudioControlProps> = ({
  volume,
  onVolumeChange,
  onSetModal,
  audioModal,
}) => {
  const [isMuted, setMute] = useState(false);

  useEffect(() => {
    if (volume <= 0) {
      setMute(true);
    } else {
      setMute(false);
    }
  }, [volume]);

  const handleSetVolume = (e: React.FormEvent<HTMLInputElement>) => {
    const _volumeValue = parseInt(e.currentTarget.value);

    if (!_volumeValue) {
      onVolumeChange?.(0);
      return;
    }
    if (_volumeValue > MAX_VOL) {
      onVolumeChange?.(MAX_VOL / 100);
      return;
    } else if (_volumeValue < 0) {
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
      <Elem name="modal">
        <Slider
          min={0}
          max={MAX_VOL}
          value={Math.round(volume * MAX_VOL)}
          onChange={handleSetVolume}
          description={'Volume'}
          info={'Increase or decrease the volume of the audio'}
        />
        {renderMuteButton()}
      </Elem>
    );
  };

  const renderMuteButton = () => {
    return (
      <Elem name={'mute'}>
        <Elem
          name="mute-button"
          onClick={handleSetMute}
        >
          { isMuted ? 'Unmute' : 'Mute' }
        </Elem>
      </Elem>
    );
  };

  return (
    <Block name="audio-control" onClick={(e: MouseEvent<HTMLButtonElement>) => e.stopPropagation()}>
      <ControlButton
        look={audioModal ? 'active' : undefined}
        onClick={onSetModal}
      >
        {isMuted ? <IconSoundMutedConfig/> : <IconSoundConfig/>}
      </ControlButton>
      {audioModal && renderModal()}
    </Block>
  );
};
