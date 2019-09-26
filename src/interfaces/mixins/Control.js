import { types, getSnapshot } from "mobx-state-tree";

import InfoModal from "../../components/Infomodal/Infomodal";

/**
 * Wrapper of Control item
 */
const ControlHOC = types.model("ControlHOC").actions(self => ({
  getSelectedColor() {
    // return first selected label color
    const sel = self.children.find(c => c.selected === true);
    return sel && sel.background;
  },
  /**
   * Usage check of selected controls before send completion to server
   */
  beforeSend() {
    const names = self.getSelectedNames();

    if (names && self.type === self._type) {
      self.unselectAll();
    }
  },

  fromStateJSON(obj, fromModel) {
    self.unselectAll();

    if (!obj.value.labels) {
      InfoModal.error(`Error with ${self._type}.`);
      return;
    }

    if (obj.id) self.pid = obj.id;

    obj.value.labels.forEach(l => {
      const label = self.findLabel(l);
      if (!label) {
        InfoModal.error(`Error with ${self._type}. Not found: ` + obj.value.labels);
        return;
      }

      label.markSelected(true);
    });
  },
}));

export default ControlHOC;
