/** Minimal draft row shape returned by LS draft create/update APIs. */
export interface TaskDraftRecord {
  id: number;
  annotation?: number | null;
  result?: unknown[];
  created_at?: string | null;
  created_by?: { id: number };
  lead_time?: number | null;
}

export type MergeDraftIntoTaskOptions = {
  /** Explicit task-level orphan draft rows to drop after a link/autosave (never all orphans for an owner). */
  pruneOrphanDraftIds?: number[];
};

/**
 * After autosave, keep `task.drafts` and matching `annotations[].draft_id` aligned so
 * shell tabs and `buildCustomInterfaceAnnotationPayload` see the linked draft.
 */
export function mergeDraftIntoTaskSnapshot<T extends Record<string, unknown>>(
  taskData: T,
  draft: TaskDraftRecord | null | undefined,
  options?: MergeDraftIntoTaskOptions,
): T {
  if (!draft) return taskData;

  const existingDrafts = Array.isArray(taskData.drafts) ? (taskData.drafts as TaskDraftRecord[]) : [];
  const prior = existingDrafts.find((item) => item.id === draft.id);
  const mergedDraft = prior ? { ...prior, ...draft } : draft;
  const annotationPk = draft.annotation != null ? Number(draft.annotation) : null;
  const pruneOrphanDraftIds = new Set(options?.pruneOrphanDraftIds ?? []);
  const nextDrafts = [
    mergedDraft,
    ...existingDrafts.filter((item) => {
      if (item.id === draft.id) return false;
      if (pruneOrphanDraftIds.has(item.id)) return false;
      return true;
    }),
  ];
  const annotations = Array.isArray(taskData.annotations)
    ? (taskData.annotations as Array<{ id?: number | string; draft_id?: number | null }>).map((annotation) =>
        annotationPk != null && Number(annotation.id) === annotationPk
          ? { ...annotation, draft_id: draft.id }
          : annotation,
      )
    : taskData.annotations;

  return {
    ...taskData,
    drafts: nextDrafts,
    annotations,
  };
}
