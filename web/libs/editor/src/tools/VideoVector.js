import { isAlive, types } from "mobx-state-tree";

import BaseTool from "./Base";
import ToolMixin from "../mixins/Tool";
import { NodeViews } from "../components/Node/Node";
import { observe } from "mobx";
import { ff } from "@humansignal/core";

const _Tool = types
  .model("VideoVectorTool", {
    group: "segmentation",
    shortcut: "tool:videovector",
    default: true,
    mode: types.optional(types.enumeration(["drawing", "viewing"]), "viewing"),
    unselectRegionOnToolChange: true,
    isDrawingTool: true,
  })
  .volatile(() => ({
    currentArea: null,
  }))
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

    get isDrawing() {
      return self.mode === "drawing";
    },

    get annotation() {
      return self.obj?.annotation;
    },

    isIncorrectControl() {
      return self.tagTypes.stateTypes === self.control.type && !self.control.isSelected;
    },

    isIncorrectLabel() {
      const states = self.obj.activeStates?.();

      return states && states.length === 0 && self.obj.hasStates;
    },

    canStart() {
      return !self.isDrawing && !self.annotation?.isReadOnly();
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
      event(name, ev, args) {
        if (ev.button > 0) return;
        let fn = `${name}Ev`;

        if (typeof self[fn] !== "undefined") self[fn].call(self, ev, args);

        if (name === "click") {
          const ts = ev.timeStamp;

          if (ts - lastClick.ts < 300 && Math.abs(lastClick.x - args[0]) < 5 && Math.abs(lastClick.y - args[1]) < 5) {
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
          const verts = self.currentArea?.sequence?.[0]?.vertices;

          if (verts?.length > 2) self.finishDrawing();
          else self.cleanupUncloseableShape();
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

              if (shape?.closed) self.finishDrawing();
            },
            false,
          ),
        );
      },

      stopListening() {
        for (const disposer of disposers) {
          disposer();
        }
        disposers.length = 0;
      },

      /**
       * x, y are in video PIXEL coords (from normalizeMouseOffsets in VideoRegions)
       */
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

        self.listenForClose();

        if (!area || (area.sequence?.[0]?.vertices?.length ?? 0) === 0) {
          setTimeout(() => {
            self.currentArea?.startPoint(x, y);
          });
        }
      },

      mousedownEv(ev, [x, y]) {
        if (self.mode === "drawing") {
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
          down = true;
          initialCursorPosition = { x, y };
          return;
        }

        self.annotation?.unselectAreas?.();
        down = true;
        self.startDrawing(x, y);
      },

      mousemoveEv() {
        // Point creation is deferred to mouseup (click-vs-drag detection).
        // Ghost line is managed by KonvaVector internally.
      },

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
            });
          }
        }
      },

      dblclickEv() {
        if (self.isDrawing) {
          self.finishDrawing();
        }
      },

      checkDistance(x, y) {
        if (!initialCursorPosition) return false;
        const distX = x - initialCursorPosition.x;
        const distY = y - initialCursorPosition.y;

        return Math.abs(distX) >= 5 || Math.abs(distY) >= 5;
      },

      finishDrawing() {
        if (!self.currentArea) return;
        self.currentArea.setDrawing(false);
        self.currentArea.notifyDrawingFinished?.();
        self.annotation?.setIsDrawing(false);

        const { currentArea, control } = self;

        self.currentArea = null;
        self.mode = "viewing";
        down = false;
        self.stopListening();

        if (currentArea && !currentArea.incomplete) {
          self.annotation?.afterCreateResult?.(currentArea, control);
        }
      },

      complete() {
        if (!self.isDrawing) return;
        const verts = self.currentArea?.sequence?.[0]?.vertices;

        if (verts?.length > 2) self.finishDrawing();
        else self.cleanupUncloseableShape();
      },

      cleanupUncloseableShape() {
        const { currentArea } = self;

        self.currentArea = null;
        self.mode = "viewing";
        down = false;
        self.stopListening();
        self.annotation?.setIsDrawing(false);

        if (currentArea && isAlive(currentArea)) {
          currentArea.setDrawing(false);
          currentArea.deleteRegion();
        }
      },

      setSelected(selected) {
        self.selected = selected;
      },
    };
  });

const VideoVector = types.compose(_Tool.name, ToolMixin, BaseTool, _Tool);

export { VideoVector };
