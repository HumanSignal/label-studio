import { inject } from "mobx-react";
import { ArrowsClockwiseIcon } from "@humansignal/icons";
import { Button } from "@humansignal/ui";

const injector = inject(({ store }) => {
  return {
    store,
    needsDataFetch: store.needsDataFetch,
    backgroundActionPending: store.backgroundActionPending,
    projectFetch: store.projectFetch,
  };
});

export const RefreshButton = injector(
  ({ store, needsDataFetch, backgroundActionPending, projectFetch, size, style, ...rest }) => {
    const highlight = needsDataFetch || backgroundActionPending;
    return (
      <Button
        size={size ?? "small"}
        look={highlight ? "filled" : "outlined"}
        variant={highlight ? "primary" : "neutral"}
        waiting={projectFetch}
        aria-label="Refresh data"
        onClick={async () => {
          await store.fetchProject({ force: true, interaction: "refresh" });
          // Refresh the role column catalog before tasks so denied filters are
          // stripped from annotator virtual tabs (and chips stay hidden for
          // shared views) — same graceful path as initial tab apply (FIT-2850).
          await store.refreshColumns?.();
          await store.currentView?.reload({ interaction: "refresh" });
        }}
        leading={<ArrowsClockwiseIcon size={20} />}
      />
    );
  },
);
