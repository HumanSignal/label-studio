import { inject, observer } from "mobx-react";
import { Button } from "@humansignal/ui";

export const GridAnnotationsToggle = inject("store")(
  observer(({ store, size }) => {
    if (
      store.currentView?.type !== "grid" ||
      store.SDK.type === "DE" ||
      !store.currentView.fieldsAsColumns.some((field) => field.type === "Image")
    )
      return null;
    return (
      <Button
        size={size}
        variant="neutral"
        look="outlined"
        aria-pressed={store.gridShowAnnotations}
        onClick={store.toggleGridAnnotations}
      >
        {store.gridShowAnnotations ? "Hide annotations" : "Show annotations"}
      </Button>
    );
  }),
);
