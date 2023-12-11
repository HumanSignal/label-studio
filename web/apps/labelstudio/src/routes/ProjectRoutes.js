import React from 'react';
import { useRoutesMap } from '../providers/RoutesProvider';
import { resolveRoutes } from '../utils/routeHelpers';
import { RouteWithStaticFallback } from './RouteWithStaticFallback';

export const ProjectRoutes = ({content}) => {
  const routes = useRoutesMap();
  const resolvedRoutes = resolveRoutes(routes, {content});

  return resolvedRoutes ? (
    <RouteWithStaticFallback path="/" children={resolvedRoutes}/>
  ) : null;
};
