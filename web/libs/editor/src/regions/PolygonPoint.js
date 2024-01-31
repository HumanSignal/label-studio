import React, { useState } from 'react';
import { Circle, Rect } from 'react-konva';
import { observer } from 'mobx-react';
import { getParent, getRoot, hasParent, types } from 'mobx-state-tree';

import { guidGenerator } from '../core/Helpers';
import { useRegionStyles } from '../hooks/useRegionColor';
import { FF_DEV_2431, FF_DEV_3793, isFF } from '../utils/feature-flags';
import { RELATIVE_STAGE_HEIGHT, RELATIVE_STAGE_WIDTH } from '../components/ImageView/Image';

const PolygonPointAbsoluteCoordsDEV3793 = types.model()
  .volatile(() => ({
    relativeX: 0,
    relativeY: 0,
    initX: 0,
    initY: 0,
  }))
  .actions(self => ({
    afterCreate() {
      self.initX = self.x;
      self.initY = self.y;

      if (self.parent.coordstype === 'perc') {
        self.relativeX = self.x;
        self.relativeY = self.y;
      } else {
        self.relativeX = (self.x / self.stage.stageWidth) * RELATIVE_STAGE_WIDTH;
        self.relativeY = (self.y / self.stage.stageHeight) * RELATIVE_STAGE_HEIGHT;
      }
    },
    movePoint(offsetX, offsetY) {
      self.initX = self.initX + offsetX;
      self.initY = self.initY + offsetY;
      self.x = self.x + offsetX;
      self.y = self.y + offsetY;

      self.relativeX = (self.x / self.stage.stageWidth) * RELATIVE_STAGE_WIDTH;
      self.relativeY = (self.y / self.stage.stageHeight) * RELATIVE_STAGE_HEIGHT;
    },
    _setPos(x, y) {
      self.initX = x;
      self.initY = y;

      self.relativeX = (x / self.stage.stageWidth) * RELATIVE_STAGE_WIDTH;
      self.relativeY = (y / self.stage.stageHeight) * RELATIVE_STAGE_HEIGHT;

      self.x = x;
      self.y = y;
    },
    _movePoint(x, y) {
      const point = self.parent.control?.getSnappedPoint({
        x: self.stage.canvasToInternalX(x),
        y: self.stage.canvasToInternalY(y),
      });

      self._setPos(point.x, point.y);
    },
  }));

const PolygonPointRelativeCoords = types
  .model('PolygonPoint', {
    id: types.optional(types.identifier, guidGenerator),

    x: types.number,
    y: types.number,

    index: types.number,

    style: 'circle',
    size: 'small',
  })
  .volatile(() => ({
    selected: false,
  }))
  .views(self => ({
    get parent() {
      if (!hasParent(self, 2)) return null;
      return getParent(self, 2);
    },

    get stage() {
      return self.parent?.parent;
    },

    get annotation() {
      return getRoot(self).annotationStore.selected;
    },
    get canvasX() {
      return isFF(FF_DEV_3793) ? self.stage?.internalToCanvasX(self.x) : self.x;
    },
    get canvasY() {
      return isFF(FF_DEV_3793) ? self.stage?.internalToCanvasY(self.y) : self.y;
    },
  }))
  .actions(self => ({
    /**
     * External function for Polygon Parent
     * @param {number} x
     * @param {number} y
     */

    movePoint(offsetX, offsetY) {
      const dx = self.stage.canvasToInternalX(offsetX);
      const dy = self.stage.canvasToInternalY(offsetY);

      self.x = self.x + dx;
      self.y = self.y + dy;
    },

    _setPos(x, y) {
      self.x = x;
      self.y = y;
    },
    _movePoint(canvasX, canvasY) {
      const point = self.parent.control?.getSnappedPoint({
        x: self.stage.canvasToInternalX(canvasX),
        y: self.stage.canvasToInternalY(canvasY),
      });

      self._setPos(point.x, point.y);
    },

    /**
     * Close polygon
     * @param {*} ev
     */
    closeStartPoint() {
      if (self.annotation.isReadOnly()) return;
      if (self.parent.closed) return;

      if (self.parent.mouseOverStartPoint) {
        self.parent.closePoly();
      }
    },

    handleMouseOverStartPoint(ev) {
      ev.cancelBubble = true;

      const stage = self.stage?.stageRef;

      if (!stage) return;
      stage.container().style.cursor = 'crosshair';

      /**
       * Check if polygon > 2 points and closed point
       */
      if (self.parent.closed || self.parent.points.length < 3) return;

      const startPoint = ev.target;

      if (self.style === 'rectangle') {
        startPoint.setX(startPoint.x() - startPoint.width() / 2);
        startPoint.setY(startPoint.y() - startPoint.height() / 2);
      }

      const scaleMap = {
        small: 2,
        medium: 3,
        large: 4,
      };

      const scale = scaleMap[self.size];

      startPoint.scale({
        x: scale / self.stage.zoomScale,
        y: scale / self.stage.zoomScale,
      });

      self.parent.setMouseOverStartPoint(true);
    },

    handleMouseOutStartPoint(ev) {
      const t = ev.target;

      const stage = self.stage?.stageRef;

      if (!stage) return;
      stage.container().style.cursor = 'default';

      if (self.style === 'rectangle') {
        t.setX(t.x() + t.width() / 2);
        t.setY(t.y() + t.height() / 2);
      }

      t.scale({
        x: 1 / self.stage.zoomScale,
        y: 1 / self.stage.zoomScale,
      });

      self.parent.setMouseOverStartPoint(false);
    },

    getSkipInteractions() {
      return self.parent.control.obj.getSkipInteractions();
    },
  }));

const PolygonPoint = isFF(FF_DEV_3793)
  ? PolygonPointRelativeCoords
  : types.compose('PolygonPoint', PolygonPointRelativeCoords, PolygonPointAbsoluteCoordsDEV3793);

const PolygonPointView = observer(({ item, name }) => {
  if (!item.parent) return;

  const [draggable, setDraggable] = useState(true);
  const regionStyles = useRegionStyles(item.parent);
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
        fill: regionStyles.strokeColor || item.primary,
        onMouseOver: item.handleMouseOverStartPoint,
        onMouseOut: item.handleMouseOutStartPoint,
      }
      : null;

  const dragOpts = {
    onDragMove: e => {
      if (item.getSkipInteractions()) return false;
      if (e.target !== e.currentTarget) return;
      const shape = e.target;
      let { x, y } = shape.attrs;

      if (x < 0) x = 0;
      if (y < 0) y = 0;
      if (x > item.stage.stageWidth) x = item.stage.stageWidth;
      if (y > item.stage.stageHeight) y = item.stage.stageHeight;

      item._movePoint(x, y);
      shape.setAttr('x', item.canvasX);
      shape.setAttr('y', item.canvasY);
    },

    onDragStart: () => {
      if (item.getSkipInteractions()) {
        setDraggable(false);
        return false;
      }
      item.annotation.history.freeze();
    },

    onDragEnd: e => {
      setDraggable(true);
      item.annotation.history.unfreeze();
      e.cancelBubble = true;
    },

    onMouseOver: e => {
      e.cancelBubble = true;
      const stage = item.stage?.stageRef;

      if (!stage) return;
      stage.container().style.cursor = 'crosshair';
    },

    onMouseOut: () => {
      const stage = item.stage?.stageRef;

      if (!stage) return;
      stage.container().style.cursor = 'default';
    },

    onTransformEnd(e) {
      if (e.target !== e.currentTarget) return;
      const t = e.target;

      t.setAttr('x', 0);
      t.setAttr('y', 0);
      t.setAttr('scaleX', 1);
      t.setAttr('scaleY', 1);
    },
  };

  const fill = item.selected ? 'green' : 'white';

  if (item.style === 'circle') {
    return (
      <Circle
        key={name}
        name={name}
        x={item.canvasX}
        y={item.canvasY}
        radius={w}
        fill={fill}
        stroke="black"
        strokeWidth={stroke[item.size]}
        dragOnTop={false}
        strokeScaleEnabled={false}
        perfectDrawEnabled={false}
        shadowForStrokeEnabled={false}
        scaleX={1 / (item.stage.zoomScale || 1)}
        scaleY={1 / (item.stage.zoomScale || 1)}
        onDblClick={() => {
          item.parent.deletePoint(item);
        }}
        onClick={ev => {
          if (isFF(FF_DEV_2431) && ev.evt.altKey) return item.parent.deletePoint(item);
          if (item.parent.isDrawing && item.parent.points.length === 1) return;
          // don't unselect polygon on point click
          ev.evt.preventDefault();
          ev.cancelBubble = true;
          if (item.parent.mouseOverStartPoint) {
            item.closeStartPoint();
            item.parent.notifyDrawingFinished();
          } else {
            item.parent.setSelectedPoint(item);
          }
        }}
        {...dragOpts}
        {...startPointAttr}
        draggable={!item.parent.isReadOnly() && draggable}
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
        fill={fill}
        stroke="black"
        strokeWidth={stroke[item.size]}
        strokeScaleEnabled={false}
        perfectDrawEnabled={false}
        shadowForStrokeEnabled={false}
        dragOnTop={false}
        {...dragOpts}
        {...startPointAttr}
        draggable={!item.parent.isReadOnly()}
      />
    );
  }
});

export { PolygonPoint, PolygonPointView };
