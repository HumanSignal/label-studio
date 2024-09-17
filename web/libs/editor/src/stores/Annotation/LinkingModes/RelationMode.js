import { getParent, types } from "mobx-state-tree";

const RelationModeModel = types
  .model("RelationsMode", {})
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
    let firstRegion = null;
    return {
      start(region) {
        firstRegion = region;
      },
      stop() {
        firstRegion = null;
        self.regionStore.unhighlightAll();
      },
      addLinkedRegion(secondRegion) {
        self.relationStore.addRelation(firstRegion, secondRegion);
        self.stop();
      },
    };
  });

export const RelationMode = {
  key: "create_relation",
  model: RelationModeModel,
};
