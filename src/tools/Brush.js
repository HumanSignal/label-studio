import React from "react";
import { observer } from "mobx-react";
import { types } from "mobx-state-tree";

import BaseTool from "./Base";
import SliderTool from "../components/Tools/Slider";
import ToolMixin from "../mixins/Tool";
import { BrushRegionModel } from "../regions/BrushRegion";
import { guidGenerator, restoreNewsnapshot } from "../core/Helpers";

const ToolView = observer(({ item }) => {
  return (
    <SliderTool
      selected={item.selected}
      icon={"highlight"}
      onClick={ev => {
        item.manager.unselectAll();
        item.setSelected(true);
      }}
      onChange={val => {
        item.setStroke(val);
      }}
    />
  );
});

const _Tool = types
  .model({
    strokeWidth: types.maybeNull(types.number),
  })
  .views(self => ({
    get viewClass() {
      return <ToolView item={self} />;
    },
  }))
  .actions(self => ({
    fromStateJSON(obj, fromModel) {
      if ("brushlabels" in obj.value) {
        const states = restoreNewsnapshot(fromModel);
        states.fromStateJSON(obj);

        self.createRegion({
          x: obj.value.points[0],
          y: obj.value.points[1],
          stroke: states.getSelectedColor(),
          states: states,
          coordstype: "px",
          points: obj.value.points,
        });
      }
    },

    createRegion({ x, y, stroke, states, coordstype, mode, points, rotation }) {
      const c = self.control;

      let localStates = states;

      if (states && !states.length) {
        localStates = [states];
      }

      const brush = BrushRegionModel.create({
        id: guidGenerator(),

        strokeWidth: self.strokeWidth || c.strokeWidth,
        strokeColor: stroke,

        states: localStates,

        points: points,
        // eraserpoints: eraserpoints,

        coordstype: coordstype,

        mode: mode,
      });

      self.obj.addShape(brush);

      return brush;
    },

    setStroke(val) {
      self.strokeWidth = val;
    },

    mouseupEv() {
      self.mode = "viewing";
    },

    mousemoveEv(ev, [x, y]) {
      if (self.mode !== "drawing") return;

      const shape = self.getActiveShape;
      shape.addPointsCurrent(Math.floor(x), Math.floor(y));
    },

    mousedownEv(ev, [x, y]) {
      self.mode = "drawing";

      if (self.control.isSelected) {
        const { states, strokecolor } = self.statesAndParams;

        const brush = self.createRegion({
          x: x,
          y: y,
          stroke: strokecolor,
          states: states,
          coordstype: "px",
        });

        brush.addPoints({ type: "add" });
        // brush.
        if (self.control.type == "brushlabels") self.control.unselectAll();
      } else {
        const brush = self.getActiveShape;
        brush.addPoints({ type: "add" });
      }
    },
  }));

const Brush = types.compose(ToolMixin, BaseTool, _Tool);

export { Brush };
