export const BitmaskDrawing = {
  /**
   * Draws initial point on the canvas
   */
  begin({
    ctx,
    x,
    y,
    brushSize = 10,
    eraserMode = false,
  }: {
    ctx: CanvasRenderingContext2D;
    x: number;
    y: number;
    brushSize: number;
    color: string;
    eraserMode: boolean;
  }): {
    x: number;
    y: number;
  } {
    ctx.fillStyle = eraserMode ? "white" : "black";
    ctx.globalCompositeOperation = eraserMode ? "destination-out" : "source-over";

    if (brushSize === 1) {
      ctx.fillRect(x, y, 1, 1);
    } else {
      ctx.beginPath();
      ctx.arc(x + 0.5, y + 0.5, brushSize, 0, Math.PI * 2);
      ctx.fill();
    }
    return { x, y };
  },

  /**
   * Draws a line between last and current position
   */
  draw({
    ctx,
    x,
    y,
    brushSize = 10,
    eraserMode = false,
    lastPos,
  }: {
    ctx: CanvasRenderingContext2D;
    x: number;
    y: number;
    brushSize: number;
    color: string;
    lastPos: { x: number; y: number };
    eraserMode: boolean;
  }): { x: number; y: number } {
    ctx.fillStyle = eraserMode ? "white" : "black";
    ctx.globalCompositeOperation = eraserMode ? "destination-out" : "source-over";

    this.drawLine(ctx, lastPos.x, lastPos.y, x, y, brushSize);
    return { x, y };
  },

  /**
   * Interpolation algorithm to connect separate
   * dots on the canvas
   */
  drawLine(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, size: number) {
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    while (true) {
      if (size === 1) {
        ctx.fillRect(x0, y0, 1, 1);
      } else {
        ctx.beginPath();
        ctx.arc(x0 + 0.5, y0 + 0.5, size, 0, Math.PI * 2);
        ctx.fill();
      }

      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        y0 += sy;
      }
    }
  },
};

/**
 * Checks if the mouse pointer is hovering over a non-transparent pixel in a canvas-based image.
 * This function is used to determine if the user is interacting with a visible part of a bitmask region.
 *
 * @param item - An object containing references to the canvas layer, offscreen canvas, and image
 * @param item.layerRef - Reference to the Konva layer containing the canvas
 * @param item.offscreenCanvasRef - The offscreen canvas element containing the bitmask data
 * @param item.imageRef - Reference to the Konva image element
 * @param item.scale - Scale factor of the image
 * @returns {boolean} True if hovering over a non-transparent pixel, false otherwise
 */
export function isHoveringNonTransparentPixel(item: any): boolean {
  if (!item?.layerRef || !item?.offscreenCanvasRef || !item?.imageRef) {
    return false;
  }

  const stage = item.layerRef.getStage();
  const pointer = stage?.getPointerPosition();
  const ctx = item.offscreenCanvasRef.getContext("2d");

  if (!pointer || !ctx) return false;

  try {
    // Convert global pointer to image-local coordinates
    const transform = item.imageRef.getAbsoluteTransform().copy().invert();
    const localPos = transform.point(pointer);

    const { width, height } = item.offscreenCanvasRef;

    // Convert to pixel coords in the canvas backing the image
    const x = Math.floor(localPos.x / item.parent.stageZoom);
    const y = Math.floor(localPos.y / item.parent.stageZoom);

    if (x < 0 || y < 0 || x >= width || y >= height) return false;

    const alpha = ctx.getImageData(x, y, 1, 1).data[3];
    return alpha > 0;
  } catch (error) {
    console.warn("Error checking pixel transparency:", error);
    return false;
  }
}

/**
 * Calculates the bounding box of non-transparent pixels in a canvas.
 * This function scans the canvas pixel by pixel to find the minimum rectangle
 * that contains all visible (non-transparent) pixels.
 *
 * @param canvas - The HTML canvas element to analyze
 * @param scale - Scale factor to apply to the returned coordinates
 * @returns {Object|null} An object containing the bounds of non-transparent pixels:
 *   - left: Leftmost x-coordinate of visible pixels
 *   - top: Topmost y-coordinate of visible pixels
 *   - right: Rightmost x-coordinate of visible pixels (exclusive)
 *   - bottom: Bottommost y-coordinate of visible pixels (exclusive)
 *   Returns null if no visible pixels are found
 */
export function getCanvasPixelBounds(
  canvas: HTMLCanvasElement,
  scale: number,
): { left: number; top: number; right: number; bottom: number } | null {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const { width, height } = canvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      const alpha = data[index + 3]; // alpha channel
      if (alpha > 0) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  const hasVisiblePixels = maxX >= minX && maxY >= minY;
  if (!hasVisiblePixels) return null;

  // Scale is applied to the points to compensate for
  // the image being different size than the stage
  return {
    left: minX * scale,
    top: minY * scale,
    right: (maxX + 1) * scale,
    bottom: (maxY + 1) * scale,
  };
}
