import { types } from 'mobx-state-tree';

/**
 * @todo rework this into MetaMixin for all the meta data
 * @todo it's used by too much files, so that's for later
 * Meta Information
 * Additional information for regions and their results, like text and lead_time
 */
const NormalizationMixin = types
  .model({
    meta: types.frozen<{ text?: string[] }>({}),
    // @todo do we really need it? it's used to store current value from input
    normInput: types.maybeNull(types.string),
  })
  .preProcessSnapshot((sn) => {
    if (!sn.meta) return sn;
    return {
      ...sn,
      normInput: sn.meta?.text?.[0] ?? null,
    };
  })
  .actions(self => ({
    setMetaValue(key: string, value: any) {
      self.meta = { ...self.meta, [key]: value };
    },

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

    setNormInput(val: string) {
      self.normInput = val;
    },
  }))
  .actions(self => ({
    /**
     * Delete meta text
     */
    deleteMetaText() {
      self.setMetaText('');
    },
  }));

export default NormalizationMixin;
