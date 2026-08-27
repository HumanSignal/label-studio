import { useQuery } from "@tanstack/react-query";
import { observer } from "mobx-react";
import { FF_FIT_720_LAZY_LOAD_ANNOTATIONS } from "@humansignal/core/lib/utils/feature-flags";
import { isFF } from "../../utils/feature-flags";
import type { MSTAnnotation, MSTControlTag, MSTStore } from "../../stores/types";
import { emitAnnotationTabSelected } from "../../utils/labelingTelemetry";
import { fetchTaskAgreementDistribution } from "./Aggregation";
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

const TaskSummary = observer(({ annotations: all, store: annotationStore }: TaskSummaryProps) => {
  const task = annotationStore.store.task;
  const taskId = task?.id;
  // Use editor `isFF` (reads `APP_SETTINGS` live) so unit tests can toggle the flag; core `isActive` snapshots flags at import time.
  const agreementQueryEnabled = isFF(FF_FIT_720_LAZY_LOAD_ANNOTATIONS) && taskId != null;

  const { data: agreementPayload, isFetching: agreementQueryFetching } = useQuery({
    queryKey: ["task-agreement", taskId],
    queryFn: () => fetchTaskAgreementDistribution(taskId as number | string),
    enabled: agreementQueryEnabled,
    staleTime: 30000,
    cacheTime: 5 * 60 * 1000,
  });

  /** First fetch for this task — show skeletons; avoid flashing stale `task.agreement` before `/agreement/` returns. */
  const agreementHeadlineLoading = agreementQueryEnabled && agreementQueryFetching;

  // skip unsubmitted drafts
  const annotations = all.filter((a) => a.pk);
  const allTags = [...annotationStore.names];

  const onSelect = (entity: Annotation) => {
    const previous = annotationStore.selected;
    if (entity.type === "annotation") {
      annotationStore.selectAnnotation(entity.id, { exitViewAll: true });
    } else {
      annotationStore.selectPrediction(entity.id, { exitViewAll: true });
    }
    const liveEntity = all.find((a) => String(a.id) === String(entity.id));
    if (liveEntity) {
      emitAnnotationTabSelected(annotationStore.store, liveEntity, previous, { exitViewAll: true });
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

  // Add pseudo-controls for ReactCode dimensions
  // ReactCode tags are object tags that can have dimensions defined via outputs schema
  const reactcodeTags = allTags.filter(([_, tag]) => tag.type === "reactcode") as [string, any][];
  for (const [tagName, tag] of reactcodeTags) {
    const dimensions: string[] = tag.dimensions ?? [];
    for (const dimension of dimensions) {
      controlsList.push({
        name: dimension, // JSONPath used to extract value
        type: "reactcode",
        to_name: tagName, // Reference to the ReactCode tag
        label_attrs: {},
        per_region: false,
      });
    }
  }
  // place all controls with the same to_name together
  const grouped = Object.groupBy(controlsList, (control) => control.to_name);
  // show global classifications first, then labels, then per-regions
  const controls = Object.entries(grouped).flatMap(([_, controls]) => sortControls(controls ?? []));

  const objectTags: ObjectTagEntry[] = allTags.filter(
    ([_, tag]) => tag.isObjectTag && (tag.value?.includes("$") || tag.valueList?.includes("$") || tag.loadedData),
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

  const agreementFromQuery = agreementPayload?.agreement;

  const roundAgreementDisplay = (n: number) => Math.round(n * 100) / 100;

  const agreementPercent = agreementHeadlineLoading
    ? undefined
    : typeof agreementFromQuery === "number"
      ? agreementFromQuery
      : typeof task?.agreement === "number"
        ? task.agreement
        : undefined;

  const taskAgreementNum = typeof task?.agreement === "number" ? task.agreement : undefined;
  const endpointAgreementNum = typeof agreementFromQuery === "number" ? agreementFromQuery : undefined;
  const agreementTaskAndEndpointDiffer =
    agreementQueryEnabled &&
    !agreementHeadlineLoading &&
    taskAgreementNum !== undefined &&
    endpointAgreementNum !== undefined &&
    roundAgreementDisplay(taskAgreementNum) !== roundAgreementDisplay(endpointAgreementNum);

  const agreementMismatchTooltip =
    "The task API and agreement endpoint currently show different scores; they should align after background processing finishes.";

  const annotationCount = annotations.filter((a) => a.type === "annotation").length;
  const predictionCount = annotations.filter((a) => a.type === "prediction").length;

  const values = [
    // if agreement is unavailable for current user it's undefined
    ...(agreementHeadlineLoading || typeof agreementPercent === "number"
      ? [
          {
            title: "Agreement",
            loading: agreementHeadlineLoading,
            // 2 decimals but without trailing zeros
            value: agreementHeadlineLoading ? "" : `${roundAgreementDisplay(agreementPercent as number)}%`,
            info: "Overall agreement over all submitted annotations",
            valueWarningTooltip: agreementTaskAndEndpointDiffer ? agreementMismatchTooltip : undefined,
          },
        ]
      : []),
    {
      title: "Annotations",
      loading: agreementHeadlineLoading,
      value: agreementHeadlineLoading ? 0 : annotationCount,
      info: "Number of submitted annotations. Table shows only submitted results, not current drafts.",
    },
    {
      title: "Predictions",
      loading: agreementHeadlineLoading,
      value: agreementHeadlineLoading ? 0 : predictionCount,
      info: "Number of predictions. They are not included in the agreement calculation.",
    },
  ];

  return (
    <div>
      <div className="mb-base">
        <h2 className="mt-base text-headline-small font-semibold text-neutral-content">Task Summary</h2>
        <NumbersSummary values={values} />
      </div>
      <div className="mb-relaxed">
        <LabelingSummary
          annotations={annotations}
          controls={controls}
          onSelect={onSelect}
          hideInfo={annotationStore.store.hasInterface("annotations:hide-info")}
          taskId={task?.id}
        />
      </div>
      <div className="mb-relaxed">
        <h2 className="mb-base text-headline-small font-semibold text-neutral-content">Task Data</h2>
        <DataSummary data_types={dataTypes} />
      </div>
    </div>
  );
});

export default TaskSummary;
