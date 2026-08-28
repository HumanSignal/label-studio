import { ff } from "@humansignal/core";
import { isAlive, isStateTreeNode, types } from "mobx-state-tree";

import BaseTool, { DEFAULT_DIMENSIONS } from "./Base";
import ToolMixin from "../mixins/Tool";
import { MultipleClicksDrawingTool } from "../mixins/DrawingTool";
import { NodeViews } from "../components/Node/Node";
import { observe } from "mobx";
import { FF_POLYGON_FREEHAND, isFF } from "../utils/feature-flags";
import { isValidFreehandContour } from "../utils/freehand";

const FREEHAND_HISTORY_KEY = "polygon-freehand";
const FREEHAND_REPAIR_HISTORY_KEY = "polygon-contour-repair";

const _Tool = types
  .model("PolygonTool", {
    group: "segmentation",
    shortcut: "tool:polygon",
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

        if (poly && !isAlive(poly)) return null;
        if (poly && poly.closed) return null;
        if (poly === undefined) return null;
        if (poly && poly.type !== "polygonregion") return null;

        return poly;
      },

      get tagTypes() {
        return {
          stateTypes: "polygonlabels",
          controlTagTypes: ["polygonlabels", "polygon"],
        };
      },

      get viewTooltip() {
        return "Polygon region";
      },
      get iconComponent() {
        return self.dynamic ? NodeViews.PolygonRegionModel.altIcon : NodeViews.PolygonRegionModel.icon;
      },

      get defaultDimensions() {
        return DEFAULT_DIMENSIONS.polygon;
      },

      createRegionOptions({ x, y }) {
        return Super.createRegionOptions({
          points: [[x, y]],
          width: 10,
          closed: false,
        });
      },

      isIncorrectControl() {
        return Super.isIncorrectControl() && self.current() === null;
      },
      isIncorrectLabel() {
        return !self.current() && Super.isIncorrectLabel();
      },
      canStart() {
        return self.current() === null;
      },

      current() {
        return self.getActivePolygon;
      },
    };
  })
  .actions((self) => {
    let disposer;
    let closed;
    let freehandHistoryFrozen = false;
    let freehandFinishTimer = null;

    const releaseFreehandHistory = () => {
      if (!freehandHistoryFrozen) return;
      freehandHistoryFrozen = false;
      self.annotation.history.unfreeze(FREEHAND_HISTORY_KEY);
    };

    const finishFreehandDrawing = () => {
      if (!self.isDrawing || !self.getCurrentArea()) {
        releaseFreehandHistory();
        return false;
      }

      self.annotation.regionStore.selection.drawingUnselect();
      self.closeCurrent();
      freehandFinishTimer = setTimeout(() => {
        freehandFinishTimer = null;
        if (!isAlive(self) || !self.isDrawing || !self.annotation.isDrawing || !self.getCurrentArea()) {
          releaseFreehandHistory();
          return;
        }
        self._finishDrawing();
      });
      return true;
    };

    const isFreehandRepairTarget = (region) => {
      const annotation = self.annotation;
      const selectedRegions = annotation?.selectedRegions;

      if (!isFF(FF_POLYGON_FREEHAND)) return false;
      if (self.disabled || self.isDrawing) return false;
      if (!region || (isStateTreeNode(region) && !isAlive(region))) return false;
      if (!Array.isArray(selectedRegions) || selectedRegions.length !== 1 || selectedRegions[0] !== region) {
        return false;
      }
      if (region.type !== "polygonregion" || !region.closed || region.hidden || region.filtered) return false;
      if (region.isDrawing || region.locked || region.readonly) return false;
      if (annotation?.editable === false || annotation?.isDrawing || annotation?.isReadOnly?.()) return false;
      if (region.isReadOnly?.() !== false) return false;
      if (region.annotation !== annotation || region.object !== self.obj || region.control !== self.control)
        return false;
      if (typeof region.replacePoints !== "function" || typeof region.notifyDrawingFinished !== "function")
        return false;

      return true;
    };

    const hasValidFreehandRepairPoints = (points) =>
      Array.isArray(points) &&
      points.length >= 3 &&
      points.every((point) => {
        const x = Array.isArray(point) ? point[0] : point?.x;
        const y = Array.isArray(point) ? point[1] : point?.y;

        return Number.isFinite(x) && Number.isFinite(y);
      });

    return {
      canRepairFreehand(region) {
        return isFreehandRepairTarget(region);
      },
      commitFreehandRepair(region, points) {
        if (!isFreehandRepairTarget(region) || !hasValidFreehandRepairPoints(points)) return false;

        self.annotation.history.freeze(FREEHAND_REPAIR_HISTORY_KEY);
        try {
          const replaced = region.replacePoints(points);

          if (!replaced) return false;
          region.notifyDrawingFinished();
          return true;
        } finally {
          self.annotation.history.unfreeze(FREEHAND_REPAIR_HISTORY_KEY);
        }
      },
      canStartFreehand() {
        return isFF(FF_POLYGON_FREEHAND) && self.canStartDrawing();
      },
      commitFreehand(points) {
        if (!Array.isArray(points) || points.length < 3 || !self.canStartFreehand()) return false;
        if (!isValidFreehandContour(points)) return false;
        const validPoints = points;

        self.stopListening();
        closed = false;
        self.annotation.history.freeze(FREEHAND_HISTORY_KEY);
        freehandHistoryFrozen = true;
        try {
          self.startDrawing(validPoints[0][0], validPoints[0][1]);

          if (!self.isDrawing || !self.getCurrentArea()) {
            releaseFreehandHistory();
            return false;
          }

          validPoints.slice(1).forEach(([x, y]) => self.nextPoint(x, y));
          if (self.getCurrentArea().points.length < 3) {
            self.cleanupUncloseableShape();
            releaseFreehandHistory();
            return false;
          }

          return finishFreehandDrawing();
        } catch (error) {
          releaseFreehandHistory();
          throw error;
        }
      },
      handleToolSwitch(tool) {
        self.stopListening();
        releaseFreehandHistory();
        if (freehandFinishTimer !== null) return;
        if (self.getCurrentArea()?.isDrawing && tool.toolName !== "ZoomPanTool") {
          const shape = self.getCurrentArea()?.toJSON();

          if (shape?.points?.length > 2) self.finishDrawing();
          else self.cleanupUncloseableShape();
        }
      },
      listenForClose() {
        closed = false;
        disposer = observe(
          self.getCurrentArea(),
          "closed",
          () => {
            if (self.getCurrentArea()?.closed && !closed) {
              self.finishDrawing();
            }
          },
          true,
        );
      },
      stopListening() {
        if (disposer) {
          disposer();
          disposer = null;
        }
      },
      beforeDestroy() {
        self.stopListening();
        if (freehandFinishTimer !== null) clearTimeout(freehandFinishTimer);
        freehandFinishTimer = null;
        releaseFreehandHistory();
      },
      closeCurrent() {
        self.stopListening();
        if (closed) return;
        closed = true;
        self.getCurrentArea().closePoly();
      },

      startDrawing(x, y) {
        const point = self.control?.getSnappedPoint({ x, y });

        self.mode = "drawing";
        self.currentArea = self.createRegion(self.createRegionOptions({ x: point.x, y: point.y }), true);
        self.setDrawing(true);
        if (!ff.isActive(ff.FF_MULTIPLE_LABELS_REGIONS)) {
          self.applyActiveStates(self.currentArea);
        }
      },

      _finishDrawing() {
        try {
          const { currentArea, control } = self;

          self.currentArea.notifyDrawingFinished();
          self.setDrawing(false);
          self.currentArea = null;
          self.mode = "viewing";
          self.annotation.afterCreateResult(currentArea, control);
        } finally {
          releaseFreehandHistory();
        }
      },

      setDrawing(drawing) {
        self.currentArea?.setDrawing(drawing);
        self.annotation.setIsDrawing(drawing);
      },

      deleteRegion() {
        const { currentArea } = self;

        self.setDrawing(false);
        self.currentArea = null;
        if (currentArea) {
          currentArea.deleteRegion();
        }
      },
    };
  });

const Polygon = types.compose(_Tool.name, ToolMixin, BaseTool, MultipleClicksDrawingTool, _Tool);

export { Polygon };
