export { FilterShell } from "./filter-shell";
export { formatFilterOverflowLabel } from "./filter-value-label";
export type { FilterShellAddFilter, FilterShellAddOption, FilterShellItem, FilterShellProps } from "./types";

/**
 * CSS module class for Select `triggerClassName` / DateRangePickerTrigger `className`
 * so the control fills the FilterShell pill value half.
 *
 * Also exposes `valueOverflowCount` for multi-value `+N` styling when not using
 * `formatFilterOverflowLabel`.
 */
export { default as filterShellStyles } from "./filter-shell.module.css";
