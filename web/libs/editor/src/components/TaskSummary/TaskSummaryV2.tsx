/**
 * LSE override of TaskSummary — Agreement Explorer Dashboard (V2)
 *
 * MST adapter around `TaskSummaryDashboard`: it resolves the task, labeling
 * config metadata and navigation callbacks out of the annotation store and
 * hands them to the store-agnostic dashboard, which does all the rendering.
 *
 * NOTE: The default export is named `TaskSummary` (not `TaskSummaryV2`) so
 * that ViewAll.tsx can swap V1/V2 via a feature flag without changing the
 * JSX element name.
 */

import { useCallback, useMemo } from "react";
import type { MSTAnnotation, MSTStore } from "../../stores/types";
import { TaskSummaryDashboard } from "./TaskSummaryDashboard";
import type { LabelColors, ObjectTypes } from "./types";
import { buildControlsList, buildObjectDataTypes } from "./utils";

// ---------------------------------------------------------------------------
// Props (same as OSS TaskSummary)
// ---------------------------------------------------------------------------

type TaskSummaryProps = {
  annotations: MSTAnnotation[];
  store: MSTStore["annotationStore"];
  /** When true, predictions participate in agreement metrics, table rows, and distributions. */
  includePredictions?: boolean;
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

const TaskSummary = ({
  annotations: allAnnotations,
  store: annotationStore,
  includePredictions = false,
}: TaskSummaryProps) => {
  const storeTask = annotationStore.store.task;
  const hideInfo = annotationStore.store.hasInterface("annotations:hide-info");

  // Submitted annotations and predictions with a database pk — used for click-to-navigate.
  const navigableAnnotations = allAnnotations.filter((a) => a.pk && (a.type !== "prediction" || includePredictions));
  const allTags = [...annotationStore.names];

  const handleAnnotationClick = useCallback(
    (annotationPk: number) => {
      const match = navigableAnnotations.find((a) => String(a.pk) === String(annotationPk));
      if (!match) return;
      if (match.type === "prediction") {
        annotationStore.selectPrediction(match.id, { exitViewAll: true });
      } else {
        annotationStore.selectAnnotation(match.id, { exitViewAll: true });
      }
    },
    [navigableAnnotations, annotationStore],
  );

  // Build control tags and data types
  const controls = buildControlsList(allTags);
  const dataTypes: ObjectTypes = buildObjectDataTypes(allTags);

  // Label colors keyed by control name (= dimension name) for the agreement dashboard
  const dimensionLabelColors = useMemo(() => {
    const map = new Map<string, Record<string, LabelColors>>();
    for (const control of controls) {
      if (Object.keys(control.label_attrs).length > 0) {
        map.set(control.name, control.label_attrs);
      }
    }
    return map;
  }, [controls]);

  const taskId = storeTask?.id;
  const projectId = annotationStore.store?.project?.id ?? window.DM?.project?.id;

  return (
    <TaskSummaryDashboard
      taskId={taskId}
      projectId={projectId}
      hideInfo={hideInfo}
      includePredictions={includePredictions}
      dataTypes={dataTypes}
      dimensionLabelColors={dimensionLabelColors}
      onAnnotationClick={handleAnnotationClick}
      autoReviewAnnotations={navigableAnnotations}
    />
  );
};

export default TaskSummary;
