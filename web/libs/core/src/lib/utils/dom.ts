type BoundingBox = {
  bottom: number;
  height: number;
  left: number;
  right: number;
  top: number;
  width: number;
  x: number;
  y: number;
};

const getBoundingBox = (elem?: HTMLElement) => {
  const template: BoundingBox = {
    bottom: 0,
    height: 0,
    left: 0,
    right: 0,
    top: 0,
    width: 0,
    x: 0,
    y: 0,
  };

  const position = (elem?.getBoundingClientRect?.() ?? {}) as BoundingBox;

  const result = Object.entries(template).reduce<BoundingBox>((res, pair) => {
    const key = pair[0] as keyof BoundingBox;
    const value = pair[1];

    res[key] = position[key] ?? value;
    return res;
  }, {} as BoundingBox);

  return result;
};

/**
 * Returns element absolute position relative to document
 */
export const getAbsolutePosition = (elem: HTMLElement) => {
  // crossbrowser version
  const box = elem.getBoundingClientRect();

  const body = document.body;
  const docEl = document.documentElement;

  const scrollTop = window.pageYOffset || docEl.scrollTop || body.scrollTop;
  const scrollLeft = window.pageXOffset || docEl.scrollLeft || body.scrollLeft;

  const clientTop = docEl.clientTop || body.clientTop || 0;
  const clientLeft = docEl.clientLeft || body.clientLeft || 0;

  const top = box.top + scrollTop - clientTop;
  const left = box.left + scrollLeft - clientLeft;

  const bbox = elem.getBoundingClientRect();

  return {
    width: bbox.width,
    height: bbox.height,
    top: Math.round(top),
    left: Math.round(left),
  };
};

const positioner = (source: HTMLElement, target: HTMLElement) => {
  const sourcePosition = getBoundingBox(source);
  const targetPosition = getBoundingBox(target);

  return {
    source: sourcePosition,
    target: targetPosition,
    get top() {
      return sourcePosition.top - targetPosition.height;
    },
    get bottom() {
      return sourcePosition.top + sourcePosition.height;
    },
    get horizontalCenter() {
      return sourcePosition.left + sourcePosition.width / 2 - targetPosition.width / 2;
    },
    get horizontalLeft() {
      return sourcePosition.left;
    },
    get horizontalRight() {
      return sourcePosition.left + sourcePosition.width - targetPosition.width;
    },
  } as const;
};

export type Align = "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right";

export const alignElements = (
  elem: HTMLElement,
  target: HTMLElement,
  align: Align = "bottom-left",
  padding = 0,
  constrainHeight = false,
  openUpwardForShortViewport = true,
) => {
  let offsetLeft = 0;
  let offsetTop = 0;
  let maxHeight;

  const pos = positioner(elem, target);
  const resultAlign = align.split("-");

  switch (align) {
    case "top-center":
      offsetTop = constrainHeight ? Math.max(pos.top - padding, 0) : pos.top - padding;
      offsetLeft = pos.horizontalCenter;
      maxHeight = pos.source.top - offsetTop;
      break;
    case "top-left":
      offsetTop = constrainHeight ? Math.max(pos.top - padding, 0) : pos.top - padding;
      offsetLeft = pos.horizontalLeft;
      maxHeight = pos.source.top - offsetTop;
      break;
    case "top-right":
      offsetTop = constrainHeight ? Math.max(pos.top - padding, 0) : pos.top - padding;
      offsetLeft = pos.horizontalRight;
      maxHeight = pos.source.top - offsetTop;
      break;
    case "bottom-center":
      offsetTop = pos.bottom + padding;
      offsetLeft = pos.horizontalCenter;
      maxHeight = window.scrollY + window.innerHeight - offsetTop;
      break;
    case "bottom-left":
      offsetTop = pos.bottom + padding;
      offsetLeft = pos.horizontalLeft;
      maxHeight = window.scrollY + window.innerHeight - offsetTop;
      break;
    case "bottom-right":
      offsetTop = pos.bottom + padding;
      offsetLeft = pos.horizontalRight;
      maxHeight = window.scrollY + window.innerHeight - offsetTop;
      break;
    default:
      break;
  }

  if (offsetTop < window.scrollY || !openUpwardForShortViewport) {
    offsetTop = pos.bottom + padding;
    maxHeight = window.scrollY + window.innerHeight - offsetTop;
    resultAlign[0] = "bottom";
  }
  // If the dropdown has more space on the top, then we should align it to the top
  // of the trigger element instead of the bottom.
  else if ((maxHeight ?? 0) < pos.source.top - (constrainHeight ? Math.max(pos.top - padding, 0) : pos.top - padding)) {
    offsetTop = constrainHeight ? Math.max(pos.top - padding, 0) : pos.top - padding;
    maxHeight = pos.source.top - offsetTop;
    resultAlign[0] = "top";
  }

  if (offsetLeft < 0) {
    offsetLeft = pos.horizontalLeft;
    resultAlign[1] = "left";
  } else if (offsetLeft + pos.target.width > window.innerWidth) {
    offsetLeft = pos.horizontalRight;
    resultAlign[1] = "right";
  }

  const { scrollY, scrollX } = window;

  return {
    top: offsetTop + scrollY,
    left: offsetLeft + scrollX,
    pos,
    align: resultAlign.join("-") as Align,
    ...(constrainHeight ? { maxHeight } : {}),
  };
};
