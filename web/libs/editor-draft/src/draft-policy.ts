import type {
  DraftViewMode,
  ReviewHasChangesInput,
  ShouldAutosaveInput,
  ShouldFlushDraftBeforeHistorySwitchInput,
  ShouldPersistBeforeLeaveInput,
} from "./types";

/**
 * Whether debounced autosave should run (parity with Annotation.saveDraft guards).
 */
export function shouldAutosave(input: ShouldAutosaveInput): boolean {
  if (input.submissionStarted) return false;
  if (input.suppressUserEdits) return false;
  if (!input.editable) return false;
  if (input.readOnly) return false;
  if (!input.hasUnsavedEdits) return false;
  if (input.viewMode !== "draft") return false;
  return true;
}

/**
 * Whether navigation / leave handlers should persist draft (parity with needsDraftSave).
 */
export function shouldPersistBeforeLeave(input: ShouldPersistBeforeLeaveInput): boolean {
  if (input.submissionStarted) return false;
  if (!input.editable) return false;
  if (input.hasPersistedDraftVersion && input.viewMode !== "draft") return false;
  if (!input.hasUnsavedEdits) return false;
  if (!input.draftSavedAt) return true;
  if (!input.lastEditAt) return true;
  return new Date(input.lastEditAt) > new Date(input.draftSavedAt);
}

/** Review Fix+Accept — never treat persisted draftId alone as "has changes". */
export function reviewHasChanges(input: ReviewHasChangesInput): boolean {
  return input.canUndo || input.hasUnsavedEdits;
}

/** Flush dirty work when leaving an annotation tab (ignores hydrate suppress). */
export function shouldFlushDraftOnAnnotationSwitch(
  input: Pick<ShouldAutosaveInput, "hasUnsavedEdits" | "viewMode" | "editable" | "readOnly" | "submissionStarted">,
): boolean {
  if (input.submissionStarted) return false;
  if (!input.editable) return false;
  if (input.readOnly) return false;
  if (!input.hasUnsavedEdits) return false;
  if (input.viewMode !== "draft") return false;
  return true;
}

/**
 * Whether to persist draft before switching history rows (classic saveDraftImmediately on history click).
 * When leaving live canvas (draft or submitted-with-edits) for a history preview — not history-to-history hops.
 */
export function shouldFlushDraftBeforeHistorySwitch(input: ShouldFlushDraftBeforeHistorySwitchInput): boolean {
  if (!input.hasUnsavedEdits) return false;
  if (input.selectedHistoryId !== null) return false;
  if (input.viewMode === "history") return false;
  return input.viewMode === "draft" || input.viewMode === "submitted";
}

export function isViewingDraft(viewMode: DraftViewMode): boolean {
  return viewMode === "draft";
}

/** Map classic Annotation draftSelected / versions.draft to shell viewMode. */
export function draftViewModeFromClassic(hasPersistedDraftVersion: boolean, draftSelected: boolean): DraftViewMode {
  return hasPersistedDraftVersion && !draftSelected ? "submitted" : "draft";
}

/** saveDraft() guards without requiring hasUnsavedEdits (autosave fires on every area snapshot). */
export function canWriteDraftSnapshot(
  input: Pick<ShouldAutosaveInput, "submissionStarted" | "editable" | "readOnly" | "viewMode">,
): boolean {
  if (input.submissionStarted) return false;
  if (!input.editable) return false;
  if (input.readOnly) return false;
  return isViewingDraft(input.viewMode);
}
