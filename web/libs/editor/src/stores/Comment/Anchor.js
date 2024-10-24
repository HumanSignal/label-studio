import { getParent, types } from "mobx-state-tree";
import { isDefined } from "../../utils/utilities";

export const Anchor = types
  .model({
    regionId: types.maybe(types.string),
    controlName: types.maybe(types.string),
  })
  .views((self) => ({
    get comment() {
      return getParent(self);
    },
    get annotation() {
      return self.comment.annotation;
    },
    get region() {
      return self.annotation.regions.find((r) => r.cleanId === self.regionId);
    },
    get result() {
      // @todo we might link global classifications via region id only in a future
      // @todo so then we have to check for `region.classification === true`
      if (!self.controlName) return null;
      // if we just removed the region
      if (!self.region) return null;
      return self.region.results.find((r) => r.from_name.name === self.controlName);
    },
    /**
     * This will be provided to CommentsOverlay to observe changes in bbox coordinates and sizes
     *
     * @return {Object} The overlays-applicable node of the anchor.
     */
    get overlayNode() {
      const { result, region } = self;
      if (self.comment.isResolved || self.comment.isDeleted) return null;
      if (!region || region.hidden) return null;
      const isOnCurrentItem = (region.item_index ?? 0) === (region.object.currentItemIndex ?? 0);
      if (!isOnCurrentItem) return null;

      if (result) {
        const controlTag = result.from_name;
        // Most probably, it's always true as we should work only with classification results for now.
        // If this is not the case, then at the time of writing this comment,
        // we assume that we have no way of displaying anything related to the overlay for this result.
        const isClassification = controlTag.isClassificationTag;
        // Taking into account `visiblewhen`
        const isVisible = controlTag.isVisible !== false;
        // The result that is displayed at the control tag right now
        const currentResult = controlTag.result;
        // It'll always be true for perObject mode,
        // and for perRegion/perItem it'll be true only if the result is already displayed at the control tag
        // (related region/item are selected)
        const isCurrentResult = currentResult === result;
        const isDisplayedAtControlTag = isClassification && isVisible && isCurrentResult;
        if (isDisplayedAtControlTag) {
          return result;
        }
      }

      // if a result does not exist,
      // or it's hidden, we still need to indicate comment existence on its region if it's possible
      return self.region;
    },
    /**
     * A key that should be unique in the context of the current annotation and current moment
     * based on the target of Anchor.
     * It allows distinguishing Anchors by their target (basically by area on the screen to which it was attached)
     * and groups Anchors with the same target.
     * Right now it is used to display only one comment per area on the screen.
     *
     * @return {string} A key which points to a unique Anchor's target.
     */
    get targetKey() {
      const parts = [self.regionId];
      if (isDefined(self.controlName)) {
        parts.push(self.controlName);
      }
      return parts.join("-");
    },
  }))
  .actions((self) => ({
    serialize() {
      const { id, ...result } = self.toJSON();
      return result;
    },
    setRegion(region) {
      self.regionId = region.cleanId;
    },
  }));
