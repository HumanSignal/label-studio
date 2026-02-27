import type React from "react";
import { useCallback, useState } from "react";
import clsx from "clsx";
import styles from "./EditorResizer.module.scss";

interface EditorResizerProps {
  containerRef: React.RefObject<HTMLDivElement>;
  editorWidthPixels: number;
  onResize: (pixels: number) => void;
  constraints: {
    minEditorWidth: number;
    maxEditorWidth: number;
  };
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

export const EditorResizer: React.FC<EditorResizerProps> = ({
  containerRef,
  editorWidthPixels,
  onResize,
  constraints,
}) => {
  const [isResizing, setIsResizing] = useState(false);

  const handlePointerDown = useCallback(
    (evt: React.PointerEvent) => {
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
    [containerRef, editorWidthPixels, onResize, constraints],
  );

  return (
    <div className={clsx(styles.handle, { [styles.handleResizing]: isResizing })} onPointerDown={handlePointerDown} />
  );
};
