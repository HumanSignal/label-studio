import type { Interactive } from "./Interactive";
import type { RenderContext } from "../Renderer/Renderer";
import type { GPSData } from "../types";

/**
 * Manages pointer & keyboard events for a set of Interactive objects.
 * - Click/drag: routed to the topmost Interactive whose onPointerDown returns true.
 * - Hover overlays: every Interactive under the pointer gets onPointerHover.
 * - Cursor-icon: first getHoverCursor (in z-order) sets the CSS cursor.
 * - Keyboard: events go to the active (drag) Interactive or, if none, the hovered one.
 */
export class InteractionManager {
  private interactives: Interactive[] = [];
  private active: Interactive | null = null;
  private hovered: Interactive | null = null;
  private prevHovered = new Set<Interactive>();
  private pressedKeys = new Set<string>();
  private lastContext: RenderContext | null = null;
  private lastData: GPSData | null = null;
  private lastPointerEvent: PointerEvent | null = null;
  private onRedrawNeeded?: () => void;

  /**
   * @param canvas - the HTMLCanvasElement on which interactions occur
   * @param onRedrawNeeded - callback to trigger a redraw when hover state changes
   */
  constructor(
    private canvas: HTMLCanvasElement,
    onRedrawNeeded?: () => void,
  ) {
    this.onRedrawNeeded = onRedrawNeeded;
    canvas.addEventListener("pointerdown", (e) => this.handlePointerDown(e));
    canvas.addEventListener("pointermove", (e) => this.handlePointerMove(e));
    canvas.addEventListener("pointerup", (e) => this.handlePointerUp(e));
    canvas.addEventListener("wheel", (e) => this.handleWheel(e), {
      passive: false,
    });

    window.addEventListener("keydown", (e) => this.handleKeyDown(e));
    window.addEventListener("keyup", (e) => this.handleKeyUp(e));
  }

  /**
   * Register a new Interactive. Automatically sorted by descending zIndex.
   */
  add(obj: Interactive) {
    this.interactives.push(obj);
    this.interactives.sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));
  }

  /** Recursively flatten an Interactive and its children */
  private flatten(obj: Interactive): Interactive[] {
    const children = obj.children?.() ?? [];
    // Depth-first: parent first (important for zIndex sorting consistency)
    return [obj, ...children.flatMap((child) => this.flatten(child))];
  }

  /** Current live list of interactives including all descendants */
  private allInteractives(): Interactive[] {
    return this.interactives.flatMap((i) => this.flatten(i));
  }

  public hasActive(): boolean {
    return this.active !== null;
  }

  /** Convert a PointerEvent to canvas-relative coords. */
  private toCanvasCoords(e: PointerEvent) {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  /** Convert a MouseEvent (including WheelEvent) to canvas-relative coords. */
  private toCanvasCoordsFromMouse(e: MouseEvent) {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private handlePointerDown(e: PointerEvent) {
    const { x, y } = this.toCanvasCoords(e);
    for (const obj of this.allInteractives()) {
      if (obj.hitTest(x, y) && obj.onPointerDown(e)) {
        this.active = obj;
        return;
      }
    }
    this.active = null;
  }

  private handlePointerMove(e: PointerEvent) {
    this.lastPointerEvent = e; // Store for cursor re-evaluation
    const { x, y } = this.toCanvasCoords(e);

    // 1) If dragging, route only to active
    if (this.active) {
      if (!this.active.onPointerMove(e, this.pressedKeys)) {
        // drag ended
        this.active = null;
      }
      // fall through to overlays so hover visuals still draw under drag if desired
    }

    // 2) Hover mode: find *all* under-pointer interactives
    const under = this.allInteractives()
      .filter((o) => o.hitTest(x, y))
      .sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));

    // 3) Enter/exit notifications
    const entering = under.filter((o) => !this.prevHovered.has(o));
    const exiting = [...this.prevHovered].filter((o) => !under.includes(o));
    exiting.forEach((o) => o.onHoverChange?.(false));
    entering.forEach((o) => o.onHoverChange?.(true));
    this.prevHovered = new Set(under);

    // Trigger redraw if hover state changed
    if (entering.length > 0 || exiting.length > 0) {
      this.onRedrawNeeded?.();
    }

    // 4) Draw overlays on everyone under-pointer
    under.forEach((o) => o.onPointerHover?.(e, this.pressedKeys));

    // 5) Determine CSS cursor from first getHoverCursor non-null
    let cursor: string | null = null;
    for (const obj of under) {
      const c = obj.getHoverCursor?.(e, this.pressedKeys);
      if (c) {
        cursor = c;
        break;
      }
    }
    this.canvas.style.cursor = cursor ?? "default";

    // 6) Finally, re-render all overlays
    if (this.lastContext && this.lastData) {
      this.renderOverlays(this.lastContext, this.lastData);
    }
  }

  private handlePointerUp(e: PointerEvent) {
    if (this.active) {
      this.active.onPointerUp(e);
      this.active = null;
    }
    // No need to refresh overlays - they're drawn in main draw cycle
  }

  private handleWheel(e: WheelEvent) {
    const { x, y } = this.toCanvasCoordsFromMouse(e);

    // Find interactives under the pointer, sorted by zIndex
    const under = this.allInteractives()
      .filter((o) => o.hitTest(x, y))
      .sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));

    // Let the first interactive that handles wheel events consume it
    for (const obj of under) {
      if (obj.onWheel?.(e)) {
        e.preventDefault();
        return;
      }
    }
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (!this.pressedKeys.has(e.key)) {
      this.pressedKeys.add(e.key);
      const target = this.active ?? this.hovered;
      if (target?.onKeyDown?.(e)) {
        e.preventDefault();
      }
      // Re-evaluate cursor since key state might affect it
      this.updateCursorForKeyChange();
      // No need to refresh overlays - they're drawn in main draw cycle
    }
  }

  private handleKeyUp(e: KeyboardEvent) {
    if (this.pressedKeys.delete(e.key)) {
      const target = this.active ?? this.hovered;
      if (target?.onKeyUp?.(e)) {
        e.preventDefault();
      }
      // Re-evaluate cursor since key state might affect it
      this.updateCursorForKeyChange();
    }
  }

  /**
   * Re-evaluate cursor when key state changes
   */
  private updateCursorForKeyChange() {
    // Only re-evaluate if we have a previous pointer event and hovered objects
    if (!this.lastPointerEvent || this.prevHovered.size === 0) return;

    // Re-evaluate cursor for all currently hovered objects
    let cursor: string | null = null;
    for (const obj of this.prevHovered) {
      const c = obj.getHoverCursor?.(this.lastPointerEvent, this.pressedKeys);
      if (c) {
        cursor = c;
        break;
      }
    }
    this.canvas.style.cursor = cursor ?? "default";
  }

  /**
   * Invoke renderInteractionOverlay on all interactives so they
   * can draw their hover/drag highlights or icons based on their internal state.
   */
  renderOverlays(context: RenderContext, data: GPSData) {
    this.lastContext = context;
    this.lastData = data;

    // Call renderInteractionOverlay on all objects - they decide internally
    // whether to draw anything based on their hover/active state
    for (const obj of this.allInteractives()) {
      obj.renderInteractionOverlay?.(context, data);
    }
  }
}
