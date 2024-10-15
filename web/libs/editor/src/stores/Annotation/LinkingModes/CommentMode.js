import { getParent, types } from "mobx-state-tree";

const CommentModeModel = types
  .model("CommentMode", {})
  .volatile(() => ({
    comment: null,
  }))
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
    return {
      start(_comment) {
        self.comment = _comment;
      },
      stop() {
        self.comment = null;
        self.regionStore.unhighlightAll();
      },
      addLinkedRegion(region) {
        self.comment.setRegionLink(region);
        self.stop();
      },
      addLinkedResult(result) {
        self.comment.setResultLink(result);
        self.stop();
      },
    };
  });

export const CommentMode = {
  key: "link_to_comment",
  model: CommentModeModel,
};
