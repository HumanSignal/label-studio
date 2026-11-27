export type TooltipPlacement = "below" | "above" | "right";

export interface TooltipPosition {
  top: number;
  left: number;
  placement: TooltipPlacement;
  arrowOffset?: number;
}

export interface RectLike {
  top: number;
  right: number;
  bottom: number;
  height: number;
}

export interface SizeLike {
  width: number;
  height: number;
}

export interface ViewportLike {
  width: number;
  height: number;
}

const VIEWPORT_PADDING = 12;
const TOOLTIP_GAP = 12;
const ARROW_INSET = 12;

/** Positions a right-side tooltip relative to a vertical annotation tab. */
export function computeVerticalRightTooltipPosition(
  buttonRect: RectLike,
  tooltipSize: SizeLike,
  viewport: ViewportLike,
): Pick<TooltipPosition, "top" | "left" | "arrowOffset"> {
  const buttonCenterY = buttonRect.top + buttonRect.height / 2;
  const buttonTop = buttonRect.top;
  const buttonBottom = buttonRect.bottom;
  const { height: tooltipHeight, width: tooltipWidth } = tooltipSize;

  const viewportTop = VIEWPORT_PADDING;
  const viewportBottom = viewport.height - VIEWPORT_PADDING;

  let top = buttonCenterY - tooltipHeight / 2;

  const overflowsBottom = top + tooltipHeight > viewportBottom;
  const overflowsTop = top < viewportTop;

  if (overflowsBottom && !overflowsTop) {
    top = buttonBottom - tooltipHeight;
    top = Math.max(viewportTop, top);
  } else if (overflowsTop) {
    top = buttonTop;
    top = Math.min(top, viewportBottom - tooltipHeight);
    top = Math.max(viewportTop, top);
  } else if (overflowsBottom) {
    top = viewportTop;
  }

  const arrowOffset = clamp(buttonCenterY - top, ARROW_INSET, tooltipHeight - ARROW_INSET);

  const left = Math.min(buttonRect.right + TOOLTIP_GAP, viewport.width - tooltipWidth - VIEWPORT_PADDING);

  return { top, left, arrowOffset };
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.max(min, Math.min(value, max));
}

export const VERTICAL_TOOLTIP_ESTIMATED_SIZE = { width: 250, height: 140 } as const;
