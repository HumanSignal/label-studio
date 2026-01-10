import type { MSTAnnotation, MSTControlTag, MSTStore } from "../../stores/types";
import { DataSummary } from "./DataSummary";
import { LabelingSummary } from "./LabelingSummary";
import { NumbersSummary } from "./NumbersSummary";
import type { ControlTag, ObjectTagEntry, ObjectTypes } from "./types";
import { getLabelColors, sortControls } from "./utils";

type TaskSummaryProps = {
  annotations: MSTAnnotation[];
  store: MSTStore["annotationStore"];
};

interface Annotation {
  id: string | number;
  type: "annotation" | "prediction";
}

const TaskSummary = ({ annotations: all, store: annotationStore }: TaskSummaryProps) => {
  const task = annotationStore.store.task;
  // skip unsubmitted drafts
  const annotations = all.filter((a) => a.pk);
  const allTags = [...annotationStore.names];

  const onSelect = (entity: Annotation) => {
    if (entity.type === "annotation") {
      annotationStore.selectAnnotation(entity.id, { exitViewAll: true });
    } else {
      annotationStore.selectPrediction(entity.id, { exitViewAll: true });
    }
  };

  const controlTags: [string, MSTControlTag][] = allTags.filter(([_, control]) => control.isControlTag) as [
    string,
    MSTControlTag,
  ][];
  const controlsList: ControlTag[] = controlTags.map(([name, control]) => ({
    name,
    type: control.type,
    to_name: control.toname,
    label_attrs: getLabelColors(control),
    per_region: !!control.perregion,
  }));
  // place all controls with the same to_name together
  const grouped = Object.groupBy(controlsList, (control) => control.to_name);
  // show global classifications first, then labels, then per-regions
  const controls = Object.entries(grouped).flatMap(([_, controls]) => sortControls(controls ?? []));

  const objectTags: ObjectTagEntry[] = allTags.filter(
    ([_, tag]) => tag.isObjectTag && tag.value.includes("$"),
  ) as ObjectTagEntry[];
  const dataTypes: ObjectTypes = Object.fromEntries(
    objectTags.map(([name, object]) => [
      name,
      // most of tags has `updateValue()` method which resolves `value` and stores it in `_value`
      // Image tag uses `parsedValue` instead of `_value`
      // Pdf tag uses `_url` instead of `_value`
      // TimeSeries tag uses `dataObj` instead of `_value`, it's always an object {<channel name>: [array of values]}
      // for other tags with complex logic (like TimeSeries) we use `value` for now, which is not ideal
      {
        type: object.type,
        value:
          // @ts-expect-error parsedValue, dataObj and _url are very specific and not added to types
          object.loadedData ?? object.parsedValue ?? object.dataObj ?? object._url ?? object._value ?? object.value,
      },
    ]),
  );

  const values = [
    // if agreement is unavailable for current user it's undefined
    ...(typeof task?.agreement === "number"
      ? [
          {
            title: "Agreement",
            // 2 decimals but without trailing zeros
            value: `${Math.round(task.agreement * 100) / 100}%`,
            info: "Overall agreement over all submitted annotations",
          },
        ]
      : []),
    {
      title: "Annotations",
      value: annotations.filter((a) => a.type === "annotation").length,
      info: "Number of submitted annotations. Table shows only submitted results, not current drafts.",
    },
    {
      title: "Predictions",
      value: annotations.filter((a) => a.type === "prediction").length,
      info: "Number of predictions. They are not included in the agreement calculation.",
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-base">
        <h2 className="mb-base text-headline-small font-semibold text-neutral-content">Task Summary</h2>
        <NumbersSummary values={values} />
      </div>
      <div className="mb-relaxed">
        <LabelingSummary
          annotations={annotations}
          controls={controls}
          onSelect={onSelect}
          hideInfo={annotationStore.store.hasInterface("annotations:hide-info")}
        />
      </div>
      <div className="mb-relaxed">
        <h2 className="mb-base text-headline-small font-semibold text-neutral-content">Task Data</h2>
        <DataSummary data_types={dataTypes} />
      </div>
    </div>
  );
};

export default TaskSummary;
