import { types } from "mobx-state-tree";

import BaseTool, { DEFAULT_DIMENSIONS } from "./Base";
import ToolMixin from "../mixins/Tool";
import { ThreePointsDrawingTool, TwoPointsDrawingTool } from "../mixins/DrawingTool";
import { AnnotationMixin } from "../mixins/AnnotationMixin";
import { NodeViews } from "../components/Node/Node";

const _BaseNPointTool = types
  .model("BaseNTool", {
    group: "segmentation",
    smart: true,
    shortcut: "tool:rect",
  })
  .views((self) => {
    const Super = {
      createRegionOptions: self.createRegionOptions,
      isIncorrectControl: self.isIncorrectControl,
      isIncorrectLabel: self.isIncorrectLabel,
    };

    return {
      get getActivePolygon() {
        const poly = self.currentArea;

        if (poly && poly.closed) return null;
        if (poly === undefined) return null;
        if (poly && poly.type !== "rectangleregion") return null;

        return poly;
      },

      get tagTypes() {
        return {
          stateTypes: "rectanglelabels",
          controlTagTypes: ["rectanglelabels", "rectangle"],
        };
      },
      get defaultDimensions() {
        return DEFAULT_DIMENSIONS.rect;
      },
      createRegionOptions({ x, y }) {
        return Super.createRegionOptions({
          x,
          y,
          height: self.obj.canvasToInternalY(1),
          width: self.obj.canvasToInternalX(1),
        });
      },

      isIncorrectControl() {
        return Super.isIncorrectControl() && self.current() === null;
      },
      isIncorrectLabel() {
        return !self.current() && Super.isIncorrectLabel();
      },
      canStart() {
        return self.current() === null && !self.annotation.isReadOnly();
      },

      current() {
        return self.getActivePolygon;
      },
    };
  })
  .actions((self) => {
    const Super = {
      commitDrawingRegion: self.commitDrawingRegion,
    };

    return {
      beforeCommitDrawing() {
        const s = self.getActiveShape;

        return s.width > self.MIN_SIZE.X && s.height > self.MIN_SIZE.Y;
      },

      commitDrawingRegion() {
        const { currentArea, control, obj } = self;

        if (!currentArea) return;

        // Apply snap to pixel if enabled before finalizing the region
        if (control?.snap === "pixel") {
          const canvasX = currentArea.parent.internalToCanvasX(currentArea.x);
          const canvasY = currentArea.parent.internalToCanvasY(currentArea.y);
          const canvasWidth = currentArea.parent.internalToCanvasX(currentArea.width);
          const canvasHeight = currentArea.parent.internalToCanvasY(currentArea.height);

          // Apply snap logic through setPosition which handles both corners
          currentArea.setPosition(canvasX, canvasY, canvasWidth, canvasHeight, currentArea.rotation);
        }

        // Use the parent commitDrawingRegion to finalize the region
        return Super.commitDrawingRegion();
      },
    };
  });

const _Tool = types
  .model("RectangleTool", {
    shortcut: "tool:rect",
  })
  .views((self) => ({
    get viewTooltip() {
      return "Rectangle";
    },
    get iconComponent() {
      return self.dynamic ? NodeViews.RectRegionModel.altIcon : NodeViews.RectRegionModel.icon;
    },
  }));

const _Tool3Point = types
  .model("Rectangle3PointTool", {
    shortcut: "tool:rect-3point",
  })
  .views((self) => ({
    get viewTooltip() {
      return "3 Point Rectangle";
    },
    get iconComponent() {
      return self.dynamic ? NodeViews.Rect3PointRegionModel.altIcon : NodeViews.Rect3PointRegionModel.icon;
    },
  }));

const Rect = types.compose(
  _Tool.name,
  ToolMixin,
  BaseTool,
  TwoPointsDrawingTool,
  _BaseNPointTool,
  _Tool,
  AnnotationMixin,
);

const Rect3Point = types.compose(
  _Tool3Point.name,
  ToolMixin,
  BaseTool,
  ThreePointsDrawingTool,
  _BaseNPointTool,
  _Tool3Point,
  AnnotationMixin,
);

export { Rect, Rect3Point };
