import { applySnapshot, flow, getEnv, getParent, getRoot, types } from "mobx-state-tree";
import Utils from "../../utils";
import { FF_PER_FIELD_COMMENTS } from "../../utils/feature-flags";
import { camelizeKeys, snakeizeKeys } from "../../utils/utilities";
import { UserExtended } from "../UserStore";
import { Anchor } from "./Anchor";

export const CommentBase = types
  .model("CommentBase", {
    text: types.string,
    ...(isFF(FF_PER_FIELD_COMMENTS) ? { regionRef: types.optional(types.maybeNull(Anchor), null) } : {}),
  })
  .views((self) => ({
    get annotation() {
      /*
       * The `getEnv` is used in case when we use "CommentBase" separately
       * to provide the same functionality of comment (`setRegionLink`)
       * during creating new comment.
       * In this case, the comment is stored in a volatile field "currentComment"
       * of 'CommentStore' and cannot access the MST tree by itself.
       */
      const env = getEnv(self);
      if (env?.annotationStore) {
        return env.annotationStore.selected;
      }
      // otherwise, we use the standard way to get the annotation
      const commentsStore = getParent(self, 2);
      return commentsStore.annotation;
    },
  }))
  .actions((self) => {
    return {
      setText(text) {
        self.text = text;
      },
      unsetLink() {
        self.regionRef = null;
      },
      setRegionLink(region) {
        self.regionRef = {
          regionId: region.cleanId,
        };
      },
    };
  });

export const Comment = CommentBase.named("Comment")
  .props({
    id: types.identifierNumber,
    text: types.string,
    createdAt: types.optional(types.string, Utils.UDate.currentISODate()),
    updatedAt: types.optional(types.string, Utils.UDate.currentISODate()),
    resolvedAt: types.optional(types.maybeNull(types.string), null),
    createdBy: types.optional(types.maybeNull(types.safeReference(UserExtended)), null),
    isResolved: false,
    isEditMode: types.optional(types.boolean, false),
    isDeleted: types.optional(types.boolean, false),
    isConfirmDelete: types.optional(types.boolean, false),
    isUpdating: types.optional(types.boolean, false),
  })
  .preProcessSnapshot((sn) => {
    return camelizeKeys(sn ?? {});
  })
  .views((self) => ({
    get sdk() {
      return getEnv(self).events;
    },
    get isPersisted() {
      return self.id > 0 && !self.isUpdating;
    },
    get canResolveAny() {
      const p = getRoot(self);
      return p.interfaces.includes("comments:resolve-any");
    },
  }))
  .actions((self) => {
    const toggleResolve = flow(function* () {
      if (!self.isPersisted || self.isDeleted) return;

      self.isResolved = !self.isResolved;

      try {
        yield self.sdk.invoke("comments:update", {
          id: self.id,
          is_resolved: self.isResolved,
        });
      } catch (err) {
        self.isResolved = !self.isResolved;
        throw err;
      }
    });

    function setEditMode(newMode) {
      self.isEditMode = newMode;
    }

    function setDeleted(newMode) {
      self.isDeleted = newMode;
    }

    function setConfirmMode(newMode) {
      self.isConfirmDelete = newMode;
    }

    function setRegionLink(region) {}

    const updateComment = flow(function* (comment) {
      if (self.isPersisted && !self.isDeleted) {
        yield self.sdk.invoke("comments:update", {
          id: self.id,
          text: comment,
        });
      }

      self.setEditMode(false);
    });

    const deleteComment = flow(function* () {
      if (self.isPersisted && !self.isDeleted && self.isConfirmDelete) {
        yield self.sdk.invoke("comments:delete", {
          id: self.id,
        });
      }

      self.setDeleted(true);
      self.setConfirmMode(false);
    });

    return {
      toggleResolve,
      setEditMode,
      setDeleted,
      setConfirmMode,
      updateComment,
      deleteComment,
      setRegionLink,
    };
  });
