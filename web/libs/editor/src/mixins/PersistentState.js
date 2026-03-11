import { types } from "mobx-state-tree";

const PersistentStateMixin = types
  .model({})
  .views(() => ({
    get persistentValuesKey() {
      return "labelStudio:storedValues";
    },

    get persistentValues() {
      return {};
    },

    get persistentFingerprint() {
      return {};
    },
  }))
  .actions((self) => ({
    afterCreate() {
      setTimeout(self.restoreValues);
    },

    beforeDestroy() {
      self.storeValues();
    },

    storeValues() {
      const key = self.persistentValuesKey;
      const obj = { ...self.persistentFingerprint, values: self.persistentValues };

      localStorage.setItem(key, JSON.stringify(obj));
    },

    restoreValues() {
      const stored = JSON.parse(localStorage.getItem(self.persistentValuesKey) || "{}");

      if (!stored) return;
      if (!Object.keys(self.persistentFingerprint).every((key) => stored[key] === self.persistentFingerprint[key]))
        return;

      const values = stored.values || {};

      for (const key of Object.keys(values)) {
        // Prevent restoring empty arrays that wipe out freshly loaded data
        if (Array.isArray(values[key]) && values[key].length === 0) {
          continue;
        }
        self[key] = values[key];
      }
    },
  }));

export default PersistentStateMixin;
