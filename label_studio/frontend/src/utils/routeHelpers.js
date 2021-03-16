import React from 'react';
import { Route } from 'react-router';
import { RouteWithStaticFallback } from "../routes/RouteWithStaticFallback";

export const RouteContext = React.createContext();

const resolveWithConfig = (routes, config) => {
  return routes instanceof Function ? routes(config) : routes;
};

/**
 * Resolves a set of components in a set of routes usign component
 * properties.
 *
 * Component can has:
 * @param {String|Function} title Title of a page. Can be either a string or a function that accepts route props as an argument
 * @param {String} path Path of the page. It is always relative to the parent
 * @param {boolean} exact Exact match of the route
 * @param {Array} routes A list of raw routes
 * @param {Object} pages Object with component that define pages. If provided, the function will run recursively
 *
 * The function itself accepts only pages argument.
 * @param {Object} pages Object with components that define pages
 */
export const pageSetToRoutes = (pages, config) => {
  const pageProcessor = ([name, page]) => {
    const route = {
      path: page.path,
    };

    route.exact = !!page.exact;
    route.modal = !!page.modal;

    if (page.title) route.title = page.title;
    if (page.render) route.render = page.render;

    if (page instanceof React.Component || page instanceof Function) {
      if (name && /Layout/.test(name)) route.layout = page;
      else route.component = page;
    } else {
      route.component = page.component;
      route.layout = page.layout;
    }

    if (page.pages) {
      route.routes = pageSetToRoutes(resolveWithConfig(page.pages, config), config);
    } else if (page.routes) {
      route.routes = pageSetToRoutes(resolveWithConfig(page.routes, config), config);
    }

    if (route.component?.context) route.context = route.component.context;

    return route;
  };

  try {
    if (Array.isArray(pages)) {
      return pages.map((page) => pageProcessor([null, page]));
    } else {
      return Object.entries(pages).map(pageProcessor);
    }
  } catch (err) {
    console.log(err);
    return [];
  }
};

/**
 *
 * @param {Array} routes List of routes
 * @param {*} props Props to pass to every component and layout
 * @param {*} onRender Callback that runs on every route render
 */
export const resolveRoutes = (routes, props) => {
  const resolver = (route, parentPath) => {
    const { component: Component, layout: Layout, path, modal, routes: _routes, ...rest } = route;

    const fullPath = parentPath ? `${parentPath}${path}` : path;

    if (_routes) {
      const resolvedNestedRoutes = processRoutes(_routes, fullPath);

      const RouteComponent = (routeProps) => {
        const children = [];

        // If a component provided for the set of routes/pages,
        // we render in one level higher to preserve nesting
        if (Component) {
          children.push(processRoutes([{
            path,
            modal, ...rest,
            component: Component,
          }], parentPath));
        }

        children.push(...resolvedNestedRoutes);

        return Layout ? <Layout {...routeProps}>{children}</Layout> : children;
      };

      return (
        <RouteWithStaticFallback key={fullPath} path={fullPath} render={RouteComponent}/>
      );
    } else {
      const routeProps = { key: fullPath, path: fullPath, modal: !!Component.modal };
      return <Route {...routeProps} exact render={() => (
        <Component {...(props ?? {})}/>
      )} {...rest}/>;
    }
  };

  const processRoutes = (routes, fullPath) => {
    return routes.map((route) => resolver(route, fullPath));
  };

  return processRoutes(routes);
};
