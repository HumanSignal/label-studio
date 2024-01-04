import React from 'react';
import { inject, observer } from 'mobx-react';
import { getEnv, types } from 'mobx-state-tree';

import AudioControls from './Audio/Controls';
import ObjectBase from './Base';
import ProcessAttrsMixin from '../../mixins/ProcessAttrs';
import ObjectTag from '../../components/Tags/Object';
import Registry from '../../core/Registry';
import Waveform from '../../components/Waveform/Waveform';
import { ErrorMessage } from '../../components/ErrorMessage/ErrorMessage';
import { AnnotationMixin } from '../../mixins/AnnotationMixin';
import { customTypes } from '../../core/CustomTypes';

/**
 * The `Audio` tag plays a simple audio file. Use this tag for basic audio annotation tasks such as classification or transcription.
 *
 * Use with the following data types: audio.
 * @example
 * <!--Play audio on the labeling interface-->
 * <View>
 *   <Audio name="audio" value="$audio" />
 * </View>
 * @example
 * <!-- Audio classification -->
 * <View>
 *   <Audio name="audio" value="$audio" />
 *   <Choices name="ch" toName="audio">
 *     <Choice value="Positive" />
 *     <Choice value="Negative" />
 *   </Choices>
 * </View>
 * @example
 * <!-- Audio transcription -->
 * <View>
 *   <Audio name="audio" value="$audio" />
 *   <TextArea name="ta" toName="audio" />
 * </View>
 * @regions AudioRegion
 * @meta_title Audio Tag for Labeling Audio
 * @meta_description Customize Label Studio to label audio data for machine learning and data science projects.
 * @param {string} name Name of the element
 * @param {string} value Data field containing path or a URL to the audio
 * @param {string} hotkey Hotkey used to play or pause audio
 * @param {string} [cursorwidth=1] - Audio pane cursor width. It is measured in pixels.
 * @param {string} [cursorcolor=#333] - Audio pane cursor color. The color should be specified in hex decimal string
 */

const TagAttrs = types.model({
  value: types.maybeNull(types.string),
  zoom: types.optional(types.boolean, false),
  volume: types.optional(types.boolean, false),
  speed: types.optional(types.boolean, false),
  hotkey: types.maybeNull(types.string),
  cursorwidth: types.optional(types.string, '1'),
  cursorcolor: types.optional(customTypes.color, '#333'),
});

const Model = types
  .model({
    type: 'audio',
    _value: types.optional(types.string, ''),
    playing: types.optional(types.boolean, false),
    height: types.optional(types.string, '20'),
  })
  .volatile(() => ({
    errors: [],
  }))
  .actions(self => ({
    handlePlay() {
      self.playing = !self.playing;
    },

    onHotKey() {
      self._ws.playPause();
      return false;
    },

    onLoad(ws) {
      self._ws = ws;
      const history = self.annotation.history;

      // In cases where we do skipNextUndoState on region creation, we need to make sure
      // that we don't skip the next undo state after it is resolved entirely.
      setTimeout(() => history.setSkipNextUndoState(false), 0);
    },

    onError(error) {
      self.errors = [error];
    },

    wsCreated(ws) {
      self._ws = ws;
    },
  }));

const AudioModel = types.compose('AudioModel', Model, TagAttrs, ProcessAttrsMixin, ObjectBase, AnnotationMixin);

const HtxAudioView = ({ store, item }) => {
  if (!item._value) return null;
  const messages = getEnv(store).messages;

  return (
    <ObjectTag item={item}>
      {item.errors?.map((error, i) => (
        <ErrorMessage key={`err-${i}`} error={error} />
      ))}
      <Waveform
        dataField={item.value}
        src={item._value}
        onCreate={item.wsCreated}
        onLoad={item.onLoad}
        onError={item.onError}
        handlePlay={item.handlePlay}
        speed={item.speed}
        zoom={item.zoom}
        volume={item.volume}
        regions={false}
        height={item.height}
        cursorColor={item.cursorcolor}
        cursorWidth={item.cursorwidth}
        messages={messages}
      />
      <AudioControls item={item} store={store} />
    </ObjectTag>
  );
};

const HtxAudio = inject('store')(observer(HtxAudioView));

Registry.addTag('audio', AudioModel, HtxAudio);
Registry.addObjectType(AudioModel);

export { AudioModel, HtxAudio };
