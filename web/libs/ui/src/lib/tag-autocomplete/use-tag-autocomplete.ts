import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
  visibleTags: NormalizedTagOption<T>[];
  hiddenTagCount: number;

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

// Constants for width calculations
const INPUT_MIN_WIDTH = 60;
const GAP_WIDTH = 4;
const HIDDEN_BADGE_WIDTH = 35; // Approximate width of "+N" badge

export function useTagAutocomplete<T = string>(props: TagAutocompleteProps<T>): UseTagAutocompleteReturn<T> {
  const {
    options,
    value: controlledValue,
    defaultValue,
    onChange,
    onSearch,
    searchFilter,
    maxTags,
    disabled,
    onOpen,
    onClose,
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
  const [visibleTagCount, setVisibleTagCount] = useState<number | null>(null);

  // Controlled vs uncontrolled value
  const selectedValues = controlledValue ?? internalValue;

  // Normalize all options
  const normalizedOptions = useMemo(() => {
    return options.map((opt) => normalizeOption(opt));
  }, [options]);

  // Get selected options as normalized objects
  const selectedOptions = useMemo(() => {
    return selectedValues
      .map((val) => normalizedOptions.find((opt) => opt.value === val))
      .filter((opt): opt is NormalizedTagOption<T> => opt !== undefined);
  }, [selectedValues, normalizedOptions]);

  // Calculate how many tags can fit in the available space
  const calculateVisibleTags = useCallback(() => {
    const container = tagsContainerRef.current;
    if (!container || selectedOptions.length === 0) {
      setVisibleTagCount(null);
      return;
    }

    // Wait for next frame to ensure all tags are rendered and measured
    requestAnimationFrame(() => {
      const containerWidth = container.offsetWidth;
      const tags = Array.from(tagRefs.current.values());

      // Need all tags to be rendered to measure them
      if (tags.length !== selectedOptions.length) {
        return;
      }

      // Calculate available space
      const availableSpace = containerWidth - INPUT_MIN_WIDTH;

      // Step 1: Fit as many tags as possible (greedy)
      let usedWidth = 0;
      let count = 0;

      for (let i = 0; i < tags.length; i++) {
        const tag = tags[i];
        if (!tag) continue;

        const tagWidth = tag.offsetWidth + GAP_WIDTH;

        if (usedWidth + tagWidth <= availableSpace) {
          usedWidth += tagWidth;
          count++;
        } else {
          break;
        }
      }

      // Step 2: All tags fit, no badge needed
      if (count >= selectedOptions.length) {
        setVisibleTagCount(null);
        return;
      }

      // Step 3: Some tags are hidden, ensure we have room for the "+N" badge
      const badgeWidth = HIDDEN_BADGE_WIDTH + GAP_WIDTH;
      const remainingSpace = availableSpace - usedWidth;

      // If badge doesn't fit in remaining space, remove the last visible tag
      if (remainingSpace < badgeWidth && count > 0) {
        count--;
        const lastTagWidth = tags[count]?.offsetWidth || 0;
        usedWidth -= lastTagWidth + GAP_WIDTH;
      }

      // Ensure at least 1 tag is visible
      setVisibleTagCount(Math.max(1, count));
    });
  }, [selectedOptions.length]);

  // Reset and recalculate when tags change
  useLayoutEffect(() => {
    // Reset to show all tags first, then calculate
    setVisibleTagCount(null);
    calculateVisibleTags();
  }, [selectedOptions, calculateVisibleTags]);

  useEffect(() => {
    const container = tagsContainerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      calculateVisibleTags();
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [calculateVisibleTags]);

  // Visible tags based on dynamic calculation
  const visibleTags = useMemo(() => {
    if (visibleTagCount === null) {
      return selectedOptions;
    }
    return selectedOptions.slice(0, visibleTagCount);
  }, [selectedOptions, visibleTagCount]);

  // Count of hidden tags
  const hiddenTagCount = useMemo(() => {
    if (visibleTagCount === null) {
      return 0;
    }
    return Math.max(0, selectedOptions.length - visibleTagCount);
  }, [selectedOptions.length, visibleTagCount]);

  // Filter options based on query
  const filteredOptions = useMemo(() => {
    if (!query.trim()) {
      return normalizedOptions;
    }

    const defaultFilter = (option: TagAutocompleteOption<T>, q: string) => {
      const normalized = normalizeOption(option);
      return normalized.label.toLowerCase().includes(q.toLowerCase());
    };

    const filterFn = searchFilter ?? defaultFilter;
    return normalizedOptions.filter((opt) => filterFn(opt, query));
  }, [normalizedOptions, query, searchFilter]);

  // Reset highlighted index when filtered options change
  useEffect(() => {
    setHighlightedOptionIndex(0);
  }, [filteredOptions.length]);

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
      if (!isOpen && newQuery) {
        setIsOpen(true);
      }
    },
    [onSearch, isOpen, setIsOpen],
  );

  // Select an option
  const selectOption = useCallback(
    (option: NormalizedTagOption<T>) => {
      if (option.disabled) return;

      const value = option.value;
      const isSelected = selectedValues.includes(value);

      let newValues: T[];
      if (isSelected) {
        // Deselect
        newValues = selectedValues.filter((v) => v !== value);
      } else {
        // Select (check maxTags)
        if (maxTags && selectedValues.length >= maxTags) {
          return;
        }
        newValues = [...selectedValues, value];
      }

      if (controlledValue === undefined) {
        setInternalValue(newValues);
      }
      onChange?.(newValues);

      // Close dropdown after selection and clear query
      setIsOpenState(false);
      setQueryState("");
      onClose?.();
    },
    [selectedValues, maxTags, controlledValue, onChange, onClose],
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
            // Move from input to last visible tag
            const lastIndex = Math.min(visibleTags.length - 1, selectedValues.length - 1);
            setFocusedTagIndex(lastIndex);
            tagRefs.current.get(lastIndex)?.focus();
            e.preventDefault();
          }
          break;

        case "ArrowRight":
          if (focusedTagIndex !== null) {
            const maxIndex = Math.min(visibleTags.length - 1, selectedValues.length - 1);
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
          if (!isOpen) {
            setIsOpen(true);
          } else {
            // Move highlight down in dropdown
            setHighlightedOptionIndex((prev) => Math.min(prev + 1, filteredOptions.length - 1));
          }
          e.preventDefault();
          break;

        case "ArrowUp":
          if (isOpen) {
            setHighlightedOptionIndex((prev) => Math.max(prev - 1, 0));
          }
          e.preventDefault();
          break;

        // Selection
        case "Enter":
          if (isOpen && highlightedOptionIndex >= 0 && filteredOptions[highlightedOptionIndex]) {
            selectOption(filteredOptions[highlightedOptionIndex]);
            e.preventDefault();
          }
          break;

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
            // Focus last visible tag (don't remove yet)
            const lastIndex = Math.min(visibleTags.length - 1, selectedValues.length - 1);
            setFocusedTagIndex(lastIndex);
            tagRefs.current.get(lastIndex)?.focus();
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
      visibleTags.length,
      isOpen,
      filteredOptions,
      highlightedOptionIndex,
      selectOption,
      removeTag,
      setIsOpen,
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
    visibleTags,
    hiddenTagCount,

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
