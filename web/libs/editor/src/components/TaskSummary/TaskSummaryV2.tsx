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

import { useCallback, useMemo } from "react";
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
import type { AgreementMethod, ExistingGroundTruth, GroundTruthCell, PanelId } from "./agreement-dashboard/types";
import { PANEL_IDS } from "./agreement-dashboard/types";

// Ground Truth Mode components
import { useGroundTruth } from "./agreement-dashboard/use-ground-truth";
import { ResolutionSummaryBar } from "./agreement-dashboard/resolution-summary-bar";
import { openCommitGroundTruthDialog, commitGroundTruth } from "./agreement-dashboard/commit-ground-truth-dialog";
import { openAutoReviewDialog } from "./agreement-dashboard/auto-review-dialog";

import { CollapsiblePanel } from "@humansignal/ui";

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
// Main Component
// ---------------------------------------------------------------------------

const TaskSummary = ({ annotations: all, store: annotationStore }: TaskSummaryProps) => {
  const mstTask = annotationStore.store.task;
  const hideInfo = annotationStore.store.hasInterface("annotations:hide-info");

  // MST annotations — kept only for navigation (pk -> MST id mapping)
  // and the LabelingSummary fallback path
  const mstAnnotations = all.filter((a) => a.pk);
  const allTags = [...annotationStore.names];

  // Annotation selection callback (for OSS fallback)
  const onSelect = (entity: Annotation) => {
    if (entity.type === "annotation") {
      annotationStore.selectAnnotation(entity.id, { exitViewAll: true });
    } else {
      annotationStore.selectPrediction(entity.id, { exitViewAll: true });
    }
  };

  // Navigate to a specific annotation by its database pk (uses MST for navigation)
  const handleAnnotationClick = useCallback(
    (annotationPk: number) => {
      const match = mstAnnotations.find((a) => String(a.pk) === String(annotationPk));
      if (match) {
        annotationStore.selectAnnotation(match.id, { exitViewAll: true });
      }
    },
    [mstAnnotations, annotationStore],
  );

  // Build control tags for LabelingSummary fallback (same as OSS)
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

  // Use MST task id for initial hook call; once API responds, agreementData.task
  // becomes the source of truth for task metadata.
  const taskId = mstTask?.id;

  const [method, setMethod] = useLocalStorage<AgreementMethod>(
    "annotation_dashboard_agreement_method",
    "consensus",
  );
  const [visibleColumnIds, setVisibleColumnIds] = useLocalStorage<number[] | null>(
    `annotation_dashboard_columns_${taskId}`,
    null,
  );
  const [visiblePanels, setVisiblePanels] = useLocalStorage<PanelId[]>(
    "annotation_dashboard_visible_panels",
    DEFAULT_PANELS,
  );

  // ---------------------------------------------------------------------------
  // Fetch and derive agreement data (all read-only data comes from the API)
  // ---------------------------------------------------------------------------

  const agreementData = useTaskSummaryData({
    taskId,
    method,
    conflictFilter: "custom",
    visibleColumnIds,
    hideInfo,
  });

  // Initialize visible columns to all categorical dimensions when first loaded
  const effectiveVisibleColumnIds = useMemo(() => {
    if (visibleColumnIds !== null) return visibleColumnIds;
    return agreementData.categoricalDimensions.map((d) => d.dimensionId);
  }, [visibleColumnIds, agreementData.categoricalDimensions]);

  // ---------------------------------------------------------------------------
  // Ground Truth Mode
  // ---------------------------------------------------------------------------

  const groundTruth = useGroundTruth({
    taskId,
    dimensions: agreementData.categoricalDimensions,
    dimensionScores: agreementData.dimensionScores,
    annotators: agreementData.annotators,
  });

  // ---- Existing GT annotation detection ----
  // Always detect an existing ground_truth annotation so we can pre-populate
  // cells and preserve existing values unless explicitly overridden by the user.
  const existingGtAnnotationIndex = useMemo(() => {
    if (!agreementData.annotationForRow?.length) return undefined;
    const idx = agreementData.annotationForRow.findIndex((a) => a?.ground_truth === true);
    return idx >= 0 ? idx : undefined;
  }, [agreementData.annotationForRow]);

  const hasExistingGt = existingGtAnnotationIndex !== undefined;

  const existingGtAnnotatorName = hasExistingGt
    ? agreementData.annotators[existingGtAnnotationIndex]?.displayName
    : undefined;

  const existingGtCells = useMemo<Map<number, GroundTruthCell>>(() => {
    const map = new Map<number, GroundTruthCell>();
    if (existingGtAnnotationIndex === undefined) return map;
    for (const dim of agreementData.categoricalDimensions) {
      if (dim.values) {
        const value = dim.values[existingGtAnnotationIndex];
        if (value !== null && value !== undefined) {
          map.set(dim.dimensionId, { dimensionId: dim.dimensionId, value, source: "manual" });
        }
      }
    }
    return map;
  }, [existingGtAnnotationIndex, agreementData.categoricalDimensions]);

  // Effective cells: existing GT annotation as base, user overrides (localStorage) on top
  const effectiveGtCells = useMemo(() => {
    if (!hasExistingGt) return groundTruth.cells;
    const merged = new Map(existingGtCells);
    for (const [dimId, cell] of groundTruth.cells) {
      merged.set(dimId, cell);
    }
    return merged;
  }, [hasExistingGt, existingGtCells, groundTruth.cells]);

  const effectiveResolvedCount = useMemo(() => {
    if (!hasExistingGt) return groundTruth.resolvedCount;
    let count = 0;
    for (const dim of agreementData.categoricalDimensions) {
      if (effectiveGtCells.has(dim.dimensionId)) count++;
    }
    return count;
  }, [hasExistingGt, groundTruth.resolvedCount, agreementData.categoricalDimensions, effectiveGtCells]);

  const effectiveProgress = groundTruth.totalCount > 0 ? effectiveResolvedCount / groundTruth.totalCount : 0;
  const effectiveIsComplete = groundTruth.totalCount > 0 && effectiveResolvedCount === groundTruth.totalCount;

  const effectiveSummary = useMemo(() => {
    if (!hasExistingGt) return groundTruth.summary;
    let autoUnanimous = 0;
    let autoMajority = 0;
    let manual = 0;
    for (const cell of effectiveGtCells.values()) {
      switch (cell.source) {
        case "auto_unanimous":
          autoUnanimous++;
          break;
        case "auto_majority":
          autoMajority++;
          break;
        case "manual":
          manual++;
          break;
      }
    }
    return { autoUnanimous, autoMajority, manual, total: effectiveResolvedCount };
  }, [hasExistingGt, groundTruth.summary, effectiveGtCells, effectiveResolvedCount]);

  // "saved" = GT annotation exists with no local overrides
  // "draft" = user has made local edits that aren't committed yet
  // undefined = fresh empty state, no badge needed
  const groundTruthStatus: "draft" | "saved" | undefined = useMemo(() => {
    if (hasExistingGt && groundTruth.cells.size > 0) return "draft";
    if (hasExistingGt) return "saved";
    if (groundTruth.cells.size > 0) return "draft";
    return undefined;
  }, [hasExistingGt, groundTruth.cells.size]);

  const handleAcceptAllMajority = useCallback(() => {
    for (const dim of agreementData.categoricalDimensions) {
      const majority = groundTruth.majorityVotes.get(dim.dimensionId);
      if (majority && majority.value !== null) {
        groundTruth.actions.setCell(dim.dimensionId, majority.value, "auto_majority");
      }
    }
  }, [agreementData.categoricalDimensions, groundTruth.majorityVotes, groundTruth.actions]);

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
        commitGroundTruth(payload, (newAnnotationId) => {
          groundTruth.actions.clearOnCommit();
          window.localStorage.setItem("annotation-store-viewing-all", "false");
          window.location.reload();
        }).catch((err) => {
          console.error("[Ground Truth] Commit failed:", err);
        });
      },
    });
  }, [taskId, effectiveGtCells, effectiveSummary, groundTruth.actions, agreementData.summaryAnnotations, agreementData.filteredDimensions, agreementData.annotators]);

  const existingGtObject = useMemo<ExistingGroundTruth | null>(() => {
    if (existingGtAnnotationIndex === undefined) return null;
    const ann = agreementData.annotationForRow?.[existingGtAnnotationIndex];
    if (!ann) return null;
    return {
      annotationId: ann.id,
      annotatorIndex: existingGtAnnotationIndex,
      completedBy: ann.user?.id ?? null,
      cells: existingGtCells,
    };
  }, [existingGtAnnotationIndex, agreementData.annotationForRow, existingGtCells]);

  const handleAutoReview = useCallback(() => {
    if (!taskId || !existingGtObject) return;
    openAutoReviewDialog({
      taskId,
      existingGt: existingGtObject,
      annotations: mstAnnotations,
      // Must use all categorical dimensions, never the UI-filtered subset.
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
  }, [taskId, existingGtObject, mstAnnotations, agreementData.categoricalDimensions, agreementData.agreementResult]);

  // ---------------------------------------------------------------------------
  // NumbersSummary values
  // ---------------------------------------------------------------------------

  const summaryValues = useMemo(() => {
    const vals: { title: string; value: number | string; info: string }[] = [];

    // Use agreement from the dashboard data when available, otherwise fall back to the API task.agreement
    if (agreementData.overallAgreement !== null) {
      vals.push({
        title: `Agreement (${method})`,
        value: `${(agreementData.overallAgreement * 100).toFixed(1)}%`,
        info: `Overall ${method} agreement across all dimensions`,
      });
    } else if (typeof agreementData.task?.agreement === "number") {
      vals.push({
        title: "Agreement",
        value: `${Math.round(agreementData.task.agreement * 100) / 100}%`,
        info: "Overall agreement over all submitted annotations",
      });
    }

    vals.push({
      title: "Annotations",
      value: agreementData.raw?.total_annotations ?? 0,
      info: "Number of submitted annotations. Table shows only submitted results, not current drafts.",
    });

    vals.push({
      title: "Predictions",
      value: agreementData.raw?.total_predictions ?? 0,
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
  }, [agreementData, method]);

  // ---------------------------------------------------------------------------
  // Panel visibility helpers
  // ---------------------------------------------------------------------------

  const isPanelVisible = (panel: PanelId) => visiblePanels.includes(panel);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div>
      {/* Header: Numbers */}
      <div className="mt-base mb-base">
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
            <div className="flex items-center justify-end mb-tight">
              <ColumnPicker
                totalDimensionCount={agreementData.dimensions.length}
                shownCount={agreementData.filteredDimensions.length}
                allDimensions={agreementData.dimensions}
                visibleColumnIds={effectiveVisibleColumnIds}
                onVisibleColumnsChange={setVisibleColumnIds}
                conflictingDimensionIds={agreementData.conflictingDimensionIds}
                hasGroundTruth={hasExistingGt || groundTruth.cells.size > 0}
              />
            </div>

              <AnnotatorsDimensionsTable
                dimensions={agreementData.filteredDimensions}
                annotators={agreementData.annotators}
                annotationForRow={agreementData.annotationForRow}
                onAnnotationClick={handleAnnotationClick}
                dimensionScores={agreementData.dimensionScores}
                groundTruthActive
                groundTruthCells={effectiveGtCells}
                groundTruthValueCounts={groundTruth.valueCounts}
                onSetGroundTruthCell={groundTruth.actions.setCell}
                onClearGroundTruthCell={groundTruth.actions.clearCell}
                excludeAnnotatorIndex={existingGtAnnotationIndex}
                groundTruthAnnotatorName={existingGtAnnotatorName}
                existingGtCells={hasExistingGt ? existingGtCells : undefined}
                groundTruthStatus={groundTruthStatus}
              />

              <ResolutionSummaryBar
                resolvedCount={effectiveResolvedCount}
                totalCount={groundTruth.totalCount}
                progress={effectiveProgress}
                isComplete={effectiveIsComplete}
                summary={effectiveSummary}
                hasExistingGt={hasExistingGt}
                onAcceptAllMajority={handleAcceptAllMajority}
                onCreateGroundTruth={handleCreateGroundTruth}
                onAutoReview={handleAutoReview}
              />
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
        /* OSS Fallback: LabelingSummary when no agreement data (uses MST annotations) */
        <div className="mb-relaxed">
          <LabelingSummary
            annotations={mstAnnotations}
            controls={controls}
            onSelect={onSelect}
            hideInfo={hideInfo}
            taskId={taskId}
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

      {/* Task Data (collapsible, at the bottom) */}
      {agreementData.hasAgreementData && (
        <CollapsiblePanel title="Task Data" defaultExpanded={false} className="mb-base">
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
