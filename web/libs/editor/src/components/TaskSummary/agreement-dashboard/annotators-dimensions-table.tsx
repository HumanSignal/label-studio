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
import { IconAnnotationGroundTruth, IconCheckAlt, IconCrossAlt, IconInfoOutline, IconSparks } from "@humansignal/icons";
import { formatMetricType } from "./agreement-utils";
import { DistributionRow } from "./distribution-row";
import { GroundTruthRow, MajorityVoteRow } from "./ground-truth-row";
import { ResizeHandler } from "../ResizeHandler";
import { valueToChipStrings, chipStringsEqualOrderIndependent, ValueChips } from "./value-chips";
import type {
  AnnotatorInfo,
  DimensionInfo,
  DimensionScore,
  DistributionEntry,
  GroundTruthCell,
  GroundTruthSource,
  MajorityVoteResult,
  SummaryAnnotation,
  SummaryPrediction,
} from "./types";
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
  annotationForRow?: (SummaryAnnotation | SummaryPrediction | null)[];
  /** Called when a row is clicked with the annotation's database ID (pk) */
  onAnnotationClick?: (annotationId: number) => void;
  /** Optional per-dimension scores to render as agreement bars under the table */
  dimensionScores?: DimensionScore[];
  /** Backend-computed most common annotator answers for the MCA row. */
  mostCommonValues?: Map<number, unknown>;
  /** Backend-computed count/total for the MCA row. */
  mostCommonCounts?: Map<number, { count: number; total: number }>;
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
  /** Current state of the GT row: draft, saved, or undefined. */
  groundTruthStatus?: "draft" | "saved";
  /** Whether the GT row should be read-only (no editable selects). */
  groundTruthReadOnly?: boolean;
  /** Whether the GT row should appear visually disabled (reduced opacity). */
  groundTruthDisabled?: boolean;
  /** Agreement methodology label for score tooltips ("consensus" or "pairwise"). */
  agreementMethodology?: string;
  /** Frontend majority vote values per dimension (for GT editing prefill). */
  majorityVotes?: Map<number, MajorityVoteResult>;
  /** Current user display name for the GT row draft subtitle. */
  currentUserName?: string;
  /** Control panel rendered in the table footer. */
  footer?: ReactNode;
  /** Per-dimension label colors from the labeling config: dimension name -> label_attrs.
   *  Passed to ValueChips so label-count chips render with colored thick borders. */
  dimensionLabelColors?: Map<string, Record<string, { background?: string; border?: string; color?: string }>>;
  /** Per-dimension distribution data from the task summary API, keyed by
   *  control/dimension name. When provided, a Distribution row is rendered
   *  above the per-annotator rows. */
  distributions?: Record<string, DistributionEntry>;
  /** Denominator for percentage-based distributions (matches backend TaskSummaryAPI). */
  totalAnnotations?: number;
  /** Whether predictions are included as table rows and in the agreement row. */
  includePredictions?: boolean;
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
  mostCommonValues,
  mostCommonCounts,
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
  majorityVotes,
  currentUserName,
  footer,
  dimensionLabelColors,
  distributions,
  totalAnnotations,
  includePredictions = false,
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
      excludeAnnotatorIndex !== undefined ? annotators.filter((a) => a.index !== excludeAnnotatorIndex) : annotators,
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
      ...dimensions.map((dim) => {
        const isExcluded = dim.overallWeight === 0;
        return helper.display({
          id: `dim-${dim.dimensionId}`,
          header: () => (
            <div className={cnm("flex items-center gap-tight", isExcluded && "text-neutral-content-subtler")}>
              <span>{dim.name}</span>
              {dim.controlTag && (
                <span className="bg-primary-background text-primary-content rounded px-tight h-5 flex items-center justify-center border border-primary-border-subtler text-label-smallest font-normal">
                  {dim.controlTag}
                </span>
              )}
              {isExcluded && (
                <Tooltip title="Weight set to 0 — this column is not included in the overall agreement score.">
                  <span className="bg-neutral-surface-bold text-neutral-content-subtle rounded px-tight h-5 flex items-center justify-center border border-neutral-border text-label-smallest font-normal cursor-default">
                    0%
                  </span>
                </Tooltip>
              )}
            </div>
          ),
          size: 160,
          minSize: 120,
        });
      }),
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
              const lastReview = ann?.reviews?.at?.(-1) ?? null;

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
                <tr key={annotator.id} className="group">
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
                        className={annotator.isPrediction ? "!bg-accent-plum-subtle text-accent-plum-bold" : undefined}
                      >
                        {annotator.isPrediction && <IconSparks size={18} />}
                      </Userpic>
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

                    // Conflict reference: matches the legend in the column picker.
                    //   - Saved GT exists → highlight against the GT.
                    //   - Otherwise → highlight against the most-common answer
                    //     (clear winner only; ties have no reference).
                    // Mid-edit manual picks aren't "fully submitted ground truth"
                    // yet, so the common-answer reference still applies.
                    const referenceChipStrings: string[] | null = (() => {
                      if (!dim.isCategorical) return null;
                      if (groundTruthStatus === "saved") {
                        const gtCell = groundTruthCells?.get(dim.dimensionId);
                        if (!gtCell) return null;
                        const gtValue = gtCell.value;
                        if (gtValue === null || gtValue === undefined) return null;
                        if (Array.isArray(gtValue) && gtValue.length === 0) return null;
                        return valueToChipStrings(gtValue);
                      }
                      const majority = majorityVotes?.get(dim.dimensionId);
                      if (!majority || majority.isTie || majority.value === null) return null;
                      return valueToChipStrings(majority.value);
                    })();
                    const chipStrings = valueToChipStrings(value);

                    // Exact Match: the whole selection must match, so if the
                    // sets differ at all every label is "wrong".
                    // Other metrics (e.g. Jaccard): only individual extra labels
                    // that aren't in the reference are highlighted.
                    const conflictingLabels: ReadonlySet<string> | undefined = (() => {
                      if (referenceChipStrings === null || chipStrings === null) return undefined;
                      if (dim.metricType === "exact_match") {
                        if (!chipStringsEqualOrderIndependent(chipStrings, referenceChipStrings)) {
                          return new Set(chipStrings);
                        }
                        return undefined;
                      }
                      const referenceSet = new Set(referenceChipStrings);
                      const differing = chipStrings.filter((s) => !referenceSet.has(s));
                      return differing.length > 0 ? new Set(differing) : undefined;
                    })();

                    const hasConflict = conflictingLabels !== undefined && conflictingLabels.size > 0;

                    const displaySummary = chipStrings?.length ? chipStrings.join(", ") : "—";
                    const referenceLabel = groundTruthStatus === "saved" ? "Ground truth" : "Most common answer";
                    const conflictTooltip =
                      hasConflict && referenceChipStrings
                        ? `${referenceLabel}: ${referenceChipStrings.join(", ")}. This annotator chose: ${displaySummary}`
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
                        {conflictTooltip ? <Tooltip title={conflictTooltip}>{chips}</Tooltip> : chips}
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
                  {groundTruthStatus === "saved" ? (
                    <Tooltip
                      title={
                        includePredictions
                          ? "Agreement between participants (excludes the ground truth annotation)"
                          : "Inter-annotator agreement (excludes the ground truth annotation)"
                      }
                    >
                      <span className="cursor-default inline-flex items-center gap-tighter">
                        {includePredictions ? "Agreement" : "Annotator Agreement"}
                        <IconInfoOutline
                          size={12}
                          style={{ width: 16, height: 16 }}
                          className="text-neutral-content-subtler"
                        />
                      </span>
                    </Tooltip>
                  ) : (
                    <span className="cursor-default">{includePredictions ? "Agreement" : "Annotator Agreement"}</span>
                  )}
                </td>
                {dimensions.map((dim) => {
                  const isExcluded = dim.overallWeight === 0;
                  const notFullyWeighted = dim.overallWeight < 1;
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
                  const colorClass = isExcluded
                    ? "text-neutral-content-subtler"
                    : pct < 60
                      ? "text-negative-content"
                      : pct < 80
                        ? "text-warning-content"
                        : "text-positive-content";
                  const metricLabel = formatMetricType(dim.metricType);
                  const methodologyLabel = agreementMethodology === "consensus" ? "Consensus" : "Pairwise";

                  const participantLabel = includePredictions ? "participants" : "annotators";
                  let cellTooltip = `${methodologyLabel} ${metricLabel} between ${displayAnnotators.length} ${participantLabel}.`;
                  if (isExcluded) cellTooltip += " Not included in overall agreement (weight 0).";
                  else if (notFullyWeighted) cellTooltip += ` Weight ${dim.overallWeight * 100}%.`;

                  return (
                    <td
                      key={dim.dimensionId}
                      className="px-4 py-2.5 align-middle bg-neutral-background border-t-2 border-neutral-border-bold"
                      style={{ minWidth: getColSize(`dim-${dim.dimensionId}`) }}
                    >
                      <Tooltip title={cellTooltip}>
                        <span
                          className={cnm(
                            "text-label-small font-semibold cursor-default inline-flex items-center gap-tighter",
                            colorClass,
                            isExcluded && "opacity-60",
                          )}
                        >
                          {pct.toFixed(0)}%
                          {notFullyWeighted && (
                            <IconInfoOutline
                              size={12}
                              style={{ width: 16, height: 16 }}
                              className="text-neutral-content-subtler"
                            />
                          )}
                        </span>
                      </Tooltip>
                    </td>
                  );
                })}
              </tr>
            )}

            {/* Distribution row — per-dimension stats across all annotations */}
            {distributions && (
              <DistributionRow
                dimensions={dimensions}
                distributions={distributions}
                totalAnnotations={totalAnnotations ?? 0}
                getColSize={getColSize}
                dimensionLabelColors={dimensionLabelColors}
                includePredictions={includePredictions}
              />
            )}

            {/* Most Common Answer row — read-only backend values with counts */}
            {mostCommonValues && mostCommonCounts && (
              <MajorityVoteRow
                dimensions={dimensions}
                mostCommonValues={mostCommonValues}
                mostCommonCounts={mostCommonCounts}
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
                disabled={groundTruthDisabled}
                currentUserName={currentUserName}
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
