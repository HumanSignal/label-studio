import { useCallback } from "react";
import { useHistory } from "react-router";
import { useFixedLocation } from "../providers/RoutesProvider";

export { useFirstMountState, useUpdateEffect } from "./use-update-effect";

export const useRefresh = () => {
  const history = useHistory();
  const { pathname } = useFixedLocation();

  const refresh = useCallback(
    (redirectPath) => {
      history.replace("/");

      setTimeout(() => {
        history.replace(redirectPath ?? pathname);
      }, 10);

      return pathname;
    },
    [pathname],
  );

  return refresh;
};

