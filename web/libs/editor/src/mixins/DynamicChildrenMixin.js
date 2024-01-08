import { getRoot, protect, types, unprotect } from 'mobx-state-tree';
import ProcessAttrsMixin from './ProcessAttrs';
import { parseValue } from '../utils/data';


const DynamicChildrenMixin = types.model({
})
  .views(() => ({
    get defaultChildType() {
      console.error('DynamicChildrenMixin needs to implement defaultChildType getter in views');
      return undefined;
    },
  }))
  .actions(self => {
    const prepareDynamicChildrenData = (data, store, parent) => {
      if (data && data.length) {
        for (const obj of data) {
          parent.children.push({
            type: self.defaultChildType,
            ...obj,
            children: [],
          });

          const child = parent.children[parent.children.length - 1];

          child.updateValue?.(store);
          prepareDynamicChildrenData(obj.children, store, child);
        }
      }
    };

    const postprocessDynamicChildren = (children, store) => {
      children?.forEach(item => {
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

        setTimeout(() => {
          self.updateDynamicChildren(store);
        });
      },

      updateDynamicChildren(store) {
        if (self.locked !== true) {
          const valueFromTask = parseValue(self.value, store.task?.dataObj);

          if (!valueFromTask) return;

          self.updateWithDynamicChildren(valueFromTask, store);
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
