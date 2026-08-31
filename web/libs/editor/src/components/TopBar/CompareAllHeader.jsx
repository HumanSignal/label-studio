/**
 * Classic editor (MST) Compare All modal header.
 *
 * Rendered in place of the TopBar when the vertical annotations sidebar is
 * active and the user enters Compare All (View All) mode.  Shows the
 * IntersectSquare icon + "Compare All" title on the left and a Close button on
 * the right so the user can exit Compare All without the sidebar toggle.
 */
import { observer } from "mobx-react";
import { IntersectSquareIcon, XIcon } from "@humansignal/icons";
import { Button, Typography } from "@humansignal/ui";
import { emitOverviewOpenedOrClosed } from "../../utils/labelingTelemetry";

export const CompareAllHeader = observer(({ store }) => {
  const onClose = () => {
    store.annotationStore.toggleViewingAllAnnotations();
    emitOverviewOpenedOrClosed(store, "closed", store.annotationStore.selected ?? null);
  };

  return (
    <div
      style={{
        height: "var(--topbar-height, 42px)",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 var(--spacing-tight, 8px)",
        backgroundColor: "var(--color-neutral-surface)",
        borderBottom: "1px solid var(--shell-border-color, var(--color-neutral-border))",
        userSelect: "none",
        position: "sticky",
        top: 0,
        zIndex: 101,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-tight, 8px)" }}>
        <IntersectSquareIcon size={20} className="text-primary-icon" />
        <Typography variant="title" size="small">
          Compare All
        </Typography>
      </div>
      <Button
        variant="primary"
        look="string"
        size="small"
        aria-label="Close Compare All"
        onClick={onClose}
        className="p-0"
        leading={<XIcon size={20} />}
      />
    </div>
  );
});
