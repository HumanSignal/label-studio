import { observer } from "mobx-react";
import { types } from "mobx-state-tree";

import BaseTool from "./Base";
import ToolMixin from "../mixins/Tool";
import { clamp, findClosestParent } from "../utils/utilities";
import { DrawingTool } from "../mixins/DrawingTool";
import { Tool } from "../components/Toolbar/Tool";
import { Range } from "../common/Range/Range";
import { NodeViews } from "../components/Node/Node";

const MIN_SIZE = 1;
const MAX_SIZE = 50;

const IconDot = ({ size }) => {
  return (
    <span
      style={{
        display: "block",
        width: size,
        height: size,
        background: "rgba(0, 0, 0, 0.25)",
        borderRadius: "100%",
      }}
    />
  );
};

const ToolView = observer(({ item }) => {
  return (
    <Tool
      label="Bitmask"
      ariaLabel="bitmask-tool"
      active={item.selected}
      shortcut={item.shortcut}
      extraShortcuts={item.extraShortcuts}
      icon={item.iconClass}
      tool={item}
      onClick={() => {
        if (item.selected) return;

        item.manager.selectTool(item, true);
      }}
      controls={item.controls}
    />
  );
});

const _Tool = types
  .model("BitmaskTool", {
    strokeWidth: types.optional(types.number, 15),
    group: "segmentation",
    shortcut: "tool:brush",
    smart: true,
    unselectRegionOnToolChange: false,
  })
  .volatile(() => ({
    canInteractWithRegions: false,
  }))
  .views((self) => ({
    get viewClass() {
      return () => <ToolView item={self} />;
    },
    get iconComponent() {
      return self.dynamic ? NodeViews.BitmaskRegionModel.altIcon : NodeViews.BitmaskRegionModel.icon;
    },
    get tagTypes() {
      return {
        stateTypes: "bitmasklabels",
        controlTagTypes: ["bitmasklabels", "bitmask"],
      };
    },
    get controls() {
      return [
        <Range
          key="brush-size"
          value={self.strokeWidth}
          min={MIN_SIZE}
          max={MAX_SIZE}
          reverse
          align="vertical"
          minIcon={<IconDot size={8} />}
          maxIcon={<IconDot size={16} />}
          onChange={(value) => {
            self.setStroke(value);
          }}
        />,
      ];
    },
    get extraShortcuts() {
      return {
        "tool:decrease-tool": [
          "Decrease size",
          () => {
            self.setStroke(clamp(self.strokeWidth - 5, MIN_SIZE, MAX_SIZE));
          },
        ],
        "tool:increase-tool": [
          "Increase size",
          () => {
            self.setStroke(clamp(self.strokeWidth + 5, MIN_SIZE, MAX_SIZE));
          },
        ],
      };
    },
  }))
  .actions((self) => {
    let brush;
    let isFirstBrushStroke;

    return {
      commitDrawingRegion() {
        const { currentArea, control, obj } = self;
        const value = {
          imageDataURL: currentArea.getImageDataURL(),
        };
        const newArea = self.annotation.createResult(value, currentArea.results[0].value.toJSON(), control, obj);

        currentArea.setDrawing(false);
        self.applyActiveStates(newArea);
        try {
          self.deleteRegion();
        } catch (_e) {
          /* do nothing*/
        }
        newArea.notifyDrawingFinished();
        return newArea;
      },

      setStroke(val) {
        self.strokeWidth = val;
        self.updateCursor();
      },

      afterUpdateSelected() {
        self.updateCursor();
      },

      addPoint(x, y) {
        brush.addPoint(x, y, self.strokeWidth || self.control.strokeWidth);
      },

      mouseupEv(_ev, _, [x, y]) {
        if (self.mode !== "drawing") return;
        self.addPoint(x, y);
        self.mode = "viewing";
        brush.setDrawing(false);
        brush.endPath();
        if (isFirstBrushStroke) {
          const newBrush = self.commitDrawingRegion();
          self.obj.annotation.selectArea(newBrush);
          self.annotation.history.unfreeze();
          self.obj.annotation.setIsDrawing(false);
        } else {
          self.annotation.history.unfreeze();
          self.obj.annotation.setIsDrawing(false);
        }
      },

      mousemoveEv(ev, _, [x, y]) {
        if (!self.isAllowedInteraction(ev)) return;
        if (self.mode !== "drawing") return;
        if (
          !findClosestParent(
            ev.target,
            (el) => el === self.obj.stageRef.content,
            (el) => el.parentElement,
          )
        )
          return;

        self.addPoint(x, y);
      },

      mousedownEv(ev, _, [x, y]) {
        if (!self.isAllowedInteraction(ev)) return;
        if (
          !findClosestParent(
            ev.target,
            (el) => el === self.obj.stageRef.content,
            (el) => el.parentElement,
          )
        )
          return;
        const c = self.control;
        const o = self.obj;
        const hasHighlighted = o.regs.some((r) => r.highlighted);

        if (hasHighlighted) return;
        brush = self.getSelectedShape;

        // prevent drawing when current image is
        // different from image where the brush was started
        if (o && brush && o.multiImage && o.currentImage !== brush.item_index) return;

        // Reset the timer if a user started drawing again
        if (brush && brush.type === "bitmaskregion") {
          self.annotation.history.freeze();
          self.mode = "drawing";
          isFirstBrushStroke = false;
          brush.setDrawing(true);
          self.obj.annotation.setIsDrawing(true);
        } else {
          if (!self.canStartDrawing()) return;
          if (self.tagTypes.stateTypes === self.control.type && !self.control.isSelected) return;
          self.annotation.history.freeze();
          self.mode = "drawing";
          isFirstBrushStroke = true;
          self.obj.annotation.setIsDrawing(true);
          brush = self.createDrawingRegion({
            imageDataURL: null,
          });
        }

        brush.beginPath({
          type: "add",
          strokeWidth: self.strokeWidth || c.strokeWidth,
          x,
          y,
        });
      },
    };
  });

const BitmaskCursorMixin = types
  .model("BitmaskCursorMixin")
  .views((self) => ({
    get cursorStyleRule() {
      const _val = self.strokeWidth;
      return "crosshair";
    },
  }))
  .actions((self) => ({
    updateCursor() {
      if (!self.selected || !self.obj?.stageRef) return;
      const stage = self.obj.stageRef;
      stage.container().style.cursor = self.cursorStyleRule;
    },
  }));

const Bitmask = types.compose(_Tool.name, ToolMixin, BaseTool, DrawingTool, BitmaskCursorMixin, _Tool);

export { Bitmask, BitmaskCursorMixin };
