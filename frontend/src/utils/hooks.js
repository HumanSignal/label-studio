import { useCallback, useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router';

export const useSet = (initialSet = new Set) => {
  const [set, setSet] = useState(initialSet);

  const stableActions = useMemo(() => {
    const add = (item) => setSet((prevSet) => {
      return new Set([...Array.from(prevSet), item]);
    });

    const remove = (item) => setSet((prevSet) => {
      return new Set(Array.from(prevSet).filter((i) => i !== item));
    });

    const toggle = (item) => setSet((prevSet) => {
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
  const {pathname} = useLocation();


  const refresh = useCallback((redirectPath) => {
    history.replace("/");

    setTimeout(() => {
      history.replace(redirectPath ?? pathname);
    }, 10);

    return pathname;
  }, [pathname]);

  return refresh;
};
