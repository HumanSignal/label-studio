import { getParent, getRoot, types } from 'mobx-state-tree';
import { guidGenerator } from '../core/Helpers';
import { AnnotationMixin } from '../mixins/AnnotationMixin';
import { ReadOnlyRegionMixin } from '../mixins/ReadOnlyMixin';

// @todo remove file
const RegionMixin = types
  .model({
    id: types.optional(types.identifier, guidGenerator),
    pid: types.optional(types.string, guidGenerator),

    score: types.maybeNull(types.number),

    hidden: types.optional(types.boolean, false),

    selected: types.optional(types.boolean, false),
    highlighted: types.optional(types.boolean, false),

    parentID: types.optional(types.string, ''),
  })
  .views(self => ({
    get perRegionStates() {
      const states = self.states;

      return states && states.filter(s => s.perregion === true);
    },

    get store() {
      return getRoot(self);
    },

    get parent() {
      return getParent(self);
    },

    get labelsState() {
      return self.states.find(s => s.type.indexOf('labels') !== -1);
    },

    isReadOnly() {
      return self.locked || self.readonly || self.annotation.readOnly();
    },

    hasLabelState(labelValue) {
      // first of all check if this region implements labels
      // interface
      const s = self.labelsState;

      if (!s) return false;

      // find that label and check if its selected
      const l = s.findLabel(labelValue);

      if (!l || !l.selected) return false;

      return true;
    },
  }))
  .actions(self => ({
    setParentID(id) {
      self.parentID = id;
    },

    // update region appearence based on it's current states, for
    // example bbox needs to update its colors when you change the
    // label, becuase it takes color from the label
    updateAppearenceFromState() {},

    serialize() {
      console.error('Region class needs to implement serialize');
    },

    selectRegion() {
      self.selected = true;
      self.annotation.setHighlightedNode(self);

      self.annotation.loadRegionState(self);
    },

    /**
     * Common logic for unselection; specific actions should be in `afterUnselectRegion`
     * @param {boolean} tryToKeepStates try to keep states selected if such settings enabled
     */
    unselectRegion(tryToKeepStates = false) {
      const annotation = self.annotation;
      const parent = self.parent;
      const keepStates = tryToKeepStates && self.store.settings.continuousLabeling;

      if (annotation.relationMode) {
        annotation.stopRelationMode();
      }
      if (parent.setSelected) {
        parent.setSelected(undefined);
      }

      self.selected = false;
      annotation.setHighlightedNode(null);

      self.afterUnselectRegion();

      if (!keepStates) {
        annotation.unloadRegionState(self);
      }
    },

    afterUnselectRegion() {},

    onClickRegion() {
      const annotation = self.annotation;

      if (annotation.relationMode) {
        annotation.addRelation(self);
        annotation.stopRelationMode();
        annotation.regionStore.unselectAll();
      } else {
        if (self.selected) {
          self.unselectRegion(true);
        } else {
          annotation.regionStore.unselectAll();
          self.selectRegion();
        }
      }
    },

    /**
     * Remove region
     */
    deleteRegion() {
      if (self.annotation.isReadOnly()) return;

      self.unselectRegion();

      self.annotation.relationStore.deleteNodeRelation(self);

      if (self.type === 'polygonregion') {
        self.destroyRegion();
      }

      self.annotation.regionStore.deleteRegion(self);

      self.annotation.deleteRegion(self);
    },

    setHighlight(val) {
      self._highlighted = val;
    },

    toggleHighlight() {
      self.setHighlight(!self.highlighted);
    },

    toggleHidden() {
      self.hidden = !self.hidden;
    },
  }));

export default types.compose(RegionMixin, ReadOnlyRegionMixin, AnnotationMixin);
