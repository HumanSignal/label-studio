import { flow, getRoot, getSnapshot, types } from "mobx-state-tree";
import { DataStore, DataStoreItem } from "../../mixins/DataStore";
import { getAnnotationSnapshot } from "../../sdk/lsf-utils";
import { isDefined } from "../../utils/utils";
import { Assignee } from "../Assignee";
import { DynamicModel, registerModel } from "../DynamicModel";
import { CustomJSON } from "../types";
import { FF_DEV_2536, FF_LOPS_E_3, isFF } from "../../utils/feature-flags";

const SIMILARITY_UPPER_LIMIT_PRECISION = 1000;
const fileAttributes = types.model({
  certainty: types.optional(types.maybeNull(types.number), 0),
  distance: types.optional(types.maybeNull(types.number), 0),
  id: types.optional(types.maybeNull(types.string), ""),
});

const exportedModel = types.model({
  project_id: types.optional(types.maybeNull(types.number), null),
  created_at: types.optional(types.maybeNull(types.string), ""),
});

export const create = (columns) => {
  const TaskModelBase = DynamicModel("TaskModelBase", columns, {
    ...(isFF(FF_DEV_2536) ? { comment_authors: types.optional(types.array(Assignee), []) } : {}),
    annotators: types.optional(types.array(Assignee), []),
    reviewers: types.optional(types.array(Assignee), []),
    annotations: types.optional(types.array(CustomJSON), []),
    predictions: types.optional(types.array(CustomJSON), []),
    drafts: types.frozen(),
    source: types.maybeNull(types.string),
    was_cancelled: false,
    assigned_task: false,
    queue: types.optional(types.maybeNull(types.string), null),
    // annotation to select on rejected queue
    default_selected_annotation: types.maybeNull(types.number),
    allow_postpone: types.maybeNull(types.boolean),
    unique_lock_id: types.maybeNull(types.string),
    updated_by: types.optional(types.array(Assignee), []),
    ...(isFF(FF_LOPS_E_3)
      ? {
          _additional: types.optional(fileAttributes, {}),
          candidate_task_id: types.optional(types.string, ""),
          project: types.union(types.number, types.optional(types.array(exportedModel), [])), //number for Projects, array of exportedModel for Datasets
        }
      : {}),
  })
    .views((self) => ({
      get lastAnnotation() {
        return self.annotations[this.annotations.length - 1];
      },
    }))
    .actions((self) => ({
      mergeAnnotations(annotations) {
        // skip drafts, they'll be added later
        self.annotations = annotations
          .filter((a) => a.pk)
          .map((c) => {
            const existingAnnotation = self.annotations.find((ec) => ec.id === Number(c.pk));

            if (existingAnnotation) {
              return existingAnnotation;
            }
            return {
              id: c.id,
              pk: c.pk,
              draftId: c.draftId,
              result: c.serializeAnnotation(),
              leadTime: c.leadTime,
              userGenerate: !!c.userGenerate,
              sentUserGenerate: !!c.sentUserGenerate,
            };
          });
      },

      updateAnnotation(annotation) {
        const existingAnnotation = self.annotations.find((c) => {
          return c.id === Number(annotation.pk) || c.pk === annotation.pk;
        });

        if (existingAnnotation) {
          Object.assign(existingAnnotation, getAnnotationSnapshot(annotation));
        } else {
          self.annotations.push(getAnnotationSnapshot(annotation));
        }
      },

      deleteAnnotation(annotation) {
        const index = self.annotations.findIndex((c) => {
          return c.id === Number(annotation.pk) || c.pk === annotation.pk;
        });

        if (index >= 0) self.annotations.splice(index, 1);
      },

      deleteDraft(id) {
        if (!self.drafts) return;
        const index = self.drafts.findIndex((d) => d.id === id);

        if (index >= 0) self.drafts.splice(index, 1);
      },

      loadAnnotations: flow(function* () {
        const annotations = yield Promise.all([getRoot(self).apiCall("annotations", { taskID: self.id })]);

        self.annotations = annotations[0];
      }),
    }));

  const TaskModel = types.compose("TaskModel", TaskModelBase, DataStoreItem);
  const AssociatedType = types.model("AssociatedModelBase", {
    id: types.identifierNumber,
    title: types.string,
    workspace: types.optional(types.array(types.string), []),
  });

  registerModel("TaskModel", TaskModel);

  return DataStore("TasksStore", {
    apiMethod: "tasks",
    listItemType: TaskModel,
    associatedItemType: AssociatedType,
    properties: {
      totalAnnotations: 0,
      totalPredictions: 0,
    },
  })
    .actions((self) => ({
      loadTaskHistory: flow(function* (props) {
        let taskHistory = yield self.root.apiCall("taskHistory", props);

        taskHistory = taskHistory.map((task) => {
          return {
            taskId: task.taskId,
            annotationId: task.annotationId?.toString(),
          };
        });

        return taskHistory;
      }),
      loadTask: flow(function* (taskID, { select = true } = {}) {
        if (!isDefined(taskID)) {
          console.warn("Task ID must be provided");
          return;
        }

        self.setLoading(taskID);

        const taskData = yield self.root.apiCall("task", { taskID });

        const task = self.applyTaskSnapshot(taskData, taskID);

        if (select !== false) self.setSelected(task);

        self.finishLoading(taskID);

        return task;
      }),

      loadNextTask: flow(function* ({ select = true } = {}) {
        const taskData = yield self.root.invokeAction("next_task", {
          reload: false,
        });

        if (taskData?.$meta?.status === 404) {
          getRoot(self).SDK.invoke("labelStreamFinished");
          return null;
        }

        const labelStreamModeChanged =
          self.selected && self.selected.assigned_task !== taskData.assigned_task && taskData.assigned_task === false;

        const task = self.applyTaskSnapshot(taskData);

        if (select !== false) self.setSelected(task);

        if (labelStreamModeChanged) {
          getRoot(self).SDK.invoke("assignedStreamFinished");
        }

        return task;
      }),

      applyTaskSnapshot(taskData, taskID) {
        let task;

        if (taskData && !taskData?.error) {
          const id = taskID ?? taskData.id;
          const snapshot = self.mergeSnapshot(id, taskData);

          task = self.updateItem(id, {
            ...snapshot,
            source: JSON.stringify(taskData),
          });
        }

        return task;
      },

      mergeSnapshot(taskID, taskData) {
        const task = self.list.find(({ id }) => id === taskID);
        const snapshot = task ? { ...getSnapshot(task) } : {};

        Object.assign(snapshot, taskData);

        if (snapshot.predictions) {
          snapshot.predictions.forEach((p) => {
            p.created_by = (p.model_version?.trim() ?? "") || p.created_by;
          });
        }

        return snapshot;
      },

      unsetTask() {
        self.unset();
      },

      postProcessData(data) {
        const { total_annotations, total_predictions, similarity_score_upper_limit } = data;

        if (total_annotations !== null) self.totalAnnotations = total_annotations;
        if (total_predictions !== null) self.totalPredictions = total_predictions;
        if (!isNaN(similarity_score_upper_limit))
          self.similarityUpperLimit =
            Math.ceil(similarity_score_upper_limit * SIMILARITY_UPPER_LIMIT_PRECISION) /
            SIMILARITY_UPPER_LIMIT_PRECISION;
      },
    }))
    .preProcessSnapshot((snapshot) => {
      const { total_annotations, total_predictions, similarity_score_upper_limit, ...sn } = snapshot;

      return {
        ...sn,
        reviewers: (sn.reviewers ?? []).map((r) => ({
          id: r,
          annotated: false,
          review: null,
        })),
        totalAnnotations: total_annotations,
        totalPredictions: total_predictions,
        similarityUpperLimit: similarity_score_upper_limit,
      };
    });
};
