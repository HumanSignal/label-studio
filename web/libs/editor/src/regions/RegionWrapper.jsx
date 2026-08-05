import { observer } from "mobx-react";
import { Fragment } from "react";

export const RegionWrapper = observer(({ children }) => {
  return (
    <Fragment>
      {children}
    </Fragment>
  );
});
