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
 */

import { useCallback, useEffect, useMemo, type ReactNode } from "react";
import { Toggle, Tooltip } from "@humansignal/ui";
import type { MSTAnnotation, MSTControlTag, MSTStore } from "../../stores/types";
import { DataSummary } from "./DataSummary";
import { LabelingSummary } from "./LabelingSummary";
import { NumbersSummary } from "./NumbersSummary";
import type { ControlTag, ObjectTagEntry, ObjectTypes } from "./types";
import { getLabelColors, sortControls } from "./utils";
import { useLocalStorage } from "@/utils/hooks";

// Agreement dashboard components
import { AgreementToolbar } from "./agreement-dashboard/agreement-toolbar";
import { AnnotatorsDimensionsTable } from "./agreement-dashboard/annotators-dimensions-table";
import { AgreementHeatmap } from "./agreement-dashboard/agreement-heatmap";
import { DistributionViewer } from "./agreement-dashboard/distribution-viewer";
import { ColumnPicker } from "./agreement-dashboard/column-picker";
import { useTaskSummaryData } from "./agreement-dashboard/use-task-summary-data";
import type { AgreementMethod, ConflictFilter, PanelId } from "./agreement-dashboard/types";
import { PANEL_IDS } from "./agreement-dashboard/types";

// Ground Truth Mode components
import { useGroundTruth } from "./agreement-dashboard/use-ground-truth";
import { ResolutionSummaryBar } from "./agreement-dashboard/resolution-summary-bar";
import { openCommitGroundTruthDialog, commitGroundTruth } from "./agreement-dashboard/commit-ground-truth-dialog";

// Task Data Dock (resizable panel above table in Ground Truth Mode)
import { TaskDataDock } from "./task-data-dock";

// ---------------------------------------------------------------------------
// Props (same as OSS)
// ---------------------------------------------------------------------------

type TaskSummaryProps = {
  annotations: MSTAnnotation[];
  store: MSTStore["annotationStore"];
};

interface Annotation {
  id: string | number;
  type: "annotation" | "prediction";
}

// ---------------------------------------------------------------------------
// Default panel visibility
// ---------------------------------------------------------------------------

const DEFAULT_PANELS: PanelId[] = ["annotators_table"];

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
// Fade-in wrapper for elements that appear on mode toggle
// ---------------------------------------------------------------------------

const FadeIn = ({ children, duration = 200 }: { children: ReactNode; duration?: number }) => (
  <div style={{ animation: `fadeIn ${duration}ms ease-out` }}>
    <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    {children}
  </div>
);

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

const TaskSummary = ({ annotations: all, store: annotationStore }: TaskSummaryProps) => {
  const task = annotationStore.store.task;
  const hideInfo = annotationStore.store.hasInterface("annotations:hide-info");

  // skip unsubmitted drafts
  const annotations = all.filter((a) => a.pk);
  const allTags = [...annotationStore.names];

  // Annotation selection callback (for OSS fallback)
  const onSelect = (entity: Annotation) => {
    if (entity.type === "annotation") {
      annotationStore.selectAnnotation(entity.id, { exitViewAll: true });
    } else {
      annotationStore.selectPrediction(entity.id, { exitViewAll: true });
    }
  };

  // Navigate to a specific annotation by its database pk
  const handleAnnotationClick = useCallback(
    (annotationPk: number) => {
      const match = annotations.find((a) => String(a.pk) === String(annotationPk));
      if (match) {
        annotationStore.selectAnnotation(match.id, { exitViewAll: true });
      }
    },
    [annotations, annotationStore],
  );

  // Build control tags (same as OSS)
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
  const reactcodeTags = allTags.filter(([_, tag]) => tag.type === "reactcode") as [string, any][];
  for (const [tagName, tag] of reactcodeTags) {
    const dimensions: string[] = tag.dimensions ?? [];
    for (const dimension of dimensions) {
      controlsList.push({
        name: dimension,
        type: "reactcode",
        to_name: tagName,
        label_attrs: {},
        per_region: false,
      });
    }
  }
  const grouped = Object.groupBy(controlsList, (control) => control.to_name);
  const controls = Object.entries(grouped).flatMap(([_, controls]) => sortControls(controls ?? []));

  // Build data types for DataSummary (same as OSS)
  const objectTags: ObjectTagEntry[] = allTags.filter(
    ([_, tag]) => tag.isObjectTag && (tag.value.includes("$") || tag.loadedData),
  ) as ObjectTagEntry[];
  const dataTypes: ObjectTypes = Object.fromEntries(
    objectTags.map(([name, object]) => [
      name,
      {
        type: object.type,
        value:
          // @ts-expect-error parsedValue, dataObj and _url are very specific and not added to types
          object.loadedData ?? object.parsedValue ?? object.dataObj ?? object._url ?? object._value ?? object.value,
      },
    ]),
  );

  // ---------------------------------------------------------------------------
  // Dashboard state (persisted in localStorage)
  // ---------------------------------------------------------------------------

  const [method, setMethod] = useLocalStorage<AgreementMethod>(
    "annotation_dashboard_agreement_method",
    "consensus",
  );
  const [conflictFilter, setConflictFilter] = useLocalStorage<ConflictFilter>(
    "annotation_dashboard_conflict_filter",
    "all",
  );
  const [conflictsOnly, setConflictsOnly] = useLocalStorage<boolean>(
    "annotation_dashboard_conflicts_only",
    false,
  );
  const [visibleColumnIds, setVisibleColumnIds] = useLocalStorage<number[] | null>(
    `annotation_dashboard_columns_${task?.id}`,
    null,
  );
  const [visiblePanels, setVisiblePanels] = useLocalStorage<PanelId[]>(
    "annotation_dashboard_visible_panels",
    DEFAULT_PANELS,
  );

  // ---------------------------------------------------------------------------
  // Fetch and derive agreement data
  // ---------------------------------------------------------------------------

  const agreementData = useTaskSummaryData({
    taskId: task?.id,
    method,
    conflictFilter,
    conflictsOnly,
    visibleColumnIds,
    annotations,
    hideInfo,
  });

  const nonCategoricalDimensions = useMemo(
    () => agreementData.dimensions.filter((d) => !d.isCategorical),
    [agreementData.dimensions],
  );
  const hasNonCategoricalDimensions = nonCategoricalDimensions.length > 0;

  // "All dimensions" only makes sense when there are non-categorical dimensions.
  // If persisted state points to it but there are no non-categorical dims, normalize.
  useEffect(() => {
    if (!hasNonCategoricalDimensions && conflictFilter === "all_dimensions") {
      setConflictFilter("all");
    }
  }, [hasNonCategoricalDimensions, conflictFilter, setConflictFilter]);

  // Initialize visible columns to all categorical dimensions when first loaded
  const effectiveVisibleColumnIds = useMemo(() => {
    if (visibleColumnIds !== null) return visibleColumnIds;
    return agreementData.categoricalDimensions.map((d) => d.dimensionId);
  }, [visibleColumnIds, agreementData.categoricalDimensions]);

  // ---------------------------------------------------------------------------
  // Ground Truth Mode
  // ---------------------------------------------------------------------------

  const groundTruth = useGroundTruth({
    taskId: task?.id,
    dimensions: agreementData.filteredDimensions,
    dimensionScores: agreementData.dimensionScores,
    annotators: agreementData.annotators,
  });

  const groundTruthDisabledReason = useMemo(() => {
    if (!hasNonCategoricalDimensions) {
      return null;
    }

    const listed = nonCategoricalDimensions
      .slice(0, 3)
      .map((d) => `${d.name} (${d.controlTag || "unknown"})`)
      .join(", ");
    const suffix = nonCategoricalDimensions.length > 3 ? ", ..." : "";

    return `Ground Truth Mode is only available for categorical dimensions. Current config includes non-categorical dimensions: ${listed}${suffix}`;
  }, [hasNonCategoricalDimensions, nonCategoricalDimensions]);

  // Auto-disable Ground Truth Mode if non-categorical dimensions are present.
  useEffect(() => {
    if (hasNonCategoricalDimensions && groundTruth.isActive) {
      groundTruth.actions.toggleActive();
    }
  }, [hasNonCategoricalDimensions, groundTruth.isActive, groundTruth.actions]);
  const isGroundTruthActive = !hasNonCategoricalDimensions && groundTruth.isActive;

  const handleCreateGroundTruth = useCallback(() => {
    if (!task?.id) return;
    openCommitGroundTruthDialog({
      taskId: task.id,
      cells: groundTruth.cells,
      summary: groundTruth.summary,
      annotations,
      dimensions: agreementData.filteredDimensions,
      annotators: agreementData.annotators,
      onCommit: (payload) => {
        commitGroundTruth(payload, (newAnnotationId) => {
          groundTruth.actions.clearOnCommit();
          // Exit "Compare All" mode (persisted in localStorage) so the reload opens in single-annotation view
          window.localStorage.setItem("annotation-store-viewing-all", "false");
          // Reload the page so the DM re-fetches the task with the new annotation
          window.location.reload();
        }).catch((err) => {
          console.error("[Ground Truth] Commit failed:", err);
        });
      },
    });
  }, [task?.id, groundTruth.cells, groundTruth.summary, groundTruth.actions, annotations, agreementData.filteredDimensions, agreementData.annotators]);

  // ---------------------------------------------------------------------------
  // NumbersSummary values
  // ---------------------------------------------------------------------------

  const summaryValues = useMemo(() => {
    const vals: { title: string; value: number | string; info: string }[] = [];

    // Use agreement from the dashboard data when available, otherwise fall back to task.agreement
    if (agreementData.overallAgreement !== null) {
      vals.push({
        title: `Agreement (${method})`,
        value: `${(agreementData.overallAgreement * 100).toFixed(1)}%`,
        info: `Overall ${method} agreement across all dimensions`,
      });
    } else if (typeof task?.agreement === "number") {
      vals.push({
        title: "Agreement",
        value: `${Math.round(task.agreement * 100) / 100}%`,
        info: "Overall agreement over all submitted annotations",
      });
    }

    vals.push({
      title: "Annotations",
      value: annotations.filter((a) => a.type === "annotation").length,
      info: "Number of submitted annotations. Table shows only submitted results, not current drafts.",
    });

    vals.push({
      title: "Predictions",
      value: annotations.filter((a) => a.type === "prediction").length,
      info: "Number of predictions. They are not included in the agreement calculation.",
    });

    if (agreementData.conflictCount > 0) {
      vals.push({
        title: "Conflicts",
        value: `${agreementData.conflictCount} / ${agreementData.dimensionScores.length}`,
        info: "Number of dimensions with less than perfect agreement",
      });
    }

    return vals;
  }, [agreementData, method, task, annotations]);

  // ---------------------------------------------------------------------------
  // Panel visibility helpers
  // ---------------------------------------------------------------------------

  const isPanelVisible = (panel: PanelId) => visiblePanels.includes(panel);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div>
      {/* Header: Title + Numbers */}
      <div className="mb-base">
        <div className="flex items-center justify-between mt-base mb-tight">
          <h2 className="text-headline-small font-semibold text-neutral-content">Task Summary</h2>
        </div>
        <NumbersSummary values={summaryValues} />
      </div>

      {/* Agreement Dashboard (when data is available) */}
      {agreementData.isLoading ? (
        <div className="mb-relaxed">
          <DashboardSkeleton />
        </div>
      ) : agreementData.hasAgreementData ? (
        <div className="mb-relaxed">
          {/* Toolbar — hidden for now; panels are not user-selectable */}
          {/* <AgreementToolbar
            visiblePanels={visiblePanels}
            onVisiblePanelsChange={setVisiblePanels}
          /> */}

          {/* Annotators × Dimensions Table (always visible) */}
          <section className="mb-base">
            <div className="flex items-center justify-between mb-tight">
              <Tooltip
                title={
                  groundTruthDisabledReason
                  ?? (groundTruth.isActive
                    ? "Exit Ground Truth Mode"
                    : "Adjudicate and create ground truth annotations")
                }
              >
                <span>
                  <Toggle
                    label="Ground Truth Mode"
                    checked={isGroundTruthActive}
                    onChange={() => {
                      if (!hasNonCategoricalDimensions) {
                        groundTruth.actions.toggleActive();
                      }
                    }}
                    disabled={hasNonCategoricalDimensions}
                  />
                </span>
              </Tooltip>
              <ColumnPicker
                totalDimensionCount={agreementData.dimensions.length}
                shownCount={agreementData.filteredDimensions.length}
                allDimensions={agreementData.dimensions}
                visibleColumnIds={effectiveVisibleColumnIds}
                onVisibleColumnsChange={setVisibleColumnIds}
                conflictFilter={conflictFilter}
                onConflictFilterChange={setConflictFilter}
                conflictsOnly={conflictsOnly}
                onConflictsOnlyChange={setConflictsOnly}
                hasNonCategoricalDimensions={hasNonCategoricalDimensions}
              />
            </div>

              <AnnotatorsDimensionsTable
                dimensions={agreementData.filteredDimensions}
                annotators={agreementData.annotators}
                annotationsMeta={agreementData.agreementResult?.annotations_meta ?? undefined}
                onAnnotationClick={handleAnnotationClick}
                dimensionScores={agreementData.dimensionScores}
                groundTruthActive={isGroundTruthActive}
                groundTruthCells={groundTruth.cells}
                groundTruthValueCounts={groundTruth.valueCounts}
                onSetGroundTruthCell={groundTruth.actions.setCell}
                onClearGroundTruthCell={groundTruth.actions.clearCell}
              />

              {/* Resolution Summary Bar (Ground Truth Mode only) — below the table */}
              {isGroundTruthActive && (
                <FadeIn>
                  <ResolutionSummaryBar
                    resolvedCount={groundTruth.resolvedCount}
                    totalCount={groundTruth.totalCount}
                    progress={groundTruth.progress}
                    unanimousCount={groundTruth.unanimousCount}
                    isComplete={groundTruth.isComplete}
                    summary={groundTruth.summary}
                    getMajorityCandidates={groundTruth.getMajorityCandidates}
                    onAutoAcceptUnanimous={groundTruth.actions.autoAcceptUnanimous}
                    onAutoAcceptMajority={groundTruth.actions.autoAcceptMajority}
                    onCreateGroundTruth={handleCreateGroundTruth}
                  />
                </FadeIn>
              )}
            </section>



          {/* Agreement Heatmap — not rendered for now */}
          {/* eslint-disable-next-line no-constant-condition */}
          {false && isPanelVisible("agreement_heatmap") && (
            <section className="mb-base">
              <h3 className="mb-tight text-title-medium font-semibold text-neutral-content">
                Agreement Heatmap
              </h3>
              <div className="border border-neutral-border rounded-small p-base">
                <AgreementHeatmap
                  matrix={agreementData.heatmapMatrix}
                  annotators={agreementData.annotators}
                  rowAverages={agreementData.heatmapRowAverages}
                  grandAverage={agreementData.heatmapGrandAverage}
                />
              </div>
            </section>
          )}

          {/* Distribution & Majority Vote — not rendered for now */}
          {/* eslint-disable-next-line no-constant-condition */}
          {false && isPanelVisible("distribution_viewer") && (
            <section className="mb-base">
              <h3 className="mb-tight text-title-medium font-semibold text-neutral-content">
                Distribution & Majority Vote
              </h3>
              <div className="border border-neutral-border rounded-small p-base">
                <DistributionViewer
                  categoricalDimensions={agreementData.filteredDimensions}
                  annotators={agreementData.annotators}
                />
              </div>
            </section>
          )}

          {/* Empty state when all panels are hidden — currently unused */}
          {/* {!PANEL_IDS.some(isPanelVisible) && (
            <div className="text-center py-relaxed text-neutral-content-subtle">
              Select at least one dashboard panel to display.
            </div>
          )} */}
        </div>
      ) : (
        /* OSS Fallback: LabelingSummary when no agreement data */
        <div className="mb-relaxed">
          <LabelingSummary
            annotations={annotations}
            controls={controls}
            onSelect={onSelect}
            hideInfo={hideInfo}
            taskId={task?.id}
          />
        </div>
      )}

      {/* Task Data (plain fallback when no agreement dashboard) */}
      {!agreementData.hasAgreementData && (
        <div className="mb-relaxed">
          <h2 className="mb-base text-headline-small font-semibold text-neutral-content">Task Data</h2>
          <DataSummary data_types={dataTypes} />
        </div>
      )}

      {/* Task Data Dock (collapsible, at the bottom) */}
      {agreementData.hasAgreementData && (
        <TaskDataDock isEmpty={Object.keys(dataTypes).length === 0} dataTypes={dataTypes}>
          <DataSummary data_types={dataTypes} />
        </TaskDataDock>
      )}
    </div>
  );
};

export default TaskSummary;
