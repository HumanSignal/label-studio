import { useCallback, useEffect, useRef } from "react";
import styles from "./resize-handle.module.css";

type Direction = "horizontal" | "vertical";

interface ResizeHandleProps {
  /** "horizontal" resizes columns (left/right), "vertical" resizes rows (top/bottom). */
  direction?: Direction;
  /** Called once when the drag starts. */
  onResizeStart?: () => void;
  /** Called continuously during drag with the signed pixel delta from the start position. */
  onResize: (delta: number) => void;
  /** Called once when the drag ends. */
  onResizeEnd?: () => void;
  className?: string;
}

/**
 * A drag handle for resizing adjacent panels.
 *
 * Renders as a zero-size element with an invisible hit area and a small pill
 * indicator that highlights on hover/drag.  Works for both horizontal
 * (col-resize) and vertical (row-resize) splits.
 */
export function ResizeHandle({
  direction = "horizontal",
  onResizeStart,
  onResize,
  onResizeEnd,
  className,
}: ResizeHandleProps) {
  const startPos = useRef(0);
  const isHorizontal = direction === "horizontal";

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      const handle = e.currentTarget as HTMLElement;
      handle.setPointerCapture(e.pointerId);
      startPos.current = isHorizontal ? e.clientX : e.clientY;
      document.body.style.cursor = isHorizontal ? "col-resize" : "row-resize";
      document.body.style.userSelect = "none";
      onResizeStart?.();

      const onMove = (ev: PointerEvent) => {
        const pos = isHorizontal ? ev.clientX : ev.clientY;
        onResize(pos - startPos.current);
      };
      const onUp = () => {
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        handle.removeEventListener("pointermove", onMove);
        handle.removeEventListener("pointerup", onUp);
        handle.removeEventListener("lostpointercapture", onUp);
        onResizeEnd?.();
      };
      handle.addEventListener("pointermove", onMove);
      handle.addEventListener("pointerup", onUp);
      handle.addEventListener("lostpointercapture", onUp);
    },
    [isHorizontal, onResize, onResizeStart, onResizeEnd],
  );

  return (
    <div
      className={`${styles.handle} ${isHorizontal ? styles.horizontal : styles.vertical} ${className ?? ""}`}
      onPointerDown={onPointerDown}
    >
      <div className={styles.pill} />
    </div>
  );
}
