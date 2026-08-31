import type { APIAnnotation, APIPrediction, APITask, LSFAnnotation, LSFTaskData } from "../types/Task";

/** Same string as `AnnotationDraftSerializer.get_created_username` (snake or camel user fields). */
export function formatDraftCreatedUsernameFromUser(user: {
  id: number;
  first_name?: string | null;
  last_name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
}): string {
  let name = (user.first_name ?? user.firstName ?? "").trim();
  const lastName = (user.last_name ?? user.lastName ?? "").trim();
  if (lastName.length) {
    name = name ? `${name} ${lastName}` : lastName;
  }
  const email = (user.email ?? "").trim();
  return `${name}${name ? " " : ""}${email}, ${user.id}`;
}

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
  const createdDate = annotation.draft_created_at || annotation.created_at;

  // For stub annotations (FIT-720 lazy loading), use empty result to prevent
  // LSF from trying to deserialize undefined results
  const isStub = (annotation as any).is_stub === true;

  return {
    ...annotation,
    id: undefined,
    pk: String(annotation.id),
    createdAgo: annotation.created_ago,
    createdBy: annotation.created_username,
    createdDate,
    leadTime: annotation.lead_time ?? 0,
    skipped: annotation.was_cancelled ?? false,
    // Use empty array for stubs to prevent JSON parse errors
    result: isStub ? [] : annotation.result,
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
