import { useState, useRef, useEffect, type CSSProperties, useCallback } from "react";
import { observer } from "mobx-react";
import styles from "./GridPreview.module.css";
import { cn } from "@humansignal/ui";

const MAX_ZOOM = 20;
const ZOOM_FACTOR = 0.01;

type Task = {
  id: number;
  data: Record<string, string>;
};

type ImagePreviewProps = {
  task: Task;
  field: string;
};

// @todo constrain the position of the image to the container
const ImagePreview = observer(({ task, field }: ImagePreviewProps) => {
  const src = task.data?.[field] ?? "";

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const [imageLoaded, setImageLoaded] = useState(false);
  // visible container size
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  // scaled image size
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  // Zoom and position state
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const [isDragging, setIsDragging] = useState(false);

  const dragParams = useRef({
    dragAnchor: { x: 0, y: 0 },
    startOffset: { x: 0, y: 0 },
  });

  // Reset on task change
  // biome-ignore lint/correctness/useExhaustiveDependencies: those are setStates, not values
  useEffect(() => {
    setScale(1);
    setIsDragging(false);
  }, [task, src]);

  const constrainOffset = useCallback(
    (newOffset: { x: number; y: number }) => {
      const { x, y } = newOffset;
      const { width, height } = imageSize;
      const { width: containerWidth, height: containerHeight } = containerSize;

      // to preserve paddings and make it less weird
      const minX = (containerWidth - width) / 2;
      const minY = (containerHeight - height) / 2;
      // the far edges should be behind container edges
      const maxX = Math.max(width * scale - containerWidth, 0);
      const maxY = Math.max(height * scale - containerHeight, 0);

      return {
        x: Math.min(Math.max(x, -maxX), minX),
        y: Math.min(Math.max(y, -maxY), minY),
      };
    },
    [imageSize, containerSize, scale],
  );

  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    if (containerRef.current) {
      const img = e.currentTarget;
      const containerRect = containerRef.current.getBoundingClientRect();

      setContainerSize({
        width: containerRect.width,
        height: containerRect.height,
      });

      const coverScaleX = containerRect.width / img.naturalWidth;
      const coverScaleY = containerRect.height / img.naturalHeight;
      // image is scaled by html, but we need to know this scale level
      // how much is image zoomed out to fit into container
      const imageScale = Math.min(coverScaleX, coverScaleY);

      const scaledWidth = img.naturalWidth * imageScale;
      const scaledHeight = img.naturalHeight * imageScale;
      // how much should we zoom image in to cover container
      // const coverScale = Math.max(containerRect.width / scaledWidth, containerRect.height / scaledHeight);

      setImageSize({
        width: scaledWidth,
        height: scaledHeight,
      });

      // Center the image initially
      const initialX = (containerRect.width - scaledWidth) / 2;
      const initialY = (containerRect.height - scaledHeight) / 2;

      setOffset({ x: initialX, y: initialY });
      setImageLoaded(true);
    }
  }, []);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!containerRef.current || !imageLoaded) return;

      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      const img = imageRef.current;
      if (!img) return;

      // Calculate cursor position relative to center
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;

      // Zoom calculation
      const newScale =
        e.deltaY < 0
          ? Math.min(scale * (1 + ZOOM_FACTOR), MAX_ZOOM) // Max zoom
          : Math.max(scale * (1 - ZOOM_FACTOR), 1); // Min zoom

      // Calculate zoom translation
      const scaleDelta = newScale / scale;
      // cursor - offset = cursor position relative to image; and that's the value being scaled.
      // cursor position on a screen should stay the same, so we need to calculate new offset
      // by scaling the distance to image edges and subtracting it from cursor position
      const newX = cursorX - (cursorX - offset.x) * scaleDelta;
      const newY = cursorY - (cursorY - offset.y) * scaleDelta;

      setScale(newScale);
      setOffset(constrainOffset({ x: newX, y: newY }));
    },
    [imageLoaded, offset, scale, constrainOffset],
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!containerRef.current || !imageRef.current) return;

      const { x: oldX, y: oldY } = dragParams.current.dragAnchor;
      const { x: offsetX, y: offsetY } = dragParams.current.startOffset;
      const newX = e.clientX - oldX;
      const newY = e.clientY - oldY;

      setOffset(constrainOffset({ x: offsetX + newX, y: offsetY + newY }));
    },
    [constrainOffset],
  );

  const handleMouseUp = useCallback(
    (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      setIsDragging(false);

      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    },
    [handleMouseMove],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!containerRef.current || scale <= 1) return;

      setIsDragging(true);
      dragParams.current.dragAnchor = { x: e.clientX, y: e.clientY };
      dragParams.current.startOffset = { ...offset };

      window.addEventListener("mousemove", handleMouseMove);
      // this event would be fired even if we release the mouse outside the window
      // we catch `click` and use `capture: true` to block the click outside of the modal
      /** @see ModalPopup#onClickOutside() */
      window.addEventListener("click", handleMouseUp, { capture: true, once: true });
    },
    [scale, offset, handleMouseMove, handleMouseUp],
  );

  // Container styles
  const containerStyle: CSSProperties = {
    minHeight: "200px",
    maxHeight: "calc(90vh - 120px)",
    width: "100%",
    position: "relative",
    overflow: "hidden",
    cursor: scale > 1 ? (isDragging ? "grabbing" : "grab") : "default",
    userSelect: "none",
  };

  // Image styles
  const imageStyle: CSSProperties = imageLoaded
    ? {
        maxWidth: "100%",
        maxHeight: "100%",
        transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
        transformOrigin: "0 0",
      }
    : {
        width: "100%",
        height: "100%",
        objectFit: "contain",
      };

  return (
    <div
      ref={containerRef}
      style={containerStyle}
      className={cn(styles.imageContainer, "px-tight")}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
    >
      {src && (
        <img
          ref={imageRef}
          src={src}
          alt="Task Preview"
          loading="lazy"
          style={imageStyle}
          className={styles.image}
          onLoad={handleImageLoad}
        />
      )}
    </div>
  );
});

const ImagePreviewWrapper = observer(({ task, field }: ImagePreviewProps) => {
  if (!task || !field) return null;
  return <ImagePreview task={task} field={field} />;
});

export { ImagePreviewWrapper as ImagePreview };
