import { isDefined } from "../utils/helpers";
import { atom, useAtomValue } from "jotai";
import { JotaiStore } from "../utils/jotai-store";

const _initialBreadcrumbs = [];

const _noop = () => {
  if (process.env.NODE_ENV === "development") {
    console.warn("Breadcrumbs must be initialized first");
  }
};

const crumbsAtom = atom([]);

export const setBreadcrumbs = (newCrumbs) => {
  JotaiStore.set(crumbsAtom, newCrumbs ?? []);
};

export const addCrumb = (crumb) => {
  if (!isDefined(crumb?.key)) throw Error("Crumb must have a key");

  JotaiStore.set(crumbsAtom, (crumbs) => [...crumbs, crumb]);
};

export const deleteCrumb = (key) => {
  JotaiStore.set(crumbsAtom, (crumbs) => crumbs.filter((c) => c.key !== key));
};

export const addAction = (key, onClick) => {
  JotaiStore.set(crumbsAtom, (crumbs) =>
    crumbs.map((crumb) => {
      if (crumb.key === key) {
        return { ...crumb, onClick };
      }
      return crumb;
    }),
  );
};

export const deleteAction = (key) => {
  JotaiStore.set(crumbsAtom, (crumbs) =>
    crumbs.map((crumb) => {
      if (crumb.key === key) delete crumb.onClick;

      return crumb;
    }),
  );
};

export const useBreadcrumbControls = () => {
  return useAtomValue(crumbsAtom);
};
