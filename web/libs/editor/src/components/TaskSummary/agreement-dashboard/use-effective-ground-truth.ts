/**
 * Hook that merges two layers of ground truth data into a single effective state:
 *   1. **API values** (base) — from the ground-truth-inference API, which returns
 *      either saved GT annotation values ("saved") or inferred values ("suggested")
 *   2. **Local edits** (top) — unsaved reviewer overrides from `useGroundTruth`
 *
 * The API is the single source of truth for base values. The frontend only
 * transitions to "draft" status when the user makes local edits.
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
  /** Number of categorical dimensions resolved in the merged state. */
  effectiveResolvedCount: number;
  /** Progress as 0..1 in the merged state. */
  effectiveProgress: number;
  /** Whether all categorical dimensions are resolved in the merged state. */
  effectiveIsComplete: boolean;
  /** Source breakdown (auto_unanimous / auto_majority / manual) in merged state. */
  effectiveSummary: GroundTruthSummary;
  /** Structured object for the existing GT annotation (null when none exists). */
  existingGtObject: ExistingGroundTruth | null;
  /**
   * "suggested" = API returned inferred values, no user edits yet.
   * "saved" = API returned values from an existing GT annotation.
   * "draft" = user has made local edits that aren't committed yet (frontend-only).
   * undefined = no values available, no badge needed.
   */
  groundTruthStatus: "draft" | "saved" | "suggested" | undefined;
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

  // Base layer: API values (either saved GT extraction or inferred suggestions)
  const apiCells = useMemo<Map<number, GroundTruthCell>>(() => {
    const map = new Map<number, GroundTruthCell>();
    if (!agreementData.inferredValues?.size) return map;
    const source = agreementData.gtInferenceStatus === "saved" ? "manual" : "auto_majority";
    for (const dim of agreementData.categoricalDimensions) {
      const value = agreementData.inferredValues.get(dim.dimensionId);
      if (value !== null && value !== undefined) {
        map.set(dim.dimensionId, {
          dimensionId: dim.dimensionId,
          value: value as string | number | boolean | null | (string | number | boolean)[],
          source,
        });
      }
    }
    return map;
  }, [agreementData.inferredValues, agreementData.categoricalDimensions, agreementData.gtInferenceStatus]);

  // Merge: API base + local edits on top
  const effectiveGtCells = useMemo(() => {
    const merged = new Map(apiCells);
    for (const [dimId, cell] of groundTruth.cells) {
      merged.set(dimId, cell);
    }
    return merged;
  }, [apiCells, groundTruth.cells]);

  const effectiveResolvedCount = useMemo(() => {
    let count = 0;
    for (const dim of agreementData.categoricalDimensions) {
      const cell = effectiveGtCells.get(dim.dimensionId);
      if (cell !== undefined && cell.value !== null && cell.value !== undefined) count++;
    }
    return count;
  }, [agreementData.categoricalDimensions, effectiveGtCells]);

  const effectiveProgress = groundTruth.totalCount > 0 ? effectiveResolvedCount / groundTruth.totalCount : 0;
  const effectiveIsComplete = groundTruth.totalCount > 0 && effectiveResolvedCount === groundTruth.totalCount;

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

  const groundTruthStatus: "draft" | "saved" | "suggested" | undefined = useMemo(() => {
    // Local edits override to "draft" (only when the row is editable)
    if (!hasNonCategoricalDimensions && groundTruth.cells.size > 0) return "draft";
    // Use the API-provided status directly
    if (agreementData.gtInferenceStatus === "saved") return "saved";
    if (agreementData.gtInferenceStatus === "suggested" && apiCells.size > 0) return "suggested";
    return undefined;
  }, [hasNonCategoricalDimensions, groundTruth.cells.size, agreementData.gtInferenceStatus, apiCells.size]);

  const existingGtObject = useMemo<ExistingGroundTruth | null>(() => {
    if (existingGtAnnotationIndex === undefined) return null;
    const ann = agreementData.annotationForRow?.[existingGtAnnotationIndex];
    if (!ann) return null;
    return {
      annotationId: ann.id,
      annotatorIndex: existingGtAnnotationIndex,
      completedBy: ann.user?.id ?? null,
      cells: apiCells,
    };
  }, [existingGtAnnotationIndex, agreementData.annotationForRow, apiCells]);

  return {
    existingGtAnnotationIndex,
    hasExistingGt,
    existingGtAnnotatorName,
    effectiveGtCells,
    effectiveResolvedCount,
    effectiveProgress,
    effectiveIsComplete,
    effectiveSummary,
    existingGtObject,
    groundTruthStatus,
  };
}
