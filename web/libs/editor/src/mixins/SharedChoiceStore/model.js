import { detach, types } from 'mobx-state-tree';
import Types from '../../core/Types';

/**
 * Shared Store Model is used to hold children of tags such Taxonomy and Choices.
 *
 * Every tag that uses the SharedStoreMixin will have a reference to the same store
 * defined by `sharedStore` attribute.
 */
export const SharedStoreModel = types.model('SharedStoreModel', {
  id: types.identifier,
  locked: false,
  children: Types.unionArray(['choice']),
})
  .actions((self) => ({
    setChildren(val) {
      self.children = val;
    },
    clear() {
      self.children = [];
    },
    lock() {
      self.locked = true;
    },
    unlock() {
      self.locked = false;
    },
    destroy() {
      self.clear();
      detach(self);
    },
  }));
