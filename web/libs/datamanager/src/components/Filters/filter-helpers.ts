/**
 * Pure utility functions for filter dropdown rendering and search logic.
 * Extracted so they can be unit-tested without pulling in heavy React/MobX dependencies.
 */

interface OptionOriginal {
  _isHeader?: boolean;
  _isSeparator?: boolean;
  field?: {
    title?: string;
    parent?: { title?: string };
  };
  title?: string;
}

interface FilterDropdownOption {
  original?: OptionOriginal;
  _isRecent?: boolean;
  value?: string;
  [key: string]: unknown;
}

interface FilterDropdownGroup {
  id?: string;
  title?: string;
  options?: FilterDropdownOption[];
  [key: string]: unknown;
}

type FilterDropdownItem = FilterDropdownOption | FilterDropdownGroup;

/**
 * Custom search handler for the column dropdown.
 * When the user starts typing, hides decorative items (header, separator)
 * and recent duplicates — only matches real column options by title.
 */
export function filterFieldSearchHandler(option: FilterDropdownOption, query: string): boolean {
  const original = option?.original ?? (option as unknown as OptionOriginal);

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
 * Recent items use a prefixed value ("__recent:<id>") to avoid highlighting in the
 * Select component, so this function matches them correctly.
 */
export function findSelectedOption(
  availableFilters: FilterDropdownItem[],
  selectedValue: string,
): FilterDropdownOption | null {
  for (const item of availableFilters) {
    if ("options" in item && Array.isArray(item.options)) {
      const found = item.options.find((o) => o.value === selectedValue);
      if (found) return found;
    }
    if ((item as FilterDropdownOption).value === selectedValue) return item as FilterDropdownOption;
  }
  return null;
}
