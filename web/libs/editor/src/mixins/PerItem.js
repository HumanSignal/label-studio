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
    /**
     * Validates all values related to the current classification per item (Multi Items Segmentation).
     *
     * - This method should not be overridden.
     * - It is used only in validate method of the ClassificationBase mixin.
     *
     * @returns {boolean}
     * @private
     */
    _validatePerItem() {
      const objectTag = self.toNameTag;

      return self.annotation.regions
        .every((reg) => {
          const result = reg.results.find(s => s.from_name === self);

          if (!result?.hasValue) {
            return true;
          }
          const value = result.mainValue;
          const isValid = self.validateValue(value);

          if (!isValid) {
            objectTag.setCurrentItem(reg.item_index);
            return false;
          }
          return true;
        });
    },
    createPerItemResult() {
      self.createPerObjectResult({
        item_index: self.toNameTag.currentItemIndex,
      });
    },
  }));

export default PerItemMixin;
