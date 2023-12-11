import { types } from 'mobx-state-tree';

import BaseTool, { DEFAULT_DIMENSIONS } from './Base';
import ToolMixin from '../mixins/Tool';
import { TwoPointsDrawingTool } from '../mixins/DrawingTool';
import { NodeViews } from '../components/Node/Node';

const _Tool = types
  .model('EllipseTool', {
    group: 'segmentation',
    shortcut: 'O',
  })
  .views(self => {
    const Super = {
      createRegionOptions: self.createRegionOptions,
    };

    return {
      get tagTypes() {
        return {
          stateTypes: 'ellipselabels',
          controlTagTypes: ['ellipselabels', 'ellipse'],
        };
      },
      get viewTooltip() {
        return 'Ellipse region';
      },
      get iconComponent() {
        return self.dynamic
          ? NodeViews.EllipseRegionModel.altIcon
          : NodeViews.EllipseRegionModel.icon;
      },
      get defaultDimensions() {
        const { radius } = DEFAULT_DIMENSIONS.ellipse;

        return {
          width: radius,
          height: radius,
        };
      },
      createRegionOptions({ x, y }) {
        return Super.createRegionOptions({
          x,
          y,
          radiusX: 1,
          radiusY: 1,
        });
      },
    };
  })
  .actions(self => ({
    beforeCommitDrawing() {
      const s = self.getActiveShape;

      return s.radiusX > self.MIN_SIZE.X && s.radiusY > self.MIN_SIZE.Y;
    },
  }));

const Ellipse = types.compose(_Tool.name, ToolMixin, BaseTool, TwoPointsDrawingTool, _Tool);

export { Ellipse };
