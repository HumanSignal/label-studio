import { JSONPath } from "jsonpath-plus";
import capitalize from "lodash/capitalize";
import type { RawResult } from "../../stores/types";
import { Chip } from "./Chip";
import type { RendererType } from "./types";
import { getLabelCounts } from "./utils";

/**
 * Convert a JSONPath string to a human-readable column title.
 * @param jsonPath - JSONPath string (e.g., "$.details.category")
 * @returns Human-readable title (e.g., "Details / Category")
 */
export const jsonPathToTitle = (jsonPath: string): string => {
  return (
    jsonPath
      .replace(/^\$\.?/, "") // Remove leading $. or $
      .replace(/\[\*\]/g, "") // Remove array wildcards
      .split(".")
      .filter(Boolean)
      .map(capitalize)
      .join(" / ") || "Value"
  );
};

const resultValue = (result: RawResult) => {
  if (result.type === "textarea") {
    return result.value.text;
  }

  return result.value[result.type];
};

const LabelsRenderer: RendererType = (results, control) => {
  const labels = results.flatMap(resultValue).flat();

  if (!labels.length) return null;

  const labelCounts = getLabelCounts(labels, control.label_attrs);

  return (
    <span className="flex gap-tighter flex-wrap">
      {Object.entries(labelCounts)
        .filter(([_, data]) => data.count > 0)
        .map(([label, data]) => {
          return (
            <Chip key={label} prefix={data.count} colors={data} thickBorder>
              {label}
            </Chip>
          );
        })}
    </span>
  );
};

export const renderers: Record<string, RendererType> = {
  labels: LabelsRenderer,
  ellipselabels: LabelsRenderer,
  polygonlabels: LabelsRenderer,
  vectorlabels: LabelsRenderer,
  rectanglelabels: LabelsRenderer,
  keypointlabels: LabelsRenderer,
  brushlabels: LabelsRenderer,
  hypertextlabels: LabelsRenderer,
  timeserieslabels: LabelsRenderer,
  paragraphlabels: LabelsRenderer,
  timelinelabels: LabelsRenderer,
  bitmasklabels: LabelsRenderer,
  ocrlabels: LabelsRenderer,
  datetime: (results, control) => {
    if (!results.length) return null;
    if (control.per_region) return null;

    return <span className="text-sm font-mono">{resultValue(results[0])}</span>;
  },
  number: (results, control) => {
    if (!results.length) return null;
    if (control.per_region) return null;

    return <span className="text-sm font-mono font-semibold">{resultValue(results[0])}</span>;
  },
  choices: (results, control) => {
    const choices = results.flatMap(resultValue).flat();
    const unique: string[] = [...new Set(choices)];

    if (!choices.length) return null;

    return (
      <span className="flex gap-tighter flex-wrap">
        {unique.map((choice) => (
          <Chip
            key={choice}
            colors={{
              background: control.label_attrs[choice]?.background,
            }}
          >
            {choice}
          </Chip>
        ))}
      </span>
    );
  },
  taxonomy: (results, control) => {
    if (!results.length) return null;
    if (control.per_region) return null;

    // @todo use `pathseparator` from control
    const values: string[] = resultValue(results[0]).map((item: string[]) => item.join(" / "));

    return (
      <span className="flex gap-tighter flex-wrap">
        {values.map((value) => (
          <Chip key={value}>{value}</Chip>
        ))}
      </span>
    );
  },
  textarea: (results, control) => {
    if (!results.length) return null;
    if (control.per_region) return null;

    const texts: string[] = resultValue(results[0]);

    if (!texts) return null;

    // biome-ignore lint/suspicious/noArrayIndexKey: this piece won't be rerendered with updated data anyway and texts can be huge
    return (
      <div className="text-sm text-ellipsis line-clamp-6 space-y-1">
        {texts.map((text, i) => (
          <p key={i} className="break-words">
            {text}
          </p>
        ))}
      </div>
    );
  },
  ranker: (results) => {
    if (!results.length) return null;

    const value: Record<string, number[]> = resultValue(results[0]);

    return (
      <div className="space-y-1.5">
        {Object.entries(value).map(([bucket, items]) => {
          return (
            <div key={bucket} className="text-sm">
              <span className="font-semibold">{bucket}</span>:{" "}
              <span className="inline-flex gap-tighter flex-wrap">
                {items.map((item) => (
                  <Chip key={item}>{item}</Chip>
                ))}
              </span>
            </div>
          );
        })}
      </div>
    );
  },
  rating: (results, control) => {
    if (!results.length) return null;
    if (control.per_region) return null;

    const value = resultValue(results[0]);

    if (!value) return null;

    return <span className="text-lg text-yellow-500">{"★".repeat(value)}</span>;
  },
  reactcode: (results, control) => {
    if (!results.length) return null;

    const MAX_CHIPS = 10;
    const MAX_TEXT_LENGTH = 30;

    // Extract values from all results using JSONPath
    const jsonPath = control.name;
    const extractedValues: unknown[] = [];

    for (const result of results) {
      const fullValue = result.value?.reactcode;
      if (!fullValue) continue;

      const extracted = JSONPath({ path: jsonPath, json: fullValue, wrap: false });
      if (extracted !== undefined && extracted !== null) {
        extractedValues.push(extracted);
      }
    }

    if (extractedValues.length === 0) {
      return <span className="text-neutral-content-subtler text-sm">—</span>;
    }

    // Helper to truncate text
    const truncate = (text: string) => {
      if (text.length <= MAX_TEXT_LENGTH) return text;
      return `${text.slice(0, MAX_TEXT_LENGTH)}…`;
    };

    // Helper to format value for display
    const formatValue = (value: unknown) => (typeof value === "object" ? JSON.stringify(value) : String(value));

    // Single result - display with original formatting logic
    if (extractedValues.length > 1) {
      // Multiple results - group by value
      const groupped: Record<string, unknown[]> = Object.groupBy(extractedValues, formatValue);

      // Check if all groups have exactly 1 item (all unique)
      const allUnique = Object.values(groupped).every((values) => values.length === 1);

      // Sort by count descending; for unique values, keep the original order
      const sortedGroups = allUnique
        ? extractedValues.map((value): [string, unknown[]] => [formatValue(value), [value]])
        : Object.entries(groupped).sort((a, b) => b[1].length - a[1].length);

      const visibleGroups = sortedGroups.length > MAX_CHIPS ? sortedGroups.slice(0, MAX_CHIPS - 1) : sortedGroups;
      const hiddenCount = sortedGroups.length - visibleGroups.length;

      return (
        <span className="flex gap-tighter flex-wrap">
          {visibleGroups.map(([key, values]) => (
            <Chip key={key} prefix={allUnique ? undefined : values.length}>
              {truncate(key)}
            </Chip>
          ))}
          {hiddenCount > 0 && <span className="text-neutral-content-subtle text-sm">+{hiddenCount} more</span>}
        </span>
      );
    }

    const extracted = extractedValues[0];

    // Format the value based on its type
    if (typeof extracted === "boolean") {
      return <span className="text-sm font-mono">{extracted ? "true" : "false"}</span>;
    }

    if (typeof extracted === "number") {
      return <span className="text-sm font-mono font-semibold">{extracted}</span>;
    }

    if (typeof extracted === "string") {
      return (
        <div className="text-sm text-ellipsis line-clamp-3 break-words">
          <p>{extracted}</p>
        </div>
      );
    }

    // For arrays, show chips
    if (Array.isArray(extracted)) {
      return (
        <span className="flex gap-tighter flex-wrap">
          {extracted.slice(0, 5).map((item, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static content, won't be reordered
            <Chip key={i}>{typeof item === "object" ? JSON.stringify(item) : String(item)}</Chip>
          ))}
          {extracted.length > 5 && (
            <span className="text-neutral-content-subtle text-sm">+{extracted.length - 5} more</span>
          )}
        </span>
      );
    }

    // Object fallback
    return <span className="text-sm font-mono">{JSON.stringify(extracted)}</span>;
  },
};
