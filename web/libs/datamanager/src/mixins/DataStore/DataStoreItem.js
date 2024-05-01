import { applySnapshot, getParent, getSnapshot, types } from "mobx-state-tree";
import { guidGenerator } from "../../utils/random";
import { FF_LOPS_E_3, isFF } from "../../utils/feature-flags";

export const DataStoreItem = types
  .model("DataStoreItem", {
    updated: guidGenerator(),
    loading: isFF(FF_LOPS_E_3) ? types.maybeNull(types.union(types.string, types.boolean), false) : false,
  })
  .views((self) => ({
    get parent() {
      return getParent(getParent(self));
    },

    get isSelected() {
      return self.parent?.selected === self;
    },

    get isHighlighted() {
      return self.parent?.highlighted === self;
    },

    get isLoading() {
      return self.parent.itemIsLoading(self.id);
    },
  }))
  .actions((self) => ({
    update(newData) {
      const patch = {
        ...getSnapshot(self),
        ...newData,
        updated: guidGenerator(),
      };

      try {
        applySnapshot(self, patch);
      } catch (err) {
        console.log(err);
      }
      return self;
    },

    setLoading(loading) {
      self.loading = loading;
    },

    markUpdated() {
      self.updated = guidGenerator();
    },
  }));
