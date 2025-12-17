import { observer } from "mobx-react";
import { cn } from "../../utils/bem";
import { isSelfServe } from "../../utils/billing";
import { FF_BULK_ANNOTATION, isFF } from "../../utils/feature-flags";
import { Actions } from "./Actions";
import { Controls } from "./Controls";
import { CurrentTask } from "./CurrentTask";
import "./BottomBar.scss";

export const BottomBar = observer(({ store }) => {
  const annotationStore = store.annotationStore;
  const entity = annotationStore?.selected;
  const isPrediction = entity?.type === "prediction";

  const isViewAll = annotationStore?.viewingAll === true;
  const isBulkMode = isFF(FF_BULK_ANNOTATION) && !isSelfServe() && store.hasInterface("annotation:bulk");

  return store && !isViewAll ? (
    <div className={cn("bottombar").toClassName()}>
      <div className={cn("bottombar").elem("group").toClassName()}>
        {!isBulkMode && <CurrentTask store={store} />}
        <Actions store={store} />
      </div>
      <div className={cn("bottombar").elem("group").toClassName()}>
        {store.hasInterface("controls") && (store.hasInterface("review") || !isPrediction) && (
          <div className={cn("bottombar").elem("section").mod({ flat: true }).toClassName()}>
            <Controls annotation={entity} />
          </div>
        )}
      </div>
    </div>
  ) : null;
});
