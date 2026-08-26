import React from "react";
import {
  getRecentFilterFields,
  addRecentFilterField,
  updateRecentFilterField,
  type RecentFilterEntry,
} from "../components/Filters/filter-recents";
export type { RecentFilterEntry } from "../components/Filters/filter-recents";

export interface UseRecentFiltersResult {
  /** Raw recent entries from localStorage — forwarded to ColumnPicker. */
  recentEntries: RecentFilterEntry[];
  /** Save a column's state and move it to the front of recents. */
  saveOnSwitch: (filterTypeId: string, operator: string | null, value: unknown) => void;
  /** Update a column's state in-place without reordering. */
  saveInPlace: (filterTypeId: string, operator: string | null, value: unknown) => void;
}

/**
 * Hook that owns the "Recent filter fields" lifecycle for ColumnPicker:
 *  - Reads recents from localStorage on mount
 *  - Exposes raw `recentEntries` for filtersToPickerGroups
 *  - Exposes saveOnSwitch() and saveInPlace() for writing — no useEffect auto-saver
 *
 * This avoids the race condition that occurred when a useEffect tried to
 * persist filter state during React/MobX mid-transition renders.
 */
export function useRecentFilters(projectId: string | number | undefined): UseRecentFiltersResult {
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

  return { recentEntries, saveOnSwitch, saveInPlace };
}
