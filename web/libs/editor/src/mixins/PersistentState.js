import { getRoot, types } from 'mobx-state-tree';

const PersistentStateMixin = types
  .model({})
  .views(() => ({
    get persistentValuesKey() {
      return 'labelStudio:storedValues';
    },

    get persistentValues() {
      return {};
    },
  }))
  .actions(self => ({
    afterCreate() {
      setTimeout(self.restoreValues);
    },

    beforeDestroy() {
      self.storeValues();
    },

    storeValues() {
      const key = self.persistentValuesKey;
      const obj = { task: getRoot(self).task?.id, values: self.persistentValues };

      localStorage.setItem(key, JSON.stringify(obj));
    },

    restoreValues() {
      const stored = JSON.parse(localStorage.getItem(self.persistentValuesKey) || '{}');

      if (!stored || stored.task !== getRoot(self).task?.id) return;
      const values = stored.values || {};

      for (const key of Object.keys(values)) {
        self[key] = values[key];
      }
    },
  }));

export default PersistentStateMixin;
