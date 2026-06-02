/**
 * Classic editor (MST) AnnotationsCarousel wrapper.
 *
 * Maps live MST `annotationStore.predictions` + `annotationStore.annotations` into the
 * plain SharedAnnotation array consumed by the shared `AnnotationsCarousel`. Each
 * row is rendered through the per-row classic `AnnotationButton` wrapper (passed via
 * `renderItem`) so per-row hooks for lazy hydration, user resolution, MST `enrichUsers`,
 * and the delete confirmation modal still run.
 *
 * Behaviors preserved:
 * - Predictions before annotations (B2; classic order, no date sort)
 * - Virtualization gated by FF_FIT_720_LAZY_LOAD_ANNOTATIONS (B3)
 * - Suppress scroll-to-selected on Task Summary tab (B5; same persistent-state key)
 */
import { observer } from "mobx-react";
import { isAlive } from "mobx-state-tree";
import { useMemo } from "react";
import {
  AnnotationsCarousel as SharedAnnotationsCarousel,
  type AnnotationActionHandlers,
  type AnnotationCapabilities,
  type SharedAnnotation,
} from "@humansignal/core";
import { isActive, FF_FIT_720_LAZY_LOAD_ANNOTATIONS } from "@humansignal/core/lib/utils/feature-flags";
import { usePersistentState } from "@humansignal/core/lib/hooks/usePersistentState";
import { AnnotationButton } from "./AnnotationButton";

interface AnnotationsCarouselInterface {
  store: any;
  annotationStore: any;
  commentStore?: any;
}

/**
 * Lightweight summary of a live MST entity used only for the carousel layout/scroll
 * state — every per-row interaction goes through the classic `AnnotationButton`
 * wrapper which receives the live MST entity directly.
 */
function entityToSummary(entity: any): SharedAnnotation {
  return {
    id: String(entity.id),
    pk: entity.pk != null ? String(entity.pk) : null,
    type: entity.type === "prediction" ? "prediction" : "annotation",
    selected: Boolean(entity.selected),
    createdBy: entity.createdBy ?? "",
    createdDate: entity.createdDate ?? "",
    user: null,
    groundTruth: Boolean(entity.ground_truth),
    skipped: Boolean(entity.skipped),
    draftId: entity.draftId ?? 0,
    score: typeof entity.score === "number" ? entity.score : null,
    commentCount: entity.comment_count ?? 0,
    unresolvedCommentCount: entity.unresolved_comment_count ?? 0,
    acceptedState: null,
  };
}

export const AnnotationsCarousel = observer(({ store, annotationStore }: AnnotationsCarouselInterface) => {
  const enableAnnotations = store.hasInterface("annotations:tabs");
  const enablePredictions = store.hasInterface("predictions:tabs");
  const enableCreateAnnotation = store.hasInterface("annotations:add-new");
  const groundTruthEnabled = store.hasInterface("ground-truth");
  const enableAnnotationDelete = store.hasInterface("annotations:delete");
  const enablePredictionDelete = store.hasInterface("predictions:delete");

  // Build live entity list inside the observer body so MobX subscribes to changes on
  // both arrays + the predictions/annotations themselves.
  const liveEntities: any[] = [];
  if (enablePredictions) {
    for (const p of annotationStore.predictions) {
      if (isAlive(p)) liveEntities.push(p);
    }
  }
  if (enableAnnotations) {
    for (const a of annotationStore.annotations) {
      if (isAlive(a)) liveEntities.push(a);
    }
  }

  const sharedEntities = liveEntities.map(entityToSummary);
  const entityById = new Map<string, any>(liveEntities.map((e) => [String(e.id), e]));
  const selectedId = annotationStore.selected ? String(annotationStore.selected.id) : null;

  // Same key as ViewAll — keep carousel pinned at scroll 0 on Task Summary; side-by-side
  // centers the selected tab.
  const hasSummaryTab = store.hasInterface("annotations:summary");
  const [viewAllTab] = usePersistentState<"summary" | "compare">("view-all-tab", "summary");
  const suppressScrollToSelected = annotationStore.viewingAll && hasSummaryTab && viewAllTab === "summary";

  const virtualizationEnabled = isActive(FF_FIT_720_LAZY_LOAD_ANNOTATIONS);

  const sharedCapabilities: AnnotationCapabilities = useMemo(
    () => ({
      groundTruthEnabled,
      enableCreateAnnotation,
      enableAnnotationDelete,
      enableAnnotations,
      enablePredictions,
      enableCopyLink: Boolean(store?.hasInterface?.("annotations:copy-link")),
      // Same gate as the left-side ViewAllToggle (`TopBar.jsx`); when the
      // host omits `annotations:view-all` we hide the matching context
      // menu row that the per-row `AnnotationButton` wrapper renders.
      enableCompareAllAnnotations: Boolean(store?.hasInterface?.("annotations:view-all")),
      showUserInfo: !store?.hasInterface?.("annotations:hide-info"),
    }),
    [groundTruthEnabled, enableCreateAnnotation, enableAnnotationDelete, enableAnnotations, enablePredictions, store],
  );

  // Carousel-level handlers are only used for snap/scroll bookkeeping and the
  // shared internal SharedAnnotationButton fallback. Per-row interactions go
  // through the classic `AnnotationButton` wrapper supplied via `renderItem`.
  const carouselHandlers: AnnotationActionHandlers = useMemo(
    () => ({
      onSelect: () => {},
      onSetGroundTruth: () => {},
      onDuplicate: () => {},
      onDelete: () => {},
      onShowOtherAnnotations: () => annotationStore.toggleViewingAllAnnotations(),
    }),
    [annotationStore],
  );

  // Each row maps back to its live MST entity and renders through the classic
  // `AnnotationButton` wrapper so per-row MobX observers, hydration, user resolution,
  // and the delete confirm() modal still run.
  const renderItem = useMemo(
    () => (sharedEntity: SharedAnnotation) => {
      const liveEntity = entityById.get(sharedEntity.id);
      if (!liveEntity) return null;
      return (
        <AnnotationButton
          key={sharedEntity.id}
          entity={liveEntity}
          capabilities={{
            groundTruthEnabled,
            enableCreateAnnotation,
            enableAnnotationDelete,
            enablePredictionDelete,
            enableAnnotations,
            enablePredictions,
          }}
          annotationStore={annotationStore}
          store={store}
        />
      );
    },
    [
      entityById,
      groundTruthEnabled,
      enableCreateAnnotation,
      enableAnnotationDelete,
      enablePredictionDelete,
      enableAnnotations,
      enablePredictions,
      annotationStore,
      store,
    ],
  );

  if (!(enableAnnotations || enablePredictions || enableCreateAnnotation)) return null;

  return (
    <SharedAnnotationsCarousel
      entities={sharedEntities}
      selectedId={selectedId}
      capabilities={sharedCapabilities}
      handlers={carouselHandlers}
      virtualizationEnabled={virtualizationEnabled}
      suppressScrollToSelected={suppressScrollToSelected}
      renderItem={renderItem}
    />
  );
});

// Re-export the per-row wrapper so existing imports / tests keep working.
export { AnnotationButton };
