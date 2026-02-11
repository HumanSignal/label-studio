import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// Gap between columns (1rem / --spacing-base = 16px)
const COLUMN_GAP = 16;

// Minimum widths in pixels
// These values ensure editor and preview remain usable at minimum sizes
const MIN_EDITOR_WIDTH = 400; // Minimum width to display code editor comfortably
const MIN_PREVIEW_WIDTH = 500; // Minimum width to display labeling interface preview effectively

// Left side menu width (sidebar navigation)
const LEFT_MENU_WIDTH = 240;

// Default editor width (left side)
// Comfortable default width for the editor column
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
    // Calculate storage key inline (can't use useMemo value in initializer)
    const initialStorageKey = projectId ? `config-editor-width:${projectId}` : "config-editor-width";

    try {
      const item = window.localStorage.getItem(initialStorageKey);
      if (item) {
        const storedWidth = JSON.parse(item);
        // Check if stored width + left menu width exceeds screen width
        const leftSideExceedsScreen = storedWidth + LEFT_MENU_WIDTH > window.innerWidth;
        // Check if right column would be too small (only if containerWidth is available)
        const rightColumnTooSmall =
          containerWidth !== undefined && containerWidth - storedWidth - COLUMN_GAP < MIN_PREVIEW_WIDTH;
        // Reset to default if either condition is true
        if (leftSideExceedsScreen || rightColumnTooSmall) {
          return DEFAULT_EDITOR_WIDTH;
        }
        return storedWidth;
      }
    } catch {
      // If error reading from localStorage, use default
    }
    return DEFAULT_EDITOR_WIDTH;
  });

  // Track previous storage key to prevent writes during key switches
  // This is necessary because when the storage key changes (e.g., switching projects),
  // we need to load the new value from localStorage without writing the old value to the new key
  const prevStorageKeyRef = useRef(storageKey);

  // Read from localStorage when storage key changes (project switch)
  // Separate effect for reading ensures we don't write stale values when switching contexts
  useEffect(() => {
    const currentKey = storageKey;
    const prevKey = prevStorageKeyRef.current;

    // Only read if storage key changed (project switch)
    if (prevKey !== currentKey) {
      try {
        const item = window.localStorage.getItem(currentKey);
        if (item) {
          const parsedValue = JSON.parse(item);
          // Check if stored width + left menu width exceeds screen width
          const leftSideExceedsScreen = parsedValue + LEFT_MENU_WIDTH > window.innerWidth;
          // Check if right column would be too small (only if containerWidth is available)
          const rightColumnTooSmall =
            containerWidth !== undefined && containerWidth - parsedValue - COLUMN_GAP < MIN_PREVIEW_WIDTH;
          // Reset to default if either condition is true
          if (leftSideExceedsScreen || rightColumnTooSmall) {
            setEditorWidthPixelsInternal(DEFAULT_EDITOR_WIDTH);
          } else {
            setEditorWidthPixelsInternal(parsedValue);
          }
        } else {
          // No stored value for this key, use default
          setEditorWidthPixelsInternal(DEFAULT_EDITOR_WIDTH);
        }
      } catch {
        // Error reading, use default
        setEditorWidthPixelsInternal(DEFAULT_EDITOR_WIDTH);
      }
      prevStorageKeyRef.current = currentKey;
    }
  }, [storageKey, containerWidth]);

  // Write to localStorage when width changes (but not during key switches)
  // This effect persists user's width preference, but skips writing when switching
  // between projects to avoid overwriting the new project's stored value
  useEffect(() => {
    const currentKey = storageKey;
    const prevKey = prevStorageKeyRef.current;

    // Only write if storage key hasn't changed (to avoid writing during key switch)
    // When key changes, the read effect handles loading the new value
    if (prevKey === currentKey) {
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

  // Clamp width when container resizes
  // This ensures the editor width stays within valid bounds when container size changes
  // We only clamp on actual container resize, not on project switches, because project switches
  // load values from localStorage which are already validated, and clamping would override
  // the user's saved preference unnecessarily
  useEffect(() => {
    if (!constraints.minEditorWidth || !constraints.maxEditorWidth) {
      prevContainerWidthRef.current = containerWidth;
      return;
    }

    // Only clamp if container width actually changed (not just constraints)
    // This distinction is important: project switches change storage keys but shouldn't trigger clamping,
    // while actual window/container resizes should clamp to ensure preview remains usable
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

  // Reset width when window resizes and current width exceeds screen size or right column is too small
  // This ensures the resizer remains visible and usable when screen size decreases
  useEffect(() => {
    const checkAndReset = () => {
      // Check if current width + left menu width exceeds screen width
      const leftSideExceedsScreen = editorWidthPixels + LEFT_MENU_WIDTH > window.innerWidth;

      // Check if right column (preview) width is less than minimum
      // Right column width = containerWidth - editorWidthPixels - COLUMN_GAP
      const rightColumnTooSmall =
        containerWidth !== undefined && containerWidth - editorWidthPixels - COLUMN_GAP < MIN_PREVIEW_WIDTH;

      // Reset to default if either condition is true
      if (leftSideExceedsScreen || rightColumnTooSmall) {
        setEditorWidthPixelsInternal(DEFAULT_EDITOR_WIDTH);
      }
    };

    // Check immediately when dependencies change
    checkAndReset();

    // Also listen to window resize events
    window.addEventListener("resize", checkAndReset);
    return () => {
      window.removeEventListener("resize", checkAndReset);
    };
  }, [editorWidthPixels, containerWidth]);

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
