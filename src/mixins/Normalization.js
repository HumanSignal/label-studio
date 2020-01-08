import { types } from "mobx-state-tree";

/**
 * Normalization
 * For normalize many labels to one value
 */
const NormalizationMixin = types
  .model({
    normInput: types.maybeNull(types.string),
    normalization: types.maybeNull(types.string),
  })
  .actions(self => ({
    /**
     * Set normalization
     * @param {*} val
     */
    setNormalization(val) {
      self.normalization = val;
    },

    /**
     * Delete normalization
     */
    deleteNormalization() {
      self.setNormalization("");
    },

    setNormInput(val) {
      self.normInput = val;
    },
  }));

export default NormalizationMixin;
