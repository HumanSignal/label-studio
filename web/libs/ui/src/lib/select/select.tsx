import React, { type ForwardedRef, forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@humansignal/shad/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@humansignal/shad/components/ui/popover";
import type { SelectOption, OptionProps, SelectProps } from "./types.ts";
import { Checkbox, Label, Typography } from "@humansignal/ui";
import { Badge } from "../badge/badge";
import { isDefined } from "@humansignal/core/lib/utils/helpers";
import { IconChevron, IconChevronDown } from "@humansignal/icons";
import clsx from "clsx";
import styles from "./select.module.scss";
import { cnm } from "../../utils/utils";
import { VariableSizeList } from "react-window";
import InfiniteLoader from "react-window-infinite-loader";

const VARIABLE_LIST_ITEM_HEIGHT = 40;
const VARIABLE_LIST_COUNT_RENDERED = 5;
const VARIABLE_LIST_PAGE_SIZE = 20;

/**
 * Props for SelectedItemsGroup component
 */
type SelectedItemsGroupProps = {
  expanded: boolean;
  onToggleExpand: () => void;
  selectedOptions: any[];
  onDeselectItem: (value: any) => void;
  onDeselectAll: () => void;
  disabled?: boolean;
};

/**
 * SelectedItemsGroup - Internal component for displaying selected items in a collapsible group
 * Only visible when multiple, searchable, and isVirtualList are all true
 */
const SelectedItemsGroup = ({
  expanded,
  onToggleExpand,
  selectedOptions,
  onDeselectItem,
  onDeselectAll,
  disabled,
}: SelectedItemsGroupProps) => {
  const handleItemClick = useCallback(
    (option: any) => {
      if (disabled) return;
      const value = option?.value ?? option;
      onDeselectItem(value);
    },
    [onDeselectItem, disabled],
  );

  const handleDeselectAllClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (disabled) return;
      onDeselectAll();
    },
    [onDeselectAll, disabled],
  );

  const hasNoItems = selectedOptions.length === 0;

  // Collapse the group when no items are selected
  useEffect(() => {
    if (hasNoItems && expanded) {
      onToggleExpand();
    }
  }, [hasNoItems, expanded, onToggleExpand]);

  return (
    <div className={styles.selectedItemsGroup}>
      {/* Header - Always visible */}
      <button
        type="button"
        className={styles.selectedItemsHeader}
        onClick={hasNoItems ? undefined : onToggleExpand}
        aria-expanded={expanded}
        aria-label={`Selected items group, ${selectedOptions.length} items selected`}
        disabled={hasNoItems}
        style={{ cursor: hasNoItems ? "default" : "pointer" }}
      >
        {/* Caret icon */}
        {expanded ? (
          <IconChevron
            className={styles.selectedItemsCaret}
            aria-hidden="true"
            style={{ opacity: hasNoItems ? 0.3 : 1 }}
          />
        ) : (
          <IconChevronDown
            className={styles.selectedItemsCaret}
            aria-hidden="true"
            style={{ opacity: hasNoItems ? 0.3 : 1 }}
          />
        )}

        {/* Deselect all checkbox */}
        <Checkbox
          tabIndex={-1}
          checked={selectedOptions.length > 0}
          readOnly
          disabled={disabled || selectedOptions.length === 0}
          onClick={handleDeselectAllClick}
          aria-label="Deselect all items"
        />

        {/* Title with counter badge */}
        <div className={styles.selectedItemsTitle}>
          <Typography variant="body">Selected items</Typography>
          <Badge variant="info" shape="squared" className="ml-auto">
            {selectedOptions.length}
          </Badge>
        </div>
      </button>

      {/* Content - Conditionally rendered when expanded */}
      {expanded && (
        <div className={styles.selectedItemsContent}>
          {selectedOptions.length > 0 ? (
            <CommandGroup>
              {selectedOptions.map((option, index) => {
                const optionValue = option?.value ?? option;
                const label = option?.label ?? optionValue;

                return (
                  <Option
                    key={`selected-${optionValue}-${index}`}
                    value={optionValue}
                    label={label}
                    isOptionSelected={true}
                    disabled={disabled}
                    multiple={true}
                    onSelect={() => handleItemClick(option)}
                    style={{ paddingLeft: "var(--spacing-wider)" }}
                  />
                );
              })}
            </CommandGroup>
          ) : (
            <div className="px-base py-tight text-neutral-content-subtler text-center">No items selected</div>
          )}
        </div>
      )}
    </div>
  );
};

/*
 * This file defines a custom Select component for the Design System, which uses a fully custom UI for
 * dropdowns and options.
 *
 * Despite being fully customized, there needs to be a native HTML <select> element in this component for
 * the following reasons:
 *
 * 1. Form Compatibility & Accessibility:
 *    - Ensures selected value(s) are included in standard HTML form submissions via the 'name' attribute.
 *    - Improves compatibility with non-React systems and libraries that expect real form fields.
 *    - Aids accessibility: screen readers and assistive technologies can interact with native form
 *      elements more reliably.
 *
 * 2. Browser Autofill and Validation:
 *    - Allows browsers to recognize, autofill, and validate the field as a standard form element.
 *
 * 3. Preventing React Warnings:
 *    - Prevents React from warning about uncontrolled to controlled component transitions by keeping the
 *      <select> controlled.
 *
 * 4. Hidden Input for Value Sync:
 *    - The <select> is visually hidden but kept in sync with the custom UI, ensuring the value is always
 *      available in the DOM for form libraries, browser extensions, or other integrations.
 *
 * 5. Multiple Selection Support:
 *    - When 'multiple' is true, the <select> can represent multiple selected values, which is the
 *      standard way to submit multiple selections in a form.
 *
 * In summary, the native <select> acts as a bridge between the custom UI and the expectations of the
 * broader web platform, ensuring seamless integration with forms, browser features, and accessibility
 * tools.
 */

export const Select = forwardRef(
  <T, A extends SelectOption<T>[]>(
    {
      label,
      description,
      options = [],
      validate,
      required,
      skip,
      labelProps,
      defaultValue,
      searchable,
      searchPlaceholder,
      defaultSearchValue = "",
      value: externalValue,
      disabled = false,
      multiple = false,
      isInline = false,
      isLoading = false,
      triggerProps,
      triggerClassName,
      contentClassName,
      size,
      searchFilter,
      onSearch,
      selectedValueRenderer,
      selectFirstIfEmpty,
      renderSelected,
      isVirtualList = false,
      loadMore,
      pageSize = VARIABLE_LIST_PAGE_SIZE,
      page = 1,
      itemCount,
      onClose,
      onOpen,
      footer,
      alwaysShowSelectedGroup = false,
      ...props
    }: SelectProps<T, A>,
    _ref: ForwardedRef<HTMLSelectElement>,
  ) => {
    const ref = _ref ?? useRef<HTMLSelectElement>();
    const triggerRef = useRef<HTMLDivElement>(null);
    const [query, setQuery] = useState<string>(defaultSearchValue);
    const valueRef = useRef<any>();
    let initialValue = defaultValue?.value ?? defaultValue ?? externalValue?.value ?? externalValue;
    if (selectFirstIfEmpty && !initialValue) {
      initialValue = options?.[0]?.value ?? options?.[0];
    }
    if (multiple) {
      initialValue = initialValue ? (Array.isArray(initialValue) ? (initialValue ?? []) : [initialValue]) : [];
    } else if (Array.isArray(initialValue)) {
      initialValue = initialValue[0];
    }
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [selectedGroupExpanded, setSelectedGroupExpanded] = useState<boolean>(false);
    const [value, setValue] = useState<any>(initialValue);

    valueRef.current = value;
    useEffect(() => {
      if (!isDefined(externalValue)) return;
      let val = externalValue?.value ?? externalValue;
      if (multiple && !Array.isArray(val)) {
        val = [val];
      } else if (!multiple && Array.isArray(val)) {
        val = val[0];
      }
      valueRef.current = val;
      setValue(val);
    }, [externalValue, multiple]);

    useEffect(() => {
      if (valueRef.current || !selectFirstIfEmpty || !options?.[0]) return;
      const val = options?.[0]?.value ?? options?.[0];
      valueRef.current = val;
      setValue(val);
    }, [selectFirstIfEmpty, options, multiple]);

    const prevIsOpenRef = useRef(false);
    useEffect(() => {
      const wasJustOpened = isOpen && !prevIsOpenRef.current;
      const wasJustClosed = !isOpen && prevIsOpenRef.current;
      prevIsOpenRef.current = isOpen;

      if (wasJustOpened) {
        // When opening, restore search from defaultSearchValue if provided
        if (defaultSearchValue) {
          setQuery(defaultSearchValue);
          // Only trigger onSearch if value is different from current to avoid unnecessary API calls
          onSearch?.(defaultSearchValue);
        }
      } else if (wasJustClosed) {
        // When closing, reset to defaultSearchValue (or empty if not provided)
        setQuery(defaultSearchValue || "");
      }
    }, [isOpen, defaultSearchValue, onSearch]);
    const _onChange = useCallback(
      (val: string, isSelected: boolean) => {
        if (disabled) return;

        if (multiple) {
          valueRef.current = isSelected
            ? [...(valueRef.current ?? []).filter((v) => v !== val)]
            : [...(valueRef.current ?? []), val];
          setValue(valueRef.current);
        } else {
          valueRef.current = val;
          setValue(val);
        }
        if (!multiple) {
          setIsOpen(false);
          onClose?.();
        }
        props?.onChange?.(valueRef.current);
        setTimeout(() => {
          const changeEvent = new Event("change", {
            bubbles: true,
            target: { ...ref?.current, value: valueRef.current },
            currentTarget: { ...ref?.current, value: valueRef.current },
          });
          ref?.current?.dispatchEvent?.(changeEvent);
        }, 0);
      },
      [props?.onChange, multiple, disabled],
    );

    const flatOptions = useMemo(() => {
      return options.flatMap((option) => option?.children ?? option);
    }, [options]);

    const _options = useMemo(() => {
      // If searchFilter is provided, always use it (even with empty query)
      // This allows custom filtering logic for API-based searches
      if (searchFilter) {
        return flatOptions.filter((option) => searchFilter(option, query ?? ""));
      }

      // Default behavior: no filtering when not searchable or query is empty
      if (!searchable || !query.trim()) return options;

      const filterHandler = (option: any, queryString: string) => {
        const value = option?.value ?? option;
        const label = option?.label ?? option?.value ?? option;
        return (
          label?.toString()?.toLowerCase().includes(queryString.toLowerCase()) ||
          value?.toString()?.toLowerCase().includes(queryString.toLowerCase())
        );
      };
      return flatOptions.filter((option) => filterHandler(option, query));
    }, [options, flatOptions, searchable, query, searchFilter]);

    const isSelected = useCallback(
      (val: any) => {
        if (multiple) {
          return value.includes(val?.value ?? val);
        }
        return (value?.value ?? value) === (val?.value ?? val);
      },
      [value, multiple],
    );

    const selectedOptions = useMemo(() => {
      const allSelected = flatOptions.filter((option) => isSelected(option));

      const uniqueSelected = new Map();
      allSelected.forEach((option) => {
        const optionValue = option?.value ?? option;
        if (!uniqueSelected.has(optionValue)) {
          uniqueSelected.set(optionValue, option);
        }
      });

      return Array.from(uniqueSelected.values());
    }, [flatOptions, isSelected, value, multiple]);

    const onSearchInputHandler = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setQuery(val);
        onSearch?.(val);
      },
      [setQuery, onSearch],
    );

    useEffect(() => {
      if (selectedOptions.length > 0 || !isDefined(defaultValue)) return;
      valueRef.current = defaultValue;
      setValue(defaultValue);
    }, [selectedOptions, defaultValue]);

    const displayValue = useMemo(() => {
      return (
        <>
          {selectedOptions?.length ? (
            <>
              {selectedOptions?.map((option, index) => {
                if (selectedValueRenderer) {
                  return (
                    <React.Fragment key={`${option?.value}_${index}`}>{selectedValueRenderer(option)}</React.Fragment>
                  );
                }
                const optionValue = option?.value ?? option;

                return (
                  <span key={`${optionValue}_${index}`} className="truncate only:w-full">
                    {option?.label ?? optionValue}
                  </span>
                );
              })}
            </>
          ) : (
            <span className="truncate w-full">{props?.placeholder ?? ""}</span>
          )}
        </>
      );
    }, [selectedOptions, props?.placeholder, selectedValueRenderer]);

    const renderedOptions = useMemo(() => {
      return _options.map((option, index) => {
        const optionValue = option?.value ?? option;
        const label = option?.label ?? optionValue;
        const children = option?.children;
        const isIndeterminate = multiple && children?.some((child) => isSelected(child));
        const isOptionSelected =
          multiple && children ? children?.every((child) => isSelected(child)) : isSelected(optionValue);

        if (children) {
          return (
            <CommandGroup key={index}>
              {multiple ? (
                <Option
                  multiple={multiple}
                  label={label}
                  isIndeterminate={!isOptionSelected && isIndeterminate}
                  isOptionSelected={isOptionSelected}
                  onSelect={() => {
                    children.forEach((child: SelectOption<T>) => {
                      const childVal = child?.value ?? child;
                      isOptionSelected ? _onChange(childVal, true) : _onChange(childVal, false);
                    });
                  }}
                />
              ) : (
                <div className="pl-3 font-bold text-neutral-content-subtler pt-2">{label}</div>
              )}
              <div className="pl-2">
                {children.map((item, i) => {
                  const val = item?.value ?? item;
                  const lab = item?.label ?? val;
                  const isChildOptionSelected = isSelected(val);
                  return (
                    <Option
                      key={`${val}_${i}`}
                      value={val}
                      label={lab}
                      isOptionSelected={isChildOptionSelected}
                      disabled={item?.disabled}
                      style={item?.style}
                      multiple={multiple}
                      onSelect={() => {
                        _onChange(val, isChildOptionSelected);
                      }}
                    />
                  );
                })}
              </div>
            </CommandGroup>
          );
        }
        return (
          <Option
            key={`${optionValue}_${index}`}
            value={optionValue}
            label={label}
            isOptionSelected={isOptionSelected}
            disabled={option?.disabled}
            style={option?.style}
            multiple={multiple}
            onSelect={() => {
              _onChange(optionValue, isOptionSelected);
            }}
          />
        );
      });
    }, [_options, multiple, isSelected, _onChange]);

    const combobox = (
      <Popover
        open={isOpen}
        onOpenChange={(_isOpen) => {
          setIsOpen(_isOpen);
          _isOpen ? onOpen?.() : onClose?.();
        }}
      >
        <PopoverTrigger asChild={true} disabled={disabled}>
          <button
            variant="outline"
            aria-expanded={isOpen}
            className={cnm(triggerClassName ?? "", styles.selectTrigger, {
              [styles.isInline]: isInline,
              [styles.isOpen]: isOpen,
              [styles.isDisabled]: disabled,
              [styles.sizeSmall]: size === "small",
              [styles.sizeMedium]: size === "medium",
              [styles.sizeLarge]: size === "large",
            })}
            type="button"
            data-testid={
              props?.dataTestid ??
              `select-trigger${props?.name ? `-${props?.name?.replace?.(/\s/g, "-")}` : ""}${value ? `-${value}` : ""}`
            }
            ref={triggerRef}
            data-name={props?.name}
            data-value={value ?? ""}
            {...triggerProps}
          >
            <span className="flex flex-1 text-left gap-2 max-w-full overflow-hidden" data-testid="select-display-value">
              {renderSelected ? renderSelected?.(selectedOptions, props?.placeholder) : displayValue}
            </span>
            {isOpen ? (
              <IconChevron className="h-4 w-4 shrink-0 opacity-50 pointer-events-none" />
            ) : (
              <IconChevronDown className="h-4 w-4 shrink-0 opacity-50 pointer-events-none" />
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" data-testid="select-popup" className={cnm("min-w-full", contentClassName)}>
          {isLoading ? (
            <span className={styles.selectLoading} tabIndex={-1}>
              Loading...
            </span>
          ) : (
            <Command shouldFilter={false}>
              {searchable && (
                <CommandInput
                  placeholder={searchPlaceholder ?? "Search"}
                  value={query}
                  onChangeCapture={onSearchInputHandler}
                  data-testid="select-search-field"
                  autoFocus
                />
              )}
              <CommandList
                label="Select an option"
                className={cnm({
                  "shadow-inner shadow-neutral-surface-inset border-t border-neutral-border shadow-": searchable,
                  "max-h-none": footer !== undefined,
                })}
              >
                {/* Selected Items Group - Only for multiple + searchable + virtual lists */}
                {multiple && searchable && isVirtualList && (selectedOptions.length > 0 || alwaysShowSelectedGroup) && (
                  <SelectedItemsGroup
                    expanded={selectedGroupExpanded}
                    onToggleExpand={() => setSelectedGroupExpanded(!selectedGroupExpanded)}
                    selectedOptions={selectedOptions}
                    onDeselectItem={(value) => _onChange(value, true)}
                    onDeselectAll={() => {
                      selectedOptions.forEach((opt) => {
                        const val = opt?.value ?? opt;
                        _onChange(val, true);
                      });
                    }}
                    disabled={disabled}
                  />
                )}

                <CommandEmpty>{searchable ? "No results found." : ""}</CommandEmpty>

                <CommandGroup>
                  {props.header ? props.header : null}
                  {isVirtualList ? (
                    <InfiniteLoader
                      itemCount={itemCount ?? renderedOptions.length}
                      loadMoreItems={() => {
                        loadMore?.();
                        return Promise.resolve();
                      }}
                      isItemLoaded={(index) => index < renderedOptions.length}
                      threshold={1}
                      minimumBatchSize={pageSize / 2}
                    >
                      {({
                        onItemsRendered,
                        ref: infiniteLoaderRef,
                      }: {
                        onItemsRendered: (params: any) => void;
                        ref: any;
                      }) => {
                        // Calculate height based on actual item count from flatOptions
                        // When searching, _options is filtered and flat; when not searching, _options === options (all items)
                        const actualItemCount = searchable && query.trim() ? _options.length : flatOptions.length;
                        const maxVisibleItems = VARIABLE_LIST_COUNT_RENDERED;
                        const listHeight = Math.min(actualItemCount, maxVisibleItems) * VARIABLE_LIST_ITEM_HEIGHT;

                        return (
                          <VariableSizeList
                            key="virtual-list"
                            itemData={renderedOptions}
                            itemSize={() => VARIABLE_LIST_ITEM_HEIGHT}
                            itemCount={renderedOptions.length}
                            height={listHeight}
                            // width={VARIABLE_LIST_WIDTH}
                            onItemsRendered={onItemsRendered}
                            ref={infiniteLoaderRef}
                            overscanCount={0}
                          >
                            {({ index, style }) => {
                              return <div style={style}>{renderedOptions[index]}</div>;
                            }}
                          </VariableSizeList>
                        );
                      }}
                    </InfiniteLoader>
                  ) : (
                    renderedOptions
                  )}
                </CommandGroup>
                {footer && <div className="px-base py-tight border-t border-neutral-border">{footer}</div>}
              </CommandList>
            </Command>
          )}
        </PopoverContent>
        <select
          name={props?.name}
          value={selectedOptions.join(",") ?? ""}
          ref={ref}
          disabled={disabled}
          className={styles.valueInput}
          onChange={() => {}} // Prevents the React uncontrolled select component warning message
        >
          {selectedOptions?.map((option, index) => (
            <option key={`${option?.value}_${index}`} value={option?.value ?? option} />
          ))}
        </select>
      </Popover>
    );

    if (label) {
      return (
        <Label required={required} description={description} text={label} {...labelProps}>
          {combobox}
        </Label>
      );
    }
    return combobox;
  },
);

const Option = ({
  value,
  label,
  isOptionSelected,
  isIndeterminate,
  disabled,
  style,
  onSelect,
  multiple,
  className,
}: OptionProps) => {
  const keyDownHandler = useCallback(
    (e: any) => {
      if (["Enter", " "].includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        onSelect?.(value);
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        e.stopPropagation();
        const nextElement = e.currentTarget.nextElementSibling;
        if (nextElement) {
          nextElement.focus();
        }
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        e.stopPropagation();
        const prevElement = e.currentTarget.previousElementSibling;
        if (prevElement) {
          prevElement.focus();
        }
      }
    },
    [onSelect, value],
  );
  return (
    <CommandItem
      value={value}
      onSelect={onSelect}
      disabled={disabled}
      {...(style ? { style } : {})}
      data-value={value}
      data-selected={isOptionSelected}
      data-testid={`select-option-${value}`}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={keyDownHandler}
      className={clsx(
        className,
        [
          "rounded-4",
          "text-neutral-content-subtle",
          "overflow-hidden",
          "p-1",
          "outline-none",
          "group",
          "duration-150 ease-out",
        ],
        [
          "data-[disabled=true]:opacity-50",
          "data-[disabled=true]:cursor-not-allowed",
          "data-[disabled=true]:bg-transparent",
        ],
      )}
    >
      <div
        className={clsx(
          [
            "flex",
            "gap-2",
            "w-full",
            multiple ? "pl-2 pr-4" : "px-4",
            "py-1",
            "hover:bg-primary-emphasis-subtle",
            "hover:cursor-pointer",
            "group-focus-within:bg-primary-emphasis-subtle",
            "rounded-4",
            "hover:data-[disabled=true]:bg-transparent",
            "hover:data-[disabled=true]:cursor-not-allowed",
            "duration-150 ease-out",
          ],
          !multiple && isOptionSelected && ["bg-primary-emphasis"],
        )}
        data-disabled={disabled}
      >
        {multiple && (
          <Checkbox
            tabIndex={-1}
            checked={isOptionSelected}
            indeterminate={isIndeterminate}
            readOnly
            disabled={disabled}
          />
        )}
        <div data-testid="select-option-label" className="w-full min-w-0 truncate">
          {label}
        </div>
      </div>
    </CommandItem>
  );
};

Select.displayName = "Select";
