/**
 * TypeScript interfaces for the agreement dashboard API response and UI state.
 *
 * Mirrors the data contract from the design doc (§14) and the backend
 * dataclasses in dimensions.pipeline.types.
 */

// ---------------------------------------------------------------------------
// API Response Types
// ---------------------------------------------------------------------------

/** Full response from GET /api/tasks/{task_id}/summary/ */
export interface TaskSummaryResponse {
  task: TaskMeta;
  total_annotations: number;
  total_predictions: number;
  annotations: SummaryAnnotation[];
  distributions: Record<string, DistributionEntry>;

  /** LSE extension: dimension agreement (empty object when unavailable) */
  agreement: TaskAgreementResult | Record<string, never>;
}

export interface TaskMeta {
  id: number;
  agreement: number | null;
}

export interface SummaryAnnotation {
  id: number;
  type: "annotation" | "prediction";
  user: SummaryUser | null;
  result: RawResult[];
  ground_truth: boolean;
  lead_time: number | null;
  reviews: { accepted: boolean }[];
  comments: { text: string | null; region_ref: Record<string, unknown> | null; classifications: unknown[] | null }[];
}

export interface SummaryUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
}

/** A single labeling result item as returned by the API */
export interface RawResult {
  from_name: string;
  to_name: string;
  type: string;
  value: Record<string, unknown>;
  [key: string]: unknown;
}

export interface DistributionEntry {
  type: string;
  labels: Record<string, number>;
  average?: number;
  count?: number;
}

/** Serialized from dimensions.pipeline.types.TaskAgreementResult */
export interface TaskAgreementResult {
  dimension_results: DimensionMatchResult[];
  aggregation: AggregationResult;
  annotator_ids: number[];
  /** Annotation database IDs aligned with annotator_ids. Used to look up
   *  the full SummaryAnnotation (with reviews, ground_truth, etc.) from
   *  the top-level annotations list. */
  annotation_ids?: number[];
  /** Added by LseTaskSummaryAPI: dimension_id -> metadata */
  dimension_meta: Record<number, DimensionMeta>;
}

/** Per-dimension pairwise matching scores */
export interface DimensionMatchResult {
  dimension_id: number;
  /**
   * Symmetric N×N matrix (N = annotator count).
   * Entry [i][j] = agreement score between annotator_ids[i] and annotator_ids[j].
   * Range: 0.0–1.0. Diagonal is always 1.0.
   */
  scores: number[][];
  match_metadata: Record<string, unknown>[][] | null;
  /**
   * Only populated for categorical dimensions (primitive scalar values).
   * Position i = value from annotator_ids[i]. Null for non-categorical dims.
   */
  dimension_values: (string | number | boolean | null)[] | null;
}

/** Aggregated agreement scores across all dimensions */
export interface AggregationResult {
  pairwise_agreement: number;
  consensus_agreement: number;
  /** dimension_id (as string key) -> per-dimension pairwise score */
  dimension_pairwise_agreements: Record<string, number>;
  /** dimension_id (as string key) -> per-dimension consensus score */
  dimension_consensus_agreements: Record<string, number>;
  n_annotators: number;
}

/** Dimension metadata from the Dimension model */
export interface DimensionMeta {
  name: string;
  control_tag: string;
  metric_type: string;
  /** Whether this dimension produces categorical (primitive/scalar) values.
   *  Determined server-side from the control_tag type. */
  is_categorical: boolean;
  /** All available labels defined in the labeling config for categorical dims. */
  labels?: string[];
}

// ---------------------------------------------------------------------------
// Dashboard UI State Types
// ---------------------------------------------------------------------------

export type AgreementMethod = "consensus" | "pairwise";

export type ConflictFilter = "all" | "all_dimensions" | "custom";

export const PANEL_IDS = [
  "annotators_table",
  "agreement_heatmap",
  "distribution_viewer",
] as const;

export type PanelId = (typeof PANEL_IDS)[number];

export const PANEL_LABELS: Record<PanelId, string> = {
  annotators_table: "Annotators × Dimensions Table",
  agreement_heatmap: "Agreement Heatmap Matrix",
  distribution_viewer: "Distribution & Majority Vote",
};

/** Column configuration persisted per task */
export interface ColumnConfig {
  /** Ordered list of dimension IDs to display */
  order: number[];
  /** Set of visible dimension IDs */
  visible: number[];
  /** Set of pinned dimension IDs */
  pinned: number[];
}

// ---------------------------------------------------------------------------
// Derived Data Types (used by components)
// ---------------------------------------------------------------------------

/** Enriched dimension info combining API result with metadata */
export interface DimensionInfo {
  dimensionId: number;
  name: string;
  controlTag: string;
  metricType: string;
  /** Whether this dimension has categorical values (non-null dimension_values) */
  isCategorical: boolean;
  /** Per-annotator values (only for categorical) */
  values: (string | number | boolean | null)[] | null;
  /** N×N scores matrix */
  scores: number[][];
  /** All available labels defined in the labeling config (only for categorical) */
  labels?: string[];
}

/** Annotator info resolved from annotations prop */
export interface AnnotatorInfo {
  id: number;
  index: number;
  displayName: string;
  user: Record<string, unknown> | null;
}

/** A single dimension's agreement score for the bar chart */
export interface DimensionScore {
  dimensionId: number;
  name: string;
  controlTag: string;
  metricType: string;
  score: number;
  isCategorical: boolean;
}

/** Result of computing majority vote */
export interface MajorityVoteResult {
  value: string | number | boolean | null;
  count: number;
  total: number;
  isTie: boolean;
  tiedValues: (string | number | boolean | null)[];
}

// ---------------------------------------------------------------------------
// Ground Truth Types
// ---------------------------------------------------------------------------

/** How a ground truth cell was resolved */
export type GroundTruthSource = "auto_unanimous" | "auto_majority" | "manual";

/** A single resolved ground truth value for one dimension */
export interface GroundTruthCell {
  dimensionId: number;
  value: string | number | boolean | null;
  source: GroundTruthSource;
}

/** An existing ground truth annotation detected from the summary API */
export interface ExistingGroundTruth {
  annotationId: number;
  annotatorIndex: number;
  /** User ID of the annotator who completed the GT annotation. */
  completedBy: number | null;
  cells: Map<number, GroundTruthCell>;
}
