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

  /** Placeholder text when no tags selected */
  placeholder?: string;

  /** Search input placeholder */
  searchPlaceholder?: string;

  /** Form field name */
  name?: string;

  /** Label text */
  label?: string;

  /** Description text below label */
  description?: string;

  /** Props to pass to Label wrapper */
  labelProps?: Record<string, unknown>;

  /** Mark as required */
  required?: boolean;

  /** Disable the entire component */
  disabled?: boolean;

  /** Loading state (shows spinner, disables interaction) */
  isLoading?: boolean;

  /** Maximum number of tags that can be selected */
  maxTags?: number;

  /** Custom renderer for tags in the trigger */
  renderTag?: (option: TagOption<T>, onRemove: () => void) => ReactNode;

  /** Custom renderer for options in the dropdown */
  renderOption?: (option: TagOption<T>, isSelected: boolean) => ReactNode;

  /** Allow creating new tags (free text) - defaults to false */
  allowCreate?: boolean;

  /** Callback when new tag is created (only if allowCreate=true) */
  onCreate?: (value: string) => void;

  /** Enable virtual list for large option sets */
  isVirtualList?: boolean;

  /** Load more callback for infinite scroll */
  loadMore?: () => void;

  /** Total count for virtual list */
  itemCount?: number;

  /** Page size for loading */
  pageSize?: number;

  /** Size variant */
  size?: "small" | "medium" | "large";

  /** Custom class names */
  triggerClassName?: string;
  contentClassName?: string;
  tagClassName?: string;

  /** Callbacks for open/close */
  onOpen?: () => void;
  onClose?: () => void;

  /** Test ID */
  dataTestid?: string;
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
