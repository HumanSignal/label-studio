/**
 * Classic editor (MST) binding for the vertical-layout nudge (FIT-3345).
 *
 * Mounted in `App.jsx` above everything that depends on the layout: accepting the nudge flips the layout,
 * which removes the `TopBar` (and its carousel) from the tree while the tour's second step is still showing.
 * The carousel wrapper reaches the nudge through `useCarouselNavigationIntent()`.
 */
import { observer } from "mobx-react";
import { VerticalLayoutNudge, ff, isAnnotatorRole } from "@humansignal/core";
import { useProductTourApi } from "./product-tour-api";

export const ClassicVerticalLayoutNudge = observer(({ store, children }) => {
  const isVertical =
    ff.isActive(ff.FF_FIT_ANNOTATIONS_VERTICAL_LAYOUT) && store.settings.annotationsListLayout === "vertical";

  // Same predicate as the Settings toggle the nudge points at (Settings.jsx), plus the layout still being horizontal
  const enabled =
    ff.isActive(ff.FF_FIT_ANNOTATIONS_VERTICAL_LAYOUT) &&
    store.hasInterface("annotations:tabs") &&
    !isAnnotatorRole() &&
    !isVertical;

  return (
    <VerticalLayoutNudge
      enabled={enabled}
      onSwitchToVertical={() => store.settings.setAnnotationsListLayout("vertical")}
      useAPI={useProductTourApi}
    >
      {children}
    </VerticalLayoutNudge>
  );
});
