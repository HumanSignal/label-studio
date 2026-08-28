import { isDefined } from "@humansignal/core/lib/utils/helpers";
import { CaretDownIcon, IconPlus, InfoIcon } from "@humansignal/icons";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@humansignal/shad/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@humansignal/shad/components/ui/popover";
import clsx from "clsx";
import React, { type ForwardedRef, forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { VariableSizeList } from "react-window";
import InfiniteLoader from "react-window-infinite-loader";
import { cn, cnm } from "../../utils/utils";
import { Badge } from "../badge/badge";
import { Button } from "../button/button";
import { Checkbox } from "../checkbox/checkbox";
import { Label } from "../label/label";
import { Typography } from "../typography/typography";
import { Tooltip } from "../Tooltip/Tooltip";
import styles from "./select.module.css";
import type { OptionProps, SelectOption, SelectProps } from "./types.ts";

const VARIABLE_LIST_ITEM_HEIGHT = 40;
const VARIABLE_LIST_COUNT_RENDERED = 5;
const VARIABLE_LIST_PAGE_SIZE = 20;

/** Group flat options by a field. Returns [{ groupKey, items }] with ungrouped first, then groups in order of first occurrence. */
function groupOptionsByField(options: any[], groupBy: string): { groupKey: string | null; items: any[] }[] {
  const byKey = new Map<string | null, any[]>();
  const order: (string | null)[] = [];
  const seen = new Set<string | null>();

  for (const opt of options) {
    const key = typeof opt === "object" && opt !== null && groupBy in opt ? (opt[groupBy] ?? null) : null;
    if (!seen.has(key)) {
      seen.add(key);
      order.push(key);
    }
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key)!.push(opt);
  }

  // Ungrouped (null) first, then rest in order
  const nullFirst = order.filter((k) => k === null);
  const rest = order.filter((k) => k !== null);
  const orderedKeys = [...nullFirst, ...rest];

  return orderedKeys.map((groupKey) => ({
    groupKey,
    items: byKey.get(groupKey) ?? [],
  }));
}

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
  onSelectAllClick?: () => void;
  selectAllLabel?: string;
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
  onSelectAllClick,
  selectAllLabel = "Select all rendered items",
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

  const handleSelectAllClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (disabled) return;
      onSelectAllClick?.();
    },
    [onSelectAllClick, disabled],
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
      <div className={styles.selectedItemsHeader}>
        <button
          type="button"
          className={styles.selectedItemsToggle}
          onClick={hasNoItems ? undefined : onToggleExpand}
          aria-expanded={expanded}
          aria-label={`Selected items group, ${selectedOptions.length} items selected`}
          disabled={hasNoItems}
          style={{ cursor: hasNoItems ? "default" : "pointer" }}
        >
          {/* Caret icon */}
          <CaretDownIcon
            className={cn(styles.selectedItemsCaret, !expanded && "-rotate-90")}
            size={16}
            weight="bold"
            aria-hidden="true"
            style={{ opacity: hasNoItems ? 0.3 : 1 }}
          />

          {/* Deselect all checkbox */}
          <Checkbox
            tabIndex={-1}
            checked={selectedOptions.length > 0}
            readOnly
            disabled={disabled || selectedOptions.length === 0}
            onClick={handleDeselectAllClick}
            aria-label="Deselect all items"
          />

          {/* Title with counter badge inline */}
          <div className={styles.selectedItemsTitle}>
            <Typography variant="body">Selected items</Typography>
            <Badge>{selectedOptions.length}</Badge>
          </div>
        </button>

        {/* Select All button - shown when callback is provided */}
        {onSelectAllClick && (
          <Button
            type="button"
            onClick={handleSelectAllClick}
            disabled={disabled}
            aria-label={selectAllLabel}
            look="string"
            size="smaller"
          >
            Select All
          </Button>
        )}
      </div>

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
      groupBy,
      validate,
      required,
      skip,
      labelProps,
      defaultValue,
      searchable,
      creatable = false,
      createOptionLabel = 'Add "{value}"',
      searchPlaceholder,
      defaultSearchValue = "",
      value: externalValue,
      disabled = false,
      readOnly = false,
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
      virtualListMaxVisible,
      loadMore,
      pageSize = VARIABLE_LIST_PAGE_SIZE,
      page = 1,
      itemCount,
      onClose,
      onOpen,
      footer,
      alwaysShowSelectedGroup = false,
      optionRenderer,
      onSelectAllClick,
      selectAllLabel,
      showGroupActions = false,
      open: controlledOpen,
      ...props
    }: SelectProps<T, A>,
    _ref: ForwardedRef<HTMLSelectElement>,
  ) => {
    const ref = _ref ?? useRef<HTMLSelectElement>();
    const triggerRef = useRef<HTMLDivElement>(null);
    const [query, setQuery] = useState<string>(defaultSearchValue);
    const valueRef = useRef<any>();
    let initialValue = defaultValue?.value ?? defaultValue ?? externalValue?.value ?? externalValue;
    if (multiple) {
      initialValue = initialValue ? (Array.isArray(initialValue) ? (initialValue ?? []) : [initialValue]) : [];
    } else if (Array.isArray(initialValue)) {
      initialValue = initialValue[0];
    }
    const [internalIsOpen, setInternalIsOpen] = useState<boolean>(false);
    const isOpen = controlledOpen !== undefined ? controlledOpen : internalIsOpen;
    const [selectedGroupExpanded, setSelectedGroupExpanded] = useState<boolean>(false);
    const [value, setValue] = useState<any>(initialValue);
    const [createdOptions, setCreatedOptions] = useState<any[]>([]);

    valueRef.current = value;
    useEffect(() => {
      if (!isDefined(externalValue)) {
        const emptyVal = multiple ? [] : undefined;
        valueRef.current = emptyVal;
        setValue(emptyVal);
        return;
      }
      let val = externalValue?.value ?? externalValue;
      if (multiple && !Array.isArray(val)) {
        val = [val];
      } else if (!multiple && Array.isArray(val)) {
        val = val[0];
      }
      valueRef.current = val;
      setValue(val);
    }, [externalValue, multiple]);

    const allOptions = useMemo(() => [...options, ...createdOptions], [options, createdOptions]);
    const flatOptions = useMemo(() => {
      return allOptions.flatMap((option) => option?.children ?? option);
    }, [allOptions]);

    useEffect(() => {
      if (valueRef.current || !selectFirstIfEmpty || !flatOptions?.[0]) return;
      const val = flatOptions?.[0]?.value ?? flatOptions?.[0];
      valueRef.current = val;
      setValue(val);
    }, [selectFirstIfEmpty, flatOptions, multiple]);

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
        // When closing, reset visual query and notify parent so external search state
        // (e.g. API params) is also cleared — not just the visual input.
        setQuery(defaultSearchValue || "");
        onSearch?.(defaultSearchValue || "");
      }
    }, [isOpen, defaultSearchValue, onSearch]);
    const interactionDisabled = disabled || readOnly;

    const _onChange = useCallback(
      (val: string, isSelected: boolean) => {
        if (interactionDisabled) return;

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
          setInternalIsOpen(false);
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
      [props?.onChange, multiple, interactionDisabled],
    );

    const filterHandler = useCallback((option: any, queryString: string) => {
      const val = option?.value ?? option?.key ?? option;
      const lab = option?.label ?? option?.title ?? option?.value ?? option?.key ?? option;
      return (
        lab?.toString()?.toLowerCase().includes(queryString.toLowerCase()) ||
        val?.toString()?.toLowerCase().includes(queryString.toLowerCase())
      );
    }, []);

    const _options = useMemo(() => {
      if (searchFilter) {
        return flatOptions.filter((option) => searchFilter(option, query ?? ""));
      }
      // When not searching: preserve options structure (for nested children) unless using groupBy
      if (!searchable || !query.trim()) {
        return groupBy ? flatOptions : options;
      }
      return flatOptions.filter((option) => filterHandler(option, query));
    }, [flatOptions, options, groupBy, searchable, query, searchFilter, filterHandler]);

    /** When using groupBy: filtered options grouped by field. Ungrouped first, then groups in order. */
    const groupedOptions = useMemo((): { groupKey: string | null; items: any[] }[] | null => {
      if (!groupBy) return null;
      return groupOptionsByField(_options, groupBy);
    }, [groupBy, _options]);

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

      const result = Array.from(uniqueSelected.values());

      // Preserve stable selection order (matches `value` array order) so that
      // searching — which reorders `flatOptions` — doesn't shuffle the trigger
      // display or the SelectedItemsGroup panel.
      if (multiple && Array.isArray(value) && value.length > 1) {
        const valueOrder = new Map((value as any[]).map((v, i) => [v?.value ?? v, i]));
        result.sort((a, b) => {
          const ai = valueOrder.get(a?.value ?? a) ?? Number.POSITIVE_INFINITY;
          const bi = valueOrder.get(b?.value ?? b) ?? Number.POSITIVE_INFINITY;
          return ai - bi;
        });
      }

      return result;
    }, [flatOptions, isSelected, value, multiple]);

    const createValue = query.trim();
    const canCreate =
      creatable &&
      !multiple &&
      createValue.length > 0 &&
      !flatOptions.some((option) => {
        const optionValue = option?.value ?? option;
        return String(optionValue).toLowerCase() === createValue.toLowerCase();
      });
    const [createLabelPrefix, createLabelSuffix = ""] = createOptionLabel.split("{value}");

    const createOption = canCreate ? (
      <Option
        value={createValue}
        label={
          <>
            {createLabelPrefix}
            <strong className="inline-block max-w-[200px] truncate align-bottom">{createValue}</strong>
            {createLabelSuffix}
          </>
        }
        isOptionSelected={false}
        multiple={false}
        leadingIcon={
          <IconPlus aria-hidden="true" className="!h-4 !w-4 shrink-0 self-center text-neutral-content-subtle" />
        }
        highlighted
        onSelect={() => {
          setCreatedOptions((previous) => {
            if (previous.some((option) => option.value === createValue)) return previous;
            return [...previous, { value: createValue, label: createValue }];
          });
          _onChange(createValue, false);
        }}
      />
    ) : null;

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
                  <span key={`${optionValue}_${index}`} className="flex min-w-0 items-center gap-2">
                    <span className="truncate">{option?.label ?? optionValue}</span>
                    {option?.badge && <Badge size="small">{option.badge}</Badge>}
                    {option?.description && (
                      <Tooltip title={option.description}>
                        <InfoIcon className="h-4 w-4 shrink-0 cursor-help text-neutral-content-subtler" />
                      </Tooltip>
                    )}
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

    const hasNestedChildren = useMemo(
      () => !groupedOptions && _options.some((option) => option?.children?.length),
      [groupedOptions, _options],
    );
    const isLazyVirtualList = Boolean(isVirtualList && !groupedOptions && !hasNestedChildren);

    const renderFlatOption = (option: any, index: number) => {
      const optionValue = option?.value ?? option;
      const label = option?.label ?? optionValue;
      const isOptionSelected = isSelected(optionValue);

      return (
        <Option
          key={`${optionValue}_${index}`}
          value={optionValue}
          label={label}
          option={option}
          {...(optionRenderer && {
            optionRenderer,
            optionIndex: index,
          })}
          isOptionSelected={isOptionSelected}
          disabled={readOnly || option?.disabled}
          style={option?.style}
          multiple={multiple}
          onSelect={() => {
            _onChange(optionValue, isOptionSelected);
          }}
        />
      );
    };

    const renderedOptions = useMemo(() => {
      if (isLazyVirtualList) {
        return [];
      }
      if (groupedOptions) {
        let globalIndex = 0;
        return groupedOptions.map((group, groupIdx) => {
          const itemElements: React.ReactNode[] = [];
          group.items.forEach((item) => {
            const val = typeof item === "object" && item != null ? (item.value ?? item.key ?? item) : item;
            const lab =
              typeof item === "object" && item != null
                ? (item.label ?? item.title ?? item.value ?? item.key ?? item)
                : (item ?? String(item));
            const isOptionSelected = isSelected(val);
            const idx = globalIndex;
            globalIndex += 1;
            itemElements.push(
              <Option
                key={`${val}_${idx}`}
                value={val}
                label={lab}
                option={item}
                {...(optionRenderer && {
                  optionRenderer,
                  optionIndex: idx,
                })}
                isOptionSelected={isOptionSelected}
                disabled={readOnly || (typeof item === "object" && item?.disabled)}
                style={typeof item === "object" ? item?.style : undefined}
                multiple={multiple}
                onSelect={() => {
                  _onChange(val, isOptionSelected);
                }}
              />,
            );
          });

          const hasHeader = group.groupKey !== null;
          const hasActions = hasHeader && showGroupActions && multiple && !readOnly;

          return (
            <div
              key={`group-container-${group.groupKey ?? "__ungrouped__"}-${groupIdx}`}
              className={hasActions ? styles.groupContainer : undefined}
            >
              {hasHeader && (
                <div className={styles.groupHeader}>
                  <Typography variant="label" size="smaller">
                    {group.groupKey}
                  </Typography>
                  {hasActions && (
                    <GroupActions
                      groupItems={group.items}
                      valueRef={valueRef}
                      setValue={setValue}
                      onChange={props?.onChange}
                    />
                  )}
                </div>
              )}
              {itemElements}
            </div>
          );
        });
      }
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
                  disabled={readOnly}
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
                      option={item}
                      {...(optionRenderer && {
                        optionRenderer,
                        optionIndex: i,
                      })}
                      isOptionSelected={isChildOptionSelected}
                      disabled={readOnly || item?.disabled}
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
        return renderFlatOption(option, index);
      });
    }, [
      isLazyVirtualList,
      _options,
      groupedOptions,
      multiple,
      isSelected,
      _onChange,
      optionRenderer,
      showGroupActions,
      props?.onChange,
      readOnly,
    ]);

    const combobox = (
      <Popover
        open={isOpen}
        onOpenChange={(_isOpen) => {
          setInternalIsOpen(_isOpen);
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
              [styles.sizeSmaller]: size === "smaller",
              [styles.sizeSmall]: size === "small",
            })}
            type="button"
            data-testid={
              props?.dataTestid ??
              props?.testId ??
              `select-trigger${props?.name ? `-${props?.name?.replace?.(/\s/g, "-")}` : ""}${value ? `-${value}` : ""}`
            }
            ref={triggerRef}
            data-name={props?.name}
            data-value={value ?? ""}
            aria-readonly={readOnly || undefined}
            {...triggerProps}
          >
            <span className="flex flex-1 text-left gap-2 max-w-full overflow-hidden" data-testid="select-display-value">
              {renderSelected ? renderSelected?.(selectedOptions, props?.placeholder) : displayValue}
            </span>
            <CaretDownIcon
              weight="bold"
              className={cnm(
                styles.selectCaret,
                "shrink-0 text-neutral-content-subtler pointer-events-none transition-transform ease-out duration-150",
                isOpen && "rotate-180",
              )}
            />
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
                  "max-h-none": footer !== undefined || isVirtualList,
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
                    disabled={interactionDisabled}
                    onSelectAllClick={onSelectAllClick}
                    selectAllLabel={selectAllLabel}
                  />
                )}

                <CommandEmpty>{searchable ? "No results found." : ""}</CommandEmpty>

                <CommandGroup>
                  {props.header ? props.header : null}
                  {isVirtualList ? (
                    <InfiniteLoader
                      itemCount={itemCount ?? (isLazyVirtualList ? _options.length : renderedOptions.length)}
                      loadMoreItems={() => {
                        loadMore?.();
                        return Promise.resolve();
                      }}
                      isItemLoaded={(index) => index < (isLazyVirtualList ? _options.length : renderedOptions.length)}
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
                        const listItems = isLazyVirtualList ? _options : renderedOptions;
                        const actualItemCount = searchable && query.trim() ? _options.length : flatOptions.length;
                        const maxVisibleItems = virtualListMaxVisible ?? VARIABLE_LIST_COUNT_RENDERED;

                        const getItemHeight = (index: number) =>
                          (_options[index] as any)?.height ?? VARIABLE_LIST_ITEM_HEIGHT;

                        const visibleCount = Math.min(actualItemCount, maxVisibleItems);
                        let listHeight = 0;
                        for (let i = 0; i < visibleCount; i++) {
                          listHeight += getItemHeight(i);
                        }

                        return (
                          <VariableSizeList
                            key="virtual-list"
                            itemData={listItems}
                            itemSize={getItemHeight}
                            itemCount={listItems.length}
                            height={listHeight}
                            // width={VARIABLE_LIST_WIDTH}
                            onItemsRendered={onItemsRendered}
                            ref={infiniteLoaderRef}
                            overscanCount={isLazyVirtualList ? 4 : 0}
                          >
                            {({ index, style }) => {
                              return (
                                <div style={style}>
                                  {isLazyVirtualList ? renderFlatOption(listItems[index], index) : listItems[index]}
                                </div>
                              );
                            }}
                          </VariableSizeList>
                        );
                      }}
                    </InfiniteLoader>
                  ) : (
                    <>
                      {renderedOptions}
                      {createOption}
                    </>
                  )}
                </CommandGroup>
                {footer && <div className="p-tight border-t border-neutral-border flex">{footer}</div>}
              </CommandList>
            </Command>
          )}
        </PopoverContent>
        <select
          name={props?.name}
          value={selectedOptions.map((option) => option?.value ?? option).join(",")}
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

type GroupActionsProps = {
  groupItems: any[];
  valueRef: React.MutableRefObject<any>;
  setValue: (value: any) => void;
  onChange?: (value: any) => void;
};

const GroupActions = ({ groupItems, valueRef, setValue, onChange }: GroupActionsProps) => {
  const handleSelectAll = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const keys = groupItems
        .filter((item) => !(typeof item === "object" && item?.disabled))
        .map((item) => (typeof item === "object" && item != null ? (item.value ?? item.key ?? item) : item));
      const currentSet = new Set(Array.isArray(valueRef.current) ? valueRef.current : []);
      for (const k of keys) currentSet.add(k);
      valueRef.current = [...currentSet];
      setValue(valueRef.current);
      onChange?.(valueRef.current);
    },
    [groupItems, valueRef, setValue, onChange],
  );

  const handleSelectNone = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const removeSet = new Set(
        groupItems
          .filter((item) => !(typeof item === "object" && item?.disabled))
          .map((item) => (typeof item === "object" && item != null ? (item.value ?? item.key ?? item) : item)),
      );
      valueRef.current = (Array.isArray(valueRef.current) ? valueRef.current : []).filter((v) => !removeSet.has(v));
      setValue(valueRef.current);
      onChange?.(valueRef.current);
    },
    [groupItems, valueRef, setValue, onChange],
  );

  return (
    <div className={styles.groupActions}>
      <Button type="button" look="string" size="smaller" onClick={handleSelectAll}>
        All
      </Button>
      <Button type="button" look="string" size="smaller" onClick={handleSelectNone}>
        None
      </Button>
    </div>
  );
};

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
  optionRenderer,
  option,
  optionIndex = 0,
  leadingIcon,
  highlighted,
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
  const labelContent = optionRenderer && option ? optionRenderer({ option, index: optionIndex }) : (label ?? value);
  const badge = option?.badge;
  const description = option?.description;
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
          "w-full",
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
          highlighted && "bg-primary-emphasis-subtle",
        )}
        data-disabled={disabled}
      >
        {leadingIcon}
        {multiple && (
          <Checkbox
            tabIndex={-1}
            checked={isOptionSelected}
            indeterminate={isIndeterminate}
            readOnly
            disabled={disabled}
          />
        )}
        <div data-testid="select-option-label" className="flex w-full min-w-0 items-center gap-2">
          <span className="truncate">{labelContent}</span>
          {badge && <Badge size="small">{badge}</Badge>}
          {description && (
            <Tooltip title={description}>
              <InfoIcon className="h-4 w-4 shrink-0 cursor-help text-neutral-content-subtler" />
            </Tooltip>
          )}
        </div>
      </div>
    </CommandItem>
  );
};

Select.displayName = "Select";
