import { observer } from "mobx-react";
import { useLayoutEffect } from "react";

const SpanHandles = ({ region, spans }) => {
  useLayoutEffect(() => region.attachHandles(spans), [region, spans]);

  return null;
};

/**
 * Resize handles are DOM nodes injected into region's spans. They are shown only for the selected region
 * which can be resized, and removed as soon as it's unselected, locked or became read-only otherwise.
 * Spans can be recreated (on resize, for example), so handles are reattached to the new ones.
 */
export const RegionResizeHandles = observer(({ item }) => {
  const region = item.annotation?.highlightedNode;

  if (!item.canResizeSpans || !region || region.parent !== item || region.isReadOnly?.()) return null;

  const spans = region._spans;

  if (!spans?.length) return null;

  return <SpanHandles region={region} spans={spans} />;
});
