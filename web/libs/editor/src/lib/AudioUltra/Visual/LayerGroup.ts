
import { Layer, RendererOptions } from './Layer';

export class LayerGroup extends Layer {
  layers: Layer[];

  constructor(options: RendererOptions) {
    super(options);
    this.layers = [];
  }

  get isGroup() {
    return true;
  }
  
  get length() {
    return this.layers.length;
  }

  addLayer(options: RendererOptions): Layer {
    const layer = new Layer({
      group: this,
      ...options,
    });

    this.layers.push(layer);

    this.sortLayers();

    return layer;
  }

  removeLayer(layer: Layer) {
    this.layers = this.layers.filter(l => l !== layer);
  }

  remove() {
    this.layers.forEach(layer => {
      layer.remove();
    });
    this.layers = [];
    super.remove();
  }

  clear(): void {
    this.layers.forEach(layer => {
      layer.clear();
    });
    super.clear();
  }

  setSize(width: number, height: number) {
    this.layers.forEach(layer => {
      layer.setSize(width, height);
    });

    super.setSize(width, height);
  }

  sortLayers() {
    this.layers.sort((a, b) =>
      a.index - b.index,
    );
  }
}
