import { destroy, detach, getSnapshot, isAlive, types } from "mobx-state-tree";
import { SharedStoreModel } from "./model";
import { Stores } from "./mixin";

/**
 * Safely get a snapshot from a store, handling cases where it may be destroyed.
 */
function safeGetSnapshot(store) {
  try {
    if (isAlive(store)) return getSnapshot(store);
  } catch {
    /* store may be in an inconsistent state */
  }
  return null;
}

/**
 * StoreExtender injects into the AnnotationStore and holds every created SharedStore.
 *
 * Underlying tags that use SharedStoreMixin have access to methods of this mixin to add
 * their SharedStore instances.
 */
export const StoreExtender = types
  .model("StoreExtender", {
    sharedStores: types.optional(types.map(SharedStoreModel), {}),
  })
  .actions((self) => ({
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
      Stores.forEach((store, key) => {
        try {
          self.addSharedStore(store);
        } catch {
          // The cached store instance is still attached to another MST tree
          // (stale reference from a previous LSF lifecycle during SPA navigation).
          // Recreate from snapshot so we get a fresh, unattached node.
          const snapshot = safeGetSnapshot(store) ?? { id: key, children: [] };
          const freshStore = SharedStoreModel.create(snapshot);

          Stores.set(key, freshStore);
          self.addSharedStore(freshStore);
        }
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
