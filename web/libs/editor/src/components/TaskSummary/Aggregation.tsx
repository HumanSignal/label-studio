import { useLayoutEffect, useRef, useState } from "react";
import { cnm, IconChevronDown } from "@humansignal/ui";
import type { Header } from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import type { RawResult } from "../../stores/types";
import { Chip } from "./Chip";
import type { AnnotationSummary, ControlTag } from "./types";
import { getLabelCounts } from "./utils";
import { isActive, FF_FIT_720_LAZY_LOAD_ANNOTATIONS } from "@humansignal/core/lib/utils/feature-flags";

import styles from "./TaskSummary.module.scss";

type DistributionData = {
  total_annotations: number;
  distributions: Record<
    string,
    {
      type: string;
      labels: Record<string, number>;
      average?: number;
      count?: number;
    }
  >;
};

const fetchDistribution = async (taskId: number | string): Promise<DistributionData> => {
  const response = await fetch(`/api/tasks/${taskId}/agreement/`);
  if (!response.ok) {
    throw new Error("Failed to load distribution");
  }
  return response.json();
};

const resultValue = (result: RawResult) => {
  if (result.type === "textarea") {
    return result.value.text;
  }
  return result.value[result.type];
};

/**
 * Renders the aggregated data for a single control tag in the distribution row.
 * Shows statistics like label counts, averages, or choices across all annotations.
 */
export const AggregationCell = ({
  control,
  annotations,
  isExpanded,
}: { control: ControlTag; annotations: AnnotationSummary[]; isExpanded: boolean }) => {
  const allResults = annotations.flatMap((ann) => ann.results.filter((r) => r.from_name === control.name));
  // Exclude predictions for percentage denominator to match backend TaskAgreementAPI
  const totalAnnotations = annotations.filter((a) => a.type === "annotation").length;

  if (!allResults.length) {
    return <span className="text-neutral-content-subtler text-xs italic">N/A</span>;
  }

  // Handle labels-type controls (rectanglelabels, polygonlabels, labels, etc.)
  if (control.type.endsWith("labels")) {
    const allLabels = allResults.flatMap((r) => resultValue(r)).flat();
    const labelCounts = getLabelCounts(allLabels, control.label_attrs);

    // Sort by count descending
    const sortedLabels = Object.entries(labelCounts)
      .filter(([_, data]) => data.count > 0)
      .sort(([, a], [, b]) => b.count - a.count);

    return (
      <div className={cnm("text-ellipsis", !isExpanded && "line-clamp-2")}>
        {sortedLabels.map(([label, data]) => (
          <Chip
            key={label}
            prefix={data.count}
            colors={{
              background: data.background,
              border: data.border,
              color: data.color,
            }}
            className="mr-tighter mb-tighter"
            thickBorder
          >
            {label}
          </Chip>
        ))}
      </div>
    );
  }

  // Handle pairwise; similar to choices but produce only `left` or `right` values
  if (control.type === "pairwise") {
    const allPairwise = allResults.flatMap((r) => resultValue(r)).flat();
    const pairwiseCounts: Record<string, number> = {};

    allPairwise.forEach((pairwise) => {
      pairwiseCounts[pairwise] = (pairwiseCounts[pairwise] || 0) + 1;
    });

    const sortedPairwise = Object.entries(pairwiseCounts).sort(([, a], [, b]) => b - a);

    return (
      <div className={cnm("text-ellipsis", !isExpanded && "line-clamp-2")}>
        {sortedPairwise.map(([pairwise, count]) => (
          <Chip key={pairwise} prefix={count} className="mr-tighter mb-tighter">
            {pairwise}
          </Chip>
        ))}
      </div>
    );
  }

  // Handle choices - show percentage of annotations that selected each choice
  if (control.type === "choices") {
    const allChoices = allResults.flatMap((r) => resultValue(r)).flat();
    const choiceCounts: Record<string, number> = {};

    allChoices.forEach((choice) => {
      choiceCounts[choice] = (choiceCounts[choice] || 0) + 1;
    });

    const sortedChoices = Object.entries(choiceCounts).sort(([, a], [, b]) => b - a);

    return (
      <div className={cnm("text-ellipsis", !isExpanded && "line-clamp-2")}>
        {sortedChoices.map(([choice, count]) => (
          <Chip
            key={choice}
            prefix={`${((count / totalAnnotations) * 100).toFixed(1)}%`}
            colors={{ background: control.label_attrs[choice]?.background }}
            className="mr-tighter mb-tighter"
          >
            {choice}
          </Chip>
        ))}
      </div>
    );
  }

  // Handle taxonomy - show leaf nodes with percentage
  if (control.type === "taxonomy") {
    const values = allResults.flatMap((r) => resultValue(r)?.map((r: string[]) => r.at(-1)));
    const pathCounts: Record<string, number> = {};

    values.filter(Boolean).forEach((path: string | string[]) => {
      const pathStr = Array.isArray(path) ? path.join(" / ") : path;
      pathCounts[pathStr] = (pathCounts[pathStr] || 0) + 1;
    });

    const sortedPaths = Object.entries(pathCounts).sort(([, a], [, b]) => b - a);

    return (
      <div className={cnm("text-ellipsis", !isExpanded && "line-clamp-2")}>
        {sortedPaths.map(([path, count]) => (
          <Chip
            key={path}
            prefix={`${((count / totalAnnotations) * 100).toFixed(1)}%`}
            className="mr-tighter mb-tighter"
          >
            {path}
          </Chip>
        ))}
      </div>
    );
  }

  // Handle rating - average over annotations that have a value (matches backend TaskAgreementAPI)
  if (control.type === "rating") {
    const ratings = allResults.map((r) => resultValue(r)).filter(Boolean);
    if (!ratings.length) return <span className="text-neutral-content-subtler text-xs italic">No ratings</span>;

    const avgRating = ratings.reduce((sum, val) => sum + val, 0) / ratings.length;
    return (
      <span className="text-sm font-medium text-neutral-content-subtle">
        Avg: <span className="font-bold">{avgRating.toFixed(1)}</span> <span className="text-yellow-500">★</span>
      </span>
    );
  }

  // Handle number - average over annotations that have a value (matches backend TaskAgreementAPI)
  if (control.type === "number") {
    const numbers = allResults.map((r) => resultValue(r)).filter((v) => v !== null && v !== undefined);
    if (!numbers.length) return <span className="text-neutral-content-subtler text-xs italic">No data</span>;

    const avg = numbers.reduce((sum, val) => sum + Number(val), 0) / numbers.length;
    return (
      <span className="text-sm font-medium text-neutral-content-subtle">
        Avg: <span className="font-bold">{avg.toFixed(1)}</span>
      </span>
    );
  }

  // Default: show N/A
  return <span className="text-neutral-content-subtler text-xs italic">N/A</span>;
};

const DistributionSkeleton = () => (
  <div className="flex items-center gap-2">
    <div className="h-5 w-16 bg-neutral-surface-subtle rounded animate-pulse" />
    <div className="h-5 w-12 bg-neutral-surface-subtle rounded animate-pulse" />
  </div>
);

const ApiAggregationCell = ({
  control,
  distribution,
  totalAnnotations,
  isExpanded,
}: {
  control: ControlTag;
  distribution?: { type: string; labels: Record<string, number>; average?: number; count?: number };
  totalAnnotations: number;
  isExpanded: boolean;
}) => {
  if (!distribution || Object.keys(distribution.labels).length === 0) {
    // Check if it's a numeric type with average
    if (distribution?.average !== undefined) {
      return (
        <span className="text-sm font-medium text-neutral-content-subtle">
          Avg: <span className="font-bold">{distribution.average.toFixed(1)}</span>
          {distribution.type === "rating" && <span className="text-yellow-500"> ★</span>}
        </span>
      );
    }
    return <span className="text-neutral-content-subtler text-xs italic">N/A</span>;
  }

  // Sort labels by count descending
  const sortedLabels = Object.entries(distribution.labels).sort(([, a], [, b]) => b - a);

  // Handle choices/taxonomy with percentages
  if (distribution.type === "choices" || distribution.type === "taxonomy") {
    return (
      <div className={cnm("text-ellipsis", !isExpanded && "line-clamp-2")}>
        {sortedLabels.map(([label, count]) => (
          <Chip
            key={label}
            prefix={`${((count / totalAnnotations) * 100).toFixed(1)}%`}
            colors={{ background: control.label_attrs[label]?.background }}
            className="mr-tighter mb-tighter"
          >
            {label}
          </Chip>
        ))}
      </div>
    );
  }

  // Handle labels and other types with counts
  return (
    <div className={cnm("text-ellipsis", !isExpanded && "line-clamp-2")}>
      {sortedLabels.map(([label, count]) => (
        <Chip
          key={label}
          prefix={count}
          colors={{
            background: control.label_attrs[label]?.background,
            border: control.label_attrs[label]?.border,
            color: control.label_attrs[label]?.color,
          }}
          className="mr-tighter mb-tighter"
          thickBorder={distribution.type.endsWith("labels")}
        >
          {label}
        </Chip>
      ))}
    </div>
  );
};

/**
 * Renders the complete aggregation/distribution row across all columns.
 * Includes a toggle button in the first cell that only appears when content overflows.
 * The toggle expands/collapses the cells to show full content.
 *
 * With lazy loading, fetches distribution from dedicated API endpoint
 * for efficient aggregation without N+1 queries.
 */
export const AggregationTableRow = ({
  headers,
  controls,
  annotations,
  taskId,
}: {
  headers: Header<AnnotationSummary, unknown>[];
  controls: ControlTag[];
  annotations: AnnotationSummary[];
  taskId?: number | string;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);
  const rowRef = useRef<HTMLTableRowElement>(null);

  // For non-lazy loading mode, compute from annotations as before
  const useApiData = isActive(FF_FIT_720_LAZY_LOAD_ANNOTATIONS) && taskId;

  const {
    data: distributionData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["task-agreement", taskId],
    queryFn: () => fetchDistribution(taskId!),
    enabled: useApiData && !!taskId,
    staleTime: 30000, // Consider data fresh for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes (formerly cacheTime)
  });

  useLayoutEffect(() => {
    if (!rowRef.current) return;

    const tr = rowRef.current;
    const hasOverflowingCells = [...tr.childNodes].some((td) => {
      const node = td as HTMLElement;
      return node.firstChild && (node.firstChild as HTMLElement).scrollHeight > tr.scrollHeight;
    });

    setHasOverflow(hasOverflowingCells);
  }, [annotations, controls, distributionData]);

  return (
    <tr ref={rowRef} className={cnm("relative z-2", styles["aggregation-row"])}>
      {headers.map((header, index) =>
        index === 0 ? (
          <td
            key={header.id}
            className={cnm(
              "px-4 py-2.5 overflow-hidden border-r border-r-neutral-border border-l border-y-2 border-neutral-border-bold bg-neutral-background",
              "sticky left-0 z-20",
            )}
            style={{ width: header.getSize() }}
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
              {/* Show total count from API */}
              {useApiData && distributionData && (
                <span className="text-xs text-neutral-content-subtle">
                  {distributionData.total_annotations} annotations
                </span>
              )}
            </div>
          </td>
        ) : (
          <td
            key={header.id}
            className="px-4 py-2.5 overflow-hidden border-y-2 border-neutral-border-bold"
            style={{ width: header.getSize() }}
          >
            {useApiData && isLoading ? (
              <DistributionSkeleton />
            ) : useApiData && error ? (
              <span className="text-neutral-content-subtler text-xs italic">Failed to load</span>
            ) : useApiData && distributionData ? (
              <ApiAggregationCell
                control={controls[index - 1]}
                distribution={distributionData.distributions[controls[index - 1]?.name]}
                totalAnnotations={distributionData.total_annotations}
                isExpanded={isExpanded}
              />
            ) : (
              <AggregationCell control={controls[index - 1]} annotations={annotations} isExpanded={isExpanded} />
            )}
          </td>
        ),
      )}
    </tr>
  );
};
