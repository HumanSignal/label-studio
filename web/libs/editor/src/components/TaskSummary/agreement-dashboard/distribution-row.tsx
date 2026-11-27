/**
 * Distribution Row — per-dimension distribution summary across all annotations.
 *
 * Read-only row that mirrors the V1 Aggregation row from `Aggregation.tsx`.
 * Reads from the `distributions` field on the task summary API response.
 *
 * Per-dimension rendering:
 *   - "labels"-suffixed types (rectanglelabels, polygonlabels, labels, …)
 *     → counted chips with thick colored left border.
 *   - "choices" / "taxonomy"
 *     → percentage chips colored by label_attrs background.
 *   - "rating" with `average`
 *     → "Avg: N.N ★".
 *   - "number" with `average`
 *     → "Avg: N.N".
 *   - other / missing → "N/A".
 *
 * The label cell gets a chevron toggle when any data cell visually overflows,
 * matching the V1 behavior.
 */
import { useLayoutEffect, useRef, useState } from "react";
import { cnm } from "@humansignal/ui";
import { IconChevronDown } from "@humansignal/icons";
import { Chip } from "../Chip";
import type { DimensionInfo, DistributionEntry } from "./types";

type DimensionLabelColors = Map<string, Record<string, { background?: string; border?: string; color?: string }>>;

interface DistributionCellProps {
  distribution: DistributionEntry | undefined;
  totalAnnotations: number;
  isExpanded: boolean;
  labelColors?: Record<string, { background?: string; border?: string; color?: string }>;
}

/**
 * Renders the distribution summary for a single dimension.
 * Mirrors `ApiAggregationCell` from the V1 `Aggregation.tsx`.
 */
const DistributionCell = ({ distribution, totalAnnotations, isExpanded, labelColors }: DistributionCellProps) => {
  if (!distribution || Object.keys(distribution.labels ?? {}).length === 0) {
    if (distribution?.average !== undefined && distribution.average !== null) {
      return (
        <span className="text-sm font-medium text-neutral-content-subtle">
          Avg: <span className="font-bold">{distribution.average.toFixed(1)}</span>
          {distribution.type === "rating" && <span className="text-yellow-500"> ★</span>}
        </span>
      );
    }
    return <span className="text-neutral-content-subtler text-xs italic">N/A</span>;
  }

  // Sort labels by count descending so the dominant value shows first.
  const sortedLabels = Object.entries(distribution.labels).sort(([, a], [, b]) => b - a);

  // Choices / taxonomy: percentage of annotations that selected each value.
  if (distribution.type === "choices" || distribution.type === "taxonomy") {
    const denominator = totalAnnotations > 0 ? totalAnnotations : 1;
    return (
      <div className={cnm("text-ellipsis", !isExpanded && "line-clamp-2")}>
        {sortedLabels.map(([label, count]) => (
          <Chip
            key={label}
            prefix={`${((count / denominator) * 100).toFixed(1)}%`}
            colors={{ background: labelColors?.[label]?.background }}
            className="mr-tighter mb-tighter"
          >
            {label}
          </Chip>
        ))}
      </div>
    );
  }

  // Spatial labels (rectanglelabels, polygonlabels, labels, …) and pairwise:
  // raw counts with optional thick colored left border for label-style configs.
  const isLabelsType = distribution.type.endsWith("labels");
  return (
    <div className={cnm("text-ellipsis", !isExpanded && "line-clamp-2")}>
      {sortedLabels.map(([label, count]) => (
        <Chip
          key={label}
          prefix={count}
          colors={{
            background: labelColors?.[label]?.background,
            border: labelColors?.[label]?.border,
            color: labelColors?.[label]?.color,
          }}
          className="mr-tighter mb-tighter"
          thickBorder={isLabelsType}
        >
          {label}
        </Chip>
      ))}
    </div>
  );
};

interface DistributionRowProps {
  dimensions: DimensionInfo[];
  /** Per-dimension distribution keyed by dimension/control name. */
  distributions: Record<string, DistributionEntry>;
  /** Denominator for percentage-based distributions (matches backend TaskSummaryAPI). */
  totalAnnotations: number;
  /** Returns the current rendered size (px) for a column ID — keeps the row in
   *  sync with the resizable header columns. */
  getColSize?: (id: string) => number;
  /** Per-dimension label colors keyed by dimension name. */
  dimensionLabelColors?: DimensionLabelColors;
  /** Whether predictions are included in the distribution denominator. */
  includePredictions?: boolean;
}

/**
 * Distribution row rendered above the per-annotator rows.
 *
 * Mirrors the V1 `AggregationTableRow` expand/collapse behavior: a chevron
 * toggle appears in the label cell when any data cell visually overflows the
 * row height; toggling expands every cell to its full content.
 */
export const DistributionRow = ({
  dimensions,
  distributions,
  totalAnnotations,
  getColSize,
  dimensionLabelColors,
  includePredictions = false,
}: DistributionRowProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);
  const rowRef = useRef<HTMLTableRowElement>(null);

  useLayoutEffect(() => {
    if (!rowRef.current) return;

    const tr = rowRef.current;
    // Skip the first column: it switches between a plain label and a <button>
    // when hasOverflow flips, which alters row height and can flip overflow on
    // every layout → infinite updates.
    const dataCells = [...tr.childNodes].slice(1) as HTMLElement[];
    const hasOverflowingCells = dataCells.some((td) => {
      const node = td.firstChild as HTMLElement | null;
      return node ? node.scrollHeight > tr.scrollHeight : false;
    });

    setHasOverflow((prev) => (prev === hasOverflowingCells ? prev : hasOverflowingCells));
  }, [dimensions, distributions, isExpanded]);

  return (
    <tr ref={rowRef}>
      <td
        className={cnm(
          "px-4 py-2.5 align-top text-label-small bg-neutral-background border-r border-t border-neutral-border-bold sticky left-0 z-10",
        )}
        style={{ minWidth: getColSize?.("annotator") ?? 160 }}
      >
        <div className="flex flex-col">
          {hasOverflow ? (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-2 font-semibold text-neutral-content hover:text-neutral-content transition-colors cursor-pointer"
            >
              <IconChevronDown size={16} className={cnm("transition-transform", isExpanded && "rotate-180")} />
              Distribution
            </button>
          ) : (
            <span className="font-semibold text-neutral-content">Distribution</span>
          )}
          <span className="text-xs text-neutral-content-subtle">
            {includePredictions ? `${totalAnnotations} participants` : `${totalAnnotations} annotations`}
          </span>
        </div>
      </td>
      {dimensions.map((dim) => (
        <td
          key={dim.dimensionId}
          className="px-4 py-2.5 align-top overflow-hidden bg-neutral-background border-t border-neutral-border-bold"
          style={{ minWidth: getColSize?.(`dim-${dim.dimensionId}`) }}
        >
          <DistributionCell
            distribution={distributions[dim.name]}
            totalAnnotations={totalAnnotations}
            isExpanded={isExpanded}
            labelColors={dimensionLabelColors?.get(dim.name)}
          />
        </td>
      ))}
    </tr>
  );
};
