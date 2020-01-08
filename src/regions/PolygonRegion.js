import Konva from "konva";
import React from "react";
import { Group, Line } from "react-konva";
import { observer, inject } from "mobx-react";
import { types, getParentOfType, getRoot, destroy, detach } from "mobx-state-tree";

import Constants from "../core/Constants";
import Hotkey from "../core/Hotkey";
import NormalizationMixin from "../mixins/Normalization";
import RegionsMixin from "../mixins/Regions";
import Registry from "../core/Registry";
import { ImageModel } from "../tags/object/Image";
import { LabelsModel } from "../tags/control/Labels";
import { PolygonLabelsModel } from "../tags/control/PolygonLabels";
import { PolygonPoint, PolygonPointView } from "./PolygonPoint";
import { RatingModel } from "../tags/control/Rating";
import { green } from "@ant-design/colors";
import { guidGenerator } from "../core/Helpers";

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

    selectedPoint: types.maybeNull(types.safeReference(PolygonPoint)),

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
     * @param {boolean} val
     */
    setMouseOverStartPoint(value) {
      self.mouseOverStartPoint = value;
    },

    setSelectedPoint(point) {
      if (self.selectedPoint) {
        self.selectedPoint.selected = false;
      }

      point.selected = true;
      self.selectedPoint = point;
    },

    handleMouseMove({ e, flattenedPoints }) {
      let { offsetX: cursorX, offsetY: cursorY } = e.evt;

      const [x, y] = getAnchorPoint({ flattenedPoints, cursorX, cursorY });

      const group = e.currentTarget;
      const layer = e.currentTarget.getLayer();

      moveHoverAnchor({ point: [x, y], group, layer });
    },

    handleMouseLeave({ e }) {
      removeHoverAnchor({ layer: e.currentTarget.getLayer() });
    },

    handleLineClick({ e, flattenedPoints, insertIdx }) {
      e.cancelBubble = true;

      if (!self.closed || !self.selected) return;

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
      const p = {
        id: guidGenerator(),
        x: x,
        y: y,
        size: self.pointsize,
        style: self.pointstyle,
        index: self.points.length,
      };
      self.points.splice(insertIdx, 0, p);
    },

    _addPoint(x, y) {
      const index = self.points.length;
      self.points.push({
        id: guidGenerator(),
        x: x,
        y: y,
        size: self.pointsize,
        style: self.pointstyle,
        index: index,
      });
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
      detach(self.points);
      destroy(self.points);
    },

    unselectRegion() {
      if (self.selectedPoint) {
        self.selectedPoint.selected = false;
      }

      // self.points.forEach(p => p.computeOffset());

      self.selected = false;
      self.parent.setSelected(undefined);
      self.completion.setHighlightedNode(null);
    },

    selectRegion() {
      // self.points.forEach(p => p.computeOffset());

      self.selected = true;
      self.completion.setHighlightedNode(self);
      self.parent.setSelected(self.id);
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

    updateOffset() {
      self.points.map(p => p.computeOffset());
    },

    updateImageSize(wp, hp, sw, sh) {
      self.wp = wp;
      self.hp = hp;

      if (self.coordstype === "px") {
        self.points.forEach(p => {
          const x = (sw * p.relativeX) / 100;
          const y = (sh * p.relativeY) / 100;

          p._movePoint(x, y);
        });
      }

      if (!self.completion.sentUserGenerate && self.coordstype === "perc") {
        self.points.forEach(p => {
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

const PolygonRegionModel = types.compose("PolygonRegionModel", RegionsMixin, NormalizationMixin, Model);

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
  const p = points.map(p => [p.x, p.y]);
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
    let { strokecolor, strokewidth } = item;

    if (item.highlighted) {
      strokecolor = Constants.HIGHLIGHTED_STROKE_COLOR;
      strokewidth = Constants.HIGHLIGHTED_STROKE_WIDTH;
    }

    const insertIdx = idx1 + 1; // idx1 + 1 or idx2
    const flattenedPoints = getFlattenedPoints([points[idx1], points[idx2]]);
    return (
      <Group
        key={name}
        name={name}
        onClick={e => item.handleLineClick({ e, flattenedPoints, insertIdx })}
        onMouseMove={e => {
          if (!item.closed || !item.selected) return;

          item.handleMouseMove({ e, flattenedPoints });
        }}
        onMouseLeave={e => item.handleMouseLeave({ e })}
      >
        <Line
          points={flattenedPoints}
          stroke={strokecolor}
          opacity={item.opacity}
          lineJoin="bevel"
          strokeWidth={strokewidth}
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

  function minMax(items) {
    return items.reduce((acc, val) => {
      acc[0] = acc[0] === undefined || val < acc[0] ? val : acc[0];
      acc[1] = acc[1] === undefined || val > acc[1] ? val : acc[1];
      return acc;
    }, []);
  }

  let minX = 0,
    maxX = 0,
    minY = 0,
    maxY = 0;

  return (
    <Group
      key={item.id ? item.id : guidGenerator(5)}
      onDragStart={e => {
        item.completion.setDragMode(true);

        var arrX = item.points.map(p => p.x);
        var arrY = item.points.map(p => p.y);

        [minX, maxX] = minMax(arrX);
        [minY, maxY] = minMax(arrY);
      }}
      dragBoundFunc={function(pos) {
        let { x, y } = pos;

        const sw = item.parent.stageWidth;
        const sh = item.parent.stageHeight;

        if (minY + y < 0) y = -1 * minY;
        if (minX + x < 0) x = -1 * minX;
        if (maxY + y > sh) y = sh - maxY;
        if (maxX + x > sw) x = sw - maxX;

        return { x: x, y: y };
      }}
      onDragEnd={e => {
        const t = e.target;

        item.completion.setDragMode(false);
        if (!item.closed) item.closePoly();

        item.points.forEach(p => p.movePoint(t.getAttr("x"), t.getAttr("y")));

        t.setAttr("x", 0);
        t.setAttr("y", 0);
      }}
      onMouseOver={e => {
        const stage = item.parent.stageRef;

        if (store.completionStore.selected.relationMode) {
          item.setHighlight(true);
          stage.container().style.cursor = Constants.RELATION_MODE_CURSOR;
        } else {
          stage.container().style.cursor = Constants.POINTER_CURSOR;
        }
      }}
      onMouseOut={e => {
        const stage = item.parent.stageRef;
        stage.container().style.cursor = Constants.DEFAULT_CURSOR;

        if (store.completionStore.selected.relationMode) {
          item.setHighlight(false);
        }
      }}
      onClick={e => {
        e.cancelBubble = true;

        if (!item.completion.edittable) return;

        if (!item.closed) return;

        const stage = item.parent.stageRef;

        if (store.completionStore.selected.relationMode) {
          stage.container().style.cursor = Constants.DEFAULT_CURSOR;
        }

        item.setHighlight(false);
        item.onClickRegion();
      }}
      draggable={item.completion.edittable && item.parent.zoomScale === 1}
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
