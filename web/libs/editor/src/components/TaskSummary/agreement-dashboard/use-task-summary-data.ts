/**
 * React Query hook for fetching and deriving agreement dashboard data.
 *
 * Fetches from GET /api/tasks/{taskId}/summary/ and transforms the
 * response into structures ready for each dashboard panel.
 *
 * All read-only data (task metadata, annotation info, agreement scores)
 * comes exclusively from the API — no MST store dependency.
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { userDisplayName } from "@humansignal/core";
import {
  buildDimensionInfoList,
  buildDimensionScores,
  computeHeatmapMatrix,
  computeRowAverages,
  computeGrandAverage,
  countConflicts,
  isPerfectAgreement,
} from "./agreement-utils";
import type {
  AgreementMethod,
  AnnotatorInfo,
  ConflictFilter,
  DimensionInfo,
  DimensionScore,
  SummaryAnnotation,
  SummaryUser,
  TaskAgreementResult,
  TaskMeta,
  TaskSummaryResponse,
} from "./types";

// ---------------------------------------------------------------------------
// Fetcher
// ---------------------------------------------------------------------------

const fetchTaskSummary = async (taskId: number | string): Promise<TaskSummaryResponse> => {
  const response = await fetch(`/api/tasks/${taskId}/summary/`);
  if (!response.ok) {
    throw new Error(`Failed to fetch task summary: ${response.status}`);
  }
  return response.json();
};

// ---------------------------------------------------------------------------
// Type guard
// ---------------------------------------------------------------------------

function isTaskAgreementResult(
  value: TaskAgreementResult | Record<string, never>,
): value is TaskAgreementResult {
  return "dimension_results" in value && "aggregation" in value && "annotator_ids" in value;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

interface UseTaskSummaryDataOptions {
  taskId: number | string | undefined;
  method: AgreementMethod;
  conflictFilter: ConflictFilter;
  visibleColumnIds: number[] | null;
  hideInfo: boolean;
}

export interface AgreementData {
  /** Raw API response */
  raw: TaskSummaryResponse | undefined;
  /** Task metadata from the API */
  task: TaskMeta | undefined;
  /** Per-annotation data from the API (plain JSON, no MST) */
  summaryAnnotations: SummaryAnnotation[];
  /** Parsed agreement result (null when not available) */
  agreementResult: TaskAgreementResult | null;
  /** Enriched dimension info list */
  dimensions: DimensionInfo[];
  /** Only categorical dimensions */
  categoricalDimensions: DimensionInfo[];
  /** Filtered dimensions based on conflict filter + column visibility */
  filteredDimensions: DimensionInfo[];
  /** Annotator info resolved from API annotations */
  annotators: AnnotatorInfo[];
  /** Per-row annotation data aligned with annotators (by annotator index).
   *  Built from annotation_ids + summaryAnnotations so the table can access
   *  ground_truth, reviews, etc. without a separate annotations_meta. */
  annotationForRow: (SummaryAnnotation | null)[];
  /** N×N heatmap matrix aggregated across all dimensions */
  heatmapMatrix: number[][];
  /** Row marginal averages for the heatmap */
  heatmapRowAverages: number[];
  /** Grand average for the heatmap */
  heatmapGrandAverage: number;
  /** Per-dimension scores for the bar chart, sorted ascending */
  dimensionScores: DimensionScore[];
  /** Overall agreement score for the selected method */
  overallAgreement: number | null;
  /** Number of dimensions with imperfect agreement */
  conflictCount: number;
  /** IDs of dimensions that have imperfect agreement (conflicts) */
  conflictingDimensionIds: number[];
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Whether the agreement data has meaningful content */
  hasAgreementData: boolean;
}

export function useTaskSummaryData({
  taskId,
  method,
  conflictFilter,
  visibleColumnIds,
  hideInfo,
}: UseTaskSummaryDataOptions): AgreementData {
  const currentUser = window.APP_SETTINGS?.user;

  const {
    data: raw,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["task-summary-dashboard", taskId],
    queryFn: () => fetchTaskSummary(taskId!),
    enabled: !!taskId,
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
  });

  const task = raw?.task;
  const summaryAnnotations = raw?.annotations ?? [];

  const agreementResult = useMemo<TaskAgreementResult | null>(() => {
    if (!raw?.agreement || !isTaskAgreementResult(raw.agreement)) return null;
    return raw.agreement;
  }, [raw]);

  // Resolve annotator IDs to display info from the API annotations
  const annotators = useMemo<AnnotatorInfo[]>(() => {
    if (!agreementResult) return [];

    const userMap = new Map<number, SummaryUser>();
    for (const ann of summaryAnnotations) {
      if (ann.user) {
        userMap.set(ann.user.id, ann.user);
      }
    }

    return agreementResult.annotator_ids.map((id, index) => {
      const user = userMap.get(id);
      let displayName: string;

      if (hideInfo) {
        displayName = currentUser?.id === id ? "Me" : `User ${index + 1}`;
      } else if (user) {
        displayName = userDisplayName(user as unknown as Record<string, string>);
      } else {
        displayName = `Annotator ${id}`;
      }

      return {
        id,
        index,
        displayName,
        user: user ? (user as unknown as Record<string, unknown>) : null,
      };
    });
  }, [agreementResult, summaryAnnotations, hideInfo, currentUser]);

  // Build per-row annotation lookup aligned with annotator_ids/annotation_ids
  const annotationForRow = useMemo<(SummaryAnnotation | null)[]>(() => {
    if (!agreementResult?.annotation_ids) return [];
    const annMap = new Map<number, SummaryAnnotation>();
    for (const ann of summaryAnnotations) {
      annMap.set(ann.id, ann);
    }
    return agreementResult.annotation_ids.map((id) => annMap.get(id) ?? null);
  }, [agreementResult, summaryAnnotations]);

  // Build dimension info
  const dimensions = useMemo<DimensionInfo[]>(() => {
    if (!agreementResult) return [];
    return buildDimensionInfoList(agreementResult);
  }, [agreementResult]);

  const categoricalDimensions = useMemo(
    () => dimensions.filter((d) => d.isCategorical),
    [dimensions],
  );

  // Apply column selection mode + hide-unanimous filter
  const filteredDimensions = useMemo(() => {
    let filtered: DimensionInfo[];
    if (conflictFilter === "custom") {
      filtered = visibleColumnIds !== null
        ? dimensions.filter((d) => visibleColumnIds.includes(d.dimensionId))
        : categoricalDimensions;
    } else if (conflictFilter === "all_dimensions") {
      filtered = dimensions;
    } else {
      filtered = categoricalDimensions;
    }

    return filtered;
  }, [dimensions, categoricalDimensions, conflictFilter, visibleColumnIds]);

  // Heatmap data
  const heatmapMatrix = useMemo(
    () => (agreementResult ? computeHeatmapMatrix(agreementResult.dimension_results, method) : []),
    [agreementResult, method],
  );

  const heatmapRowAverages = useMemo(() => computeRowAverages(heatmapMatrix), [heatmapMatrix]);
  const heatmapGrandAverage = useMemo(() => computeGrandAverage(heatmapMatrix), [heatmapMatrix]);

  // Per-dimension scores for bar chart
  const dimensionScores = useMemo(
    () => (agreementResult ? buildDimensionScores(agreementResult, method) : []),
    [agreementResult, method],
  );

  // Overall agreement
  const overallAgreement = useMemo(() => {
    if (!agreementResult) return null;
    return method === "pairwise"
      ? agreementResult.aggregation.pairwise_agreement
      : agreementResult.aggregation.consensus_agreement;
  }, [agreementResult, method]);

  // Conflict count
  const conflictCount = useMemo(
    () => (agreementResult ? countConflicts(agreementResult.aggregation, method) : 0),
    [agreementResult, method],
  );

  // IDs of dimensions with imperfect agreement (used to drive "Conflicts Only" selection)
  const conflictingDimensionIds = useMemo(
    () => dimensionScores.filter((d) => !isPerfectAgreement(d.score)).map((d) => d.dimensionId),
    [dimensionScores],
  );

  const hasAgreementData =
    agreementResult !== null &&
    agreementResult.dimension_results.length > 0 &&
    agreementResult.annotator_ids.length > 0;

  return {
    raw,
    task,
    summaryAnnotations,
    agreementResult,
    dimensions,
    categoricalDimensions,
    filteredDimensions,
    annotators,
    annotationForRow,
    heatmapMatrix,
    heatmapRowAverages,
    heatmapGrandAverage,
    dimensionScores,
    overallAgreement,
    conflictCount,
    conflictingDimensionIds,
    isLoading,
    error: error as Error | null,
    hasAgreementData,
  };
}
