import React from 'react';
import { observer } from 'mobx-react';
import { types } from 'mobx-state-tree';

import BaseTool from './Base';
import ToolMixin from '../mixins/Tool';
import { findClosestParent } from '../utils/utilities';
import { DrawingTool } from '../mixins/DrawingTool';
import { Tool } from '../components/Toolbar/Tool';
import { NodeViews } from '../components/Node/Node';
import { FF_DEV_3666, FF_DEV_4081, isFF } from '../utils/feature-flags';
import {StrokeTool} from "../mixins/StrokeTool";



const ToolView = observer(({ item }) => {
  console.log('brush is active?', item.selected, item.dynamic)
  return (
    <Tool
      label="Brush"
      ariaLabel="brush-tool"
      active={item.selected}
      shortcut={item.shortcut}
      extraShortcuts={item.extraShortcuts}
      icon={item.iconClass}
      tool={item}
      onClick={() => {
        item.setLastAnnotationIfNull();  // Set last annotation if none is set.
        if (item.selected) return;

        item.manager.selectTool(item, true);
      }}
      controls={item.controls}
    />
  );
});

const _Tool = types
  .model('BrushTool', {
    controlKey: 'brush-size',
    strokeWidth: types.optional(types.number, 15),
    group: 'segmentation',
    shortcut: 'B',
    smart: true,
    unselectRegionOnToolChange: isFF(FF_DEV_4081) ? false : true,
  })
  .volatile(() => ({
    canInteractWithRegions: false,
  }))
  .views(self => ({
    get viewClass() {
      return () => <ToolView item={self} />;
    },
    get iconComponent() {
      return self.dynamic
        ? NodeViews.BrushRegionModel.altIcon
        : NodeViews.BrushRegionModel.icon;
    },
    get tagTypes() {
      return {
        stateTypes: 'brushlabels',
        controlTagTypes: ['brushlabels', 'brush'],
      };
    }

  }))
  .actions(self => {
    let brush, isFirstBrushStroke;

    return {

      commitDrawingRegion() {
        const { currentArea, control, obj } = self;
        const source = currentArea.toJSON();

        const value = { coordstype: 'px', touches: source.touches, dynamic: source.dynamic };
        const newArea = self.annotation.createResult(value, currentArea.results[0].value.toJSON(), control, obj);

        currentArea.setDrawing(false);
        self.applyActiveStates(newArea);
        self.deleteRegion();
        newArea.notifyDrawingFinished();
        return newArea;
      },

      addPoint(x, y) {
        brush.addPoint(Math.floor(x), Math.floor(y));
      },

      mouseupEv(ev, _, [x, y]) {
        if (self.mode !== 'drawing') return;
        self.addPoint(x, y);
        self.mode = 'viewing';
        brush.setDrawing(false);
        brush.endPath();
        if (isFirstBrushStroke) {
          setTimeout(() => {
            const newBrush = self.commitDrawingRegion();

            self.obj.annotation.selectArea(newBrush);
            self.annotation.history.unfreeze();
            self.obj.annotation.setIsDrawing(false);
          });
        } else {
          self.annotation.history.unfreeze();
          self.obj.annotation.setIsDrawing(false);
        }
      },

      mousemoveEv(ev, _, [x, y]) {
        self.requestCursorUpdate();
        if (self.mode !== 'drawing') return;
        if (
          !findClosestParent(
            ev.target,
            el => el === self.obj.stageRef.content,
            el => el.parentElement,
          )
        )
          return;

        self.addPoint(x, y);
      },

      mousedownEv(ev, _, [x, y]) {
        if (
          !findClosestParent(
            ev.target,
            el => el === self.obj.stageRef.content,
            el => el.parentElement,
          )
        )
          return;
        const c = self.control;
        const o = self.obj;

        brush = self.getSelectedShape;

        // prevent drawing when current image is
        // different from image where the brush was started
        if (o && brush && o.multiImage && o.currentImage !== brush.item_index) return;

        // Reset the timer if a user started drawing again
        if (brush && brush.type === 'brushregion') {
          self.annotation.history.freeze();
          self.mode = 'drawing';
          brush.setDrawing(true);
          self.obj.annotation.setIsDrawing(true);
          isFirstBrushStroke = false;
          brush.beginPath({
            type: 'add',
            strokeWidth: self.strokeWidth || c.strokeWidth,
          });

          self.addPoint(x, y);
        } else {
          if (isFF(FF_DEV_3666) && !self.canStartDrawing()) return;
          if (self.tagTypes.stateTypes === self.control.type && !self.control.isSelected) return;
          self.annotation.history.freeze();
          self.mode = 'drawing';
          isFirstBrushStroke = true;
          self.obj.annotation.setIsDrawing(true);
          brush = self.createDrawingRegion({
            touches: [],
            coordstype: 'px',
          });

          brush.beginPath({
            type: 'add',
            strokeWidth: self.strokeWidth || c.strokeWidth,
          });

          self.addPoint(x, y);
        }
      },
    };
  });

const Brush = types.compose(_Tool.name, ToolMixin, BaseTool, DrawingTool, StrokeTool, _Tool);

export { Brush };
