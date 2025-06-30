import type { Layer } from "./Layer";

export interface RenderContext {
  x: number; // relative [0,1]
  y: number; // relative [0,1]
  width: number; // relative [0,1]
  height: number; // relative [0,1]
}

export interface LayerMProps {
  isVisible: () => boolean;
  width: () => number;
  height: () => number;
}

function toAbs(ctx: RenderContext, target: Layer) {
  return {
    x: ctx.x * target.width,
    y: ctx.y * target.height,
    width: ctx.width * target.width,
    height: ctx.height * target.height,
  };
}

/**
 * LayerM is a monadic, pure functional wrapper for layer composition.
 * It only stores a render function and a props getter, all state is captured in closures.
 */
export class LayerM {
  private renderFn: (target: Layer, ctx: RenderContext) => void;
  public props: LayerMProps;

  private constructor(renderFn: (target: Layer, ctx: RenderContext) => void, props: LayerMProps) {
    this.renderFn = renderFn;
    this.props = props;
  }

  /**
   * Lift a Layer to a LayerM
   */
  public static lift(layer: Layer): LayerM {
    const props: LayerMProps = {
      isVisible: () => layer.isVisible,
      width: () => (layer.isVisible ? layer.width : 0),
      height: () => (layer.isVisible ? layer.height : 0),
    };
    return new LayerM((target: Layer, ctx: RenderContext) => {
      if (!layer.isVisible) return;
      const abs = toAbs(ctx, target);
      layer.transferTo(target, abs.x, abs.y, abs.width, abs.height);
    }, props);
  }

  /**
   * Monadic bind operation
   */
  public bind(fn: (renderFn: (target: Layer, ctx: RenderContext) => void, props: LayerMProps) => LayerM): LayerM {
    return fn(this.renderFn, this.props);
  }

  /**
   * Monadic map operation
   */
  public map(
    fn: (
      renderFn: (target: Layer, ctx: RenderContext) => void,
      props: LayerMProps,
    ) => [(target: Layer, ctx: RenderContext) => void, LayerMProps],
  ): LayerM {
    const [newRenderFn, newProps] = fn(this.renderFn, this.props);
    return new LayerM(newRenderFn, newProps);
  }

  /**
   * Place this layer on top of another layer
   */
  public onTopOf(other: LayerM): LayerM {
    const props: LayerMProps = {
      isVisible: () => this.props.isVisible() || other.props.isVisible(),
      width: () => Math.max(this.props.width(), other.props.width()),
      height: () => Math.max(this.props.height(), other.props.height()),
    };
    return new LayerM((target: Layer, ctx: RenderContext) => {
      other.renderTo(target, ctx);
      this.renderTo(target, ctx);
    }, props);
  }

  /**
   * Stack this layer above another layer
   */
  public above(other: LayerM): LayerM {
    const props: LayerMProps = {
      isVisible: () => this.props.isVisible() || other.props.isVisible(),
      width: () => Math.max(this.props.width(), other.props.width()),
      height: () => this.props.height() + other.props.height(),
    };
    return new LayerM((target: Layer, ctx: RenderContext) => {
      const visibleLayers = [this, other].filter((l) => l.isVisible());
      const propsArr = visibleLayers.map((l) => l.props);
      const totalHeight = propsArr.reduce((sum, p) => sum + p.height(), 0);
      let yOffset = ctx.y;
      for (let i = 0; i < visibleLayers.length; i++) {
        const hRel = (propsArr[i].height() / totalHeight) * ctx.height;
        visibleLayers[i].renderTo(target, {
          x: ctx.x,
          y: yOffset,
          width: ctx.width,
          height: hRel,
        });
        yOffset += hRel;
      }
    }, props);
  }

  /**
   * Stack this layer below another layer
   */
  public below(other: LayerM): LayerM {
    return other.above(this);
  }

  /**
   * Stack multiple layers vertically, mapping each child's height to a proportional region of ctx.height
   */
  public static vStack(layers: LayerM[]): LayerM {
    if (layers.length === 0) {
      throw new Error("Cannot create empty vStack");
    }
    const propsArr = layers.map((l) => l.props);
    const props: LayerMProps = {
      isVisible: () => propsArr.some((p) => p.isVisible()),
      width: () => Math.max(...propsArr.map((p) => p.width())),
      height: () => propsArr.reduce((sum, p) => sum + p.height(), 0),
    };
    return new LayerM((target: Layer, ctx: RenderContext) => {
      const visibleLayers = layers.filter((l) => l.isVisible());
      const propsArr = visibleLayers.map((l) => l.props);
      const totalHeight = propsArr.reduce((sum, p) => sum + p.height(), 0);
      let yOffset = ctx.y;
      for (let i = 0; i < visibleLayers.length; i++) {
        const hRel = (propsArr[i].height() / totalHeight) * ctx.height;
        visibleLayers[i].renderTo(target, {
          x: ctx.x,
          y: yOffset,
          width: ctx.width,
          height: hRel,
        });
        yOffset += hRel;
      }
    }, props);
  }

  /**
   * Stack multiple layers horizontally, mapping each child's width to a proportional region of ctx.width
   */
  public static hStack(layers: LayerM[]): LayerM {
    if (layers.length === 0) {
      throw new Error("Cannot create empty hStack");
    }
    const propsArr = layers.map((l) => l.props);
    const props: LayerMProps = {
      isVisible: () => propsArr.some((p) => p.isVisible()),
      width: () => propsArr.reduce((sum, p) => sum + p.width(), 0),
      height: () => Math.max(...propsArr.map((p) => p.height())),
    };
    return new LayerM((target: Layer, ctx: RenderContext) => {
      const visibleLayers = layers.filter((l) => l.isVisible());
      const propsArr = visibleLayers.map((l) => l.props);
      const totalWidth = propsArr.reduce((sum, p) => sum + p.width(), 0);
      let xOffset = ctx.x;
      for (let i = 0; i < visibleLayers.length; i++) {
        const wRel = (propsArr[i].width() / totalWidth) * ctx.width;
        visibleLayers[i].renderTo(target, {
          x: xOffset,
          y: ctx.y,
          width: wRel,
          height: ctx.height,
        });
        xOffset += wRel;
      }
    }, props);
  }

  /**
   * Overlay multiple layers
   */
  public static overlay(layers: LayerM[]): LayerM {
    if (layers.length === 0) {
      throw new Error("Cannot create empty overlay");
    }
    const propsArr = layers.map((l) => l.props);
    const props: LayerMProps = {
      isVisible: () => propsArr.some((p) => p.isVisible()),
      width: () => Math.max(...propsArr.map((p) => p.width())),
      height: () => Math.max(...propsArr.map((p) => p.height())),
    };
    return new LayerM((target: Layer, ctx: RenderContext) => {
      for (const layer of layers) {
        layer.renderTo(target, ctx);
      }
    }, props);
  }

  /**
   * Render this layer to a target layer at a given region
   * If ctx is not provided, render to the full target region (0,0,1,1)
   */
  public renderTo(target: Layer, ctx: RenderContext = { x: 0, y: 0, width: 1, height: 1 }): void {
    this.renderFn(target, ctx);
  }

  /**
   * Returns true if the layer or any child is visible (deferred)
   */
  public isVisible(): boolean {
    return this.props.isVisible();
  }

  /**
   * Returns the dimensions of the layer (deferred)
   */
  public getDimensions(): { width: number; height: number } {
    return {
      width: this.props.width(),
      height: this.props.height(),
    };
  }

  /**
   * Conditional composition: if condition is true, use thenLayer, else use elseLayer.
   */
  public static ifM(cond: boolean | (() => boolean), thenLayer: LayerM, elseLayer: LayerM): LayerM {
    const condFn = typeof cond === "function" ? cond : () => cond;
    const props: LayerMProps = {
      isVisible: () => (condFn() ? thenLayer.props.isVisible() : elseLayer.props.isVisible()),
      width: () => (condFn() ? thenLayer.props.width() : elseLayer.props.width()),
      height: () => (condFn() ? thenLayer.props.height() : elseLayer.props.height()),
    };
    return new LayerM((target: Layer, ctx: RenderContext) => {
      if (condFn()) {
        thenLayer.renderTo(target, ctx);
      } else {
        elseLayer.renderTo(target, ctx);
      }
    }, props);
  }

  /**
   * Shift the rendered region by absolute pixel values dx and dy (relative to the target's size),
   * and reduce the available width/height accordingly.
   */
  public shift(dx: number, dy: number): LayerM {
    const props = this.props;
    return new LayerM((target: Layer, ctx: RenderContext) => {
      const pixelRatio = (target as any).pixelRatio || window.devicePixelRatio || 1;
      const relDx = (dx * pixelRatio) / target.width;
      const relDy = (dy * pixelRatio) / target.height;
      this.renderTo(target, {
        x: ctx.x + relDx,
        y: ctx.y + relDy,
        width: ctx.width - relDx,
        height: ctx.height - relDy,
      });
    }, props);
  }
}
