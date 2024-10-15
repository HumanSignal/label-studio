/**
 * @param {HTMLElement} source
 * @param {HTMLElement} target
 */
const positioner = (source, target) => {
  const sourcePosition = source.getBoundingClientRect();
  const targetPosition = target.getBoundingClientRect();

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

export const alignElements = (elem, target, align, padding = 0, openUpwardForShortViewport = true) => {
  let offsetLeft = 0;
  let offsetTop = 0;

  const pos = positioner(elem, target);
  const resultAlign = align.split("-");

  switch (align) {
    case "top-center":
      offsetTop = pos.top - padding;
      offsetLeft = pos.horizontalCenter;
      break;
    case "top-left":
      offsetTop = pos.top - padding;
      offsetLeft = pos.horizontalLeft;
      break;
    case "top-right":
      offsetTop = pos.top - padding;
      offsetLeft = pos.horizontalRight;
      break;
    case "top-right-outside":
      offsetTop = pos.source.top;
      offsetLeft = pos.source.left + pos.source.width;
      break;
    case "bottom-center":
      offsetTop = pos.bottom + padding;
      offsetLeft = pos.horizontalCenter;
      break;
    case "bottom-left":
      offsetTop = pos.bottom + padding;
      offsetLeft = pos.horizontalLeft;
      break;
    case "bottom-right":
      offsetTop = pos.bottom + padding;
      offsetLeft = pos.horizontalRight;
      break;
    default:
      break;
  }

  if (offsetTop < window.scrollY) {
    offsetTop = pos.bottom + padding;
    resultAlign[0] = "bottom";
  } else if (openUpwardForShortViewport && offsetTop + pos.target.height > window.scrollY + window.innerHeight) {
    offsetTop = pos.top - padding;
    resultAlign[0] = "top";
  }

  if (offsetLeft < 0) {
    offsetLeft = pos.horizontalLeft;
    resultAlign[1] = "left";
  } else if (offsetLeft + pos.target.width > window.innerWidth) {
    offsetLeft = pos.horizontalRight;
    resultAlign[1] = "right";
  }

  return { top: offsetTop, left: offsetLeft, pos, align: resultAlign.join("-") };
};
