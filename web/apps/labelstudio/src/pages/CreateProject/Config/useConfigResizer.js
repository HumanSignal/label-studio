import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// Gap between columns (1rem / --spacing-base = 16px)
const COLUMN_GAP = 16;

// Minimum widths in pixels
const MIN_EDITOR_WIDTH = 400;
const MIN_PREVIEW_WIDTH = 500;

// Default editor width (left side)
const DEFAULT_EDITOR_WIDTH = 500;

export const useConfigResizer = ({ projectId, containerWidth }) => {
  // Generate storage key based on project ID
  // This allows separate storage for different projects
  const storageKey = useMemo(
    () => (projectId ? `config-editor-width:${projectId}` : "config-editor-width"),
    [projectId],
  );

  // Initialize state from localStorage or use default
  // This runs once on mount and handles initial localStorage read
  const [editorWidthPixels, setEditorWidthPixelsInternal] = useState(() => {
    try {
      const item = window.localStorage.getItem(storageKey);
      if (item) {
        return JSON.parse(item);
      }
    } catch {
      // If error reading from localStorage, use default
    }
    return DEFAULT_EDITOR_WIDTH;
  });

  // Track previous storage key to detect key changes (project switches)
  const prevStorageKeyRef = useRef(storageKey);
  // Track if we just loaded a value from localStorage (to prevent clamping from resetting it)
  const justLoadedFromStorageRef = useRef(false);

  // Single effect that handles both:
  // 1. Reading from localStorage when storage key changes (project switch)
  // 2. Writing to localStorage when the value changes
  useEffect(() => {
    const currentKey = storageKey;
    const prevKey = prevStorageKeyRef.current;

    // If storage key changed, reload value from localStorage for the new key
    if (prevKey !== currentKey) {
      justLoadedFromStorageRef.current = true;
      try {
        const item = window.localStorage.getItem(currentKey);
        if (item) {
          const parsedValue = JSON.parse(item);
          setEditorWidthPixelsInternal(parsedValue);
        } else {
          // No stored value for this key, use default
          setEditorWidthPixelsInternal(DEFAULT_EDITOR_WIDTH);
        }
      } catch {
        // Error reading, use default
        setEditorWidthPixelsInternal(DEFAULT_EDITOR_WIDTH);
      }
      prevStorageKeyRef.current = currentKey;
    } else {
      // Key hasn't changed, just write current value to localStorage
      try {
        window.localStorage.setItem(currentKey, JSON.stringify(editorWidthPixels));
      } catch {
        // Ignore write errors (e.g., quota exceeded)
      }
    }
  }, [storageKey, editorWidthPixels]);

  // Calculate min/max constraints based on container width
  const constraints = useMemo(() => {
    if (!containerWidth) {
      return {
        minEditorWidth: DEFAULT_EDITOR_WIDTH,
        maxEditorWidth: DEFAULT_EDITOR_WIDTH * 2,
      };
    }

    // Minimum editor width
    const minEditorWidth = MIN_EDITOR_WIDTH;

    // Maximum editor width ensures preview column has minimum width
    const maxEditorWidth = containerWidth - MIN_PREVIEW_WIDTH - COLUMN_GAP;

    return {
      minEditorWidth,
      maxEditorWidth: Math.max(minEditorWidth, maxEditorWidth),
    };
  }, [containerWidth]);

  // Track previous container width to only clamp when container actually resizes
  const prevContainerWidthRef = useRef(containerWidth);

  // Clamp width when container resizes (not when project switches)
  // This ensures the editor width stays within valid bounds when container size changes
  useEffect(() => {
    if (!constraints.minEditorWidth || !constraints.maxEditorWidth) {
      prevContainerWidthRef.current = containerWidth;
      return;
    }

    // Don't clamp if we just loaded a value from localStorage (project switch)
    // Reset the flag after checking it
    if (justLoadedFromStorageRef.current) {
      justLoadedFromStorageRef.current = false;
      prevContainerWidthRef.current = containerWidth;
      return;
    }

    // Only clamp if container width actually changed
    const containerWidthChanged =
      prevContainerWidthRef.current !== undefined && prevContainerWidthRef.current !== containerWidth;

    if (containerWidthChanged) {
      // Check if current width is out of bounds and clamp if needed
      const clampedWidth = Math.max(
        constraints.minEditorWidth,
        Math.min(constraints.maxEditorWidth, editorWidthPixels),
      );

      // Only update if clamping is needed
      if (clampedWidth !== editorWidthPixels) {
        setEditorWidthPixelsInternal(clampedWidth);
      }
    }

    prevContainerWidthRef.current = containerWidth;
  }, [containerWidth, constraints.minEditorWidth, constraints.maxEditorWidth, editorWidthPixels]);

  // Wrapped setter that automatically clamps values to valid constraints
  // This ensures all width updates respect min/max bounds
  const setEditorWidthPixels = useCallback(
    (value) => {
      setEditorWidthPixelsInternal((prev) => {
        const newValue = typeof value === "function" ? value(prev) : value;

        // Clamp to constraints if available
        if (constraints.minEditorWidth !== undefined && constraints.maxEditorWidth !== undefined) {
          return Math.max(constraints.minEditorWidth, Math.min(constraints.maxEditorWidth, newValue));
        }

        return newValue;
      });
    },
    [constraints.minEditorWidth, constraints.maxEditorWidth],
  );

  // Calculate preview width from editor width
  const previewWidthPixels = useMemo(() => {
    if (!containerWidth) return 0;
    return Math.max(MIN_PREVIEW_WIDTH, containerWidth - editorWidthPixels - COLUMN_GAP);
  }, [containerWidth, editorWidthPixels]);

  return {
    editorWidthPixels,
    setEditorWidthPixels,
    previewWidthPixels,
    constraints: {
      minEditorWidth: constraints.minEditorWidth,
      maxEditorWidth: constraints.maxEditorWidth,
    },
  };
};
