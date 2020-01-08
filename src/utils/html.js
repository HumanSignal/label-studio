import insertAfter from "insert-after";

// work directly with the html tree

function documentForward(node) {
  if (node.firstChild) return node.firstChild;

  while (!node.nextSibling) {
    node = node.parentNode;
    if (!node) return null;
  }

  return node.nextSibling;
}

function isTextNode(node) {
  const TEXT_NODE = 3;
  return node.nodeType === TEXT_NODE;
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

function getNodesInRange(range) {
  var start = range.startContainer;
  var end = range.endContainer;
  var commonAncestor = range.commonAncestorContainer;
  var nodes = [];
  var node;

  // walk parent nodes from start to common ancestor
  for (node = start.parentNode; node; node = node.parentNode) {
    nodes.push(node);
    if (node === commonAncestor) break;
  }
  nodes.reverse();

  // walk children and siblings from start until end is found
  for (node = start; node; node = getNextNode(node)) {
    nodes.push(node);
    if (node === end) break;
  }

  return nodes;
}

function documentReverse(node) {
  if (node.lastChild) return node.lastChild;

  while (!node.previousSibling) {
    node = node.parentNode;
    if (!node) return null;
  }

  return node.previousSibling;
}

function splitText(node, offset) {
  let tail = node.cloneNode(false);
  tail.deleteData(0, offset);
  node.deleteData(offset, node.length - offset);
  return insertAfter(tail, node);
}

function normalizeBoundaries(range) {
  let { startContainer, startOffset, endContainer, endOffset } = range;
  let node, next, last, start, end;

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
  start = node;

  // Find the end TextNode.
  // Similarly, a reverse document order traversal visits every Node in the
  // Range before visiting the first leaf of the start container.
  node = endContainer;
  next = node => (node === last ? null : documentReverse(node));
  last = firstLeaf(startContainer);
  while (node && !isTextNodeInRange(node)) node = next(node);
  end = node;

  range.setStart(start, 0);
  range.setEnd(end, end.length);
}

function highlightRange(normedRange, cssClass, cssStyle, labels) {
  if (typeof cssClass === "undefined" || cssClass === null) {
    cssClass = "htx-annotation";
  }

  const allNodes = getNodesInRange(normedRange._range);
  const textNodes = allNodes.filter(n => isTextNode(n));

  var white = /^\s*$/;

  var nodes = textNodes; // normedRange.textNodes(),

  let nlen = nodes.length;
  if (nlen > 1 && nodes[nodes.length - 1].length !== normedRange._range.endOffset) nlen = nlen - 1;

  const results = [];
  for (var i = 0, len = nlen; i < len; i++) {
    var node = nodes[i];
    if (!white.test(node.nodeValue)) {
      var hl = window.document.createElement("span");
      hl.style.backgroundColor = cssStyle.backgroundColor;

      hl.addEventListener("click", function() {
        normedRange.onClickRegion();
      });

      hl.addEventListener("mouseover", function() {
        this.style.cursor = "pointer";
      });

      hl.className = cssClass;
      node.parentNode.replaceChild(hl, node);
      hl.appendChild(node);
      results.push(hl);
    }
  }

  // if (labels && labels.length !== 0) {
  //     var dateSpan = document.createElement('sup');
  //     dateSpan.style.userSelect="none";
  //     dateSpan.style.fontSize="12px";

  //     dateSpan.innerHTML = "[" + labels.join(" ") + "]";

  //     var lastSpan = results[results.length - 1];
  //     lastSpan.appendChild(dateSpan);
  // }

  return results;
}

function splitBoundaries(range) {
  let { startContainer, startOffset, endContainer, endOffset } = range;

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

export { highlightRange, splitBoundaries, normalizeBoundaries };
