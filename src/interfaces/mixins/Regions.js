import { types } from "mobx-state-tree";

const RegionsMixin = types
  .model({
    selected: types.optional(types.boolean, false),
    highlighted: types.optional(types.boolean, false),
  })
  .actions(self => ({
    selectRegion() {
      self.selected = true;
      self.completion.setHighlightedNode(self);
    },

    unselectRegion() {
      const completion = self.completion;
      if (completion.relationMode) {
        completion.stopRelationMode();
      }

      self.selected = false;
      self.completion.setHighlightedNode(null);
    },

    onClickRegion() {
      const completion = self.completion;

      if (completion.relationMode) {
        completion.addRelation(self);
        completion.stopRelationMode();
        completion.regionStore.unselectAll();
      } else {
        if (self.selected) {
          self.unselectRegion();
        } else {
          completion.regionStore.unselectAll();
          self.selectRegion();
        }
      }
    },

    deleteRegion() {
      self.unselectRegion();

      self.completion.relationStore.deleteNodeRelation(self);

      self.completion.regionStore.deleteRegion(self);

      self.completion.deleteRegion(self);
    },

    setHighlight(val) {
      self.highlighted = val;
    },

    toggleHightlight() {
      self.setHighlight(!self.highlighted);
    },
  }));

export default RegionsMixin;
