import { getParent, types } from "mobx-state-tree";

const CommentModeModel = types
  .model("CommentMode", {})
  .views((self) => {
    return {
      get annotation() {
        return getParent(self, 2);
      },
      get regionStore() {
        return self.annotation.regionStore;
      },
    };
  })
  .actions((self) => {
    let comment = null;
    return {
      start(_comment) {
        comment = _comment;
      },
      stop() {
        comment = null;
        self.regionStore.unhighlightAll();
      },
      addLinkedRegion(region) {
        comment.setRegionLink(region);
        self.stop();
      },
    };
  });

export const CommentMode = {
  key: "link_to_comment",
  model: CommentModeModel,
};
