/**
 * Label Studio REST paths for draft autosave (parity with datamanager lsf-sdk onSubmitDraft).
 * Annotation id comes from the URL on create — not from the JSON body.
 */

/** Shell / host tab id for a persisted server annotation (numeric string). */
export function parseShellAnnotationPk(shellAnnotationId: string | null | undefined): number | undefined {
  if (!shellAnnotationId || !/^\d+$/.test(shellAnnotationId)) return undefined;
  return Number(shellAnnotationId);
}

/**
 * POST URL for creating a draft: task-level when no persisted annotation, else annotation-scoped.
 */
export function resolveDraftCreateUrl(taskId: number, shellAnnotationId: string): string {
  const annotationPk = parseShellAnnotationPk(shellAnnotationId);
  if (annotationPk != null) {
    return `/api/tasks/${taskId}/annotations/${annotationPk}/drafts`;
  }
  return `/api/tasks/${taskId}/drafts`;
}

/** PATCH URL for an existing server draft row. */
export function resolveDraftUpdateUrl(draftId: number): string {
  return `/api/drafts/${draftId}/`;
}
