import { types } from "mobx-state-tree";

const SelectedModelMixin = types
  .model()
  .views(self => ({
    get selectedLabels() {
      return self.children.filter(c => c.selected === true);
    },

    get isSelected() {
      return self.selectedLabels.length > 0;
    },
  }))
  .actions(self => ({
    findLabel(value) {
      return self.children.find(c => c.alias === value || c.value === value);
    },

    unselectAll() {
      self.children.map(c => c.setSelected(false));
    },

    getSelectedNames() {
      return self.selectedLabels.map(c => (c.alias ? c.alias : c.value));
    },

    getSelectedString(joinstr) {
      joinstr = joinstr || " ";
      return self.getSelectedNames().join(joinstr);
    },
  }));

export default SelectedModelMixin;
