/**
 * Utility functions for the agreement dashboard.
 *
 * All functions are pure (no side-effects) and operate on the types
 * defined in ./types.ts.
 */

import type {
  AggregationResult,
  AgreementMethod,
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

// ---------------------------------------------------------------------------
// Majority Vote
// ---------------------------------------------------------------------------

/**
 * Serialize a dimension value to a stable string key for Map-based counting.
 * Flat arrays (multi-select choices) are sorted before stringifying so
 * ["a","b"] and ["b","a"] map to the same key. Nested arrays (e.g. taxonomy
 * paths) and objects use plain JSON.stringify.
 */
function stableKey(v: unknown): string {
  if (Array.isArray(v)) {
    const allPrimitive = v.every((item) => typeof item !== "object" || item === null);
    if (allPrimitive) return JSON.stringify([...v].sort());
    return JSON.stringify(v);
  }
  if (typeof v === "object" && v !== null) return JSON.stringify(v);
  return String(v);
}

/**
 * Compute the majority vote from a list of categorical values.
 * Returns the most frequent value and tie information.
 *
 * For multi-select dimensions where each value is an array (e.g. ["a","b"]),
 * uses JSON serialization so structurally equal arrays are counted together.
 */
export function computeMajorityVote(values: unknown[]): MajorityVoteResult {
  const counts = new Map<
    string,
    { original: string | number | boolean | (string | number | boolean)[] | null; count: number }
  >();

  for (const v of values) {
    if (v === null || v === undefined) continue;
    const key = stableKey(v);
    const entry = counts.get(key);
    if (entry) {
      entry.count++;
    } else {
      counts.set(key, { original: v as string | number | boolean | (string | number | boolean)[], count: 1 });
    }
  }

  if (counts.size === 0) {
    return { value: null, count: 0, total: values.length, isTie: false, tiedValues: [] };
  }

  const sorted = [...counts.values()].sort((a, b) => b.count - a.count);
  const maxCount = sorted[0].count;
  const tiedValues = sorted.filter((entry) => entry.count === maxCount).map((entry) => entry.original);

  return {
    value: sorted[0].original,
    count: maxCount,
    total: values.filter((v) => v !== null && v !== undefined).length,
    isTie: tiedValues.length > 1,
    tiedValues,
  };
}

/**
 * Check whether a value conflicts with the majority vote.
 * Uses JSON serialization for structural comparison of arrays (multi-select).
 */
export function isConflict(value: unknown, majorityVote: MajorityVoteResult): boolean {
  if (value === null || value === undefined || majorityVote.value === null) return false;
  return stableKey(value) !== stableKey(majorityVote.value);
}

/**
 * Structural equality check for two dimension values.
 * Flat arrays of primitives (multi-select choices) are compared as sets
 * (order-independent). Nested arrays and objects use JSON comparison.
 */
export function valuesStructurallyEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || a === undefined || b === null || b === undefined) return a === b;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    const allPrimitiveA = a.every((item) => typeof item !== "object" || item === null);
    const allPrimitiveB = b.every((item) => typeof item !== "object" || item === null);
    if (allPrimitiveA && allPrimitiveB) {
      const sortedA = [...a].map(String).sort();
      const sortedB = [...b].map(String).sort();
      return sortedA.every((v, i) => v === sortedB[i]);
    }
    return JSON.stringify(a) === JSON.stringify(b);
  }
  if (typeof a === "object" || typeof b === "object") {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return a === b;
}

// ---------------------------------------------------------------------------
// Conflict Counting
// ---------------------------------------------------------------------------

/**
 * Count the number of dimensions with imperfect agreement (< 1.0).
 */
export function countConflicts(aggregation: AggregationResult, method: AgreementMethod): number {
  const scores =
    method === "pairwise" ? aggregation.dimension_pairwise_agreements : aggregation.dimension_consensus_agreements;

  return Object.values(scores).filter((s) => !isPerfectAgreement(s)).length;
}

// ---------------------------------------------------------------------------
// Dimension Info Helpers
// ---------------------------------------------------------------------------

/** Control tag the backend assigns to every dimension of a Custom Interface. */
export const CUSTOM_INTERFACE_CONTROL_TAG = "CustomInterface";

/**
 * string, number, boolean, or nested arrays of those — the same shapes the
 * classic editor groups as Choices / Rating / Taxonomy chips.
 */
function isScalarLike(value: unknown): boolean {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return true;
  }
  if (Array.isArray(value)) {
    return value.every(isScalarLike);
  }
  return false;
}

/**
 * Whether a Custom Interface dimension can be compared like a classification.
 *
 * A Custom Interface has no labeling config to inspect, so the backend cannot
 * tell a classification from a region and reports every one of its dimensions
 * as non-categorical. The values themselves are the only evidence available:
 * strings, numbers, and booleans compare exactly the way Choices and Rating do
 * (including nested arrays of those, like Taxonomy paths), while objects and
 * arrays of objects are region-shaped and do not.
 */
function customInterfaceValuesAreScalar(values: DimensionInfo["values"]): boolean {
  if (!values) return false;
  const present = values.filter((value) => value !== null && value !== undefined);
  if (present.length === 0) return false;
  return present.every(isScalarLike);
}

/**
 * Build enriched dimension info by combining API result with metadata.
 */
export function buildDimensionInfoList(agreementResult: TaskAgreementResult): DimensionInfo[] {
  const { dimension_results, dimension_meta } = agreementResult;

  return dimension_results.map((dr) => {
    const meta: DimensionMeta = dimension_meta[dr.dimension_id] ?? {
      name: `Dimension ${dr.dimension_id}`,
      control_tag: "unknown",
      metric_type: "unknown",
      is_categorical: false,
    };
    const isCustomInterface = meta.control_tag === CUSTOM_INTERFACE_CONTROL_TAG;

    return {
      dimensionId: dr.dimension_id,
      name: meta.name,
      controlTag: meta.control_tag,
      metricType: meta.metric_type,
      isCustomInterface,
      isCategorical: meta.is_categorical || (isCustomInterface && customInterfaceValuesAreScalar(dr.dimension_values)),
      values: dr.dimension_values,
      scores: dr.scores,
      labels: meta.labels,
      allowMultiselect: meta.allow_multiselect ?? false,
      overallWeight: meta.overall_weight ?? 1.0,
      isRequired: meta.is_required ?? false,
    };
  });
}

// ---------------------------------------------------------------------------
// Formatting Helpers
// ---------------------------------------------------------------------------

/**
 * Convert a snake_case metric type string to Title Case for display.
 * E.g. "cohens_kappa" -> "Cohens Kappa".
 */
export function formatMetricType(metricType: string): string {
  return metricType
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Build the sorted dimension scores list for the per-dimension bar chart.
 */
export function buildDimensionScores(agreementResult: TaskAgreementResult, method: AgreementMethod): DimensionScore[] {
  const { aggregation, dimension_meta } = agreementResult;
  const scores =
    method === "pairwise" ? aggregation.dimension_pairwise_agreements : aggregation.dimension_consensus_agreements;

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
