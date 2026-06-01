import { inject } from "mobx-react";
import { ArrowsClockwiseIcon } from "@humansignal/icons";
import { Button } from "@humansignal/ui";

const injector = inject(({ store }) => {
  return {
    store,
    needsDataFetch: store.needsDataFetch,
    projectFetch: store.projectFetch,
  };
});

export const RefreshButton = injector(({ store, needsDataFetch, projectFetch, size, style, ...rest }) => {
  return (
    <Button
      size={size ?? "small"}
      look={needsDataFetch ? "filled" : "outlined"}
      variant={needsDataFetch ? "primary" : "neutral"}
      waiting={projectFetch}
      aria-label="Refresh data"
      onClick={async () => {
        await store.fetchProject({ force: true, interaction: "refresh" });
        await store.currentView?.reload();
      }}
      leading={<ArrowsClockwiseIcon size={20} />}
    />
  );
});
