import { types } from 'mobx-state-tree';
import { isDefined } from '../../utils/utilities';

/**
 * This mixin is created as a definition of the interface of object-tags that should be able to work with valueList parameter
 * The first entity of it is Multi-Image Segmentation case
 */
const MultiItemObjectBase = types
  .model({
    valuelist: types.maybeNull(types.string),
  }).extend(self => {
    /* Validation */
    if (self.isObjectTag !== true) {
      throw new Error('The MultiItemObjectBase mixin should be used only for object-tags');
    }
    return {};
  }).views(self => ({
    get isMultiItem() {
      return isDefined(self.valuelist);
    },
    /**
     * An index of the last item for multi-items object-tag
     */
    get maxItemIndex() {
      throw new Error('MultiItemMixin needs to implement maxItemIndex getter in views');
    },
    /**
     * An index of currently selected object-tag item
     */
    get currentItemIndex() {
      throw new Error('MultiItemMixin needs to implement currentItemIndex getter in views');
    },
    /**
     * A list of regions related to the current object item
     */
    get regs() {
      if (self.isMultiItem) {
        return self.allRegs.filter(r => (r.item_index ?? 0) === self.currentItemIndex);
      }
      return self.allRegs;
    },
  }));

export default MultiItemObjectBase;
