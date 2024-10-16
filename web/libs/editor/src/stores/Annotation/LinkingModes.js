import { types } from "mobx-state-tree";
import Constants from "../../core/Constants";
import { CommentMode } from "./LinkingModes/CommentMode";
import { RelationMode } from "./LinkingModes/RelationMode";

export const CREATE_RELATION_MODE = RelationMode.key;
export const LINK_COMMENT_MODE = CommentMode.key;

const LinkingModeUnion = types.union(CommentMode.model, RelationMode.model);

export const LinkingModes = types
  .model("LinkingModes", {
    linkingModes: types.optional(types.map(LinkingModeUnion), () => ({
      [RelationMode.key]: RelationMode.model.create({}),
      [CommentMode.key]: CommentMode.model.create({}),
    })),
  })
  .volatile((self) => {
    return {
      linkingMode: false,
    };
  })
  .views((self) => ({
    get currentLinkingMode() {
      return self.linkingMode && self.linkingModes.has(self.linkingMode)
        ? self.linkingModes.get(self.linkingMode)
        : null;
    },
    get isLinkingMode() {
      return !!self.linkingMode;
    },
    // @deprecated
    get relationMode() {
      console.warn("`relationMode` is deprecated. Use `isLinkingMode` instead.");
      return self.isLinkingMode;
    },
  }))
  .actions((self) => {
    return {
      startLinkingMode(linkingModeName, obj) {
        if (self.isLinkingMode) {
          self.stopLinkingMode();
        }
        self.linkingMode = linkingModeName;
        if (!self.currentLinkingMode) {
          self.linkingMode = false;
          return;
        }
        self.currentLinkingMode.start(obj);

        document.body.style.cursor = Constants.CHOOSE_CURSOR;
      },

      stopLinkingMode() {
        document.body.style.cursor = Constants.DEFAULT_CURSOR;

        if (self.currentLinkingMode) {
          self.currentLinkingMode.stop();
        }

        self.linkingMode = false;
      },

      addLinkedRegion(region) {
        if (self.currentLinkingMode) {
          self.currentLinkingMode.addLinkedRegion?.(region);
        }
      },

      addLinkedResult(region) {
        if (self.currentLinkingMode) {
          self.currentLinkingMode.addLinkedResult?.(region);
        }
      },

      // @deprecated Use `startLinkingMode(CREATE_RELATION_MODE, obj)` instead
      startRelationMode(obj) {
        console.warn("`startRelationMode` is deprecated. Use `startLinkingMode(CREATE_RELATION_MODE, obj)` instead.");
        self.startLinkingMode(RelationMode.key, obj);
      },
      // @deprecated Use `stopLinkingMode` instead
      stopRelationMode() {
        console.warn("`stopRelationMode` is deprecated. Use `stopLinkingMode` instead.");
        self.stopLinkingMode();
      },
    };
  });
