import { observer } from "mobx-react";
import { cn } from "../../utils/bem";
import { Actions } from "./Actions";
import { Controls } from "./Controls";
import "./BottomBar.scss";
import { FF_DEV_3873, isFF } from "../../utils/feature-flags";

export const BottomBar = observer(({ store }) => {
  const annotationStore = store.annotationStore;
  const entity = annotationStore?.selected;
  const isPrediction = entity?.type === "prediction";

  const isViewAll = annotationStore?.viewingAll === true;

  return store && !isViewAll ? (
    <div
      className={cn("bottombar").toClassName()}
      style={{ borderTop: isFF(FF_DEV_3873) && "1px solid rgba(0,0,0,0.1)" }}
    >
      <div className={cn("bottombar").elem("group").toClassName()}>
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
