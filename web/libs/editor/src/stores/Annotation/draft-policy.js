/**
 * Classic editor draft guards (LSO). LSE shell uses @humansignal/editor-drafts; keep logic in sync.
 */

/** @typedef {"draft" | "submitted" | "history"} DraftViewMode */

/**
 * @param {boolean} hasPersistedDraftVersion
 * @param {boolean} draftSelected
 * @returns {DraftViewMode}
 */
export function draftViewModeFromClassic(hasPersistedDraftVersion, draftSelected) {
  return hasPersistedDraftVersion && !draftSelected ? "submitted" : "draft";
}

/**
 * @param {{
 *   submissionStarted: boolean;
 *   editable: boolean;
 *   hasPersistedDraftVersion: boolean;
 *   viewMode: DraftViewMode;
 *   hasUnsavedEdits: boolean;
 *   draftSavedAt: string | number | Date | null | undefined;
 *   lastEditAt: string | number | Date | null | undefined;
 * }} input
 */
export function shouldPersistBeforeLeave(input) {
  if (input.submissionStarted) return false;
  if (!input.editable) return false;
  if (input.hasPersistedDraftVersion && input.viewMode !== "draft") return false;
  if (!input.hasUnsavedEdits) return false;
  if (!input.draftSavedAt) return true;
  if (!input.lastEditAt) return true;
  return new Date(input.lastEditAt) > new Date(input.draftSavedAt);
}

/**
 * @param {{
 *   submissionStarted: boolean;
 *   editable: boolean;
 *   readOnly: boolean;
 *   viewMode: DraftViewMode;
 * }} input
 */
export function canWriteDraftSnapshot(input) {
  if (input.submissionStarted) return false;
  if (!input.editable) return false;
  if (input.readOnly) return false;
  return input.viewMode === "draft";
}
