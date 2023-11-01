import { types } from 'mobx-state-tree';
import Types from '../../core/Types';
import { SharedStoreModel } from './model';

/**
 * StoreIds and Stores act as a cache.
 *
 * The reason behind those is that we're creating a new store on the `preProcessSnapshot` when there's no
 * access to the State Tree. When the store is created, it's put into the cache and retrieved back in the
 * `afterCreate` hook of the model.
 *
 * StoreIds is just a map of existing store IDs to reference to during the `preProcessSnapshot`.
 */
export const Stores = new Map();
const StoreIds = new Set();

/**
 * Defines the ID to group SharedStores by.
 */
const SharedStoreID = types.optional(types.maybeNull(types.string), null);

/**
 * Defines the Store model referenced from the Annotation Store
 */
const Store = types.optional(types.maybeNull(types.late(() => types.reference(SharedStoreModel))), null);

/**
 * SharedStoreMixin, when injected into the model, provides an AnnotationStore level shared storages to
 * reduce the memory footprint and computation time.
 *
 * It was specifically designed to be used with Repeater tag where the memory issues are the most sound.
 *
 * This mixin provedes a `sharedStore` property to the model which is a reference to the shared store.
 *
 * The concept behind it is that whenever a model is parsing a snapshot, children are subtracted from the
 * initial snapshot, and put into the newly created SharedStore.
 *
 * The store is then put into the cache and attached to the model in the `afterCreate` hook. Any subsequent
 * models lookup the store in the cache first and use its id instead of creating a new one.
 *
 * When the store is fullfilled with children, it's locked and cannot be modified anymore. The allows the model
 * not to process children anymore and just use the store.
 *
 * Shared Stores live on the AnnotationStore level meaning that even if the user switches between annotations or
 * create new ones, they will all use the same shared store decreasing the memory footprint and computation time.
 */
export const SharedStoreMixin = types.model('SharedStoreMixin', {
  sharedstore: SharedStoreID,
  store: Store,
})
  .views((self) => ({
    get children() {
      return self.sharedChildren;
    },

    get locked() {
      return self.store?.locked ?? false;
    },

    set children(val) {
      self.store?.lock();
      self.store.setChildren(val);
    },

    get sharedChildren() {
      return self.store.children ?? [];
    },

    get storeId() {
      return self.sharedstore ?? self.name;
    },
  }))
  .actions(self => ({
    afterCreate() {
      if (!self.store) {
        const store = Stores.get(self.storeId);
        const annotationStore = Types.getParentOfTypeString(self, 'AnnotationStore');

        annotationStore.addSharedStore(store);
        StoreIds.add(self.storeId);
        self.store = self.storeId;
      }
    },
  }))
  .preProcessSnapshot((sn) => {
    const storeId = sn.sharedstore ?? sn.name;

    if (StoreIds.has(storeId)) {
      sn.store = storeId;
    } else {
      Stores.set(storeId, SharedStoreModel.create({
        id: storeId,
        children: sn._children ?? sn.children ?? [],
      }));
    }

    return sn;
  });

export const destroy = () => {
  Stores.clear();
  StoreIds.clear();
};

