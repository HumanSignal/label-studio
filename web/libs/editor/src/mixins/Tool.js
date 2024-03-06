import { getEnv, getRoot, types } from 'mobx-state-tree';
import { cloneNode } from '../core/Helpers';
import { AnnotationMixin } from './AnnotationMixin';
import {last} from "strman";

const ToolMixin = types
  .model({
    selected: types.optional(types.boolean, false),
    group: types.optional(types.string, 'default'),
    shortcut: types.optional(types.maybeNull(types.string), null),
  })
  .views(self => ({
    get obj() {
      return self.manager?.obj ?? getEnv(self).object;
    },

    get manager() {
      return getEnv(self).manager;
    },

    get control() {
      return getEnv(self).control;
    },

    get viewClass() {
      return () => null;
    },

    get fullName() {
      return self.toolName + (self.dynamic ? '-dynamic' : '');
    },

    get clonedStates() {
      const states = [self.control];
      const activeStates = states
        ? states.filter(c => c.isSelected)
        : // .filter(
      //   c =>
      //     c.type === IMAGE_CONSTANTS.rectanglelabels ||
      //     c.type === IMAGE_CONSTANTS.keypointlabels ||
      //     c.type === IMAGE_CONSTANTS.polygonlabels ||
      //     c.type === IMAGE_CONSTANTS.brushlabels,
      // )
        null;

      return activeStates ? activeStates.map(s => cloneNode(s)) : null;
    },

    get getActiveShape() {
      // active shape here is the last one that was added
      const obj = self.obj;

      return obj.regs[obj.regs.length - 1];
    },

    get getSelectedShape() {
      return self.control.annotation.highlightedNode;
    },

    get hasAnyAnnotation () {
      // Return if there are any annotation labels.
      return self.control.annotation.regionStore.filteredRegions.length > 0;
    },

    get extraShortcuts() {
      return {};
    },

    get shouldPreserveSelectedState() {
      if (!self.obj) return false;

      const settings = getRoot(self.obj).settings;

      return settings.preserveSelectedTool;
    },

    get isPreserved() {
      return window.localStorage.getItem(`selected-tool:${self.obj?.name}`) === self.fullName;
    },
  }))
  .actions(self => ({

    setSelected(selected) {
      self.selected = selected;
      self.afterUpdateSelected();

      if (selected && self.obj) {
        const storeName = `selected-tool:${self.obj.name}`;

        if (self.shouldPreserveSelectedState) {
          window.localStorage.setItem(storeName, self.fullName);
        }
      }
    },

    afterUpdateSelected() {},

    event(name, ev, args) {
      const fn = name + 'Ev';

      if (typeof self[fn] !== 'undefined') self[fn].call(self, ev, args);
    },

    setLastAnnotationIfNull () {
      if (self.getSelectedShape !== null) {
        return;  // No need to set annotation.
      }
      const regions = self.control.annotation.regionStore.filteredRegions;
      let lastRegion = null;
      regions.forEach(region => {
        if (lastRegion === null || region.ouid > lastRegion.ouid) {
          lastRegion = region;
        }
      });
      if (lastRegion === null) return;  // Unable to set region.
      self.control.annotation.regionStore.selectRegionsByIds([lastRegion.id]);
    }
  }));

export default types.compose(ToolMixin, AnnotationMixin);
