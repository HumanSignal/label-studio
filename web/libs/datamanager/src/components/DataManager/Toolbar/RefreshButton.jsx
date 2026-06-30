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
          await store.currentView?.reload();
        }}
        leading={<ArrowsClockwiseIcon size={20} />}
      />
    );
  },
);
