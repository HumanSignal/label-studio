import { getRoot, protect, types, unprotect } from "mobx-state-tree";
import ProcessAttrsMixin from "./ProcessAttrs";
import { parseValue } from "../utils/data";
import { guidGenerator } from "../utils/unique";
import { FF_DEV_3391 } from "../utils/feature-flags";
import { ff } from "@humansignal/core";

const DynamicChildrenMixin = types
  .model({})
  .views(() => ({
    get defaultChildType() {
      console.error("DynamicChildrenMixin needs to implement defaultChildType getter in views");
      return undefined;
    },
  }))
  .actions((self) => {
    const prepareDynamicChildrenData = (data, store, parent) => {
      // Right now with the FF on, we are traverseing the Tree in the store::initRoot and the
      // AnnotationStore::afterCreate which will generate duplicated children so we only need to
      // run this once, when the annotation store is not yet initialized
      if (ff.isActive(FF_DEV_3391) && store.annotationStore.initialized) return;

      if (data && data.length) {
        for (const obj of data) {
          // No matter if using Interactive View mode or not, we add the ids for consistency
          const id = obj.id ?? guidGenerator();
          parent.children.push({
            type: self.defaultChildType,
            ...obj,
            id,
            children: [],
          });

          const child = parent.children[parent.children.length - 1];

          child.updateValue?.(store);
          prepareDynamicChildrenData(obj.children, store, child);
        }
      }
    };

    const postprocessDynamicChildren = (children, store) => {
      children?.forEach((item) => {
        postprocessDynamicChildren(item.children, store);
        item.updateValue?.(store);
      });
    };

    return {
      updateWithDynamicChildren(data, store) {
        const root = getRoot(self);

        self.children = self.children ?? [];

        unprotect(root);
        prepareDynamicChildrenData(data, store, self);
        protect(root);
      },

      updateValue(store) {
        // If we want to use resolveValue or another asynchronous method here
        // we may need to rewrite this, initRoot and the other related methods
        // (actually a lot of them) to work asynchronously as well

        if (ff.isActive(FF_DEV_3391)) {
          self.updateDynamicChildren(store);
        } else {
          setTimeout(() => {
            self.updateDynamicChildren(store);
          });
        }
      },

      updateDynamicChildren(store) {
        if (self.locked !== true) {
          const valueFromTask = parseValue(self.value, store.task?.dataObj);

          if (!valueFromTask) return;

          self.updateWithDynamicChildren(valueFromTask, store);
          // Refresh the RandomizableMixin snapshot now that children have
          // been replaced; the previous shuffled order is stale.
          self.reshuffle?.();
          if (self.annotation) {
            self.annotation.setupHotKeys();
            self.needsUpdate?.();
          }
        }
      },

      generateDynamicChildren(data, store) {
        if (self.children) {
          const children = self.children;
          const len = children.length;
          const start = len - data.length;
          const slice = children.slice(start, len);

          postprocessDynamicChildren(slice, store);
        }
      },
    };
  });

export default types.compose(ProcessAttrsMixin, DynamicChildrenMixin);
