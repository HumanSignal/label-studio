import { useCallback, useRef, useState } from "react";
import { cn } from "../../../utils/bem";
import "./ConfigResizer.scss";

const calculateEditorWidth = (initialWidth, initialX, currentX, minWidth, maxWidth) => {
  // Calculate offset from initial position
  // Dragging right (currentX > initialX) should increase editor width
  const offset = currentX - initialX;
  const newWidth = initialWidth + offset;
  return Math.max(minWidth, Math.min(maxWidth, newWidth));
};

export const ConfigResizer = ({ containerRef, editorWidthPixels, onResize, onResizeFinished, constraints }) => {
  const [isResizing, setIsResizing] = useState(false);
  const handleRef = useRef(null);

  const handleMouseDown = useCallback(
    (evt) => {
      evt.stopPropagation();
      evt.preventDefault();

      const container = containerRef.current;
      if (!container) return;

      // Capture container width once at the start of drag (not on every mouse move)
      const containerWidth = container.clientWidth;
      const initialX = evt.pageX;
      const initialWidth = editorWidthPixels;
      let newWidth = editorWidthPixels;

      const onMouseMove = (e) => {
        // Use the captured container width instead of recalculating getBoundingClientRect()
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

        if (newWidth !== editorWidthPixels && onResizeFinished) {
          onResizeFinished(newWidth);
        }
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
      document.body.style.userSelect = "none";
      document.body.style.cursor = "col-resize";
      setIsResizing(true);
    },
    [containerRef, editorWidthPixels, onResize, onResizeFinished, constraints],
  );

  return (
    <div
      ref={handleRef}
      className={cn("config-resizer").elem("handle").mod({ resizing: isResizing }).toString()}
      onMouseDown={handleMouseDown}
    />
  );
};
