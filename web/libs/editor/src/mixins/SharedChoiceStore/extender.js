import { destroy, detach, hasParent, isAlive, isStateTreeNode, types } from "mobx-state-tree";
import { SharedStoreModel } from "./model";
import { Stores, purgeStaleStore } from "./mixin";

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
      if (self.sharedStores.has(store.id)) return;
      // Belt-and-suspenders: a store that still lives in another (foreign/dead) state tree
      // cannot be attached here — `set()` would throw "already part of another state tree"
      // (BROS-849). afterReset() purges such entries so they get recreated fresh.
      if (!isStateTreeNode(store) || !isAlive(store) || hasParent(store)) return;
      self.sharedStores.set(store.id, store);
    },
    beforeReset() {
      self.sharedStores.forEach((store) => {
        detach(store);
      });
      self.sharedStores.clear();
    },
    afterReset() {
      Stores.forEach((store, id) => {
        // A cached store still attached to a live tree belongs to another editor instance
        // (e.g. DataManager's persistent annotation-preview LSF). Re-attaching it throws
        // "already part of another state tree" (BROS-849). Drop it so this tree recreates
        // a fresh store via preProcessSnapshot. Only detached stores (our own, put here by
        // beforeReset) are safe to re-adopt.
        if (!isStateTreeNode(store) || !isAlive(store) || hasParent(store)) {
          purgeStaleStore(id);
          return;
        }
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
