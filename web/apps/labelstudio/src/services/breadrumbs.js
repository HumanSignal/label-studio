import { useCallback, useState } from "react";
import { singletonHook } from "react-singleton-hook";
import { isDefined } from "../utils/helpers";

const initialBreadcrumbs = [];

const noop = () => {
  if (process.env.NODE_ENV === "development") {
    console.warn("Breadcrumbs must be initialized first");
  }
};

export let setBreadcrumbs = noop;

export let addCrumb = noop;

export let deleteCrumb = noop;

export let addAction = noop;

export let deleteAction = noop;

let localCrumbs = [];

export const useBreadcrumbControls = singletonHook(initialBreadcrumbs, () => {
  const [breadcrumbs, setBreadcrumbsState] = useState(initialBreadcrumbs);

  localCrumbs = breadcrumbs;
  setBreadcrumbs = (newCrumbs) => {
    const crumbs = [...(newCrumbs ?? [])];

    setBreadcrumbsState(crumbs);
    localCrumbs = crumbs;
  };

  addCrumb = useCallback(
    (crumb) => {
      if (!isDefined(crumb?.key)) throw Error("Crumb must have a key");
      const crumbs = [...localCrumbs, crumb];

      setBreadcrumbs(crumbs);
      localCrumbs = crumbs;
    },
    [breadcrumbs],
  );

  deleteCrumb = useCallback(
    (key) => {
      const crumbs = localCrumbs.filter((c) => c.key !== key);

      setBreadcrumbs(crumbs);
      localCrumbs = crumbs;
    },
    [breadcrumbs],
  );

  addAction = useCallback(
    (key, onClick) => {
      const crumbs = localCrumbs.map((crumb) => {
        if (crumb.key === key) {
          return { ...crumb, onClick };
        }
        return crumb;
      });

      setBreadcrumbs(crumbs);
      localCrumbs = crumbs;
    },
    [breadcrumbs],
  );

  deleteAction = useCallback(
    (key) => {
      const crumbs = localCrumbs.map((crumb) => {
        if (crumb.key === key) delete crumb.onClick;

        return crumb;
      });

      setBreadcrumbs(crumbs);
      localCrumbs = crumbs;
    },
    [breadcrumbs],
  );

  return breadcrumbs;
});
