import { inject } from "mobx-react";
import { LsRefresh, LsRefresh2 } from "../../../assets/icons";
import { FF_LOPS_E_10, isFF } from "../../../utils/feature-flags";
import { Button } from "../../Common/Button/Button";

const isNewUI = isFF(FF_LOPS_E_10);

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
      size={size}
      look={needsDataFetch}
      waiting={projectFetch}
      onClick={async () => {
        await store.fetchProject({ force: true, interaction: "refresh" });
        await store.currentView?.reload();
      }}
      style={{
        ...(style ?? {}),
        minWidth: 0,
        padding: 0,
        width: isNewUI ? 40 : 32,
      }}
      {...rest}
    >
      {isNewUI ? <LsRefresh2 /> : <LsRefresh style={{ width: 20, height: 20 }} />}
    </Button>
  );
});
