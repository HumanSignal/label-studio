import React, { forwardRef, useCallback, type ChangeEvent, type ForwardedRef } from "react";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@humansignal/shad/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@humansignal/shad/components/ui/popover";
import { IconChevron, IconChevronDown } from "@humansignal/icons";
import { Checkbox, Label, Spinner } from "@humansignal/ui";
import { cnm } from "../../utils/utils";
import { Tag } from "./tag";
import { useTagAutocomplete } from "./use-tag-autocomplete";
import type { TagAutocompleteProps, NormalizedTagOption } from "./types";
import styles from "./tag-autocomplete.module.scss";

export const TagAutocomplete = forwardRef(
  <T = string>(props: TagAutocompleteProps<T>, ref: ForwardedRef<HTMLSelectElement>) => {
    const {
      label,
      description,
      labelProps,
      required,
      disabled = false,
      isLoading = false,
      placeholder = "Select tags...",
      searchPlaceholder = "Search...",
      name,
      size = "medium",
      triggerClassName,
      contentClassName,
      tagClassName,
      renderTag,
      renderOption,
      dataTestid,
    } = props;

    const {
      selectedValues,
      isOpen,
      query,
      focusedTagIndex,
      highlightedOptionIndex,
      filteredOptions,
      selectedOptions,
      visibleTags,
      hiddenTagCount,
      inputRef,
      triggerRef,
      tagsContainerRef,
      tagRefs,
      setIsOpen,
      setQuery,
      selectOption,
      removeTag,
      setFocusedTagIndex,
      setHighlightedOptionIndex,
      handleKeyDown,
      focusInput,
    } = useTagAutocomplete(props);

    const handleInputChange = useCallback(
      (e: ChangeEvent<HTMLInputElement>) => {
        setQuery(e.target.value);
      },
      [setQuery],
    );

    const handleCaretClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsOpen(!isOpen);
      },
      [isOpen, setIsOpen],
    );

    const isOptionSelected = useCallback(
      (option: NormalizedTagOption<T>) => {
        return selectedValues.includes(option.value);
      },
      [selectedValues],
    );

    const renderTagItem = useCallback(
      (option: NormalizedTagOption<T>, index: number) => {
        const handleRemove = () => removeTag(index);

        if (renderTag) {
          return <React.Fragment key={String(option.value)}>{renderTag(option, handleRemove)}</React.Fragment>;
        }

        return (
          <Tag
            key={String(option.value)}
            ref={(el) => {
              if (el) {
                tagRefs.current.set(index, el);
              } else {
                tagRefs.current.delete(index);
              }
            }}
            label={option.label}
            onRemove={handleRemove}
            isFocused={focusedTagIndex === index}
            disabled={disabled}
            className={tagClassName}
            tabIndex={focusedTagIndex === index ? 0 : -1}
            onKeyDown={handleKeyDown}
            dataTestid={`tag-${option.value}`}
          />
        );
      },
      [renderTag, removeTag, focusedTagIndex, disabled, tagClassName, handleKeyDown, tagRefs],
    );

    const renderOptionItem = useCallback(
      (option: NormalizedTagOption<T>, index: number) => {
        const selected = isOptionSelected(option);

        if (renderOption) {
          return (
            <CommandItem
              key={String(option.value)}
              value={String(option.value)}
              onSelect={() => selectOption(option)}
              disabled={option.disabled}
              data-highlighted={highlightedOptionIndex === index}
              className={cnm(styles.option, {
                [styles.optionHighlighted]: highlightedOptionIndex === index,
              })}
            >
              {renderOption(option, selected)}
            </CommandItem>
          );
        }

        return (
          <CommandItem
            key={String(option.value)}
            value={String(option.value)}
            onSelect={() => selectOption(option)}
            disabled={option.disabled}
            data-highlighted={highlightedOptionIndex === index}
            onMouseEnter={() => setHighlightedOptionIndex(index)}
            className={cnm(styles.option, {
              [styles.optionHighlighted]: highlightedOptionIndex === index,
              [styles.optionDisabled]: option.disabled,
            })}
          >
            <Checkbox checked={selected} readOnly tabIndex={-1} className={styles.optionCheckbox} />
            <span className={styles.optionLabel}>{option.label}</span>
          </CommandItem>
        );
      },
      [isOptionSelected, renderOption, selectOption, highlightedOptionIndex, setHighlightedOptionIndex],
    );

    const combobox = (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild disabled={disabled}>
          <div
            ref={triggerRef}
            className={cnm(
              styles.trigger,
              {
                [styles.triggerOpen]: isOpen,
                [styles.triggerDisabled]: disabled,
                [styles.triggerSmall]: size === "small",
                [styles.triggerMedium]: size === "medium",
                [styles.triggerLarge]: size === "large",
              },
              triggerClassName,
            )}
            onKeyDown={handleKeyDown}
            data-testid={dataTestid ?? "tag-autocomplete-trigger"}
            // Prevent PopoverTrigger from toggling on click - we manage open state ourselves
            onClick={(e) => {
              // Stop the PopoverTrigger's default toggle behavior
              e.preventDefault();
              // Handle our custom click logic
              const target = e.target as HTMLElement;
              if (target.closest(`.${styles.tag}`) || target.closest(`.${styles.tagRemove}`)) {
                return;
              }
              // If clicking on caret button, let handleCaretClick handle it
              if (target.closest(`.${styles.caretButton}`)) {
                return;
              }
              // Otherwise focus the input (which will open the dropdown)
              focusInput();
            }}
          >
            <div ref={tagsContainerRef} className={styles.tagsContainer} aria-label="Selected tags">
              {visibleTags.map((option, index) => renderTagItem(option, index))}

              {hiddenTagCount > 0 && (
                <span className={styles.hiddenCount} data-testid="tag-autocomplete-hidden-count">
                  +{hiddenTagCount} more
                </span>
              )}

              <input
                ref={inputRef}
                type="text"
                className={styles.input}
                value={query}
                onChange={handleInputChange}
                onFocus={() => {
                  setFocusedTagIndex(null);
                  if (!isOpen) {
                    setIsOpen(true);
                  }
                }}
                placeholder={selectedValues.length === 0 ? placeholder : searchPlaceholder}
                disabled={disabled}
                aria-label={label || "Search tags"}
                aria-autocomplete="list"
                aria-expanded={isOpen}
                aria-controls="tag-autocomplete-listbox"
                data-testid="tag-autocomplete-input"
              />
            </div>

            <button
              type="button"
              className={styles.caretButton}
              onClick={handleCaretClick}
              disabled={disabled}
              tabIndex={-1}
              aria-label={isOpen ? "Close dropdown" : "Open dropdown"}
            >
              {isLoading ? (
                <Spinner size={16} className={styles.spinner} />
              ) : isOpen ? (
                <IconChevron className={styles.caretIcon} />
              ) : (
                <IconChevronDown className={styles.caretIcon} />
              )}
            </button>
          </div>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className={cnm(styles.content, contentClassName)}
          data-testid="tag-autocomplete-dropdown"
          onOpenAutoFocus={(e) => {
            // Prevent popover from stealing focus from input
            e.preventDefault();
          }}
        >
          <Command shouldFilter={false}>
            <CommandList
              id="tag-autocomplete-listbox"
              role="listbox"
              aria-label="Available options"
              className={styles.list}
            >
              <CommandEmpty className={styles.empty}>{isLoading ? "Loading..." : "No options found."}</CommandEmpty>
              <CommandGroup>{filteredOptions.map((option, index) => renderOptionItem(option, index))}</CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>

        {/* Hidden select for form integration */}
        <select
          ref={ref}
          name={name}
          multiple
          value={selectedValues.map(String)}
          disabled={disabled}
          className={styles.hiddenSelect}
          onChange={() => {}}
          aria-hidden="true"
          tabIndex={-1}
        >
          {selectedOptions.map((option) => (
            <option key={String(option.value)} value={String(option.value)}>
              {option.label}
            </option>
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

TagAutocomplete.displayName = "TagAutocomplete";
