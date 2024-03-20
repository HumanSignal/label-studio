import React from 'react';
import { observer } from 'mobx-react';
import { types } from 'mobx-state-tree';

import BaseTool from './Base';
import ToolMixin from '../mixins/Tool';
import Canvas from '../utils/canvas';
import { clamp, findClosestParent } from '../utils/utilities';
import { DrawingTool } from '../mixins/DrawingTool';
import { Tool } from '../components/Toolbar/Tool';
import { Range } from '../common/Range/Range'; 
import { NodeViews } from '../components/Node/Node';
import { FF_DEV_3666, FF_DEV_4081, isFF } from '../utils/feature-flags';

const MIN_SIZE = 1;
const MAX_SIZE = 50;

const IconDot = ({ size }) => {
  return (
    <span style={{
      display: 'block',
      width: size,
      height: size,
      background: 'rgba(0, 0, 0, 0.25)',
      borderRadius: '100%',
    }}/>
  );
};

const ToolView = observer(({ item }) => {
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
        if (item.selected) return;

        item.manager.selectTool(item, true);
      }}
      controls={item.controls}
    />
  );
});

const _Tool = types
  .model('BrushTool', {
    strokeWidth: types.optional(types.number, 15),
    group: 'segmentation',
    shortcut: 'B',
    smart: true,

    // Support the existing unselect behavior until the Magic Wand feature flag is on by default.
    // @todo change to false once the Magic Wand is on by default.
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
          minIcon={<IconDot size={8}/>}
          maxIcon={<IconDot size={16}/>}
          onChange={(value) => {
            self.setStroke(value);
          }}
        />,
      ];
    },
    get extraShortcuts() {
      return {
        '[': ['Decrease size', () => {
          self.setStroke(clamp(self.strokeWidth - 5, MIN_SIZE, MAX_SIZE));
        }],
        ']': ['Increase size', () => {
          self.setStroke(clamp(self.strokeWidth + 5, MIN_SIZE, MAX_SIZE));
        }],
      };
    },
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

      updateCursor() {
        if (!self.selected || !self.obj?.stageRef) return;
        const val = self.strokeWidth;
        const stage = self.obj.stageRef;
        const base64 = Canvas.brushSizeCircle(val);
        const cursor = ['url(\'', base64, '\')', ' ', Math.floor(val / 2) + 4, ' ', Math.floor(val / 2) + 4, ', auto'];

        stage.container().style.cursor = cursor.join('');
      },

      setStroke(val) {
        self.strokeWidth = val;
      },

      afterUpdateSelected() {
        self.updateCursor();
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

const Brush = types.compose(_Tool.name, ToolMixin, BaseTool, DrawingTool, _Tool);

export { Brush };
