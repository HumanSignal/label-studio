import { isAlive } from "mobx-state-tree";

/**
 * FIT-720: True when an annotation may still be a lazy-loaded stub (no deserialized
 * results yet) and should be fetched before operations that read `_initialAnnotationObj`
 * (e.g. duplicate).
 */
export function annotationNeedsHydration(annotation: any): boolean {
  if (!annotation || annotation.type !== "annotation") return false;

  const isUserGenerated = annotation.userGenerate && !annotation.sentUserGenerate;
  if (isUserGenerated) return false;

  const versionsResult = annotation.versions?.result;
  const hasVersionsResult = Array.isArray(versionsResult) && versionsResult.length > 0;
  if (hasVersionsResult) return false;

  const hasRegions = annotation.areas?.size > 0;
  if (hasRegions) return false;

  return true;
}

type FullAnnotationPayload = { result?: unknown; error?: unknown } | null | undefined;

function annotationResultsEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a ?? []) === JSON.stringify(b ?? []);
}

/**
 * FIT-1681: an annotation has an in-flight draft when LSF has applied `versions.draft`
 * on top of the persisted result (either explicitly via `draftSelected`, or by the
 * presence of a non-empty `versions.draft` payload). In that case the local MST regions
 * intentionally diverge from the server's `result` and must not be overwritten by the
 * Compare-All re-sync path from FIT-1660.
 */
function annotationHasLocalDraft(annotation: any): boolean {
  if (!annotation) return false;
  if (annotation.draftSelected === true) return true;
  const draft = annotation.versions?.draft;
  if (draft == null) return false;
  if (Array.isArray(draft)) return draft.length > 0;
  return true;
}

/**
 * Apply GET /api/annotations/:id/ payload to the matching store annotation (by pk).
 * Mirrors LSFWrapper._hydrateStubAnnotation in datamanager lsf-sdk.js.
 *
 * @returns whether hydration was applied
 */
export function applyAnnotationHydrationFromApi(
  annotations: readonly any[],
  annotationPk: string | number,
  fullAnnotation: FullAnnotationPayload,
): boolean {
  if (!fullAnnotation?.result || fullAnnotation.error) {
    return false;
  }

  const freshAnnotation = annotations.find((a) => String(a.pk) === String(annotationPk));
  if (!freshAnnotation) return false;
  if (!isAlive(freshAnnotation) || !isAlive(freshAnnotation.trackedState)) return false;

  const freshVersionsResult = freshAnnotation.versions?.result;
  const freshHasVersionsResult = Array.isArray(freshVersionsResult) && freshVersionsResult.length > 0;
  const freshHasRegions = freshAnnotation.areas?.size > 0;
  const serverResult = fullAnnotation.result;

  if (freshHasVersionsResult || freshHasRegions) {
    // FIT-1681: a local draft is the user's uncommitted work (e.g. reorderings or edits
    // persisted to the draft endpoint after a prior Submit). Its regions intentionally
    // diverge from the server `result`; re-applying the server payload here would wipe
    // the draft from the LSF view and the next autosave would then persist the wiped
    // state as the new draft — classic data loss. Keep local, but still populate
    // `versions.result` so the annotation is logically hydrated (prevents repeated
    // _hydrateStubAnnotation attempts and keeps the Submit/Update button state correct).
    if (annotationHasLocalDraft(freshAnnotation)) {
      if (!freshHasVersionsResult && serverResult !== undefined) {
        freshAnnotation.addVersions?.({ result: serverResult });
      }
      return false;
    }

    const localSerialized =
      typeof freshAnnotation.serializeAnnotation === "function" ? freshAnnotation.serializeAnnotation() : undefined;
    // MST can already have regions (e.g. after task reload + merge) while the
    // server payload is newer — re-apply so Compare All / side-by-side never shows stale labels.
    const needsReapplyFromServer =
      serverResult !== undefined &&
      (localSerialized === undefined || !annotationResultsEqual(localSerialized, serverResult));

    if (needsReapplyFromServer) {
      freshAnnotation.history?.freeze?.();
      if (!isAlive(freshAnnotation) || !isAlive(freshAnnotation.trackedState)) return false;
      freshAnnotation.addVersions?.({ result: serverResult });
      freshAnnotation.deserializeResults(serverResult);
      freshAnnotation.updateObjects?.();
      freshAnnotation.history?.safeUnfreeze?.();
      freshAnnotation.reinitHistory?.();
      return true;
    }

    if (!freshHasVersionsResult && fullAnnotation.result) {
      freshAnnotation.addVersions?.({ result: fullAnnotation.result });
    }
    return false;
  }

  freshAnnotation.history?.freeze?.();
  if (!isAlive(freshAnnotation) || !isAlive(freshAnnotation.trackedState)) return false;
  freshAnnotation.addVersions?.({ result: fullAnnotation.result });
  freshAnnotation.deserializeResults(fullAnnotation.result);
  freshAnnotation.updateObjects?.();
  freshAnnotation.history?.safeUnfreeze?.();
  freshAnnotation.reinitHistory?.();
  return true;
}
