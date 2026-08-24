/**
 * Agreement Explorer Dashboard — store-agnostic rendering layer.
 *
 * Everything the dashboard needs arrives as plain props, so it can be mounted
 * both from the MST editor (see `TaskSummaryV2.tsx`) and from the Jotai
 * editor-shell used by Custom Interfaces. Read-only data is fetched through
 * `useTaskSummaryData`, whose transport is injectable for hosts that cannot
 * reach the authenticated API directly.
 *
 * Renders a full agreement analysis when dimension agreement data is
 * available. When none exists (no dimensions configured, only drafts present,
 * or the API call fails) it renders an "Agreement is not available" message
 * rather than falling back to the OSS LabelingSummary.
 */

import { useCallback, useMemo } from "react";
import { DataSummary } from "./DataSummary";
import { NumbersSummary } from "./NumbersSummary";
import type { LabelColors, ObjectTypes } from "./types";
import { useLocalStorage } from "../../hooks/useLocalStorage";

// Agreement dashboard components
import { AnnotatorsDimensionsTable } from "./agreement-dashboard/annotators-dimensions-table";
import { ColumnPicker } from "./agreement-dashboard/column-picker";
import { useTaskSummaryData } from "./agreement-dashboard/use-task-summary-data";
import type { TaskSummaryCurrentUser, TaskSummaryFetchers } from "./agreement-dashboard/use-task-summary-data";

// Ground Truth Mode
import { useGroundTruth } from "./agreement-dashboard/use-ground-truth";
import { useEffectiveGroundTruth } from "./agreement-dashboard/use-effective-ground-truth";
import { TaskSummaryControlPanel } from "./agreement-dashboard/task-summary-control-panel";
import type { ReviewStats } from "./agreement-dashboard/task-summary-control-panel";
import { openCommitGroundTruthDialog, commitGroundTruth } from "./agreement-dashboard/commit-ground-truth-dialog";
import { openAutoReviewDialog } from "./agreement-dashboard/auto-review-dialog";

import { CollapsiblePanel } from "@humansignal/ui";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

/** The subset of an annotation that Auto-Review needs to compare against ground truth. */
export type TaskSummaryAnnotationRef = {
  pk?: string | number | null;
  type?: string;
  user?: { id: number } | null;
};

export type TaskSummaryDashboardProps = {
  /** Database ID of the task being summarized. */
  taskId: number | string | undefined;
  /** Used to scope the persisted column-visibility preference. */
  projectId: number | string | undefined;
  /** Anonymizes annotator names ("Me" / "User N"). */
  hideInfo: boolean;
  /** When true, predictions participate in agreement metrics, table rows, and distributions. */
  includePredictions?: boolean;
  /** Task input data rendered in the "Task Data" panel. */
  dataTypes: ObjectTypes;
  /** Label colors keyed by dimension name, from the labeling config. */
  dimensionLabelColors: Map<string, Record<string, LabelColors>>;
  /** Falls back to `window.APP_SETTINGS.user` when omitted. */
  currentUser?: TaskSummaryCurrentUser | null;
  /** Invoked when an annotator row is clicked; hosts navigate to that annotation. */
  onAnnotationClick?: (annotationPk: number) => void;
  /** Overrides the direct `fetch` transport for the two read endpoints. */
  fetchers?: TaskSummaryFetchers;
  /**
   * Hides every Ground Truth write path: cell editing, the control panel
   * footer, Save Ground Truth and Auto-Review. A previously saved ground truth
   * annotation is still displayed, read-only.
   */
  readOnly?: boolean;
  /** Candidates for Auto-Review. Unused when `readOnly`. */
  autoReviewAnnotations?: TaskSummaryAnnotationRef[];
  /** Called after a Ground Truth commit or Auto-Review; defaults to a full page reload. */
  onDataInvalidated?: () => void;
};

// ---------------------------------------------------------------------------
// Skeleton placeholder for loading state
// ---------------------------------------------------------------------------

const DashboardSkeleton = () => (
  <div className="space-y-base animate-pulse">
    <div className="h-48 bg-neutral-surface-subtle rounded-small" />
    <div className="h-24 bg-neutral-surface-subtle rounded-small" />
  </div>
);

// Stable no-ops so the read-only Ground Truth row still renders. The table
// only mounts that row when both cell handlers are present.
const noopSetCell = () => {};
const noopClearCell = () => {};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export const TaskSummaryDashboard = ({
  taskId,
  projectId,
  hideInfo,
  includePredictions = false,
  dataTypes,
  dimensionLabelColors,
  currentUser,
  onAnnotationClick,
  fetchers,
  readOnly = false,
  autoReviewAnnotations,
  onDataInvalidated,
}: TaskSummaryDashboardProps) => {
  const handleAnnotationClick = useCallback(
    (annotationPk: number) => onAnnotationClick?.(annotationPk),
    [onAnnotationClick],
  );

  const invalidateData = useCallback(() => {
    if (onDataInvalidated) {
      onDataInvalidated();
      return;
    }
    // @todo this is temporary quick path
    // @todo find a way to reload info without reloading the page
    window.location.reload();
  }, [onDataInvalidated]);

  // ---------------------------------------------------------------------------
  // Dashboard state (persisted in localStorage)
  // ---------------------------------------------------------------------------

  const [taskDataExpanded, setTaskDataExpanded] = useLocalStorage<boolean>(
    "annotation_dashboard_task_data_expanded",
    false,
  );

  const [visibleColumnIds, setVisibleColumnIds] = useLocalStorage<number[] | null>(
    `annotation_dashboard_columns_${projectId}`,
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
    includePredictions,
    fetchers,
    currentUser,
  });

  const method = agreementData.agreementMethodology;

  const effectiveVisibleColumnIds = useMemo(() => {
    if (visibleColumnIds !== null) return visibleColumnIds;
    return agreementData.defaultVisibleDimensions.map((d) => d.dimensionId);
  }, [visibleColumnIds, agreementData.defaultVisibleDimensions]);

  // ---------------------------------------------------------------------------
  // Non-categorical dimension detection
  // ---------------------------------------------------------------------------

  const hasNonCategoricalDimensions = agreementData.nonCategoricalDimensions.length > 0;

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
    effectiveTotalCount,
    effectiveIsComplete,
    effectiveSummary,
    existingGtObject,
    groundTruthStatus,
  } = useEffectiveGroundTruth({ agreementData, groundTruth, hasNonCategoricalDimensions });

  const gtReadOnly = readOnly || hasExistingGt || hasNonCategoricalDimensions;

  // Read-only hosts only surface a ground truth that was already saved; there is
  // no way to act on a draft baseline there, so the row stays hidden instead.
  const showGroundTruthRow = readOnly ? hasExistingGt : !(hasNonCategoricalDimensions && !hasExistingGt);

  // ---------------------------------------------------------------------------
  // Ground Truth actions
  // ---------------------------------------------------------------------------

  const handleCancel = useCallback(() => {
    groundTruth.actions.reset();
  }, [groundTruth.actions]);

  const handleSaveGroundTruth = useCallback(() => {
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
          invalidateData();
        }).catch((err) => {
          console.error("[Ground Truth] Commit failed:", err);
        });
      },
    });
  }, [
    taskId,
    effectiveGtCells,
    effectiveSummary,
    groundTruth.actions,
    agreementData.summaryAnnotations,
    agreementData.filteredDimensions,
    agreementData.annotators,
    invalidateData,
  ]);

  // ---------------------------------------------------------------------------
  // Review statistics (for the control panel counter)
  // ---------------------------------------------------------------------------

  const reviewStats = useMemo<ReviewStats | undefined>(() => {
    const annotationRows = agreementData.annotationForRow;
    if (!annotationRows?.length) return undefined;

    let totalCount = 0;
    let reviewedCount = 0;
    let acceptedCount = 0;
    let rejectedCount = 0;

    for (let i = 0; i < annotationRows.length; i++) {
      if (i === existingGtAnnotationIndex) continue;
      const ann = annotationRows[i];
      if (!ann) continue;
      totalCount++;
      if (ann.reviews?.length) {
        reviewedCount++;
        const lastReview = ann.reviews[ann.reviews.length - 1];
        if (lastReview.accepted) acceptedCount++;
        else rejectedCount++;
      }
    }

    return { reviewedCount, totalCount, acceptedCount, rejectedCount };
  }, [agreementData.annotationForRow, existingGtAnnotationIndex]);

  // ---------------------------------------------------------------------------
  // Existing reviews map (for the auto-review overwrite warning)
  // ---------------------------------------------------------------------------

  const existingReviews = useMemo<Map<number, boolean>>(() => {
    const map = new Map<number, boolean>();
    const annotationRows = agreementData.annotationForRow;
    if (!annotationRows?.length) return map;
    for (let i = 0; i < annotationRows.length; i++) {
      if (i === existingGtAnnotationIndex) continue;
      const ann = annotationRows[i];
      if (!ann || !ann.reviews?.length) continue;
      const lastReview = ann.reviews[ann.reviews.length - 1];
      map.set(ann.id, lastReview.accepted);
    }
    return map;
  }, [agreementData.annotationForRow, existingGtAnnotationIndex]);

  const handleAutoReview = useCallback(() => {
    if (!taskId || !existingGtObject) return;
    openAutoReviewDialog({
      taskId,
      existingGt: existingGtObject,
      annotations: autoReviewAnnotations ?? [],
      // BUSINESS RULE: Must use all categorical dimensions, never the UI-filtered subset.
      // Column visibility is a display preference; hidden mismatches are still real.
      dimensions: agreementData.categoricalDimensions,
      // annotation_ids maps each position i to a unique annotation DB ID,
      // letting the comparison logic avoid user-ID collisions (same user
      // can appear multiple times in the agreement arrays).
      annotationIds: agreementData.agreementResult?.annotation_ids ?? [],
      annotators: agreementData.annotators,
      existingReviews,
      onCommit: invalidateData,
    });
  }, [
    taskId,
    existingGtObject,
    autoReviewAnnotations,
    agreementData.categoricalDimensions,
    agreementData.agreementResult,
    agreementData.annotators,
    existingReviews,
    invalidateData,
  ]);

  // ---------------------------------------------------------------------------
  // Current user display name (for GT row subtitle)
  // ---------------------------------------------------------------------------

  const currentUserName = useMemo(() => {
    const user = currentUser ?? window.APP_SETTINGS?.user;
    if (!user) return undefined;
    const parts = [user.first_name, user.last_name].filter(Boolean);
    return parts.length > 0 ? parts.join(" ") : (user.email ?? undefined);
  }, [currentUser]);

  // ---------------------------------------------------------------------------
  // NumbersSummary cards
  // ---------------------------------------------------------------------------

  const summaryCards = useMemo(() => {
    const cards: { title: string; value: number | string; info: string }[] = [];

    const usePrecomputedTaskAgreement = !includePredictions && typeof agreementData.task?.agreement === "number";

    if (usePrecomputedTaskAgreement) {
      const agreement = agreementData.task!.agreement!;
      const agreementPercent = agreement <= 1 ? agreement * 100 : agreement;
      cards.push({
        title: `Agreement (${method})`,
        value: `${agreementPercent.toFixed(1)}%`,
        info: "Overall agreement from the same precomputed source used by Data Manager",
      });
    } else if (agreementData.overallAgreement !== null) {
      cards.push({
        title: `Agreement (${method})`,
        value: `${(agreementData.overallAgreement * 100).toFixed(1)}%`,
        info: includePredictions
          ? `Overall ${method} agreement across annotations and predictions`
          : `Overall ${method} agreement across all dimensions`,
      });
    }

    cards.push({
      title: "Annotations",
      value: agreementData.apiResponse?.total_annotations ?? 0,
      info: "Number of submitted annotations. Table shows only submitted results, not current drafts.",
    });

    if (includePredictions) {
      cards.push({
        title: "Predictions",
        value: agreementData.agreementResult?.prediction_model_versions?.length ?? 0,
        info: "Number of predictions included in the agreement calculation.",
      });
    }

    return cards;
  }, [agreementData, method, includePredictions]);

  const distributionParticipantCount = useMemo(() => {
    if (!agreementData.agreementResult) return agreementData.apiResponse?.total_annotations ?? 0;
    const k = agreementData.agreementResult.annotator_ids.length;
    const m = includePredictions ? (agreementData.agreementResult.prediction_model_versions?.length ?? 0) : 0;
    return k + m;
  }, [agreementData, includePredictions]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div>
      <div className="mt-base mb-base">
        <NumbersSummary values={summaryCards} />
      </div>

      {agreementData.isDashboardLoading ? (
        <div className="mb-relaxed">
          <DashboardSkeleton />
        </div>
      ) : agreementData.hasAgreementData ? (
        <div className="mb-relaxed">
          <section className="mb-base">
            <div className="mb-tight">
              <ColumnPicker
                totalDimensionCount={agreementData.dimensions.length}
                shownCount={agreementData.filteredDimensions.length}
                allDimensions={agreementData.dimensions}
                visibleColumnIds={effectiveVisibleColumnIds}
                onVisibleColumnsChange={setVisibleColumnIds}
                conflictingDimensionIds={agreementData.conflictingDimensionIds}
                hasNonCategoricalDimensions={hasNonCategoricalDimensions}
                hasExistingGt={hasExistingGt}
                includePredictions={includePredictions}
              />
            </div>

            <AnnotatorsDimensionsTable
              dimensions={agreementData.filteredDimensions}
              annotators={agreementData.annotators}
              dimensionLabelColors={dimensionLabelColors}
              distributions={agreementData.apiResponse?.distributions}
              totalAnnotations={distributionParticipantCount}
              includePredictions={includePredictions}
              annotationForRow={agreementData.annotationForRow}
              onAnnotationClick={handleAnnotationClick}
              dimensionScores={agreementData.dimensionScores}
              mostCommonValues={agreementData.mostCommonValues}
              mostCommonCounts={agreementData.mostCommonCounts}
              groundTruthCells={showGroundTruthRow ? effectiveGtCells : undefined}
              groundTruthValueCounts={groundTruth.valueCounts}
              onSetGroundTruthCell={readOnly ? noopSetCell : groundTruth.actions.setCell}
              onClearGroundTruthCell={readOnly ? noopClearCell : groundTruth.actions.clearCell}
              excludeAnnotatorIndex={existingGtAnnotationIndex}
              groundTruthAnnotatorName={existingGtAnnotatorName}
              groundTruthStatus={groundTruthStatus}
              groundTruthReadOnly={gtReadOnly}
              groundTruthDisabled={hasNonCategoricalDimensions && !hasExistingGt}
              agreementMethodology={method}
              majorityVotes={groundTruth.majorityVotes}
              currentUserName={currentUserName}
              footer={
                !readOnly && (groundTruthStatus === "draft" || groundTruthStatus === "saved") ? (
                  <TaskSummaryControlPanel
                    groundTruthStatus={groundTruthStatus}
                    isComplete={effectiveIsComplete}
                    resolvedCount={effectiveResolvedCount}
                    totalCount={effectiveTotalCount}
                    hasExistingGt={hasExistingGt}
                    hasNonCategoricalDimensions={hasNonCategoricalDimensions}
                    reviewStats={reviewStats}
                    onSaveGroundTruth={handleSaveGroundTruth}
                    onCancel={handleCancel}
                    onAutoReview={handleAutoReview}
                  />
                ) : undefined
              }
            />
          </section>
        </div>
      ) : (
        <div className="mb-relaxed">
          <div className="flex flex-col items-center justify-center gap-tight px-base py-relaxed border border-neutral-border rounded-small bg-neutral-surface text-center">
            <p className="text-body-medium text-neutral-content">Agreement is not available for this task.</p>
            <p className="text-body-small text-neutral-content-subtle">
              Agreement is only calculated for submitted annotations, not drafts.
            </p>
          </div>
        </div>
      )}

      {!agreementData.hasAgreementData && (
        <div className="mb-relaxed">
          <h2 className="mb-base text-headline-small font-semibold text-neutral-content">Task Data</h2>
          <DataSummary data_types={dataTypes} />
        </div>
      )}

      {agreementData.hasAgreementData && (
        <CollapsiblePanel
          title="Task Data"
          expanded={taskDataExpanded}
          onExpandedChange={setTaskDataExpanded}
          className="mb-base"
        >
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

export default TaskSummaryDashboard;
