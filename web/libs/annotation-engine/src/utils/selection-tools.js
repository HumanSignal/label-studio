import { clamp, isDefined } from './utilities';

export const isTextNode = node => node && node.nodeType === Node.TEXT_NODE;

const isText = text => text && /[\w']/i.test(text);
const isSpace = text => text && /[\s\t]/i.test(text);

const destructSelection = selection => {
  const range = selection.getRangeAt(0);
  const { startOffset, startContainer, endOffset, endContainer } = range;

  const firstSymbol = startContainer.textContent[startOffset];
  const prevSymbol = startContainer.textContent[startOffset - 1];
  const lastSymbol = endContainer.textContent[endOffset - 1];
  const nextSymbol = endContainer.textContent[endOffset];

  return {
    selection,
    range,
    startOffset,
    startContainer,
    endOffset,
    endContainer,
    firstSymbol,
    prevSymbol,
    lastSymbol,
    nextSymbol,
  };
};

const trimSelectionLeft = (selection) => {
  const resultRange = selection.getRangeAt(0);

  selection.removeAllRanges();
  selection.collapse(resultRange.startContainer, resultRange.startOffset);
  let currentRange = selection.getRangeAt(0);

  do {
    selection.collapse(currentRange.endContainer, currentRange.endOffset);
    selection.modify('extend', 'forward', 'character');
    currentRange = selection.getRangeAt(0);
  } while (!isTextNode(currentRange.startContainer) || isSpace(currentRange.startContainer.textContent[currentRange.startOffset]));
  resultRange.setStart(currentRange.startContainer, currentRange.startOffset);
  selection.removeAllRanges();
  selection.addRange(resultRange);
};
const trimSelectionRight = (selection) => {
  const resultRange = selection.getRangeAt(0);

  selection.removeAllRanges();
  selection.collapse(resultRange.endContainer, resultRange.endOffset);
  let currentRange = selection.getRangeAt(0);

  do {
    selection.collapse(currentRange.startContainer, currentRange.startOffset);
    selection.modify('extend', 'backward', 'character');
    currentRange = selection.getRangeAt(0);
  } while (!isTextNode(currentRange.startContainer) || isSpace(currentRange.startContainer.textContent[currentRange.startOffset]));
  resultRange.setEnd(currentRange.endContainer, currentRange.endOffset);
  selection.removeAllRanges();
  selection.addRange(resultRange);
};
const trimSelection = (selection) => {
  trimSelectionLeft(selection);
  trimSelectionRight(selection);
};

/**
 *
 * @param {Selection} selection
 */
const findBoundarySelection = (selection, boundary) => {
  const {
    range: originalRange,
    startOffset,
    startContainer,
    endOffset,
    endContainer,
  } = destructSelection(selection);

  const resultRange = {};
  let currentRange;

  // It's easier to operate the selection when it's collapsed
  selection.collapse(endContainer, endOffset);
  // Looking for maximum displacement
  while (selection.getRangeAt(0).compareBoundaryPoints(Range.START_TO_START, originalRange) === 1) {
    selection.modify('move', 'backward', boundary);
  }
  // Going back to find minimum displacement
  while (selection.getRangeAt(0).compareBoundaryPoints(Range.START_TO_START, originalRange) < 1) {
    currentRange = selection.getRangeAt(0);
    Object.assign(resultRange, {
      startContainer: currentRange.startContainer,
      startOffset: currentRange.startOffset,
    });
    selection.modify('move', 'forward', boundary);
  }

  selection.collapse(startContainer, startOffset);
  while (selection.getRangeAt(0).compareBoundaryPoints(Range.END_TO_END, originalRange) === -1) {
    selection.modify('move', 'forward', boundary);
  }
  while (selection.getRangeAt(0).compareBoundaryPoints(Range.END_TO_END, originalRange) > -1) {
    currentRange = selection.getRangeAt(0);
    Object.assign(resultRange, {
      endContainer: currentRange.endContainer,
      endOffset: currentRange.endOffset,
    });
    selection.modify('move', 'backward', boundary);
  }

  selection.removeAllRanges();
  const range = new Range();

  range.setStart(resultRange.startContainer, resultRange.startOffset);
  range.setEnd(resultRange.endContainer, resultRange.endOffset);
  selection.addRange(range);
  trimSelection(selection);
  return selection;
};

const closestBoundarySelection = (selection, boundary) => {
  const {
    range: originalRange,
    startOffset,
    startContainer,
    endOffset,
    endContainer,
  } = destructSelection(selection);

  const resultRange = {};
  let currentRange;

  // It's easier to operate the selection when it's collapsed
  selection.collapse(startContainer, startOffset);
  selection.modify('move', 'forward', 'character');
  selection.modify('move', 'backward', boundary);
  if (selection.getRangeAt(0).compareBoundaryPoints(Range.START_TO_START, originalRange) === 1) {
    selection.collapse(startContainer, startOffset);
    selection.modify('move', 'backward', boundary);
  }
  currentRange = selection.getRangeAt(0);
  Object.assign(resultRange, {
    startContainer: currentRange.startContainer,
    startOffset: currentRange.startOffset,
  });

  selection.collapse(endContainer, endOffset);
  selection.modify('move', 'backward', 'character');
  selection.modify('move', 'forward', boundary);
  if (selection.getRangeAt(0).compareBoundaryPoints(Range.START_TO_START, originalRange) === -1) {
    selection.collapse(endContainer, endOffset);
    selection.modify('move', 'forward', boundary);
  }
  currentRange = selection.getRangeAt(0);
  Object.assign(resultRange, {
    endContainer: currentRange.endContainer,
    endOffset: currentRange.endOffset,
  });

  selection.removeAllRanges();
  const range = new Range();

  range.setStart(resultRange.startContainer, resultRange.startOffset);
  range.setEnd(resultRange.endContainer, resultRange.endOffset);
  selection.addRange(range);

  return selection;
};

const boundarySelection = (selection, boundary) => {
  const wordBoundary = boundary !== 'symbol';
  const {
    startOffset,
    startContainer,
    endOffset,
    endContainer,
    firstSymbol,
    prevSymbol,
    lastSymbol,
    nextSymbol,
  } = destructSelection(selection);

  if (wordBoundary) {
    if (boundary.endsWith('boundary')) {
      closestBoundarySelection(selection, boundary);
    } else {
      findBoundarySelection(selection, boundary);
    }
  } else {
    if (!isText(firstSymbol) || isText(prevSymbol)) {
      const newRange = selection.getRangeAt(0);

      newRange.setEnd(startContainer, startOffset);
      selection.modify('move', 'backward', boundary);
    }

    if (!isText(lastSymbol) || isText(nextSymbol)) {
      const newRange = selection.getRangeAt(0);

      newRange.setEnd(endContainer, endOffset);
      selection.modify('extend', 'forward', boundary);
    }
  }
};

/**
 * Captures current selection
 * @param {(response: {selectionText: string, range: Range}) => void} callback
 */
export const captureSelection = (
  callback,
  { granularity, beforeCleanup, window } = {
    granularity: 'symbol',
  },
) => {
  const selection = window.getSelection();

  if (selection.isCollapsed) return;
  if (granularity !== 'symbol') {
    trimSelection(selection);
  }

  if (selection.isCollapsed) return;

  applyTextGranularity(selection, granularity);

  const selectionText = selection.toString().replace(/[\n\r]/g, '\\n');

  for (let i = 0; i < selection.rangeCount; i++) {
    const range = fixRange(selection.getRangeAt(i));

    callback({ selectionText, range });
  }

  // eslint-disable-next-line no-unused-expressions
  beforeCleanup?.();

  selection.removeAllRanges();
};

/**
 * *Experimental feature. Might nor work in Gecko browsers.*
 *
 * Updates selection's granularity.
 * @param {Selection} selection
 * @param {string} granularity
 */
const applyTextGranularity = (selection, granularity) => {
  if (!selection.modify || !granularity || granularity === 'symbol') return;

  try {
    switch (granularity) {
      case 'word':
        boundarySelection(selection, 'word');
        return;
      case 'sentence':
        boundarySelection(selection, 'sentenceboundary');
        return;
      case 'paragraph':
        boundarySelection(selection, 'paragraphboundary');
        return;
      case 'charater':
      case 'symbol':
      default:
        return;
    }
  } catch {
    console.warn('Probably, you\'re using browser that doesn\'t support granularity.');
  }
};

/**
 * Lookup closest text node
 * @param {HTMLElement} commonContainer
 * @param {HTMLElement} node
 * @param {number} offset
 * @param {string} direction forward, backward, forward-next, backward-next
 *                           "-next" when we need to skip node if it's a text node
 */
const textNodeLookup = (commonContainer, node, offset, direction = 'forward') => {
  const startNode = node === commonContainer ? node.childNodes[offset] : node;

  if (isTextNode(startNode) && !direction.endsWith('next')) return startNode;

  const walker = commonContainer.ownerDocument.createTreeWalker(commonContainer, NodeFilter.SHOW_ALL);
  let currentNode = walker.nextNode();
  // tree walker can't go backward, so we go forward to startNode and record every text node
  // to find the last one before startNode
  let lastTextNode;

  while (currentNode && currentNode !== startNode) {
    if (isTextNode(currentNode)) lastTextNode = currentNode;
    currentNode = walker.nextNode();
  }

  if (currentNode && direction.startsWith('backward')) return lastTextNode;

  if (direction === 'forward-next') currentNode = walker.nextNode();

  while (currentNode) {
    if (isTextNode(currentNode)) return currentNode;
    currentNode = walker.nextNode();
  }
};

/**
 * Fix range if it contains non-text nodes and shrink it down to the better fit.
 * The main goal here is to get the most relevant xpath+offset combination.
 * i.e. `start` should point to the element, containing first char, not parent,
 * not root, not some previous element with `startOffset` on the last char.
 * @param {Range} range
 */
const fixRange = range => {
  const { endOffset, commonAncestorContainer: commonContainer } = range;
  let { startOffset, startContainer, endContainer } = range;

  if (!isTextNode(startContainer)) {
    startContainer = textNodeLookup(commonContainer, startContainer, startOffset, 'forward');
    if (!startContainer) return null;
    range.setStart(startContainer, 0);
    startOffset = 0;
  }

  // if user started selection from the end of the tag, start could be this tag,
  // so we should move it to more relevant one
  const selectionFromTheEnd = startContainer.wholeText.length === startOffset;
  // we skip ephemeral whitespace-only text nodes, like \n between tags in original html
  const isBasicallyEmpty = textNode => /^\s*$/.test(textNode.wholeText);

  if (selectionFromTheEnd || isBasicallyEmpty(startContainer)) {
    do {
      startContainer = textNodeLookup(commonContainer, startContainer, startOffset, 'forward-next');
      if (!startContainer) return null;
    } while (isBasicallyEmpty(startContainer));

    range.setStart(startContainer, 0);
    startOffset = 0;
  }

  if (!isTextNode(endContainer)) {
    endContainer = textNodeLookup(commonContainer, endContainer, endOffset, 'backward');
    if (!endContainer) return null;

    while (/^\s*$/.test(endContainer.wholeText)) {
      endContainer = textNodeLookup(commonContainer, endContainer, endOffset, 'backward-next');
      if (!endContainer) return null;
    }
    // we skip empty whitespace-only text nodes, so we need the found one to be included
    range.setEnd(endContainer, endContainer.length);
  }

  return range;
};

/**
 * Highlight gien Range
 * @param {Range} range
 * @param {{label: string, classNames: string[]}} param1
 */
export const highlightRange = (range, { label, classNames }) => {
  const { startContainer, endContainer, commonAncestorContainer } = range;
  const { startOffset, endOffset } = range;
  const highlights = [];

  /**
   * Wrapper with predefined classNames and cssStyles
   * @param  {[Node, number, number]} args
   */
  const applyStyledHighlight = (...args) => highlightRangePart(...args, classNames);

  // If start and end nodes are equal, we don't need
  // to perform any additional work, just highlighting as is
  if (startContainer === endContainer) {
    highlights.push(applyStyledHighlight(startContainer, startOffset, endOffset));
  } else {
    // When start and end are different we need to find all
    // nodes between as they could contain text nodes
    const nodesToHighlight = findNodesBetween(startContainer, endContainer, commonAncestorContainer);

    // All nodes between start and end should be fully highlighted
    nodesToHighlight.forEach(node => {
      let start = startOffset;
      let end = endOffset;

      if (node !== startContainer) start = 0;
      if (node !== endContainer) end = node.length;

      highlights.push(applyStyledHighlight(node, start, end));
    });
  }

  const lastLabel = highlights[highlights.length - 1];

  if (lastLabel) lastLabel.setAttribute('data-label', label ?? '');

  return highlights;
};

/**
 * Takes original range and splits it into multiple text
 * nodes highlighting a part of the text, then replaces
 * original text node with highlighted one
 * @param {Node} container
 * @param {number} startOffset
 * @param {number} endOffset
 * @param {object} cssStyles
 * @param {string[]} classNames
 */
export const highlightRangePart = (container, startOffset, endOffset, classNames) => {
  let spanHighlight;
  const text = container.textContent;
  const parent = container.parentNode;

  /**
   * In case we're inside another region, move the selection outside
   * to maintain proper nesting of highlight nodes
   */
  if (startOffset === 0 && container.length === endOffset && parent.classList.contains(classNames[0])) {
    const placeholder = container.ownerDocument.createElement('span');
    const parentNode = parent.parentNode;

    parentNode.replaceChild(placeholder, parent);
    spanHighlight = wrapWithSpan(parent, classNames);
    parentNode.replaceChild(spanHighlight, placeholder);
  } else {
    // Extract text content that matches offsets
    const content = text.substring(startOffset, endOffset);
    // Create text node that will be highlighted
    const highlitedNode = container.ownerDocument.createTextNode(content);

    // Split the container in three parts
    const noseNode = container.cloneNode();
    const tailNode = container.cloneNode();

    // Add all the text BEFORE selection
    noseNode.textContent = text.substring(0, startOffset);
    tailNode.textContent = text.substring(endOffset, text.length);

    // To avoid weird dom mutation we assemble replacement
    // beforehands, it allows to replace original node
    // directly without extra work
    const textFragment = container.ownerDocument.createDocumentFragment();

    spanHighlight = wrapWithSpan(highlitedNode, classNames);

    if (noseNode.length) textFragment.appendChild(noseNode);
    textFragment.appendChild(spanHighlight);
    if (tailNode.length) textFragment.appendChild(tailNode);

    // At this point we have three nodes in the tree
    // one of them is our selected range
    parent.replaceChild(textFragment, container);
  }

  return spanHighlight;
};

/**
 * Wrap text node with stylized span
 * @param {Text} node
 * @param {string[]} classNames
 * @param {object} cssStyles
 * @param {string} [label]
 */
export const wrapWithSpan = (node, classNames, label) => {
  const highlight = node.ownerDocument.createElement('span');

  highlight.appendChild(node);

  applySpanStyles(highlight, { classNames, label });

  return highlight;
};

/**
 * Apply classes and styles to a span. Optionally add or remove label
 * @param {HTMLSpanElement} spanNode
 * @param {{classNames?: string[], cssStyles?: {}, label?: string}} param1
 */
export const applySpanStyles = (spanNode, { classNames, label }) => {
  if (classNames) {
    spanNode.className = '';
    spanNode.classList.add(...classNames);
  }

  // label is array, string or null, so check for length
  if (!label?.length) spanNode.removeAttribute('data-label');
  else spanNode.setAttribute('data-label', label);
};

/**
 * Look up all nodes between given `startNode` and `endNode` including ends
 * @param {Node} startNode
 * @param {Node} endNode
 * @param {Node} root
 */
export const findNodesBetween = (startNode, endNode, root) => {
  // Tree walker creates flat representation of DOM
  // it allows to iterate over nodes more efficiently
  // as we don't need to go up and down on a tree

  // Also we iterate over Text nodes only natively. That's
  // the only type of nodes we need to highlight.
  // No additional checks, long live TreeWalker :)
  const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_ALL);

  // Flag indicates that we're somwhere between `startNode` and `endNode`
  let inRange = false;

  // Here we collect all nodes between start and end
  // including ends
  const nodes = [];
  let { currentNode } = walker;

  while (currentNode) {
    if (currentNode === startNode) inRange = true;
    if (inRange && currentNode.nodeType === Node.TEXT_NODE) nodes.push(currentNode);
    if (inRange && currentNode === endNode) break;
    currentNode = walker.nextNode();
  }

  return nodes;
};

/**
 * Removes given range and restores DOM structure.
 * @param {HTMLSpanElement[]} spans
 */
export const removeRange = spans => {
  if (!spans) return;
  spans.forEach(hl => {
    const fragment = hl.ownerDocument.createDocumentFragment();
    const parent = hl.parentNode;

    // Fill replacement fragment
    // We need to copy childNodes because otherwise
    // It will be changed during the loop
    Array.from(hl.childNodes).forEach(node => {
      node.remove();
      fragment.appendChild(node);
    });

    // Put back all text without spans
    parent.replaceChild(fragment, hl);

    // Join back all text nodes
    Array.from(parent.childNodes).forEach(node => {
      const prev = node.previousSibling;

      if (!isTextNode(prev) || !isTextNode(node)) return;

      prev.data += node.data;
      node.remove();
    });
  });
};

/**
 * Find a startContainer and endContainer by text offsets
 * @param {number} start
 * @param {number} end
 * @param {Node} root
 */
export const findRange = (start, end, root) => {
  return {
    startContainer: codePointsToChars(findOnPosition(root, start, 'right')),
    endContainer: codePointsToChars(findOnPosition(root, end, 'left')),
  };
};

export const findRangeNative = (start, end, root) => {
  const { startContainer, endContainer } = findRange(start, end, root);

  const range = (root.contentDocument ?? root.ownerDocument).createRange();

  if (!startContainer || !endContainer) return;

  range.setStart(startContainer.node, startContainer.position);
  range.setEnd(endContainer.node, endContainer.position);

  return range;
};

/**
 * Convert position in node from code points count to chars count
 * May be useful to do some string operations and then convert it back
 * @param {{ node: Node, position: number }} container
 * @return {{ node: Node, position: number }}
 */
export const codePointsToChars = ({ node, position } = {}) => {
  if (!node) return;

  const codePoints = [...node.textContent].slice(0, position);
  const chars = codePoints.join('').length;

  return { node, position: chars };
};

/**
 * Fix position in node from chars count to code points count
 * In python and other modern tools complex unicode symbols handled as code points, not UTF chars
 * So for external usage js length should be converted to code points count
 * string to array conversion splits string into code points array, that's the easiest way
 * @param {{ node: Node, position: number }} container
 * @return {{ node: Node, position: number }}
 */
export const charsToCodePoints = ({ node, position }) => {
  const chars = node.textContent.substr(0, position);
  const codePoints = [...chars].length;

  return { node, position: codePoints };
};

/**
 * Fix Range start/end offsets to code points count instead of chars count
 * Alters given range
 * @param {Range} range
 * @return {Range} the same range
 */
export const fixCodePointsInRange = (range) => {
  const start = charsToCodePoints({ node: range.startContainer, position: range.startOffset });
  const end = charsToCodePoints({ node: range.endContainer, position: range.endOffset });

  range.setStart(range.startContainer, start.position);
  range.setEnd(range.endContainer, end.position);

  return range;
};

/**
 * Find a node by text offset
 * @param {Node} root
 * @param {number} position
 */
export const findOnPosition = (root, position, borderSide = 'left') => {
  const walker = (root.contentDocument ?? root.ownerDocument).createTreeWalker(root, NodeFilter.SHOW_ALL);

  let lastPosition = 0;
  let currentNode = walker.nextNode();
  let nextNode = walker.nextNode();
  // set to finish on the next text
  let finishHere = false;

  while (currentNode) {
    const isText = currentNode.nodeType === Node.TEXT_NODE;
    const isBR = currentNode.nodeName === 'BR';

    if (isBR) {
      lastPosition++;
    }

    if (isText && finishHere) {
      return { node: currentNode, position: 0 };
    }

    if (isText) {
      // convert chars count to code points count, see `charsToCodePoints`
      const length = [...currentNode.textContent].length;

      if (length + lastPosition >= position || !nextNode) {
        if (borderSide === 'right' && length + lastPosition === position && nextNode) {
          finishHere = true;
        } else {
          return { node: currentNode, position: isBR ? 0 : clamp(position - lastPosition, 0, length) };
        }
      }
      lastPosition += length;
    }

    currentNode = nextNode;
    nextNode = walker.nextNode();
  }
};

/**
 * Convert Range to global offsets relative to a root
 * @param {Range} range
 * @param {Node} root
 */
export const rangeToGlobalOffset = (range, root) => {
  const globalOffsets = [
    findGlobalOffset(range.startContainer, range.startOffset, root),
    findGlobalOffset(range.endContainer, range.endOffset, root),
  ];

  return globalOffsets;
};

/**
 * Find text offset for given node and position relative to a root
 * @param {Node} node
 * @param {Number} position
 * @param {Node} root
 */
const findGlobalOffset = (node, position, root) => {
  const walker = (root.contentDocument ?? root.ownerDocument).createTreeWalker(root, NodeFilter.SHOW_ALL);

  let globalPosition = 0;
  let nodeReached = false;
  let currentNode = walker.nextNode();

  while (currentNode) {
    // Indicates that we at or below desired node
    nodeReached = nodeReached || (node === currentNode);
    const atTargetNode = node === currentNode || currentNode.contains(node);
    const isText = currentNode.nodeType === Node.TEXT_NODE;
    const isBR = currentNode.nodeName === 'BR';

    // Stop iteration
    // Break if we passed target node and current node
    // is not target, nor child of a target
    if (nodeReached && atTargetNode === false) {
      break;
    }

    if (isText || isBR) {
      let length = isDefined(currentNode.length) ? [...currentNode.textContent].length : 1;

      if (atTargetNode) {
        length = Math.min(position, length);
      }

      globalPosition += length;
    }

    currentNode = walker.nextNode();
  }

  return globalPosition;
};

export const isSelectionContainsSpan = (spanNode) => {
  const selection = window.getSelection();
  const spanRange = document.createRange();
  const textNode = spanNode.childNodes[0];

  spanRange.setStart(textNode, 0);
  spanRange.setEnd(textNode, textNode.length);
  for (let i = selection.rangeCount; i--;) {
    const selRange = selection.getRangeAt(i);

    if (selRange.compareBoundaryPoints(Range.START_TO_START, spanRange) < 1 && selRange.compareBoundaryPoints(Range.END_TO_END, spanRange) > -1) return true;
  }
  return false;
};
