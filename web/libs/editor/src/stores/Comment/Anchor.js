import { getParent, types } from "mobx-state-tree";
import { isDefined } from "../../utils/utilities";

export const Anchor = types
  .model({
    regionId: types.maybe(types.string),
    controlName: types.maybe(types.string),
  })
  .views((self) => ({
    get annotation() {
      return getParent(self).annotation;
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
      return self.result ?? self.region;
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
