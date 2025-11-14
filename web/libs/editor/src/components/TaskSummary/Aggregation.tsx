import { cnm } from "@humansignal/ui";
import type { RawResult } from "../../stores/types";
import { Chip } from "./Chip";
import type { AnnotationSummary, ControlTag } from "./types";
import { getLabelCounts } from "./utils";

const resultValue = (result: RawResult) => {
  if (result.type === "textarea") {
    return result.value.text;
  }
  return result.value[result.type];
};

export const AggregationRow = ({
  control,
  annotations,
  countEmpty,
  isExpanded,
}: { control: ControlTag; annotations: AnnotationSummary[]; countEmpty: boolean; isExpanded: boolean }) => {
  const allResults = annotations.flatMap((ann) => ann.results.filter((r) => r.from_name === control.name));

  if (!allResults.length) {
    return <span className="text-neutral-content-subtler text-xs italic">No data</span>;
  }

  const totalAnnotations = countEmpty ? annotations.length : allResults.length;

  // Handle labels-type controls
  if (control.type.endsWith("labels")) {
    const allLabels = allResults.flatMap((r) => resultValue(r)).flat();
    const labelCounts = getLabelCounts(allLabels, control.label_attrs);

    // Sort by count descending
    const sortedLabels = Object.entries(labelCounts)
      .filter(([_, data]) => data.count > 0)
      .sort(([, a], [, b]) => b.count - a.count);

    return (
      <div className={cnm("text-ellipsis", !isExpanded && "line-clamp-2")}>
        {sortedLabels.map(([label, data]) => {
          return (
            <Chip
              key={label}
              prefix={data.count}
              colors={{
                background: data.background,
                border: data.border,
                color: data.color || data.border,
              }}
              className="mr-tighter mb-tighter"
              thickBorder
            >
              {label}
            </Chip>
          );
        })}
      </div>
    );
  }

  // Handle pairwise; they are similar to choices but produce only `left` or `right` values
  if (control.type === "pairwise") {
    const allPairwise = allResults.flatMap((r) => resultValue(r)).flat();
    const pairwiseCounts: Record<string, number> = {};

    allPairwise.forEach((pairwise) => {
      pairwiseCounts[pairwise] = (pairwiseCounts[pairwise] || 0) + 1;
    });
    const sortedPairwise = Object.entries(pairwiseCounts).sort(([, a], [, b]) => b - a);

    return (
      <div className={cnm("text-ellipsis", !isExpanded && "line-clamp-2")}>
        {sortedPairwise.map(([pairwise, count]) => {
          return (
            <Chip key={pairwise} prefix={count} className="mr-tighter mb-tighter">
              {pairwise}
            </Chip>
          );
        })}
      </div>
    );
  }

  // Handle choices
  if (control.type === "choices") {
    const allChoices = allResults.flatMap((r) => resultValue(r)).flat();
    const choiceCounts: Record<string, number> = {};

    allChoices.forEach((choice) => {
      choiceCounts[choice] = (choiceCounts[choice] || 0) + 1;
    });

    const sortedChoices = Object.entries(choiceCounts).sort(([, a], [, b]) => b - a);

    return (
      <div className={cnm("text-ellipsis", !isExpanded && "line-clamp-2")}>
        {sortedChoices.map(([choice, count]) => {
          return (
            <Chip
              key={choice}
              prefix={count}
              colors={{ background: control.label_attrs[choice]?.background }}
              className="mr-tighter mb-tighter"
            >
              {choice}
            </Chip>
          );
        })}
      </div>
    );
  }

  // Handle taxonomy
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
        {sortedPaths.map(([path, count]) => {
          return (
            <Chip key={path} prefix={count} className="mr-tighter mb-tighter">
              {path}
            </Chip>
          );
        })}
      </div>
    );
  }

  // Handle rating
  if (control.type === "rating") {
    const ratings = allResults.map((r) => resultValue(r)).filter(Boolean);
    if (!ratings.length) return <span className="text-neutral-content-subtler text-xs italic">No ratings</span>;

    const avgRating = ratings.reduce((sum, val) => sum + val, 0) / (countEmpty ? totalAnnotations : ratings.length);
    return (
      <span className="text-sm font-medium text-neutral-content-subtle">
        Avg: <span className="font-bold">{avgRating.toFixed(1)}</span> <span className="text-yellow-500">★</span>
      </span>
    );
  }

  // Handle number
  if (control.type === "number") {
    const numbers = allResults.map((r) => resultValue(r)).filter((v) => v !== null && v !== undefined);
    if (!numbers.length) return <span className="text-neutral-content-subtler text-xs italic">No data</span>;

    const avg = numbers.reduce((sum, val) => sum + Number(val), 0) / (countEmpty ? totalAnnotations : numbers.length);
    return (
      <span className="text-sm font-medium text-neutral-content-subtle">
        Avg: <span className="font-bold">{avg.toFixed(1)}</span>
      </span>
    );
  }

  // Default: show N/A
  return <span className="text-sm font-medium text-neutral-content-subtler">N/A</span>;
};
