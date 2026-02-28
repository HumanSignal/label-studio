import React from "react";
import { getRecentFilterFields, addRecentFilterField, updateRecentFilterField } from "./filter-recents";

/**
 * Hook that owns the full "Recent filter fields" lifecycle:
 *  - Reads recents from localStorage on mount
 *  - Builds dropdown options (Recent header + items + separator + All Fields header + groups)
 *  - Exposes saveOnSwitch() and saveInPlace() for writing — no useEffect auto-saver
 *
 * This avoids the race condition that occurred when a useEffect tried to
 * persist filter state during React/MobX mid-transition renders.
 *
 * @param {string|number} projectId
 * @param {Array} availableFilters – from currentView.availableFilters
 * @returns {{ fields: Array, saveOnSwitch: Function, saveInPlace: Function }}
 */
export function useRecentFilters(projectId, availableFilters) {
  const [recentEntries, setRecentEntries] = React.useState(() => getRecentFilterFields(projectId));

  const refresh = React.useCallback(() => {
    setRecentEntries(getRecentFilterFields(projectId));
  }, [projectId]);

  /**
   * Save a column's state AND move it to the front of the recents list.
   * Call this when the user switches AWAY from a column to a non-recent target.
   */
  const saveOnSwitch = React.useCallback(
    (filterTypeId, operator, value) => {
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
    (filterTypeId, operator, value) => {
      updateRecentFilterField(projectId, filterTypeId, operator, value);
      refresh();
    },
    [projectId, refresh],
  );

  const fields = React.useMemo(() => {
    const groups = availableFilters.reduce((res, filter) => {
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

      const group = res[target] ?? { id: target, title: groupTitle, options: [] };

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
      const recentOptions = recentEntries
        .map((entry) => {
          const filter = allFiltersById.get(entry.id);
          return filter ? { entry, filter } : null;
        })
        .filter(Boolean)
        .map(({ entry, filter }) => ({
          value: filter.id,
          title: filter.field.title,
          original: filter,
          disabled: filter.field.disabled,
          _isRecent: true,
          _recentOperator: entry.operator,
          _recentValue: entry.value,
        }));

      if (recentOptions.length > 0) {
        const recentHeader = {
          value: "__recent_header__",
          title: "Recent",
          original: { _isHeader: true, field: { title: "Recent" } },
          disabled: true,
          height: 36,
        };
        const separator = {
          value: "__recent_separator__",
          title: "",
          original: { _isSeparator: true, field: { title: "" } },
          disabled: true,
          height: 8,
        };
        const allFieldsHeader = {
          value: "__all_fields_header__",
          title: "All fields",
          original: { _isHeader: true, field: { title: "All fields" } },
          disabled: true,
          height: 36,
        };
        return [recentHeader, ...recentOptions, separator, allFieldsHeader, ...groupValues];
      }
    }

    return groupValues;
  }, [availableFilters, recentEntries]);

  return { fields, saveOnSwitch, saveInPlace };
}
