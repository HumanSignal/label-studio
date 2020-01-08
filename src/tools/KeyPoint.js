import { types } from "mobx-state-tree";

import BaseTool from "./Base";
import ToolMixin from "../mixins/Tool";
import { KeyPointRegionModel } from "../regions/KeyPointRegion";
import { guidGenerator, restoreNewsnapshot } from "../core/Helpers";

const _Tool = types
  .model({
    default: types.optional(types.boolean, true),
  })
  .actions(self => ({
    fromStateJSON(obj, fromModel) {
      if ("keypointlabels" in obj.value) {
        const states = restoreNewsnapshot(fromModel);
        states.fromStateJSON(obj);

        self.createRegion({
          x: obj.value.x,
          y: obj.value.y,
          width: obj.value.width,
          fillcolor: states.getSelectedColor(),
          states: [states],
          coordstype: "perc",
        });
      }
    },

    createRegion({ x, y, width, fillcolor, states, coordstype }) {
      const c = self.control;
      const image = self.obj;

      const kp = KeyPointRegionModel.create({
        id: guidGenerator(),
        x: x,
        y: y,
        width: parseFloat(width),
        opacity: parseFloat(c.opacity),
        fillcolor: fillcolor,
        states: states,
        coordstype: coordstype,
      });

      image.addShape(kp);
    },

    clickEv(ev, [x, y]) {
      if (self.control.type === "keypointlabels" && !self.control.isSelected) return;

      const { states, fillcolor } = self.statesAndParams;

      self.createRegion({
        x: x,
        y: y,
        width: self.control.strokewidth,
        fillcolor: fillcolor,
        states: states,
        coordstype: "px",
      });

      if (self.control.type === "keypointlabels") self.control.unselectAll();
    },
  }));

const KeyPoint = types.compose(ToolMixin, BaseTool, _Tool);

// Registry.addTool("keypoint", KeyPoint);

export { KeyPoint };
