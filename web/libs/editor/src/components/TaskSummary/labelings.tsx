import type { RawResult } from "../../stores/types";
import { Chip } from "./Chip";
import type { RendererType } from "./types";
import { getLabelCounts } from "./utils";

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
};
