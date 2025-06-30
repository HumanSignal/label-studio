import type { GPSData, GPSPoint } from "../types";

/**
 * Parameters representing the current state needed for rendering.
 */
export interface RenderContext {
  scrollLeftPx: number;
  width: number;
  zoom: number;
  notifyRenderComplete?: () => void;
  metricRanges?: {
    [K in keyof GPSPoint]?: { min: number; max: number };
  };
}

/**
 * Interface for decoupled rendering strategies.
 * @template Config - The configuration type specific to the renderer implementation.
 */
export interface Renderer<Config = unknown> {
  /**
   * The renderer's configuration.
   */
  config: Config;

  /**
   * Draws the visualization based on the provided context and data.
   * @param context - The current rendering context (scroll, zoom, dimensions, etc.).
   * @param data - The GPSData object containing points to render.
   */
  draw(context: RenderContext, data: GPSData): void;

  /**
   * Updates the renderer's configuration.
   * @param config - The new configuration to apply.
   */
  updateConfig(config: Config): void;

  /**
   * Cleans up resources used by the renderer.
   */
  destroy(): void;

  /**
   * Optional resize handler for renderers
   */
  onResize?(): void;
}
