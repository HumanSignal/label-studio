/**
 * Annotators × Dimensions Table (§3)
 *
 * Primary comparison view showing what each annotator chose for every
 * dimension, highlights disagreements, and includes a pinned Majority Vote
 * summary row. Supports both categorical and non-categorical dimensions
 * (non-categorical dimensions display "—" for values and N/A for majority vote).
 *
 * V1: Read-only — no click, sort, or drag interactions.
 */

import { useMemo } from "react";
import { flexRender, getCoreRowModel, useReactTable, createColumnHelper } from "@tanstack/react-table";
import { cnm, Tooltip, Userpic } from "@humansignal/ui";
import { IconAnnotationGroundTruth, IconCheckAlt, IconCrossAlt } from "@humansignal/icons";
import { computeMajorityVote } from "./agreement-utils";
import { GroundTruthRow } from "./ground-truth-row";
import { ResizeHandler } from "../ResizeHandler";
import type { AnnotatorInfo, DimensionInfo, DimensionScore, GroundTruthCell, GroundTruthSource, MajorityVoteResult, SummaryAnnotation } from "./types";
import type { ValueCount } from "./use-ground-truth";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatMetricType(metricType: string): string {
  return metricType
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

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
  /** Ground Truth Mode props (all optional — table works without them) */
  groundTruthActive?: boolean;
  groundTruthCells?: Map<number, GroundTruthCell>;
  groundTruthValueCounts?: Map<number, ValueCount[]>;
  onSetGroundTruthCell?: (dimensionId: number, value: string | number | boolean | null, source?: GroundTruthSource) => void;
  onClearGroundTruthCell?: (dimensionId: number) => void;
  /** When set, the annotator at this index is excluded from regular rows
   *  (used to hide a ground_truth annotation that is shown in the GT row instead). */
  excludeAnnotatorIndex?: number;
  /** Display name of the annotator who completed the existing GT annotation. */
  groundTruthAnnotatorName?: string;
  /** Pre-computed cells from an existing GT annotation — used to show a
   *  read-only GT row when Ground Truth Mode is off. */
  existingGtCells?: Map<number, GroundTruthCell>;
  /** Whether the GT row represents a saved annotation or an unsaved draft. */
  groundTruthStatus?: "draft" | "saved";
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
  groundTruthActive,
  groundTruthCells,
  groundTruthValueCounts,
  onSetGroundTruthCell,
  onClearGroundTruthCell,
  excludeAnnotatorIndex,
  groundTruthAnnotatorName,
  existingGtCells,
  groundTruthStatus,
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

  const majorityVotes = useMemo<Map<number, MajorityVoteResult>>(() => {
    const map = new Map<number, MajorityVoteResult>();
    for (const dim of dimensions) {
      if (dim.values) {
        map.set(dim.dimensionId, computeMajorityVote(dim.values));
      }
    }
    return map;
  }, [dimensions]);

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

  if (dimensions.length === 0 || annotators.length === 0) {
    return (
      <div className="text-neutral-content-subtle text-label-small italic p-base">
        No dimensions available for comparison.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table
        className="border border-neutral-border rounded-small w-full"
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
                  width: 10,
                  height: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 2,
                  color: "var(--color-neutral-background)",
                  backgroundColor: lastReview.accepted
                    ? "var(--color-accent-kale-base)"
                    : "var(--color-accent-persimmon-base)",
                  boxShadow: "0 0 0 2px var(--color-neutral-background)",
                  transform: "translate(2px, 2px)",
                }}
              >
                {lastReview.accepted ? <IconCheckAlt /> : <IconCrossAlt />}
              </div>
            ) : null;

            const isClickable = !!(ann?.id && onAnnotationClick);

            return (
              <tr
                key={annotator.id}
                className={cnm("group", isClickable && "cursor-pointer")}
                onClick={isClickable ? () => onAnnotationClick(ann.id) : undefined}
              >
                {/* Annotator name cell */}
                <td
                  className={cnm(
                    "px-4 py-2.5 align-middle border-r border-neutral-border sticky left-0 z-10",
                    isEvenRow ? "bg-neutral-surface" : "bg-neutral-background",
                    "group-hover:bg-neutral-surface-hover",
                    rowIndex < displayAnnotators.length - 1 && "border-b border-neutral-border-subtle",
                  )}
                  style={{ minWidth: getColSize("annotator") }}
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
                  if (!dim.isCategorical) {
                    return (
                      <td
                        key={dim.dimensionId}
                        className={cnm(
                          "px-4 py-2.5 align-middle text-label-small text-neutral-content-subtler italic transition-colors",
                          isEvenRow ? "bg-neutral-surface" : "bg-neutral-background",
                          "group-hover:bg-neutral-surface-hover",
                          rowIndex < displayAnnotators.length - 1 && "border-b border-neutral-border-subtle",
                        )}
                        style={{ minWidth: getColSize(`dim-${dim.dimensionId}`) }}
                      >
                        N/A
                      </td>
                    );
                  }

                  const value = dim.values?.[annotator.index] ?? null;
                  const gtCell = groundTruthCells?.get(dim.dimensionId);
                  const majority = majorityVotes.get(dim.dimensionId);

                  const referenceValue = gtCell ? gtCell.value : majority?.value ?? null;
                  const conflict = referenceValue !== null
                    ? (value === null || String(value) !== String(referenceValue))
                    : false;
                  const displayValue = value !== null ? String(value) : "—";

                  const conflictTooltip = conflict
                    ? gtCell
                      ? `Ground truth: ${String(gtCell.value)}. This annotator chose: ${displayValue}`
                      : majority
                        ? `Majority: ${String(majority.value)} (${majority.count}/${majority.total}). This annotator chose: ${displayValue}`
                        : undefined
                    : undefined;

                  return (
                    <td
                      key={dim.dimensionId}
                      className={cnm(
                        "px-4 py-2.5 align-middle text-label-small transition-colors",
                        isEvenRow ? "bg-neutral-surface" : "bg-neutral-background",
                        "group-hover:bg-neutral-surface-hover",
                        rowIndex < displayAnnotators.length - 1 && "border-b border-neutral-border-subtle",
                        conflict && "bg-negative-background text-negative-content border-negative-border-subtle",
                      )}
                      style={{ minWidth: getColSize(`dim-${dim.dimensionId}`) }}
                    >
                      {conflictTooltip ? (
                        <Tooltip title={conflictTooltip}>
                          <span className="cursor-default">{displayValue}</span>
                        </Tooltip>
                      ) : (
                        <span>{displayValue}</span>
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
                className="px-4 py-2 align-middle text-label-small font-semibold text-neutral-content bg-neutral-background border-t-2 border-r border-neutral-border-bold sticky left-0 z-10"
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
                      className="px-4 py-2 align-middle text-label-small bg-neutral-background border-t-2 border-neutral-border-bold text-neutral-content-subtler italic"
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
                const cellTooltip = `${dim.name}: ${pct.toFixed(1)}% — ${metricLabel} agreement between ${displayAnnotators.length} annotators`;
                return (
                  <td
                    key={dim.dimensionId}
                    className="px-4 py-2 align-middle bg-neutral-background border-t-2 border-neutral-border-bold"
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

          {/* Majority Vote row */}
          <tr>
            <td
              className="px-4 py-2.5 align-middle font-semibold text-label-small bg-neutral-surface border-t border-r border-neutral-border sticky left-0 z-10"
              style={{ minWidth: getColSize("annotator") }}
            >
              <Tooltip title="Most common answer across all annotators, including conflicts and empty responses">
                <span className="cursor-default">Majority Vote</span>
              </Tooltip>
            </td>
            {dimensions.map((dim) => {
              if (!dim.isCategorical) {
                return (
                  <td
                    key={dim.dimensionId}
                    className="px-4 py-2.5 align-middle text-label-small bg-neutral-surface border-t border-neutral-border text-neutral-content-subtler italic"
                    style={{ minWidth: getColSize(`dim-${dim.dimensionId}`) }}
                  >
                    N/A
                  </td>
                );
              }

              const majority = majorityVotes.get(dim.dimensionId);
              if (!majority || majority.value === null) {
                return (
                  <td
                    key={dim.dimensionId}
                    className="px-4 py-2.5 align-middle text-label-small bg-neutral-surface border-t border-neutral-border text-neutral-content-subtler"
                    style={{ minWidth: getColSize(`dim-${dim.dimensionId}`) }}
                  >
                    —
                  </td>
                );
              }

              return (
                <td
                  key={dim.dimensionId}
                  className="px-4 py-2.5 align-middle text-label-small font-semibold bg-neutral-surface border-t border-neutral-border"
                  style={{ minWidth: getColSize(`dim-${dim.dimensionId}`) }}
                >
                  <div className="flex items-center gap-tight">
                    <span>{String(majority.value)}</span>
                    <span className="text-neutral-content-subtle font-normal">
                      ({majority.count}/{majority.total})
                    </span>
                    {majority.isTie && (
                      <span className="text-warning-content text-label-small font-bold">Tie</span>
                    )}
                  </div>
                </td>
              );
            })}
          </tr>

          {/* Ground Truth row — editable in GT mode, read-only when a GT annotation exists */}
          {groundTruthActive && groundTruthCells && groundTruthValueCounts && onSetGroundTruthCell && onClearGroundTruthCell ? (
            <GroundTruthRow
              dimensions={dimensions}
              cells={groundTruthCells}
              valueCounts={groundTruthValueCounts}
              onSetCell={onSetGroundTruthCell}
              onClearCell={onClearGroundTruthCell}
              annotatorName={groundTruthAnnotatorName}
              status={groundTruthStatus}
              readOnly={groundTruthStatus === "saved"}
              getColSize={getColSize}
            />
          ) : existingGtCells && existingGtCells.size > 0 ? (
            <GroundTruthRow
              dimensions={dimensions}
              cells={existingGtCells}
              valueCounts={new Map()}
              onSetCell={() => {}}
              onClearCell={() => {}}
              annotatorName={groundTruthAnnotatorName}
              readOnly
              status="saved"
              getColSize={getColSize}
            />
          ) : null}
        </tbody>
      </table>
    </div>
  );
};
