import { nanoid } from 'nanoid';
import { FontWeight } from '../Common/Style';
import { rgba, RgbaColorArray } from '../Common/Color';

export interface TooltipOptions {
  color?: string|RgbaColorArray;
  backgroundColor?: string|RgbaColorArray;
  fontSize?: number;
  fontWeight?: FontWeight;
  paddingInline?: number;
  paddingBlock?: number;
  borderRadius?: number;
}

export class Tooltip {
  id = 'tooltip';
  visible = false;
  color = rgba('#fff');
  fontWeight = '500' as FontWeight;
  backgroundColor = rgba('#000');
  fontSize = 16;
  paddingInline = 8;
  paddingBlock = 4;
  borderRadius = 4;


  constructor(options?: TooltipOptions) {
    this.id = `tooltip-${nanoid()}`;
    this.color = options?.color ? rgba(options.color) : this.color;
    this.backgroundColor = options?.backgroundColor ? rgba(options.backgroundColor) : this.backgroundColor;
    this.paddingInline = options?.paddingInline ?? this.paddingInline;
    this.paddingBlock = options?.paddingBlock ?? this.paddingBlock;
    this.borderRadius = options?.borderRadius ?? this.borderRadius;
    this.fontSize = options?.fontSize ?? this.fontSize;
    this.fontWeight = options?.fontWeight ?? this.fontWeight;
    this.initialize();
  }

  initialize() {
    if (document.getElementById(this.id)) return;
    const span = document.createElement('span');
    const root = document.body;

    span.id = this.id;
    span.style.display = 'none';
    span.style.position = 'absolute';
    this.apply(span);

    root?.appendChild(span);
  }

  update(options: Partial<TooltipOptions>) {
    const span = document.getElementById(this.id);

    this.color = options?.color ? rgba(options.color) : this.color;
    this.backgroundColor = options?.backgroundColor ? rgba(options.backgroundColor) : this.backgroundColor;
    this.paddingInline = options?.paddingInline ?? this.paddingInline;
    this.paddingBlock = options?.paddingBlock ?? this.paddingBlock;
    this.borderRadius = options?.borderRadius ?? this.borderRadius;
    this.fontSize = options?.fontSize ?? this.fontSize;

    if (span) {
      this.apply(span);
    }
  }

  apply(node: HTMLElement) {
    node.style.color = this.color.toString();
    node.style.backgroundColor = this.backgroundColor.toString();
    node.style.paddingInline = `${this.paddingInline}px`;
    node.style.paddingBlock = `${this.paddingBlock}px`;
    node.style.borderRadius = `${this.borderRadius}px`;
    node.style.fontSize = `${this.fontSize}px`;
    node.style.fontWeight = this.fontWeight;
    node.style.zIndex = '9999';
    node.style.pointerEvents = 'none';
  }

  show(x: number, y: number, text?: string, center = true) {
    const span = document.getElementById(this.id);

    this.visible = true;

    if (span && text) {
      span.style.display = 'block';
      if (center) {
        span.style.left = `${x - span.clientWidth / 2}px`;
      } else {
        span.style.left = `${x}px`;
      }
      span.style.top = `${y}px`;
      span.innerText = text;
    }
  }

  hide() {
    if (!this.visible) {
      return;
    }
    const span = document.getElementById(this.id);

    this.visible = false;

    if (span) {
      span.style.display = 'none';
    }
  }

  destroy() {
    document.getElementById(this.id)?.remove();
  }
}
