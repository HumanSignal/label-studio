/**
 * Returns element absolute position relative to document
 */
const getAbsolutePosition = (elem: HTMLElement) => { // crossbrowser version
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

/**
 * @param {HTMLElement} source
 * @param {HTMLElement} target
 */
const positioner = (source: HTMLElement, target: HTMLElement) => {
  const sourcePosition = getAbsolutePosition(source);
  const targetPosition = getAbsolutePosition(target);

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
  };
};

export type ElementAlignment = 'top-center' | 'top-left' | 'top-right' | 'bottom-center' | 'bottom-left' | 'bottom-right'

export const alignElements = (elem: HTMLElement, target: HTMLElement, align: ElementAlignment, padding = 0) => {
  let offsetLeft = 0;
  let offsetTop = 0;

  const pos = positioner(elem, target);
  const resultAlign = align.split('-');

  switch (align) {
    case 'top-center':
      offsetTop = pos.top - padding;
      offsetLeft = pos.horizontalCenter;
      break;
    case 'top-left':
      offsetTop = pos.top - padding;
      offsetLeft = pos.horizontalLeft;
      break;
    case 'top-right':
      offsetTop = pos.top - padding;
      offsetLeft = pos.horizontalRight;
      break;
    case 'bottom-center':
      offsetTop = pos.bottom + padding;
      offsetLeft = pos.horizontalCenter;
      break;
    case 'bottom-left':
      offsetTop = pos.bottom + padding;
      offsetLeft = pos.horizontalLeft;
      break;
    case 'bottom-right':
      offsetTop = pos.bottom + padding;
      offsetLeft = pos.horizontalRight;
      break;
    default:
      break;
  }

  if (offsetTop < window.scrollX) {
    offsetTop = pos.bottom + padding;
    resultAlign[0] = 'bottom';
  } else if (offsetTop + pos.target.height > window.scrollX + window.innerHeight) {
    offsetTop = pos.top - padding;
    resultAlign[0] = 'top';
  }

  if (offsetLeft < 0) {
    offsetLeft = pos.horizontalLeft;
    resultAlign[1] = 'left';
  } else if (offsetLeft + pos.target.width > window.innerWidth) {
    offsetLeft = pos.horizontalRight;
    resultAlign[1] = 'right';
  }

  return { top: offsetTop, left: offsetLeft, pos, align: resultAlign.join('-') as ElementAlignment };
};
