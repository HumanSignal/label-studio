/**
 * Pure logic for comparing annotations against a ground truth annotation.
 * No React, no side-effects, no API calls.
 *
 * ============================================================================
 * BUG HISTORY & DESIGN RATIONALE
 * ============================================================================
 *
 * BUG 1 — Index lookup via user ID (now fixed: use annotation ID)
 * ---------------------------------------------------------------
 * The agreement API returns three parallel arrays aligned by annotator index i:
 *   annotator_ids[i]    – user ID of annotator i
 *   annotation_ids[i]   – annotation DB ID from annotator i
 *   dimension_values[i] – the value annotator i chose for a given dimension
 *
 * The old code built:
 *   annotatorIndexMap = Map<userId, index>
 * from the `annotators` list and used `ann.user.id` to look up the index when
 * processing each MST annotation for review.
 *
 * This is wrong when the same user submitted multiple annotations — e.g. they
 * have both a regular annotation and a ground truth annotation.  A `Map` is
 * last-write-wins, so after iterating all annotators the user's ID maps to the
 * *last* index encountered (which may be the GT index).  Any non-GT annotation
 * from that user then reads `dimension_values[gtIndex]` — the GT's own values —
 * and always matches → always incorrectly accepted.
 *
 * Fix: build the lookup on annotation ID instead (annotation IDs are unique
 * per row in the agreement arrays):
 *   annotationIndexMap = Map<annotationId, index>
 * Then use `ann.pk` to look up the index for each MST annotation.
 *
 * BUG 2 — UI column filter leaking into review logic (now fixed)
 * --------------------------------------------------------------
 * The ColumnPicker lets reviewers hide columns from the table view.  The old
 * code passed `filteredDimensions` (the UI-visible subset) to the comparison
 * function.  `doesAnnotationMatchGroundTruth` silently skips any dimension
 * that is not present in the `dimensions` argument, so a hidden dimension whose
 * value differs from the GT was never checked → annotation incorrectly accepted.
 *
 * Column visibility is a *display* preference and must not affect correctness.
 * Callers must always pass the full `categoricalDimensions` list here.
 * ============================================================================
 */

import type { DimensionInfo, ExistingGroundTruth } from "./types";
import { valuesStructurallyEqual } from "./agreement-utils";

// ---------------------------------------------------------------------------
// Index map
// ---------------------------------------------------------------------------

/**
 * Build a map from annotation database ID to its 0-based position index in
 * the agreement API's parallel arrays (annotator_ids / annotation_ids /
 * dimension_values).
 *
 * Using the annotation ID (unique per row) rather than the user ID avoids
 * the collision when the same user submitted both a regular annotation and
 * the GT annotation (see BUG 1 above).
 */
export function buildAnnotationIndexMap(annotationIds: number[]): Map<number, number> {
  const map = new Map<number, number>();
  for (let i = 0; i < annotationIds.length; i++) {
    map.set(annotationIds[i], i);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Per-annotation comparison
// ---------------------------------------------------------------------------

/**
 * Returns true if all resolved GT dimensions match the given annotator's values.
 *
 * Only categorical dimensions that appear in both `existingGt.cells` and
 * `dimensions` are evaluated.  A GT cell whose dimension is absent from
 * `dimensions` is skipped — callers should pass the full `categoricalDimensions`
 * list to avoid silently ignoring mismatches (see BUG 2 above).
 *
 * @param annotatorIndex  0-based index into the agreement API arrays
 * @param existingGt      saved GT annotation with its resolved cell values
 * @param dimensions      full list of categorical dimensions (never filtered)
 */
export function doesAnnotationMatchGroundTruth(
  annotatorIndex: number,
  existingGt: ExistingGroundTruth,
  dimensions: DimensionInfo[],
): boolean {
  for (const [dimId, gtCell] of existingGt.cells) {
    const dim = dimensions.find((d) => d.dimensionId === dimId);
    if (!dim || !dim.isCategorical || !dim.values) continue;

    const annotatorValue = dim.values[annotatorIndex];
    if (!valuesStructurallyEqual(annotatorValue, gtCell.value)) {
      return false;
    }
  }
  return true;
}

// ---------------------------------------------------------------------------
// Batch decision computation
// ---------------------------------------------------------------------------

/**
 * Compute accept/reject decisions for a set of annotations against a GT.
 *
 * Returns a `Map<annotationPk, accepted>` where:
 *   true  = annotation matches GT on all categorical dimensions → accept
 *   false = annotation differs from GT on at least one dimension → reject
 *
 * The GT annotation itself is excluded from the output.
 * Annotations whose pk is not present in `annotationIds` are skipped (they
 * were not included in the agreement computation and cannot be evaluated).
 *
 * @param annotations    MST annotations to evaluate (only those with a pk)
 * @param existingGt     the saved GT annotation
 * @param dimensions     full list of categorical dimensions (never filtered)
 * @param annotationIds  `annotation_ids` array from the agreement API result,
 *                       aligned with `annotator_ids` and `dimension_values`
 */
export function computeReviewDecisions(
  annotations: Array<{ pk?: string | number | null; user?: { id: number } | null }>,
  existingGt: ExistingGroundTruth,
  dimensions: DimensionInfo[],
  annotationIds: number[],
): Map<number, boolean> {
  const indexMap = buildAnnotationIndexMap(annotationIds);
  const decisions = new Map<number, boolean>();

  for (const ann of annotations) {
    const pk = Number(ann.pk);
    if (!pk) continue;
    if (pk === existingGt.annotationId) continue;

    const idx = indexMap.get(pk);
    if (idx === undefined) continue;

    decisions.set(pk, doesAnnotationMatchGroundTruth(idx, existingGt, dimensions));
  }

  return decisions;
}
