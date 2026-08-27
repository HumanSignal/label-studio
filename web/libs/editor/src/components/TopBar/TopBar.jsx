/**
 * Classic editor (MST) TopBar wrapper.
 *
 * The shell + add-button + view-all visuals live in
 * `@humansignal/core/lib/topbar/TopBar`. This wrapper:
 *   1. Reads MST state via `observer()` so MobX tracks reactive properties.
 *   2. Computes the classic visibility gates (`isBulkMode`, `isStarterCloudPlan`,
 *      `hasInterface("annotations:view-all")`) and passes the result as
 *      `visible` to the shared layer.
 *   3. Renders the AnnotationsCarousel wrapper inside the children slot
 *      (horizontal mode only — vertical mode places it in the App sidebar).
 */
import { observer } from "mobx-react";
import { TopBar as SharedTopBar, isStarterCloudPlan, ff } from "@humansignal/core";
import { AnnotationsCarousel } from "../AnnotationsCarousel/AnnotationsCarousel";
import { emitAnnotationCreated, emitOverviewOpenedOrClosed } from "../../utils/labelingTelemetry";

export const TopBar = observer(({ store }) => {
  if (!store) return null;

  const annotationStore = store.annotationStore;
  const isViewAll = annotationStore?.viewingAll === true;
  const isBulkMode = !isStarterCloudPlan() && store.hasInterface("annotation:bulk");

  if (isBulkMode) return null;

  const visible = store.hasInterface("annotations:view-all");
  const showViewAll = store.hasInterface("annotations:view-all");
  const showAddNew = store.hasInterface("annotations:add-new");
  const isVertical =
    ff.isActive(ff.FF_FIT_ANNOTATIONS_VERTICAL_LAYOUT) && store.settings.annotationsListLayout === "vertical";

  const onAddNew = () => {
    const created = annotationStore.createAnnotation();
    annotationStore.selectAnnotation(created.id, { exitViewAll: true });
    emitAnnotationCreated(store, created, "new");
  };

  const onToggleViewAll = () => {
    const closing = isViewAll;
    if (closing) {
      annotationStore.toggleViewingAllAnnotations();
      emitOverviewOpenedOrClosed(store, "closed", annotationStore.selected ?? null);
    } else {
      emitOverviewOpenedOrClosed(store, "opened");
      annotationStore.toggleViewingAllAnnotations();
    }
  };

  return (
    <SharedTopBar
      visible={visible}
      showViewAll={showViewAll}
      isViewAll={isViewAll}
      onToggleViewAll={onToggleViewAll}
      showAddNew={showAddNew}
      onAddNew={onAddNew}
    >
      {!isVertical && (
        <AnnotationsCarousel store={store} annotationStore={annotationStore} commentStore={store.commentStore} />
      )}
    </SharedTopBar>
  );
});
