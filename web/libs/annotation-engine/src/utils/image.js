import Konva from 'konva';
import { FF_DEV_3793, isFF } from './feature-flags';

export function reverseCoordinates(r1, r2) {
  let r1X = r1.x,
    r1Y = r1.y,
    r2X = r2.x,
    r2Y = r2.y,
    d;

  if (r1X > r2X) {
    d = Math.abs(r1X - r2X);
    r1X = r2X;
    r2X = r1X + d;
  }

  if (r1Y > r2Y) {
    d = Math.abs(r1Y - r2Y);
    r1Y = r2Y;
    r2Y = r1Y + d;
  }
  /**
   * Return the corrected rect
   */
  return { x1: r1X, y1: r1Y, x2: r2X, y2: r2Y };
}

/**
 * Transform RGBA Canvas to Binary Matrix
 * @param {object} canvas
 * @param {object} shape
 */
export function canvasToBinaryMatrix(canvas, shape) {
  const currentLayer = canvas.stageRef.getLayers().filter(layer => layer.attrs.id === shape.id);

  const canv = currentLayer[0].canvas.context;

  const initialArray = canv.getImageData(0, 0, canv.canvas.width, canv.canvas.height);

  const binaryMatrix = [];

  for (
    let i = 0;
    i < canvas.stageRef.bufferCanvas.context.canvas.width * canvas.stageRef.bufferCanvas.context.canvas.height * 4;
    i += 4
  ) {
    const alpha = initialArray.data[i + 0];
    const r = initialArray.data[i + 1];
    const g = initialArray.data[i + 2];
    const b = initialArray.data[i + 3];

    if (alpha > 0 || r > 0 || g > 0 || b > 0) {
      binaryMatrix.push(1);
    } else {
      binaryMatrix.push(0);
    }
  }

  return binaryMatrix;
}

/**
 * Apply transform to rect and calc bounding box around it
 * @param {{ x: number, y: number, width: number, height: number }} rect
 * @param {Konva.Transform} transform
 */
export function getBoundingBoxAfterTransform(rect, transform) {
  const points = [
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.width, y: rect.y },
    { x: rect.x + rect.width, y: rect.y + rect.height },
    { x: rect.x, y: rect.y + rect.height },
  ];
  let minX, minY, maxX, maxY;

  points.forEach(point => {
    const transformed = transform.point(point);

    if (minX === undefined) {
      minX = maxX = transformed.x;
      minY = maxY = transformed.y;
    }
    minX = Math.min(minX, transformed.x);
    minY = Math.min(minY, transformed.y);
    maxX = Math.max(maxX, transformed.x);
    maxY = Math.max(maxY, transformed.y);
  });
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Apply changes to rect (shift to (x, y) and rotate) and calc bounding box around it
 * @param {{ x: number, y: number, width: number, height: number }} rect
 * @param {{ x: number, y: number }} shiftPoint
 * @param {number} radRotation
 */
export function getBoundingBoxAfterChanges(rect, shiftPoint, radRotation = 0) {
  const transform = new Konva.Transform();

  transform.translate(shiftPoint.x, shiftPoint.y);
  transform.rotate(radRotation);
  return getBoundingBoxAfterTransform(rect, transform);
}

/**
 * Crop rect to fit into canvas with given dimensions
 * @param {{ x: number, y: number, width: number, height: number }} rect
 * @param {number} stageWidth
 * @param {number} stageHeight
 */
export function fixRectToFit(rect, stageWidth, stageHeight) {
  let { x, y, width, height } = rect;

  if (x < 0) {
    width += x;
    x = 0;
  } else if (x + width > stageWidth) {
    width = stageWidth - x;
  }

  if (y < 0) {
    height += y;
    y = 0;
  } else if (y + height > stageHeight) {
    height = stageHeight - y;
  }

  return { ...rect, x, y, width, height };
}


export function createDragBoundFunc(item, offset = { x: 0, y: 0 }) {
  const { parent: image } = item;

  return function(pos) {
    return image.fixForZoomWrapper(pos, (pos) => {
      let { x, y } = pos;

      if (isFF(FF_DEV_3793)) {
        x = image.canvasToInternalX(x);
        y = image.canvasToInternalY(y);
      }

      x -= offset.x;
      y -= offset.y;
      const singleRegionDragging = item.selected || !item.inSelection;
      const { top, left, right, bottom } = item.bboxCoords;
      const { top: srTop, left: srLeft, right: srRight, bottom: srBottom } = image?.selectedRegionsBBox || {};
      const bbox = singleRegionDragging
        ? { x, y, width: right - left, height: bottom - top }
        : { x: srLeft - left + x, y: srTop - top + y, width: srRight - srLeft, height: srBottom - srTop };
      const fixed = isFF(FF_DEV_3793)
        ? fixRectToFit(bbox, 100, 100)
        : fixRectToFit(bbox, image.stageWidth, image.stageHeight);

      if (fixed.width !== bbox.width) {
        x += (fixed.width - bbox.width) * (fixed.x !== bbox.x ? -1 : 1);
      }

      if (fixed.height !== bbox.height) {
        y += (fixed.height - bbox.height) * (fixed.y !== bbox.y ? -1 : 1);
      }

      x += offset.x;
      y += offset.y;

      if (!isFF(FF_DEV_3793)) return { x, y };

      return { x: image.internalToCanvasX(x), y: image.internalToCanvasY(y) };
    });
  };
}

/**
 * An image on the stage that is being labelled might be under some CSS transformations,
 * such as being zoomed in, negatively zoomed out, rotated, etc., while also being shown in a
 * viewport on top of the image that might cut parts of it off. For operations like the
 * Magic Wand we need to ultimately get raw pixel data of the image with these transforms applied.
 *
 * Unfortunately it is impossible to get the raw pixel values exhibiting the actual CSS
 * transforms for an Image via JavaScript. Instead, we have to take the original untransformed
 * image and blit it to a Canvas with similar transforms but done through the Canvas API,
 * then getting the transformed raw pixels.
 *
 * In addition, doing all of this on large images can burn performance cycles that can
 * make using tools like the Magic Wand onerous, so we also attempt to only transform & blit
 * the image to exactly the area currently being shown in the viewport, so that we don't
 * do wasted work.
 *
 * We currently support zoomed in, negative zoom, and images being scaled in their viewport.
 * We do not support rotated images currently with this method.
 *
 * @param {Image} img DOM Image object to ultimately get raw, transformed pixel values for.
 * @param {int} naturalWidth The actual size of the Image if it were loaded from disk and shown
 *  its full, real size.
 * @param {int} naturalHeight Same, but for the height.
 * @param imageDisplayedInBrowserWidth {int} When the image is displayed in an actual browser
 *  it can be shrunken or expanded based on its container and available screen real estate; this
 *  is that width.
 * @param imageDisplayedInBrowserHeight {int} Same, but for the height.
 * @param viewportWidth {int} The width in pixels of where the image is actually being displayed;
 *  this is different than the imageDisplayedInBrowserWidth as the size of the image might be
 *  clipped by the edges of the viewport when overflow: hidden is set, like looking through the
 *  edges of a window clipping a view of the world outside.
 * @param viewportHeight {int} Same, but for the height.
 * @param zoomScale {float} 1 if no zooming is happening, >1 if zooming is on, <1 if negatively
 *  zoomed outwards.
 * @param zoomingPositionX {float} If zoomed and panned away from the image origin at the upper
 *  left of the screen, relates negative float coordinates from that corner of the X value,
 *  where these coordinates are relative to the imageDisplayedInBrowserWidth values.
 * @param zoomingPositionY {float} Same, but for the height.
 * @param negativezoom {boolean} True If a template allows negative zooming (i.e. zooming outwards
 *  beyond the actual size of the image), and if the user is currently actually negative zooming,
 *  will be true.
 * @returns {[ImageData, Canvas]} Returns an array with the actual RGBA imagedata of the transformed
 *  image, as well as a Canvas with the transformed image drawn on it.
 */
export function getTransformedImageData(img,
  naturalWidth, naturalHeight,
  imageDisplayedInBrowserWidth, imageDisplayedInBrowserHeight,
  viewportWidth, viewportHeight,
  zoomScale,
  zoomingPositionX,
  zoomingPositionY,
  negativezoom) {

  // If negative zoom is on, the image as displayed in the browser could actually be
  // _smaller_ than the viewport. Get the minimum size between these when creating
  // our ultimate canvas.
  let canvasWidth, canvasHeight;

  if (negativezoom) {
    canvasWidth = Math.min(viewportWidth, imageDisplayedInBrowserWidth);
    canvasHeight = Math.min(viewportHeight, imageDisplayedInBrowserHeight);
  } else {
    canvasWidth = viewportWidth;
    canvasHeight = viewportHeight;
  }

  const canvas = document.createElement('canvas');

  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  const ctx = canvas.getContext('2d');

  const [viewportNaturalX, viewportNaturalY] = getActualZoomingPosition(
    naturalWidth, naturalHeight,
    imageDisplayedInBrowserWidth, imageDisplayedInBrowserHeight,
    zoomingPositionX,
    zoomingPositionY);

  // The viewport dimensions are some percentage of the actual size of the image
  // shown in the browser; determine that then calculate the percentage dimension
  // of the viewport in natural coordinate space. If we are negative zooming then
  // the calculations are slightly different.
  let viewportNaturalWidth, viewportNaturalHeight;

  if (negativezoom) {
    viewportNaturalWidth = naturalWidth;
    viewportNaturalHeight = naturalHeight;
  } else {
    viewportNaturalWidth = Math.ceil((viewportWidth / imageDisplayedInBrowserWidth) * naturalWidth);
    viewportNaturalHeight = Math.ceil((viewportHeight / imageDisplayedInBrowserHeight) * naturalHeight);
  }

  // Only draw the part of the image under transformations to the viewport that we will actually
  // use, so we can then efficiently get its pixel data for pixel-level tools.

  // Source dimensions.
  const sx = viewportNaturalX,
    sy = viewportNaturalY,
    sWidth = viewportNaturalWidth,
    sHeight = viewportNaturalHeight;
  // Destination dimensions.
  const dx = 0,
    dy = 0,
    dWidth = canvasWidth,
    dHeight = canvasHeight;

  ctx.drawImage(img, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);

  // Now grab the transformed pixels from the canvas for the values to actual do Magic Wanding on.
  // If an exception is thrown then CORS cross domain headers are probably not configured
  // correctly.
  let transformedData;

  try {
    transformedData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  } catch (err) {
    const msg = 'Please configure CORS cross-domain headers correctly for getting image labeling data';

    alert(msg);
    console.error(msg);
    throw(msg);
  }

  return [transformedData, canvas];
}

/**
 * Given some image that we might be zoomed into, get its x and y values relative to the actual,
 * natural size of the image.
 *
 * @param {int} naturalWidth The actual size of the Image if it were loaded from disk and shown
 *  its full, real size.
 * @param {int} naturalHeight Same, but for the height.
 * @param imageDisplayedInBrowserWidth {int} When the image is displayed in an actual browser
 *  it can be shrunken or expanded based on its container and available screen real estate; this
 *  is that width.
 * @param imageDisplayedInBrowserHeight {int} Same, but for the height.
 * @param zoomingPositionX {float} If zoomed and panned away from the image origin at the upper
 *  left of the screen, relates negative float coordinates from that corner of the X value,
 *  where these coordinates are relative to the imageDisplayedInBrowserWidth values.
 * @param zoomingPositionY {float} Same, but for the height.
 * @returns {[int, int]} X and Y upper left position of where the zoom is relative to the actual,
 *  natural size of the image.
 */
export function getActualZoomingPosition(naturalWidth, naturalHeight,
  imageDisplayedInBrowserWidth, imageDisplayedInBrowserHeight,
  zoomingPositionX,
  zoomingPositionY) {

  // The zoomingPosition is actually relative to whatever size the image is
  // actually being displayed in the browser (which could be scaled down or up),
  // so turn it into a percentage then re-apply it to the full natural size to get the
  // correct upper-left pixel offsets.
  const zoomPercentageX = Math.abs(zoomingPositionX) / imageDisplayedInBrowserWidth;
  const zoomPercentageY = Math.abs(zoomingPositionY) / imageDisplayedInBrowserHeight;
  const viewportNaturalX = Math.floor(zoomPercentageX * naturalWidth);
  const viewportNaturalY = Math.floor(zoomPercentageY * naturalHeight);

  return [viewportNaturalX, viewportNaturalY];
}