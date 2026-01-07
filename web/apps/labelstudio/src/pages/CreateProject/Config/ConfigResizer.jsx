import { useCallback, useState } from "react";
import { cn } from "../../../utils/bem";
import "./ConfigResizer.scss";

const calculateEditorWidth = (initialWidth, initialX, currentX, minWidth, maxWidth) => {
  // Calculate offset from initial position
  // Dragging right (currentX > initialX) should increase editor width
  const offset = currentX - initialX;
  const newWidth = initialWidth + offset;
  return Math.max(minWidth, Math.min(maxWidth, newWidth));
};

export const ConfigResizer = ({ containerRef, editorWidthPixels, onResize, constraints }) => {
  const [isResizing, setIsResizing] = useState(false);

  const handleMouseDown = useCallback(
    (evt) => {
      evt.stopPropagation();
      evt.preventDefault();

      const container = containerRef.current;
      if (!container) return;

      const initialX = evt.pageX;
      const initialWidth = editorWidthPixels;
      let newWidth = editorWidthPixels;

      const onMouseMove = (e) => {
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

  return (
    <div
      className={cn("config-resizer").elem("handle").mod({ resizing: isResizing }).toString()}
      onMouseDown={handleMouseDown}
    />
  );
};
