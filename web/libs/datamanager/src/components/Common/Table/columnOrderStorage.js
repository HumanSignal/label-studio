/** Browser localStorage key for personal Data Manager column drag-order (legacy). */
export const DM_COLUMN_ORDER_STORAGE_KEY = "dm:columnorder";

/**
 * Read the personal (browser-wide) column order map.
 * Used only when FF_DM_SHARED_COLUMN_ORDER is off.
 */
export function readPersonalColumnOrder(storage = localStorage) {
  try {
    return JSON.parse(storage.getItem(DM_COLUMN_ORDER_STORAGE_KEY)) ?? {};
  } catch {
    return {};
  }
}

/**
 * Write the personal (browser-wide) column order map.
 * Used only when FF_DM_SHARED_COLUMN_ORDER is off.
 */
export function writePersonalColumnOrder(order, storage = localStorage) {
  storage.setItem(DM_COLUMN_ORDER_STORAGE_KEY, JSON.stringify(order));
}

/**
 * Persist personal order only when shared-tab order (FIT-2882 FF) is off.
 * Table calls this from its effect so FF-on never touches `dm:columnorder`.
 * @returns {boolean} true when a personal write was performed
 */
export function persistPersonalColumnOrderIfNeeded(sharedColumnOrderEnabled, order, write = writePersonalColumnOrder) {
  if (sharedColumnOrderEnabled) return false;
  write(order);
  return true;
}

/**
 * Resolve which column-order map the Table grid should apply (FIT-2846 / FIT-2882).
 *
 * Priority when shared-tab order is off:
 * 1. Personal localStorage entries that touch the current view's columns
 * 2. Tab `columnOrder` when project DM column defaults FF is on
 * 3. Otherwise `{}` (catalog / natural order) — including when both FFs are off
 *    so older persisted tab `columnOrder` does not suddenly apply
 *
 * @param {{
 *   sharedColumnOrder?: boolean,
 *   projectColumnDefaults?: boolean,
 *   personalOrder?: Record<string, number>,
 *   tabColumnOrder?: Record<string, number>,
 *   columnIds?: string[],
 * }} [opts]
 * @returns {Record<string, number>}
 */
export function resolveEffectiveColumnOrder({
  sharedColumnOrder = false,
  projectColumnDefaults = false,
  personalOrder = {},
  tabColumnOrder = {},
  columnIds = [],
} = {}) {
  if (sharedColumnOrder) return tabColumnOrder ?? {};

  const personal = personalOrder ?? {};
  const ids = columnIds ?? [];
  const personalHasRelevantOrder =
    ids.length > 0 ? ids.some((id) => Object.hasOwn(personal, id)) : Object.keys(personal).length > 0;

  if (personalHasRelevantOrder) return personal;
  if (projectColumnDefaults) return tabColumnOrder ?? {};
  return {};
}

/** @type {Set<(next: Record<string, number>) => void>} */
const personalOrderClearedListeners = new Set();

/**
 * Subscribe to personal-order clears (FIT-2846 Reset). Table uses this to sync React state
 * so restored tab `columnOrder` can take effect when shared order is off.
 * @param {(next: Record<string, number>) => void} listener
 * @returns {() => void} unsubscribe
 */
export function onPersonalColumnOrderCleared(listener) {
  personalOrderClearedListeners.add(listener);
  return () => personalOrderClearedListeners.delete(listener);
}

/**
 * Clear personal column-order prefs for Reset (FIT-2846).
 *
 * When `columnIds` is provided, only those keys are removed so unrelated personal
 * drag prefs (other projects / column sets) survive. Omitting `columnIds` (or passing
 * an empty list) clears the entire personal map.
 *
 * Back-compat: `clearPersonalColumnOrder(storage)` still clears everything when the
 * first argument looks like a Storage object.
 *
 * @param {string[]|Storage|null|undefined} columnIds
 * @param {Storage} [storage]
 * @returns {Record<string, number>} the personal map after the clear
 */
export function clearPersonalColumnOrder(columnIds, storage = localStorage) {
  let ids = columnIds;
  let store = storage;

  // Legacy call shape: clearPersonalColumnOrder(storage)
  if (ids && typeof ids === "object" && !Array.isArray(ids) && typeof ids.getItem === "function") {
    store = ids;
    ids = undefined;
  }

  const current = readPersonalColumnOrder(store);
  let next = {};

  if (Array.isArray(ids) && ids.length > 0) {
    const remove = new Set(ids);
    next = Object.fromEntries(Object.entries(current).filter(([id]) => !remove.has(id)));
  }

  writePersonalColumnOrder(next, store);
  for (const listener of personalOrderClearedListeners) {
    listener(next);
  }
  return next;
}
