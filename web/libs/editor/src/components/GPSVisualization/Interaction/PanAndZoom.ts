import type { Interactive } from "./Interactive";
import type { RenderContext } from "../Renderer/Renderer";
import type { GPSData } from "../types";

export interface PanAndZoomCallbacks {
  onPan: (deltaTimeSeconds: number) => void;
  onZoom: (newZoom: number, anchorTime: number) => void;
  onSeek: (time: number) => void;
  getCurrentTime: () => number;
  getCurrentZoom: () => number;
  pxToTime: (px: number) => number;
}

/**
 * Handles background interactions like panning and zooming.
 * Has a low zIndex to act as a background layer.
 */
export class PanAndZoom implements Interactive {
  zIndex = 1;
  private isPanning = false;
  private lastClientX = 0;
  private pointerDownClientX: number | null = null; // To detect clicks

  constructor(private callbacks: PanAndZoomCallbacks) {
    // Wheel events are now handled through the Interactive interface
  }

  hitTest(canvasX: number, canvasY: number): boolean {
    // This interactive should always be active for panning, so it always "hits".
    return true;
  }

  onPointerDown(e: PointerEvent): boolean {
    this.pointerDownClientX = e.clientX; // Record click position
    if (e.shiftKey) {
      this.isPanning = true;
      this.lastClientX = e.clientX;
    }
    return true; // Consume the event to handle click on pointer up
  }

  onPointerMove(e: PointerEvent): boolean {
    if (this.isPanning) {
      const deltaX = e.clientX - this.lastClientX;
      this.lastClientX = e.clientX;

      const currentZoom = this.callbacks.getCurrentZoom();
      if (currentZoom > 0) {
        const deltaTime = -deltaX / currentZoom;
        this.callbacks.onPan(deltaTime);
      }
      return true; // Still panning
    }

    // If not panning, we don't handle move, but don't want to clear the click detection
    return false;
  }

  onPointerUp(e: PointerEvent): boolean {
    if (this.isPanning) {
      this.isPanning = false;
      this.pointerDownClientX = null;
      return true; // Event handled
    }

    if (this.pointerDownClientX !== null) {
      const distance = Math.abs(e.clientX - this.pointerDownClientX);
      this.pointerDownClientX = null;

      if (distance < 5) {
        // Click threshold
        const target = e.target as HTMLElement | null;
        if (!target) return false;

        const rect = target.getBoundingClientRect();
        const canvasX = e.clientX - rect.left;
        const time = this.callbacks.pxToTime(canvasX);
        this.callbacks.onSeek(time);
        return true; // Event handled
      }
    }

    // This case could be a drag without shift key, which we are not handling here.
    return false;
  }

  getHoverCursor(e: PointerEvent, pressedKeys: Set<string>): string | null {
    if (this.isPanning || pressedKeys.has("Shift")) {
      return "grabbing";
    }
    return "grab";
  }

  onWheel(e: WheelEvent): boolean {
    const scrollDelta = -e.deltaY;
    const zoomFactor = 1.1;
    const currentZoom = this.callbacks.getCurrentZoom();
    const newZoom = scrollDelta > 0 ? currentZoom * zoomFactor : currentZoom / zoomFactor;

    // Zoom into the current time, not the mouse position
    const currentTime = this.callbacks.getCurrentTime();
    this.callbacks.onZoom(newZoom, currentTime);
    return true; // Consume the event
  }

  renderInteractionOverlay(context: RenderContext, data: GPSData): void {
    // No-op
  }
}
