import { useCallback, useMemo, useState } from "react";

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
