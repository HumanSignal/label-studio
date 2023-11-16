import { nanoid } from 'nanoid';
import { rgba, RgbaColorArray } from '../Common/Color';
import { Events } from '../Common/Events';
import { getCursorPositionX, getCursorPositionY, getOffsetLeft, getOffsetTop } from '../Common/Utils';
import { Visualizer } from '../Visual/Visualizer';

interface CursorEvents {
  mouseMove: (event: MouseEvent, cursor: Cursor) => void;
}

export enum CursorSymbol {
  auto = 'auto',
  crosshair = 'crosshair',
  default = 'default',
  pointer = 'pointer',
  move = 'move',
  text = 'text',
  wait = 'wait',
  help = 'help',
  progress = 'progress',
  notAllowed = 'not-allowed',
  contextMenu = 'context-menu',
  cell = 'cell',
  verticalText = 'vertical-text',
  alias = 'alias',
  copy = 'copy',
  noDrop = 'no-drop',
  allScroll = 'all-scroll',
  colResize = 'col-resize',
  rowResize = 'row-resize',
  grab = 'grab',
  grabbing = 'grabbing',
  nResize = 'n-resize',
  neResize = 'ne-resize',
  nwResize = 'nw-resize',
  nsResize = 'ns-resize',
  neswResize = 'nesw-resize',
  nwseResize = 'nwse-resize',
  sResize = 's-resize',
  seResize = 'se-resize',
  swResize = 'sw-resize',
  wResize = 'w-resize',
  ewResize = 'ew-resize',
  zoomIn = 'zoom-in',
  zoomOut = 'zoom-out',
} 

export interface CursorOptions {
  x?: number;
  y?: number;
  width?: number;
  color?: string|RgbaColorArray;
}

export class Cursor extends Events<CursorEvents> {
  private visualizer: Visualizer;
  private symbol = CursorSymbol.default;
  private focusId = '';

  id = 'cursor';
  color = rgba('rgba(65, 60, 74, 0.16)');
  x: number;
  y: number;
  offsetX = 0;
  offsetY = 0;
  width = 2;

  constructor(
    options: CursorOptions,
    visualizer: Visualizer,
  ) {
    super();
    this.id = `cursor-${nanoid()}`;
    this.visualizer = visualizer;
    this.color = options?.color ? rgba(options.color) : this.color;
    this.x = options.x ?? 0;
    this.y = options.y ?? 0;
    this.width = options.width ?? this.width;
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

    this.set(this.symbol);
    document.addEventListener('mousemove', this.handleMouseMove);
  }

  apply(node: HTMLElement) {
    node.style.backgroundColor = this.color.toString();
    node.style.width = `${this.width}px`;
    node.style.top = '0px';
    node.style.zIndex = '9998';
    node.style.pointerEvents = 'none';
  }

  show() {
    if (!this.shouldRender) {
      this.hide();
      return;
    }
    const span = document.getElementById(this.id);

    if (span) {
      span.style.height = `${this.visualizer.height}px`;
      span.style.display = 'block';
      span.style.top = `${this.offsetY}px`;
      span.style.left = `${this.x + this.offsetX - span.clientWidth / 2}px`;
    }
  }

  hide() {
    const span = document.getElementById(this.id);

    if (span) {
      span.style.display = 'none';
    }
  }

  destroy() {
    document.getElementById(this.id)?.remove();
    document.removeEventListener('mousemove', this.handleMouseMove);
    super.destroy();
  }

  isOver(x: number, y: number, width: number, height: number) {
    if (this.x > x + width || this.y > y + height || this.x < x || this.y < y) {
      return false;
    }
    return true;
  }

  isFocused(id: string) {
    return this.focusId === id;
  }

  hasFocus() {
    return this.focusId !== '';
  }

  get(): CursorSymbol {
    return this.symbol;
  }

  set(cursor: CursorSymbol, id = '') {
    this.focusId = id || '';
    if (cursor === this.symbol) {
      return;
    }
    this.symbol = cursor;
    this.visualizer.container.style.cursor = this.symbol;

    if (this.hasFocus()) {
      this.visualizer.lockSeek();
    } else {
      this.visualizer.unlockSeek();
    }
  }

  private get shouldRender() {
    return this.inView;
  }

  get inView() {
    const { width, height } = this.visualizer;

    return this.isOver(0, 0, width, height);
  }

  private handleMouseMove = (e: MouseEvent) => {
    const { container } = this.visualizer;

    this.offsetX = getOffsetLeft(container);
    this.offsetY = getOffsetTop(container);
    this.x = getCursorPositionX(e, container);
    this.y = getCursorPositionY(e, container);
    this.invoke('mouseMove', [e, this]);
    this.visualizer.invoke('mouseMove', [e, this]);
  };
}
