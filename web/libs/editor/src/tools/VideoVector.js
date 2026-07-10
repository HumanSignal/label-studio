import { isAlive, types } from "mobx-state-tree";

import BaseTool, { DEFAULT_DIMENSIONS } from "./Base";
import ToolMixin from "../mixins/Tool";
import { MultipleClicksDrawingTool } from "../mixins/DrawingTool";
import { NodeViews } from "../components/Node/Node";
import { observe } from "mobx";
import { ff } from "@humansignal/core";

/** Max time (ms) between two clicks to treat as double-click */
const DOUBLE_CLICK_MAX_MS = 300;
/** Max pixel distance between two clicks to treat as same position */
const DOUBLE_CLICK_MAX_PIXEL_DIST = 5;
/**
 * How long (ms) after finishing a region a trailing close-gesture click is
 * suppressed from toggling its selection. Comfortably exceeds KonvaVector's
 * ~150ms click-debounce while staying short enough that it can never block a
 * genuine later click on the region. BROS-1411.
 */
const SELECT_AFTER_CLOSE_GUARD_MS = 400;

const _Tool = types
  .model("VideoVectorTool", {
    group: "segmentation",
    shortcut: "tool:videovector",
  })
  .views((self) => {
    const Super = {
      isIncorrectControl: self.isIncorrectControl,
    };

    return {
      get getActiveVector() {
        const area = self.currentArea;

        if (area && !isAlive(area)) return null;
        if (area && area.closed) return null;
        if (area === undefined) return null;
        if (area && area.type !== "videovectorregion") return null;

        return area;
      },

      get tagTypes() {
        return {
          stateTypes: "videovectorlabels",
          controlTagTypes: ["videovectorlabels", "videovector"],
        };
      },

      get viewTooltip() {
        return "Video vector region";
      },

      get iconComponent() {
        return NodeViews.VideoVectorRegionModel?.icon ?? NodeViews.VectorRegionModel?.icon;
      },

      get defaultDimensions() {
        return DEFAULT_DIMENSIONS.vector;
      },

      isIncorrectControl() {
        return Super.isIncorrectControl() && self.current() === null;
      },

      isIncorrectLabel() {
        if (self.current()) return false;
        const obj = self.obj;
        if (!obj) return false;

        const labelStates = obj.activeStates?.() || [];
        if (labelStates.length === 0) return !!obj.hasStates;

        const availableStates = obj.getAvailableStates?.() ?? [];
        return availableStates.length === 0;
      },

      canStart() {
        const currentRegion = self.current();
        return currentRegion === null || (currentRegion && currentRegion.closed);
      },

      get canResumeDrawing() {
        if (self.isDrawing) return false;
        const obj = self.obj;
        const frame = obj?.currentFrame ?? obj?.frame;

        return !!obj?.regs?.find((reg) => {
          if (reg.type !== "videovectorregion" || !reg.selected || !isAlive(reg)) return false;
          const shape = reg.getShape?.(frame);
          return shape && !shape.closed && shape.vertices?.length > 0;
        });
      },

      current() {
        if (self.currentArea) {
          return self.getActiveVector;
        }

        const obj = self.obj;

        let regionsToSearch = [];
        if (obj?.regs && obj.regs.length > 0) {
          regionsToSearch = Array.from(obj.regs);
        } else if (self.annotation?.regions && self.annotation.regions.length > 0) {
          regionsToSearch = Array.from(self.annotation.regions);
        }

        if (regionsToSearch.length > 0) {
          const highlighted = self.annotation?.regionStore?.selection?.highlighted;
          if (highlighted && highlighted.type === "videovectorregion" && !highlighted.closed && isAlive(highlighted)) {
            return highlighted;
          }

          const selectedRegions = self.annotation?.selectedRegions || [];
          const selectedVectorRegions = selectedRegions.filter(
            (reg) => reg.type === "videovectorregion" && !reg.closed && isAlive(reg),
          );
          if (selectedVectorRegions.length === 1) {
            return selectedVectorRegions[0];
          }

          const activeDrawingVector = regionsToSearch.find(
            (reg) => reg.type === "videovectorregion" && reg.isDrawing && !reg.closed && isAlive(reg),
          );

          if (activeDrawingVector) {
            return activeDrawingVector;
          }
        }

        return self.getActiveVector;
      },

      getCurrentArea() {
        const currentRegion = self.current();
        if (currentRegion) {
          return currentRegion;
        }
        return self.currentArea;
      },
    };
  })
  .actions((self) => {
    const disposers = [];
    let down = false;
    let lastClick = { ts: 0, x: 0, y: 0 };
    // One-shot guard so the trailing (debounced) click of the gesture that just
    // closed/finished a region can't toggle its selection. BROS-1411.
    let suppressSelectRegionId = null;
    let suppressSelectAt = 0;

    return {
      // Video passes [x, y] pixel coords (not [x, y, canvasX, canvasY])
      // and should not filter shift for ghost point insertion
      event(name, ev, args) {
        if (ev.button > 0) return;
        let fn = `${name}Ev`;

        if (typeof self[fn] !== "undefined") self[fn].call(self, ev, args);

        if (name === "click") {
          const ts = ev.timeStamp;

          if (
            ts - lastClick.ts < DOUBLE_CLICK_MAX_MS &&
            Math.abs(lastClick.x - args[0]) < DOUBLE_CLICK_MAX_PIXEL_DIST &&
            Math.abs(lastClick.y - args[1]) < DOUBLE_CLICK_MAX_PIXEL_DIST
          ) {
            fn = `dbl${fn}`;
            if (typeof self[fn] !== "undefined") self[fn].call(self, ev, args);
          }
          lastClick = { ts, x: args[0], y: args[1] };
        }
      },

      canStartDrawing() {
        return (
          !self.disabled &&
          !self.isIncorrectControl() &&
          !self.isIncorrectLabel() &&
          self.canStart() &&
          !self.annotation?.isDrawing
        );
      },

      handleToolSwitch() {
        self.stopListening();
        if (self.getCurrentArea()?.isDrawing) {
          if (self.getCurrentArea()?.incomplete) self.deleteRegion();
          else self._finishDrawing();
        }
      },

      listenForClose() {
        const { currentArea } = self;

        if (!currentArea) return;

        // Video stores closed state in keyframes within `sequence`
        disposers.push(
          observe(
            currentArea,
            "sequence",
            () => {
              const obj = self.obj;
              const frame = obj?.currentFrame ?? obj?.frame;
              const shape = self.currentArea?.getShape(frame);

              if (shape?.closed) self._finishDrawing();
            },
            false,
          ),
        );

        disposers.push(
          observe(
            currentArea,
            "finished",
            () => {
              if (self.currentArea?.finished) self.finishDrawing();
            },
            false,
          ),
        );
      },

      stopListening() {
        for (const disposer of disposers) {
          try {
            disposer();
          } catch {
            // The observed region may already be destroyed (e.g. deleted from
            // the sidebar); disposing its observers is then a no-op.
          }
        }
        disposers.length = 0;
      },

      /**
       * Reset the tool back to a clean, non-drawing state.
       *
       * Used both when finishing normally and when the in-progress region is
       * removed out from under the tool (sidebar delete). Clearing `mode`,
       * `currentArea` and the annotation-level drawing flag is what lets the
       * next click start a fresh region. BROS-1207.
       */
      resetDrawingState() {
        down = false;
        // Guard with isAlive: in the BROS-1207 path the region was destroyed
        // externally, and optional chaining alone still triggers an MST
        // detached-node warning. Matches the rest of this file.
        if (self.currentArea && isAlive(self.currentArea)) self.currentArea.setEditingPointGesture(false);
        self.currentArea = null;
        self.mode = "viewing";
        self.stopListening();
        self.annotation?.setIsDrawing(false);
        self.annotation?.history?.unfreeze();
      },

      startDrawing() {
        if (!self.canStartDrawing()) return;

        const videoObj = self.obj;

        let area = self.getCurrentArea();

        // If no currentArea but there's an active drawing region, use it
        if (!area) {
          if (videoObj?.regs) {
            const activeDrawingVector = videoObj.regs.find(
              (reg) => reg.type === "videovectorregion" && reg.isDrawing && !reg.closed && isAlive(reg),
            );
            if (activeDrawingVector) {
              area = activeDrawingVector;
              self.currentArea = area;
            }
          }
        }

        const currentArea = area && isAlive(area) ? area : null;

        // Only create new region if we don't have an existing one
        if (!currentArea) {
          const newArea = videoObj.addVideoVectorRegion({
            vertices: [],
            closed: false,
          });

          if (!newArea) return;

          self.currentArea = newArea;
        } else {
          self.currentArea = currentArea;
          if (!currentArea.isDrawing) {
            currentArea.setDrawing(true);
          }
        }

        self.mode = "drawing";
        self.setDrawing(true);
        self.annotation?.history?.freeze();

        self.listenForClose();
        // The first vertex is added by mouseupEv (store-backed append, with a
        // KonvaVector fallback). We intentionally don't pre-start a point here:
        // a lone startPoint with no matching commit left the shared point-creation
        // manager in a half-open state and was part of the dropped-click race
        // (BROS-1206).
      },

      mousedownEv(ev) {
        // Shift+click is handled by KonvaVector for ghost point insertion
        // Alt+click is handled by KonvaVector for point deletion
        if (ev?.shiftKey || ev?.altKey) return;

        if (self.mode === "drawing") {
          // If the region we were drawing has been deleted or closed externally
          // (e.g. removed from the regions sidebar while still unfinished), the
          // tool's drawing state is stale. Without resetting it, this early
          // return would silently swallow every subsequent click and no new
          // region could ever be drawn. BROS-1207.
          if (self.getActiveVector) {
            self.annotation?.history?.freeze();
            down = true;
            return;
          }

          self.resetDrawingState();
        }

        // Check for selected unclosed region to resume drawing
        const obj = self.obj;
        const frame = obj?.currentFrame ?? obj?.frame;
        const selectedUnclosed = obj?.regs?.find((reg) => {
          if (reg.type !== "videovectorregion" || !reg.selected || !isAlive(reg)) return false;
          const shape = reg.getShape?.(frame);
          return shape && !shape.closed && shape.vertices?.length > 0;
        });

        if (selectedUnclosed) {
          self.currentArea = selectedUnclosed;
          self.mode = "drawing";
          // Start each gesture as a placement click; the view flips this to an
          // edit if it ends up dragging an existing point. BROS-1413.
          selectedUnclosed.setEditingPointGesture?.(false);
          selectedUnclosed.setDrawing(true);
          self.annotation?.setIsDrawing(true);
          self.listenForClose();
          self.annotation?.history?.freeze();
          down = true;
          return;
        }

        self.annotation?.unselectAreas?.();
        down = true;
        self.startDrawing();
      },

      // No bezier: mousemove is a no-op
      mousemoveEv() {},

      mouseupEv(_, [x, y]) {
        if (!self.isDrawing) return;
        if (!down) return;
        down = false;

        // Add a vertex on every mouse-up while drawing, matching the image
        // Vector tool. An earlier version only added a point when the cursor
        // moved less than 5px between mousedown and mouseup, so fast clicks —
        // where the cursor is still in motion during the click — exceeded that
        // delta and were silently dropped (BROS-1408). The `down` guard above
        // still excludes shift/alt clicks (handled by KonvaVector) and mouseups
        // that did not originate from a drawing mousedown.
        //
        // The exception is a point edit: if this gesture grabbed an existing
        // point/shape (the view marks it via onPointSelected / onTransformStart),
        // the reviewer was adjusting the region, not placing a new point, so
        // appending would drop a stray vertex. The flag is read inside the
        // deferred callback because the view may set it during KonvaVector's own
        // mouse-up handling, which can run after this stage-level handler.
        // BROS-1413.
        setTimeout(() => {
          // currentArea may have been destroyed between mouse-up and this tick.
          const area = self.currentArea;
          const areaAlive = area && isAlive(area);
          if (areaAlive && !area.editingPointGesture) {
            // Prefer the store-backed append, which reads the live vertices on
            // every click so rapid clicks never drop a point (BROS-1206). Fall
            // back to the KonvaVector path only on the very first click, before
            // the region's view has registered its handler.
            if (!area.addVertexAtCanvasPoint(x, y)) {
              area.startPoint(x, y);
              area.commitPoint(x, y);
            }
          }
          if (areaAlive) area.setEditingPointGesture(false);
          self.annotation?.history?.unfreeze();
          self.finishDrawing();
        });
      },

      // Video uses mousedown/mouseup exclusively
      clickEv() {},

      dblclickEv() {
        if (self.isDrawing) {
          self._finishDrawing();
        }
      },

      finishDrawing() {
        if (self.currentArea?.finished) {
          self._finishDrawing();
        }
      },

      _finishDrawing({ skipAfterCreate = false } = {}) {
        if (!self.currentArea) return;

        const { currentArea, control } = self;

        // Selection after creation is owned by afterCreateResult (which honors
        // the "Select region after creating it" setting). Arm a one-shot guard
        // so the trailing close-gesture click can't separately toggle this
        // region's selection out from under that decision. BROS-1411.
        suppressSelectRegionId = currentArea.id;
        suppressSelectAt = Date.now();

        down = false;
        if (self.currentArea && isAlive(self.currentArea)) self.currentArea.setEditingPointGesture(false);
        self.currentArea?.notifyDrawingFinished?.();
        self.setDrawing(false);
        self.mode = "viewing";
        self.currentArea = null;
        self.stopListening();
        self.annotation?.history?.unfreeze();

        if (!skipAfterCreate && currentArea && !currentArea.incomplete) {
          const afterCreateControl = currentArea.labeling?.from_name ?? control;

          self.annotation?.afterCreateResult?.(currentArea, afterCreateControl);
        }
      },

      /**
       * Whether a click on `regionId` is the trailing click of the gesture that
       * just finished it and should therefore be ignored for selection. Returns
       * true at most once per finish (single-shot) and only within the guard
       * window, so it can never block a genuine later click. BROS-1411.
       */
      consumeSelectSuppression(regionId) {
        if (suppressSelectRegionId !== regionId) return false;

        const recent = Date.now() - suppressSelectAt < SELECT_AFTER_CLOSE_GUARD_MS;
        suppressSelectRegionId = null;
        suppressSelectAt = 0;
        return recent;
      },

      setDrawing(drawing) {
        self.currentArea?.setDrawing(drawing);
        self.annotation?.setIsDrawing(drawing);
      },

      complete() {
        // Mirror the image Vector tool: finishing a drawing should run the
        // standard after-create behavior (which selects the region when
        // `selectAfterCreate` is enabled). Leaving the region unselected here
        // disabled Shift+Click point insertion on finished video vectors,
        // because KonvaVector only allows point editing on a selected region.
        self._finishDrawing();
      },

      cleanupUncloseableShape() {
        if (self.currentArea?.incomplete) {
          self.deleteRegion();
        }
      },

      deleteRegion() {
        const { currentArea } = self;

        self.currentArea = null;
        self.mode = "viewing";
        down = false;
        self.stopListening();
        self.annotation?.setIsDrawing(false);
        self.annotation?.history?.unfreeze();

        if (currentArea && isAlive(currentArea)) {
          currentArea.setDrawing(false);
          currentArea.deleteRegion();
        }
      },
    };
  });

const VideoVector = types.compose(_Tool.name, ToolMixin, BaseTool, MultipleClicksDrawingTool, _Tool);

export { VideoVector };
