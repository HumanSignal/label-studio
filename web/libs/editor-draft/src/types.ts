/** Which result snapshot the canvas is currently showing (FIT-1685 / draftSelected parity). */
export type DraftViewMode = "draft" | "submitted" | "history" | "prediction";

export interface ShouldAutosaveInput {
  hasUnsavedEdits: boolean;
  viewMode: DraftViewMode;
  editable: boolean;
  readOnly: boolean;
  submissionStarted: boolean;
  /** Screen/task hydrate in progress — block autosave until custom screen settles. */
  suppressUserEdits?: boolean;
}

export interface ShouldPersistBeforeLeaveInput {
  hasUnsavedEdits: boolean;
  viewMode: DraftViewMode;
  editable: boolean;
  submissionStarted: boolean;
  /** Whether a draft version exists on the annotation (versions.draft). */
  hasPersistedDraftVersion: boolean;
  /** ISO timestamp of last successful draft save, if any. */
  draftSavedAt: string | null;
  /** ISO timestamp of last user edit (history.lastAdditionTime equivalent). */
  lastEditAt: string | null;
}

export interface ReviewHasChangesInput {
  canUndo: boolean;
  hasUnsavedEdits: boolean;
}
