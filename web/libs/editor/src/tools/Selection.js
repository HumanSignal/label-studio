import { types } from 'mobx-state-tree';

import BaseTool from './Base';
import ToolMixin from '../mixins/Tool';
import { AnnotationMixin } from '../mixins/AnnotationMixin';
import { IconMoveTool } from '../assets/icons';
import { FF_LSDV_4930, isFF } from '../utils/feature-flags';

const _Tool = types.model('SelectionTool', {
  shortcut: 'V',
  group: 'control',
}).views(() => {
  return {
    get isSeparated() {
      return true;
    },
    get viewTooltip() {
      return 'Move';
    },
    get iconComponent() {
      return IconMoveTool;
    },
    get useTransformer() {
      return true;
    },
  };
}).actions(self => {
  let isSelecting = false;

  return {
    shouldSkipInteractions() {
      return false;
    },

    mousedownEv(ev, [x, y]) {
      isSelecting = true;
      self.obj.setSelectionStart({ x, y });
    },

    mousemoveEv(ev, [x, y]) {
      if (!isSelecting) return;
      self.obj.setSelectionEnd({ x, y });
    },

    mouseupEv(ev, [x, y]) {
      if (!isSelecting) return;
      self.obj.setSelectionEnd({ x, y });
      const { regionsInSelectionArea } = self.obj;

      self.obj.resetSelection();
      if (ev.ctrlKey || ev.metaKey) {
        self.annotation.extendSelectionWith(regionsInSelectionArea);
      } else {
        self.annotation.selectAreas(regionsInSelectionArea);
      }
      isSelecting = false;
    },
    clickEv(ev) {
      if (isFF(FF_LSDV_4930)) {
        isSelecting = false;
        self.obj.resetSelection();
        if (!ev.ctrlKey && !ev.metaKey) {
          self.annotation.unselectAreas();
        }
      }
    },
  };
});

const Selection = types.compose('MoveTool', ToolMixin, BaseTool, AnnotationMixin, _Tool);

export { Selection };
