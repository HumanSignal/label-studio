/**
 * Persistence layer for "Recent filter fields" in the Data Manager filter dropdown.
 *
 * Each project stores up to MAX_RECENT_FIELDS entries in localStorage.
 * An entry captures the full filter state { id, operator, value } so it can be
 * fully restored when the user picks a field from the "Recent" section.
 *
 * Two mutation helpers exist:
 *  - addRecentFilterField  – adds/moves entry to the front (used when switching to a new column)
 *  - updateRecentFilterField – updates state in-place without reordering; also appends
 *    new entries at the end so columns that are used but never "switched away from"
 *    (e.g. the user deletes the filter) still get tracked
 */

const MAX_RECENT_FIELDS = 3;

function getStorageKey(projectId) {
  return `dm:recentFilterFields:${projectId}`;
}

/** Backward-compat: old format stored bare strings; convert to { id, operator, value }. */
function normalizeEntry(entry) {
  if (typeof entry === "string") return { id: entry, operator: null, value: null };
  if (entry && typeof entry === "object" && entry.id) return entry;
  return null;
}

/**
 * Read recently used filter fields for a project.
 * Each entry has { id, operator, value }.
 * Backward compatible with old string-only format.
 * @param {string|number} projectId
 * @returns {{ id: string, operator: string|null, value: any }[]}
 */
export function getRecentFilterFields(projectId) {
  if (!projectId) return [];
  try {
    const raw = localStorage.getItem(getStorageKey(projectId));
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeEntry).filter(Boolean).slice(0, MAX_RECENT_FIELDS);
  } catch {
    return [];
  }
}

/**
 * Record a filter field selection with its full state.
 * Moves the entry to the front (most recent) and caps at MAX_RECENT_FIELDS.
 * @param {string|number} projectId
 * @param {string} filterTypeId  e.g. "filter:tasks:image_1"
 * @param {string|null} operator
 * @param {any} value
 */
export function addRecentFilterField(projectId, filterTypeId, operator = null, value = null) {
  if (!projectId || !filterTypeId) return;
  try {
    const current = getRecentFilterFields(projectId);
    const entry = { id: filterTypeId, operator, value };
    const updated = [entry, ...current.filter((e) => e.id !== filterTypeId)].slice(0, MAX_RECENT_FIELDS);
    localStorage.setItem(getStorageKey(projectId), JSON.stringify(updated));
  } catch {
    // localStorage may be unavailable
  }
}

/**
 * Update operator/value for an existing recent entry without changing the list order.
 * If the entry doesn't exist yet, it is appended at the end (least-recent position)
 * so that existing items keep their order. The list is capped at MAX_RECENT_FIELDS.
 * @param {string|number} projectId
 * @param {string} filterTypeId
 * @param {string|null} operator
 * @param {any} value
 */
export function updateRecentFilterField(projectId, filterTypeId, operator = null, value = null) {
  if (!projectId || !filterTypeId) return;
  try {
    const current = getRecentFilterFields(projectId);
    const idx = current.findIndex((e) => e.id === filterTypeId);
    if (idx >= 0) {
      current[idx] = { ...current[idx], operator, value };
    } else {
      current.push({ id: filterTypeId, operator, value });
    }
    localStorage.setItem(getStorageKey(projectId), JSON.stringify(current.slice(0, MAX_RECENT_FIELDS)));
  } catch {
    // localStorage may be unavailable
  }
}
