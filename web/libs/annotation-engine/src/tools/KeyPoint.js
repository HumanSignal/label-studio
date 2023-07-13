import { types } from 'mobx-state-tree';

import BaseTool from './Base';
import ToolMixin from '../mixins/Tool';
import { NodeViews } from '../components/Node/Node';
import { DrawingTool } from '../mixins/DrawingTool';
import { FF_DEV_3666, FF_DEV_3793, isFF } from '../utils/feature-flags';

const _Tool = types
  .model('KeyPointTool', {
    default: types.optional(types.boolean, true),
    group: 'segmentation',
    shortcut: 'K',
    smart: true,
  })
  .views(() => ({
    get tagTypes() {
      return {
        stateTypes: 'keypointlabels',
        controlTagTypes: ['keypointlabels', 'keypoint'],
      };
    },
    get viewTooltip() {
      return 'Key Point';
    },
    get iconComponent() {
      return self.dynamic
        ? NodeViews.KeyPointRegionModel.altIcon
        : NodeViews.KeyPointRegionModel.icon;
    },
  }))
  .actions(self => ({
    clickEv(ev, [x, y]) {
      if (isFF(FF_DEV_3666) && !self.canStartDrawing()) return;

      const c = self.control;

      if (c.type === 'keypointlabels' && !c.isSelected) return;
      if (self.annotation.isReadOnly()) return;

      const keyPoint = self.createRegion({
        x,
        y,
        ...(isFF(FF_DEV_3793)
          ? {
            // strokeWidth is visual only, so it's in screen dimensions in config
            width: self.obj.canvasToInternalX(Number(c.strokewidth)),
          }
          : {
            width: Number(c.strokewidth),
            coordstype: 'px',
          }
        ),
        dynamic: self.dynamic,
        negative: self.dynamic && ev.altKey,
      });

      keyPoint.setDrawing(false);
      keyPoint.notifyDrawingFinished();
    },
  }));

const KeyPoint = types.compose(_Tool.name, ToolMixin, BaseTool, DrawingTool, _Tool);

export { KeyPoint };
