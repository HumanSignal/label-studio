import type { RenderContext, GPSData } from "../Renderer/Renderer";

/**
 * An object that can participate in pointer-based interactions.
 */
export interface Interactive {
  /**
   * Higher zIndex → tested and drawn earlier (i.e. "on top").
   * Defaults to 0 if unspecified.
   */
  zIndex?: number;

  /**
   * Return true if this object fully handles the pointer-down (like stopPropagation).
   * @param e - the original PointerEvent
   */
  onPointerDown(e: PointerEvent): boolean;

  /**
   * Called on every pointer-move, whether dragging (button down) or hovering (no buttons).
   * Return false to signal "I've ended my drag" if called during a drag.
   * @param e - the original PointerEvent
   * @param pressedKeys - the set of currently held-down key names
   */
  onPointerMove(e: PointerEvent, pressedKeys: Set<string>): boolean;

  /**
   * Called on pointer-up when this object is active.
   * @param e - the original PointerEvent
   */
  onPointerUp(e: PointerEvent): boolean;

  /**
   * Called for *every* hover move (no button pressed) on *all* hit-test targets.
   * Use to draw highlights: e.g. grab markers, crosshair lines, tooltips.
   * @param e - the original PointerEvent
   * @param pressedKeys - the set of currently held-down key names
   */
  onPointerHover?(e: PointerEvent, pressedKeys: Set<string>): void;

  /**
   * Notifies only on hover enter (true) or exit (false).
   * @param isHovering - whether the pointer just entered or exited this interactive
   */
  onHoverChange?(isHovering: boolean): void;

  /**
   * Return a CSS cursor string if you want to override the cursor.
   * Called in descending zIndex order; the first non-null wins.
   * @param e - the original PointerEvent
   * @param pressedKeys - the set of currently held-down key names
   */
  getHoverCursor?(e: PointerEvent, pressedKeys: Set<string>): string | null;

  /**
   * Optional keyboard hooks; return true to consume and preventDefault().
   */
  onKeyDown?(e: KeyboardEvent): boolean;
  onKeyUp?(e: KeyboardEvent): boolean;

  /**
   * Optional wheel event hook; return true to consume and preventDefault().
   */
  onWheel?(e: WheelEvent): boolean;

  /**
   * After all of the scene is composited, draw any hover/drag overlays here.
   * @param ctx - the CanvasRenderingContext2D of the visible layer
   * @param context - The current rendering context (scroll, zoom, dimensions, etc.).
   * @param data - The GPSData object containing points to render.
   */
  renderInteractionOverlay?(context: RenderContext, data: GPSData): void;

  /**
   * Basic hit test in canvas coordinates.
   * @param canvasX - pointer x relative to canvas left
   * @param canvasY - pointer y relative to canvas top
   */
  hitTest(canvasX: number, canvasY: number): boolean;

  /**
   * If this interactive manages its own nested interactives, return them here so
   * the InteractionManager can treat the whole tree uniformly (optional).
   */
  children?(): Interactive[];
}
