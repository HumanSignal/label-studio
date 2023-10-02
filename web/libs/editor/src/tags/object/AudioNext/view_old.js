
import { inject, observer } from 'mobx-react';
import { Fragment } from 'react';
import { ErrorMessage } from '../../../components/ErrorMessage/ErrorMessage';
import ObjectTag from '../../../components/Tags/Object';
import Waveform from '../../../components/Waveform/Waveform';
import AudioControls from '../Audio/Controls';
import { getEnv } from 'mobx-state-tree';

const HtxAudioView = ({ store, item }) => {
  if (!item._value) return null;
  const messages = getEnv(store).messages;

  return (
    <ObjectTag item={item}>
      <Fragment>
        {item.errors?.map((error, i) => (
          <ErrorMessage key={`err-${i}`} error={error} />
        ))}
        <Waveform
          dataField={item.value}
          src={item._value}
          muted={item.muted}
          item={item}
          selectRegion={item.selectRegion}
          handlePlay={item.handlePlay}
          handleSeek={item.handleSeek}
          onCreate={item.wsCreated}
          addRegion={item.addRegion}
          onLoad={item.onLoad}
          onReady={item.onReady}
          onError={item.onError}
          speed={item.speed}
          zoom={item.zoom}
          defaultVolume={Number(item.defaultvolume)}
          defaultSpeed={Number(item.defaultspeed)}
          defaultZoom={Number(item.defaultzoom)}
          volume={item.volume}
          regions={true}
          height={item.height}
          cursorColor={item.cursorcolor}
          cursorWidth={item.cursorwidth}
          messages={messages}
        />

        <AudioControls item={item} store={store} />
        <div style={{ marginBottom: '4px' }}></div>
      </Fragment>
    </ObjectTag>
  );
};

export const HtxAudio = inject('store')(observer(HtxAudioView));
