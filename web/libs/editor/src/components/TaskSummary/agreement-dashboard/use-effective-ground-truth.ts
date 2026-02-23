/**
 * Hook that merges a saved ground truth annotation with local (unsaved) overrides.
 *
 * When a task already has a ground_truth annotation, the dashboard needs to:
 *   1. Detect it from the API response (`annotationForRow`)
 *   2. Extract its per-dimension cell values as the "base" layer
 *   3. Overlay any local edits the reviewer has made (from `useGroundTruth`)
 *   4. Derive effective progress, summary, and status from the merged state
 *
 * This hook encapsulates all that derived state so TaskSummaryV2 stays focused
 * on layout and event wiring.
 */

import { useMemo } from "react";
import type { AgreementData } from "./use-task-summary-data";
import type { GroundTruthData, GroundTruthSummary } from "./use-ground-truth";
import type { DimensionInfo, ExistingGroundTruth, GroundTruthCell } from "./types";

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
  /** Cells extracted from the existing GT annotation (base layer). */
  existingGtCells: Map<number, GroundTruthCell>;
  /** Merged cells: existing GT base + local overrides on top. */
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
   * "saved" = GT annotation exists with no local overrides.
   * "draft" = user has made local edits that aren't committed yet.
   * undefined = fresh empty state, no badge needed.
   */
  groundTruthStatus: "draft" | "saved" | undefined;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

interface UseEffectiveGroundTruthOptions {
  agreementData: AgreementData;
  groundTruth: GroundTruthData;
}

export function useEffectiveGroundTruth({
  agreementData,
  groundTruth,
}: UseEffectiveGroundTruthOptions): EffectiveGroundTruthState {
  const existingGtAnnotationIndex = useMemo(() => {
    if (!agreementData.annotationForRow?.length) return undefined;
    const idx = agreementData.annotationForRow.findIndex((a) => a?.ground_truth === true);
    return idx >= 0 ? idx : undefined;
  }, [agreementData.annotationForRow]);

  const hasExistingGt = existingGtAnnotationIndex !== undefined;

  const existingGtAnnotatorName = hasExistingGt
    ? agreementData.annotators[existingGtAnnotationIndex]?.displayName
    : undefined;

  const existingGtCells = useMemo<Map<number, GroundTruthCell>>(() => {
    const map = new Map<number, GroundTruthCell>();
    if (existingGtAnnotationIndex === undefined) return map;
    for (const dim of agreementData.categoricalDimensions) {
      if (dim.values) {
        const value = dim.values[existingGtAnnotationIndex];
        if (value !== null && value !== undefined) {
          map.set(dim.dimensionId, { dimensionId: dim.dimensionId, value, source: "manual" });
        }
      }
    }
    return map;
  }, [existingGtAnnotationIndex, agreementData.categoricalDimensions]);

  const effectiveGtCells = useMemo(() => {
    if (!hasExistingGt) return groundTruth.cells;
    const merged = new Map(existingGtCells);
    for (const [dimId, cell] of groundTruth.cells) {
      merged.set(dimId, cell);
    }
    return merged;
  }, [hasExistingGt, existingGtCells, groundTruth.cells]);

  const effectiveResolvedCount = useMemo(() => {
    if (!hasExistingGt) return groundTruth.resolvedCount;
    let count = 0;
    for (const dim of agreementData.categoricalDimensions) {
      if (effectiveGtCells.has(dim.dimensionId)) count++;
    }
    return count;
  }, [hasExistingGt, groundTruth.resolvedCount, agreementData.categoricalDimensions, effectiveGtCells]);

  const effectiveProgress = groundTruth.totalCount > 0 ? effectiveResolvedCount / groundTruth.totalCount : 0;
  const effectiveIsComplete = groundTruth.totalCount > 0 && effectiveResolvedCount === groundTruth.totalCount;

  const effectiveSummary = useMemo<GroundTruthSummary>(() => {
    if (!hasExistingGt) return groundTruth.summary;
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
  }, [hasExistingGt, groundTruth.summary, effectiveGtCells, effectiveResolvedCount]);

  const groundTruthStatus: "draft" | "saved" | undefined = useMemo(() => {
    if (hasExistingGt && groundTruth.cells.size > 0) return "draft";
    if (hasExistingGt) return "saved";
    if (groundTruth.cells.size > 0) return "draft";
    return undefined;
  }, [hasExistingGt, groundTruth.cells.size]);

  const existingGtObject = useMemo<ExistingGroundTruth | null>(() => {
    if (existingGtAnnotationIndex === undefined) return null;
    const ann = agreementData.annotationForRow?.[existingGtAnnotationIndex];
    if (!ann) return null;
    return {
      annotationId: ann.id,
      annotatorIndex: existingGtAnnotationIndex,
      completedBy: ann.user?.id ?? null,
      cells: existingGtCells,
    };
  }, [existingGtAnnotationIndex, agreementData.annotationForRow, existingGtCells]);

  return {
    existingGtAnnotationIndex,
    hasExistingGt,
    existingGtAnnotatorName,
    existingGtCells,
    effectiveGtCells,
    effectiveResolvedCount,
    effectiveProgress,
    effectiveIsComplete,
    effectiveSummary,
    existingGtObject,
    groundTruthStatus,
  };
}
