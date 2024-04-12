import { inject } from "mobx-react";
import { Spinner } from "../../Common/Spinner";

const injector = inject(({ store }) => {
  const { dataStore, currentView } = store;

  return {
    loading: dataStore?.loading || currentView?.locked,
  };
});

export const LoadingPossum = injector(({ loading }) => {
  return <Spinner size="small" visible={loading} />;
});
