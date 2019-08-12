import React from "react";

import { types, getRoot } from "mobx-state-tree";
import { observer, inject } from "mobx-react";

import Registry from "../../core/Registry";
import { guidGenerator } from "../../core/Helpers";
import ProcessAttrsMixin from "../mixins/ProcessAttrs";

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
});

const Model = types
  .model({
    id: types.optional(types.identifier, guidGenerator),
    type: "audio",
    _value: types.optional(types.string, ""),
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
  }));

const AudioModel = types.compose(
  "AudioModel",
  TagAttrs,
  Model,
  ProcessAttrsMixin,
);

const HtxAudioView = observer(({ store, item }) => {
  // [NOTE] we can't let audio element load empty item._value
  // because it's not updating it's parent automatically
  // https://github.com/facebook/react/issues/9447
  if (!item._value) return null;

  return (
    <div>
      <audio controls style={{ width: "100%" }}>
        <source src={item._value} type="audio/mpeg" />
        Your browser does not support the audio element.
      </audio>
    </div>
  );
});

const HtxAudio = inject("store")(observer(HtxAudioView));

Registry.addTag("audio", AudioModel, HtxAudio);

export { AudioModel, HtxAudio };
