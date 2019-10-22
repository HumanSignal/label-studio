import { types, flow } from "mobx-state-tree";

import { runTemplate } from "../../core/Template";

const ProcessAttrsMixin = types.model().actions(self => ({
  updateValue(store) {
    self._value = runTemplate(self.value, store.task.dataObj) || "";
  },
}));

export default ProcessAttrsMixin;
