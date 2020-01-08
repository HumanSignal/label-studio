import { types, destroy } from "mobx-state-tree";

import BaseTool from "./Base";
import ToolMixin from "../mixins/Tool";
import { RectRegionModel } from "../regions/RectRegion";
import { guidGenerator, restoreNewsnapshot } from "../core/Helpers";

const minSize = { w: 3, h: 3 };

function reverseCoordinates(r1, r2) {
  let r1X = r1.x,
    r1Y = r1.y,
    r2X = r2.x,
    r2Y = r2.y,
    d;

  if (r1X > r2X) {
    d = Math.abs(r1X - r2X);
    r1X = r2X;
    r2X = r1X + d;
  }

  if (r1Y > r2Y) {
    d = Math.abs(r1Y - r2Y);
    r1Y = r2Y;
    r2Y = r1Y + d;
  }
  /**
   * Return the corrected rect
   */
  return { x1: r1X, y1: r1Y, x2: r2X, y2: r2Y };
}

const _Tool = types
  .model({
    default: true,
    mode: types.optional(types.enumeration(["drawing", "viewing", "brush", "eraser"]), "viewing"),
  })
  .views(self => ({}))
  .actions(self => ({
    fromStateJSON(obj, fromModel) {
      if ("rectanglelabels" in obj.value) {
        const states = restoreNewsnapshot(fromModel);
        states.fromStateJSON(obj);

        self.createRegion({
          x: obj.value.x,
          y: obj.value.y,
          sw: obj.value.width,
          sh: obj.value.height,
          stroke: states.getSelectedColor(),
          states: [states],
          coordstype: "perc",
          rotation: obj.value.rotation,
        });
      }
    },

    createRegion({ x, y, sw, sh, states, coordstype, stroke, rotation }) {
      const control = self.control;

      let localStates = states;

      if (states && !states.length) {
        localStates = [states];
      }

      const rect = RectRegionModel.create({
        id: guidGenerator(),
        states: localStates,
        coordstype: coordstype,

        x: x,
        y: y,
        width: sw,
        height: sh,
        rotation: rotation,

        opacity: parseFloat(control.opacity),
        fillcolor: stroke || control.fillcolor,
        strokeWidth: control.strokeWidth,
        strokeColor: stroke || control.stroke,
      });

      self.obj.addShape(rect);

      return rect;
    },

    updateDraw(x, y) {
      const shape = self.getActiveShape;

      const { x1, y1, x2, y2 } = reverseCoordinates({ x: shape._start_x, y: shape._start_y }, { x: x, y: y });

      shape.setPosition(x1, y1, x2 - x1, y2 - y1, shape.rotation);
    },

    mousedownEv(ev, [x, y]) {
      if (self.control.type === "rectanglelabels" && !self.control.isSelected) return;

      self.mode = "drawing";

      const { states, strokecolor } = self.statesAndParams;
      const rect = self.createRegion({
        x: x,
        y: y,
        sh: 1,
        sw: 1,
        stroke: strokecolor,
        states: states,
        coordstype: "px",
      });

      if (self.control.type === "rectanglelabels") self.control.unselectAll();

      return rect;
    },

    mousemoveEv(ev, [x, y]) {
      if (self.mode !== "drawing") return;

      self.updateDraw(x, y);
    },

    mouseupEv(ev, [x, y]) {
      if (self.mode !== "drawing") return;

      const s = self.getActiveShape;

      if (s.width < minSize.w || s.height < minSize.h) destroy(s);

      self.mode = "viewing";
    },
  }));

const Rect = types.compose(ToolMixin, BaseTool, _Tool);

export { Rect };
