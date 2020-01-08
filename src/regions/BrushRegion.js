import React, { Fragment } from "react";
import { Line, Group } from "react-konva";
import { observer, inject } from "mobx-react";
import { types, getParentOfType, getRoot } from "mobx-state-tree";

import NormalizationMixin from "../mixins/Normalization";
import RegionsMixin from "../mixins/Regions";
import Registry from "../core/Registry";
import { BrushLabelsModel } from "../tags/control/BrushLabels";
import { ImageModel } from "../tags/object/Image";
import { LabelsModel } from "../tags/control/Labels";
import { RatingModel } from "../tags/control/Rating";
import { guidGenerator } from "../core/Helpers";

const Points = types
  .model("Points", {
    id: types.identifier,
    type: types.optional(types.enumeration(["add", "eraser"]), "add"),
    points: types.array(types.number),
  })
  .actions(self => ({
    setType(type) {
      self.type = type;
    },

    addPoints(points) {
      self.points = [...self.points, ...points];
    },
  }));

/**
 * Rectangle object for Bounding Box
 *
 */
const Model = types
  .model({
    id: types.identifier,
    pid: types.optional(types.string, guidGenerator),

    type: "brushregion",

    states: types.maybeNull(types.array(types.union(LabelsModel, RatingModel, BrushLabelsModel))),

    coordstype: types.optional(types.enumeration(["px", "perc"]), "px"),
    /**
     * Higher values will result in a more curvy line. A value of 0 will result in no interpolation.
     */
    tension: types.optional(types.number, 1.0),
    /**
     * Stroke color
     */
    strokeColor: types.optional(types.string, "red"),
    /**
     * Stroke width
     */
    strokeWidth: types.optional(types.number, 25),
    /**
     * Determines node opacity. Can be any number between 0 and 1
     */
    opacity: types.optional(types.number, 0.5),
    /**
     * Set scale x
     */
    scaleX: types.optional(types.number, 1),
    /**
     * Set scale y
     */
    scaleY: types.optional(types.number, 1),
    /**
     * Points array of brush
     */

    points: types.array(Points),
    current: types.maybeNull(types.reference(Points)),

    // points: types.array(types.array(types.number)),
    // eraserpoints: types.array(types.array(types.number)),

    mode: types.optional(types.string, "brush"),
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
    addPoints({ type }) {
      const p = Points.create({ id: guidGenerator(), type: type });
      self.points.push(p);
      self.current = p;

      // console.log("addPoints");

      return p;
    },

    addPointsCurrent(x, y) {
      // console.log("addPointsCurrent");
      self.current.addPoints([x, y]);
    },

    afterAttach() {},

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

    // addPoints(x, y, mode) {
    //   if (mode) self.mode = "eraser";
    //   self.points.push(x);
    //   self.points.push(y);
    // },

    // addEraserPoints(x, y) {
    //   self.eraserpoints = [...self.eraserpoints, x, y];
    // },

    setScale(x, y) {
      self.scaleX = x;
      self.scaleY = y;
    },

    updateImageSize(wp, hp, sw, sh) {
      if (self.parent.initialWidth > 1 && self.parent.initialHeight > 1) {
        let ratioX = self.parent.stageWidth / self.parent.initialWidth;
        let ratioY = self.parent.stageHeight / self.parent.initialHeight;

        self.setScale(ratioX, ratioY);
      }
    },

    addState(state) {
      self.states.push(state);
    },

    toStateJSON() {
      const parent = self.parent;
      let fromElement = parent.states()[0];

      if (parent.states().length > 1) {
        parent.states().forEach(state => {
          if (state.type === "brushlabels") {
            fromElement = state;
          }
        });
      }

      const buildTree = obj => {
        const tree = {
          id: self.id,
          from_name: fromElement.name,
          to_name: parent.name,
          source: parent.value,
          type: "brush",
          value: {
            points: self.points,
            eraserpoints: self.eraserpoints,
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

const BrushRegionModel = types.compose("BrushRegionModel", RegionsMixin, NormalizationMixin, Model);

const HtxBrushLayer = observer(({ store, item, points }) => {
  let currentPoints = [];
  points.points.forEach(point => {
    currentPoints.push(point);
  });

  return points.type === "add" ? (
    <HtxBrushAddLine item={item} points={currentPoints} />
  ) : (
    <HtxBrushEraserLine item={item} points={currentPoints} />
  );
});

const HtxBrushAddLine = observer(({ store, item, points }) => {
  let highlightOptions = {
    shadowColor: "red",
    shadowBlur: 5,
    shadowOffsetY: 5,
    shadowOpacity: 1,
  };

  let highlight = item.selected ? highlightOptions : null;
  //        {...highlight}

  return (
    <Line
      strokeWidth={item.strokeWidth}
      points={points}
      stroke={item.strokeColor}
      opacity={item.mode === "brush" ? item.opacity : 1}
      globalCompositeOperation={"source-over"}
      tension={item.tension}
      lineJoin={"round"}
      lineCap="round"
    />
  );
});

const HtxBrushEraserLine = ({ store, item, points }) => {
  return (
    <Line
      strokeWidth={item.strokeWidth}
      points={points}
      tension={item.tension}
      lineJoin={"round"}
      lineCap="round"
      stroke={item.strokeColor}
      opacity={1}
      globalCompositeOperation={"destination-out"}
    />
  );
};

const HtxBrushView = ({ store, item }) => {
  return (
    <Fragment>
      <Group
        scaleX={item.scaleX}
        scaleY={item.scaleY}
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

          if (store.completionStore.selected.relationMode) {
            stage.container().style.cursor = "default";
          }

          item.setHighlight(false);
          item.onClickRegion();
        }}
      >
        {item.points.map(p => (
          <HtxBrushLayer store={store} item={item} points={p} />
        ))}
      </Group>
    </Fragment>
  );
};

const HtxBrush = inject("store")(observer(HtxBrushView));

Registry.addTag("brushregion", BrushRegionModel, HtxBrush);

export { BrushRegionModel, HtxBrush };
