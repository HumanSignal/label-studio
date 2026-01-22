/**
 * Constrains a point to stay within the specified bounds
 * @param point - The point to constrain
 * @param bounds - The bounds {width, height}
 * @returns The constrained point
 */
export function constrainPointToBounds(
  point: { x: number; y: number },
  bounds: { width: number; height: number },
): { x: number; y: number } {
  const constrained = {
    x: Math.max(0, Math.min(bounds.width, point.x)),
    y: Math.max(0, Math.min(bounds.height, point.y)),
  };

  return constrained;
}

/**
 * Constrains multiple points to stay within the specified bounds
 * @param points - Array of points to constrain
 * @param bounds - The bounds {width, height}
 * @returns Array of constrained points
 */
export function constrainPointsToBounds(
  points: Array<{ x: number; y: number }>,
  bounds: { width: number; height: number },
): Array<{ x: number; y: number }> {
  return points.map((point) => constrainPointToBounds(point, bounds));
}

/**
 * Checks if a point is within the specified bounds
 * @param point - The point to check
 * @param bounds - The bounds {width, height}
 * @returns True if the point is within bounds
 */
export function isPointWithinBounds(
  point: { x: number; y: number },
  bounds: { width: number; height: number },
): boolean {
  return point.x >= 0 && point.x <= bounds.width && point.y >= 0 && point.y <= bounds.height;
}

/**
 * Calculates the bounding box of a group of points (including control points for Bezier curves)
 * @param points - Array of points (can be simple points or BezierPoint objects)
 * @returns Bounding box {left, top, right, bottom}
 */
export function calculateGroupBoundingBox(
  points: Array<{
    x: number;
    y: number;
    controlPoint1?: { x: number; y: number };
    controlPoint2?: { x: number; y: number };
  }>,
): {
  left: number;
  top: number;
  right: number;
  bottom: number;
} {
  if (points.length === 0) {
    return { left: 0, top: 0, right: 0, bottom: 0 };
  }

  // Start with the first point
  let left = points[0].x;
  let top = points[0].y;
  let right = points[0].x;
  let bottom = points[0].y;

  // Include control points if they exist
  if (points[0].controlPoint1) {
    left = Math.min(left, points[0].controlPoint1.x);
    top = Math.min(top, points[0].controlPoint1.y);
    right = Math.max(right, points[0].controlPoint1.x);
    bottom = Math.max(bottom, points[0].controlPoint1.y);
  }
  if (points[0].controlPoint2) {
    left = Math.min(left, points[0].controlPoint2.x);
    top = Math.min(top, points[0].controlPoint2.y);
    right = Math.max(right, points[0].controlPoint2.x);
    bottom = Math.max(bottom, points[0].controlPoint2.y);
  }

  // Process all other points
  for (let i = 1; i < points.length; i++) {
    const point = points[i];

    // Include main point
    left = Math.min(left, point.x);
    top = Math.min(top, point.y);
    right = Math.max(right, point.x);
    bottom = Math.max(bottom, point.y);

    // Include control points if they exist
    if (point.controlPoint1) {
      left = Math.min(left, point.controlPoint1.x);
      top = Math.min(top, point.controlPoint1.y);
      right = Math.max(right, point.controlPoint1.x);
      bottom = Math.max(bottom, point.controlPoint1.y);
    }
    if (point.controlPoint2) {
      left = Math.min(left, point.controlPoint2.x);
      top = Math.min(top, point.controlPoint2.y);
      right = Math.max(right, point.controlPoint2.x);
      bottom = Math.max(bottom, point.controlPoint2.y);
    }
  }

  return { left, top, right, bottom };
}

/**
 * Constrains anchor points to stay within bounds as a group
 * @param points - Array of points to constrain
 * @param bounds - The bounds {width, height}
 * @returns Array of constrained points
 */
export function constrainAnchorPointsToBounds(
  points: Array<{
    x: number;
    y: number;
    controlPoint1?: { x: number; y: number };
    controlPoint2?: { x: number; y: number };
    [key: string]: any; // Allow additional properties (id, prevPointId, isBezier, etc.)
  }>,
  bounds: { width: number; height: number },
): Array<{
  x: number;
  y: number;
  controlPoint1?: { x: number; y: number };
  controlPoint2?: { x: number; y: number };
  [key: string]: any;
}> {
  if (points.length === 0) return points;

  // Calculate the bounding box of only the anchor points (not control points)
  const anchorPoints = points.map((p) => ({ x: p.x, y: p.y }));
  const anchorBbox = calculateGroupBoundingBox(anchorPoints);

  // Calculate how much we need to move the anchor points to keep them within bounds
  let deltaX = 0;
  let deltaY = 0;

  // Check left edge
  if (anchorBbox.left < 0) {
    deltaX = -anchorBbox.left;
  }
  // Check right edge
  if (anchorBbox.right > bounds.width) {
    deltaX = bounds.width - anchorBbox.right;
  }

  // Check top edge
  if (anchorBbox.top < 0) {
    deltaY = -anchorBbox.top;
  }
  // Check bottom edge
  if (anchorBbox.bottom > bounds.height) {
    deltaY = bounds.height - anchorBbox.bottom;
  }

  // If no constraint needed, return original points
  if (deltaX === 0 && deltaY === 0) {
    return points;
  }

  // Apply the constraint to anchor points and their control points
  // Preserve all properties from the original point (id, prevPointId, isBezier, etc.)
  const constrainedPoints = points.map((point) => {
    // Spread all properties from the original point to preserve skeleton relationships
    const constrainedPoint = {
      ...point,
      x: point.x + deltaX,
      y: point.y + deltaY,
    };

    // Apply the same delta to control points (they move with the anchor point)
    if (point.controlPoint1) {
      constrainedPoint.controlPoint1 = {
        x: point.controlPoint1.x + deltaX,
        y: point.controlPoint1.y + deltaY,
      };
    }
    if (point.controlPoint2) {
      constrainedPoint.controlPoint2 = {
        x: point.controlPoint2.x + deltaX,
        y: point.controlPoint2.y + deltaY,
      };
    }

    return constrainedPoint;
  });

  // Debug logging
  return constrainedPoints;
}

/**
 * Calculates the constrained position for a transformer within image bounds
 * @param transformer - The Konva transformer object
 * @param bounds - The image bounds {x, y, width, height}
 * @param scaleX - Component scale X factor
 * @param scaleY - Component scale Y factor
 * @param transform - Transform object with zoom and offset
 * @param fitScale - Fit scale factor
 * @returns The constrained position {x, y} or null if no constraint needed
 */
export function calculateTransformerConstraints(
  transformer: any,
  bounds: { x: number; y: number; width: number; height: number },
  scaleX = 1,
  scaleY = 1,
  transform: { zoom: number; offsetX: number; offsetY: number } = { zoom: 1, offsetX: 0, offsetY: 0 },
  fitScale = 1,
): { x: number; y: number } | null {
  if (!transformer || !bounds) return null;

  // Get the transformer's current position and size
  const transformerPos = { x: transformer.x(), y: transformer.y() };
  const transformerSize = { width: transformer.width(), height: transformer.height() };

  // Get the transformer's bounding box
  const transformerBox = transformer.getClientRect();

  // Convert transformer coordinates to image coordinates for comparison
  // The transformer is in stage coordinates, but bounds are in image coordinates
  const transformerInImageCoords = {
    x: (transformerBox.x - transform.offsetX) / (transform.zoom * fitScale),
    y: (transformerBox.y - transform.offsetY) / (transform.zoom * fitScale),
    width: transformerBox.width / (transform.zoom * fitScale),
    height: transformerBox.height / (transform.zoom * fitScale),
  };

  // Use the original bounds (no scaling needed)
  const scaledBounds = bounds;

  // Calculate the image bounds in the same coordinate system as the transformer
  const imageBounds = {
    left: scaledBounds.x,
    top: scaledBounds.y,
    right: scaledBounds.x + scaledBounds.width,
    bottom: scaledBounds.y + scaledBounds.height,
  };

  // Calculate constraints using image coordinates
  let constrainedX = transformerPos.x;
  let constrainedY = transformerPos.y;
  let needsConstraint = false;

  // Constrain to left edge
  if (transformerInImageCoords.x < imageBounds.left) {
    // Convert back to stage coordinates
    constrainedX = imageBounds.left * (transform.zoom * fitScale) + transform.offsetX;
    needsConstraint = true;
  }

  // Constrain to right edge
  if (transformerInImageCoords.x + transformerInImageCoords.width > imageBounds.right) {
    // Convert back to stage coordinates
    constrainedX =
      (imageBounds.right - transformerInImageCoords.width) * (transform.zoom * fitScale) + transform.offsetX;
    needsConstraint = true;
  }

  // Constrain to top edge
  if (transformerInImageCoords.y < imageBounds.top) {
    // Convert back to stage coordinates
    constrainedY = imageBounds.top * (transform.zoom * fitScale) + transform.offsetY;
    needsConstraint = true;
  }

  // Constrain to bottom edge
  if (transformerInImageCoords.y + transformerInImageCoords.height > imageBounds.bottom) {
    // Convert back to stage coordinates
    constrainedY =
      (imageBounds.bottom - transformerInImageCoords.height) * (transform.zoom * fitScale) + transform.offsetY;
    needsConstraint = true;
  }

  return needsConstraint ? { x: constrainedX, y: constrainedY } : null;
}

/**
 * Constrains a group of points to stay within bounds as a group (anchor points only)
 * Control points move with their anchor points and are not constrained independently
 * @param points - Array of points to constrain (can be simple points or BezierPoint objects)
 * @param bounds - The bounds {width, height}
 * @returns Array of constrained points
 */
export function constrainGroupToBounds(
  points: Array<{
    x: number;
    y: number;
    controlPoint1?: { x: number; y: number };
    controlPoint2?: { x: number; y: number };
    [key: string]: any; // Allow additional properties (id, prevPointId, isBezier, etc.)
  }>,
  bounds: { width: number; height: number },
): Array<{
  x: number;
  y: number;
  controlPoint1?: { x: number; y: number };
  controlPoint2?: { x: number; y: number };
  [key: string]: any;
}> {
  if (points.length === 0) return points;

  // Only constrain anchor points as a group
  // Control points will move with their anchor points automatically
  return constrainAnchorPointsToBounds(points, bounds);
}
