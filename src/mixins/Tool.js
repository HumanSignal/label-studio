import { types } from "mobx-state-tree";

import { cloneNode } from "../core/Helpers";

const ToolMixin = types
  .model({
    selected: types.optional(types.boolean, false),
  })
  .views(self => ({
    get obj() {
      return self._manager.obj;
    },

    get manager() {
      return self._manager;
    },

    get control() {
      return self._control;
    },

    get viewClass() {
      return null;
    },

    get clonedStates() {
      const states = [self.control];
      const activeStates = states
        ? states.filter(c => c.isSelected)
        : // .filter(
          //   c =>
          //     c.type === IMAGE_CONSTANTS.rectanglelabels ||
          //     c.type === IMAGE_CONSTANTS.keypointlabels ||
          //     c.type === IMAGE_CONSTANTS.polygonlabels ||
          //     c.type === IMAGE_CONSTANTS.brushlabels,
          // )
          null;

      const clonedStates = activeStates ? activeStates.map(s => cloneNode(s)) : null;
      return clonedStates;
    },

    // returns clonedStates and some params based on the states like colors
    get statesAndParams() {
      const states = self.clonedStates;
      let fillcolor = self.control.fillcolor;
      let strokecolor = self.control.strokecolor;

      if (states && states.length) {
        const c = states[0].getSelectedColor();
        fillcolor = c;
        strokecolor = c;
      }

      return { states: states, fillcolor: fillcolor, strokecolor: strokecolor };
    },

    get getActiveShape() {
      // active shape here is the last one that was added
      const obj = self.obj;
      return obj.shapes[obj.shapes.length - 1];
    },
  }))
  .actions(self => ({
    setSelected(val) {
      self.selected = val;
    },

    event(name, ev, args) {
      const fn = name + "Ev";
      if (typeof self[fn] !== "undefined") self[fn].call(self, ev, args);
    },
  }));

export default ToolMixin;
