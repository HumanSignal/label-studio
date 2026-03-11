import React from "react";
import {
  getRecentFilterFields,
  addRecentFilterField,
  updateRecentFilterField,
  type RecentFilterEntry,
} from "../components/Filters/filter-recents";
export type { RecentFilterEntry } from "../components/Filters/filter-recents";

/** Loose shape for each item in currentView.availableFilters */
export interface AvailableFilter {
  id: string;
  field: {
    title: string;
    target: string;
    disabled?: boolean;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface FilterGroupOption {
  value: string;
  title: string;
  original: AvailableFilter;
  disabled?: boolean;
  _isRecent?: boolean;
  _recentOperator?: string | null;
  _recentValue?: unknown;
}

interface FilterGroupHeader {
  value: string;
  title: string;
  original: { _isHeader: boolean; field: { title: string } };
  disabled: boolean;
  height: number;
}

interface FilterGroup {
  id: string;
  title: string;
  options: FilterGroupOption[];
}

type FieldItem = FilterGroupHeader | FilterGroupOption | FilterGroup;

export interface UseRecentFiltersResult {
  /** Grouped/recents-augmented list for FilterDropdown (sidebar layout). */
  fields: FieldItem[];
  /** Raw recent entries from localStorage — forwarded to ColumnPicker for the main layout. */
  recentEntries: RecentFilterEntry[];
  /** Save a column's state and move it to the front of recents. */
  saveOnSwitch: (filterTypeId: string, operator: string | null, value: unknown) => void;
  /** Update a column's state in-place without reordering. */
  saveInPlace: (filterTypeId: string, operator: string | null, value: unknown) => void;
}

/** Prefix used to make recent option values unique in FilterDropdown (sidebar path only). */
export const RECENT_VALUE_PREFIX = "__recent:";

/**
 * Hook that owns the full "Recent filter fields" lifecycle:
 *  - Reads recents from localStorage on mount
 *  - Builds dropdown options (Recent header + items + All Fields header + groups)
 *    for the sidebar FilterDropdown (`fields`)
 *  - Exposes raw `recentEntries` for the main-layout ColumnPicker
 *  - Exposes saveOnSwitch() and saveInPlace() for writing — no useEffect auto-saver
 *
 * This avoids the race condition that occurred when a useEffect tried to
 * persist filter state during React/MobX mid-transition renders.
 */
export function useRecentFilters(
  projectId: string | number | undefined,
  availableFilters: AvailableFilter[],
): UseRecentFiltersResult {
  const [recentEntries, setRecentEntries] = React.useState<RecentFilterEntry[]>(() => getRecentFilterFields(projectId));

  const refresh = React.useCallback(() => {
    setRecentEntries(getRecentFilterFields(projectId));
  }, [projectId]);

  /**
   * Save a column's state AND move it to the front of the recents list.
   * Call this when the user switches AWAY from a column to a non-recent target.
   */
  const saveOnSwitch = React.useCallback(
    (filterTypeId: string, operator: string | null, value: unknown) => {
      addRecentFilterField(projectId, filterTypeId, operator, value);
      refresh();
    },
    [projectId, refresh],
  );

  /**
   * Update a column's state in-place WITHOUT reordering.
   * Call this when saving the departing column while switching to a recent target,
   * or when the filter reaches a valid state and we want to persist it quietly.
   */
  const saveInPlace = React.useCallback(
    (filterTypeId: string, operator: string | null, value: unknown) => {
      updateRecentFilterField(projectId, filterTypeId, operator, value);
      refresh();
    },
    [projectId, refresh],
  );

  const fields = React.useMemo<FieldItem[]>(() => {
    const groups = availableFilters.reduce<Record<string, FilterGroup>>((res, filter) => {
      const target = filter.field.target;
      const groupTitle = target
        .split("_")
        .map((s) =>
          s
            .split("")
            .map((c, i) => (i === 0 ? c.toUpperCase() : c))
            .join(""),
        )
        .join(" ");

      const group: FilterGroup = res[target] ?? { id: target, title: groupTitle, options: [] };

      group.options.push({
        value: filter.id,
        title: filter.field.title,
        original: filter,
        disabled: filter.field.disabled,
      });

      return { ...res, [target]: group };
    }, {});

    const groupValues = Object.values(groups);

    if (recentEntries.length > 0) {
      const allFiltersById = new Map(availableFilters.map((f) => [f.id, f]));
      const recentOptions: FilterGroupOption[] = recentEntries
        .map((entry) => {
          const filter = allFiltersById.get(entry.id);
          return filter ? { entry, filter } : null;
        })
        .filter((x): x is { entry: RecentFilterEntry; filter: AvailableFilter } => x !== null)
        .map(({ entry, filter }) => ({
          value: RECENT_VALUE_PREFIX + filter.id,
          title: filter.field.title,
          original: filter,
          disabled: filter.field.disabled,
          _isRecent: true,
          _recentOperator: entry.operator,
          _recentValue: entry.value,
        }));

      if (recentOptions.length > 0) {
        const recentHeader: FilterGroupHeader = {
          value: "__recent_header__",
          title: "Recent",
          original: { _isHeader: true, field: { title: "Recent" } },
          disabled: true,
          height: 34,
        };
        const allFieldsHeader: FilterGroupHeader = {
          value: "__all_fields_header__",
          title: "All fields",
          original: { _isHeader: true, field: { title: "All fields" } },
          disabled: true,
          height: 34,
        };
        return [recentHeader, ...recentOptions, allFieldsHeader, ...groupValues];
      }
    }

    return groupValues;
  }, [availableFilters, recentEntries]);

  return { fields, recentEntries, saveOnSwitch, saveInPlace };
}
