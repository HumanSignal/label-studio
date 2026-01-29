import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TagAutocompleteOption, TagAutocompleteProps, NormalizedTagOption } from "./types";
import { normalizeOption } from "./types";

export interface UseTagAutocompleteReturn<T> {
  // State
  selectedValues: T[];
  isOpen: boolean;
  query: string;
  focusedTagIndex: number | null;
  highlightedOptionIndex: number;

  // Computed
  filteredOptions: NormalizedTagOption<T>[];
  selectedOptions: NormalizedTagOption<T>[];

  // Refs
  inputRef: React.RefObject<HTMLInputElement>;
  triggerRef: React.RefObject<HTMLDivElement>;
  tagsContainerRef: React.RefObject<HTMLDivElement>;
  tagRefs: React.MutableRefObject<Map<number, HTMLDivElement>>;

  // Actions
  setIsOpen: (open: boolean) => void;
  setQuery: (query: string) => void;
  selectOption: (option: NormalizedTagOption<T>) => void;
  removeTag: (index: number) => void;
  removeTagByValue: (value: T) => void;
  setFocusedTagIndex: (index: number | null) => void;
  setHighlightedOptionIndex: (index: number) => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  focusInput: () => void;
}

export function useTagAutocomplete<T = string>(
  props: TagAutocompleteProps<T> & { createTagCallbackRef?: React.MutableRefObject<(() => void) | undefined> },
): UseTagAutocompleteReturn<T> {
  const {
    options,
    value: controlledValue,
    defaultValue,
    onChange,
    onSearch,
    searchFilter,
    disabled,
    onOpen,
    onClose,
    minSearchLength = 2,
    createTagCallbackRef,
  } = props;

  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tagsContainerRef = useRef<HTMLDivElement>(null);
  const tagRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // State
  const [internalValue, setInternalValue] = useState<T[]>(defaultValue ?? []);
  const [isOpen, setIsOpenState] = useState(false);
  const [query, setQueryState] = useState("");
  const [focusedTagIndex, setFocusedTagIndex] = useState<number | null>(null);
  const [highlightedOptionIndex, setHighlightedOptionIndex] = useState(0);

  // Controlled vs uncontrolled value
  const selectedValues = controlledValue ?? internalValue;

  // Normalize all options
  const normalizedOptions = useMemo(() => {
    return options.map((opt) => normalizeOption(opt));
  }, [options]);

  // Get selected options as normalized objects
  // If a value isn't in options, create a synthetic option for it (for new tags)
  const selectedOptions = useMemo(() => {
    return selectedValues.map((val) => {
      // Try to find in provided options
      const existingOption = normalizedOptions.find((opt) => opt.value === val);
      if (existingOption) return existingOption;

      // If not found, create synthetic option (for newly created tags)
      return {
        value: val,
        label: String(val),
      } as NormalizedTagOption<T>;
    });
  }, [selectedValues, normalizedOptions]);

  // Filter options based on query and exclude already selected values
  const filteredOptions = useMemo(() => {
    // First, filter out already selected tags
    const availableOptions = normalizedOptions.filter((opt) => !selectedValues.includes(opt.value));

    if (!query.trim()) {
      return availableOptions;
    }

    const defaultFilter = (option: TagAutocompleteOption<T>, q: string) => {
      const normalized = normalizeOption(option);
      return normalized.label.toLowerCase().includes(q.toLowerCase());
    };

    const filterFn = searchFilter ?? defaultFilter;
    return availableOptions.filter((opt) => filterFn(opt, query));
  }, [normalizedOptions, query, searchFilter, selectedValues]);

  // Auto-highlight first item when dropdown opens or results change
  useEffect(() => {
    if (isOpen) {
      setHighlightedOptionIndex(0);
    }
  }, [filteredOptions.length, isOpen]);

  // Open/close handlers
  const setIsOpen = useCallback(
    (open: boolean) => {
      if (disabled) return;
      setIsOpenState(open);
      if (open) {
        onOpen?.();
      } else {
        onClose?.();
        setQueryState("");
        setHighlightedOptionIndex(0);
      }
    },
    [disabled, onOpen, onClose],
  );

  // Query handler
  const setQuery = useCallback(
    (newQuery: string) => {
      setQueryState(newQuery);
      onSearch?.(newQuery);
      // Only open dropdown if query meets minimum length requirement
      if (!isOpen && newQuery.length >= minSearchLength) {
        setIsOpen(true);
      } else if (isOpen && newQuery.length < minSearchLength) {
        // Close dropdown if query becomes too short
        setIsOpen(false);
      }
    },
    [onSearch, isOpen, setIsOpen, minSearchLength],
  );

  // Select an option
  const selectOption = useCallback(
    (option: NormalizedTagOption<T>) => {
      if (option.disabled) return;

      const value = option.value;
      const isSelected = selectedValues.includes(value);

      // Don't allow deselecting via dropdown - tags should only be removed via the X button or keyboard
      if (isSelected) {
        return;
      }

      const newValues = [...selectedValues, value];

      if (controlledValue === undefined) {
        setInternalValue(newValues);
      }
      onChange?.(newValues);

      // Close dropdown after selection and clear query
      setIsOpenState(false);
      setQueryState("");
      onClose?.();
    },
    [selectedValues, controlledValue, onChange, onClose],
  );

  // Remove a tag by index
  const removeTag = useCallback(
    (index: number) => {
      if (disabled) return;

      const newValues = selectedValues.filter((_, i) => i !== index);
      if (controlledValue === undefined) {
        setInternalValue(newValues);
      }
      onChange?.(newValues);
    },
    [selectedValues, disabled, controlledValue, onChange],
  );

  // Remove a tag by value
  const removeTagByValue = useCallback(
    (value: T) => {
      if (disabled) return;

      const newValues = selectedValues.filter((v) => v !== value);
      if (controlledValue === undefined) {
        setInternalValue(newValues);
      }
      onChange?.(newValues);
    },
    [selectedValues, disabled, controlledValue, onChange],
  );

  // Focus input
  const focusInput = useCallback(() => {
    inputRef.current?.focus();
    setFocusedTagIndex(null);
  }, []);

  // Keyboard handler
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;

      const inputElement = inputRef.current;
      const cursorAtStart = inputElement?.selectionStart === 0 && inputElement?.selectionEnd === 0;
      const hasSelectedTags = selectedValues.length > 0;

      // Allow Enter to bubble up to form submission when dropdown is closed and no tag is focused
      if (e.key === "Enter" && !isOpen && focusedTagIndex === null) {
        // Find the parent form and trigger submission
        const form = inputRef.current?.closest("form");
        if (form) {
          e.preventDefault();
          e.stopPropagation();
          form.requestSubmit();
        }
        return;
      }

      switch (e.key) {
        // Tag navigation
        case "ArrowLeft":
          if (focusedTagIndex !== null) {
            // Move focus to previous tag
            if (focusedTagIndex > 0) {
              setFocusedTagIndex(focusedTagIndex - 1);
              tagRefs.current.get(focusedTagIndex - 1)?.focus();
            }
            e.preventDefault();
          } else if (cursorAtStart && hasSelectedTags && !query) {
            // Move from input to last tag
            const lastIndex = selectedValues.length - 1;
            if (lastIndex >= 0) {
              setFocusedTagIndex(lastIndex);
              tagRefs.current.get(lastIndex)?.focus();
            }
            e.preventDefault();
          }
          break;

        case "ArrowRight":
          if (focusedTagIndex !== null) {
            const maxIndex = selectedValues.length - 1;
            if (focusedTagIndex < maxIndex) {
              // Move to next tag
              setFocusedTagIndex(focusedTagIndex + 1);
              tagRefs.current.get(focusedTagIndex + 1)?.focus();
            } else {
              // Move from last tag back to input
              setFocusedTagIndex(null);
              inputRef.current?.focus();
            }
            e.preventDefault();
          }
          break;

        // Dropdown navigation
        case "ArrowDown":
          if (!isOpen && query.length >= minSearchLength) {
            setIsOpen(true);
            e.preventDefault();
          }
          // When dropdown is open, let CMDK handle the navigation
          break;

        case "ArrowUp":
          // When dropdown is open, let CMDK handle the navigation
          break;

        // Selection - let CMDK handle Enter when dropdown is open
        case "Enter":
          // CMDK will handle selection via onSelect callback
          break;

        // Comma - simulate Enter keypress
        case ",": {
          e.preventDefault();
          e.stopPropagation();

          // Create and dispatch a synthetic Enter key event
          const enterEvent = new KeyboardEvent("keydown", {
            key: "Enter",
            code: "Enter",
            keyCode: 13,
            which: 13,
            bubbles: true,
            cancelable: true,
          });
          e.currentTarget.dispatchEvent(enterEvent);
          break;
        }

        // Removal
        case "Backspace":
          if (focusedTagIndex !== null) {
            // Remove focused tag
            const indexToRemove = focusedTagIndex;
            removeTag(indexToRemove);
            // Move focus appropriately
            if (indexToRemove > 0) {
              setFocusedTagIndex(indexToRemove - 1);
              setTimeout(() => {
                tagRefs.current.get(indexToRemove - 1)?.focus();
              }, 0);
            } else {
              setFocusedTagIndex(null);
              inputRef.current?.focus();
            }
            e.preventDefault();
          } else if (cursorAtStart && hasSelectedTags && !query) {
            // Focus last tag (don't remove yet)
            const lastIndex = selectedValues.length - 1;
            if (lastIndex >= 0) {
              setFocusedTagIndex(lastIndex);
              tagRefs.current.get(lastIndex)?.focus();
            }
            e.preventDefault();
          }
          break;

        case "Delete":
          if (focusedTagIndex !== null) {
            const indexToRemove = focusedTagIndex;
            removeTag(indexToRemove);
            // Keep focus at same index or move to input
            const newLength = selectedValues.length - 1;
            if (indexToRemove >= newLength) {
              setFocusedTagIndex(null);
              inputRef.current?.focus();
            } else {
              setTimeout(() => {
                tagRefs.current.get(indexToRemove)?.focus();
              }, 0);
            }
            e.preventDefault();
          }
          break;

        // Escape
        case "Escape":
          if (focusedTagIndex !== null) {
            setFocusedTagIndex(null);
            inputRef.current?.focus();
          } else if (isOpen) {
            setIsOpen(false);
          }
          e.preventDefault();
          break;

        // Tab - let it propagate naturally
        case "Tab":
          if (isOpen) {
            setIsOpen(false);
          }
          setFocusedTagIndex(null);
          break;
      }
    },
    [
      disabled,
      selectedValues,
      focusedTagIndex,
      query,
      isOpen,
      filteredOptions,
      highlightedOptionIndex,
      selectOption,
      removeTag,
      setIsOpen,
      minSearchLength,
      createTagCallbackRef,
    ],
  );

  return {
    // State
    selectedValues,
    isOpen,
    query,
    focusedTagIndex,
    highlightedOptionIndex,

    // Computed
    filteredOptions,
    selectedOptions,

    // Refs
    inputRef,
    triggerRef,
    tagsContainerRef,
    tagRefs,

    // Actions
    setIsOpen,
    setQuery,
    selectOption,
    removeTag,
    removeTagByValue,
    setFocusedTagIndex,
    setHighlightedOptionIndex,
    handleKeyDown,
    focusInput,
  };
}
