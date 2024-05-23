import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useHistory } from "react-router";
import { useFixedLocation } from "../providers/RoutesProvider";

export const useSet = <T>(initialSet: Set<T> = new Set()) => {
  const [set, setSet] = useState(initialSet);

  const stableActions = useMemo(() => {
    const add = (item: T) =>
      setSet((prevSet) => {
        return new Set([...Array.from(prevSet), item]);
      });

    const remove = (item: T) =>
      setSet((prevSet) => {
        return new Set(Array.from(prevSet).filter((i) => i !== item));
      });

    const toggle = (item: T) =>
      setSet((prevSet) => {
        return prevSet.has(item)
          ? new Set(Array.from(prevSet).filter((i) => i !== item))
          : new Set([...Array.from(prevSet), item]);
      });

    return { add, remove, toggle, reset: () => setSet(initialSet) };
  }, [setSet]);

  const utils = {
    has: useCallback((item) => set.has(item), [set]),
    ...stableActions,
  };

  return [set, utils];
};

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
