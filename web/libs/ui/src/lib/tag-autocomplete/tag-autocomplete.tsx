import React, { forwardRef, useCallback, useRef, type ChangeEvent, type ForwardedRef } from "react";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@humansignal/shad/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@humansignal/shad/components/ui/popover";
import { Spinner } from "@humansignal/ui";
import { IconPlus } from "@humansignal/icons";
import { cnm } from "../../utils/utils";
import { Tag } from "./tag";
import { useTagAutocomplete } from "./use-tag-autocomplete";
import type { TagAutocompleteProps, NormalizedTagOption } from "./types";
import styles from "./tag-autocomplete.module.scss";

export const TagAutocomplete = forwardRef(
  <T = string>(props: TagAutocompleteProps<T>, ref: ForwardedRef<HTMLSelectElement>) => {
    const {
      disabled = false,
      isLoading = false,
      name,
      placeholder,
      triggerClassName,
      contentClassName,
      tagClassName,
      renderTag,
      renderOption,
      dataTestid,
      minSearchLength = 2,
      onCreate,
    } = props;

    // First, set up a ref to track the create tag callback
    const createTagCallbackRef = useRef<(() => void) | undefined>();

    const {
      selectedValues,
      isOpen,
      query,
      focusedTagIndex,
      highlightedOptionIndex,
      filteredOptions,
      selectedOptions,
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
    } = useTagAutocomplete({ ...props, createTagCallbackRef });

    const handleInputChange = useCallback(
      (e: ChangeEvent<HTMLInputElement>) => {
        setQuery(e.target.value);
      },
      [setQuery],
    );

    const isOptionSelected = useCallback(
      (option: NormalizedTagOption<T>) => {
        return selectedValues.includes(option.value);
      },
      [selectedValues],
    );

    const highlightMatch = useCallback((text: string, query: string) => {
      if (!query.trim()) return text;

      const parts = text.split(new RegExp(`(${query})`, "gi"));
      return parts.map((part, index) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={index} className={styles.highlight}>
            {part}
          </mark>
        ) : (
          <React.Fragment key={index}>{part}</React.Fragment>
        ),
      );
    }, []);

    const canCreateTag = useCallback(() => {
      if (!onCreate || !query.trim()) return false;
      // Check if query exactly matches an existing option
      const exactMatch = filteredOptions.some((option) => option.label.toLowerCase() === query.toLowerCase().trim());
      return !exactMatch;
    }, [onCreate, query, filteredOptions]);

    const showCreateOption = canCreateTag();

    const handleCreateTag = useCallback(() => {
      if (!onCreate || !query.trim()) return;
      onCreate(query.trim());
      setQuery("");
      setIsOpen(false);
    }, [onCreate, query, setQuery, setIsOpen]);

    // Update the ref so the hook can access it
    createTagCallbackRef.current = showCreateOption ? handleCreateTag : undefined;

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
              onMouseEnter={() => setHighlightedOptionIndex(index)}
              className="rounded-4 text-neutral-content-subtle overflow-hidden p-1 outline-none group duration-150 ease-out data-[disabled=true]:opacity-50 data-[disabled=true]:cursor-not-allowed data-[disabled=true]:bg-transparent"
            >
              <div className="flex gap-2 w-full px-4 py-1 hover:bg-primary-emphasis-subtle hover:cursor-pointer group-focus-within:bg-primary-emphasis-subtle group-aria-selected:bg-primary-emphasis-subtle rounded-4 hover:data-[disabled=true]:bg-transparent hover:data-[disabled=true]:cursor-not-allowed duration-150 ease-out">
                {renderOption(option, selected)}
              </div>
            </CommandItem>
          );
        }

        return (
          <CommandItem
            key={String(option.value)}
            value={String(option.value)}
            onSelect={() => selectOption(option)}
            disabled={option.disabled}
            onMouseEnter={() => setHighlightedOptionIndex(index)}
            className="rounded-4 text-neutral-content-subtle overflow-hidden p-1 outline-none group duration-150 ease-out data-[disabled=true]:opacity-50 data-[disabled=true]:cursor-not-allowed data-[disabled=true]:bg-transparent"
          >
            <div className="flex gap-2 w-full px-4 py-1 hover:bg-primary-emphasis-subtle hover:cursor-pointer group-focus-within:bg-primary-emphasis-subtle group-aria-selected:bg-primary-emphasis-subtle rounded-4 hover:data-[disabled=true]:bg-transparent hover:data-[disabled=true]:cursor-not-allowed duration-150 ease-out">
              <span className="truncate">{highlightMatch(option.label, query)}</span>
            </div>
          </CommandItem>
        );
      },
      [
        isOptionSelected,
        renderOption,
        selectOption,
        highlightedOptionIndex,
        setHighlightedOptionIndex,
        query,
        highlightMatch,
      ],
    );

    const combobox = (
      <Command
        shouldFilter={false}
        onKeyDown={handleKeyDown}
        className="!border-0 !bg-transparent !h-auto !overflow-visible !rounded-none"
        onValueChange={(value) => {
          // Sync CMDK's selection back to our state
          if (value === "create-tag-option") {
            setHighlightedOptionIndex(filteredOptions.length);
          } else {
            const index = filteredOptions.findIndex((opt) => String(opt.value) === value);
            if (index >= 0) {
              setHighlightedOptionIndex(index);
            }
          }
        }}
      >
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild disabled={disabled}>
            <div
              ref={triggerRef}
              className={cnm(
                styles.trigger,
                {
                  [styles.triggerOpen]: isOpen,
                  [styles.triggerDisabled]: disabled,
                },
                triggerClassName,
              )}
              data-testid={dataTestid ?? "tag-autocomplete-trigger"}
              // Prevent PopoverTrigger from toggling on click - we manage open state ourselves
              onClick={(e) => {
                // Stop the PopoverTrigger's default toggle behavior
                e.preventDefault();
                // Handle our custom click logic
                const target = e.target as HTMLElement;
                // Check if click was on a tag or its remove button
                if (target.closest('[data-tag="true"]')) {
                  return;
                }
                // Otherwise focus the input
                focusInput();
              }}
            >
              <div ref={tagsContainerRef} className={styles.tagsContainer} aria-label="Selected tags">
                {selectedOptions.map((option, index) => renderTagItem(option, index))}

                <input
                  ref={inputRef}
                  type="text"
                  className={styles.input}
                  value={query}
                  onChange={handleInputChange}
                  onFocus={() => {
                    setFocusedTagIndex(null);
                    // Don't automatically open dropdown on focus - wait for user to type
                  }}
                  disabled={disabled}
                  placeholder={placeholder}
                  aria-label={placeholder || "Search tags"}
                  aria-autocomplete="list"
                  aria-expanded={isOpen}
                  aria-controls="tag-autocomplete-listbox"
                  data-testid="tag-autocomplete-input"
                />
              </div>
            </div>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className={contentClassName}
            data-testid="tag-autocomplete-dropdown"
            onOpenAutoFocus={(e) => {
              // Prevent popover from stealing focus from input
              e.preventDefault();
            }}
          >
            <CommandList
              key={`${isOpen}-${filteredOptions.length}-${query}`}
              id="tag-autocomplete-listbox"
              role="listbox"
              aria-label="Available options"
              className="bg-neutral-background"
            >
              {isLoading ? (
                <div className={styles.loadingContainer}>
                  <Spinner size={20} />
                </div>
              ) : (
                <>
                  {filteredOptions.length === 0 && !showCreateOption && <CommandEmpty>No options found.</CommandEmpty>}
                  <CommandGroup>{filteredOptions.map((option, index) => renderOptionItem(option, index))}</CommandGroup>
                  {showCreateOption && (
                    <CommandItem
                      value="create-tag-option"
                      onSelect={handleCreateTag}
                      className={cnm(
                        "rounded-4 text-neutral-content-subtle overflow-hidden p-1 outline-none group duration-150 ease-out",
                        {
                          [styles.createOptionWithBorder]: filteredOptions.length > 0,
                        },
                      )}
                      onMouseEnter={() => setHighlightedOptionIndex(filteredOptions.length)}
                      data-testid="tag-autocomplete-create-option"
                    >
                      <div className="flex gap-2 w-full px-4 py-1 hover:bg-primary-emphasis-subtle hover:cursor-pointer group-focus-within:bg-primary-emphasis-subtle group-aria-selected:bg-primary-emphasis-subtle rounded-4 duration-150 ease-out">
                        <IconPlus className={styles.createIcon} />
                        <span>
                          Add "<strong>{query.trim()}</strong>" tag
                        </span>
                      </div>
                    </CommandItem>
                  )}
                </>
              )}
            </CommandList>
          </PopoverContent>
        </Popover>

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
      </Command>
    );

    return combobox;
  },
);

TagAutocomplete.displayName = "TagAutocomplete";
