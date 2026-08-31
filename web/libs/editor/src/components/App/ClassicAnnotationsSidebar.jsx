/**
 * Classic editor (MST) wrapper that renders the shared AnnotationsSidebar
 * with the correct entities, capabilities, and carousel for vertical mode.
 *
 * Uses the render-prop pattern: AnnotationsSidebar passes displayEntities
 * (filtered + sorted) which this wrapper injects into AnnotationsCarousel.
 */
import { observer } from "mobx-react";
import { isAlive } from "mobx-state-tree";
import { useCallback, useMemo } from "react";
import { AnnotationsSidebar, resolveClassicEntityReviewState } from "@humansignal/core";
import { AnnotationsCarousel } from "../AnnotationsCarousel/AnnotationsCarousel";
import { emitAnnotationTabSelected, emitOverviewOpenedOrClosed } from "../../utils/labelingTelemetry";

function entityToSummary(entity, store) {
  return {
    id: String(entity.id),
    pk: entity.pk != null ? String(entity.pk) : null,
    type: entity.type === "prediction" ? "prediction" : "annotation",
    selected: Boolean(entity.selected),
    createdBy: entity.createdBy ?? "",
    createdDate: entity.createdDate ?? "",
    updatedDate: entity.draftSaved ?? entity.updatedDate ?? entity.createdDate ?? "",
    user: null,
    groundTruth: Boolean(entity.ground_truth),
    skipped: Boolean(entity.skipped),
    draftId: entity.draftId ?? 0,
    score: typeof entity.score === "number" ? entity.score : null,
    commentCount: entity.comment_count ?? 0,
    unresolvedCommentCount: entity.unresolved_comment_count ?? 0,
    acceptedState: resolveClassicEntityReviewState(entity, store),
    versions: entity.versions,
  };
}

export const ClassicAnnotationsSidebar = observer(({ store }) => {
  const annotationStore = store.annotationStore;
  const enableAnnotations = store.hasInterface("annotations:tabs");
  const enablePredictions = store.hasInterface("predictions:tabs");
  const enableCreateAnnotation = store.hasInterface("annotations:add-new");
  const hasViewAllInterface = Boolean(store?.hasInterface?.("annotations:view-all"));

  const liveEntities = [];
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

  const sharedEntities = liveEntities.map((entity) => entityToSummary(entity, store));
  const selectedId = annotationStore.selected ? String(annotationStore.selected.id) : null;

  const capabilities = useMemo(
    () => ({
      groundTruthEnabled: store.hasInterface("ground-truth"),
      enableCreateAnnotation,
      enableAnnotationDelete: store.hasInterface("annotations:delete"),
      enableAnnotations,
      enablePredictions,
      enableCopyLink: Boolean(store?.hasInterface?.("annotations:copy-link")),
      enableCompareAllAnnotations: hasViewAllInterface,
      enableReviewStatusFilters: window.APP_SETTINGS?.version?.edition === "Enterprise",
      showUserInfo: !store?.hasInterface?.("annotations:hide-info"),
    }),
    [enableCreateAnnotation, enableAnnotations, enablePredictions, store, hasViewAllInterface],
  );

  const handleToggleViewAll = useCallback(() => {
    const closing = annotationStore.viewingAll;
    if (closing) {
      annotationStore.toggleViewingAllAnnotations();
      emitOverviewOpenedOrClosed(store, "closed", annotationStore.selected ?? null);
    } else {
      emitOverviewOpenedOrClosed(store, "opened");
      annotationStore.toggleViewingAllAnnotations();
    }
  }, [annotationStore, store]);

  const handleFirstResultOnFilter = useCallback(
    (entity) => {
      const previous = annotationStore.selected;
      if (entity.type === "prediction") {
        annotationStore.selectPrediction(entity.id, { exitViewAll: true });
      } else {
        annotationStore.selectAnnotation(entity.id, { exitViewAll: true });
      }
      const liveEntity =
        entity.type === "prediction"
          ? annotationStore.predictions.find((p) => String(p.id) === String(entity.id))
          : annotationStore.annotations.find((a) => String(a.id) === String(entity.id));
      if (liveEntity) {
        emitAnnotationTabSelected(store, liveEntity, previous, { exitViewAll: true });
      }
    },
    [annotationStore, store],
  );

  if (!(enableAnnotations || enablePredictions || enableCreateAnnotation)) return null;

  const projectId = store?.project?.id ?? window.DM?.project?.id ?? null;

  return (
    <AnnotationsSidebar
      entities={sharedEntities}
      selectedId={selectedId}
      capabilities={capabilities}
      projectId={projectId}
      showViewAll={hasViewAllInterface}
      isViewAll={annotationStore.viewingAll}
      onToggleViewAll={handleToggleViewAll}
      onFirstResultOnFilter={handleFirstResultOnFilter}
    >
      {(displayEntities, emptyState) => (
        <AnnotationsCarousel
          store={store}
          annotationStore={annotationStore}
          commentStore={store.commentStore}
          layout="vertical"
          entities={displayEntities}
          emptyState={emptyState}
        />
      )}
    </AnnotationsSidebar>
  );
});
