/** Compare annotation result payloads (id/type/value) for draft vs submitted parity. */
function normalizeResultsForCompare(results: unknown[] | undefined | null): string {
  if (!results?.length) return "[]";
  const copy = results
    .map((raw) => {
      const row = raw as Record<string, unknown>;
      return {
        id: row.id,
        type: row.type,
        from_name: row.from_name,
        to_name: row.to_name,
        value: row.value,
        meta: row.meta,
      };
    })
    .sort((a, b) => String(a.id ?? "").localeCompare(String(b.id ?? "")));
  return JSON.stringify(copy);
}

/**
 * True when a persisted draft snapshot differs from the submitted snapshot
 * (classic: draft exists and is not identical to result).
 */
export function draftDiffersFromSubmitted(
  submitted: unknown[] | undefined | null,
  draft: unknown[] | undefined | null,
): boolean {
  if (!draft?.length) return false;
  if (!submitted?.length) return true;
  return normalizeResultsForCompare(submitted) !== normalizeResultsForCompare(draft);
}

export type AnnotationHasEditableChangesInput = {
  canUndo: boolean;
  hasUnsavedEdits: boolean;
  /** Persisted draft differs from submitted (Update / review affordances). */
  draftOverSubmitted?: boolean;
  /**
   * Live submitted head (no history preview, no persisted draft session).
   * Undo stack depth alone must not enable Update — only dirty / draft drift counts.
   */
  isSubmittedLive?: boolean;
};

/** Session undo/dirty OR persisted draft-over-submitted (shell Update parity). */
export function annotationHasEditableChanges(input: AnnotationHasEditableChangesInput): boolean {
  if (input.draftOverSubmitted) return true;
  if (input.hasUnsavedEdits) return true;
  if (input.isSubmittedLive) return false;
  return input.canUndo;
}
