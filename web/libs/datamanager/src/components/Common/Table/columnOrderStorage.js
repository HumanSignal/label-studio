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
