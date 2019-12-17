import React from "react";

import { observer } from "mobx-react";
import { types, getParent } from "mobx-state-tree";

// eslint-disable-next-line
import Konva from "konva";
import { Circle } from "react-konva";

const PolygonPoint = types
  .model({
    /**
     * Initial coordinates of Point
     */
    initialX: types.optional(types.number, 0),
    initialY: types.optional(types.number, 0),

    x: types.number,
    y: types.number,

    /**
     * Index of point
     * First point is 0 `zero` index
     */
    index: types.number,

    /**
     *
     */
    style: types.string,
    size: types.string,
    isMouseOverStartPoint: types.optional(types.boolean, false),
  })
  .views(self => ({
    get parent() {
      return getParent(self, 2);
    },
  }))
  .actions(self => ({
    /**
     * Triggered after create model
     */
    afterCreate() {
      self.initialX = self.x;
      self.initialY = self.y;
    },

    dragEnd() {
      self.initialX = self.x;
      self.initialY = self.y;
    },

    /**
     * External function for Polygon Parent
     * @param {number} x
     * @param {number} y
     */
    movePoint(x, y) {
      self.x = self.initialX + x;
      self.y = self.initialY + y;
    },

    _movePoint(x, y) {
      self.initialX = x;
      self.initialY = y;

      self.x = x;
      self.y = y;
    },

    /**
     * Close polygon
     * @param {*} ev
     */
    closeStartPoint(ev) {
      if (self.parent.mouseOverStartPoint) {
        self.parent.closePoly();
      }
    },

    handleMouseOverStartPoint(ev) {
      const stage = self.parent.parent.stageRef;

      stage.container().style.cursor = "crosshair";

      /**
       * Check if polygon > 2 points and closed point
       */
      if (self.parent.closed || self.parent.points.length < 3) return;

      const startPoint = ev.target;

      if (self.style === "rectangle") {
        startPoint.setX(startPoint.x() - startPoint.width() / 2);
        startPoint.setY(startPoint.y() - startPoint.height() / 2);
      }

      const scaleMap = {
        small: 2,
        medium: 3,
        large: 4,
      };

      const scale = scaleMap[self.size];

      startPoint.scale({ x: scale, y: scale });

      self.parent.setMouseOverStartPoint(true);
    },

    handleMouseOutStartPoint(ev) {
      const t = ev.target;

      const stage = self.parent.parent.stageRef;
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
          fill: item.parent.strokecolor ? item.parent.strokecolor : item.primary,
          onMouseOver: item.handleMouseOverStartPoint,
          onMouseOut: item.handleMouseOutStartPoint,
          onClick: item.closeStartPoint,
        }
      : null;

  const dragOpts = {
    onDragMove: e => {
      let { x, y } = e.target.attrs;

      if (x < 0) x = 0;
      if (y < 0) y = 0;
      if (x > item.parent.parent.stageWidth) x = item.parent.parent.stageWidth;
      if (y > item.parent.parent.stageHeight) y = item.parent.parent.stageHeight;

      item._movePoint(x, y);
    },

    onMouseOver: e => {
      const stage = item.parent.parent.stageRef;
      stage.container().style.cursor = "crosshair";
    },

    onMouseOut: e => {
      const stage = item.parent.parent.stageRef;
      stage.container().style.cursor = "default";
    },
  };

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
});

export { PolygonPoint, PolygonPointView };
