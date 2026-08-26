import { observer } from "mobx-react";
import { types } from "mobx-state-tree";

import BaseTool from "./Base";
import ToolMixin from "../mixins/Tool";
import { clamp, findClosestParent } from "../utils/utilities";
import { DrawingTool } from "../mixins/DrawingTool";
import { IconEraserTool } from "@humansignal/icons";
import { Tool } from "../components/Toolbar/Tool";
import { Range } from "../common/Range/Range";
import { BrushCursorMixin } from "./Brush";

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
      label="Eraser"
      ariaLabel="eraser"
      shortcut="tool:eraser"
      active={item.selected}
      extraShortcuts={item.extraShortcuts}
      tool={item}
      disabled={!item.getSelectedShape}
      onClick={() => {
        if (item.selected) return;

        item.manager.selectTool(item, true);
      }}
      icon={item.iconClass}
      controls={item.controls}
    />
  );
});

const _Tool = types
  .model("EraserTool", {
    strokeWidth: types.optional(types.number, 10),
    group: "segmentation",
    unselectRegionOnToolChange: false,
  })
  .volatile(() => ({
    index: 9999,
    canInteractWithRegions: false,
  }))
  .views((self) => ({
    get viewClass() {
      return () => <ToolView item={self} />;
    },
    get iconComponent() {
      return IconEraserTool;
    },
    get controls() {
      return [
        <Range
          key="eraser-size"
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

    return {
      afterUpdateSelected() {
        self.updateCursor();
      },

      addPoint(x, y) {
        brush.addPoint(Math.floor(x), Math.floor(y));
      },

      setStroke(val) {
        self.strokeWidth = val;
        self.updateCursor();
      },

      mouseupEv() {
        if (self.mode !== "drawing") return;
        self.mode = "viewing";
        brush.endPath();
      },

      mousemoveEv(ev, _, [x, y]) {
        if (self.mode !== "drawing") return;
        if (
          !findClosestParent(
            ev.target,
            (el) => el === self.obj.stageRef.content,
            (el) => el.parentElement,
          )
        )
          return;

        if (brush?.type === "brushregion") {
          self.addPoint(x, y);
        }
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

        brush = self.getSelectedShape;
        if (!brush) return;

        if (brush && brush.type === "brushregion") {
          if (brush.isReadOnly() || brush.hidden) return;
          self.mode = "drawing";
          brush.beginPath({
            type: "eraser",
            opacity: 1,
            strokeWidth: self.strokeWidth,
          });
          self.addPoint(x, y);
        }
      },
    };
  });

const Erase = types.compose(_Tool.name, ToolMixin, BaseTool, DrawingTool, BrushCursorMixin, _Tool);

export { Erase };
