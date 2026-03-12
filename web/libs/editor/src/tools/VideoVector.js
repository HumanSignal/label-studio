import { isAlive, types } from "mobx-state-tree";

import BaseTool, { DEFAULT_DIMENSIONS } from "./Base";

/** Max time (ms) between two clicks to treat as double-click */
const DOUBLE_CLICK_MAX_MS = 300;
/** Max pixel distance between two clicks to treat as same position (double-click) */
const DOUBLE_CLICK_MAX_PIXEL_DIST = 5;
import ToolMixin from "../mixins/Tool";
import { MultipleClicksDrawingTool } from "../mixins/DrawingTool";
import { NodeViews } from "../components/Node/Node";
import { observe } from "mobx";
import { ff } from "@humansignal/core";

const _Tool = types
  .model("VideoVectorTool", {
    group: "segmentation",
    shortcut: "tool:videovector",
  })
  .views((self) => ({
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

    // Video object doesn't have checkLabels(); use activeStates instead
    isIncorrectLabel() {
      const states = self.obj?.activeStates?.();
      return states && states.length === 0 && self.obj.hasStates;
    },

    canStart() {
      return !self.isDrawing && !self.annotation?.isReadOnly();
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

    getActiveVector() {
      const area = self.currentArea;

      if (area && !isAlive(area)) return null;
      if (area === undefined) return null;
      if (area && area.type !== "videovectorregion") return null;

      return area;
    },

    getCurrentArea() {
      return self.currentArea;
    },

    current() {
      if (self.currentArea) {
        return self.getActiveVector();
      }

      const obj = self.obj;

      if (obj?.regs) {
        const activeDrawing = obj.regs.find((reg) => reg.type === "videovectorregion" && reg.isDrawing && isAlive(reg));

        if (activeDrawing) return activeDrawing;
      }

      return self.getActiveVector();
    },
  }))
  .actions((self) => {
    let down = false;
    let initialCursorPosition = null;
    const disposers = [];
    let lastClick = { ts: 0, x: 0, y: 0 };

    return {
      // Video passes [x,y] (not [x,y,canvasX,canvasY]) and should not filter shift
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
        if (self.currentArea?.isDrawing) {
          if (self.currentArea?.incomplete) self.deleteRegion();
          else self._finishDrawing();
        }
      },

      listenForClose() {
        const { currentArea } = self;

        if (!currentArea) return;

        disposers.push(
          observe(
            currentArea,
            "sequence",
            () => {
              const shape = self.currentArea?.getShape(self.obj.frame);

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

      closeCurrent() {
        // Video vector closing is handled by listenForClose observers
      },

      stopListening() {
        for (const disposer of disposers) {
          disposer();
        }
        disposers.length = 0;
      },

      startDrawing(x, y) {
        if (!self.canStartDrawing()) return;

        const videoObj = self.obj;

        initialCursorPosition = { x, y };

        let area = self.current();

        if (!area) {
          area = videoObj.addVideoVectorRegion({
            vertices: [],
            closed: false,
          });

          if (!area) return;

          self.currentArea = area;

          const activeStates = videoObj.activeStates();

          if (ff.isActive(ff.FF_MULTIPLE_LABELS_REGIONS)) {
            // labels are already applied in addVideoVectorRegion
          } else {
            for (const tag of activeStates) {
              area.setValue(tag);
            }
          }
        } else {
          self.currentArea = area;
        }

        self.mode = "drawing";
        area.setDrawing(true);
        self.annotation?.setIsDrawing(true);
        self.annotation?.history?.freeze();

        self.listenForClose();

        if (!area || (area.sequence?.[0]?.vertices?.length ?? 0) === 0) {
          setTimeout(() => {
            self.currentArea?.startPoint(x, y);
          });
        }
      },

      mousedownEv(ev, [x, y]) {
        if (self.mode === "drawing") {
          self.annotation?.history?.freeze();
          down = true;
          initialCursorPosition = { x, y };
          return;
        }

        const obj = self.obj;
        const frame = obj?.currentFrame;
        const selectedUnclosed = obj?.regs?.find((reg) => {
          if (reg.type !== "videovectorregion" || !reg.selected || !isAlive(reg)) return false;
          const shape = reg.getShape(frame);
          return shape && !shape.closed && shape.vertices?.length > 0;
        });

        if (selectedUnclosed) {
          self.currentArea = selectedUnclosed;
          self.mode = "drawing";
          selectedUnclosed.setDrawing(true);
          self.annotation?.setIsDrawing(true);
          self.listenForClose();
          self.annotation?.history?.freeze();
          down = true;
          initialCursorPosition = { x, y };
          return;
        }

        self.annotation?.unselectAreas?.();
        down = true;
        self.startDrawing(x, y);
      },

      mousemoveEv() {},

      mouseupEv(_, [x, y]) {
        if (!self.isDrawing) return;
        if (!down) return;
        down = false;

        if (initialCursorPosition) {
          const dx = Math.abs(x - initialCursorPosition.x);
          const dy = Math.abs(y - initialCursorPosition.y);

          if (dx < 5 && dy < 5) {
            setTimeout(() => {
              self.currentArea?.startPoint(x, y);
              self.currentArea?.commitPoint(x, y);
              self.annotation?.history?.unfreeze();
              self.finishDrawing();
            });
          }
        }
      },

      // Video uses mousedown/mouseup exclusively; disable MultipleClicksDrawingTool's click handler
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
        self.currentArea.setDrawing(false);
        self.currentArea.notifyDrawingFinished?.();
        self.annotation?.setIsDrawing(false);
        self.annotation?.history?.unfreeze();

        const { currentArea, control } = self;

        self.currentArea = null;
        self.mode = "viewing";
        down = false;
        self.stopListening();

        if (!skipAfterCreate && currentArea && !currentArea.incomplete) {
          self.annotation?.afterCreateResult?.(currentArea, control);
        }
      },

      complete() {
        self._finishDrawing({ skipAfterCreate: true });
        self.annotation?.unselectAll();
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
