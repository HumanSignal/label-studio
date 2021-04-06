import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { generatePath, matchPath, useHistory, useLocation } from 'react-router';
import { Pages } from '../pages';
import { setBreadcrumbs, useBreadcrumbControls } from '../services/breadrumbs';
import { pageSetToRoutes } from '../utils/routeHelpers';
import { useAppStore } from './AppStoreProvider';
import { useConfig } from './ConfigProvider';

export const RoutesContext = createContext();

const findMacthingComponents = (path, routesMap, parentPath = "") => {
  const result = [];

  const match = routesMap.find((route) => {
    const matchingPath = `${parentPath}${route.path}`;
    const match = matchPath(path, { path: matchingPath });

    return match;
  });

  if (match) {
    const routePath = `${parentPath}${match.path}`;
    result.push({ ...match, path: routePath });

    if (match.routes) {
      result.push(...findMacthingComponents(path, match.routes, routePath));
    }
  }

  return result;
};

// const logRoutes = (routes, parentPath = "") => {
//   routes?.forEach?.(({routes, ...route}) => {
//     const fullPath = `${parentPath}${route.path}`;
//     console.log({...route, path: fullPath});
//     logRoutes(routes, fullPath);
//   });
// };

export const RoutesProvider = ({children}) => {
  const history = useHistory();
  const location = useLocation();
  const config = useConfig();
  const {store} = useAppStore();
  const breadcrumbs = useBreadcrumbControls();
  const [currentContext, setCurrentContext] = useState(null);
  const [currentContextProps, setCurrentContextProps] = useState(null);

  const routesMap = useMemo(() => {
    return pageSetToRoutes(Pages, {config, store});
  }, [location, config, store, history]);

  const routesChain = useMemo(() => {
    return findMacthingComponents(location.pathname, routesMap);
  }, [location, routesMap]);

  const lastRoute = useMemo(() => {
    return routesChain.filter(r => !r.modal).slice(-1)[0];
  }, [routesChain]);

  const [currentPath, setCurrentPath] = useState(lastRoute?.path);

  const contextValue = useMemo(() => ({
    routesMap,
    breadcrumbs,
    currentContext,
    setContextProps: setCurrentContextProps,
    path: currentPath,
  }), [
    breadcrumbs,
    routesMap,
    currentContext,
    currentPath,
    setCurrentContext,
  ]);

  useEffect(() => {
    console.log("Location changed");
    const ContextComponent = lastRoute?.context;

    setCurrentContext({
      component: ContextComponent ?? null,
      props: currentContextProps,
    });

    setCurrentPath(lastRoute?.path);

    try {
      const crumbs = routesChain.map(route => {
        const params = matchPath(location.pathname, { path: route.path });
        const path = generatePath(route.path, params.params);
        const title = route.title instanceof Function ? route.title() : route.title;
        const key = route.component?.displayName ?? route.key ?? path;

        return {path, title, key};
      }).filter(c => !!c.title);

      setBreadcrumbs(crumbs);
      console.log(crumbs);
    } catch (err) {
      console.log(err);
    }
  }, [location, routesMap, currentContextProps, routesChain, lastRoute]);

  return (
    <RoutesContext.Provider value={contextValue}>
      {children}
    </RoutesContext.Provider>
  );
};

export const useRoutesMap = () => {
  return useContext(RoutesContext)?.routesMap ?? [];
};

export const useBreadcrumbs = () => {
  return useContext(RoutesContext)?.breadcrumbs ?? [];
};

export const useCurrentPath = () => {
  return useContext(RoutesContext)?.path;
};

export const useParams = () => {
  const location = useLocation();
  const currentPath = useCurrentPath();

  const match = useMemo(() => {
    return matchPath(location.pathname, currentPath ?? "");
  }, [location, currentPath]);

  return match?.params ?? {};
};

export const useContextComponent = () => {
  const ctx = useContext(RoutesContext);
  const {
    component: ContextComponent,
    props: contextProps,
  } = ctx?.currentContext ?? {};

  return { ContextComponent, contextProps };
};

export const useContextProps = () => {
  const setProps = useContext(RoutesContext).setContextProps;
  return useMemo(() => setProps, [setProps]);
};

