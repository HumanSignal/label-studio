import insertAfter from 'insert-after';
import * as Checkers from './utilities';
import Canvas from './canvas';

// fast way to change labels visibility for all text regions
function toggleLabelsAndScores(show) {
  const toggleInDocument = document => {
    const els = document.getElementsByClassName('htx-highlight');

    Array.from(els).forEach(el => {
      // labels presence controlled by explicit `showLabels` in the config
      if (el.classList.contains('htx-manual-label')) return;

      if (show) el.classList.remove('htx-no-label');
      else el.classList.add('htx-no-label');
    });
  };

  toggleInDocument(document);
  document.querySelectorAll('iframe.lsf-htx-richtext')
    .forEach(iframe => toggleInDocument(iframe.contentWindow.document));
}

const labelWithCSS = (function() {
  const cache = {};

  return function(node, { labels, score }) {
    const labelsStr = labels ? labels.join(',') : '';
    const clsName = Checkers.hashCode(labelsStr + score);

    let cssCls = 'htx-label-' + clsName;

    cssCls = cssCls.toLowerCase();

    if (cssCls in cache) return cache[cssCls];

    node.setAttribute('data-labels', labelsStr);

    const resSVG = Canvas.labelToSVG({ label: labelsStr, score });
    const svgURL = `url(${resSVG})`;

    createClass(`.${cssCls}:after`, `content:${svgURL}`);

    cache[clsName] = true;

    return cssCls;
  };
})();

// work directly with the html tree
function createClass(name, rules) {
  const style = document.createElement('style');

  style.type = 'text/css';
  document.getElementsByTagName('head')[0].appendChild(style);
  if (!(style.sheet || {}).insertRule) (style.styleSheet || style.sheet).addRule(name, rules);
  else style.sheet.insertRule(name + '{' + rules + '}', 0);
}

function documentForward(node) {
  if (node.firstChild) return node.firstChild;

  while (!node.nextSibling) {
    node = node.parentNode;
    if (!node) return null;
  }

  return node.nextSibling;
}

function isTextNode(node) {
  return node.nodeType === Node.TEXT_NODE;
}

function firstLeaf(node) {
  while (node.hasChildNodes()) node = node.firstChild;
  return node;
}

/* Find the last leaf node. */
function lastLeaf(node) {
  while (node.hasChildNodes()) node = node.lastChild;

  return node;
}

function getNextNode(node) {
  if (node.firstChild) return node.firstChild;
  while (node) {
    if (node.nextSibling) return node.nextSibling;
    node = node.parentNode;
  }
}

export function isValidTreeNode(node, commonAncestor) {
  while (node) {
    if (commonAncestor && node === commonAncestor) return true;
    if (node.nodeType === Node.ELEMENT_NODE && node.dataset.skipNode === 'true') return false;
    node = node.parentNode;
  }
  return true;
}

export function getNodesInRange(range) {
  const start = range.startContainer;
  const end = range.endContainer;
  const commonAncestor = range.commonAncestorContainer;
  const nodes = [];
  let node;

  // walk parent nodes from start to common ancestor
  for (node = start.parentNode; node; node = node.parentNode) {
    if (isValidTreeNode(node, commonAncestor)) nodes.push(node);
    if (node === commonAncestor) break;
  }
  nodes.reverse();

  // walk children and siblings from start until end is found
  for (node = start; node; node = getNextNode(node)) {
    if (isValidTreeNode(node, commonAncestor)) nodes.push(node);
    if (node === end) break;
  }

  return nodes;
}

export function getTextNodesInRange(range) {
  return getNodesInRange(range).filter(n => isTextNode(n));
}

function documentReverse(node) {
  if (node.lastChild) return node.lastChild;

  while (!node.previousSibling) {
    node = node.parentNode;
    if (!node) return null;
  }

  return node.previousSibling;
}

/**
 * Split text node into two nodes following each other
 * @param {Text} node
 * @param {number} offset
 */
function splitText(node, offset) {
  const tail = node.cloneNode(false);

  tail.deleteData(0, offset);
  node.deleteData(offset, node.length - offset);
  return insertAfter(tail, node);
}

function normalizeBoundaries(range) {
  let { startContainer, startOffset, endContainer, endOffset } = range;
  let node, next, last;

  // Move the start container to the last leaf before any sibling boundary,
  // guaranteeing that any children of the container are within the range.
  if (startContainer.childNodes.length && startOffset > 0) {
    startContainer = lastLeaf(startContainer.childNodes[startOffset - 1]);
    startOffset = startContainer.length || startContainer.childNodes.length;
  }

  // Move the end container to the first leaf after any sibling boundary,
  // guaranteeing that any children of the container are within the range.
  if (endOffset < endContainer.childNodes.length) {
    endContainer = firstLeaf(endContainer.childNodes[endOffset]);
    endOffset = 0;
  }

  // Any TextNode in the traversal is valid unless excluded by the offset.
  function isTextNodeInRange(node) {
    if (!isTextNode(node)) return false;
    if (node === startContainer && startOffset > 0) return false;
    if (node === endContainer && endOffset === 0) return false;
    return true;
  }

  // Find the start TextNode.
  // The guarantees above provide that a document order traversal visits every
  // Node in the Range before visiting the last leaf of the end container.
  node = startContainer;
  next = node => (node === last ? null : documentForward(node));
  last = lastLeaf(endContainer);
  while (node && !isTextNodeInRange(node)) node = next(node);
  const start = node;

  // Find the end TextNode.
  // Similarly, a reverse document order traversal visits every Node in the
  // Range before visiting the first leaf of the start container.
  node = endContainer;
  next = node => (node === last ? null : documentReverse(node));
  last = firstLeaf(startContainer);
  while (node && !isTextNodeInRange(node)) node = next(node);
  const end = node;

  range.setStart(start, 0);
  range.setEnd(end, end.length);
}

function highlightRange(normedRange, cssClass, cssStyle) {
  if (typeof cssClass === 'undefined' || cssClass === null) {
    cssClass = 'htx-annotation';
  }

  const textNodes = getTextNodesInRange(normedRange._range);

  const white = /^\s*$/;

  const nodes = textNodes; // normedRange.textNodes(),

  let start = 0;

  if (normedRange._range.startOffset === nodes[start].length) start++;

  let nlen = nodes.length;

  if (nlen > 1 && nodes[nodes.length - 1].length !== normedRange._range.endOffset) nlen = nlen - 1;

  const results = [];

  for (let i = start, len = nlen; i < len; i++) {
    const node = nodes[i];

    if (!white.test(node.nodeValue)) {
      const hl = window.document.createElement('span');

      hl.style.backgroundColor = cssStyle.backgroundColor;

      hl.className = cssClass;
      node.parentNode.replaceChild(hl, node);
      hl.appendChild(node);

      results.push(hl);
    }
  }

  return results;
}

/**
 *
 * @param {Range} range
 */
function splitBoundaries(range) {
  let { startContainer, endContainer } = range;
  const { startOffset, endOffset } = range;

  if (isTextNode(endContainer)) {
    if (endOffset > 0 && endOffset < endContainer.length) {
      endContainer = splitText(endContainer, endOffset);
      range.setEnd(endContainer, 0);
    }
  }

  if (isTextNode(startContainer)) {
    if (startOffset > 0 && startOffset < startContainer.length) {
      if (startContainer === endContainer) {
        startContainer = splitText(startContainer, startOffset);
        range.setEnd(startContainer, endOffset - startOffset);
      } else {
        startContainer = splitText(startContainer, startOffset);
      }
      range.setStart(startContainer, 0);
    }
  }
}

const toGlobalOffset = (container, element, len) => {
  let pos = 0;
  const count = node => {
    if (node === element) {
      return pos;
    }
    if (node.nodeName === '#text') pos = pos + node.length;
    if (node.nodeName === 'BR') pos = pos + 1;

    for (let i = 0; i <= node.childNodes.length; i++) {
      const n = node.childNodes[i];

      if (n) {
        const res = count(n);

        if (res !== undefined) return res;
      }
    }
  };

  return len + count(container);
};

const mainOffsets = element => {
  const range = window
    .getSelection()
    .getRangeAt(0)
    .cloneRange();
  let start = range.startOffset;
  let end = range.endOffset;

  let passedStart = false;
  let passedEnd = false;

  const traverse = node => {
    if (node.nodeName === '#text') {
      if (node !== range.startContainer && !passedStart) start = start + node.length;
      if (node === range.startContainer) passedStart = true;

      if (node !== range.endContainer && !passedEnd) end = end + node.length;
      if (node === range.endContainer) passedEnd = true;
    }

    if (node.nodeName === 'BR') {
      if (!passedStart) start = start + 1;

      if (!passedEnd) end = end + 1;
    }

    if (node.childNodes.length > 0) {
      for (let i = 0; i <= node.childNodes.length; i++) {
        const n = node.childNodes[i];

        if (n) {
          const res = traverse(n);

          if (res) return res;
        }
      }
    }
  };

  traverse(element);

  return { start, end };
};

const findIdxContainer = (el, globidx) => {
  let len = globidx;

  const traverse = node => {
    if (!node) return;

    if (node.nodeName === '#text') {
      if (len - node.length <= 0) return node;
      else len = len - node.length;
    } else if (node.nodeName === 'BR') {
      len = len - 1;
    } else if (node.childNodes.length > 0) {
      for (let i = 0; i <= node.childNodes.length; i++) {
        const n = node.childNodes[i];

        if (n) {
          const res = traverse(n);

          if (res) return res;
        }
      }
    }
  };

  const node = traverse(el);

  return { node, len };
};

function removeSpans(spans) {
  const norm = [];

  if (spans) {
    spans.forEach(span => {
      while (span.firstChild) span.parentNode.insertBefore(span.firstChild, span);

      norm.push(span.parentNode);
      span.parentNode.removeChild(span);
    });
  }

  norm.forEach(n => n.normalize());
}

function moveStylesBetweenHeadTags(srcHead, destHead) {
  const rulesByStyleId = {};
  const fragment = document.createDocumentFragment();

  for (let i = 0; i < srcHead.children.length;) {
    const style = srcHead.children[i];

    if (style?.tagName !== 'STYLE') {
      i++;
      continue;
    }

    const styleSheet = style.sheet;

    // Sometimes rules are not accessible
    try {
      const rules = styleSheet.rules;

      const cssTexts = rulesByStyleId[style.id] = [];

      for (let k = 0;k < rules.length; k++) {
        cssTexts.push(rules[k].cssText);
      }
    } finally {
      fragment.appendChild(style);
    }
  }
  destHead.appendChild(fragment);
  applyHighlightStylesToDoc(destHead.ownerDocument,rulesByStyleId);
}

function applyHighlightStylesToDoc(destDoc, rulesByStyleId) {
  for (let i = 0; i < destDoc.styleSheets.length; i++) {
    const styleSheet = destDoc.styleSheets[i];
    const style = styleSheet.ownerNode;

    if (!style.id) continue;
    // Sometimes rules are not accessible
    try {
      const rules = rulesByStyleId[style.id];

      if (!rules) continue;
      for (let k = 0;k < rules.length; k++) {
        style.sheet.insertRule(rules[k]);
      }
    } catch {
      continue;
    }
  }
}

/**
 * Checks if element or one of its descendants match given selector
 * @param {HTMLElement} element Element to match
 * @param {string} selector CSS selector
 */
export const matchesSelector = (element, selector) => {
  return element.matches(selector) || element.closest(selector) !== null;
};

/**
 * Find a node by xpath
 * @param {string} xpath
 * @param {Node} root
 */
export const findByXpath = (xpath, root = document) => {
  if (root !== document && xpath[0] !== '.') {
    xpath = `.${xpath}`;
  }

  return document.evaluate(xpath, root, null, XPathResult.ANY_TYPE, null).iterateNext();
};

export const htmlEscape = string => {
  const matchHtmlRegExp = /["'&<>]/;
  const str = '' + string;
  const match = matchHtmlRegExp.exec(str);

  if (!match) {
    return str;
  }

  let escape;
  let html = '';
  let index = 0;
  let lastIndex = 0;

  for (index = match.index; index < str.length; index++) {
    switch (str.charCodeAt(index)) {
      case 34: // "
        escape = '&quot;';
        break;
      case 38: // &
        escape = '&amp;';
        break;
      case 39: // '
        escape = '&#39;';
        break;
      case 60: // <
        escape = '&lt;';
        break;
      case 62: // >
        escape = '&gt;';
        break;
      default:
        continue;
    }

    if (lastIndex !== index) {
      html += str.substring(lastIndex, index);
    }

    lastIndex = index + 1;
    html += escape;
  }

  return lastIndex !== index ? html + str.substring(lastIndex, index) : html;
};

function findNodeAt(context, at) {
  for (let node = context.firstChild, l = 0; node;) {
    if (node.textContent.length + l >= at)
      if (!node.firstChild) return [node, at - l];
      else node = node.firstChild;
    else {
      l += node.textContent.length;
      node = node.nextSibling;
    }
  }
}

/**
 * Sanitize html from scripts and iframes
 * @param {string} html
 * @param {object} [options]
 * @param {boolean} [options.useStub] use stub instead of removing to keep tags number and order for html tasks
 * @param {boolean} [options.useHeadStub] use different stub for scripts in head to not have excess tags there
 * @returns {string}
 */
function sanitizeHtml(html, options = {}) {
  if (!html) return '';

  const reScripts = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script\s*>/gi;
  const stub = options.useStub ? '<ls-stub></ls-stub>' : '';
  const headStub = '<ls-head-stub></ls-head-stub>';

  if (options.useHeadStub) {
    html = html.replace(/(<head.*?>)(.*?)(<\/head>)/, (_, opener, body, closer) => {
      return [opener, body.replace(reScripts, headStub), closer].join('');
    });
  }

  const sanitized = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script\s*>/gi, stub)
    .replace(/<iframe\b.*?(?:\/>|<\/iframe>)/g, stub)
    // remove events
    .replace(/\bon[a-z]+\s*=\s*(?:(['"])(?!\1).+?\1|(?:\S+?\(.*?\)(?=[\s>])))(.*?)/gi, '');

  return sanitized;
}

export {
  toggleLabelsAndScores,
  labelWithCSS,
  findNodeAt,
  removeSpans,
  mainOffsets,
  findIdxContainer,
  toGlobalOffset,
  highlightRange,
  sanitizeHtml,
  splitBoundaries,
  normalizeBoundaries,
  createClass,
  moveStylesBetweenHeadTags,
  applyHighlightStylesToDoc
};
