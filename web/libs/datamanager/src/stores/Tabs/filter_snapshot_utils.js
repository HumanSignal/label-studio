/**
 * Validate a pasted filter snapshot and return the list of items whose column IDs
 * match the current project's available filters. Returns null if the snapshot is
 * malformed or contains no matching items.
 * @param {{ conjunction?: string, items?: Array }} snapshot
 * @param {Array<{ id: string }>} availableFilters
 * @returns {Array|null} valid items, or null on failure
 */
export function validateFilterSnapshot(snapshot, availableFilters) {
  if (!snapshot || typeof snapshot !== "object") return null;
  const { items } = snapshot;
  if (!Array.isArray(items)) return null;

  const availableIds = new Set(availableFilters.map((f) => f.id));
  const validItems = items.filter((item) => item?.filter && availableIds.has(item.filter));

  return validItems.length > 0 ? validItems : null;
}
