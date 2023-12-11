import { destroy, detach, types } from 'mobx-state-tree';
import { SharedStoreModel } from './model';
import { Stores } from './mixin';

/**
 * StoreExtender injects into the AnnotationStore and holds every created SharedStore.
 *
 * Underlying tags that use SharedStoreMixin have access to methods of this mixin to add
 * their SharedStore instances.
 */
export const StoreExtender = types.model('StoreExtender', {
  sharedStores: types.optional(types.map(SharedStoreModel), {}),
}).actions((self) => ({
  addSharedStore(store) {
    self.sharedStores.set(store.id, store);
  },
  beforeReset() {
    self.sharedStores.forEach((store) => {
      detach(store);
    });
    self.sharedStores.clear();
  },
  afterReset() {
    Stores.forEach((store) => {
      self.addSharedStore(store);
    });
  },
  beforeDestroy() {
    self.sharedStores.forEach((store) => {
      detach(store);
      destroy(store);
    });
    self.sharedStores.clear();
  },
}));
