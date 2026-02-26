/**
 * Annotators × Dimensions Table (§3)
 *
 * Primary comparison view showing what each annotator chose for every
 * dimension, highlights disagreements, and includes an always-visible
 * Ground Truth row prefilled from the inference API. Non-categorical
 * dimensions display "—" when no values are present.
 */

import type { ReactNode } from "react";
import { useMemo } from "react";
import { flexRender, getCoreRowModel, useReactTable, createColumnHelper } from "@tanstack/react-table";
import { cnm, Tooltip, Userpic } from "@humansignal/ui";
import { IconAnnotationGroundTruth, IconCheckAlt, IconCrossAlt } from "@humansignal/icons";
import { formatMetricType } from "./agreement-utils";
import { GroundTruthRow, MajorityVoteRow } from "./ground-truth-row";
import { ResizeHandler } from "../ResizeHandler";
import { valueToChipStrings, ValueChips } from "./value-chips";
import type { AnnotatorInfo, DimensionInfo, DimensionScore, GroundTruthCell, GroundTruthSource, MajorityVoteResult, SummaryAnnotation } from "./types";
import type { ValueCount } from "./use-ground-truth";

// ---------------------------------------------------------------------------
// Review badge styling constants
// ---------------------------------------------------------------------------

const REVIEW_BADGE_SIZE = 10;
const REVIEW_BADGE_BORDER_RADIUS = 2;
const REVIEW_BADGE_OFFSET = "translate(2px, 2px)";

// ---------------------------------------------------------------------------
// Table row type (annotator rows only — special rows rendered manually)
// ---------------------------------------------------------------------------

interface AnnotatorRow {
  annotator: AnnotatorInfo;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AnnotatorsDimensionsTableProps {
  dimensions: DimensionInfo[];
  annotators: AnnotatorInfo[];
  /** Per-row annotation data aligned with annotators (by index). Provides
   *  ground_truth, reviews, comments, and the annotation ID for click handling. */
  annotationForRow?: (SummaryAnnotation | null)[];
  /** Called when a row is clicked with the annotation's database ID (pk) */
  onAnnotationClick?: (annotationId: number) => void;
  /** Optional per-dimension scores to render as agreement bars under the table */
  dimensionScores?: DimensionScore[];
  /** Backend-inferred ground-truth values: dimension_id -> inferred value.
   *  Used for conflict highlighting in annotator value cells. */
  inferredValues?: Map<number, unknown>;
  /** Effective GT cells (merged from inferred + existing GT + local edits). */
  groundTruthCells?: Map<number, GroundTruthCell>;
  groundTruthValueCounts?: Map<number, ValueCount[]>;
  onSetGroundTruthCell?: (
    dimensionId: number,
    value: string | number | boolean | null | (string | number | boolean)[],
    source?: GroundTruthSource,
  ) => void;
  onClearGroundTruthCell?: (dimensionId: number) => void;
  /** When set, the annotator at this index is excluded from regular rows
   *  (used to hide a ground_truth annotation that is shown in the GT row instead). */
  excludeAnnotatorIndex?: number;
  /** Display name of the annotator who completed the existing GT annotation. */
  groundTruthAnnotatorName?: string;
  /** Current state of the GT row: suggested, draft, saved, or undefined. */
  groundTruthStatus?: "draft" | "saved" | "suggested";
  /** Whether the GT row should be read-only (no editable selects). */
  groundTruthReadOnly?: boolean;
  /** Whether the GT row should appear visually disabled (reduced opacity). */
  groundTruthDisabled?: boolean;
  /** Agreement methodology label for score tooltips ("consensus" or "pairwise"). */
  agreementMethodology?: string;
  /** When status is "draft", called from the Draft badge to revert to suggested values. */
  onRevertToSuggestion?: () => void;
  /** When status is "draft", called from the Draft badge to clear all values. */
  onClearAllValues?: () => void;
  /** Majority vote values per dimension (for the Majority Vote row). */
  majorityVotes?: Map<number, MajorityVoteResult>;
  /** Number of conflicts to display in the GT row "suggested" CTA. */
  conflictCount?: number;
  /** Current user display name for the GT row "suggested" subtitle. */
  currentUserName?: string;
  /** Called when user clicks "Use majority vote" in the GT row suggested state. */
  onUseMajorityVote?: () => void;
  /** Called when user clicks "Select values manually" in the GT row suggested state. */
  onSelectManually?: () => void;
  /** Control panel rendered in the table footer. */
  footer?: ReactNode;
  /** Per-dimension label colors from the labeling config: dimension name -> label_attrs.
   *  Passed to ValueChips so label-count chips render with colored thick borders. */
  dimensionLabelColors?: Map<string, Record<string, { background?: string; border?: string; color?: string }>>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const AnnotatorsDimensionsTable = ({
  dimensions,
  annotators,
  annotationForRow,
  onAnnotationClick,
  dimensionScores,
  inferredValues,
  groundTruthCells,
  groundTruthValueCounts,
  onSetGroundTruthCell,
  onClearGroundTruthCell,
  excludeAnnotatorIndex,
  groundTruthAnnotatorName,
  groundTruthStatus,
  groundTruthReadOnly,
  groundTruthDisabled,
  agreementMethodology,
  onRevertToSuggestion,
  onClearAllValues,
  majorityVotes,
  conflictCount,
  currentUserName,
  onUseMajorityVote,
  onSelectManually,
  footer,
  dimensionLabelColors,
}: AnnotatorsDimensionsTableProps) => {
  const scoreMap = useMemo(() => {
    if (!dimensionScores) return null;
    const map = new Map<number, number>();
    for (const ds of dimensionScores) {
      map.set(ds.dimensionId, ds.score);
    }
    return map;
  }, [dimensionScores]);

  const displayAnnotators = useMemo(
    () =>
      excludeAnnotatorIndex !== undefined
        ? annotators.filter((a) => a.index !== excludeAnnotatorIndex)
        : annotators,
    [annotators, excludeAnnotatorIndex],
  );

  // ---------------------------------------------------------------------------
  // TanStack Table — columns + resize
  // ---------------------------------------------------------------------------

  const tableData = useMemo<AnnotatorRow[]>(
    () => displayAnnotators.map((annotator) => ({ annotator })),
    [displayAnnotators],
  );

  const columns = useMemo(() => {
    const helper = createColumnHelper<AnnotatorRow>();
    return [
      helper.display({
        id: "annotator",
        header: "Annotator",
        size: 180,
        minSize: 160,
      }),
      ...dimensions.map((dim) =>
        helper.display({
          id: `dim-${dim.dimensionId}`,
          header: () => (
            <div className="flex items-center gap-tight">
              <span>{dim.name}</span>
              {dim.controlTag && (
                <span className="bg-primary-background text-primary-content rounded px-tight h-5 flex items-center justify-center border border-primary-border-subtler text-label-smallest font-normal">
                  {dim.controlTag}
                </span>
              )}
            </div>
          ),
          size: 160,
          minSize: 120,
        }),
      ),
    ];
  }, [dimensions]);

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    columnResizeMode: "onChange",
    enableColumnResizing: true,
    defaultColumn: { minSize: 120 },
  });

  /** Returns the current rendered size of a column by its ID. */
  const getColSize = (id: string): number => table.getColumn(id)?.getSize() ?? 120;

  if (annotators.length === 0) {
    return (
      <div className="text-neutral-content-subtle text-label-small italic p-base">
        No annotations available for comparison.
      </div>
    );
  }

  return (
    <div className="border border-neutral-border rounded-small overflow-hidden">
      <div className="overflow-x-auto">
      <table
        className="w-full"
        style={{ borderCollapse: "separate", borderSpacing: 0 }}
        aria-label={`Annotators × Dimensions comparison table with ${annotators.length} annotators and ${dimensions.length} dimensions`}
      >
        {/* Header */}
        <thead className="sticky top-0 z-10">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header, i) => (
                <th
                  key={header.id}
                  className={cnm(
                    "px-4 py-2.5 text-left whitespace-nowrap font-semibold text-label-small bg-neutral-surface border-b border-neutral-border relative",
                    i === 0 && "border-r sticky left-0 z-20",
                  )}
                  style={{ minWidth: header.getSize() }}
                >
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  <ResizeHandler header={header} />
                </th>
              ))}
            </tr>
          ))}
        </thead>

        <tbody>
          {/* Annotator rows */}
          {displayAnnotators.map((annotator, rowIndex) => {
            const isEvenRow = rowIndex % 2 === 0;
            const ann = annotationForRow?.[annotator.index];
            const lastReview = ann?.reviews?.length ? ann.reviews[ann.reviews.length - 1] : null;

            const reviewBadge = lastReview ? (
              <div
                style={{
                  width: REVIEW_BADGE_SIZE,
                  height: REVIEW_BADGE_SIZE,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: REVIEW_BADGE_BORDER_RADIUS,
                  color: "var(--color-neutral-background)",
                  backgroundColor: lastReview.accepted
                    ? "var(--color-accent-kale-base)"
                    : "var(--color-accent-persimmon-base)",
                  boxShadow: "0 0 0 2px var(--color-neutral-background)",
                  transform: REVIEW_BADGE_OFFSET,
                }}
              >
                {lastReview.accepted ? <IconCheckAlt /> : <IconCrossAlt />}
              </div>
            ) : null;

            const isClickable = !!(ann?.id && onAnnotationClick);

            return (
              <tr
                key={annotator.id}
                className="group"
              >
                {/* Annotator name cell — click navigates to the annotation */}
                <td
                  className={cnm(
                    "px-4 py-2.5 align-middle border-r border-neutral-border sticky left-0 z-10",
                    isEvenRow ? "bg-neutral-surface" : "bg-neutral-background",
                    "group-hover:bg-neutral-surface-hover",
                    rowIndex < displayAnnotators.length - 1 && "border-b border-neutral-border-subtle",
                    isClickable && "cursor-pointer",
                  )}
                  style={{ minWidth: getColSize("annotator") }}
                  onClick={isClickable ? () => onAnnotationClick(ann.id) : undefined}
                >
                  <div className="flex gap-tight items-center">
                    <Userpic
                      user={annotator.user}
                      badge={reviewBadge ? { bottomRight: reviewBadge } : undefined}
                    />
                    <span className="text-label-small font-medium flex-1 truncate">{annotator.displayName}</span>
                    {ann?.ground_truth && (
                      <Tooltip title="Ground Truth">
                        <span className="flex-shrink-0" style={{ color: "var(--canteloupe_400)" }}>
                          <IconAnnotationGroundTruth />
                        </span>
                      </Tooltip>
                    )}
                  </div>
                </td>

                {/* Value cells */}
                {dimensions.map((dim) => {
                  const value = dim.values?.[annotator.index] ?? null;

                  // Conflict detection: only for categorical dims with a saved GT cell.
                  // Inferred values are not used — they are a suggestion, not ground truth.
                  const gtCell = dim.isCategorical ? groundTruthCells?.get(dim.dimensionId) : undefined;
                  const gtChipStrings = gtCell ? (valueToChipStrings(gtCell.value) ?? []) : null;
                  const chipStrings = valueToChipStrings(value);

                  // Labels present in the annotator's value but absent from the GT set.
                  const conflictingLabels: ReadonlySet<string> | undefined = (() => {
                    if (gtChipStrings === null || chipStrings === null) return undefined;
                    const gtSet = new Set(gtChipStrings);
                    const differing = chipStrings.filter((s) => !gtSet.has(s));
                    return differing.length > 0 ? new Set(differing) : undefined;
                  })();

                  const hasConflict = conflictingLabels !== undefined && conflictingLabels.size > 0;

                  const displaySummary = chipStrings?.length ? chipStrings.join(", ") : "—";
                  const conflictTooltip = hasConflict && gtCell
                    ? `Ground truth: ${gtChipStrings?.join(", ") ?? "—"}. This annotator chose: ${displaySummary}`
                    : undefined;

                  const chips = (
                    <ValueChips
                      value={value}
                      className={conflictTooltip ? "flex flex-wrap gap-1 cursor-default" : undefined}
                      conflictingLabels={conflictingLabels}
                      labelColors={dimensionLabelColors?.get(dim.name)}
                    />
                  );

                  return (
                    <td
                      key={dim.dimensionId}
                      className={cnm(
                        "px-4 py-2.5 align-middle text-label-small transition-colors",
                        isEvenRow ? "bg-neutral-surface" : "bg-neutral-background",
                        "group-hover:bg-neutral-surface-hover",
                        rowIndex < displayAnnotators.length - 1 && "border-b border-neutral-border-subtle",
                      )}
                      style={{ minWidth: getColSize(`dim-${dim.dimensionId}`) }}
                    >
                      {conflictTooltip ? (
                        <Tooltip title={conflictTooltip}>{chips}</Tooltip>
                      ) : (
                        chips
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}

          {/* Per-dimension annotator agreement scores */}
          {scoreMap && (
            <tr>
              <td
                className="px-4 py-2.5 align-middle text-label-small font-semibold text-neutral-content bg-neutral-background border-t-2 border-r border-neutral-border-bold sticky left-0 z-10"
                style={{ minWidth: getColSize("annotator") }}
              >
                <Tooltip title="Inter-annotator agreement (excludes the ground truth annotation)">
                  <span className="cursor-default">Annotator Agreement</span>
                </Tooltip>
              </td>
              {dimensions.map((dim) => {
                const score = scoreMap.get(dim.dimensionId);
                if (score === undefined) {
                  return (
                    <td
                      key={dim.dimensionId}
                      className="px-4 py-2.5 align-middle text-label-small bg-neutral-background border-t-2 border-neutral-border-bold text-neutral-content-subtler italic"
                      style={{ minWidth: getColSize(`dim-${dim.dimensionId}`) }}
                    >
                      —
                    </td>
                  );
                }
                const pct = score * 100;
                const colorClass =
                  pct < 60 ? "text-negative-content"
                    : pct < 80 ? "text-warning-content"
                      : "text-positive-content";
                const metricLabel = formatMetricType(dim.metricType);
                const methodologyLabel = agreementMethodology === "consensus" ? "Consensus" : "Pairwise";
                const cellTooltip = `${methodologyLabel} ${metricLabel} between ${displayAnnotators.length} annotators`;
                return (
                  <td
                    key={dim.dimensionId}
                    className="px-4 py-2.5 align-middle bg-neutral-background border-t-2 border-neutral-border-bold"
                    style={{ minWidth: getColSize(`dim-${dim.dimensionId}`) }}
                  >
                    <Tooltip title={cellTooltip}>
                      <span className={cnm("text-label-small font-semibold cursor-default", colorClass)}>
                        {pct.toFixed(0)}%
                      </span>
                    </Tooltip>
                  </td>
                );
              })}
            </tr>
          )}

          {/* Majority Vote row — read-only inferred values with counts */}
          {inferredValues && majorityVotes && (
            <MajorityVoteRow
              dimensions={dimensions}
              inferredValues={inferredValues}
              majorityVotes={majorityVotes}
              getColSize={getColSize}
              dimensionLabelColors={dimensionLabelColors}
            />
          )}

          {/* Ground Truth row — always visible */}
          {groundTruthCells && onSetGroundTruthCell && onClearGroundTruthCell && (
            <GroundTruthRow
              dimensions={dimensions}
              cells={groundTruthCells}
              valueCounts={groundTruthValueCounts ?? new Map()}
              onSetCell={onSetGroundTruthCell}
              onClearCell={onClearGroundTruthCell}
              annotatorName={groundTruthAnnotatorName}
              status={groundTruthStatus}
              readOnly={groundTruthReadOnly}
              getColSize={getColSize}
              onRevertToSuggestion={onRevertToSuggestion}
              onClearAllValues={onClearAllValues}
              disabled={groundTruthDisabled}
              conflictCount={conflictCount}
              currentUserName={currentUserName}
              onUseMajorityVote={onUseMajorityVote}
              onSelectManually={onSelectManually}
              dimensionLabelColors={dimensionLabelColors}
            />
          )}
        </tbody>

      </table>
      </div>
      {footer}
    </div>
  );
};
