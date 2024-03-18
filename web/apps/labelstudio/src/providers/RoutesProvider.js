import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { generatePath, matchPath, useHistory, useLocation } from "react-router";
import { Pages } from "../pages";
import { setBreadcrumbs, useBreadcrumbControls } from "../services/breadrumbs";
import { pageSetToRoutes } from "../utils/routeHelpers";
import { useAppStore } from "./AppStoreProvider";
import { useConfig } from "./ConfigProvider";

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

export const RoutesProvider = ({ children }) => {
  const history = useHistory();
  const location = useFixedLocation();
  const config = useConfig();
  const { store } = useAppStore();
  const breadcrumbs = useBreadcrumbControls();
  const [currentContext, setCurrentContext] = useState(null);
  const [currentContextProps, setCurrentContextProps] = useState(null);

  const routesMap = useMemo(() => {
    return pageSetToRoutes(Pages, { config, store });
  }, [location, config, store, history]);

  const routesChain = useMemo(() => {
    return findMacthingComponents(location.pathname, routesMap);
  }, [location, routesMap]);

  const lastRoute = useMemo(() => {
    return routesChain.filter((r) => !r.modal).slice(-1)[0];
  }, [routesChain]);

  const [currentPath, setCurrentPath] = useState(lastRoute?.path);

  const contextValue = useMemo(
    () => ({
      routesMap,
      breadcrumbs,
      currentContext,
      setContextProps: setCurrentContextProps,
      path: currentPath,
      findComponent: (path) => findMacthingComponents(path, routesMap),
    }),
    [breadcrumbs, routesMap, currentContext, currentPath, setCurrentContext],
  );

  useEffect(() => {
    const ContextComponent = lastRoute?.context;

    setCurrentContext({
      component: ContextComponent ?? null,
      props: currentContextProps,
    });

    setCurrentPath(lastRoute?.path);

    try {
      const crumbs = routesChain
        .map((route) => {
          const params = matchPath(location.pathname, { path: route.path });
          const path = generatePath(route.path, params.params);
          const title = route.title instanceof Function ? route.title() : route.title;
          const key = route.component?.displayName ?? route.key ?? path;

          return { path, title, key };
        })
        .filter((c) => !!c.title);

      setBreadcrumbs(crumbs);
    } catch (err) {
      console.log(err);
    }
  }, [location, routesMap, currentContextProps, routesChain, lastRoute]);

  return <RoutesContext.Provider value={contextValue}>{children}</RoutesContext.Provider>;
};

export const useRoutesMap = () => {
  return useContext(RoutesContext)?.routesMap ?? [];
};

export const useFindRouteComponent = () => {
  return useContext(RoutesContext)?.findComponent ?? (() => null);
};

export const useBreadcrumbs = () => {
  return useContext(RoutesContext)?.breadcrumbs ?? [];
};

export const useCurrentPath = () => {
  return useContext(RoutesContext)?.path;
};

export const useParams = () => {
  const location = useFixedLocation();
  const currentPath = useCurrentPath();

  const match = useMemo(() => {
    const parsedLocation = location.search
      .replace(/^\?/, "")
      .split("&")
      .map((pair) => {
        const [key, value] = pair.split("=").map((p) => decodeURIComponent(p));
        return [key, value];
      });

    const search = Object.fromEntries(parsedLocation);

    const urlParams = matchPath(location.pathname, currentPath ?? "");

    return { ...search, ...(urlParams?.params ?? {}) };
  }, [location, currentPath]);

  return match ?? {};
};

export const useContextComponent = () => {
  const ctx = useContext(RoutesContext);
  const { component: ContextComponent, props: contextProps } = ctx?.currentContext ?? {};

  return { ContextComponent, contextProps };
};

export const useFixedLocation = () => {
  const location = useLocation();

  location;

  const result = useMemo(() => {
    return location.location ?? location;
  }, [location]);

  return result;
};

export const useContextProps = () => {
  const setProps = useContext(RoutesContext).setContextProps;
  return useMemo(() => setProps, [setProps]);
};
