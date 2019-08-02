import { types } from "mobx-state-tree";

const NormalizationMixin = types
  .model({
    normInput: types.maybeNull(types.string),
    normalization: types.maybeNull(types.string),
  })
  .actions(self => ({
    setNormalization(val) {
      self.normalization = val;
    },

    deleteNormalization() {
      self.setNormalization("");
    },

    setNormInput(val) {
      self.normInput = val;
    },
  }));

export default NormalizationMixin;
