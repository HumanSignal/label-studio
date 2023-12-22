import { CSSProperties, FC, useMemo, useRef } from 'react';
import { IconVolumeFull, IconVolumeHalf, IconVolumeMute } from '../../../assets/icons';
import { Range } from '../../../common/Range/Range';
import { WS_VOLUME } from '../../../tags/object/AudioNext/constants';
import { TimelineSideControlProps } from '../Types';

export const AudioVolumeControl: FC<TimelineSideControlProps> = ({
  volume = 0.5,
  onVolumeChange,
}) => {
  const storedVolume = useRef(volume);
  const style: CSSProperties = { color: '#99A0AE' };
  const icon = useMemo(() => {
    if (volume > 0.5) return <IconVolumeFull style={style}/>;
    else if (volume > 0) return <IconVolumeHalf style={style}/>;
    return <IconVolumeMute style={style}/>;
  }, [volume]);

  return (
    <Range
      continuous
      min={WS_VOLUME.min}
      max={WS_VOLUME.max}
      step={WS_VOLUME.step}
      value={volume}
      minIcon={icon}
      onChange={volume => onVolumeChange?.(Number(volume))}
      onMinIconClick={() => {
        if (volume === 0) {
          onVolumeChange?.(storedVolume.current);
        } else {
          storedVolume.current = volume;
          onVolumeChange?.(0);
        }
      }}
    />
  );
};
