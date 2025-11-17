import type { BezierPoint, GhostPoint } from "./types";
import { PointType } from "./types";
import { HIT_RADIUS } from "./constants";
import { snapToPixel, getDistance } from "./eventHandlers/utils";
import { generatePointId } from "./utils";

export interface PointCreationState {
  isCreating: boolean;
  startX: number;
  startY: number;
  currentPointIndex: number | null;
  isBezier: boolean;
  hasCreatedPoint: boolean; // Track if we've created a point in this session
}

export interface PointCreationManagerProps {
  initialPoints: BezierPoint[];
  allowBezier: boolean;
  pixelSnapping?: boolean;
  width?: number;
  height?: number;
  transform?: { zoom: number; offsetX: number; offsetY: number };
  fitScale?: number;
  onPointsChange?: (points: BezierPoint[]) => void;
  onPointAdded?: (point: BezierPoint, index: number) => void;
  onPointEdited?: (point: BezierPoint, index: number) => void;
  canAddMorePoints?: () => boolean;
  skeletonEnabled?: boolean;
  lastAddedPointId?: string | null;
  activePointId?: string | null;
  setLastAddedPointId?: (id: string | null) => void;
  setActivePointId?: (id: string | null) => void;
  setVisibleControlPoints?: (points: Set<number> | ((prev: Set<number>) => Set<number>)) => void;
  setNewPointDragIndex?: (index: number | null) => void;
  setIsDraggingNewBezier?: (dragging: boolean) => void;
  ghostPoint?: GhostPoint | null;
  isShiftKeyHeld?: boolean;
  setGhostPoint?: (point: GhostPoint | null) => void;
  selectedPoints?: Set<number>;
}

export class PointCreationManager {
  private state: PointCreationState = {
    isCreating: false,
    startX: 0,
    startY: 0,
    currentPointIndex: null,
    isBezier: false,
    hasCreatedPoint: false,
  };

  private props: PointCreationManagerProps | null = null;

  setProps(props: PointCreationManagerProps): void {
    this.props = props;
  }

  // ===== PROGRAMMATIC POINT CREATION METHODS =====

  startPoint(x: number, y: number): boolean {
    if (!this.props || this.state.isCreating) {
      return false;
    }

    // Don't allow drawing when transformer is active (two or more points are selected)
    if (this.props.selectedPoints && this.props.selectedPoints.size > 1) {
      return false;
    }

    // Check if we can add more points
    if (this.props.canAddMorePoints && !this.props.canAddMorePoints()) {
      return false;
    }

    // Snap to pixel grid if enabled
    const snappedCoords = snapToPixel({ x, y }, this.props.pixelSnapping);

    // Check if we're within canvas bounds (only if bounds checking is enabled)
    if (this.props.width && this.props.height) {
      if (
        snappedCoords.x < 0 ||
        snappedCoords.x > this.props.width ||
        snappedCoords.y < 0 ||
        snappedCoords.y > this.props.height
      ) {
        return false;
      }
    }

    // Check if hovering over an existing point - if so, don't create a new point
    if (this.props.initialPoints.length > 0 && this.props.transform && this.props.fitScale !== undefined) {
      const scale = this.props.transform.zoom * this.props.fitScale;
      const hitRadius = HIT_RADIUS.SELECTION / scale;

      for (const point of this.props.initialPoints) {
        const distance = getDistance(snappedCoords, point);
        if (distance <= hitRadius) {
          // Hovering over an existing point - don't create a new one
          return false;
        }
      }
    }

    // Initialize state
    this.state = {
      isCreating: true,
      startX: snappedCoords.x,
      startY: snappedCoords.y,
      currentPointIndex: null,
      isBezier: false,
      hasCreatedPoint: false,
    };

    return true;
  }

  updatePoint(x: number, y: number): boolean {
    if (!this.props || !this.state.isCreating) {
      return false;
    }

    // Don't allow drawing when transformer is active (two or more points are selected)
    if (this.props.selectedPoints && this.props.selectedPoints.size > 1) {
      return false;
    }

    // Snap to pixel grid if enabled
    const snappedCoords = snapToPixel({ x, y }, this.props.pixelSnapping);

    // Check if we're within canvas bounds (only if bounds checking is enabled)
    if (this.props.width && this.props.height) {
      if (
        snappedCoords.x < 0 ||
        snappedCoords.x > this.props.width ||
        snappedCoords.y < 0 ||
        snappedCoords.y > this.props.height
      ) {
        return false;
      }
    }

    // Calculate drag distance from start point
    const dragDistance = Math.sqrt(
      (snappedCoords.x - this.state.startX) ** 2 + (snappedCoords.y - this.state.startY) ** 2,
    );

    const dragThreshold = 5; // pixels

    // If we haven't created a point yet and we've moved beyond threshold, create a bezier point
    if (
      !this.state.hasCreatedPoint &&
      this.state.currentPointIndex === null &&
      dragDistance > dragThreshold &&
      this.props.allowBezier
    ) {
      // Create bezier point at the start position
      const result = this.createBezierPoint(this.state.startX, this.state.startY);
      if (result !== null) {
        this.state.currentPointIndex = result;
        this.state.isBezier = true;
        this.state.hasCreatedPoint = true;
      }
    }

    // If we have a bezier point, update its control points
    if (this.state.currentPointIndex !== null && this.state.isBezier) {
      this.updateBezierControlPoints(snappedCoords.x, snappedCoords.y);
    }

    return true;
  }

  commitPoint(x: number, y: number): boolean {
    if (!this.props || !this.state.isCreating) {
      return false;
    }

    // Don't allow drawing when transformer is active (two or more points are selected)
    if (this.props.selectedPoints && this.props.selectedPoints.size > 1) {
      return false;
    }

    // Check if Shift is held and we have a ghost point
    let finalX = x;
    let finalY = y;
    let insertBetween = false;
    let prevPointId: string | undefined;
    let nextPointId: string | undefined;

    if (this.props.isShiftKeyHeld && this.props.ghostPoint) {
      // Use ghost point coordinates instead of provided coordinates
      finalX = this.props.ghostPoint.x;
      finalY = this.props.ghostPoint.y;
      insertBetween = true;
      prevPointId = this.props.ghostPoint.prevPointId;
      nextPointId = this.props.ghostPoint.nextPointId;
    }

    // Snap to pixel grid if enabled
    const snappedCoords = snapToPixel({ x: finalX, y: finalY }, this.props.pixelSnapping);

    // Check if we're within canvas bounds (only if bounds checking is enabled)
    if (this.props.width && this.props.height) {
      if (
        snappedCoords.x < 0 ||
        snappedCoords.x > this.props.width ||
        snappedCoords.y < 0 ||
        snappedCoords.y > this.props.height
      ) {
        return false;
      }
    }

    // If we need to insert between points (shift-click on segment)
    if (insertBetween && prevPointId && nextPointId) {
      // Cancel the current creation state
      this.state = {
        isCreating: false,
        startX: 0,
        startY: 0,
        currentPointIndex: null,
        isBezier: false,
        hasCreatedPoint: false,
      };

      // Clear dragging state
      if (this.props.setNewPointDragIndex) {
        this.props.setNewPointDragIndex(null);
      }
      if (this.props.setIsDraggingNewBezier) {
        this.props.setIsDraggingNewBezier(false);
      }

      // Insert the point between the two points
      const result = this.insertPointBetween(
        snappedCoords.x,
        snappedCoords.y,
        prevPointId,
        nextPointId,
        PointType.REGULAR,
      );

      // Clear ghost point immediately after adding a real point
      if (result.success && this.props.setGhostPoint) {
        this.props.setGhostPoint(null);
      }

      return result.success;
    }

    // Normal point creation flow
    // If we haven't created a point yet (no point was created during updatePoint), create a regular point
    if (!this.state.hasCreatedPoint) {
      this.createRegularPoint(snappedCoords.x, snappedCoords.y);
    } else if (this.state.currentPointIndex !== null && this.state.isBezier) {
      // Finalize bezier point with current control points
      this.updateBezierControlPoints(snappedCoords.x, snappedCoords.y);

      // Make control points visible for the newly created bezier point
      if (this.props.setVisibleControlPoints && this.state.currentPointIndex !== null) {
        this.props.setVisibleControlPoints(new Set([this.state.currentPointIndex]));
      }
    }

    // Reset state
    this.state = {
      isCreating: false,
      startX: 0,
      startY: 0,
      currentPointIndex: null,
      isBezier: false,
      hasCreatedPoint: false,
    };

    // Clear dragging state
    if (this.props.setNewPointDragIndex) {
      this.props.setNewPointDragIndex(null);
    }
    if (this.props.setIsDraggingNewBezier) {
      this.props.setIsDraggingNewBezier(false);
    }

    return true;
  }

  // ===== DIRECT POINT CREATION METHODS =====

  /**
   * Create a regular point at the specified position
   */
  createRegularPointAt(x: number, y: number, prevPointId?: string): boolean {
    if (!this.props) return false;

    // Check if we can add more points
    if (this.props.canAddMorePoints && !this.props.canAddMorePoints()) {
      return false;
    }

    // Snap to pixel grid if enabled
    const snappedCoords = snapToPixel({ x, y }, this.props.pixelSnapping);

    // Check if we're within canvas bounds (only if bounds checking is enabled)
    if (this.props.width && this.props.height) {
      if (
        snappedCoords.x < 0 ||
        snappedCoords.x > this.props.width ||
        snappedCoords.y < 0 ||
        snappedCoords.y > this.props.height
      ) {
        return false;
      }
    }

    const result = this.createRegularPoint(snappedCoords.x, snappedCoords.y, prevPointId);
    return result !== null;
  }

  /**
   * Create a bezier point at the specified position with custom control points
   */
  createBezierPointAt(
    x: number,
    y: number,
    controlPoint1?: { x: number; y: number },
    controlPoint2?: { x: number; y: number },
    prevPointId?: string,
    isDisconnected = false,
  ): boolean {
    if (!this.props || !this.props.allowBezier) return false;

    // Check if we can add more points
    if (this.props.canAddMorePoints && !this.props.canAddMorePoints()) {
      return false;
    }

    // Snap to pixel grid if enabled
    const snappedCoords = snapToPixel({ x, y }, this.props.pixelSnapping);

    // Check if we're within canvas bounds (only if bounds checking is enabled)
    if (this.props.width && this.props.height) {
      if (
        snappedCoords.x < 0 ||
        snappedCoords.x > this.props.width ||
        snappedCoords.y < 0 ||
        snappedCoords.y > this.props.height
      ) {
        return false;
      }
    }

    const result = this.createBezierPointWithControls(
      snappedCoords.x,
      snappedCoords.y,
      controlPoint1,
      controlPoint2,
      prevPointId,
      isDisconnected,
    );
    return result !== null;
  }

  /**
   * Insert a point between two existing points
   */
  insertPointBetween(
    x: number,
    y: number,
    prevPointId: string,
    nextPointId: string,
    type: PointType = PointType.REGULAR,
    controlPoint1?: { x: number; y: number },
    controlPoint2?: { x: number; y: number },
  ): { success: boolean; newPointIndex?: number } {
    if (!this.props) return { success: false };

    // Check if we can add more points
    if (this.props.canAddMorePoints && !this.props.canAddMorePoints()) {
      return { success: false };
    }

    // Snap to pixel grid if enabled
    const snappedCoords = snapToPixel({ x, y }, this.props.pixelSnapping);

    // Check if we're within canvas bounds (only if bounds checking is enabled)
    if (this.props.width && this.props.height) {
      if (
        snappedCoords.x < 0 ||
        snappedCoords.x > this.props.width ||
        snappedCoords.y < 0 ||
        snappedCoords.y > this.props.height
      ) {
        return { success: false };
      }
    }

    // Check if bezier is allowed
    if (type === PointType.BEZIER && !this.props.allowBezier) {
      return { success: false };
    }

    return this.insertPointBetweenUtil(
      snappedCoords.x,
      snappedCoords.y,
      prevPointId,
      nextPointId,
      type,
      controlPoint1,
      controlPoint2,
    );
  }

  /**
   * Create a point from ghost point drag
   */
  createPointFromGhostDrag(ghostPoint: { x: number; y: number; segmentIndex: number }, dragDistance: number): boolean {
    if (!this.props) return false;

    // Check if we can add more points
    if (this.props.canAddMorePoints && !this.props.canAddMorePoints()) {
      return false;
    }

    // Get the points that form the segment
    const segmentIndex = ghostPoint.segmentIndex;
    const nextPoint = this.props.initialPoints[segmentIndex];
    const prevPoint = segmentIndex > 0 ? this.props.initialPoints[segmentIndex - 1] : null;

    if (!nextPoint || !prevPoint) {
      return false;
    }

    // Create a bezier point with control points based on drag distance
    const controlPoint1 = {
      x: ghostPoint.x - dragDistance * 0.5,
      y: ghostPoint.y - dragDistance * 0.5,
    };
    const controlPoint2 = {
      x: ghostPoint.x + dragDistance * 0.5,
      y: ghostPoint.y + dragDistance * 0.5,
    };

    const result = this.insertPointBetween(
      ghostPoint.x,
      ghostPoint.y,
      prevPoint.id,
      nextPoint.id,
      PointType.BEZIER,
      controlPoint1,
      controlPoint2,
    );

    return result.success;
  }

  // ===== PRIVATE HELPER METHODS =====

  private createRegularPoint(x: number, y: number, prevPointId?: string): number | null {
    if (!this.props) return null;

    // Determine the active point ID to connect from
    let finalPrevPointId = prevPointId;

    if (!finalPrevPointId) {
      if (this.props.skeletonEnabled && this.props.activePointId) {
        // In skeleton mode: always connect to the active point
        finalPrevPointId = this.props.activePointId;
      } else if (this.props.skeletonEnabled && this.props.lastAddedPointId) {
        // Fallback to lastAddedPointId for backward compatibility
        finalPrevPointId = this.props.lastAddedPointId;
      } else if (this.props.initialPoints.length > 0) {
        // Normal mode: use last point in array
        finalPrevPointId = this.props.initialPoints[this.props.initialPoints.length - 1].id;
      }
    }

    // Create the new point
    const newPoint = {
      x,
      y,
      id: generatePointId(),
      prevPointId: finalPrevPointId,
      isBezier: false,
    };

    // Add to points array
    const newIndex = this.props.initialPoints.length;
    const newPoints = [...this.props.initialPoints, newPoint];

    // Call callbacks
    this.props.onPointAdded?.(newPoint, newIndex);

    // Set this as the last added point
    this.props.setLastAddedPointId?.(newPoint.id);

    // Note: We don't need to select the point since we're using activePointId for onFinish logic

    // Active point management - always set the new point as active
    // This ensures onFinish logic works correctly (new point becomes active immediately)
    this.props.setActivePointId?.(newPoint.id);

    this.props.onPointsChange?.(newPoints);

    return newIndex;
  }

  private createBezierPoint(x: number, y: number): number | null {
    if (!this.props || !this.props.allowBezier) return null;

    // Determine the active point ID to connect from
    let prevPointId: string | undefined;

    if (this.props.skeletonEnabled && this.props.activePointId) {
      // In skeleton mode: always connect to the active point
      prevPointId = this.props.activePointId;
    } else if (this.props.skeletonEnabled && this.props.lastAddedPointId) {
      // Fallback to lastAddedPointId for backward compatibility
      prevPointId = this.props.lastAddedPointId;
    } else if (this.props.initialPoints.length > 0) {
      // Normal mode: use last point in array
      prevPointId = this.props.initialPoints[this.props.initialPoints.length - 1].id;
    }

    // Create initial control points
    const controlPoint1 = { x: x - 20, y: y - 20 };
    const controlPoint2 = { x: x + 20, y: y + 20 };

    // Snap control points to pixel grid if enabled
    const snappedControlPoint1 = snapToPixel(controlPoint1, this.props.pixelSnapping);
    const snappedControlPoint2 = snapToPixel(controlPoint2, this.props.pixelSnapping);

    // Create the new bezier point
    const newPoint = {
      x,
      y,
      id: generatePointId(),
      prevPointId,
      isBezier: true,
      controlPoint1: snappedControlPoint1,
      controlPoint2: snappedControlPoint2,
      disconnected: false,
    };

    // Add to points array
    const newIndex = this.props.initialPoints.length;
    const newPoints = [...this.props.initialPoints, newPoint];

    // Call callbacks
    this.props.onPointAdded?.(newPoint, newIndex);

    // Set this as the last added point
    this.props.setLastAddedPointId?.(newPoint.id);

    // Active point management - always set the new point as active
    // This ensures onFinish logic works correctly (new point becomes active immediately)
    this.props.setActivePointId?.(newPoint.id);

    this.props.onPointsChange?.(newPoints);

    // Set dragging state for bezier control point manipulation
    if (this.props.setNewPointDragIndex) {
      this.props.setNewPointDragIndex(newIndex);
    }
    if (this.props.setIsDraggingNewBezier) {
      this.props.setIsDraggingNewBezier(true);
    }

    return newIndex;
  }

  private createBezierPointWithControls(
    x: number,
    y: number,
    controlPoint1?: { x: number; y: number },
    controlPoint2?: { x: number; y: number },
    prevPointId?: string,
    isDisconnected = false,
  ): number | null {
    if (!this.props || !this.props.allowBezier) return null;

    // Determine the active point ID to connect from
    let finalPrevPointId = prevPointId;

    if (!finalPrevPointId) {
      if (this.props.skeletonEnabled && this.props.activePointId) {
        // In skeleton mode: always connect to the active point
        finalPrevPointId = this.props.activePointId;
      } else if (this.props.skeletonEnabled && this.props.lastAddedPointId) {
        // Fallback to lastAddedPointId for backward compatibility
        finalPrevPointId = this.props.lastAddedPointId;
      } else if (this.props.initialPoints.length > 0) {
        // Normal mode: use last point in array
        finalPrevPointId = this.props.initialPoints[this.props.initialPoints.length - 1].id;
      }
    }

    // Create initial control points
    const defaultControlPoint1 = { x: x - 20, y: y - 20 };
    const defaultControlPoint2 = { x: x + 20, y: y + 20 };

    // Use provided control points or defaults
    const finalControlPoint1 = controlPoint1 || defaultControlPoint1;
    const finalControlPoint2 = controlPoint2 || defaultControlPoint2;

    // Snap control points to pixel grid if enabled
    const snappedControlPoint1 = snapToPixel(finalControlPoint1, this.props.pixelSnapping);
    const snappedControlPoint2 = snapToPixel(finalControlPoint2, this.props.pixelSnapping);

    // Create the new bezier point
    const newPoint = {
      x,
      y,
      id: generatePointId(),
      prevPointId: finalPrevPointId,
      isBezier: true,
      controlPoint1: snappedControlPoint1,
      controlPoint2: snappedControlPoint2,
      disconnected: isDisconnected,
    };

    // Add to points array
    const newIndex = this.props.initialPoints.length;
    const newPoints = [...this.props.initialPoints, newPoint];

    // Call callbacks
    this.props.onPointAdded?.(newPoint, newIndex);

    // Set this as the last added point
    this.props.setLastAddedPointId?.(newPoint.id);

    // Note: We don't need to select the point since we're using activePointId for onFinish logic

    // Active point management - always set the new point as active
    // This ensures onFinish logic works correctly (new point becomes active immediately)
    this.props.setActivePointId?.(newPoint.id);

    this.props.onPointsChange?.(newPoints);

    // Make control points visible for the newly created bezier point
    if (this.props.setVisibleControlPoints) {
      this.props.setVisibleControlPoints(new Set([newIndex]));
    }

    return newIndex;
  }

  private insertPointBetweenUtil(
    x: number,
    y: number,
    prevPointId: string,
    nextPointId: string,
    type: PointType = PointType.REGULAR,
    controlPoint1?: { x: number; y: number },
    controlPoint2?: { x: number; y: number },
  ): { success: boolean; newPointIndex?: number } {
    if (!this.props) return { success: false };

    // Create the new point
    const newPointOptions: Partial<BezierPoint> = {};

    if (type === PointType.BEZIER) {
      newPointOptions.isBezier = true;

      // Snap control points to pixel grid if enabled
      const controlPoint1Pos = controlPoint1 || { x: x - 20, y: y - 20 };
      const controlPoint2Pos = controlPoint2 || { x: x + 20, y: y + 20 };

      const snappedControlPoint1 = snapToPixel(controlPoint1Pos, this.props.pixelSnapping);
      const snappedControlPoint2 = snapToPixel(controlPoint2Pos, this.props.pixelSnapping);

      newPointOptions.controlPoint1 = snappedControlPoint1;
      newPointOptions.controlPoint2 = snappedControlPoint2;
    }

    const newPoint = {
      x,
      y,
      id: generatePointId(),
      prevPointId,
      ...newPointOptions,
    };

    // Use the private helper method to insert the point
    const newPoints = this.insertPointBetweenHelper(this.props.initialPoints, prevPointId, nextPointId, newPoint);

    // Find the index of the newly inserted point
    const newPointIndex = newPoints.findIndex(
      (p: BezierPoint) => p.x === x && p.y === y && p.isBezier === (type === PointType.BEZIER),
    );

    // Call callbacks
    if (newPointIndex !== -1) {
      this.props.onPointAdded?.(newPoint, newPointIndex);
    }
    this.props.onPointsChange?.(newPoints);

    // Set the new point as the active point so the path continues from it
    this.props.setActivePointId?.(newPoint.id);

    // Reset control points visibility
    this.props.setVisibleControlPoints?.(new Set());

    return { success: true, newPointIndex };
  }

  private insertPointBetweenHelper(
    points: BezierPoint[],
    prevPointId: string,
    nextPointId: string,
    newPoint: BezierPoint,
  ): BezierPoint[] {
    const newPoints = [...points];

    // Find the index of the next point to insert before it
    const nextPointIndex = newPoints.findIndex((point) => point.id === nextPointId);
    if (nextPointIndex === -1) return points;

    // Set the new point's reference to the previous point
    newPoint.prevPointId = prevPointId;

    // Update the next point's reference to the new point
    newPoints[nextPointIndex] = {
      ...newPoints[nextPointIndex],
      prevPointId: newPoint.id,
    };

    // Insert the new point before the next point
    newPoints.splice(nextPointIndex, 0, newPoint);

    return newPoints;
  }

  private updateBezierControlPoints(x: number, y: number): void {
    if (!this.props || this.state.currentPointIndex === null) return;

    const newPoints = [...this.props.initialPoints];
    const bezierPoint = newPoints[this.state.currentPointIndex];

    if (bezierPoint && bezierPoint.isBezier) {
      // Keep the bezier point at its original position (where the drag started)
      // Only update the control points to follow the cursor

      // Calculate the drag vector from the bezier point to current cursor
      const dragVectorX = x - bezierPoint.x;
      const dragVectorY = y - bezierPoint.y;

      // Calculate the distance from the bezier point to the cursor
      const controlDistance = Math.sqrt(dragVectorX * dragVectorX + dragVectorY * dragVectorY);

      // Normalize the drag vector
      const normalizedDragX = dragVectorX / controlDistance;
      const normalizedDragY = dragVectorY / controlDistance;

      // Create control points with pixel snapping
      const controlPoint1Pos = {
        x: bezierPoint.x + normalizedDragX * controlDistance,
        y: bezierPoint.y + normalizedDragY * controlDistance,
      };
      const controlPoint2Pos = {
        x: bezierPoint.x - normalizedDragX * controlDistance,
        y: bezierPoint.y - normalizedDragY * controlDistance,
      };

      const snappedControlPoint1 = snapToPixel(controlPoint1Pos, this.props.pixelSnapping);
      const snappedControlPoint2 = snapToPixel(controlPoint2Pos, this.props.pixelSnapping);

      // Create a new point object with updated control points
      newPoints[this.state.currentPointIndex] = {
        ...bezierPoint,
        controlPoint1: {
          x: snappedControlPoint1.x,
          y: snappedControlPoint1.y,
        },
        controlPoint2: {
          x: snappedControlPoint2.x,
          y: snappedControlPoint2.y,
        },
      };

      // Update the points
      this.props.onPointsChange?.(newPoints);
      this.props.onPointEdited?.(newPoints[this.state.currentPointIndex], this.state.currentPointIndex);
    }
  }

  isCreating(): boolean {
    return this.state.isCreating;
  }

  reset(): void {
    this.state = {
      isCreating: false,
      startX: 0,
      startY: 0,
      currentPointIndex: null,
      isBezier: false,
      hasCreatedPoint: false,
    };
  }
}
