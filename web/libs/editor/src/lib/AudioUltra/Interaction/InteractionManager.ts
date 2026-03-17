// biome-ignore-all lint/correctness/noUnusedPrivateClassMembers: AudioUltra; skip unsafe removal
import type { Interactive } from "./Interactive";

export interface InteractionManagerOptions {
  container: HTMLElement;
  pixelRatio?: number;
  getLayerInfo?: (interactive: Interactive) => LayerInfo | null;
}

export interface LayerInfo {
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
}

/**
 * Manages interactions between mouse events and Interactive objects
 */
export class InteractionManager {
  private container: HTMLElement;
  private getLayerInfo?: (interactive: Interactive) => LayerInfo | null;
  private interactiveObjects: Interactive[] = [];
  private hoveredObject: Interactive | null = null;
  private draggedObject: Interactive | null = null;
  private isDestroyed = false;

  constructor({ container, pixelRatio = 1, getLayerInfo }: InteractionManagerOptions) {
    this.container = container;
    this.pixelRatio = pixelRatio;
    this.getLayerInfo = getLayerInfo;
    this.attachEvents();
  }

  /**
   * Register an interactive object
   */
  register(interactive: Interactive): void {
    if (!this.interactiveObjects.includes(interactive)) {
      this.interactiveObjects.push(interactive);
      // Sort by z-index (highest first for proper hit testing)
      this.interactiveObjects.sort((a, b) => {
        const aZ = a.getZIndex?.() ?? 0;
        const bZ = b.getZIndex?.() ?? 0;
        return bZ - aZ;
      });
    }
  }

  /**
   * Unregister an interactive object
   */
  unregister(interactive: Interactive): void {
    const index = this.interactiveObjects.indexOf(interactive);
    if (index !== -1) {
      this.interactiveObjects.splice(index, 1);
    }

    // Clear references if this object was active
    if (this.hoveredObject === interactive) {
      this.hoveredObject = null;
    }
    if (this.draggedObject === interactive) {
      this.draggedObject = null;
    }
  }

  /**
   * Find the interactive object under the given coordinates
   */
  private findInteractiveUnderPoint(x: number, y: number): Interactive | null {
    for (const interactive of this.interactiveObjects) {
      if (interactive.isEnabled?.() !== false) {
        // Get layer-specific coordinates
        const layerCoords = this.getLayerCoordinates(interactive, x, y);
        if (layerCoords && interactive.hitTest(layerCoords.x, layerCoords.y)) {
          return interactive;
        }
      }
    }
    return null;
  }

  /**
   * Transform global coordinates to layer-specific coordinates
   */
  private getLayerCoordinates(
    interactive: Interactive,
    globalX: number,
    globalY: number,
  ): { x: number; y: number } | null {
    if (!this.getLayerInfo) {
      // Fallback to global coordinates if no layer info provider
      return { x: globalX, y: globalY };
    }

    const layerInfo = this.getLayerInfo(interactive);
    if (!layerInfo) {
      return null;
    }

    // Transform global coordinates to layer-relative coordinates
    const layerX = globalX - layerInfo.offsetX;
    const layerY = globalY - layerInfo.offsetY;

    // Check if coordinates are within layer bounds
    if (layerX < 0 || layerX > layerInfo.width || layerY < 0 || layerY > layerInfo.height) {
      return null;
    }

    return { x: layerX, y: layerY };
  }

  /**
   * Get coordinates relative to the container
   */
  private getRelativeCoordinates(event: MouseEvent): { x: number; y: number } {
    const rect = this.container.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  /**
   * Update cursor based on hovered object
   */
  private updateCursor(interactive: Interactive | null): void {
    if (interactive?.getCursor) {
      const cursor = interactive.getCursor();
      this.container.style.cursor = cursor;
    } else {
      // Clear inline cursor to allow parent container (e.g., Visualizer) to control it
      this.container.style.cursor = "";
    }
  }

  private handleMouseMove = (event: MouseEvent): void => {
    if (this.isDestroyed) return;

    const { x, y } = this.getRelativeCoordinates(event);

    // If we're dragging, send move events to the dragged object
    if (this.draggedObject) {
      this.draggedObject.onMouseMove?.(event);
      return;
    }

    const interactive = this.findInteractiveUnderPoint(x, y);

    // Handle hover state changes
    if (interactive !== this.hoveredObject) {
      // Mouse leave previous object
      if (this.hoveredObject) {
        this.hoveredObject.onMouseLeave?.(event);
      }

      // Mouse enter new object
      if (interactive) {
        interactive.onMouseEnter?.(event);
      }

      this.hoveredObject = interactive;
      this.updateCursor(interactive);
    }

    // Send mouse move to currently hovered object
    if (this.hoveredObject) {
      this.hoveredObject.onMouseMove?.(event);
    }
  };

  private handleMouseDown = (event: MouseEvent): void => {
    if (this.isDestroyed) return;

    const { x, y } = this.getRelativeCoordinates(event);
    const interactive = this.findInteractiveUnderPoint(x, y);

    if (interactive) {
      this.draggedObject = interactive;
      interactive.onMouseDown?.(event);
      // Update cursor to reflect dragging state
      this.updateCursor(interactive);
    }
  };

  private handleMouseUp = (event: MouseEvent): void => {
    if (this.isDestroyed) return;

    const { x, y } = this.getRelativeCoordinates(event);
    const interactive = this.findInteractiveUnderPoint(x, y);

    // Send mouse up to dragged object if it exists
    if (this.draggedObject) {
      this.draggedObject.onMouseUp?.(event);
      this.draggedObject = null;
    }

    // Send mouse up to object under cursor
    if (interactive) {
      interactive.onMouseUp?.(event);
    }

    // Update cursor based on current hover state
    this.updateCursor(interactive);
  };

  private handleClick = (event: MouseEvent): void => {
    if (this.isDestroyed) return;

    const { x, y } = this.getRelativeCoordinates(event);
    const interactive = this.findInteractiveUnderPoint(x, y);

    if (interactive) {
      interactive.onClick?.(event);
    }
  };

  private handleDoubleClick = (event: MouseEvent): void => {
    if (this.isDestroyed) return;

    const { x, y } = this.getRelativeCoordinates(event);
    const interactive = this.findInteractiveUnderPoint(x, y);

    if (interactive) {
      interactive.onDoubleClick?.(event);
    }
  };

  private handleMouseLeave = (event: MouseEvent): void => {
    if (this.isDestroyed) return;

    // Clear hover state when mouse leaves container
    if (this.hoveredObject) {
      this.hoveredObject.onMouseLeave?.(event);
      this.hoveredObject = null;
      // Clear inline cursor to allow parent container to control it
      this.container.style.cursor = "";
    }
  };

  private attachEvents(): void {
    this.container.addEventListener("mousemove", this.handleMouseMove);
    this.container.addEventListener("mousedown", this.handleMouseDown);
    this.container.addEventListener("mouseup", this.handleMouseUp);
    this.container.addEventListener("click", this.handleClick);
    this.container.addEventListener("dblclick", this.handleDoubleClick);
    this.container.addEventListener("mouseleave", this.handleMouseLeave);
  }

  private removeEvents(): void {
    this.container.removeEventListener("mousemove", this.handleMouseMove);
    this.container.removeEventListener("mousedown", this.handleMouseDown);
    this.container.removeEventListener("mouseup", this.handleMouseUp);
    this.container.removeEventListener("click", this.handleClick);
    this.container.removeEventListener("dblclick", this.handleDoubleClick);
    this.container.removeEventListener("mouseleave", this.handleMouseLeave);
  }

  /**
   * Update pixel ratio (e.g., on zoom or device change)
   */
  setPixelRatio(pixelRatio: number): void {
    this.pixelRatio = pixelRatio;
  }

  /**
   * Get all registered interactive objects
   */
  getInteractiveObjects(): readonly Interactive[] {
    return this.interactiveObjects;
  }

  /**
   * Clean up the interaction manager
   */
  destroy(): void {
    this.isDestroyed = true;
    this.removeEvents();
    this.interactiveObjects.length = 0;
    this.hoveredObject = null;
    this.draggedObject = null;
  }
}
