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
import { buildDimensionInfoList, buildDimensionScores, countConflicts, isPerfectAgreement } from "./agreement-utils";
import type {
  AgreementMethod,
  AnnotatorInfo,
  ConflictFilter,
  DimensionInfo,
  DimensionScore,
  GroundTruthInferenceResponse,
  SummaryAnnotation,
  SummaryUser,
  TaskAgreementResult,
  TaskMeta,
  TaskSummaryResponse,
} from "./types";

// ---------------------------------------------------------------------------
// Fetcher
// ---------------------------------------------------------------------------

/**
 * Fetch the full task summary payload from the backend.
 *
 * @param taskId - Database ID of the task to fetch.
 * @returns Parsed TaskSummaryResponse including annotations, distributions,
 *          and (in LSE) dimension agreement data.
 * @throws Error when the HTTP response is not OK.
 */
const fetchTaskSummary = async (taskId: number | string, includePredictions: boolean): Promise<TaskSummaryResponse> => {
  const url = includePredictions
    ? `/api/tasks/${taskId}/summary/?include_predictions=true`
    : `/api/tasks/${taskId}/summary/`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch task summary: ${response.status}`);
  }
  return response.json();
};

/**
 * Fetch ground-truth inference for a task (all annotators).
 *
 * @param taskId - Database ID of the task.
 * @returns Parsed GroundTruthInferenceResponse with per-dimension inferred values.
 * @throws Error when the HTTP response is not OK.
 */
const fetchGroundTruthInference = async (
  taskId: number | string,
  includePredictions: boolean,
): Promise<GroundTruthInferenceResponse> => {
  const response = await fetch(`/api/tasks/${taskId}/ground-truth-inference/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ include_predictions: includePredictions }),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ground truth inference: ${response.status}`);
  }
  return response.json();
};

// ---------------------------------------------------------------------------
// Type guard
// ---------------------------------------------------------------------------

/**
 * Narrow the agreement field from the API response: it is either a full
 * TaskAgreementResult (LSE with dimensions) or an empty object (OSS / no dims).
 */
function isTaskAgreementResult(value: TaskAgreementResult | Record<string, never>): value is TaskAgreementResult {
  return "dimension_results" in value && "aggregation" in value && "annotator_ids" in value;
}

// ---------------------------------------------------------------------------
// Adapter: SummaryUser -> userDisplayName input
// ---------------------------------------------------------------------------

/**
 * Convert a SummaryUser to the shape that `userDisplayName` from
 * `@humansignal/core` expects (Record<string, string>).
 */
function toUserDisplayInput(user: SummaryUser): Record<string, string> {
  return {
    id: String(user.id),
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

interface UseTaskSummaryDataOptions {
  taskId: number | string | undefined;
  conflictFilter: ConflictFilter;
  visibleColumnIds: number[] | null;
  hideInfo: boolean;
  includePredictions: boolean;
}

export interface AgreementData {
  /** Full API response (undefined while loading). */
  apiResponse: TaskSummaryResponse | undefined;
  /** Task metadata from the API */
  task: TaskMeta | undefined;
  /** Per-annotation data from the API (plain JSON, no MST) */
  summaryAnnotations: SummaryAnnotation[];
  /** Parsed agreement result (null when not available) */
  agreementResult: TaskAgreementResult | null;
  /** Agreement methodology from the project configuration ("consensus" or "pairwise"). */
  agreementMethodology: AgreementMethod;
  /** Enriched dimension info list */
  dimensions: DimensionInfo[];
  /** Only categorical dimensions */
  categoricalDimensions: DimensionInfo[];
  /** Only non-categorical dimensions */
  nonCategoricalDimensions: DimensionInfo[];
  /** Filtered dimensions based on conflict filter + column visibility */
  filteredDimensions: DimensionInfo[];
  /** Annotator info resolved from API annotations */
  annotators: AnnotatorInfo[];
  /** Per-row annotation data aligned with annotators (by annotator index).
   *  Built from annotation_ids + summaryAnnotations so the table can access
   *  ground_truth, reviews, etc. without a separate annotations_meta. */
  annotationForRow: (SummaryAnnotation | null)[];
  /** Per-dimension scores for the bar chart, sorted ascending */
  dimensionScores: DimensionScore[];
  /** Overall agreement score for the selected method */
  overallAgreement: number | null;
  /** Number of dimensions with imperfect agreement */
  conflictCount: number;
  /** IDs of dimensions that have imperfect agreement (conflicts) */
  conflictingDimensionIds: number[];
  /** Ground-truth values from the API: dimension_id -> value.
   *  When a saved GT annotation exists these are extracted values;
   *  otherwise they are inferred via majority vote / metric strategy. */
  inferredValues: Map<number, unknown>;
  /** Most common annotator answers from the API: dimension_id -> value. */
  mostCommonValues: Map<number, unknown>;
  /** Matching count/total for the most common annotator answer. */
  mostCommonCounts: Map<number, { count: number; total: number }>;
  /** Status from the GT inference API: "saved" or "suggested". */
  gtInferenceStatus: "saved" | "suggested" | undefined;
  /** Display name of the user who completed the saved GT annotation (from the GT inference API). */
  gtCompletedByName: string | undefined;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Whether the agreement data has meaningful content */
  hasAgreementData: boolean;
}

export function useTaskSummaryData({
  taskId,
  conflictFilter,
  visibleColumnIds,
  hideInfo,
  includePredictions,
}: UseTaskSummaryDataOptions): AgreementData {
  const currentUser = window.APP_SETTINGS?.user;
  const predictionsIncluded = includePredictions === true;

  const {
    data: apiResponse,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["task-summary-dashboard", taskId, predictionsIncluded],
    queryFn: () => fetchTaskSummary(taskId!, predictionsIncluded),
    enabled: !!taskId,
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: "always",
  });

  const { data: gtInferenceResponse } = useQuery({
    queryKey: ["task-gt-inference", taskId, predictionsIncluded],
    queryFn: () => fetchGroundTruthInference(taskId!, predictionsIncluded),
    enabled: !!taskId,
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: "always",
  });

  const inferredValues = useMemo<Map<number, unknown>>(() => {
    const map = new Map<number, unknown>();
    if (!gtInferenceResponse?.dimensions) return map;
    for (const [dimIdStr, entry] of Object.entries(gtInferenceResponse.dimensions)) {
      map.set(Number(dimIdStr), entry.value);
    }
    return map;
  }, [gtInferenceResponse]);

  const mostCommonValues = useMemo<Map<number, unknown>>(() => {
    const map = new Map<number, unknown>();
    const dimensions = gtInferenceResponse?.most_common_answer?.dimensions;
    if (!dimensions) return map;
    for (const [dimIdStr, entry] of Object.entries(dimensions)) {
      map.set(Number(dimIdStr), entry.value);
    }
    return map;
  }, [gtInferenceResponse]);

  const mostCommonCounts = useMemo<Map<number, { count: number; total: number }>>(() => {
    const map = new Map<number, { count: number; total: number }>();
    const dimensions = gtInferenceResponse?.most_common_answer?.dimensions;
    if (!dimensions) return map;
    for (const [dimIdStr, entry] of Object.entries(dimensions)) {
      map.set(Number(dimIdStr), { count: entry.count, total: entry.total });
    }
    return map;
  }, [gtInferenceResponse]);

  const gtInferenceStatus = gtInferenceResponse?.status;

  const gtCompletedByName = useMemo(() => {
    const user = gtInferenceResponse?.completed_by;
    if (!user) return undefined;
    return userDisplayName(Object.fromEntries(Object.entries(user).map(([k, v]) => [k, String(v ?? "")])));
  }, [gtInferenceResponse?.completed_by]);

  const task = apiResponse?.task;
  const summaryAnnotations = apiResponse?.annotations ?? [];

  const agreementResult = useMemo<TaskAgreementResult | null>(() => {
    if (!apiResponse?.agreement || !isTaskAgreementResult(apiResponse.agreement)) return null;
    return apiResponse.agreement;
  }, [apiResponse]);

  const agreementMethodology: AgreementMethod = agreementResult?.agreement_methodology ?? "pairwise";

  const annotators = useMemo<AnnotatorInfo[]>(() => {
    if (!agreementResult) return [];

    const userMap = new Map<number, SummaryUser>();
    for (const ann of summaryAnnotations) {
      if (ann.user) {
        userMap.set(ann.user.id, ann.user);
      }
    }

    const k = agreementResult.annotator_ids.length;
    const predVersions = agreementResult.prediction_model_versions ?? [];

    const humanRows: AnnotatorInfo[] = agreementResult.annotator_ids.map((id, index) => {
      const user = userMap.get(id) ?? null;
      let displayName: string;

      if (hideInfo) {
        displayName = currentUser?.id === id ? "Me" : `User ${index + 1}`;
      } else if (user) {
        displayName = userDisplayName(toUserDisplayInput(user));
      } else {
        displayName = `Annotator ${id}`;
      }

      return {
        id,
        index,
        displayName,
        user: user ? { id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name } : null,
        isPrediction: false,
      };
    });

    const predRows: AnnotatorInfo[] = predVersions.map((version, i) => ({
      id: -(i + 1),
      index: k + i,
      displayName: version.trim() || `Prediction #${i + 1}`,
      user: null,
      isPrediction: true,
      modelVersion: version,
    }));

    return [...humanRows, ...predRows];
  }, [agreementResult, summaryAnnotations, hideInfo, currentUser]);

  const annotationForRow = useMemo<(SummaryAnnotation | null)[]>(() => {
    if (!agreementResult?.annotation_ids) return [];
    const annotationById = new Map<number, SummaryAnnotation>();
    for (const ann of summaryAnnotations) {
      annotationById.set(ann.id, ann);
    }
    const rows: (SummaryAnnotation | null)[] = agreementResult.annotation_ids.map(
      (id) => annotationById.get(id) ?? null,
    );
    const predCount = agreementResult.prediction_model_versions?.length ?? 0;
    for (let i = 0; i < predCount; i++) {
      rows.push(null);
    }
    return rows;
  }, [agreementResult, summaryAnnotations]);

  const dimensions = useMemo<DimensionInfo[]>(() => {
    if (!agreementResult) return [];
    return buildDimensionInfoList(agreementResult);
  }, [agreementResult]);

  const categoricalDimensions = useMemo(() => dimensions.filter((d) => d.isCategorical), [dimensions]);

  const nonCategoricalDimensions = useMemo(() => dimensions.filter((d) => !d.isCategorical), [dimensions]);

  const filteredDimensions = useMemo(() => {
    let filtered: DimensionInfo[];
    if (conflictFilter === "custom") {
      filtered =
        visibleColumnIds !== null
          ? dimensions.filter((d) => visibleColumnIds.includes(d.dimensionId))
          : categoricalDimensions;
    } else if (conflictFilter === "all_dimensions") {
      filtered = dimensions;
    } else {
      filtered = categoricalDimensions;
    }

    return filtered;
  }, [dimensions, categoricalDimensions, conflictFilter, visibleColumnIds]);

  const dimensionScores = useMemo(
    () => (agreementResult ? buildDimensionScores(agreementResult, agreementMethodology) : []),
    [agreementResult, agreementMethodology],
  );

  const overallAgreement = useMemo(() => {
    if (!agreementResult) return null;
    return agreementMethodology === "pairwise"
      ? agreementResult.aggregation.pairwise_agreement
      : agreementResult.aggregation.consensus_agreement;
  }, [agreementResult, agreementMethodology]);

  const conflictCount = useMemo(
    () => (agreementResult ? countConflicts(agreementResult.aggregation, agreementMethodology) : 0),
    [agreementResult, agreementMethodology],
  );

  const conflictingDimensionIds = useMemo(
    () => dimensionScores.filter((d) => !isPerfectAgreement(d.score)).map((d) => d.dimensionId),
    [dimensionScores],
  );

  const hasAgreementData =
    agreementResult !== null &&
    agreementResult.dimension_results.length > 0 &&
    (agreementResult.annotator_ids.length > 0 || (agreementResult.prediction_model_versions?.length ?? 0) > 0);

  return {
    apiResponse,
    task,
    summaryAnnotations,
    agreementResult,
    agreementMethodology,
    dimensions,
    categoricalDimensions,
    nonCategoricalDimensions,
    filteredDimensions,
    annotators,
    annotationForRow,
    dimensionScores,
    overallAgreement,
    conflictCount,
    conflictingDimensionIds,
    inferredValues,
    mostCommonValues,
    mostCommonCounts,
    gtInferenceStatus,
    gtCompletedByName,
    isLoading,
    error: error as Error | null,
    hasAgreementData,
  };
}
