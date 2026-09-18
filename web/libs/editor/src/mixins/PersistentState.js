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
      const fingerprint = self.persistentFingerprint;

      // no stable identity (e.g. preview without a task) — don't persist
      if (!Object.values(fingerprint).every((value) => value !== undefined)) return;
      const obj = { ...fingerprint, values: self.persistentValues };

      localStorage.setItem(key, JSON.stringify(obj));
    },

    restoreValues() {
      const stored = JSON.parse(localStorage.getItem(self.persistentValuesKey) || "{}");

      if (!stored) return;
      const fingerprint = self.persistentFingerprint;

      if (!Object.values(fingerprint).every((value) => value !== undefined)) return;
      if (!Object.keys(fingerprint).every((key) => stored[key] === fingerprint[key])) return;

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
