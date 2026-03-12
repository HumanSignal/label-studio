import React from "react";
import { cnm } from "@humansignal/ui";
import styles from "./Resizer.module.css";

const calculateWidth = (width, minWidth, maxWidth, initialX, currentX) => {
  const offset = currentX - initialX;

  // Limit the width
  return Math.max(minWidth ?? 30, Math.min(width + offset, maxWidth ?? 400));
};

export const Resizer = ({
  children,
  style,
  handleStyle,
  initialWidth,
  className,
  type,
  variant: variantProp,
  minWidth,
  maxWidth,
  showResizerLine,
  onResize: onResizeCallback,
  onResizeFinished,
  onReset,
}) => {
  const variant = variantProp ?? (type === "quickview" ? "quickview" : "column");
  const [width, setWidth] = React.useState(initialWidth ?? 150);
  const [isResizing, setIsResizing] = React.useState(false);
  const resizeHandler = React.useRef();

  React.useEffect(() => {
    const newWidth = Math.max(minWidth, Math.min(width));

    setWidth(newWidth);
    onResizeCallback?.(newWidth);
  }, []);

  /** @param {React.PointerEvent} evt */
  const handleResize = React.useCallback(
    (evt) => {
      evt.stopPropagation();
      evt.preventDefault();
      const handleEl = evt.currentTarget;
      handleEl.setPointerCapture(evt.pointerId);

      const initialX = evt.pageX;

      /** @param {PointerEvent} e */
      const onResize = (e) => {
        const newWidth = calculateWidth(width, minWidth, maxWidth, initialX, e.pageX);
        setWidth(newWidth);
        onResizeCallback?.(newWidth);
      };

      /** @param {PointerEvent} e */
      const stopResize = (e) => {
        handleEl.removeEventListener("pointermove", onResize);
        handleEl.removeEventListener("pointerup", stopResize);
        document.body.style.removeProperty("user-select");

        const newWidth = calculateWidth(width, minWidth, maxWidth, initialX, e.pageX);
        setIsResizing(false);

        if (newWidth !== width) {
          setWidth(newWidth);
          onResizeFinished?.(newWidth);
        }
      };

      handleEl.addEventListener("pointermove", onResize);
      handleEl.addEventListener("pointerup", stopResize);
      document.body.style.userSelect = "none";
      setIsResizing(true);
    },
    [maxWidth, minWidth, onResizeCallback, onResizeFinished, width],
  );

  return (
    <div className={cnm(styles.root, variant === "quickview" && styles.quickview, className)} style={{ width }}>
      <div style={style ?? {}}>{children}</div>

      <div
        className={cnm(styles.handle, showResizerLine !== false && isResizing && styles.handleResizing)}
        ref={resizeHandler}
        style={handleStyle}
        onPointerDown={handleResize}
        onDoubleClick={() => onReset?.()}
      />
    </div>
  );
};
