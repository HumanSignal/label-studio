import type { Layer } from "../Composition/Layer";
import type { GPSData } from "../types";
import type { Interactive } from "../Interaction/Interactive";
import type { Renderer, RenderContext } from "./Renderer";

export interface PlayHeadOptions {
  color?: string;
  width?: number;
}

/**
 * An interface for the controller of the PlayHead.
 * This should be implemented by the component that owns the PlayHead (e.g., GPSMetricsWaveform).
 */
export interface PlayHeadController {
  setTime(time: number, centerView?: boolean): void;
  seek(time: number): void;
  setTimeWithSync?(time: number): void;
  clearManualTimeOverride?(): void;
  getCanvasRelativeCoords(e: PointerEvent): { x: number; y: number };
}

export class PlayHead implements Renderer<PlayHeadOptions>, Interactive {
  zIndex = 10;
  private x = 0;
  private isHovered = false;
  private isDragging = false;

  // Cache the last render context to calculate time from mouse position
  // even between render frames.
  private lastContext: RenderContext | null = null;

  public config: Required<PlayHeadOptions>;
  private layer: Layer;

  constructor(
    private controller: PlayHeadController,
    layer: Layer,
    options?: PlayHeadOptions,
  ) {
    this.layer = layer;
    this.config = {
      color: options?.color ?? "red",
      width: options?.width ?? 2,
    };
  }

  // Interactive interface methods
  hitTest(canvasX: number, canvasY: number): boolean {
    const hitboxWidth = Math.max(this.config.width, 10);
    return canvasX >= this.x - hitboxWidth / 2 && canvasX <= this.x + hitboxWidth / 2;
  }

  onPointerDown(e: PointerEvent): boolean {
    const { x } = this.controller.getCanvasRelativeCoords(e);
    if (this.hitTest(x, 0)) {
      this.isDragging = true;
      return true; // Consume the event
    }
    return false;
  }

  onPointerMove(e: PointerEvent, pressedKeys: Set<string>): boolean {
    if (!this.isDragging) return false;
    if (!this.lastContext) return true; // Continue drag even if context is lost

    const { x: mouseX } = this.controller.getCanvasRelativeCoords(e);
    const { scrollLeftPx, width, zoom } = this.lastContext;

    if (zoom === 0 || width === 0) return true;

    const timeAtMouse = scrollLeftPx / zoom + (mouseX / width) * (width / zoom);
    // Use seek to continuously sync with the model during dragging
    this.controller.seek(timeAtMouse);

    return true; // Still dragging
  }

  onPointerUp(e: PointerEvent): boolean {
    if (this.isDragging) {
      this.isDragging = false;
      // No need to seek again since we're already seeking continuously during drag
      // Just clear the manual override to resume normal synchronization
      if (this.controller.clearManualTimeOverride) {
        this.controller.clearManualTimeOverride();
      }
    }
    return true;
  }

  onHoverChange(isHovering: boolean): void {
    this.isHovered = isHovering;
  }

  getHoverCursor(e: PointerEvent, pressedKeys: Set<string>): string | null {
    // Give priority to PanAndZoom when Shift is pressed
    if (pressedKeys.has("Shift")) {
      return null;
    }

    if (this.isDragging) {
      return "grabbing";
    }

    return this.isHovered ? "grab" : null;
  }

  public draw(context: RenderContext, data: GPSData): void {
    this.lastContext = context;

    const { scrollLeftPx, width, zoom } = context;
    const { currentTime } = data;

    const timeStart = scrollLeftPx / zoom;
    const duration = width / zoom;

    if (duration > 0) {
      this.x = ((currentTime - timeStart) / duration) * width;
    } else {
      this.x = 0;
    }

    this.layer.clear();
    this.layer.save();

    // Draw hover area if hovered (before the main line so it's behind)
    if (this.isHovered) {
      const hoverWidth = 10; // 5px on each side
      // Convert color to RGBA with 50% opacity
      const baseColor = this.config.color === "gray" ? "128, 128, 128" : "255, 0, 0"; // gray or red
      this.layer.fillStyle = `rgba(${baseColor}, 0.2)`;
      this.layer.fillRect(this.x - hoverWidth / 2, 0, hoverWidth, this.layer.height);
    }

    // Draw the main playhead line
    this.layer.strokeStyle = this.config.color;
    this.layer.lineWidth = this.config.width;
    this.layer.beginPath();
    this.layer.moveTo(this.x, 0);
    this.layer.lineTo(this.x, this.layer.height);
    this.layer.stroke();

    this.layer.restore();
  }

  public updateConfig(config: Partial<PlayHeadOptions>): void {
    this.config = { ...this.config, ...config };
  }

  public destroy(): void {
    // No-op, events are managed by InteractionManager
  }

  public get isHovering(): boolean {
    return this.isHovered;
  }
}
