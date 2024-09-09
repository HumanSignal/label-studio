import { observer } from "mobx-react";
import { Block, Elem } from "../../utils/bem";
import { Actions } from "./Actions";
import { Controls, CustomControls } from "./Controls";
import "./BottomBar.scss";
import { FF_BULK_ANNOTATION, FF_DEV_3873, isFF } from "../../utils/feature-flags";

export const BottomBar = observer(({ store }) => {
  const annotationStore = store.annotationStore;
  const entity = annotationStore?.selected;
  const isPrediction = entity?.type === "prediction";

  const isViewAll = annotationStore?.viewingAll === true;

  return store && !isViewAll ? (
    <Block name="bottombar" style={{ borderTop: isFF(FF_DEV_3873) && "1px solid rgba(0,0,0,0.1)" }}>
      <Elem name="group">
        <Actions store={store} />
      </Elem>
      <Elem name="group">
        {store.hasInterface("controls") && (store.hasInterface("review") || !isPrediction) && (
          <Elem name="section" mod={{ flat: true }}>
            {isFF(FF_BULK_ANNOTATION) && store.hasInterface("controls:custom") ? (
              <CustomControls annotation={entity} />
            ) : (
              <Controls annotation={entity} />
            )}
          </Elem>
        )}
      </Elem>
    </Block>
  ) : null;
});
