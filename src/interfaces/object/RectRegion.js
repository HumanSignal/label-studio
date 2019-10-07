import React, { createRef, Component, Fragment } from "react";

import { observer, inject } from "mobx-react";
import { types, getParentOfType, getParent, getRoot } from "mobx-state-tree";

import Konva from "konva";
import { Shape, Label, Stage, Layer, Rect, Text, Transformer } from "react-konva";

import { guidGenerator, restoreNewsnapshot } from "../../core/Helpers";

import Registry from "../../core/Registry";

import { LabelsModel } from "../control/Labels";
import { RectangleLabelsModel } from "../control/RectangleLabels";

import { RatingModel } from "../control/Rating";
import { ImageModel } from "../object/Image";
import RegionsMixin from "../mixins/Regions";
import NormalizationMixin from "../mixins/Normalization";
import Utils from "../../utils";

const Model = types
  .model({
    id: types.identifier,
    pid: types.optional(types.string, guidGenerator),

    type: "rectangleregion",

    x: types.number,
    y: types.number,

    _start_x: types.optional(types.number, 0),
    _start_y: types.optional(types.number, 0),

    width: types.number,
    height: types.number,

    scaleX: types.optional(types.number, 1),
    scaleY: types.optional(types.number, 1),

    rotation: types.optional(types.number, 0),

    opacity: types.number,

    fill: types.optional(types.boolean, true),
    fillcolor: types.optional(types.string, "blue"),

    strokecolor: types.optional(types.string, "blue"),
    strokewidth: types.number,

    states: types.maybeNull(types.array(types.union(LabelsModel, RatingModel, RectangleLabelsModel))),

    wp: types.maybeNull(types.number),
    hp: types.maybeNull(types.number),

    sw: types.maybeNull(types.number),
    sh: types.maybeNull(types.number),

    coordstype: types.optional(types.enumeration(["px", "perc"]), "px"),

    supportsTransform: true,
  })
  .views(self => ({
    get parent() {
      return getParentOfType(self, ImageModel);
    },

    get completion() {
      return getRoot(self).completionStore.selected;
    },
  }))
  .actions(self => ({
    afterCreate() {
      self._start_x = self.x;
      self._start_y = self.y;
    },

    unselectRegion() {
      self.selected = false;
      self.parent.setSelected(undefined);
      self.completion.setHighlightedNode(null);
    },

    coordsInside(x, y) {
      // check if x and y are inside the rectangle
      const rx = self.x;
      const ry = self.y;
      const rw = self.width * (self.scaleX || 1);
      const rh = self.height * (self.scaleY || 1);

      if (x > rx && x < rx + rw && y > ry && y < ry + rh) return true;

      return false;
    },

    selectRegion() {
      self.selected = true;
      self.completion.setHighlightedNode(self);
      self.parent.setSelected(self.id);
    },

    getCurrentCoordinates(x, y, width, height) {
      // console.log(self.width * (self.scaleX || 1));
    },

    /**
     * Boundg Box set position on canvas
     * @param {number} x
     * @param {number} y
     * @param {number} width
     * @param {number} height
     * @param {number} rotation
     */
    setPosition(x, y, width, height, rotation) {
      self.x = x;
      self.y = y;
      self.width = width;
      self.height = height;

      if (rotation < 0) {
        self.rotation = (rotation % 360) + 360;
      } else {
        self.rotation = rotation % 360;
      }
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

    updateImageSize(wp, hp, sw, sh) {
      self.wp = wp;
      self.hp = hp;

      self.sw = sw;
      self.sh = sh;

      if (self.coordstype == "perc") {
        self.x = (sw * self.x) / 100;
        self.y = (sh * self.y) / 100;
        self.width = (sw * self.width) / 100;
        self.height = (sh * self.height) / 100;
        self.coordstype = "px";
      }
    },

    toStateJSON() {
      const parent = self.parent;
      let fromEl = parent.states()[0];

      if (parent.states().length > 1) {
        parent.states().forEach(state => {
          if (state.type === "rectanglelabels") {
            fromEl = state;
          }
        });
      }

      const buildTree = obj => {
        const tree = {
          id: self.id,
          from_name: fromEl.name,
          to_name: parent.name,
          source: parent.value,
          type: "rectangle",
          value: {
            x: (self.x * 100) / self.parent.stageWidth,
            y: (self.y * 100) / self.parent.stageHeight,
            width: (self.width * (self.scaleX || 1) * 100) / self.parent.stageWidth, //  * (self.scaleX || 1)
            height: (self.height * (self.scaleY || 1) * 100) / self.parent.stageHeight,
            rotation: self.rotation,
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

const RectRegionModel = types.compose(
  "RectRegionModel",
  RegionsMixin,
  NormalizationMixin,
  Model,
);

const HtxRectangleView = ({ store, item }) => {
  return (
    <Fragment>
      <Rect
        x={item.x}
        y={item.y}
        width={item.width}
        height={item.height}
        fill={item.fill ? Utils.Colors.convertToRGBA(item.fillcolor, 0.4) : null}
        stroke={item.strokecolor}
        strokeWidth={item.strokewidth}
        strokeScaleEnabled={false}
        shadowBlur={0}
        scaleX={item.scaleX}
        scaleY={item.scaleY}
        opacity={item.opacity}
        rotation={item.rotation}
        name={item.id}
        onTransformEnd={e => {
          const t = e.target;

          item.setPosition(
            t.getAttr("x"),
            t.getAttr("y"),
            t.getAttr("width"),
            t.getAttr("height"),
            t.getAttr("rotation"),
          );
          item.setScale(t.getAttr("scaleX"), t.getAttr("scaleY"));
        }}
        onDragEnd={e => {
          const t = e.target;

          item.setPosition(
            t.getAttr("x"),
            t.getAttr("y"),
            t.getAttr("width"),
            t.getAttr("height"),
            t.getAttr("rotation"),
          );
          item.setScale(t.getAttr("scaleX"), t.getAttr("scaleY"));
        }}
        dragBoundFunc={(pos, e) => {
          let { x, y } = pos;

          item.getCurrentCoordinates(x, y, item.width, 1);

          let { stageHeight, stageWidth } = getParent(getParent(item));

          // let rightTop = x + item.width * (item.scaleX || 1);
          // let rightBottom = y + item.height * (item.scaleY || 1);

          // let leftTop = {
          //   x: x,
          //   y: y
          // };

          // let leftBottom = {
          //   x: x,
          //   y: y + item.height
          // };

          // let rightTop = {
          //   x: x + item.width,
          //   y: y
          // };

          // let rightBottom = {
          //   x: x + item.width,
          //   y: y + item.height
          // };

          if (x <= 0) {
            x = 0;
          } else if (x >= stageWidth) {
            x = stageWidth;
          }

          if (y < 0) {
            y = 0;
          } else if (y >= stageHeight) {
            y = stageHeight;
          }

          return {
            x: x,
            y: y,
          };
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
          const stage = item.parent._stageRef;

          if (store.completionStore.selected.relationMode) {
            stage.container().style.cursor = "default";
          }

          item.setHighlight(false);
          item.onClickRegion();
        }}
        draggable
      />
    </Fragment>
  );
};

const HtxRectangle = inject("store")(observer(HtxRectangleView));

Registry.addTag("rectangleregion", RectRegionModel, HtxRectangle);

export { RectRegionModel, HtxRectangle };
