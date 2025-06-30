import type { GPSData } from "../types";
import type { Renderer, RenderContext } from "./Renderer";

export class CompositeRenderer implements Renderer<any> {
  private renderers: Renderer<any>[];

  constructor(renderers: Renderer<any>[]) {
    this.renderers = renderers;
  }

  public get config(): any {
    // A composite renderer might not have a single config object,
    // or it could merge them. For now, returning an empty object.
    return {};
  }

  public draw(context: RenderContext, data: GPSData): void {
    this.renderers.forEach((renderer) => {
      renderer.draw(context, data);
    });
  }

  public onResize(): void {
    this.renderers.forEach((renderer) => {
      renderer.onResize?.();
    });
  }

  public updateConfig(config: Partial<any>): void {
    // Propagate config updates to children that have the updateConfig method
    this.renderers.forEach((renderer) => {
      if (renderer.updateConfig) {
        renderer.updateConfig(config);
      }
    });
  }

  public destroy(): void {
    this.renderers.forEach((renderer) => {
      renderer.destroy();
    });
  }
}

export const compose = (...renderers: Renderer<any>[]): CompositeRenderer => {
  return new CompositeRenderer(renderers);
};
