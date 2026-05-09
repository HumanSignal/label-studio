import { observer } from "mobx-react";

import { IconPlus } from "@humansignal/icons";
import { Button } from "@humansignal/ui";
import { isStarterCloudPlan } from "@humansignal/core";
import { cn } from "../../utils/bem";
import { FF_BULK_ANNOTATION, isFF } from "../../utils/feature-flags";
import { AnnotationsCarousel } from "../AnnotationsCarousel/AnnotationsCarousel";
import { ViewAllToggle } from "../AnnotationsCarousel/ViewAllToggle";

import "./TopBar.prefix.css";

export const TopBar = observer(({ store }) => {
  const annotationStore = store.annotationStore;
  const entity = annotationStore?.selected;
  const isPrediction = entity?.type === "prediction";

  const isViewAll = annotationStore?.viewingAll === true;
  const isBulkMode = isFF(FF_BULK_ANNOTATION) && !isStarterCloudPlan() && store.hasInterface("annotation:bulk");

  if (isBulkMode) return null;

  // Hide TopBar for Labeling Stream (when annotations:view-all interface is not present)
  // Keep TopBar visible for Review Stream and Quick View
  if (!store.hasInterface("annotations:view-all")) return null;

  return store ? (
    <div className={cn("topbar").mod({ newLabelingUI: true }).toClassName()}>
      <div className={cn("topbar").elem("group").toClassName()}>
        {store.hasInterface("annotations:view-all") && (
          <ViewAllToggle isActive={isViewAll} onClick={annotationStore.toggleViewingAllAnnotations} />
        )}
        {store.hasInterface("annotations:add-new") && (
          <Button
            className={cn("topbar").elem("button").toClassName()}
            type={isViewAll ? undefined : "text"}
            aria-label="Create an annotation"
            variant="neutral"
            size="small"
            look="outlined"
            tooltip="Create a new annotation"
            onClick={(event) => {
              event.preventDefault();
              const created = store.annotationStore.createAnnotation();

              store.annotationStore.selectAnnotation(created.id, { exitViewAll: true });
            }}
          >
            <IconPlus />
          </Button>
        )}
        <AnnotationsCarousel store={store} annotationStore={store.annotationStore} commentStore={store.commentStore} />
      </div>
    </div>
  ) : null;
});
