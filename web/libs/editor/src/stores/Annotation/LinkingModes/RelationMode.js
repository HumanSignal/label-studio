import { getParent, types } from "mobx-state-tree";

const RelationModeModel = types
  .model("RelationsMode", {})
  .volatile(() => ({
    region: null,
  }))
  .views((self) => {
    return {
      get annotation() {
        return getParent(self, 2);
      },
      get regionStore() {
        return self.annotation.regionStore;
      },
      get relationStore() {
        return self.annotation.relationStore;
      },
    };
  })
  .actions((self) => {
    return {
      start(region) {
        self.region = region;
      },
      stop() {
        self.region = null;
        self.regionStore.unhighlightAll();
      },
      addLinkedRegion(secondRegion) {
        self.relationStore.addRelation(self.region, secondRegion);
        self.stop();
      },
    };
  });

export const RelationMode = {
  key: "create_relation",
  model: RelationModeModel,
};
