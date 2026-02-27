/**
 * Pure utility functions for filter dropdown rendering and search logic.
 * Extracted so they can be unit-tested without pulling in heavy React/MobX dependencies.
 */

/**
 * Custom search handler for the column dropdown.
 * When the user starts typing, hides decorative items (header, separator)
 * and recent duplicates — only matches real column options by title.
 * @param {object} option  – the dropdown option (may have .original with _isHeader, etc.)
 * @param {string} query   – the current search string
 * @returns {boolean} true if the option should be visible
 */
export function filterFieldSearchHandler(option, query) {
  const original = option?.original ?? option;

  if (original?._isHeader || original?._isSeparator) {
    return !query;
  }
  if (option?._isRecent) {
    return !query;
  }

  const title = original?.field?.title ?? original?.title ?? "";
  const parentTitle = original?.field?.parent?.title ?? "";
  return `${title} ${parentTitle}`.toLowerCase().includes(query.toLowerCase());
}

/**
 * Find the full option object for a selected value.
 * Searches both flat items (recent entries at the top) and grouped items (options arrays).
 * Recent items are placed before groups, so they are found first — this is important
 * because the same filter ID exists in both "Recent" and the normal group list.
 * @param {Array} availableFilters – the full list of dropdown items (flat + grouped)
 * @param {string} selectedValue   – the value to find
 * @returns {object|null} the matching option, or null
 */
export function findSelectedOption(availableFilters, selectedValue) {
  for (const item of availableFilters) {
    if (item.options) {
      const found = item.options.find((o) => o.value === selectedValue);
      if (found) return found;
    }
    if (item.value === selectedValue) return item;
  }
  return null;
}
