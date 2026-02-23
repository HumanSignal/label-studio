/**
 * Utility functions for the agreement dashboard.
 *
 * All functions are pure (no side-effects) and operate on the types
 * defined in ./types.ts.
 */

import type {
  AggregationResult,
  AgreementMethod,
  DimensionMatchResult,
  DimensionInfo,
  DimensionMeta,
  DimensionScore,
  MajorityVoteResult,
  TaskAgreementResult,
} from "./types";

// ---------------------------------------------------------------------------
// Floating-point tolerance for "perfect agreement" checks
// ---------------------------------------------------------------------------

/** Tolerance for treating a score as perfect agreement (1.0). */
const PERFECT_AGREEMENT_EPSILON = 1e-6;

/**
 * Returns true when the score is close enough to 1.0 to be considered
 * perfect agreement (accounts for floating-point rounding errors).
 */
export function isPerfectAgreement(score: number | undefined): boolean {
  return score !== undefined && score >= 1.0 - PERFECT_AGREEMENT_EPSILON;
}

// ---------------------------------------------------------------------------
// Agreement Color Thresholds (matching agreementScoreTextColor)
// ---------------------------------------------------------------------------

const LOW_THRESHOLD = 0.33;
const MEDIUM_THRESHOLD = 0.66;

/**
 * Returns a Tailwind background class for an agreement score using
 * the 3-tier kale/canteloupe/persimmon system.
 */
export function getAgreementBgColor(score: number): string {
  if (score < LOW_THRESHOLD) return "bg-negative-surface";
  if (score < MEDIUM_THRESHOLD) return "bg-warning-surface";
  return "bg-positive-surface";
}

/**
 * Returns a Tailwind text color class for an agreement score.
 */
export function getAgreementTextColor(score: number): string {
  if (score < LOW_THRESHOLD) return "text-negative-content";
  if (score < MEDIUM_THRESHOLD) return "text-warning-content";
  return "text-positive-content";
}

/**
 * Returns a CSS style object for interpolating heatmap cell colors.
 * Uses a 3-stop gradient: persimmon (0) -> canteloupe (0.5) -> kale (1.0).
 */
export function getHeatmapCellStyle(score: number): Record<string, string> {
  // Clamp to [0, 1]
  const s = Math.max(0, Math.min(1, score));
  // Map score to opacity on the appropriate semantic color
  if (s < 0.5) {
    // Blend from persimmon to canteloupe
    const t = s / 0.5;
    return {
      backgroundColor: `color-mix(in srgb, var(--color-negative-surface) ${Math.round((1 - t) * 100)}%, var(--color-warning-surface) ${Math.round(t * 100)}%)`,
    };
  }
  // Blend from canteloupe to kale
  const t = (s - 0.5) / 0.5;
  return {
    backgroundColor: `color-mix(in srgb, var(--color-warning-surface) ${Math.round((1 - t) * 100)}%, var(--color-positive-surface) ${Math.round(t * 100)}%)`,
  };
}

// ---------------------------------------------------------------------------
// Majority Vote
// ---------------------------------------------------------------------------

/**
 * Compute the majority vote from a list of categorical values.
 * Returns the most frequent value and tie information.
 */
export function computeMajorityVote(
  values: (string | number | boolean | null)[],
): MajorityVoteResult {
  const counts = new Map<string | number | boolean | null, number>();

  for (const v of values) {
    if (v === null || v === undefined) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }

  if (counts.size === 0) {
    return { value: null, count: 0, total: values.length, isTie: false, tiedValues: [] };
  }

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const maxCount = sorted[0][1];
  const tiedValues = sorted.filter(([, c]) => c === maxCount).map(([v]) => v);

  return {
    value: sorted[0][0],
    count: maxCount,
    total: values.filter((v) => v !== null && v !== undefined).length,
    isTie: tiedValues.length > 1,
    tiedValues,
  };
}

/**
 * Check whether a value conflicts with the majority vote.
 */
export function isConflict(
  value: string | number | boolean | null,
  majorityVote: MajorityVoteResult,
): boolean {
  if (value === null || value === undefined || majorityVote.value === null) return false;
  return value !== majorityVote.value;
}

// ---------------------------------------------------------------------------
// Conflict Counting
// ---------------------------------------------------------------------------

/**
 * Count the number of dimensions with imperfect agreement (< 1.0).
 */
export function countConflicts(
  aggregation: AggregationResult,
  method: AgreementMethod,
): number {
  const scores =
    method === "pairwise"
      ? aggregation.dimension_pairwise_agreements
      : aggregation.dimension_consensus_agreements;

  return Object.values(scores).filter((s) => !isPerfectAgreement(s)).length;
}

// ---------------------------------------------------------------------------
// Heatmap Matrix Aggregation
// ---------------------------------------------------------------------------

/**
 * Aggregate per-dimension score matrices into a single N×N pairwise matrix.
 *
 * For "pairwise" method: average the raw scores matrices.
 * For "consensus" method: for each pair (i,j), compute the fraction of
 * dimensions where both annotators match the majority vote.
 */
export function computeHeatmapMatrix(
  dimensionResults: DimensionMatchResult[],
  method: AgreementMethod,
): number[][] {
  if (dimensionResults.length === 0) return [];

  const n = dimensionResults[0].scores.length;
  if (n === 0) return [];

  if (method === "pairwise") {
    // Average all dimension score matrices element-wise
    const matrix = Array.from({ length: n }, () => Array(n).fill(0));
    for (const dr of dimensionResults) {
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          matrix[i][j] += dr.scores[i][j];
        }
      }
    }
    const count = dimensionResults.length;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        matrix[i][j] /= count;
      }
    }
    return matrix;
  }

  // Consensus: for each pair, count how many dimensions both match majority
  const matrix = Array.from({ length: n }, () => Array(n).fill(0));
  let dimCount = 0;

  for (const dr of dimensionResults) {
    if (!dr.dimension_values) {
      // For non-categorical, fall back to pairwise scores
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          matrix[i][j] += dr.scores[i][j];
        }
      }
    } else {
      const majority = computeMajorityVote(dr.dimension_values);
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          const iMatch = dr.dimension_values[i] === majority.value;
          const jMatch = dr.dimension_values[j] === majority.value;
          matrix[i][j] += iMatch && jMatch ? 1 : 0;
        }
      }
    }
    dimCount++;
  }

  if (dimCount > 0) {
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        matrix[i][j] /= dimCount;
      }
    }
  }

  return matrix;
}

/**
 * Compute row marginal averages (excluding diagonal) from an N×N matrix.
 */
export function computeRowAverages(matrix: number[][]): number[] {
  const n = matrix.length;
  if (n <= 1) return matrix.length === 1 ? [1.0] : [];

  return matrix.map((row, i) => {
    let sum = 0;
    let count = 0;
    for (let j = 0; j < n; j++) {
      if (i !== j) {
        sum += row[j];
        count++;
      }
    }
    return count > 0 ? sum / count : 1.0;
  });
}

/**
 * Compute the grand average (excluding diagonal) from an N×N matrix.
 */
export function computeGrandAverage(matrix: number[][]): number {
  const n = matrix.length;
  if (n <= 1) return 1.0;

  let sum = 0;
  let count = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      sum += matrix[i][j];
      count++;
    }
  }
  return count > 0 ? sum / count : 1.0;
}

// ---------------------------------------------------------------------------
// Dimension Info Helpers
// ---------------------------------------------------------------------------

/**
 * Build enriched dimension info by combining API result with metadata.
 */
export function buildDimensionInfoList(
  agreementResult: TaskAgreementResult,
): DimensionInfo[] {
  const { dimension_results, dimension_meta } = agreementResult;

  return dimension_results.map((dr) => {
    const meta: DimensionMeta = dimension_meta[dr.dimension_id] ?? {
      name: `Dimension ${dr.dimension_id}`,
      control_tag: "unknown",
      metric_type: "unknown",
      is_categorical: false,
    };

    return {
      dimensionId: dr.dimension_id,
      name: meta.name,
      controlTag: meta.control_tag,
      metricType: meta.metric_type,
      isCategorical: meta.is_categorical,
      values: dr.dimension_values,
      scores: dr.scores,
      labels: meta.labels,
    };
  });
}

/**
 * Build the sorted dimension scores list for the per-dimension bar chart.
 */
export function buildDimensionScores(
  agreementResult: TaskAgreementResult,
  method: AgreementMethod,
): DimensionScore[] {
  const { aggregation, dimension_meta } = agreementResult;
  const scores =
    method === "pairwise"
      ? aggregation.dimension_pairwise_agreements
      : aggregation.dimension_consensus_agreements;

  return Object.entries(scores)
    .map(([dimIdStr, score]) => {
      const dimId = Number(dimIdStr);
      const meta = dimension_meta[dimId];
      return {
        dimensionId: dimId,
        name: meta?.name ?? `Dimension ${dimId}`,
        controlTag: meta?.control_tag ?? "unknown",
        metricType: meta?.metric_type ?? "unknown",
        score,
        isCategorical: meta?.is_categorical ?? false,
      };
    })
    .sort((a, b) => a.score - b.score); // ascending = most problematic first
}
