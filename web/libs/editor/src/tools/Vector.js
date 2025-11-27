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
          transformMode: false,
        });
      },

      isIncorrectControl() {
        return Super.isIncorrectControl() && self.current() === null;
      },
      isIncorrectLabel() {
        return !self.current() && Super.isIncorrectLabel();
      },
      canStart() {
        // Allow starting if no current region, OR if current region is closed (finished)
        const currentRegion = self.current();
        return currentRegion === null || (currentRegion && currentRegion.closed);
      },

      current() {
        // First check self.currentArea
        if (self.currentArea) {
          return self.getActiveVector;
        }

        // If currentArea is null, try to find an active drawing vector region
        // This handles the case when continuing to draw an existing region
        const obj = self.obj;

        // Try obj.regs first
        let regionsToSearch = [];
        if (obj?.regs && obj.regs.length > 0) {
          regionsToSearch = Array.from(obj.regs);
        } else if (self.annotation?.regions && self.annotation.regions.length > 0) {
          regionsToSearch = Array.from(self.annotation.regions);
        }

        if (regionsToSearch.length > 0) {
          // Priority 1: Check for highlighted/selected vector region that's not closed
          const highlighted = self.annotation?.regionStore?.selection?.highlighted;
          if (highlighted && highlighted.type === "vectorregion" && !highlighted.closed && isAlive(highlighted)) {
            return highlighted;
          }

          // Priority 2: Check selected regions - if only one vector region is selected and not closed
          const selectedRegions = self.annotation?.selectedRegions || [];
          const selectedVectorRegions = selectedRegions.filter(
            (reg) => reg.type === "vectorregion" && !reg.closed && isAlive(reg),
          );
          if (selectedVectorRegions.length === 1) {
            return selectedVectorRegions[0];
          }

          // Priority 3: Try to find a region that's actively drawing
          // Only allow continuing to draw if the region is actively being drawn (isDrawing: true)
          // This prevents drawing on unselected regions that are just not closed
          const activeDrawingVector = regionsToSearch.find(
            (reg) => reg.type === "vectorregion" && reg.isDrawing && !reg.closed && isAlive(reg),
          );

          if (activeDrawingVector) {
            return activeDrawingVector;
          }
        }

        return self.getActiveVector;
      },

      getCurrentArea() {
        // Override to use current() which finds regions even when self.currentArea is null
        const currentRegion = self.current();
        if (currentRegion) {
          return currentRegion;
        }
        // Fallback to parent implementation
        return self.currentArea;
      },
    };
  })
  .actions((self) => {
    // Store the MultipleClicksDrawingTool's canStartDrawing before we override it
    const MultipleClicksCanStartDrawing = self.canStartDrawing;

    const Super = {
      startDrawing: self.startDrawing,
      _finishDrawing: self._finishDrawing,
      deleteRegion: self.deleteRegion,
      event: self.event,
    };

    const disposers = [];
    let down = false;
    let initialCursorPosition = null;
    let lastClick = {
      ts: 0,
      x: 0,
      y: 0,
    };

    return {
      // Override event() to allow shift-key events through for ghost point insertion
      event(name, ev, [x, y, canvasX, canvasY]) {
        // For Vector tool, allow shift-key events to pass through
        // This enables shift-click for inserting points on segments
        if (ev.button > 0) return; // Still filter right clicks and middle clicks

        let fn = `${name}Ev`;

        if (typeof self[fn] !== "undefined") self[fn].call(self, ev, [x, y], [canvasX, canvasY]);

        // Emulating of dblclick event
        if (name === "click") {
          const ts = ev.timeStamp;

          if (ts - lastClick.ts < 300 && self.comparePointsWithThreshold(lastClick, { x, y })) {
            fn = `dbl${fn}`;
            if (typeof self[fn] !== "undefined") self[fn].call(self, ev, [x, y], [canvasX, canvasY]);
          }
          lastClick = { ts, x, y };
        }
      },
      canStartDrawing() {
        // Override to allow continuing to draw on selected/highlighted regions even if there's a selection
        // This is Vector-specific behavior - other tools should use the default behavior from MultipleClicksDrawingTool
        // First call the MultipleClicksDrawingTool's canStartDrawing (which includes selection check)
        const mixinResult = MultipleClicksCanStartDrawing();

        // If mixin allows drawing, we're good
        if (mixinResult) return true;

        // Otherwise, check if we have a current drawing region that should allow continuing
        const currentRegion = self.current();
        const hasCurrentDrawing = currentRegion && (currentRegion.isDrawing || !currentRegion.closed);

        // Allow continuing to draw if there's a current drawing region, even with selection
        if (hasCurrentDrawing) {
          // Still need to check base conditions
          return (
            !self.disabled &&
            !self.isIncorrectControl() &&
            !self.isIncorrectLabel() &&
            self.canStart() &&
            !self.annotation.isDrawing
          );
        }

        return false;
      },
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

      realCoordsFromCursor(x, y) {
        const image = self.obj.currentImageEntity;
        const width = image.naturalWidth;
        const height = image.naturalHeight;

        const realX = (x / 100) * width;
        const realY = (y / 100) * height;
        return { x: realX, y: realY };
      },

      startDrawing(x, y) {
        if (!self.canStartDrawing()) return;

        const { x: rx, y: ry } = self.realCoordsFromCursor(x, y);

        initialCursorPosition = { x: rx, y: ry };

        // Try to find existing drawing region first
        let area = self.getCurrentArea();

        // If no currentArea but there's an active drawing region, use it
        if (!area) {
          const obj = self.obj;
          if (obj && obj.regs) {
            const activeDrawingVector = obj.regs.find(
              (reg) => reg.type === "vectorregion" && reg.isDrawing && !reg.closed && isAlive(reg),
            );
            if (activeDrawingVector) {
              area = activeDrawingVector;
              self.currentArea = area;
            }
          }
        }

        const currentArea = area && isAlive(area) ? area : null;

        self.annotation.history.freeze();

        // Only create new region if we don't have an existing one
        if (!currentArea) {
          self.currentArea = self.createRegion(self.createRegionOptions(), true);
        } else {
          self.currentArea = currentArea;
          // If reusing an existing region, make sure it's marked as drawing
          if (!currentArea.isDrawing) {
            currentArea.setDrawing(true);
          }
        }

        self.mode = "drawing";
        self.setDrawing(true);

        self.applyActiveStates(self.currentArea);

        // Start listening for path closure
        self.listenForClose();

        // Only call startPoint if this is a new region (no existing points)
        // If continuing an existing region, we'll just add points via addPoint
        if (!currentArea || currentArea.vertices.length === 0) {
          // we must skip one frame before starting a line
          // to make sure KonvaVector was fully initialized
          setTimeout(() => {
            self.currentArea.startPoint(rx, ry);
          });
        }
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
          self.annotation.history.unfreeze();
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

        if (currentArea === null) return;

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
        // Convert from percentage (0-100) to real coordinates using the same formula as startDrawing
        const { x: rx, y: ry } = self.realCoordsFromCursor(x, y);

        // Try to find the area - first check getCurrentArea, then look in annotation store
        let area = self.getCurrentArea();

        // If no currentArea but there's an active drawing region, use it
        if (!area) {
          const obj = self.obj;
          if (obj && obj.regs) {
            const activeDrawingVector = obj.regs.find(
              (reg) => reg.type === "vectorregion" && reg.isDrawing && !reg.closed && isAlive(reg),
            );
            if (activeDrawingVector) {
              area = activeDrawingVector;
              self.currentArea = area;
            }
          }
        }

        if (area) {
          area.addPoint(rx, ry);
        }
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
