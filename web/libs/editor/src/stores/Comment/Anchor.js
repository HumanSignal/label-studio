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
      return self.annotation.regionStore.regions.find((r) => r.cleanId === self.regionId);
    },
    get overlayNode() {
      return self.region;
    },
    get uniqueKey() {
      const parts = [self.regionId];
      if (isDefined(self.controlName)) {
        parts.push(self.controlName);
      }
      return parts.join("-");
    }
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
