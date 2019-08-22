import React, { Fragment } from "react";
import { Button, Icon } from "antd";

import { types, getRoot } from "mobx-state-tree";
import { observer, inject } from "mobx-react";

import Registry from "../../core/Registry";
import { guidGenerator } from "../../core/Helpers";
import ProcessAttrsMixin from "../mixins/ProcessAttrs";

import Waveform from "../../components/Waveform/Waveform";

/**
 * Audio tag plays a simple audio file
 * @example
 * <View>
 *   <Audio name="audio" value="$audio"></Audio>
 * </View>
 * @example
 * <!-- Audio classification -->
 * <View>
 *   <Audio name="audio" value="$audio"></Audio>
 *   <Choices name="ch" toName="audio">
 *     <Choice value="Positive"></Choice>
 *     <Choice value="Negative"></Choice>
 *   </Choices>
 * </View>
 * @example
 * <!-- Audio transcription -->
 * <View>
 *   <Audio name="audio" value="$audio"></Audio>
 *   <TextArea name="ta" toName="audio"></TextArea>
 * </View>
 * @name Audio
 * @param {string} name of the element
 * @param {string} value of the element
 * @param {string} hotkey hotkey used to play/pause audio
 */
const TagAttrs = types.model({
  name: types.maybeNull(types.string),
  value: types.maybeNull(types.string),
  zoom: types.optional(types.boolean, true),
  volume: types.optional(types.boolean, true),
  speed: types.optional(types.boolean, true),
});

const Model = types
  .model({
    id: types.optional(types.identifier, guidGenerator),
    type: "audio",
    _value: types.optional(types.string, ""),
    playing: types.optional(types.boolean, false),
    height: types.optional(types.number, 20),
  })
  .views(self => ({
    get completion() {
      return getRoot(self).completionStore.selected;
    },
  }))
  .actions(self => ({
    fromStateJSON(obj, fromModel) {
      if (obj.value.choices) {
        self.completion.names.get(obj.from_name).fromStateJSON(obj);
      }

      if (obj.value.text) {
        self.completion.names.get(obj.from_name).fromStateJSON(obj);
      }
    },

    /**
     * Play and stop
     */
    handlePlay() {
      self.playing = !self.playing;
    },

    onLoad(ws) {
      self._ws = ws;
    },

    wsCreated(ws) {
      self._ws = ws;
    },
  }));

const AudioModel = types.compose(
  "AudioModel",
  TagAttrs,
  Model,
  ProcessAttrsMixin,
);

const HtxAudioView = observer(({ store, item }) => {
  if (!item._value) return null;

  return (
    <div>
      <Waveform
        src={item._value}
        onCreate={item.wsCreated}
        onLoad={item.onLoad}
        handlePlay={item.handlePlay}
        speed={item.speed}
        zoom={item.zoom}
        volume={item.volume}
        regions={false}
        height={item.height}
      />

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1em" }}>
        <Button
          type="primary"
          onClick={ev => {
            console.log(item);
            item._ws.playPause();
          }}
        >
          {item.playing && (
            <Fragment>
              <Icon type="pause-circle" /> Pause
            </Fragment>
          )}
          {!item.playing && (
            <Fragment>
              <Icon type="play-circle" /> Play
            </Fragment>
          )}
        </Button>
      </div>
    </div>
  );
});

const HtxAudio = inject("store")(observer(HtxAudioView));

Registry.addTag("audio", AudioModel, HtxAudio);

export { AudioModel, HtxAudio };
