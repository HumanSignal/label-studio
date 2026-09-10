import type { ReactNode } from "react";

export type FilterShellAddOption = {
  id: string;
  label: string;
  group?: string;
};

export type FilterShellAddFilter = {
  options: FilterShellAddOption[];
  onSelect: (id: string) => void;
  disabled?: boolean;
  searchPlaceholder?: string;
};

export type FilterShellItem = {
  id: string;
  label: string;
  /**
   * Id of the clickable value trigger. Used as `<label htmlFor={controlId}>`.
   * Consumers must put the same id on the trigger (`triggerProps.id` / equivalent).
   */
  controlId: string;
  pinned?: boolean;
  /**
   * When true, the name half uses primary surface/border (Figma “set” / has-value state).
   * Opening the value control does not paint the name half primary — that is independent chrome.
   */
  active?: boolean;
  valueLabel: ReactNode;
  control: ReactNode;
  onRemove?: () => void;
};

export type FilterShellProps = {
  filters: FilterShellItem[];
  addFilter?: FilterShellAddFilter;
  onReset?: () => void;
  resetLabel?: string;
  "aria-label"?: string;
};
