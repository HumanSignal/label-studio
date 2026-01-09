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

  const handleMouseDown = useCallback(
    (evt: React.MouseEvent) => {
      evt.stopPropagation();
      evt.preventDefault();

      const container = containerRef.current;
      if (!container) return;

      const initialX = evt.pageX;
      const initialWidth = editorWidthPixels;
      let newWidth = editorWidthPixels;

      const onMouseMove = (e: MouseEvent) => {
        newWidth = calculateEditorWidth(
          initialWidth,
          initialX,
          e.pageX,
          constraints.minEditorWidth,
          constraints.maxEditorWidth,
        );

        onResize(newWidth);
      };

      const onMouseUp = () => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        document.body.style.removeProperty("user-select");
        document.body.style.removeProperty("cursor");

        setIsResizing(false);
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
      document.body.style.userSelect = "none";
      document.body.style.cursor = "col-resize";
      setIsResizing(true);
    },
    [containerRef, editorWidthPixels, onResize, constraints],
  );

  return <div className={clsx(styles.handle, { [styles.handleResizing]: isResizing })} onMouseDown={handleMouseDown} />;
};
