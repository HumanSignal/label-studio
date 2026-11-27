/**
 * Denied-column filter helpers for Data Manager (FIT-2850).
 * Kept outside store.js / tab.js so both can share them without a cycle.
 */
import { destroy } from "mobx-state-tree";

export const FILTER_REMOVED_NOTICE = "One or more of your filters was removed as it can no longer be applied";

export function noticeKeyForView(view) {
  const projectId = view.root?.SDK?.projectId ?? view.root?.project?.id ?? "";
  return `${projectId}_${view.id ?? view.key}`;
}

/**
 * Drop filter items whose column is not in the role catalog.
 * Used for annotator virtual tabs so denied-column filters clear client-side.
 * Saved/shared tabs keep filters on the server and only hide them via dataCleanup.
 */
export function stripUnavailableFilterItems(items, availableFilterIds) {
  if (!Array.isArray(items)) return { items: [], removed: false };

  let removed = false;
  const next = [];

  for (const item of items) {
    if (!item?.filter || !availableFilterIds.has(item.filter)) {
      removed = true;
      continue;
    }

    const hasChildren = Array.isArray(item.child_filters);
    if (!hasChildren) {
      next.push(item);
      continue;
    }

    const childResult = stripUnavailableFilterItems(item.child_filters, availableFilterIds);
    removed = removed || childResult.removed;
    next.push({ ...item, child_filters: childResult.items });
  }

  return { items: next, removed };
}

export function stripUnavailableFiltersFromVirtualSnapshot(snapshot, availableFilters) {
  if (!snapshot?.virtual || !snapshot.filters) {
    return { snapshot, removed: false };
  }

  const availableFilterIds = new Set((availableFilters ?? []).map((filter) => filter.id));
  if (!availableFilterIds.size) {
    return { snapshot, removed: false };
  }

  const filters = snapshot.filters;

  if (Array.isArray(filters)) {
    const { items, removed } = stripUnavailableFilterItems(filters, availableFilterIds);
    return { snapshot: { ...snapshot, filters: items }, removed };
  }

  if (typeof filters === "object" && Array.isArray(filters.items)) {
    const { items, removed } = stripUnavailableFilterItems(filters.items, availableFilterIds);
    return {
      snapshot: { ...snapshot, filters: { ...filters, items } },
      removed,
    };
  }

  return { snapshot, removed: false };
}

export function notifyVirtualFiltersRemoved(view) {
  if (!view?.virtual) return;
  const notices = view.root?.viewsStore?.filterNoticesShown;
  const noticeKey = noticeKeyForView(view);
  if (notices?.has(noticeKey)) return;
  notices?.add(noticeKey);
  view.root?.SDK?.invoke("toast", { message: FILTER_REMOVED_NOTICE, type: "info" });
}

/**
 * After the column catalog rebuilds (or before a tasks reload), remove virtual-tab
 * filters that no longer resolve. Saved tabs are left alone — dataCleanup hides
 * denied filters; the server still applies them.
 *
 * @returns {boolean} true when at least one filter was removed
 */
export function clearUnavailableVirtualFilters(view) {
  if (!view?.virtual) return false;

  const availableFilterIds = new Set((view.parent?.availableFilters ?? []).map((filter) => filter.id));
  if (!availableFilterIds.size) return false;

  const toRemove = [];
  for (const filterModel of view.filters) {
    let filterId = null;
    try {
      filterId = filterModel.filter?.id ?? null;
    } catch {
      filterId = null;
    }
    if (!filterId || !availableFilterIds.has(filterId)) {
      toRemove.push(filterModel);
    }
  }

  if (!toRemove.length) return false;

  for (const filterModel of toRemove) {
    const index = view.filters.indexOf(filterModel);
    if (index > -1) {
      view.filters.splice(index, 1);
      destroy(filterModel);
    }
  }

  notifyVirtualFiltersRemoved(view);
  return true;
}
