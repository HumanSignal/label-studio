import React, { createRef, Component, Fragment } from "react";

import { observer, inject } from "mobx-react";
import { types, getParentOfType, getRoot, destroy, detach, getParent } from "mobx-state-tree";

import Konva from "konva";
import { Group, Line } from "react-konva";

import { guidGenerator, restoreNewsnapshot } from "../../../core/Helpers";

import Registry from "../../../core/Registry";

import { LabelsModel } from "../../control/Labels";
import { RatingModel } from "../../control/Rating";
import { ImageModel } from "../Image";
import { PolygonPoint, PolygonPointView } from "../PolygonPoint";

import { PolygonLabelsModel } from "../../control/PolygonLabels";

import RegionsMixin from "../../mixins/Regions";
import NormalizationMixin from "../../mixins/Normalization";

import HtxPolygonView from "./PolygonView";

const Model = types
  .model({
    id: types.identifier,
    pid: types.optional(types.string, guidGenerator),

    type: "polygonregion",

    opacity: types.number,
    fillcolor: types.maybeNull(types.string),

    strokewidth: types.number,
    strokecolor: types.string,

    pointsize: types.optional(types.string, "medium"),
    pointstyle: types.string,

    closed: types.optional(types.boolean, false),

    points: types.array(PolygonPoint, []),

    states: types.maybeNull(types.array(types.union(LabelsModel, RatingModel, PolygonLabelsModel))),

    mouseOverStartPoint: types.optional(types.boolean, false),

    coordstype: types.optional(types.enumeration(["px", "perc"]), "px"),

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
  }))
  .actions(self => ({
    /**
     * Handler for mouse on start point of Polygon
     * @param {boolean} value
     */
    setMouseOverStartPoint(value) {
      self.mouseOverStartPoint = value;
    },

    handleMouseMove({ e, flattenedPoints }) {
      /**
       * Don't display if polygon disable
       */
      if (!self.selected) return;

      const { offsetX: cursorX, offsetY: cursorY } = e.evt;
      const point = getAnchorPoint({ flattenedPoints, cursorX, cursorY });

      let x = point[0];
      let y = point[1];

      if (self.parent.zoomScale !== 1) {
        x = x * self.parent.zoomScale;
        y = y * self.parent.zoomScale;
      }

      const group = e.currentTarget;
      const layer = e.currentTarget.getLayer();

      moveHoverAnchor({ point: [x, y], group, layer, size: self.pointsize });
    },

    handleMouseLeave({ e }) {
      removeHoverAnchor({ layer: e.currentTarget.getLayer() });
    },

    handleLineClick({ e, flattenedPoints, insertIdx }) {
      /**
       * HTML5 Canvas Cancel Event Bubble Propagation
       * https://konvajs.org/docs/events/Cancel_Propagation.html
       */
      e.cancelBubble = true;

      /**
       * If selected polygon isn't close, then not allow
       */
      if (!self.closed) return;

      /**
       * If selected polygon isn't active, then select it
       */
      if (!self.selected) {
        self.onClickRegion();
        return;
      }

      removeHoverAnchor({ layer: e.currentTarget.getLayer() });

      const { offsetX: cursorX, offsetY: cursorY } = e.evt;
      const point = getAnchorPoint({ flattenedPoints, cursorX, cursorY });

      self.insertPoint(insertIdx, point[0], point[1]);
    },

    /**
     * Add a new point
     * @param {number} x coordinate of absciss
     * @param {number} y coordinate of ordinate
     */
    addPoint(x, y) {
      if (self.closed) return;

      self.points.push({
        x: x,
        y: y,
        size: self.pointsize,
        style: self.pointstyle,
        index: self.points.length,
      });
    },

    /**
     * Add a new point on existing line
     * @param {number} insertIdx
     * @param {number} x coordinate of absciss
     * @param {number} y coordinate of ordinate
     */
    insertPoint(insertIdx, x, y) {
      self.points.splice(insertIdx, 0, {
        x: x,
        y: y,
        size: self.pointsize,
        style: self.pointstyle,
        index: self.points.length,
      });
    },

    /**
     * Close current polygon if number of ponts more than 2
     */
    closePoly() {
      if (self.points.length <= 2) {
        self.deleteRegion();
        return;
      }

      self.closed = true;
    },

    /**
     * Destroy current polygon
     */
    destroyRegion() {
      self.parent.setActivePolygon(null);
      self.parent.deleteSelectedShape();
      detach(self.points);
      destroy(self.points);
    },

    updateImageSize(wp, hp, sw, sh) {
      self.wp = wp;
      self.hp = hp;

      if (!self.completion.sentUserGenerate && self.coordstype === "perc") {
        self.points.map(p => {
          const x = (sw * p.x) / 100;
          const y = (sh * p.y) / 100;
          self.coordstype = "px";
          p._movePoint(x, y);
        });
      }
    },

    /**
     * Serialize data
     */
    toStateJSON() {
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

/**
 * Get coordinates of anchor point
 * @param {array} flattenedPoints
 * @param {number} cursorX coordinates of cursor X
 * @param {number} cursorY coordinates of cursor Y
 */
function getAnchorPoint({ flattenedPoints, cursorX, cursorY }) {
  const [point1X, point1Y, point2X, point2Y] = flattenedPoints;
  const y =
    ((point2X - point1X) * (point2X * point1Y - point1X * point2Y) +
      (point2X - point1X) * (point2Y - point1Y) * cursorX +
      (point2Y - point1Y) * (point2Y - point1Y) * cursorY) /
    ((point2Y - point1Y) * (point2Y - point1Y) + (point2X - point1X) * (point2X - point1X));
  const x =
    cursorX -
    ((point2Y - point1Y) *
      (point2X * point1Y - point1X * point2Y + cursorX * (point2Y - point1Y) - cursorY * (point2X - point1X))) /
      ((point2Y - point1Y) * (point2Y - point1Y) + (point2X - point1X) * (point2X - point1X));

  return [x, y];
}

function getHoverAnchor({ layer }) {
  return layer.findOne(".hoverAnchor");
}

/**
 * Create new anchor for current polygon
 */
function createHoverAnchor({ point, group, layer }) {
  const hoverAnchor = new Konva.Circle({
    name: "hoverAnchor",
    x: point[0],
    y: point[1],
    stroke: group.children[0].attrs.stroke,
    fill: "white",
    strokeWidth: 2,
    radius: 5,
  });

  group.add(hoverAnchor);
  // layer.draw();
  return hoverAnchor;
}

/**
 * Move hover anchor on the line
 */
function moveHoverAnchor({ point, group, layer, size }) {
  /**
   * If Hover Anchor exists, then use it
   */
  let hoverAnchor = getHoverAnchor({ layer }) || createHoverAnchor({ point, group, layer, size });

  /**
   * https://konvajs.org/api/Konva.Circle.html#to
   */
  hoverAnchor.to({
    x: point[0],
    y: point[1],
    duration: 0,
  });
}

function removeHoverAnchor({ layer }) {
  let hoverAnchor = getHoverAnchor({ layer });

  if (!hoverAnchor) return;

  hoverAnchor.destroy();
  // layer.draw();
}

const HtxPolygon = inject("store")(observer(HtxPolygonView));

Registry.addTag("polygonregion", PolygonRegionModel, HtxPolygon);

export { PolygonRegionModel, HtxPolygon };
