import {
  createClickHandler,
  createMouseDownHandler,
  createMouseMoveHandler,
  createMouseUpHandler,
} from "./mouseHandlers";
import type { EventHandlerProps, EventHandlers } from "./types";

export function createEventHandlers(props: EventHandlerProps): EventHandlers {
  // Track if we've already handled selection in mousedown to prevent click from re-selecting
  const handledSelectionInMouseDown = { current: false };

  return {
    handleLayerMouseDown: createMouseDownHandler(props, handledSelectionInMouseDown),
    handleLayerClick: createClickHandler(props, handledSelectionInMouseDown),
    handleLayerMouseMove: createMouseMoveHandler(props, handledSelectionInMouseDown),
    handleLayerMouseUp: createMouseUpHandler(props),
  };
}

// Re-export types and utilities for convenience
export type { EventHandlerProps, EventHandlers } from "./types";
export * from "./utils";
export * from "./pointSelection";
export * from "./drawing";

// Re-export the unified point addition functions
export {
  addPoint,
  addPointFromGhostDrag,
  addBezierPoint,
  addPointAtPosition,
  type AddPointOptions,
} from "./drawing";
