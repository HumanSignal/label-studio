import React, { createRef, Component, Fragment } from "react";

import { observer, inject } from "mobx-react";
import { types, getParentOfType, getRoot } from "mobx-state-tree";

import Konva from "konva";
import { Shape, Label, Stage, Layer, Circle, Text } from "react-konva";

import { guidGenerator, restoreNewsnapshot } from "../../core/Helpers";

import Registry from "../../core/Registry";

import { LabelsModel } from "../control/Labels";
import { KeyPointLabelsModel } from "../control/KeyPointLabels";

import { RatingModel } from "../control/Rating";
import { ImageModel } from "../object/Image";
import RegionsMixin from "../mixins/Regions";
import NormalizationMixin from "../mixins/Normalization";

const Model = types
  .model({
    id: types.identifier,
    pid: types.optional(types.string, guidGenerator),

    type: "keypointregion",

    x: types.number,
    y: types.number,
    width: types.number,

    opacity: types.number,
    fillcolor: types.maybeNull(types.string),

    states: types.maybeNull(types.array(types.union(LabelsModel, RatingModel, KeyPointLabelsModel))),

    sw: types.maybeNull(types.number),
    sh: types.maybeNull(types.number),

    coordstype: types.optional(types.enumeration(["px", "perc"]), "px"),
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

    setPosition(x, y) {
      self.x = x;
      self.y = y;
    },

    addState(state) {
      self.states.push(state);
    },

    setFill(color) {
      self.fill = color;
    },

    updateImageSize(wp, hp, sw, sh) {
      // self.wp = wp;
      // self.hp = hp;

      self.sw = sw;
      self.sh = sh;

      if (self.coordstype == "perc") {
        self.x = (sw * self.x) / 100;
        self.y = (sh * self.y) / 100;
        self.width = (sw * self.width) / 100;
        self.coordstype = "px";
      }
    },

    toStateJSON() {
      const parent = self.parent;
      const from = parent.states()[0];

      const buildTree = obj => {
        const tree = {
          id: self.id,
          from_name: from.name,
          to_name: parent.name,
          source: parent.value,
          type: "keypoint",
          value: {
            x: (self.x * 100) / self.parent.stageWidth,
            y: (self.y * 100) / self.parent.stageHeight,
            width: (self.width * 100) / self.parent.stageWidth, //  * (self.scaleX || 1)
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

const KeyPointRegionModel = types.compose("KeyPointRegionModel", RegionsMixin, NormalizationMixin, Model);

const HtxKeyPointView = ({ store, item }) => {
  const self = this;
  const { name, wwidth, wheight, onChangedPosition } = item;

  const wp = item.wp || item.parent.stageWidth / item.parent.naturalWidth;
  const hp = item.hp || item.parent.stageHeight / item.parent.naturalHeight;

  const x = item.x;
  const y = item.y;
  const w = item.width;

  const props = {};

  props["opacity"] = item.opacity;

  if (item.fillcolor) {
    props["fill"] = item.fillcolor;
  }

  props["stroke"] = item.strokecolor;
  props["strokeWidth"] = item.strokewidth;
  props["strokeScaleEnabled"] = false;
  props["shadowBlur"] = 0;

  if (item.highlighted) {
    props["stroke"] = "#ff0000";
  }

  return (
    <Fragment>
      <Circle
        x={x}
        y={y}
        radius={item.width}
        name={item.id}
        onDragEnd={e => {
          const t = e.target;
          item.setPosition(t.getAttr("x"), t.getAttr("y"));
        }}
        dragBoundFunc={function(pos) {
          const r = item.parent.stageWidth;
          const b = item.parent.stageHeight;

          let { x, y } = pos;

          if (x < 0) x = 0;
          if (y < 0) y = 0;

          if (x > r) x = r;
          if (y > b) y = b;

          return {
            x: x,
            y: y,
          };
        }}
        onMouseOver={e => {
          const stage = item.parent.stageRef;

          if (store.completionStore.selected.relationMode) {
            item.setHighlight(true);
            stage.container().style.cursor = "crosshair";
          } else {
            stage.container().style.cursor = "pointer";
          }
        }}
        onMouseOut={e => {
          const stage = item.parent.stageRef;
          stage.container().style.cursor = "default";

          if (store.completionStore.selected.relationMode) {
            item.setHighlight(false);
          }
        }}
        onClick={e => {
          const stage = item.parent.stageRef;

          if (!item.completion.edittable) return;

          if (store.completionStore.selected.relationMode) {
            stage.container().style.cursor = "default";
          }

          item.setHighlight(false);
          item.onClickRegion();
        }}
        {...props}
        draggable={item.completion.edittable}
      />
    </Fragment>
  );
};

const HtxKeyPoint = inject("store")(observer(HtxKeyPointView));

Registry.addTag("keypointregion", KeyPointRegionModel, HtxKeyPoint);

export { KeyPointRegionModel, HtxKeyPoint };
