/**
 * Ground Truth Mode state management hook.
 *
 * Manages the full lifecycle of ground truth adjudication:
 * - Toggle active state
 * - Auto-accept unanimous / majority dimensions
 * - Manual per-cell resolution
 * - Progress tracking and summary
 *
 * State is persisted in localStorage per task so reviewers don't
 * lose work when navigating away.
 */

import { useCallback, useMemo } from "react";
import { useLocalStorage } from "@/utils/hooks";
import { computeMajorityVote, isPerfectAgreement } from "./agreement-utils";
import type {
  AnnotatorInfo,
  DimensionInfo,
  DimensionScore,
  GroundTruthCell,
  GroundTruthSource,
  MajorityVoteResult,
} from "./types";

// ---------------------------------------------------------------------------
// Serialization helpers (Map is not JSON-serializable)
// ---------------------------------------------------------------------------

/**
 * Convert a Map of ground truth cells to a plain array for JSON serialization.
 * Used when persisting state to localStorage.
 */
function serializeGroundTruthCells(cells: Map<number, GroundTruthCell>): GroundTruthCell[] {
  return [...cells.values()];
}

/**
 * Reconstruct a Map of ground truth cells from a serialized array.
 * Inverse of `serializeGroundTruthCells`.
 */
function deserializeGroundTruthCells(arr: GroundTruthCell[]): Map<number, GroundTruthCell> {
  const map = new Map<number, GroundTruthCell>();
  for (const cell of arr) {
    map.set(cell.dimensionId, cell);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Value distribution helper
// ---------------------------------------------------------------------------

export interface ValueCount {
  value: string | number | boolean;
  count: number;
}

/**
 * Compute unique value counts for a categorical dimension's annotator values.
 *
 * @param values - Per-annotator values from a DimensionInfo (null entries skipped).
 * @returns Sorted array of {value, count} pairs, descending by count.
 */
export function computeValueCounts(
  values: (string | number | boolean | null)[] | null,
): ValueCount[] {
  if (!values) return [];
  const counts = new Map<string | number | boolean, number>();
  for (const v of values) {
    if (v === null || v === undefined) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count);
}

// ---------------------------------------------------------------------------
// Hook return type
// ---------------------------------------------------------------------------

export interface GroundTruthActions {
  toggleActive: () => void;
  autoAcceptUnanimous: () => void;
  autoAcceptMajority: (threshold: number, selectedDimIds?: number[]) => void;
  setCell: (dimensionId: number, value: string | number | boolean | null, source?: GroundTruthSource) => void;
  clearCell: (dimensionId: number) => void;
  reset: () => void;
  clearOnCommit: () => void;
}

export interface GroundTruthSummary {
  autoUnanimous: number;
  autoMajority: number;
  manual: number;
  total: number;
}

export interface MajorityCandidate {
  dimensionId: number;
  name: string;
  majorityValue: string | number | boolean | null;
  majorityCount: number;
  total: number;
  ratio: number;
  deviatingAnnotators: string[];
}

export interface GroundTruthData {
  /** Whether ground truth mode is active */
  isActive: boolean;
  /** Resolved cells keyed by dimension ID */
  cells: Map<number, GroundTruthCell>;
  /** Total categorical dimensions that need resolution */
  totalCount: number;
  /** Number of resolved dimensions */
  resolvedCount: number;
  /** Progress as 0..1 */
  progress: number;
  /** Number of unanimous dimensions (perfect agreement) */
  unanimousCount: number;
  /** Whether all categorical dimensions are resolved */
  isComplete: boolean;
  /** Breakdown by source for the commit dialog */
  summary: GroundTruthSummary;
  /** Pre-computed majority votes per dimension */
  majorityVotes: Map<number, MajorityVoteResult>;
  /** Pre-computed value counts per dimension */
  valueCounts: Map<number, ValueCount[]>;
  /** Candidates for majority auto-accept at a given threshold */
  getMajorityCandidates: (threshold: number) => MajorityCandidate[];
  /** Actions */
  actions: GroundTruthActions;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

interface UseGroundTruthOptions {
  taskId: number | string | undefined;
  dimensions: DimensionInfo[];
  dimensionScores: DimensionScore[];
  annotators: AnnotatorInfo[];
}

export function useGroundTruth({
  taskId,
  dimensions,
  dimensionScores,
  annotators,
}: UseGroundTruthOptions): GroundTruthData {
  // -------------------------------------------------------------------------
  // Persisted state
  // -------------------------------------------------------------------------

  const [isActive, setIsActive] = useLocalStorage<boolean>(
    `ground_truth_active_${taskId ?? "unknown"}`,
    false,
  );

  const [serializedCells, setSerializedCells] = useLocalStorage<GroundTruthCell[]>(
    `ground_truth_cells_${taskId ?? "unknown"}`,
    [],
  );

  const cells = useMemo(() => deserializeGroundTruthCells(serializedCells), [serializedCells]);

  const updateCells = useCallback(
    (updater: (prev: Map<number, GroundTruthCell>) => Map<number, GroundTruthCell>) => {
      setSerializedCells((prev: GroundTruthCell[]) => {
        const prevMap = deserializeGroundTruthCells(prev);
        const nextMap = updater(prevMap);
        return serializeGroundTruthCells(nextMap);
      });
    },
    [setSerializedCells],
  );

  // -------------------------------------------------------------------------
  // Derived: categorical dimensions only
  // -------------------------------------------------------------------------

  const categoricalDimensions = useMemo(
    () => dimensions.filter((d) => d.isCategorical),
    [dimensions],
  );

  const totalCount = categoricalDimensions.length;

  // -------------------------------------------------------------------------
  // Derived: majority votes and value counts per dimension
  // -------------------------------------------------------------------------

  const majorityVotes = useMemo(() => {
    const map = new Map<number, MajorityVoteResult>();
    for (const dim of categoricalDimensions) {
      if (dim.values) {
        map.set(dim.dimensionId, computeMajorityVote(dim.values));
      }
    }
    return map;
  }, [categoricalDimensions]);

  const valueCounts = useMemo(() => {
    const map = new Map<number, ValueCount[]>();
    for (const dim of categoricalDimensions) {
      map.set(dim.dimensionId, computeValueCounts(dim.values));
    }
    return map;
  }, [categoricalDimensions]);

  // -------------------------------------------------------------------------
  // Derived: dimension scores lookup
  // -------------------------------------------------------------------------

  const scoreMap = useMemo(() => {
    const map = new Map<number, number>();
    for (const ds of dimensionScores) {
      map.set(ds.dimensionId, ds.score);
    }
    return map;
  }, [dimensionScores]);

  // -------------------------------------------------------------------------
  // Derived: progress
  // -------------------------------------------------------------------------

  const resolvedCount = useMemo(() => {
    let count = 0;
    for (const dim of categoricalDimensions) {
      if (cells.has(dim.dimensionId)) count++;
    }
    return count;
  }, [categoricalDimensions, cells]);

  const progress = totalCount > 0 ? resolvedCount / totalCount : 0;
  const isComplete = totalCount > 0 && resolvedCount === totalCount;

  // -------------------------------------------------------------------------
  // Derived: unanimous count
  // -------------------------------------------------------------------------

  const unanimousCount = useMemo(() => {
    let count = 0;
    for (const dim of categoricalDimensions) {
      if (isPerfectAgreement(scoreMap.get(dim.dimensionId))) count++;
    }
    return count;
  }, [categoricalDimensions, scoreMap]);

  // -------------------------------------------------------------------------
  // Derived: summary
  // -------------------------------------------------------------------------

  const summary = useMemo<GroundTruthSummary>(() => {
    let autoUnanimous = 0;
    let autoMajority = 0;
    let manual = 0;
    for (const cell of cells.values()) {
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
    return { autoUnanimous, autoMajority, manual, total: resolvedCount };
  }, [cells, resolvedCount]);

  // -------------------------------------------------------------------------
  // getMajorityCandidates
  // -------------------------------------------------------------------------

  const getMajorityCandidates = useCallback(
    (threshold: number): MajorityCandidate[] => {
      const candidates: MajorityCandidate[] = [];
      for (const dim of categoricalDimensions) {
        // Skip already-resolved dims
        if (cells.has(dim.dimensionId)) continue;
        // Skip unanimous (handled separately)
        if (isPerfectAgreement(scoreMap.get(dim.dimensionId))) continue;

        const majority = majorityVotes.get(dim.dimensionId);
        if (!majority || majority.value === null) continue;

        const ratio = majority.total > 0 ? majority.count / majority.total : 0;
        if (ratio < threshold) continue;

        // Find deviating annotators
        const deviating: string[] = [];
        if (dim.values) {
          for (let i = 0; i < dim.values.length; i++) {
            if (dim.values[i] !== null && dim.values[i] !== majority.value) {
              deviating.push(annotators[i]?.displayName ?? `Annotator ${i}`);
            }
          }
        }

        candidates.push({
          dimensionId: dim.dimensionId,
          name: dim.name,
          majorityValue: majority.value,
          majorityCount: majority.count,
          total: majority.total,
          ratio,
          deviatingAnnotators: deviating,
        });
      }
      return candidates;
    },
    [categoricalDimensions, cells, scoreMap, majorityVotes, annotators],
  );

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  const toggleActive = useCallback(() => {
    setIsActive((prev: boolean) => !prev);
  }, [setIsActive]);

  const autoAcceptUnanimous = useCallback(() => {
    updateCells((prev) => {
      const next = new Map(prev);
      for (const dim of categoricalDimensions) {
        if (isPerfectAgreement(scoreMap.get(dim.dimensionId))) {
          const majority = majorityVotes.get(dim.dimensionId);
          if (majority && majority.value !== null) {
            next.set(dim.dimensionId, {
              dimensionId: dim.dimensionId,
              value: majority.value,
              source: "auto_unanimous",
            });
          }
        }
      }
      return next;
    });
  }, [categoricalDimensions, scoreMap, majorityVotes, updateCells]);

  const autoAcceptMajority = useCallback(
    (threshold: number, selectedDimIds?: number[]) => {
      const candidates = getMajorityCandidates(threshold);
      const allowedIds = selectedDimIds ? new Set(selectedDimIds) : null;

      updateCells((prev) => {
        const next = new Map(prev);
        for (const c of candidates) {
          if (allowedIds && !allowedIds.has(c.dimensionId)) continue;
          next.set(c.dimensionId, {
            dimensionId: c.dimensionId,
            value: c.majorityValue,
            source: "auto_majority",
          });
        }
        return next;
      });
    },
    [getMajorityCandidates, updateCells],
  );

  const setCell = useCallback(
    (dimensionId: number, value: string | number | boolean | null, source: GroundTruthSource = "manual") => {
      updateCells((prev) => {
        const next = new Map(prev);
        next.set(dimensionId, { dimensionId, value, source });
        return next;
      });
    },
    [updateCells],
  );

  const clearCell = useCallback(
    (dimensionId: number) => {
      updateCells((prev) => {
        const next = new Map(prev);
        next.delete(dimensionId);
        return next;
      });
    },
    [updateCells],
  );

  const reset = useCallback(() => {
    setSerializedCells([]);
  }, [setSerializedCells]);

  const clearOnCommit = useCallback(() => {
    setSerializedCells([]);
    setIsActive(false);
  }, [setSerializedCells, setIsActive]);

  // -------------------------------------------------------------------------
  // Return
  // -------------------------------------------------------------------------

  return {
    isActive,
    cells,
    totalCount,
    resolvedCount,
    progress,
    unanimousCount,
    isComplete,
    summary,
    majorityVotes,
    valueCounts,
    getMajorityCandidates,
    actions: {
      toggleActive,
      autoAcceptUnanimous,
      autoAcceptMajority,
      setCell,
      clearCell,
      reset,
      clearOnCommit,
    },
  };
}
