import { RATE_LIMITED_RENDER_FPS } from "../constants";

/**
 * A utility class that provides rate-limited rendering functionality.
 * Handles both debounced zoom operations and rate-limited scrolling.
 */
export class RateLimitedRenderer {
  private lastDrawTime = 0;
  private pendingDraw: {
    getContext: () => any;
    drawFn: (context: any) => void;
  } | null = null;
  private drawScheduled = false;
  private executing = false;
  private _fps = RATE_LIMITED_RENDER_FPS;
  private _minFrameTime: number = 1000 / RATE_LIMITED_RENDER_FPS;
  private currentWindowStart = 0;
  private zoomDebounce: number | null = null;

  /**
   * Creates a new RateLimitedRenderer
   * @param fps The minimum frames per second to maintain (default: 30)
   * @param zoomDebounceMs The debounce time for zoom operations in milliseconds (default: 50)
   */
  constructor(
    fps = RATE_LIMITED_RENDER_FPS,
    private readonly zoomDebounceMs: number = 50,
  ) {
    this.fps = fps;
    this.currentWindowStart = performance.now();
  }

  set fps(fps: number) {
    this._fps = fps;
    this._minFrameTime = 1000 / this._fps;
  }

  get fps() {
    return this._fps;
  }

  get minFrameTime() {
    return this._minFrameTime;
  }

  /**
   * Schedules a draw operation with rate limiting.
   * For zoom operations, applies debouncing.
   * For regular operations, applies rate limiting.
   * @param context The context to draw with
   * @param drawFn The function to call for drawing
   * @param isZoom Whether this is a zoom operation
   */
  scheduleDraw<T>(context: T, drawFn: (context: T) => void, isZoom = false) {
    if (isZoom) {
      // Handle zoom operations with debouncing
      if (this.zoomDebounce) {
        clearTimeout(this.zoomDebounce);
      }
      this.zoomDebounce = setTimeout(() => {
        drawFn(context);
        this.zoomDebounce = null;
      }, this.zoomDebounceMs);
      return;
    }

    // Handle regular operations with rate limiting
    const now = performance.now();

    // Store the function that will get fresh context values
    this.pendingDraw = { getContext: () => context, drawFn };

    // Check if we're in a new time window
    const timeSinceWindowStart = now - this.currentWindowStart;

    if (timeSinceWindowStart >= this.minFrameTime) {
      // Advance the window before drawing so reentrant scheduleDraw calls during
      // executeDraw() defer via setTimeout instead of recursing synchronously.
      this.currentWindowStart = now;
      if (!this.executing) {
        this.executeDraw();
      }
      this.lastDrawTime = now;
    } else if (!this.drawScheduled) {
      // Schedule the draw for the start of the next time window
      this.drawScheduled = true;
      const timeUntilNextWindow = this.minFrameTime - timeSinceWindowStart;

      setTimeout(() => {
        if (this.pendingDraw) {
          requestAnimationFrame(() => {
            this.executeDraw();
            this.lastDrawTime = performance.now();
            this.currentWindowStart = this.lastDrawTime;
          });
        }
      }, timeUntilNextWindow);
    }
  }

  private executeDraw() {
    if (!this.pendingDraw || this.executing) return;
    this.executing = true;
    try {
      const { getContext, drawFn } = this.pendingDraw;
      // Get fresh context values at draw time
      const context = getContext();
      drawFn(context);
      this.pendingDraw = null;
      this.drawScheduled = false;
    } finally {
      this.executing = false;
    }
  }

  /**
   * Resets the renderer state
   */
  reset() {
    this.lastDrawTime = 0;
    this.pendingDraw = null;
    this.drawScheduled = false;
    this.executing = false;
    this.currentWindowStart = performance.now();
    if (this.zoomDebounce) {
      clearTimeout(this.zoomDebounce);
      this.zoomDebounce = null;
    }
  }
}
