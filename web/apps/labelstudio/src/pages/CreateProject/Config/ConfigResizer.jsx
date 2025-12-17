import { useCallback, useRef, useState } from "react";
import { cn } from "../../../utils/bem";
import "./ConfigResizer.scss";

const calculatePreviewPercent = (initialPercent, containerWidth, initialX, currentX, minPercent, maxPercent) => {
  // Calculate offset from initial position
  // Dragging left (currentX < initialX) should increase preview width
  const offset = initialX - currentX; // Negative when dragging right, positive when dragging left
  const offsetPercent = (offset / containerWidth) * 100;
  const newPercent = initialPercent + offsetPercent;
  return Math.max(minPercent, Math.min(maxPercent, newPercent));
};

export const ConfigResizer = ({ containerRef, previewWidthPercent, onResize, onResizeFinished, constraints }) => {
  const [isResizing, setIsResizing] = useState(false);
  const handleRef = useRef(null);

  const handleMouseDown = useCallback(
    (evt) => {
      evt.stopPropagation();
      evt.preventDefault();

      const container = containerRef.current;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const initialX = evt.pageX;
      const initialPercent = previewWidthPercent;
      let newPercent = previewWidthPercent;

      const onMouseMove = (e) => {
        const containerRectCurrent = container.getBoundingClientRect();
        newPercent = calculatePreviewPercent(
          initialPercent,
          containerRectCurrent.width,
          initialX,
          e.pageX,
          constraints.minPreviewPercent,
          constraints.maxPreviewPercent,
        );

        onResize(newPercent);
      };

      const onMouseUp = () => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        document.body.style.removeProperty("user-select");
        document.body.style.removeProperty("cursor");

        setIsResizing(false);

        if (newPercent !== previewWidthPercent && onResizeFinished) {
          onResizeFinished(newPercent);
        }
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
      document.body.style.userSelect = "none";
      document.body.style.cursor = "col-resize";
      setIsResizing(true);
    },
    [containerRef, previewWidthPercent, onResize, onResizeFinished, constraints],
  );

  return (
    <div
      ref={handleRef}
      className={cn("config-resizer").elem("handle").mod({ resizing: isResizing }).toString()}
      onMouseDown={handleMouseDown}
    />
  );
};
