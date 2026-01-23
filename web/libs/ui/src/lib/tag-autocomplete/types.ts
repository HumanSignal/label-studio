import type { ReactNode } from "react";

export interface TagOption<T = any> {
  value: T;
  label?: string;
  disabled?: boolean;
}

export type TagAutocompleteOption<T> = string | number | TagOption<T>;

export interface TagAutocompleteProps<T = string> {
  /** Available options to select from */
  options: TagAutocompleteOption<T>[];

  /** Currently selected values (controlled) */
  value?: T[];

  /** Default selected values (uncontrolled) */
  defaultValue?: T[];

  /** Callback when selection changes */
  onChange?: (values: T[]) => void;

  /** Callback for async search/filtering */
  onSearch?: (query: string) => void;

  /** Custom filter function for local filtering */
  searchFilter?: (option: TagAutocompleteOption<T>, query: string) => boolean;

  /** Form field name */
  name?: string;

  /** Placeholder text */
  placeholder?: string;

  /** Disable the entire component */
  disabled?: boolean;

  /** Loading state (shows spinner, disables interaction) */
  isLoading?: boolean;

  /** Custom renderer for tags in the trigger */
  renderTag?: (option: TagOption<T>, onRemove: () => void) => ReactNode;

  /** Custom renderer for options in the dropdown */
  renderOption?: (option: TagOption<T>, isSelected: boolean) => ReactNode;

  /**
   * Allow creating new tags (free text) - defaults to false
   * When true, users can create new tags by typing and pressing Enter
   * New tags are automatically added to the value array
   */
  allowCreate?: boolean;

  /** Enable virtual list for large option sets */
  isVirtualList?: boolean;

  /** Load more callback for infinite scroll */
  loadMore?: () => void;

  /** Total count for virtual list */
  itemCount?: number;

  /** Page size for loading */
  pageSize?: number;

  /** Custom class names */
  triggerClassName?: string;
  contentClassName?: string;
  tagClassName?: string;

  /** Callbacks for open/close */
  onOpen?: () => void;
  onClose?: () => void;

  /** Test ID */
  dataTestid?: string;

  /** Minimum search length before showing dropdown (default: 2) */
  minSearchLength?: number;
}

/** Normalized option with value and label */
export interface NormalizedTagOption<T = string> {
  value: T;
  label: string;
  disabled?: boolean;
}

/** Helper to normalize options to a consistent format */
export function normalizeOption<T>(option: TagAutocompleteOption<T>): NormalizedTagOption<T> {
  if (typeof option === "object" && option !== null && "value" in option) {
    return {
      value: option.value,
      label: option.label ?? String(option.value),
      disabled: option.disabled,
    };
  }
  return {
    value: option as T,
    label: String(option),
  };
}

/** Helper to get option value */
export function getOptionValue<T>(option: TagAutocompleteOption<T>): T {
  if (typeof option === "object" && option !== null && "value" in option) {
    return option.value;
  }
  return option as T;
}

/** Helper to get option label */
export function getOptionLabel<T>(option: TagAutocompleteOption<T>): string {
  if (typeof option === "object" && option !== null && "value" in option) {
    return option.label ?? String(option.value);
  }
  return String(option);
}
