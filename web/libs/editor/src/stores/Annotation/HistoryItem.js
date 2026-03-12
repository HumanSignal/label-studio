import { types } from "mobx-state-tree";
import { guidGenerator } from "../../utils/unique";
import { Annotation } from "./Annotation";

// const HistoryActionTypes = types.enumeration([
//   'prediction',
//   'imported',
//   'submitted',
//   'updated',
//   'skipped',
//   'accepted',
//   'rejected',
//   'fixed_and_accepted',
//   'deleted_review',
//   'propagated_annotation',
// ])

export const HistoryItem = types
  .compose(
    "HistoryItem",
    Annotation,
    types.model({
      /**
       * Optional comment
       */
      comment: types.optional(types.maybeNull(types.string), null),

      /**
       * Action associated with the history item
       */
      actionType: types.optional(types.maybeNull(types.string), null),

      /**
       * True when this item was returned as a stub (no result); frontend hydrates on click (FIT-720).
       */
      is_stub: types.optional(types.boolean, false),
    }),
  )
  .preProcessSnapshot((snapshot) => {
    const numericPk = snapshot.pk && !Number.isNaN(Number(snapshot.pk)) ? snapshot.pk : null;
    return {
      ...snapshot,
      pk: numericPk ?? guidGenerator(),
      user: snapshot.created_by,
      createdDate: snapshot.created_at,
      actionType: snapshot.action ?? snapshot.action_type ?? snapshot.actionType,
      is_stub: snapshot.is_stub ?? false,
      readonly: true,
      editable: false,
    };
  });
