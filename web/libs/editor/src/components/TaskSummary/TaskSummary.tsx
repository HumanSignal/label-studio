import type { MSTAnnotation, MSTStore } from "../../stores/types";
import { DataSummary } from "./DataSummary";
import { LabelingSummary } from "./LabelingSummary";
import { NumbersSummary } from "./NumbersSummary";
import type { ObjectTypes } from "./types";
import { buildControlsList, buildObjectDataTypes } from "./utils";

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

  const controls = buildControlsList(allTags);
  const dataTypes: ObjectTypes = buildObjectDataTypes(allTags);

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
};

export default TaskSummary;
