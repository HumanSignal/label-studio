import React from "react";
import { Block, Elem } from "../../../utils/bem";
import "./Resizer.scss";

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
  minWidth,
  maxWidth,
  showResizerLine,
  onResize: onResizeCallback,
  onResizeFinished,
  onReset,
}) => {
  const [width, setWidth] = React.useState(initialWidth ?? 150);
  const [isResizing, setIsResizing] = React.useState(false);
  const resizeHandler = React.useRef();

  React.useEffect(() => {
    const newWidth = Math.max(minWidth, Math.min(width));

    setWidth(newWidth);
    onResizeCallback?.(newWidth);
  }, []);

  /** @param {MouseEvent} evt */
  const handleResize = React.useCallback(
    (evt) => {
      evt.stopPropagation();
      const initialX = evt.pageX;
      let newWidth = width;

      /** @param {MouseEvent} evt */
      const onResize = (evt) => {
        newWidth = calculateWidth(width, minWidth, maxWidth, initialX, evt.pageX);

        setWidth(newWidth);
        onResizeCallback?.(newWidth);
      };

      const stopResize = (evt) => {
        document.removeEventListener("mousemove", onResize);
        document.removeEventListener("mouseup", stopResize);
        document.body.style.removeProperty("user-select");

        newWidth = calculateWidth(width, minWidth, maxWidth, initialX, evt.pageX);

        setIsResizing(false);

        if (newWidth !== width) {
          setWidth(newWidth);
          onResizeFinished?.(newWidth);
        }
      };

      document.addEventListener("mousemove", onResize);
      document.addEventListener("mouseup", stopResize);
      document.body.style.userSelect = "none";
      setIsResizing(true);
    },
    [maxWidth, minWidth, onResizeCallback, onResizeFinished, width],
  );

  return (
    <Block name="resizer" mix={className} style={{ width }}>
      <Elem name="content" style={style ?? {}}>
        {children}
      </Elem>

      <Elem
        name="handle"
        ref={resizeHandler}
        style={handleStyle}
        mod={{ resizing: showResizerLine !== false && isResizing, quickview: type === "quickview" }}
        onMouseDown={handleResize}
        onDoubleClick={() => onReset?.()}
      />
    </Block>
  );
};
