/**
 * LSE override of TaskSummary — Agreement Explorer Dashboard (V2)
 *
 * Replaces the OSS TaskSummary with a full agreement analysis dashboard
 * when dimension agreement data is available. Falls back to the OSS
 * LabelingSummary layout when no agreement data exists (e.g. no dimensions
 * configured for the project, or the API call fails).
 *
 * V2 adds Ground Truth Mode — an adjudication workflow that lets reviewers
 * build ground truth annotations from the dashboard.
 *
 * NOTE: The default export is named `TaskSummary` (not `TaskSummaryV2`) so
 * that ViewAll.tsx can swap V1/V2 via a feature flag without changing the
 * JSX element name.
 */

import { useCallback, useMemo } from "react";
import type { MSTAnnotation, MSTStore } from "../../stores/types";
import { DataSummary } from "./DataSummary";
import { LabelingSummary } from "./LabelingSummary";
import { NumbersSummary } from "./NumbersSummary";
import type { ObjectTypes } from "./types";
import { buildControlsList, buildObjectDataTypes } from "./utils";
import { useLocalStorage } from "@/utils/hooks";

// Agreement dashboard components
import { AnnotatorsDimensionsTable } from "./agreement-dashboard/annotators-dimensions-table";
import { ColumnPicker } from "./agreement-dashboard/column-picker";
import { useTaskSummaryData } from "./agreement-dashboard/use-task-summary-data";

// Ground Truth Mode
import { useGroundTruth } from "./agreement-dashboard/use-ground-truth";
import { useEffectiveGroundTruth } from "./agreement-dashboard/use-effective-ground-truth";
import { TaskSummaryControlPanel } from "./agreement-dashboard/task-summary-control-panel";
import { openCommitGroundTruthDialog, commitGroundTruth } from "./agreement-dashboard/commit-ground-truth-dialog";
import { openAutoReviewDialog } from "./agreement-dashboard/auto-review-dialog";

import { CollapsiblePanel, Message } from "@humansignal/ui";

// ---------------------------------------------------------------------------
// Props (same as OSS TaskSummary)
// ---------------------------------------------------------------------------

type TaskSummaryProps = {
  annotations: MSTAnnotation[];
  store: MSTStore["annotationStore"];
};

interface SelectableEntity {
  id: string | number;
  type: "annotation" | "prediction";
}

// ---------------------------------------------------------------------------
// Skeleton placeholder for loading state
// ---------------------------------------------------------------------------

const DashboardSkeleton = () => (
  <div className="space-y-base animate-pulse">
    <div className="h-48 bg-neutral-surface-subtle rounded-small" />
    <div className="h-24 bg-neutral-surface-subtle rounded-small" />
  </div>
);

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

const TaskSummary = ({ annotations: allAnnotations, store: annotationStore }: TaskSummaryProps) => {
  const storeTask = annotationStore.store.task;
  const hideInfo = annotationStore.store.hasInterface("annotations:hide-info");

  // Annotations with a database pk — used only for click-to-navigate and
  // the LabelingSummary fallback path (no data derivation).
  const navigableAnnotations = allAnnotations.filter((a) => a.pk);
  const allTags = [...annotationStore.names];

  const selectEntity = (entity: SelectableEntity) => {
    if (entity.type === "annotation") {
      annotationStore.selectAnnotation(entity.id, { exitViewAll: true });
    } else {
      annotationStore.selectPrediction(entity.id, { exitViewAll: true });
    }
  };

  const handleAnnotationClick = useCallback(
    (annotationPk: number) => {
      const match = navigableAnnotations.find((a) => String(a.pk) === String(annotationPk));
      if (match) {
        annotationStore.selectAnnotation(match.id, { exitViewAll: true });
      }
    },
    [navigableAnnotations, annotationStore],
  );

  // Build control tags and data types for the LabelingSummary fallback
  const controls = buildControlsList(allTags);
  const dataTypes: ObjectTypes = buildObjectDataTypes(allTags);

  // ---------------------------------------------------------------------------
  // Dashboard state (persisted in localStorage)
  // ---------------------------------------------------------------------------

  const taskId = storeTask?.id;

  const [taskDataExpanded, setTaskDataExpanded] = useLocalStorage<boolean>(
    "annotation_dashboard_task_data_expanded",
    false,
  );

  const [visibleColumnIds, setVisibleColumnIds] = useLocalStorage<number[] | null>(
    `annotation_dashboard_columns_${taskId}`,
    null,
  );

  // ---------------------------------------------------------------------------
  // Fetch and derive agreement data (all read-only data comes from the API)
  // ---------------------------------------------------------------------------

  const agreementData = useTaskSummaryData({
    taskId,
    conflictFilter: "custom",
    visibleColumnIds,
    hideInfo,
  });

  const method = agreementData.agreementMethodology;

  const effectiveVisibleColumnIds = useMemo(() => {
    if (visibleColumnIds !== null) return visibleColumnIds;
    return agreementData.categoricalDimensions.map((d) => d.dimensionId);
  }, [visibleColumnIds, agreementData.categoricalDimensions]);

  // ---------------------------------------------------------------------------
  // Non-categorical dimension detection
  // ---------------------------------------------------------------------------

  const hasNonCategoricalDimensions = agreementData.nonCategoricalDimensions.length > 0;

  const nonCategoricalDimensionNames = useMemo(() => {
    const names = agreementData.nonCategoricalDimensions.map((d) => d.name);
    const shown = names.slice(0, 3);
    const remaining = names.length - shown.length;
    return remaining > 0 ? `${shown.join(", ")} (+${remaining} more)` : shown.join(", ");
  }, [agreementData.nonCategoricalDimensions]);

  // ---------------------------------------------------------------------------
  // Ground Truth Mode
  // ---------------------------------------------------------------------------

  const groundTruth = useGroundTruth({
    taskId,
    dimensions: agreementData.categoricalDimensions,
    dimensionScores: agreementData.dimensionScores,
    annotators: agreementData.annotators,
  });

  const {
    existingGtAnnotationIndex,
    hasExistingGt,
    existingGtAnnotatorName,
    effectiveGtCells,
    effectiveResolvedCount,
    effectiveProgress,
    effectiveIsComplete,
    effectiveSummary,
    existingGtObject,
    groundTruthStatus,
  } = useEffectiveGroundTruth({ agreementData, groundTruth, hasNonCategoricalDimensions });

  const gtReadOnly = hasExistingGt || hasNonCategoricalDimensions;

  // ---------------------------------------------------------------------------
  // Ground Truth actions
  // ---------------------------------------------------------------------------

  const handleRevertToSuggestion = useCallback(() => {
    groundTruth.actions.reset();
  }, [groundTruth.actions]);

  const handleClearAllValues = useCallback(() => {
    groundTruth.actions.clearAllCells();
  }, [groundTruth.actions]);

  const handleCreateGroundTruth = useCallback(() => {
    if (!taskId) return;
    openCommitGroundTruthDialog({
      taskId,
      cells: effectiveGtCells,
      summary: effectiveSummary,
      annotations: agreementData.summaryAnnotations,
      dimensions: agreementData.filteredDimensions,
      annotators: agreementData.annotators,
      onCommit: (payload) => {
        commitGroundTruth(payload, () => {
          groundTruth.actions.clearOnCommit();
          window.localStorage.setItem("annotation-store-viewing-all", "false");
          window.location.reload();
        }).catch((err) => {
          console.error("[Ground Truth] Commit failed:", err);
        });
      },
    });
  }, [taskId, effectiveGtCells, effectiveSummary, groundTruth.actions, agreementData.summaryAnnotations, agreementData.filteredDimensions, agreementData.annotators]);

  const handleAutoReview = useCallback(() => {
    if (!taskId || !existingGtObject) return;
    openAutoReviewDialog({
      taskId,
      existingGt: existingGtObject,
      annotations: navigableAnnotations,
      // BUSINESS RULE: Must use all categorical dimensions, never the UI-filtered subset.
      // Column visibility is a display preference; hidden mismatches are still real.
      dimensions: agreementData.categoricalDimensions,
      // annotation_ids maps each position i to a unique annotation DB ID,
      // letting the comparison logic avoid user-ID collisions (same user
      // can appear multiple times in the agreement arrays).
      annotationIds: agreementData.agreementResult?.annotation_ids ?? [],
      onCommit: () => {
        window.location.reload();
      },
    });
  }, [taskId, existingGtObject, navigableAnnotations, agreementData.categoricalDimensions, agreementData.agreementResult]);

  // ---------------------------------------------------------------------------
  // NumbersSummary cards
  // ---------------------------------------------------------------------------

  const summaryCards = useMemo(() => {
    const cards: { title: string; value: number | string; info: string }[] = [];

    if (agreementData.overallAgreement !== null) {
      cards.push({
        title: `Agreement (${method})`,
        value: `${(agreementData.overallAgreement * 100).toFixed(1)}%`,
        info: `Overall ${method} agreement across all dimensions`,
      });
    } else if (typeof agreementData.task?.agreement === "number") {
      cards.push({
        title: "Agreement",
        value: `${Math.round(agreementData.task.agreement * 100) / 100}%`,
        info: "Overall agreement over all submitted annotations",
      });
    }

    cards.push({
      title: "Annotations",
      value: agreementData.apiResponse?.total_annotations ?? 0,
      info: "Number of submitted annotations. Table shows only submitted results, not current drafts.",
    });

    cards.push({
      title: "Predictions",
      value: agreementData.apiResponse?.total_predictions ?? 0,
      info: "Number of predictions. They are not included in the agreement calculation.",
    });

    if (agreementData.conflictCount > 0) {
      cards.push({
        title: "Conflicts",
        value: `${agreementData.conflictCount} / ${agreementData.dimensionScores.length}`,
        info: "Number of dimensions with less than perfect agreement",
      });
    }

    return cards;
  }, [agreementData, method]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div>
      <div className="mt-base mb-base">
        <NumbersSummary values={summaryCards} />
      </div>

      {agreementData.isLoading ? (
        <div className="mb-relaxed">
          <DashboardSkeleton />
        </div>
      ) : agreementData.hasAgreementData ? (
        <div className="mb-relaxed">
          <section className="mb-base">
            <div className="flex items-center mb-tight gap-tight">
              {hasNonCategoricalDimensions && (
                <Message variant="info" size="small">
                  Non-categoricals: {nonCategoricalDimensionNames}. Adjudication is not available on this screen.
                </Message>
              )}
              <div className="ml-auto flex items-center shrink-0">
                <ColumnPicker
                  totalDimensionCount={agreementData.dimensions.length}
                  shownCount={agreementData.filteredDimensions.length}
                  allDimensions={agreementData.dimensions}
                  visibleColumnIds={effectiveVisibleColumnIds}
                  onVisibleColumnsChange={setVisibleColumnIds}
                  conflictingDimensionIds={agreementData.conflictingDimensionIds}
                  hasNonCategoricalDimensions={hasNonCategoricalDimensions}
                />
              </div>
            </div>

            <AnnotatorsDimensionsTable
              dimensions={agreementData.filteredDimensions}
              annotators={agreementData.annotators}
              annotationForRow={agreementData.annotationForRow}
              onAnnotationClick={handleAnnotationClick}
              dimensionScores={agreementData.dimensionScores}
              inferredValues={agreementData.inferredValues}
              groundTruthCells={effectiveGtCells}
              groundTruthValueCounts={groundTruth.valueCounts}
              onSetGroundTruthCell={groundTruth.actions.setCell}
              onClearGroundTruthCell={groundTruth.actions.clearCell}
              excludeAnnotatorIndex={existingGtAnnotationIndex}
              groundTruthAnnotatorName={existingGtAnnotatorName}
              groundTruthStatus={groundTruthStatus}
              groundTruthReadOnly={gtReadOnly}
              groundTruthDisabled={hasNonCategoricalDimensions && !hasExistingGt}
              agreementMethodology={method}
              onRevertToSuggestion={handleRevertToSuggestion}
              onClearAllValues={handleClearAllValues}
            />

            <TaskSummaryControlPanel
              isComplete={effectiveIsComplete}
              hasExistingGt={hasExistingGt}
              hasNonCategoricalDimensions={hasNonCategoricalDimensions}
              onCreateGroundTruth={handleCreateGroundTruth}
              onAutoReview={handleAutoReview}
            />
          </section>
        </div>
      ) : (
        <div className="mb-relaxed">
          <LabelingSummary
            annotations={navigableAnnotations}
            controls={controls}
            onSelect={selectEntity}
            hideInfo={hideInfo}
            taskId={taskId}
          />
        </div>
      )}

      {!agreementData.hasAgreementData && (
        <div className="mb-relaxed">
          <h2 className="mb-base text-headline-small font-semibold text-neutral-content">Task Data</h2>
          <DataSummary data_types={dataTypes} />
        </div>
      )}

      {agreementData.hasAgreementData && (
        <CollapsiblePanel title="Task Data" expanded={taskDataExpanded} onExpandedChange={setTaskDataExpanded} className="mb-base">
          {Object.keys(dataTypes).length === 0 ? (
            <div className="flex items-center justify-center py-relaxed text-neutral-content-subtle text-body-medium">
              No task data available
            </div>
          ) : (
            <div className="p-base">
              <DataSummary data_types={dataTypes} />
            </div>
          )}
        </CollapsiblePanel>
      )}
    </div>
  );
};

export default TaskSummary;
