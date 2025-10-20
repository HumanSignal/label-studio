import { isAlive, types } from "mobx-state-tree";

import BaseTool, { DEFAULT_DIMENSIONS } from "./Base";
import ToolMixin from "../mixins/Tool";
import { MultipleClicksDrawingTool } from "../mixins/DrawingTool";
import { NodeViews } from "../components/Node/Node";
import { observe } from "mobx";

const _Tool = types
  .model("VectorTool", {
    group: "segmentation",
    shortcut: "tool:vector",
  })
  .views((self) => {
    const Super = {
      createRegionOptions: self.createRegionOptions,
      isIncorrectControl: self.isIncorrectControl,
      isIncorrectLabel: self.isIncorrectLabel,
    };

    return {
      get getActiveVector() {
        const poly = self.currentArea;

        if (poly && !isAlive(poly)) return null;
        if (poly && poly.closed) return null;
        if (poly === undefined) return null;
        if (poly && poly.type !== "vectorregion") return null;

        return poly;
      },

      get tagTypes() {
        return {
          stateTypes: "vectorlabels",
          controlTagTypes: ["vectorlabels", "vector"],
        };
      },

      get viewTooltip() {
        return "Vector region";
      },

      get iconComponent() {
        return self.dynamic ? NodeViews.VectorRegionModel.altIcon : NodeViews.VectorRegionModel.icon;
      },

      get defaultDimensions() {
        return DEFAULT_DIMENSIONS.vector;
      },

      createRegionOptions() {
        return Super.createRegionOptions({
          vertices: [],
          converted: true,
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
        return self.getActiveVector;
      },
    };
  })
  .actions((self) => {
    const Super = {
      startDrawing: self.startDrawing,
      _finishDrawing: self._finishDrawing,
      deleteRegion: self.deleteRegion,
    };

    const disposers = [];
    let down = false;
    let initialCursorPosition = null;

    return {
      handleToolSwitch(tool) {
        self.stopListening();
        if (self.getCurrentArea()?.isDrawing && tool.toolName !== "ZoomPanTool") {
          const shape = self.getCurrentArea()?.toJSON();

          if (shape?.vertices?.length > 2) self.finishDrawing();
          else self.cleanupUncloseableShape();
        }
      },

      listenForClose() {
        const { currentArea } = self;
        if (!currentArea || !currentArea.closable) return;

        disposers.push(
          observe(currentArea, "closed", ({ newValue }) => newValue.storedValue && self.finishDrawing(), true),
        );
        disposers.push(
          observe(currentArea, "finished", ({ newValue }) => newValue.storedValue && self.finishDrawing(), true),
        );
      },

      stopListening() {
        for (const disposer of disposers) {
          disposer();
        }
      },

      clickEv() {
        // override parent method
        return;
      },

      realCoordsFromCursor(x, y) {
        const image = self.obj.currentImageEntity;
        const width = image.naturalWidth;
        const height = image.naturalHeight;

        const realX = (x / 100) * width;
        const realY = (y / 100) * height;
        return { x: realX, y: realY };
      },

      startDrawing(x, y) {
        if (self.mode === "drawing") return;
        if (!self.canStartDrawing()) return;

        const { x: rx, y: ry } = self.realCoordsFromCursor(x, y);

        initialCursorPosition = { x: rx, y: ry };

        const area = self.getCurrentArea();
        const currentArea = area && isAlive(area) ? area : null;
        self.currentArea = currentArea ?? self.createRegion(self.createRegionOptions(), true);

        self.mode = "drawing";
        self.setDrawing(true);

        self.applyActiveStates(self.currentArea);

        // Start listening for path closure
        self.listenForClose();

        // we must skip one frame before starting a line
        // to make sure KonvaVector was fully initialized
        setTimeout(() => {
          self.currentArea.startPoint(rx, ry);
        });
      },

      mousedownEv(e, [x, y]) {
        if (self.mode === "drawing") {
          return;
        }
        down = true;
        self.startDrawing(x, y);
      },

      mousemoveEv(_, [x, y]) {
        if (!self.isDrawing) return;
        const { x: rx, y: ry } = self.realCoordsFromCursor(x, y);
        if (down && self.checkDistance(rx, ry)) {
          self.currentArea?.updatePoint?.(rx, ry);
        }
      },

      mouseupEv(_, [x, y]) {
        if (!self.isDrawing) return;
        const { x: rx, y: ry } = self.realCoordsFromCursor(x, y);
        down = false;

        // skipping a frame to let KonvaVector render and update properly
        setTimeout(() => {
          self.currentArea?.commitPoint?.(rx, ry);
          self.finishDrawing();
        });
      },

      checkDistance(x, y) {
        const distX = x - initialCursorPosition.x;
        const distY = y - initialCursorPosition.y;

        return Math.abs(distX) >= 5 || Math.abs(distY) >= 5;
      },

      _finishDrawing() {
        const { currentArea, control } = self;

        down = false;
        self.currentArea?.notifyDrawingFinished();
        self.setDrawing(false);
        self.mode = "viewing";
        self.currentArea = null;
        self.stopListening();
        self.annotation.afterCreateResult(currentArea, control);
      },

      setDrawing(drawing) {
        self.currentArea?.setDrawing(drawing);
        self.annotation.setIsDrawing(drawing);
      },

      deleteRegion() {
        const { currentArea } = self;

        self.setDrawing(false);
        self.currentArea = null;
        self.stopListening();
        if (currentArea) {
          currentArea.deleteRegion();
        }
      },

      // Add point to current vector
      addPoint(x, y) {
        // KonvaVector handles point addition itself
      },

      // Finish drawing the current vector
      finishDrawing() {
        if (self.currentArea?.finished) {
          self._finishDrawing();
        }
      },

      complete() {
        self._finishDrawing();
      },

      // Clean up uncloseable shape
      cleanupUncloseableShape() {
        if (self.currentArea?.incomplete) {
          self.deleteRegion();
        }
      },
    };
  });

const Vector = types.compose(_Tool.name, ToolMixin, BaseTool, MultipleClicksDrawingTool, _Tool);

export { Vector };
