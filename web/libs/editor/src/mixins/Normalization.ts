import { types } from "mobx-state-tree";

/**
 * @todo rework this into MetaMixin for all the meta data
 * @todo it's used by too much files, so that's for later
 * Meta Information
 * Additional information for regions and their results, like text and lead_time
 * Only text is used here actually, lead_time is stored directly in results
 */
const NormalizationMixin = types
  .model({
    // meta is a frozen bag of additional fields populated by backends and UI:
    // - text: string[]
    // - area, bbox, mean_r/mean_g/mean_b
    // - group: string
    meta: types.frozen<Record<string, any>>({}),
  })
  .actions((self) => ({
    /**
     * Set meta text
     * @param {*} text
     */
    setMetaText(text: string) {
      if (text) {
        self.meta = { ...self.meta, text: [text] };
      } else {
        const adjusted = { ...self.meta };

        delete adjusted.text;
        self.meta = adjusted;
      }
    },

    /**
     * Set meta group
     * @param {string} group
     */
    setMetaGroup(group: string) {
      if (group) {
        self.meta = { ...self.meta, group };
      } else {
        const adjusted = { ...self.meta };

        delete adjusted.group;
        self.meta = adjusted;
      }
    },
  }))
  .actions((self) => ({
    /**
     * Delete meta text
     */
    deleteMetaText() {
      self.setMetaText("");
    },

    /**
     * Clear meta group
     */
    clearMetaGroup() {
      self.setMetaGroup("");
    },
  }));

export default NormalizationMixin;
