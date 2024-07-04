import React from "react";
import { observer } from "mobx-react";
import { types } from "mobx-state-tree";

import BaseTool from './Base';
import ToolMixin from '../mixins/Tool';
import { findClosestParent } from '../utils/utilities';
import { DrawingTool } from '../mixins/DrawingTool';
import { IconEraserTool } from '../assets/icons';
import { Tool } from '../components/Toolbar/Tool';
import {getLocalActiveBrushOpacity, getLocalStrokeWidth, StrokeTool} from "../mixins/StrokeTool";


const ToolView = observer(({ item }) => {
  return (
    <Tool
      label="Eraser"
      ariaLabel="eraser"
      shortcut="E"
      active={item.selected}
      extraShortcuts={item.extraShortcuts}
      tool={item}
      disabled={!item.hasAnyAnnotation}
      onClick={() => {
        item.setLastAnnotationIfNull();
        if (item.selected) return;

        item.manager.selectTool(item, true);
      }}
      icon={item.iconClass}
      controls={item.controls}
    />
  );
});

const _Tool = types
  .model('EraserTool', {
    strokeWidth: getLocalStrokeWidth('eraser-size', 10),
    controlKey: 'eraser-size',
    group: 'segmentation',
    unselectRegionOnToolChange: false,
    activeBrushOpacity: getLocalActiveBrushOpacity('eraser-size')
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

  }))
  .actions((self) => {
    let brush;

    return {

      addPoint (x, y) {
        brush.addPoint(x, y);
      },

      mouseupEv() {
        if (self.mode !== "drawing") return;
        self.mode = "viewing";
        brush.endPath();
        self.updateRegionOpacity(brush, false);  // Disable region opacity if set.
      },

      mousemoveEv(ev, _, [x, y]) {
        self.requestCursorUpdate();
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
          self.mode = "drawing";
          brush.beginPath({
            type: "eraser",
            opacity: 1,
            strokeWidth: self.strokeWidth,
          });
          self.updateRegionOpacity(brush, true);  // Enable region opacity if set.
          self.addPoint(x, y);
        }
      },
    };
  });

const Erase = types.compose(_Tool.name, StrokeTool, _Tool);

export { Erase };
