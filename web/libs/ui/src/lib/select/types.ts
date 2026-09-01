import type { FC, ReactNode } from "react";

export type SelectOptionData<T = any> = {
  value: T;
  label?: ReactNode;
  hidden?: boolean;
  disabled?: boolean;
  children?: SelectOptionData<T>[];
  /** Optional badge shown next to the option label. */
  badge?: string;
  /** Optional explanation shown in an info tooltip next to the option label. */
  description?: string;
  /** Custom row height (px) for virtual-list mode; defaults to VARIABLE_LIST_ITEM_HEIGHT (40). */
  height?: number;
};

/** Heights match the Button of the same name: smaller 24px, small 32px, medium 40px (default). */
export enum SelectSize {
  SMALLER = "smaller",
  SMALL = "small",
  MEDIUM = "medium",
}

export type SelectOption<T> = string | number | SelectOptionData<T>;

export type OptionProps = {
  value: any;
  label?: string;
  isOptionSelected?: boolean;
  disabled?: boolean;
  style?: any;
  multiple?: boolean;
  onSelect?: () => void;
  isIndeterminate?: boolean;
  className?: string;
  /** When provided, renders custom content instead of default label (e.g. icon, Tag, badge) */
  optionRenderer?: FC<{ option: any; index: number }>;
  /** Full option object passed to optionRenderer */
  option?: any;
  /** Index passed to optionRenderer */
  optionIndex?: number;
  /** Optional icon rendered before the option label. */
  leadingIcon?: ReactNode;
  /** Applies a persistent emphasis treatment to the option. */
  highlighted?: boolean;
};

type ExtractStructOption<T> = T extends SelectOptionData ? T["value"] : never;
type ExtractPrimitiveOption<T> = T extends string | number ? T : never;
export type ExtractOption<T> =
  T extends SelectOption<any>
    ? T extends SelectOptionData<any>
      ? ExtractStructOption<T>
      : ExtractPrimitiveOption<T>
    : never;

export type ExtractValue<T, A extends SelectOption<T>[]> = A[number] extends { value: infer U } ? U : A[number];

export type SelectProps<T, A extends SelectOption<T>[]> = {
  label?: string;
  description?: string;
  /** Options list. */
  options?: A;
  /** Field name to group options by. Options with `option[groupBy]` are grouped under that value as a header; null/undefined go in an ungrouped leading section. */
  groupBy?: string;
  value?: ExtractOption<A[number]> | null;
  defaultValue?: ExtractOption<A[number]> | null;
  validate?: any;
  required?: boolean;
  skip?: boolean;
  labelProps?: any;
  placeholder?: ReactNode;
  triggerClassName?: string;
  contentClassName?: string;
  ghost?: boolean;
  width?: string;
  icon?: any;
  fieldProps?: any;
  error?: boolean;
  autoSelectFirst?: boolean;
  searchable?: boolean;
  /** Allow a search value that does not match an option to be selected as a new option. */
  creatable?: boolean;
  /** Label template for the create option; `{value}` is replaced with the search value. */
  createOptionLabel?: string;
  searchPlaceholder?: string;
  /** Initial value for the search input field. Useful for restoring a previous search state. */
  defaultSearchValue?: string;
  ref?: React.Ref<HTMLSelectElement>;
  selectedValueRenderer?: FC<{ option: A[number]; index: number }>;
  optionRenderer?: FC<{ option: A[number]; index: number }>;
  dropdown?: any;
  testId?: string;
  searchFilter?: (option: any, queryString: string) => boolean;
  onChange?: (value: any) => void | false;
  setValue?: (value: ExtractOption<A>) => void;
  header?: string | FC | JSX.Element;
  footer?: ReactNode;
  multiple?: boolean;
  disabled?: boolean;
  /**
   * When true, the trigger stays enabled so the dropdown can open for inspection,
   * but option selection and bulk actions (Select all / group All/None) are blocked.
   * Distinct from `disabled`, which greys out the trigger and prevents opening.
   * Search remains available when `searchable` is set.
   */
  readOnly?: boolean;
  triggerProps?: any;
  isInline?: boolean;
  isLoading?: boolean;
  dataTestid?: string;
  size?: SelectSize | undefined;
  onSearch?: (value: string) => void;
  selectFirstIfEmpty?: boolean;
  renderSelected?: (selectedOptions?: A[number][], placeholder?: string) => React.ReactNode | string;
  isVirtualList?: boolean;
  /**
   * When true with `isVirtualList`, size the dropdown from a sample of the first
   * option labels (not a full longest-label scan). No-op without `isVirtualList`.
   */
  withDynamicWidth?: boolean;
  /** Max visible items in the virtual list before scrolling (default: ~7.5 / 300px). */
  virtualListMaxVisible?: number;
  loadMore?: () => void;
  pageSize?: number;
  page?: number;
  itemCount?: number;
  onClose?: () => void;
  onOpen?: () => void;
  /** Controlled open state. When provided, the dropdown open/close state is driven externally. */
  open?: boolean;
  alwaysShowSelectedGroup?: boolean;
  onSelectAllClick?: () => void;
  /** Accessible name for the "Select All" button, for consumers whose select-all reaches past the rendered items. */
  selectAllLabel?: string;
  /** When true (requires `multiple` + `groupBy`), shows "All" / "None" bulk-toggle buttons on group header hover. Fires a single `onChange` with the full updated array. */
  showGroupActions?: boolean;
} & SelectVirtualizedProps &
  Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "value" | "placeholder">;

type ToNever<T> = {
  [key in keyof T]?: never;
};

type VirtualizedProps = {
  overscan?: number;
  estimateSize?: number;
  virtualizedTotal?: number;
  rootMargin?: string;
  onBottomReached?: () => void;
  onTopReached?: () => void;
};

type SelectVirtualizedProps =
  | ({
      virtualized?: false;
    } & ToNever<VirtualizedProps>)
  | ({
      virtualized: true;
    } & VirtualizedProps);
