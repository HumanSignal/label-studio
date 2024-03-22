import type { APIAnnotation, APIPrediction, APITask, LSFAnnotation, LSFTaskData } from "../types/Task";
import { FF_LSDV_5035, isFF } from "../utils/feature-flags";

/**
 * Converts the task from the server format to the
 * format supported by the LS frontend
 * @param {import("../stores/Tasks").TaskModel} task
 * @private
 */
export const taskToLSFormat = (task: APITask): LSFTaskData | void => {
  if (!task) return;

  const result: LSFTaskData = {
    ...task,
    annotations: [],
    predictions: [],
    createdAt: task.created_at,
    // isLabeled: task.is_labeled, // @todo why?
  };

  if (task.annotations) {
    result.annotations = task.annotations.map(annotationToLSF);
  }

  if (task.predictions) {
    result.predictions = task.predictions.map(predictionToLSF);
  }

  return result;
};

export const annotationToLSF = (annotation: APIAnnotation) => {
  const createdDate = isFF(FF_LSDV_5035) ? annotation.draft_created_at || annotation.created_at : annotation.created_at;

  return {
    ...annotation,
    id: undefined,
    pk: String(annotation.id),
    createdAgo: annotation.created_ago,
    createdBy: annotation.created_username,
    createdDate,
    leadTime: annotation.lead_time ?? 0,
    skipped: annotation.was_cancelled ?? false,
  };
};

export const predictionToLSF = (prediction: APIPrediction) => {
  return {
    ...prediction,
    id: undefined,
    pk: String(prediction.id),
    createdAgo: prediction.created_ago,
    createdBy: prediction.model_version?.trim() ?? "",
    createdDate: prediction.created_at,
  };
};

export const annotationToServer = (annotation: LSFAnnotation): APIAnnotation => {
  return {
    ...annotation,
    id: Number(annotation.pk),
    created_ago: annotation.createdAgo,
    created_username: annotation.createdBy,
    created_at: new Date().toISOString(),
    lead_time: annotation.leadTime,
  };
};

export const getAnnotationSnapshot = (c: LSFAnnotation) => ({
  id: c.id,
  pk: c.pk,
  result: c.serializeAnnotation(),
  leadTime: c.leadTime,
  userGenerate: !!c.userGenerate,
  sentUserGenerate: !!c.sentUserGenerate,
});
