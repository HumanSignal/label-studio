import React, { createRef, Component, Fragment } from "react";

import { observer, inject } from "mobx-react";
import { types, getParentOfType, getRoot, destroy, detach, getParent } from "mobx-state-tree";

import Konva from "konva";
import { Group, Line } from "react-konva";

import { guidGenerator, restoreNewsnapshot } from "../../core/Helpers";

import Registry from "../../core/Registry";

import { LabelsModel } from "../control/Labels";
import { RatingModel } from "../control/Rating";
import { ImageModel } from "../object/Image";
import { PolygonPoint, PolygonPointView } from "./PolygonPoint";

import { PolygonLabelsModel } from "../control/PolygonLabels";

import RegionsMixin from "../mixins/Regions";
import NormalizationMixin from "../mixins/Normalization";

import { green } from "@ant-design/colors";

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
    setMouseOverStartPoint(val) {
      self.mouseOverStartPoint = val;
    },

    handleMouseMove({ e, flattenedPoints }) {
      const { offsetX: cursorX, offsetY: cursorY } = e.evt;
      const point = getAnchorPoint({ flattenedPoints, cursorX, cursorY });

      let x = point[0];
      let y = point[1];

      if (self.parent.zoomScale != 1) {
        x = x * self.parent.zoomScale;
        y = y * self.parent.zoomScale;
      }

      const group = e.currentTarget;
      const layer = e.currentTarget.getLayer();

      moveHoverAnchor({ point: [x, y], group, layer });
    },

    handleMouseLeave({ e }) {
      removeHoverAnchor({ layer: e.currentTarget.getLayer() });
    },

    handleLineClick({ e, flattenedPoints, insertIdx }) {
      e.cancelBubble = true;

      if (!self.closed) return;

      removeHoverAnchor({ layer: e.currentTarget.getLayer() });

      const { offsetX: cursorX, offsetY: cursorY } = e.evt;
      const point = getAnchorPoint({ flattenedPoints, cursorX, cursorY });

      self.insertPoint(insertIdx, point[0], point[1]);
    },

    addPoint(x, y) {
      if (self.closed) return;
      self._addPoint(x, y);
    },

    insertPoint(insertIdx, x, y) {
      const p = { x: x, y: y, size: self.pointsize, style: self.pointstyle, index: self.points.length };
      self.points.splice(insertIdx, 0, p);
    },

    _addPoint(x, y) {
      const index = self.points.length;
      self.points.push({ x: x, y: y, size: self.pointsize, style: self.pointstyle, index: index });
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

    destroyRegion() {
      self.parent.setActivePolygon(null);
      self.parent.deleteSelectedShape();
      detach(self.points);
      destroy(self.points);
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

function getFlattenedPoints(points) {
  const p = points.map(p => [p["x"], p["y"]]);
  return p.reduce(function(flattenedPoints, point) {
    return flattenedPoints.concat(point);
  }, []);
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
    stroke: green.primary,
    fill: green[0],
    strokeWidth: 2,
    radius: 5,
  });

  group.add(hoverAnchor);
  layer.draw();
  return hoverAnchor;
}

function moveHoverAnchor({ point, group, layer }) {
  const hoverAnchor = getHoverAnchor({ layer }) || createHoverAnchor({ point, group, layer });
  hoverAnchor.to({ x: point[0], y: point[1], duration: 0 });
}

function removeHoverAnchor({ layer }) {
  const hoverAnchor = getHoverAnchor({ layer });
  if (!hoverAnchor) return;
  hoverAnchor.destroy();
  layer.draw();
}

const HtxPolygonView = ({ store, item }) => {
  /**
   * Render line between 2 points
   */
  function renderLine({ points, idx1, idx2 }) {
    const name = `border_${idx1}_${idx2}`;
    const insertIdx = idx1 + 1; // idx1 + 1 or idx2
    const flattenedPoints = getFlattenedPoints([points[idx1], points[idx2]]);
    return (
      <Group
        key={name}
        name={name}
        onClick={e => item.handleLineClick({ e, flattenedPoints, insertIdx })}
        onMouseMove={e => {
          if (!item.closed) return;

          item.handleMouseMove({ e, flattenedPoints });
        }}
        onMouseLeave={e => item.handleMouseLeave({ e })}
      >
        <Line
          points={flattenedPoints}
          stroke={item.strokecolor}
          opacity={item.opacity}
          lineJoin="bevel"
          strokeWidth={item.strokewidth}
        />
      </Group>
    );
  }

  function renderLines(points) {
    const name = "borders";
    return (
      <Group key={name} name={name}>
        {points.map((p, idx) => {
          const idx1 = idx;
          const idx2 = idx === points.length - 1 ? 0 : idx + 1;
          return renderLine({ points, idx1, idx2 });
        })}
      </Group>
    );
  }

  function renderPoly(points) {
    const name = "poly";
    return (
      <Group key={name} name={name}>
        <Line
          lineJoin="bevel"
          points={getFlattenedPoints(points)}
          fill={item.strokecolor}
          closed={true}
          opacity={0.2}
        />
      </Group>
    );
  }

  function renderCircle({ points, idx }) {
    const name = `anchor_${points.length}_${idx}`;
    const point = points[idx];

    if (!item.closed || (item.closed && item.selected)) {
      return <PolygonPointView item={point} name={name} key={name} />;
    }
  }

  function renderCircles(points) {
    const name = "anchors";
    return (
      <Group key={name} name={name}>
        {points.map((p, idx) => renderCircle({ points, idx }))}
      </Group>
    );
  }

  return (
    <Group
      key={item.id ? item.id : guidGenerator(5)}
      onDragStart={e => {
        item.completion.setDragMode(true);
      }}
      dragBoundFunc={function(pos) {
        let { x, y } = pos;
        /* if (x < 0) x = 0; */
        /* if (y < 0) y = 0; */
        const r = item.parent.stageWidth - this.getAttr("width");
        const b = item.parent.stageHeight - this.getAttr("height");

        if (x > r) x = r;
        if (y > b) y = b;

        item.points.forEach(p => {
          p.movePoint(x, y);
        });

        return { x: 0, y: 0 };
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
        e.cancelBubble = true;

        if (!item.closed) return;

        const stage = item.parent.stageRef;

        if (store.completionStore.selected.relationMode) {
          stage.container().style.cursor = "default";
        }

        item.setHighlight(false);
        item.onClickRegion();
      }}
      draggable
    >
      {item.mouseOverStartPoint}

      {item.points ? renderPoly(item.points) : null}
      {item.points ? renderLines(item.points) : null}
      {item.points ? renderCircles(item.points) : null}
    </Group>
  );
};

const HtxPolygon = inject("store")(observer(HtxPolygonView));

Registry.addTag("polygonregion", PolygonRegionModel, HtxPolygon);

export { PolygonRegionModel, HtxPolygon };
