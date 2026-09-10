export { FilterShell } from "./filter-shell";
export { formatFilterOverflowLabel } from "./filter-value-label";
export type { FilterShellAddFilter, FilterShellAddOption, FilterShellItem, FilterShellProps } from "./types";

/**
 * Stable class for MultiTreeSelectDropdown `dropdownClassName`. Dropdown's bem `.mix()` prefixes
 * mixed classes with `lsf-`, which breaks CSS-module hashes — pass this string instead and style via
 * `:global(.lsf-filter-shell-tree-dropdown)` in filter-shell.module.css.
 */
export const FILTER_SHELL_TREE_DROPDOWN_CLASS = "filter-shell-tree-dropdown";

/**
 * CSS module class for Select `triggerClassName` / DateRangePickerTrigger `className`
 * so the control fills the FilterShell pill value half. MultiTreeSelectDropdown uses
 * `filterShellTreeValueTrigger` (`triggerClassName`) plus `filterShellTreeWrapper` (`className`),
 * and `FILTER_SHELL_TREE_DROPDOWN_CLASS` as `dropdownClassName` (with `syncWidth={false}`).
 *
 * Also exposes `valueOverflowCount` for multi-value `+N` styling when not using
 * `formatFilterOverflowLabel`.
 */
export { default as filterShellStyles } from "./filter-shell.module.css";
