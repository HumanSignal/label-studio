/**
 * Classic editor (MST) TopBar wrapper.
 *
 * The shell + add-button + view-all visuals live in
 * `@humansignal/core/lib/topbar/TopBar`. This wrapper:
 *   1. Reads MST state via `observer()` so MobX tracks reactive properties.
 *   2. Computes the classic visibility gates (`isBulkMode`, `isStarterCloudPlan`,
 *      `hasInterface("annotations:view-all")`) and passes the result as
 *      `visible` to the shared layer.
 *   3. Renders the AnnotationsCarousel wrapper inside the children slot.
 */
import { observer } from "mobx-react";
import { TopBar as SharedTopBar, isStarterCloudPlan } from "@humansignal/core";
import { AnnotationsCarousel } from "../AnnotationsCarousel/AnnotationsCarousel";

export const TopBar = observer(({ store }) => {
  if (!store) return null;

  const annotationStore = store.annotationStore;
  const isViewAll = annotationStore?.viewingAll === true;
  const isBulkMode = !isStarterCloudPlan() && store.hasInterface("annotation:bulk");

  // Hide TopBar in bulk mode (preserves classic behavior).
  if (isBulkMode) return null;

  // Hide TopBar for Labeling Stream when annotations:view-all is absent
  // (Review Stream and Quick View keep it visible).
  const visible = store.hasInterface("annotations:view-all");

  const showViewAll = store.hasInterface("annotations:view-all");
  const showAddNew = store.hasInterface("annotations:add-new");

  const onAddNew = () => {
    const created = annotationStore.createAnnotation();
    annotationStore.selectAnnotation(created.id, { exitViewAll: true });
  };

  return (
    <SharedTopBar
      visible={visible}
      showViewAll={showViewAll}
      isViewAll={isViewAll}
      onToggleViewAll={annotationStore.toggleViewingAllAnnotations}
      showAddNew={showAddNew}
      onAddNew={onAddNew}
    >
      <AnnotationsCarousel store={store} annotationStore={annotationStore} commentStore={store.commentStore} />
    </SharedTopBar>
  );
});
