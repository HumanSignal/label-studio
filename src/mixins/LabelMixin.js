import { types, getParent } from "mobx-state-tree";

import InfoModal from "../components/Infomodal/Infomodal";

/**
 * Wrapper of Control item
 */
const LabelMixin = types.model("LabelMixin").actions(self => ({
  /**
   * Get current color from Label settings
   */
  getSelectedColor() {
    // return first selected label color
    const sel = self.children.find(c => c.selected === true);

    return sel && sel.background;
  },

  /**
   * Close current polygon if user clicked on another Label
   */
  finishCurrentObject() {
    getParent(self).forEach(obj => {
      if (obj.activePolygon) {
        obj.activePolygon.closePoly();
      }
    });
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

    const objectType = obj.value[self._type];

    if (!objectType) {
      InfoModal.error(`Error with ${self._type}.`);
      return;
    }

    if (obj.id) self.pid = obj.id;

    objectType.forEach(obj => {
      const findedObj = self.findLabel(obj);

      if (!findedObj) {
        InfoModal.error(`Error with ${self._type}. Not found: ` + objectType);
        return;
      }

      findedObj.setSelected(true);
    });
  },
}));

export default LabelMixin;
