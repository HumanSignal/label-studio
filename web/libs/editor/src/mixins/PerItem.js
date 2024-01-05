import { types } from 'mobx-state-tree';

/**
 * This mixing defines perItem control-tag's parameter and related basic functionality
 * It should be used right after ClassificationBase mixin
 * @see ClassificationBase
 */
const PerItemMixin = types
  .model({
    peritem: types.optional(types.boolean, false),
  }).extend(self => {
    /* Validation */
    if (self.isClassificationTag !== true) {
      throw new Error('The PerItemMixin mixin should be used only for classification control-tags');
    }
    return {};
  }).views(self => ({
    get _perItemResult() {
      return self.annotation.results.find(r => {
        return r.from_name === self && r.area.item_index === self.toNameTag.currentItemIndex;
      });
    },
  }))
  .actions(self => ({
    createPerItemResult() {
      self.createPerObjectResult({
        item_index: self.toNameTag.currentItemIndex,
      });
    },
  }));

export default PerItemMixin;
