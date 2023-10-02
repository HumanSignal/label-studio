import { observer } from 'mobx-react';
import { FC, useCallback, useState } from 'react';
import { ObjectTag } from '../../../components/Tags/Object';
import { Timeline } from '../../../components/Timeline/Timeline';
import { Block } from '../../../utils/bem';
import { WS_SPEED, WS_VOLUME, WS_ZOOM_X } from './constants';

interface AudioNextProps {
  item: any;
}

const numberify = (val: any, defaults: Record<string, number>) => {
  const numVal = Number(val);
  
  return isNaN(val) ? defaults.default : (numVal < defaults.min ? defaults.min : (numVal > defaults.max ? defaults.max : numVal));
};

const AudioNextView: FC<AudioNextProps> = ({ item }) => {
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(1);
  const [audioLength, setAudioLength] = useState(0);

  const [zoom, setZoom] = useState(numberify(item.defaultzoom, WS_ZOOM_X));
  const [volume, setVolume] = useState(numberify(item.defaultvolume, WS_VOLUME));
  const [speed, setSpeed] = useState(numberify(item.defaultspeed, WS_SPEED));

  const handleReady = useCallback((data: any) => {
    setAudioLength(data.duration * 1000);
    item.onLoad(data.surfer);
    item.onReady();
  }, []);

  const handlePositionChange = useCallback((frame: number) => {
    setPosition(frame);
  }, []);

  const handleSeek = useCallback((frame: number) => {
    setPosition(frame);
    item.handleSeek();
  }, []);

  const handleSpeed = useCallback((speed: number) => {
    setSpeed(speed);
    item.handleSpeed(speed);
  }, []);

  const formatPosition = useCallback(({ time, fps }): string => {
    const roundedFps = Math.floor(fps);
    const value = Math.floor((time * 1000) % roundedFps);
    const result = Math.floor(time >= 0 ? value : roundedFps);

    return result.toString().padStart(3, '0');
  }, []);

  const handlePlay = useCallback(() => {
    setPlaying((playing) => {
      if (!item._ws) return false;

      if (item._ws.isPlaying() === false) {
        item._ws.play();
      }

      if (playing === false) {
        item.triggerSyncPlay();
        return true;
      }
      return playing;
    });
  }, [item, playing]);

  const handlePause = useCallback(() => {
    setPlaying((playing) => {
      if (!item._ws) return false;

      if (item._ws.isPlaying() === true) {
        item._ws?.pause?.();
      }

      if (playing === true) {
        item.triggerSyncPause();
        return false;
      }
      return playing;
    });
  }, [item, playing]);

  return (
    <ObjectTag item={item}>
      <Block
        mode="wave"
        name="audio"
        tag={Timeline}
        framerate={1000}
        hopSize={1000}
        playing={playing}
        regions={item.regions}
        data={item}
        zoom={zoom}
        speed={speed}
        volume={volume}
        controls={{
          AudioVolumeControl: item.volume,
          SpeedControl: item.speed,
          ZoomControl: item.zoom,
        }}
        defaultStepSize={16}
        length={audioLength}
        position={position}
        allowSeek={false}
        allowFullscreen={false}
        allowViewCollapse={false}
        controlsOnTop={false}
        onReady={handleReady}
        onAddRegion={item.addRegion}
        onSelectRegion={item.selectRegion}
        onPositionChange={handlePositionChange}
        onSeek={handleSeek}
        onPlay={handlePlay}
        onPause={handlePause}
        onZoom={setZoom}
        onVolumeChange={setVolume}
        onSpeedChange={handleSpeed}
        formatPosition={formatPosition}
      />
    </ObjectTag>
  );
};

export const AudioNext = observer(AudioNextView);
