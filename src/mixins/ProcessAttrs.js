import { types } from "mobx-state-tree";

import { runTemplate } from "../core/Template";

const ProcessAttrsMixin = types.model().actions(self => ({
  updateLocalValue(value) {
    self._value = value;
  },

  updateValue(store) {
    self._value = runTemplate(self.value, store.task.dataObj) || "";
  },
}));

export default ProcessAttrsMixin;
