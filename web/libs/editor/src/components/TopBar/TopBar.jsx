import { observer } from "mobx-react";

import { IconViewAll, IconPlus } from "@humansignal/icons";
import { Button } from "@humansignal/ui";
import { ff } from "@humansignal/core";
import { cn } from "../../utils/bem";
import { isSelfServe } from "../../utils/billing";
import { FF_BULK_ANNOTATION, FF_DEV_3873, isFF } from "../../utils/feature-flags";
import { AnnotationsCarousel } from "../AnnotationsCarousel/AnnotationsCarousel";
import { DynamicPreannotationsToggle } from "../AnnotationTab/DynamicPreannotationsToggle";
import { Actions } from "./Actions";
import { Annotations } from "./Annotations";
import { Controls } from "./Controls";

import "./TopBar.scss";

export const TopBar = observer(({ store }) => {
  const annotationStore = store.annotationStore;
  const entity = annotationStore?.selected;
  const isPrediction = entity?.type === "prediction";

  const isViewAll = annotationStore?.viewingAll === true;
  const isBulkMode = isFF(FF_BULK_ANNOTATION) && !isSelfServe() && store.hasInterface("annotation:bulk");

  if (isFF(FF_DEV_3873) && isBulkMode) return null;

  // Hide TopBar for Labeling Stream (when annotations:view-all interface is not present)
  // Keep TopBar visible for Review Stream and Quick View
  if (isFF(FF_DEV_3873) && !store.hasInterface("annotations:view-all")) return null;

  return store ? (
    <div
      className={cn("topbar")
        .mod({ newLabelingUI: isFF(FF_DEV_3873) })
        .toClassName()}
    >
      {isFF(FF_DEV_3873) ? (
        <div className={cn("topbar").elem("group").toClassName()}>
          {store.hasInterface("annotations:view-all") && (
            <Button
              className={"topbar__button"}
              type={isViewAll ? undefined : "string"}
              aria-label="Compare all annotations"
              onClick={annotationStore.toggleViewingAllAnnotations}
              variant={isViewAll ? "primary" : "neutral"}
              look={isViewAll ? "filled" : "string"}
              tooltip="Compare all annotations"
              size="small"
            >
              <IconViewAll />
            </Button>
          )}
          {store.hasInterface("annotations:add-new") && (
            <Button
              className={"topbar__button"}
              type={isViewAll ? undefined : "text"}
              aria-label="Create an annotation"
              variant="neutral"
              size="small"
              look="string"
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
          {(!isViewAll || ff.isActive(ff.FF_SUMMARY)) && (
            <AnnotationsCarousel
              store={store}
              annotationStore={store.annotationStore}
              commentStore={store.commentStore}
            />
          )}
        </div>
      ) : (
        <>
          <div className={cn("topbar").elem("group").toClassName()}>
            {!isViewAll && !isBulkMode && (
              <Annotations store={store} annotationStore={store.annotationStore} commentStore={store.commentStore} />
            )}
            <Actions store={store} />
          </div>
          <div className={cn("topbar").elem("group").toClassName()}>
            {!isViewAll && (
              <div className={cn("topbar").elem("section").toClassName()}>
                <DynamicPreannotationsToggle />
              </div>
            )}
            {!isViewAll && store.hasInterface("controls") && (store.hasInterface("review") || !isPrediction) && (
              <div
                className={cn("topbar").elem("section").mod({ flat: true }).toClassName()}
                style={{ width: 320, boxSizing: "border-box" }}
              >
                <Controls annotation={entity} />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  ) : null;
});
