/**
 * Queue debug lines for label/review streams.
 * Visible in the browser devtools console when advancing tasks in stream mode.
 */

export function logLabelStreamDebug(params: {
  queue?: string | null;
  taskId: number | string;
  projectId?: number | string | null;
  userId?: number | string | null;
  annotationId?: string | number | null;
}): void {
  const { queue, taskId, projectId, userId, annotationId } = params;
  const annotationSuffix =
    annotationId != null && annotationId !== "" && annotationId !== "new-annotation"
      ? `, annotation ${annotationId}`
      : "";
  console.log(
    `[LABEL STREAM] ${queue ?? "unknown"}, task ${taskId}, project ${projectId ?? "unknown"}, user ${userId ?? "unknown"}${annotationSuffix}`,
  );
}

export function logReviewStreamDebug(params: {
  queue?: string | null;
  taskId?: number | string | null;
  projectId?: number | string | null;
  userId?: number | string | null;
  annotationId?: string | number | null;
}): void {
  const { queue, taskId, projectId, userId, annotationId } = params;
  const queueInfo = queue ?? "unknown";
  console.log(
    `[REVIEW STREAM] ${queueInfo}, task ${taskId ?? "unknown"}, project ${projectId ?? "unknown"}, user ${userId ?? "unknown"}, annotation ${annotationId ?? "unknown"}`,
  );
}
