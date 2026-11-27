/**
 * Hook that merges two layers of ground truth data into a single effective state:
 *   1. **Baseline** (base) — when a saved GT exists, this is the API extraction
 *      of that annotation. When no GT is saved, it's a clear-winner majority vote
 *      computed on the FE; ties are intentionally left empty so the reviewer always
 *      decides the winner.
 *   2. **Local edits** (top) — unsaved reviewer overrides from `useGroundTruth`.
 *
 * Status collapses to two values: "saved" (read-only) and "draft" (always editable
 * when a GT is not saved — there's no separate "suggested" landing screen).
 */

import { useMemo } from "react";
import type { AgreementData } from "./use-task-summary-data";
import type { GroundTruthData, GroundTruthSummary } from "./use-ground-truth";
import type { ExistingGroundTruth, GroundTruthCell } from "./types";

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

export interface EffectiveGroundTruthState {
  /** Index of the existing GT annotation in the annotator/annotation arrays. */
  existingGtAnnotationIndex: number | undefined;
  /** Whether a saved GT annotation exists for this task. */
  hasExistingGt: boolean;
  /** Display name of the annotator who created the existing GT annotation. */
  existingGtAnnotatorName: string | undefined;
  /** Merged cells: API base values + local overrides on top. */
  effectiveGtCells: Map<number, GroundTruthCell>;
  /** Number of REQUIRED categorical dimensions resolved in the merged state.
   *  Optional dimensions (config `required="false"`) are not counted. */
  effectiveResolvedCount: number;
  /** Total number of REQUIRED categorical dimensions. */
  effectiveTotalCount: number;
  /** Progress as 0..1 in the merged state (required-only). */
  effectiveProgress: number;
  /** Whether all REQUIRED categorical dimensions are resolved (optional dims may stay empty). */
  effectiveIsComplete: boolean;
  /** Source breakdown (auto_unanimous / auto_majority / manual) in merged state. */
  effectiveSummary: GroundTruthSummary;
  /** Structured object for the existing GT annotation (null when none exists). */
  existingGtObject: ExistingGroundTruth | null;
  /**
   * "saved" = API returned values from an existing GT annotation.
   * "draft" = no GT annotation exists yet — reviewer is in editing mode (with the
   *           clear-winner baseline pre-populated).
   * undefined = no categorical dimensions or GT row is unavailable.
   */
  groundTruthStatus: "draft" | "saved" | undefined;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

interface UseEffectiveGroundTruthOptions {
  agreementData: AgreementData;
  groundTruth: GroundTruthData;
  hasNonCategoricalDimensions: boolean;
}

export function useEffectiveGroundTruth({
  agreementData,
  groundTruth,
  hasNonCategoricalDimensions,
}: UseEffectiveGroundTruthOptions): EffectiveGroundTruthState {
  // Detect existing GT annotation for row-exclusion and auto-review purposes
  const existingGtAnnotationIndex = useMemo(() => {
    if (!agreementData.annotationForRow?.length) return undefined;
    const idx = agreementData.annotationForRow.findIndex((a) => a?.ground_truth === true);
    return idx >= 0 ? idx : undefined;
  }, [agreementData.annotationForRow]);

  const hasExistingGt = agreementData.gtInferenceStatus === "saved";

  // Name comes from the GT inference API (completed_by field), not from the
  // agreement annotators array (which excludes GT annotations).
  const existingGtAnnotatorName = agreementData.gtCompletedByName;

  // Base layer:
  // - "saved": API extraction of the saved GT annotation (reliable source of truth).
  // - otherwise: FE-computed clear-winner majority. Ties are intentionally left empty
  //   so reviewers always pick the winner themselves (the API may pick one arbitrarily).
  const apiCells = useMemo<Map<number, GroundTruthCell>>(() => {
    const map = new Map<number, GroundTruthCell>();
    if (hasExistingGt) {
      if (!agreementData.inferredValues?.size) return map;
      for (const dim of agreementData.categoricalDimensions) {
        const value = agreementData.inferredValues.get(dim.dimensionId);
        if (value !== null && value !== undefined) {
          map.set(dim.dimensionId, {
            dimensionId: dim.dimensionId,
            value: value as string | number | boolean | null | (string | number | boolean)[],
            source: "manual",
          });
        }
      }
      return map;
    }
    for (const dim of agreementData.categoricalDimensions) {
      const majority = groundTruth.majorityVotes.get(dim.dimensionId);
      if (majority && !majority.isTie && majority.value !== null) {
        map.set(dim.dimensionId, {
          dimensionId: dim.dimensionId,
          value: majority.value,
          source: "auto_majority",
        });
      }
    }
    return map;
  }, [hasExistingGt, agreementData.inferredValues, agreementData.categoricalDimensions, groundTruth.majorityVotes]);

  // Merge: API base + local edits on top
  const effectiveGtCells = useMemo(() => {
    const merged = new Map(apiCells);
    for (const [dimId, cell] of groundTruth.cells) {
      merged.set(dimId, cell);
    }
    return merged;
  }, [apiCells, groundTruth.cells]);

  // Optional dims (config `required="false"`) are excluded from progress/save
  // gates — reviewers can skip them when building Ground Truth.
  const requiredCategoricalDimensions = useMemo(
    () => agreementData.categoricalDimensions.filter((d) => d.isRequired),
    [agreementData.categoricalDimensions],
  );

  const effectiveResolvedCount = useMemo(() => {
    let count = 0;
    for (const dim of requiredCategoricalDimensions) {
      const cell = effectiveGtCells.get(dim.dimensionId);
      if (!cell) continue;
      if (cell.value === null || cell.value === undefined) continue;
      // Multi-select dimensions can land on an empty array when the user
      // deselects every chip — that's "no value", not "value = []".
      if (Array.isArray(cell.value) && cell.value.length === 0) continue;
      count++;
    }
    return count;
  }, [requiredCategoricalDimensions, effectiveGtCells]);

  const effectiveTotalCount = requiredCategoricalDimensions.length;
  const effectiveProgress = effectiveTotalCount > 0 ? effectiveResolvedCount / effectiveTotalCount : 0;
  // Edge: if there are 0 required categorical dims (all optional), GT is
  // technically always "complete" — let the user save with whatever optional
  // values they chose to fill in.
  const effectiveIsComplete = effectiveTotalCount === 0 || effectiveResolvedCount === effectiveTotalCount;

  const effectiveSummary = useMemo<GroundTruthSummary>(() => {
    let autoUnanimous = 0;
    let autoMajority = 0;
    let manual = 0;
    for (const cell of effectiveGtCells.values()) {
      switch (cell.source) {
        case "auto_unanimous":
          autoUnanimous++;
          break;
        case "auto_majority":
          autoMajority++;
          break;
        case "manual":
          manual++;
          break;
      }
    }
    return { autoUnanimous, autoMajority, manual, total: effectiveResolvedCount };
  }, [effectiveGtCells, effectiveResolvedCount]);

  const groundTruthStatus: "draft" | "saved" | undefined = useMemo(() => {
    if (hasExistingGt) return "saved";
    // Reviewer is always in editing mode when no GT is saved — there's no
    // separate "suggested" landing state. The row is simply unavailable when
    // every dimension is non-categorical.
    if (hasNonCategoricalDimensions) return undefined;
    if (agreementData.categoricalDimensions.length === 0) return undefined;
    return "draft";
  }, [hasExistingGt, hasNonCategoricalDimensions, agreementData.categoricalDimensions.length]);

  const existingGtObject = useMemo<ExistingGroundTruth | null>(() => {
    // Case 1: GT annotation is in the agreement arrays
    if (existingGtAnnotationIndex !== undefined) {
      const ann = agreementData.annotationForRow?.[existingGtAnnotationIndex];
      if (ann) {
        return {
          annotationId: ann.id,
          annotatorIndex: existingGtAnnotationIndex,
          completedBy: ann.user?.id ?? null,
          cells: apiCells,
        };
      }
    }

    // Case 2: GT annotation exists (per inference API) but is not in the
    // agreement arrays — the backend excludes the GT from the agreement
    // computation since it's the reference, not a participant. Look it up
    // in the full summaryAnnotations list instead.
    if (hasExistingGt) {
      const gtAnn = agreementData.summaryAnnotations.find((a) => a.ground_truth === true);
      if (gtAnn) {
        return {
          annotationId: gtAnn.id,
          annotatorIndex: -1,
          completedBy: gtAnn.user?.id ?? null,
          cells: apiCells,
        };
      }
    }

    return null;
  }, [
    existingGtAnnotationIndex,
    agreementData.annotationForRow,
    apiCells,
    hasExistingGt,
    agreementData.summaryAnnotations,
  ]);

  return {
    existingGtAnnotationIndex,
    hasExistingGt,
    existingGtAnnotatorName,
    effectiveGtCells,
    effectiveResolvedCount,
    effectiveTotalCount,
    effectiveProgress,
    effectiveIsComplete,
    effectiveSummary,
    existingGtObject,
    groundTruthStatus,
  };
}
