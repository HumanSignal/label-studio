import { types } from "mobx-state-tree";

import { runTemplate } from "../../core/Template";

const ProcessAttrsMixin = types.model().actions(self => ({
  updateLocalValue(value) {
    self._value = value;
  },

  updateValue(store) {
    self._value = runTemplate(self.value, store.task.dataObj) || "";

    if (store.task.auth && store.task.auth.enable && self.value.substr(1) === store.task.auth.to) {
      let secureResource = self.getSecureResource(store, runTemplate(self.value, store.task.dataObj));

      secureResource.then(response => {
        self.updateLocalValue(response);
      });
    }
  },
}));

export default ProcessAttrsMixin;
