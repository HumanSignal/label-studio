import React, { Children } from "react";
import { Switch } from "react-router";
import { StaticContent } from "../app/StaticContent/StaticContent";
import { MenubarContext } from "../components/Menubar/Menubar";

import { SentryRoute as Route } from "../config/Sentry";

const extractModalRoutes = (children) => {
  const modalRoutes = [];
  const regularRoutes = [];

  try {
    Children.toArray(children).forEach((child) => {
      if (child?.props?.modal) modalRoutes.push(child);
      else regularRoutes.push(child);
    });
  } catch (err) {
    console.log(err);
    console.log({ children });
  }

  return [modalRoutes, regularRoutes];
};

/**
 * Router wrapper that handles 404 pages
 */
export const RouteWithStaticFallback = ({ children, render, route, component, staticComponent, ...props }) => {
  const menubar = React.useContext(MenubarContext);

  const notFoundRenderer = (children) => {
    let modalRoutes = [];
    let regularRoutes = [];

    if (children.props && children.props.children) {
      [modalRoutes, regularRoutes] = extractModalRoutes(children.props.children);
      children = React.cloneElement(children, { children: regularRoutes });
    } else if (Array.isArray(children)) {
      [modalRoutes, regularRoutes] = extractModalRoutes(children);
      children = regularRoutes;
    }

    const Static = () => {
      if (menubar?.contextIsSet(null) === false) menubar?.setContext(null);
      return staticComponent ?? <StaticContent id="main-content" />;
    };

    const exactRoutes = modalRoutes.reduce(
      (res, route) => {
        if (route.props.exact) {
          res.exact.push(route);
        } else {
          res.modal.push(route);
        }
        return res;
      },
      {
        exact: [],
        modal: [],
      },
    );

    return (
      <>
        {exactRoutes.modal}
        <Switch>
          {exactRoutes.exact}
          {children}

          <Route exact>
            <Static />
          </Route>
        </Switch>
      </>
    );
  };

  const routeProps = {};

  if (render) {
    routeProps.render = (props) => notFoundRenderer(render(props));
  } else if (children instanceof Function) {
    routeProps.children = (props) => notFoundRenderer(children(props));
  } else if (component) {
    routeProps.component = (props) => notFoundRenderer(component(props));
  } else {
    routeProps.children = notFoundRenderer(children);
  }

  return route !== false ? <Route {...props} {...routeProps} /> : notFoundRenderer(children);
};
