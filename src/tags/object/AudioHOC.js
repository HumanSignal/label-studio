import { types, getRoot } from "mobx-state-tree";

import ProcessAttrsMixin from "../../mixins/ProcessAttrs";
import { guidGenerator } from "../../core/Helpers";

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
    wsCreated(ws) {
      self._ws = ws;
    },

    /**
     * Play and stop
     */
    handlePlay() {
      self.playing = !self.playing;
    },
  }));

const AudioHOCModel = types.compose("AudioHOCModel", TagAttrs, Model, ProcessAttrsMixin);

export { AudioHOCModel };
