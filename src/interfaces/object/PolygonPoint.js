import React, { createRef, Component, Fragment } from "react";

import { observer, inject } from "mobx-react";
import { types, getParentOfType, getRoot, getParent } from "mobx-state-tree";

import Konva from "konva";
import { Shape, Label, Stage, Layer, Rect, Text, Transformer, Line, Circle } from "react-konva";
import { blue } from "@ant-design/colors";

import { guidGenerator, restoreNewsnapshot } from "../../core/Helpers";

import { Dropdown, Input } from "semantic-ui-react";

import Registry from "../../core/Registry";

import { LabelsModel } from "../control/Labels";
import { RatingModel } from "../control/Rating";
import { ImageModel } from "../object/Image";
import RegionsMixin from "../mixins/Regions";
import NormalizationMixin from "../mixins/Normalization";

const PolygonPoint = types
  .model({
    init_x: types.optional(types.number, 0),
    init_y: types.optional(types.number, 0),

    x: types.number,
    y: types.number,

    index: types.number,

    style: types.string,
    size: types.string,
    // isMouseOverStartPoint: types.optional(types.boolean, false),
  })
  .views(self => ({
    get parent() {
      return getParent(self, 2);
    },
  }))
  .actions(self => ({
    afterCreate() {
      self.init_x = self.x;
      self.init_y = self.y;
    },

    movePoint(x, y) {
      self.x = self.init_x + x;
      self.y = self.init_y + y;
    },

    _movePoint(x, y) {
      self.init_x = x;
      self.init_y = y;

      self.x = x;
      self.y = y;
    },

    /**
     * Close polygon
     * @param {*} ev
     */
    closeStartPoint(ev) {
      if (self.parent.mouseOverStartPoint) self.parent.closePoly();
    },

    handleMouseOverStartPoint(ev) {
      const stage = self.parent.parent._stageRef;
      stage.container().style.cursor = "crosshair";

      if (self.parent.closed || self.parent.points.length < 3) return;

      const startPoint = ev.target;

      if (self.style === "rectangle") {
        startPoint.setX(startPoint.x() - startPoint.width() / 2);
        startPoint.setY(startPoint.y() - startPoint.height() / 2);
      }

      const scaleMap = {
        small: 3,
        medium: 2,
        large: 2,
      };

      const scale = scaleMap[self.size];

      startPoint.scale({ x: scale, y: scale });

      self.parent.setMouseOverStartPoint(true);
    },

    handleMouseOutStartPoint(ev) {
      const t = ev.target;

      const stage = self.parent.parent._stageRef;
      stage.container().style.cursor = "default";

      if (self.style === "rectangle") {
        t.setX(t.x() + t.width() / 2);
        t.setY(t.y() + t.height() / 2);
      }

      t.scale({ x: 1, y: 1 });

      self.parent.setMouseOverStartPoint(false);
    },
  }));

const PolygonPointView = observer(({ item, name }) => {
  const sizes = {
    small: 4,
    medium: 8,
    large: 12,
  };

  const stroke = {
    small: 1,
    medium: 2,
    large: 3,
  };

  const w = sizes[item.size];

  const startPointAttr =
    item.index === 0
      ? {
          hitStrokeWidth: 12,
          fill: blue.primary,
          onMouseOver: item.handleMouseOverStartPoint,
          onMouseOut: item.handleMouseOutStartPoint,
          onClick: item.closeStartPoint,
        }
      : null;

  const dragOpts = {
    onDragMove: e => {
      item._movePoint(e.target.attrs.x, e.target.attrs.y);
    },

    onMouseOver: e => {
      const stage = item.parent.parent._stageRef;
      stage.container().style.cursor = "crosshair";
    },

    onMouseOut: e => {
      const stage = item.parent.parent._stageRef;
      stage.container().style.cursor = "default";
    },
  };

  if (item.style === "circle") {
    return (
      <Circle
        key={name}
        name={name}
        x={item.x}
        y={item.y}
        radius={w}
        fill="white"
        stroke="black"
        strokeWidth={stroke[item.size]}
        dragOnTop={false}
        onClick={ev => {
          if (item.parent.mouseOverStartPoint) {
            item.parent.closePoly();
          }
        }}
        {...dragOpts}
        {...startPointAttr}
        draggable
      />
    );
  } else {
    return (
      <Rect
        name={name}
        key={name}
        x={item.x - w / 2}
        y={item.y - w / 2}
        width={w}
        height={w}
        fill="white"
        stroke="black"
        strokeWidth={stroke[item.size]}
        dragOnTop={false}
        {...dragOpts}
        {...startPointAttr}
        draggable
      />
    );
  }
});

export { PolygonPoint, PolygonPointView };
