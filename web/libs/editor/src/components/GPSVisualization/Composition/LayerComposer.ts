import type { Layer } from "./Layer";

export interface CompositionResult {
  layers: Layer[];
  positions: Map<Layer, { x: number; y: number }>;
  totalHeight: number;
  totalWidth: number;
}

export class LayerComposer {
  private layers: Map<string, Layer>;

  constructor(layers?: Map<string, Layer>) {
    this.layers = layers || new Map();
  }

  /**
   * Apply padding to a composition
   * @param composition - The composition to pad
   * @param padding - The padding to apply { top, right, bottom, left }
   * @returns A new CompositionResult with padding applied
   */
  pad(
    composition: CompositionResult,
    padding: { top?: number; right?: number; bottom?: number; left?: number },
  ): CompositionResult {
    const { top = 0, right = 0, bottom = 0, left = 0 } = padding;

    // Create a new positions map with adjusted positions
    const positions = new Map<Layer, { x: number; y: number }>();

    for (const layer of composition.layers) {
      const originalPos = composition.positions.get(layer);
      if (!originalPos) continue;

      positions.set(layer, {
        x: originalPos.x + left,
        y: originalPos.y + top,
      });
    }

    // Calculate new total dimensions
    const totalWidth = composition.totalWidth + left + right;
    const totalHeight = composition.totalHeight + top + bottom;

    return {
      layers: composition.layers,
      positions,
      totalWidth,
      totalHeight,
    };
  }

  /**
   * Register a layer with the composer
   */
  registerLayer(name: string, layer: Layer): LayerComposer {
    this.layers.set(name, layer);
    return this;
  }

  /**
   * Register multiple layers at once
   */
  registerLayers(layers: Map<string, Layer>): LayerComposer {
    for (const [name, layer] of layers.entries()) {
      this.registerLayer(name, layer);
    }
    return this;
  }

  /**
   * Draw layers on top of each other (overlapping at the same position)
   * Each layer is positioned at x=0 and y=0
   * @param items - Array of layer names, Layer objects, or CompositionResult objects
   * @returns A CompositionResult
   */
  onTopOfEachOther(items: (string | Layer | CompositionResult)[]): CompositionResult {
    const unsortedLayers: Layer[] = [];
    const positions = new Map<Layer, { x: number; y: number }>();
    let totalHeight = 0;
    let totalWidth = 0;

    for (const item of items) {
      // Handle CompositionResult objects
      if (item && typeof item === "object" && "layers" in item && "positions" in item) {
        const composition = item as CompositionResult;

        for (const layer of composition.layers) {
          if (!layer || !layer.isVisible) continue;

          unsortedLayers.push(layer);
          // Preserve the original position from the composition
          const originalPos = composition.positions.get(layer);
          positions.set(layer, originalPos || { x: 0, y: 0 });

          totalHeight = Math.max(totalHeight, layer.height);
          totalWidth = Math.max(totalWidth, layer.width);
        }
        continue;
      }

      let layer: Layer | undefined;

      if (typeof item === "string") {
        // If an item is a string, get the layer by name
        layer = this.layers.get(item);
      } else {
        // If item is already a Layer object
        layer = item as Layer;
      }

      if (!layer || !layer.isVisible) continue;

      unsortedLayers.push(layer);
      positions.set(layer, { x: 0, y: 0 });

      totalHeight = Math.max(totalHeight, layer.height);
      totalWidth = Math.max(totalWidth, layer.width);
    }

    // Sort layers by z-index (index property) to ensure proper rendering order
    const layers = [...unsortedLayers].sort((a, b) => a.index - b.index);

    return { layers, positions, totalHeight, totalWidth };
  }

  /**
   * Compose multiple compositions vertically
   * @param compositions - Array of CompositionResult objects
   * @returns A CompositionResult
   */
  composeVertically(compositions: CompositionResult[]): CompositionResult {
    const unsortedLayers: Layer[] = [];
    const positions = new Map<Layer, { x: number; y: number }>();
    let totalHeight = 0;
    let totalWidth = 0;

    for (const composition of compositions) {
      for (const layer of composition.layers) {
        const originalPos = composition.positions.get(layer);
        if (!originalPos) continue;

        unsortedLayers.push(layer);
        positions.set(layer, {
          x: originalPos.x,
          y: originalPos.y + totalHeight,
        });
      }

      totalHeight += composition.totalHeight;
      totalWidth = Math.max(totalWidth, composition.totalWidth);
    }

    // Sort layers by z-index (index property) to ensure proper rendering order
    const layers = [...unsortedLayers].sort((a, b) => a.index - b.index);

    return { layers, positions, totalHeight, totalWidth };
  }

  /**
   * Render a composition to a target layer
   * @param composition - The composition result to render
   * @param targetLayer - The target layer to render to
   */
  renderComposition(composition: CompositionResult, targetLayer: Layer): void {
    for (const layer of [...composition.layers]) {
      const position = composition.positions.get(layer);
      if (!position || !layer.isVisible) continue;
      layer.transferTo(targetLayer, position.x, position.y);
    }
  }
}
