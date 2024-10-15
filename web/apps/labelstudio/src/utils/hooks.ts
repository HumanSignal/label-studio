import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useHistory } from "react-router";
import { useFixedLocation } from "../providers/RoutesProvider";

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

export function useFirstMountState(): boolean {
  const isFirst = useRef(true);

  if (isFirst.current) {
    isFirst.current = false;

    return true;
  }

  return isFirst.current;
}

export const useUpdateEffect: typeof useEffect = (effect, deps) => {
  const isFirstMount = useFirstMountState();

  useEffect(() => {
    if (!isFirstMount) {
      return effect();
    }
  }, deps);
};
