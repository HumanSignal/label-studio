import { getParent, types } from "mobx-state-tree";

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
