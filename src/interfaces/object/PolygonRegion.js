import React, { createRef, Component, Fragment } from "react";

import { observer, inject } from "mobx-react";
import { types, getParentOfType, getRoot, getParent } from "mobx-state-tree";

import Konva from "konva";
import { Shape, Label, Stage, Layer, Rect, Text, Transformer, Group, Line } from "react-konva";

import { guidGenerator, restoreNewsnapshot } from "../../core/Helpers";

import { Dropdown, Input } from "semantic-ui-react";

import Registry from "../../core/Registry";

import { LabelsModel } from "../control/Labels";
import { RatingModel } from "../control/Rating";
import { ImageModel } from "../object/Image";
import { PolygonPoint, PolygonPointView } from "./PolygonPoint";

import { PolygonLabelsModel } from "../control/PolygonLabels";

import RegionsMixin from "../mixins/Regions";
import NormalizationMixin from "../mixins/Normalization";

const Model = types
  .model({
    id: types.identifier,
    pid: types.optional(types.string, guidGenerator),

    type: "polygonregion",

    opacity: types.number,
    fillcolor: types.maybeNull(types.string),

    strokewidth: types.number,
    strokecolor: types.string,

    pointsize: types.string,
    pointstyle: types.string,

    closed: types.optional(types.boolean, false),

    points: types.array(PolygonPoint, []),

    states: types.maybeNull(types.array(types.union(LabelsModel, RatingModel, PolygonLabelsModel))),

    mouseOverStartPoint: types.optional(types.boolean, false),

    fromName: types.maybeNull(types.string),

    wp: types.maybeNull(types.number),
    hp: types.maybeNull(types.number),
  })
  .views(self => ({
    get parent() {
      return getParentOfType(self, ImageModel);
    },

    get completion() {
      return getRoot(self).completionStore.selected;
    },

    get isCW() {},

    linePoints() {
      const p = self.points.map(p => [p["x"], p["y"]]);

      const flatten = arr => {
        return arr.reduce(function(flat, toFlatten) {
          return flat.concat(Array.isArray(toFlatten) ? flatten(toFlatten) : toFlatten);
        }, []);
      };

      return flatten(p);
    },
  }))
  .actions(self => ({
    setMouseOverStartPoint(val) {
      self.mouseOverStartPoint = val;
    },

    findPolyOutline() {
      const { points } = self;
      const left = points.reduce((acc, loc) => (acc.x < loc.x ? acc : loc));
      const right = points.reduce((acc, loc) => (acc.x > loc.x ? acc : loc));

      const top = points.reduce((acc, loc) => (acc.y < loc.y ? acc : loc));
      const bottom = points.reduce((acc, loc) => (acc.y > loc.y ? acc : loc));

      return {
        x: left.x,
        y: top.y,
        width: right.x - left.x,
        height: bottom.y - top.y,
      };
    },

    coordsInside(x, y) {
      const inside = false;
      const vs = self.points;

      for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        var xi = vs[i][0],
          yi = vs[i][1];
        var xj = vs[j][0],
          yj = vs[j][1];

        var intersect = yi > y != yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

        if (intersect) inside = !inside;
      }

      return inside;
    },

    addPoint(x, y) {
      if (self.closed) return;

      if (self.mouseOverStartPoint) {
        self.closePoly();
        return;
      }
      // if (self.canClose(x, y)) {
      //     self.closePoly();
      //     return;
      // }

      self._addPoint(x, y);
    },

    insertPoint(insertIdx, x, y) {
      const p = { x: x, y: y, size: self.pointsize, style: self.pointstyle };
      self.points.splice(insertIdx, 0, p);
    },

    _addPoint(x, y) {
      self.points.push({ x: x, y: y, size: self.pointsize, style: self.pointstyle });
    },

    closePoly() {
      self.closed = true;
      self.selectRegion();
    },

    canClose(x, y) {
      if (self.points.length < 2) return false;

      const p1 = self.points[0];
      const p2 = { x: x, y: y };

      var r = 50;
      var dist_points = (p1["x"] - p2["x"]) * (p1["x"] - p2["x"]) + (p1["y"] - p2["y"]) * (p2["y"] - p2["y"]);

      if (dist_points < r) {
        return true;
      } else {
        return false;
      }
    },

    unselectRegion() {
      self.selected = false;
      self.parent.setSelected(undefined);
      self.completion.setHighlightedNode(null);
    },

    selectRegion() {
      self.selected = true;
      self.completion.setHighlightedNode(self);
      self.parent.setSelected(self.id);
    },

    setPosition(x, y, width, height, rotation) {
      self.x = x;
      self.y = y;
      self.width = width;
      self.height = height;

      self.rotation = rotation;
    },

    setScale(x, y) {
      self.scaleX = x;
      self.scaleY = y;
    },

    addState(state) {
      self.states.push(state);
    },

    setFill(color) {
      self.fill = color;
    },

    updateImageSize(wp, hp) {
      self.wp = wp;
      self.hp = hp;
    },

    toStateJSON() {
      // console.log(self.parent.naturalWidth);
      const { naturalWidth, naturalHeight, stageWidth, stageHeight } = self.parent;

      const perc_w = (stageWidth * 100) / naturalWidth;
      const perc_h = (stageHeight * 100) / naturalHeight;

      const perc_points = self.points.map(p => {
        const orig_w = (p.x * 100) / perc_w;
        const res_w = (orig_w * 100) / naturalWidth;

        const orig_h = (p.y * 100) / perc_h;
        const res_h = (orig_h * 100) / naturalHeight;

        return [res_w, res_h];
      });

      // 1024 - 100
      // 750 - x

      // x = (750 * 100) / 1024
      // x = 75

      // 300 - 75
      // y - 100

      // y = (100 * 300) / 75
      // y = 500

      // 1024 - 100
      // 500 - z

      // z = (y * 100) / 1024

      const parent = self.parent;
      const buildTree = obj => {
        const tree = {
          id: self.id,
          from_name: obj.name,
          to_name: parent.name,
          source: parent.value,
          type: "polygon",
          value: {
            points: perc_points,
          },
        };

        if (self.normalization) tree["normalization"] = self.normalization;

        return tree;
      };

      if (self.states && self.states.length) {
        return self.states.map(s => {
          const tree = buildTree(s);
          // in case of labels it's gonna be, labels: ["label1", "label2"]
          tree["value"][s.type] = s.getSelectedNames();
          tree["type"] = s.type;

          return tree;
        });
      } else {
        return buildTree(parent);
      }
    },
  }));

const PolygonRegionModel = types.compose(
  "PolygonRegionModel",
  RegionsMixin,
  NormalizationMixin,
  Model,
);

function getAnchorPoint({ flattenedPoints, a, b }) {
  const [x1, y1, x2, y2] = flattenedPoints;
  const y =
    ((x2 - x1) * (x2 * y1 - x1 * y2) + (x2 - x1) * (y2 - y1) * a + (y2 - y1) * (y2 - y1) * b) /
    ((y2 - y1) * (y2 - y1) + (x2 - x1) * (x2 - x1));
  const x =
    a -
    ((y2 - y1) * (x2 * y1 - x1 * y2 + a * (y2 - y1) - b * (x2 - x1))) / ((y2 - y1) * (y2 - y1) + (x2 - x1) * (x2 - x1));
  return [x, y];
}

function getFlattenedPoints(points) {
  const p = points.map(p => [p["x"], p["y"]]);
  return p.reduce(function(flattenedPoints, point) {
    return flattenedPoints.concat(point);
  }, []);
}

const HtxPolygonView = ({ store, item }) => {
  const self = this;
  const { name, wwidth, wheight, onChangedPosition } = item;

  let opacity = 0.5;

  const wp = item.wp || item.parent.stageWidth / item.parent.naturalWidth;
  const hp = item.hp || item.parent.stageHeight / item.parent.naturalHeight;

  const x = item.x;
  const y = item.y;
  const w = item.width;
  const h = item.height;

  const props = {};

  props["opacity"] = item.opacity;

  if (item.fillcolor) {
    props["fill"] = item.fillcolor;
  }

  props["stroke"] = item.strokecolor;
  props["strokeWidth"] = item.strokewidth;

  if (item.highlighted) {
    props["stroke"] = "red";
  }

  return (
    <Fragment>
      {item.mouseOverStartPoint}

      <Line
        points={item.linePoints()}
        fill={item.fill}
        opacity={item.opacity}
        closed={item.closed}
        redraw={item.update}
        stroke={item.stroke}
        strokeWidth={parseInt(item.strokewidth)}
        onDragStart={e => {
          item.completion.setDragMode(true);
        }}
        dragBoundFunc={function(pos) {
          let { x, y } = pos;
          /* if (x < 0) x = 0; */
          /* if (y < 0) y = 0; */

          const r = item.parent.stageWidth - this.getAttr("width");
          const b = item.parent.stageHeight - this.getAttr("height");

          /* const r = wwidth - this.getAttr('width'); */
          /* const b = wheight - this.getAttr('height'); */

          if (x > r) x = r;
          if (y > b) y = b;

          item.points.forEach(p => {
            p.movePoint(x, y);
          });

          return {
            x: 0,
            y: 0,
          };
        }}
        onDragEnd={e => {
          item.completion.setDragMode(false);

          if (!item.closed) item.closePoly();

          item.parent.setActivePolygon(null);

          item.points.forEach(p => {
            p.afterCreate();
          });
        }}
        onMouseOver={e => {
          const stage = item.parent._stageRef;

          if (store.completionStore.selected.relationMode) {
            item.setHighlight(true);
            stage.container().style.cursor = "crosshair";
          } else {
            stage.container().style.cursor = "pointer";
          }
        }}
        onMouseOut={e => {
          const stage = item.parent._stageRef;
          stage.container().style.cursor = "default";

          if (store.completionStore.selected.relationMode) {
            item.setHighlight(false);
          }
        }}
        onClick={e => {
          e.cancelBubble = true;

          if (!item.closed) return;

          const stage = item.parent._stageRef;

          if (store.completionStore.selected.relationMode) {
            stage.container().style.cursor = "default";
          }

          item.setHighlight(false);
          item.onClickRegion();
        }}
        {...props}
        draggable
      />

      {!item.closed && item.points.map((p, index) => <PolygonPointView item={p} index={index} />)}
      {item.closed && item.selected && item.points.map((p, index) => <PolygonPointView item={p} index={index} />)}
    </Fragment>
  );
};

const HtxPolygon = inject("store")(observer(HtxPolygonView));

Registry.addTag("polygonregion", PolygonRegionModel, HtxPolygon);

export { PolygonRegionModel, HtxPolygon };
