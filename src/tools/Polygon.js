import { types } from "mobx-state-tree";

import BaseTool from "./Base";
import ToolMixin from "../mixins/Tool";
import { PolygonRegionModel } from "../regions/PolygonRegion";
import { guidGenerator, restoreNewsnapshot } from "../core/Helpers";

const _Tool = types
  .model({
    default: types.optional(types.boolean, true),
    mode: types.optional(types.enumeration(["drawing", "viewing", "brush", "eraser"]), "viewing"),
  })
  .views(self => ({
    get getActivePolygon() {
      const poly = self.getActiveShape;

      if (poly && poly.closed) return null;
      if (poly === undefined) return null;

      return poly;
    },
  }))
  .actions(self => ({
    fromStateJSON(obj, fromModel) {
      if ("polygonlabels" in obj.value) {
        const states = restoreNewsnapshot(fromModel);

        if (!states.fromStateJSON) return;

        states.fromStateJSON(obj);

        const poly = self.createRegion({
          id: obj.id,
          x: obj.value.points[0][0],
          y: obj.value.points[0][1],
          width: 10,
          stroke: states.getSelectedColor(),
          states: [states],
          coordstype: "perc",
          stateFlag: true,
        });

        for (var i = 1; i < obj.value.points.length; i++) {
          poly.addPoint(obj.value.points[i][0], obj.value.points[i][1]);
        }

        poly.closePoly();
      }
    },

    createRegion({ x, y, width, stroke, states, coordstype, stateFlag, id }) {
      let newPolygon = self.getActivePolygon;
      // self.freezeHistory();
      const image = self.obj;
      const c = self.control;

      if (!newPolygon) {
        // const c = self.controlButton();
        const polygonID = id ? id : guidGenerator();
        const polygonOpacity = parseFloat(c.opacity);
        const polygonStrokeWidth = parseInt(c.strokewidth);

        newPolygon = PolygonRegionModel.create({
          id: polygonID,

          opacity: polygonOpacity,
          fillcolor: c.fillcolor,

          strokewidth: polygonStrokeWidth,
          strokecolor: stroke,

          pointsize: c.pointsize,
          pointstyle: c.pointstyle,

          states: states,

          coordstype: coordstype,
        });

        image.addShape(newPolygon);
      }

      newPolygon.addPoint(x, y);

      return newPolygon;
    },

    clickEv(ev, [x, y]) {
      if (self.control.type === "polygonlabels") if (!self.control.isSelected && self.getActivePolygon === null) return;

      const { states, strokecolor } = self.statesAndParams;

      // if there is a polygon in process of creation right now, but
      // the user has clicked on the labels without first finishing
      // it, we close it automatically and create a new one with new
      // labels
      if (states.length && self.getActivePolygon) {
        self.getActivePolygon.closePoly();
      }

      self.createRegion({
        x: x,
        y: y,
        width: 10,
        stroke: strokecolor,
        states: states,
        coordstype: "px",
        stateFlag: false,
      });

      if (self.control.type == "polygonlabels") self.control.unselectAll();
    },
  }));

const Polygon = types.compose(ToolMixin, BaseTool, _Tool);

export { Polygon };

// ImageTools.addTool(PolygonTool);
