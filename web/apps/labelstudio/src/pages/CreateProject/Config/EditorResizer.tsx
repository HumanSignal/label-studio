import type React from "react";
import { useCallback, useState } from "react";
import clsx from "clsx";
import styles from "./EditorResizer.module.css";

interface EditorResizerProps {
  containerRef: React.RefObject<HTMLDivElement>;
  editorWidthPixels: number;
  onResize: (pixels: number) => void;
  constraints: {
    minEditorWidth: number;
    maxEditorWidth: number;
  };
  /** When true, no resize range is available (e.g. container at minimum width). Disables the handle to prevent twitching. */
  disabled?: boolean;
}

const calculateEditorWidth = (
  initialWidth: number,
  initialX: number,
  currentX: number,
  minWidth: number,
  maxWidth: number,
): number => {
  // Calculate offset from initial position
  // Dragging right (currentX > initialX) should increase editor width
  const offset = currentX - initialX;
  const newWidth = initialWidth + offset;
  return Math.max(minWidth, Math.min(maxWidth, newWidth));
};

// Epsilon for comparing current width to min/max (avoids floating point issues)
const WIDTH_EPSILON = 2;

export const EditorResizer: React.FC<EditorResizerProps> = ({
  containerRef,
  editorWidthPixels,
  onResize,
  constraints,
  disabled = false,
}) => {
  const [isResizing, setIsResizing] = useState(false);

  const handleDoubleClick = useCallback(() => {
    if (disabled) return;
    const { minEditorWidth, maxEditorWidth } = constraints;
    const atMin = editorWidthPixels <= minEditorWidth + WIDTH_EPSILON;
    const atMax = editorWidthPixels >= maxEditorWidth - WIDTH_EPSILON;
    if (atMin) {
      onResize(maxEditorWidth);
    } else if (atMax) {
      onResize(minEditorWidth);
    } else {
      onResize(minEditorWidth);
    }
  }, [disabled, constraints, editorWidthPixels, onResize]);

  const handlePointerDown = useCallback(
    (evt: React.PointerEvent) => {
      if (disabled) return;
      evt.stopPropagation();
      evt.preventDefault();

      const container = containerRef.current;
      if (!container) return;

      const handleEl = evt.currentTarget as HTMLElement;
      handleEl.setPointerCapture(evt.pointerId);

      const initialX = evt.pageX;
      const initialWidth = editorWidthPixels;

      const onPointerMove = (e: PointerEvent) => {
        const newWidth = calculateEditorWidth(
          initialWidth,
          initialX,
          e.pageX,
          constraints.minEditorWidth,
          constraints.maxEditorWidth,
        );
        onResize(newWidth);
      };

      const onPointerUp = () => {
        handleEl.removeEventListener("pointermove", onPointerMove);
        handleEl.removeEventListener("pointerup", onPointerUp);
        document.body.style.removeProperty("user-select");
        document.body.style.removeProperty("cursor");
        setIsResizing(false);
      };

      handleEl.addEventListener("pointermove", onPointerMove);
      handleEl.addEventListener("pointerup", onPointerUp);
      document.body.style.userSelect = "none";
      document.body.style.cursor = "col-resize";
      setIsResizing(true);
    },
    [containerRef, editorWidthPixels, onResize, constraints, disabled],
  );

  return (
    <div
      className={clsx(styles.handle, {
        [styles.handleResizing]: isResizing,
        [styles.handleDisabled]: disabled,
      })}
      onPointerDown={handlePointerDown}
      onDoubleClick={handleDoubleClick}
      aria-disabled={disabled}
      title={disabled ? undefined : "Drag to resize. Double-click to collapse or expand."}
    />
  );
};
