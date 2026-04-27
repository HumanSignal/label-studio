import { flow, getRoot, getSnapshot, types, isAlive } from "mobx-state-tree";
import { DataStore, DataStoreItem } from "../../mixins/DataStore";
import { getAnnotationSnapshot } from "../../sdk/lsf-utils";
import { isDefined } from "../../utils/utils";
import { Assignee } from "../Assignee";
import { DynamicModel, registerModel } from "../DynamicModel";
import { CustomJSON } from "../types";
import { FF_DEV_2536, FF_LOPS_E_3, isFF } from "../../utils/feature-flags";
import { isActive, FF_FIT_720_LAZY_LOAD_ANNOTATIONS } from "@humansignal/core/lib/utils/feature-flags";

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
    overlap_reached: types.maybeNull(types.boolean),
    overlap_reached_message: types.maybeNull(types.string),
    assigned_task: false,
    queue: types.optional(types.maybeNull(types.string), null),
    // annotation to select on rejected queue
    default_selected_annotation: types.maybeNull(types.number),
    allow_postpone: types.maybeNull(types.boolean),
    allow_skip: types.optional(types.maybeNull(types.boolean), true),
    unique_lock_id: types.maybeNull(types.string),
    updated_by: types.optional(types.array(Assignee), []),
    annotators_count: types.optional(types.maybeNull(types.number), 0),
    reviewers_count: types.optional(types.maybeNull(types.number), 0),
    comment_authors_count: types.optional(types.maybeNull(types.number), 0),
    ...(isFF(FF_LOPS_E_3)
      ? {
          _additional: types.optional(fileAttributes, {}),
          candidate_task_id: types.optional(types.string, ""),
          project: types.union(types.number, types.optional(types.array(exportedModel), [])), //number for Projects, array of exportedModel for Datasets
        }
      : {}),
  }).actions((self) => ({
    mergeAnnotations(annotations) {
      // skip drafts, they'll be added later
      self.annotations = annotations
        .filter((a) => a.pk)
        .map((c) => {
          const existingAnnotation = self.annotations.find((ec) => ec.id === Number(c.pk));

          if (existingAnnotation) {
            // FIT-1660: Task reload can replace merged rows with API stubs while LSF still holds
            // fully hydrated in-memory annotations — prefer live serialized results over stale stubs.
            if (existingAnnotation.is_stub === true && typeof c.serializeAnnotation === "function") {
              try {
                const live = c.serializeAnnotation();
                if (Array.isArray(live) && live.length > 0) {
                  // FIT-1680: Keep userGenerate/sentUserGenerate from the freshly-fetched server
                  // snapshot. The in-memory LSF annotation still carries userGenerate=true and
                  // sentUserGenerate=true right after a Quick View submit (LSF never resets the
                  // local creation flag), and copying those here pins Controls.tsx into the
                  // "Submit" branch instead of the disabled "Update" button.
                  return {
                    ...existingAnnotation,
                    id: existingAnnotation.id,
                    pk: c.pk,
                    draftId: c.draftId,
                    result: live,
                    leadTime: c.leadTime,
                    is_stub: false,
                  };
                }
              } catch {
                // ignore serialization errors from detached nodes
              }
            }
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

      if (!isAlive(self)) return;

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
        const taskHistory = yield self.root.apiCall("taskHistory", props);

        if (!isAlive(self)) return [];

        if (!Array.isArray(taskHistory)) {
          return [];
        }

        return taskHistory.map((task) => ({
          taskId: task.taskId,
          annotationId: task.annotationId?.toString(),
        }));
      }),
      loadTask: flow(function* (taskID, { select = true } = {}) {
        if (!isDefined(taskID)) {
          console.warn("Task ID must be provided");
          return;
        }

        self.setLoading(taskID);

        // Pass label stream mode context to the backend API call
        const isLabelStream = getRoot(self).SDK?.mode === "labelstream";
        const taskParams = { taskID };
        if (isLabelStream) {
          taskParams.interaction = "labelstream";
        }
        // FIT-720: Lazy load annotations - use stubs for both label stream and quick view modes
        // Hydration happens in lsf-sdk.js when the annotation is selected
        if (isActive(FF_FIT_720_LAZY_LOAD_ANNOTATIONS)) {
          taskParams.annotations_stub = true;
        }
        // Django-style: GET /api/tasks/:id/?annotations_ordering=-id
        taskParams.annotations_ordering = "-id";

        const taskData = yield self.root.apiCall("task", taskParams);

        if (!isAlive(self)) return null;

        const taskStatusCode =
          taskData?.status ??
          taskData?.$meta?.status ??
          taskData?.status_code ??
          taskData?.response?.status ??
          taskData?.response?.status_code;

        if (taskStatusCode === 404) {
          self.finishLoading(taskID);
          getRoot(self).SDK.invoke("crash", {
            error: `Task ID: ${taskID} does not exist or is no longer available`,
            redirect: true,
          });
          return null;
        }

        if (!taskData || taskData.error) {
          self.finishLoading(taskID);
          return null;
        }
        const task = self.applyTaskSnapshot(taskData, taskID);

        if (select !== false) self.setSelected(task);

        self.finishLoading(taskID);

        return task;
      }),

      loadNextTask: flow(function* ({ select = true } = {}) {
        const taskData = yield self.root.invokeAction("next_task", {
          reload: false,
        });

        if (!isAlive(self)) return null;

        if (taskData?.$meta?.status === 404) {
          getRoot(self).SDK.invoke("labelStreamFinished");
          return null;
        }

        const responseStatus = taskData?.$meta?.status;

        if (!taskData || taskData.error || (responseStatus && responseStatus >= 400)) {
          return null;
        }

        const labelStreamModeChanged =
          self.selected && self.selected.assigned_task !== taskData.assigned_task && taskData.assigned_task === false;

        const task = self.applyTaskSnapshot(taskData);

        if (select !== false) self.setSelected(task);

        if (labelStreamModeChanged) {
          getRoot(self).SDK.invoke("assignedStreamFinished");
        }

        const isLabelStream = getRoot(self).SDK?.mode === "labelstream";
        if (isLabelStream) {
          const selectedAnnotationID = getRoot(self).annotationStore.selected?.id;
          if (task && selectedAnnotationID) {
            console.log(
              `[LABEL STREAM] ${task.queue}, task ${task.id}, project ${getRoot(self)?.SDK?.project?.id}, user ${getRoot(self).LSF.lsf.user.id}${selectedAnnotationID ? `, annotation ${selectedAnnotationID}` : ""}`,
            );
          }
        }

        return task;
      }),

      /**
       * Load a single annotation by ID (for lazy loading - FIT-720)
       * @param {number} annotationID - The annotation ID to fetch
       * @returns {Promise<Object>} The full annotation data
       */
      loadAnnotation: flow(function* (annotationID) {
        const annotationData = yield self.root.apiCall("fetchAnnotation", { annotationID });

        if (!isAlive(self)) return null;

        return annotationData;
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
