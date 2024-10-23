import { applySnapshot, flow, getEnv, getRoot, types } from "mobx-state-tree";
import { createRef } from "react";
import Types from "../../core/Types";

import Utils from "../../utils";
import { FF_PER_FIELD_COMMENTS } from "../../utils/feature-flags";
import { camelizeKeys, snakeizeKeys } from "../../utils/utilities";
import { UserExtended } from "../UserStore";

import { Anchor } from "./Anchor";

/**
 * A reduced version of the Comment model.
 * It is used only for creating a new comment, storing values in the similar structure
 * and to handle some actions that should be present in both cases (creating and editing).
 * So that some actions have to be overridden in the Comment model in case we want them to work properly with the backend.
 */
export const CommentBase = types
  .model("CommentBase", {
    text: types.string,
    ...(isFF(FF_PER_FIELD_COMMENTS)
      ? {
          regionRef: types.optional(types.maybeNull(Anchor), null),
          classifications: types.optional(types.frozen({}), null),
        }
      : {}),
  })
  .views((self) => ({
    get commentsStore() {
      try {
        return Types.getParentOfTypeString(self, "CommentStore");
      } catch (e) {
        return null;
      }
    },
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
      const commentsStore = self.commentsStore;
      return commentsStore?.annotation;
    },
    get isHighlighted() {
      const highlightedRegionKey = self.commentsStore?.highlightedComment?.regionRef?.targetKey;
      const currentRegionKey = self.regionRef?.targetKey;
      return !!highlightedRegionKey && highlightedRegionKey === currentRegionKey;
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
      setClassifications(classifications) {
        self.classifications = classifications;
      },
      setResultLink(result) {
        self.regionRef = {
          regionId: result.area.cleanId,
          controlName: result.from_name.name,
        };
      },
      setHighlighted(value = true) {
        const commentsStore = self.commentsStore;
        if (commentsStore) {
          if (value) {
            commentsStore.setHighlightedComment(self);
          } else if (self.isHighlighted) {
            commentsStore.setHighlightedComment(undefined);
          }
        }
      },
    };
  });

/**
 * The main Comment model.
 * Should be fully functional and used for all cases except creating a new comment.
 */
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
  .volatile((self) => {
    return {
      _commentRef: createRef(),
    };
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

    const updateComment = flow(function* (comment, classifications = undefined) {
      if (self.isPersisted && !self.isDeleted) {
        const payload = {
          id: self.id,
          text: comment,
        };

        if (classifications !== undefined) {
          payload.classifications = classifications;
        }

        yield self.sdk.invoke("comments:update", payload);
      }

      self.setEditMode(false);
    });

    const update = flow(function* (props) {
      if (self.isPersisted && !self.isDeleted && !self.isUpdating) {
        self.isUpdating = true;
        const [result] = yield self.sdk.invoke("comments:update", {
          id: self.id,
          ...snakeizeKeys(props),
        });
        if (result.error) {
          self.isUpdating = false;
          return;
        }
        const data = camelizeKeys(result);
        applySnapshot(self, data);
        self.isUpdating = false;
      }
    });

    function setRegionLink(region) {
      const regionRef = {
        regionId: region.cleanId,
      };
      self.update({ regionRef });
    }

    function setResultLink(result) {
      const regionRef = {
        regionId: result.area.cleanId,
        controlName: result.from_name.name,
      };
      self.update({ regionRef });
    }

    function unsetLink() {
      const regionRef = null;
      self.update({ regionRef });
    }

    const deleteComment = flow(function* () {
      if (self.isPersisted && !self.isDeleted && self.isConfirmDelete) {
        yield self.sdk.invoke("comments:delete", {
          id: self.id,
        });
      }

      self.setDeleted(true);
      self.setConfirmMode(false);
    });

    const scrollIntoView = () => {
      const commentEl = self._commentRef.current;
      if (!commentEl) return;

      if (commentEl.scrollIntoViewIfNeeded) {
        commentEl.scrollIntoViewIfNeeded();
      } else {
        commentEl.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    };

    return {
      toggleResolve,
      setEditMode,
      setDeleted,
      setConfirmMode,
      updateComment,
      update,
      deleteComment,
      setRegionLink,
      setResultLink,
      unsetLink,
      scrollIntoView,
    };
  });
