import type { KonvaEventObject } from "konva/lib/Node";
import type { EventHandlerProps } from "./types";
import { HIT_RADIUS } from "../constants";
import { isPointInHitRadius, stageToImageCoordinates } from "./utils";
import { closePathBetweenFirstAndLast } from "./drawing";
import { VectorSelectionTracker } from "../VectorSelectionTracker";

// Helper function to check if a point click should trigger path closing
export function shouldClosePathOnPointClick(
  pointIndex: number,
  props: EventHandlerProps,
  event: KonvaEventObject<MouseEvent>,
): boolean {
  return (
    (pointIndex === 0 || pointIndex === props.initialPoints.length - 1) &&
    props.allowClose &&
    !props.isPathClosed &&
    !event.evt.shiftKey
  );
}

// Helper function to check if the active point is eligible for path closing
export function isActivePointEligibleForClosing(props: EventHandlerProps): boolean {
  const activePoint =
    props.skeletonEnabled && props.activePointId
      ? props.initialPoints.find((p) => p.id === props.activePointId)
      : props.initialPoints[props.initialPoints.length - 1]; // Fallback to last point

  if (!activePoint) return false;

  const firstPoint = props.initialPoints[0];
  const lastPoint = props.initialPoints[props.initialPoints.length - 1];

  // Only allow closing if the active point is the first or last point
  const isActivePointFirst = activePoint.id === firstPoint.id;
  const isActivePointLast = activePoint.id === lastPoint.id;

  return isActivePointFirst || isActivePointLast;
}

// Helper function to check if cursor is near a closing target
function isNearClosingTarget(cursorPos: { x: number; y: number }, props: EventHandlerProps): boolean {
  if (!props.allowClose || props.isPathClosed) {
    return false;
  }

  // Check if we can close the path based on point count or bezier points
  const canClosePath = () => {
    if (props.initialPoints.length > 2) return true;
    return props.initialPoints.some((point) => point.isBezier);
  };

  if (!canClosePath()) return false;

  // Additional validation: ensure we meet the minimum points requirement
  if (props.minPoints && props.initialPoints.length < props.minPoints) {
    return false;
  }

  const firstPoint = props.initialPoints[0];
  const lastPoint = props.initialPoints[props.initialPoints.length - 1];
  const closeRadius = 15 / (props.transform.zoom * props.fitScale);

  // Get the active point
  const activePoint =
    props.skeletonEnabled && props.activePointId
      ? props.initialPoints.find((p) => p.id === props.activePointId)
      : props.initialPoints[props.initialPoints.length - 1];

  if (!activePoint) return false;

  // Only check if the active point is the first or last point
  const isActivePointFirst = activePoint.id === firstPoint.id;
  const isActivePointLast = activePoint.id === lastPoint.id;

  if (!isActivePointFirst && !isActivePointLast) return false;

  const distanceToFirst = Math.sqrt((cursorPos.x - firstPoint.x) ** 2 + (cursorPos.y - firstPoint.y) ** 2);
  const distanceToLast = Math.sqrt((cursorPos.x - lastPoint.x) ** 2 + (cursorPos.y - lastPoint.y) ** 2);

  // If active point is first, check if near last point
  if (isActivePointFirst && distanceToLast <= closeRadius) {
    return true;
  }

  // If active point is last, check if near first point
  if (isActivePointLast && distanceToFirst <= closeRadius) {
    return true;
  }

  return false;
}

export function handlePointSelection(e: KonvaEventObject<MouseEvent>, props: EventHandlerProps): boolean {
  const pos = e.target.getStage()?.getPointerPosition();
  if (!pos) return false;

  const imagePos = stageToImageCoordinates(pos, props.transform, props.fitScale, props.x, props.y);

  const scale = props.transform.zoom * props.fitScale;
  const hitRadius = HIT_RADIUS.SELECTION / scale;

  // Get the tracker instance
  const tracker = VectorSelectionTracker.getInstance();

  // Check if this instance can have selection
  if (!tracker.canInstanceHaveSelection(props.instanceId || "unknown")) {
    return false; // Block selection in this instance
  }

  // Check if we clicked on any point
  for (let i = 0; i < props.initialPoints.length; i++) {
    const point = props.initialPoints[i];

    if (isPointInHitRadius(imagePos, point, hitRadius)) {
      // Check if we're clicking on the first or last point to close the path
      // But only if the active point is also the first or last point
      // But don't close if Shift is held (to allow Shift+click functionality)
      // This should take priority over normal point selection
      if (shouldClosePathOnPointClick(i, props, e) && isActivePointEligibleForClosing(props)) {
        // Determine which point to close to
        const fromPointIndex = i;
        const toPointIndex = i === 0 ? props.initialPoints.length - 1 : 0;

        // Use the bidirectional closePath function
        return closePathBetweenFirstAndLast(props, fromPointIndex, toPointIndex);
      }

      // Disable point selection when near a closing target to prevent interference with path closure
      // This applies to both drawing mode and edit mode
      // This ensures that when a user is about to close a path, clicking on the closing target
      // will trigger path closure instead of point selection
      if (!props.isPathClosed && isNearClosingTarget(imagePos, props)) {
        // Only allow selection if Cmd/Ctrl is held (for multi-selection)
        if (!e.evt.ctrlKey && !e.evt.metaKey) {
          return false; // Don't select the point, let path closure handle it
        }
      }

      // Check if this is the active point (the one user is currently drawing from)
      // Only trigger onFinish if:
      // 1. We're in drawing mode (isDrawingMode is true)
      // 2. No modifiers are pressed (ctrl, meta, shift, alt)
      // 3. Component is selected
      // 4. Point was already selected before this click (to prevent firing when selecting region)
      if (props.activePointId && point.id === props.activePointId && props.selected && !props.transformMode) {
        const hasModifiers = e.evt.ctrlKey || e.evt.metaKey || e.evt.shiftKey || e.evt.altKey;
        const isDrawingMode = props.isDrawingMode === true;
        const wasPointAlreadySelected = props.selectedPoints?.has(i) ?? false;

        // Only fire onFinish if we're in drawing mode AND point was already selected
        // This prevents onFinish from firing when clicking on a point to select the region
        if (!hasModifiers && isDrawingMode && wasPointAlreadySelected) {
          props.onFinish?.(e);
          return true; // Don't proceed with selection
        }
        // If modifiers are held or not in drawing mode or point wasn't selected, skip onFinish
        return false;
      }

      // If Cmd/Ctrl is held, add to selection (multi-selection) - this takes priority
      if (e.evt.ctrlKey || e.evt.metaKey) {
        const currentSelection = props.selectedPoints;
        const newSelection = new Set(currentSelection);
        newSelection.add(i);

        // Use tracker for global selection management
        tracker.selectPoints(props.instanceId || "unknown", newSelection);
        return true;
      }

      // Handle skeleton mode point selection (when not multi-selecting)
      if (props.skeletonEnabled) {
        // Use tracker for global selection management
        tracker.selectPoints(props.instanceId || "unknown", new Set([i]));
        // In skeleton mode, update the active point when selecting a different point
        // This ensures onFinish only fires for the currently selected point
        props.setActivePointId?.(point.id);
        return true;
      }

      // If no Cmd/Ctrl and not skeleton mode, clear multi-selection and select only this point
      // Use tracker for global selection management
      tracker.selectPoints(props.instanceId || "unknown", new Set([i]));
      // Return true to indicate we handled the selection
      return true;
    }
  }

  return false;
}

export function handlePointDeselection(e: KonvaEventObject<MouseEvent>, props: EventHandlerProps): boolean {
  const pos = e.target.getStage()?.getPointerPosition();
  if (!pos) return false;

  const imagePos = stageToImageCoordinates(pos, props.transform, props.fitScale, props.x, props.y);

  const scale = props.transform.zoom * props.fitScale;
  const hitRadius = HIT_RADIUS.SELECTION / scale;

  // Get the tracker instance
  const tracker = VectorSelectionTracker.getInstance();

  // Check if this instance can have selection (deselection is allowed for the active instance)
  if (!tracker.canInstanceHaveSelection(props.instanceId || "unknown")) {
    return false; // Block deselection in this instance
  }

  // Check if we clicked on a selected point to unselect it
  for (let i = 0; i < props.initialPoints.length; i++) {
    if (props.selectedPoints.has(i)) {
      const point = props.initialPoints[i];

      if (isPointInHitRadius(imagePos, point, hitRadius)) {
        const newSet = new Set<number>(props.selectedPoints);
        newSet.delete(i);

        // Use tracker for global selection management
        tracker.selectPoints(props.instanceId || "unknown", newSet);

        // Handle skeleton mode reset
        if (newSet.size <= 1 && props.skeletonEnabled && props.initialPoints.length > 0) {
          const lastPoint = props.initialPoints[props.initialPoints.length - 1];
          props.setLastAddedPointId?.(lastPoint.id);
          props.setActivePointId?.(lastPoint.id);
        }

        return true;
      }
    }
  }

  return false;
}
