import { useState, useEffect, useMemo } from "react";

const DEFAULT_PREVIEW_WIDTH = 50;

// Minimum widths in pixels
const MIN_EDITOR_WIDTH = 300;
const MIN_PREVIEW_WIDTH = 400;

export const useConfigResizer = ({ projectId, containerWidth }) => {
  const storageKey = useMemo(() => (projectId ? `labelStudio:configPreviewWidth:${projectId}` : null), [projectId]);

  const [previewWidthPercent, setPreviewWidthPercent] = useState(() => {
    if (!storageKey) return DEFAULT_PREVIEW_WIDTH;

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        return typeof parsed === "number" ? parsed : DEFAULT_PREVIEW_WIDTH;
      }
    } catch (error) {
      console.error("Error reading preview width from localStorage:", error);
    }

    return DEFAULT_PREVIEW_WIDTH;
  });

  // Save to localStorage when previewWidthPercent changes
  useEffect(() => {
    if (!storageKey) return;

    try {
      localStorage.setItem(storageKey, JSON.stringify(previewWidthPercent));
    } catch (error) {
      console.error("Error saving preview width to localStorage:", error);
    }
  }, [previewWidthPercent, storageKey]);

  // Calculate min/max percentages based on container width and pixel minimums
  const constraints = useMemo(() => {
    if (!containerWidth) {
      return {
        minPreviewPercent: 20,
        maxPreviewPercent: 80,
        minEditorPercent: 20,
      };
    }

    // Calculate minimum percentages based on pixel requirements
    const minPreviewPercent = (MIN_PREVIEW_WIDTH / containerWidth) * 100;
    const minEditorPercent = (MIN_EDITOR_WIDTH / containerWidth) * 100;
    const maxPreviewPercent = 100 - minEditorPercent;

    return {
      minPreviewPercent: Math.max(minPreviewPercent, 20),
      maxPreviewPercent: Math.min(maxPreviewPercent, 80),
      minEditorPercent,
    };
  }, [containerWidth]);

  return {
    previewWidthPercent,
    setPreviewWidthPercent,
    constraints,
  };
};
