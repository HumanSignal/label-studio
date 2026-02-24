/**
 * Unit tests for utils/selection-tools.js (Codecov: -30% delta).
 */
import {
  isTextNode,
  isSelectionContainsSpan,
  wrapWithSpan,
  applySpanStyles,
  findNodesBetween,
  removeRange,
  highlightRangePart,
  highlightRange,
  charsToCodePoints,
  fixCodePointsInRange,
  rangeToGlobalOffset,
  fixRange,
  captureSelection,
  applyTextGranularity,
  trimSelection,
} from "../selection-tools";

/**
 * Mock Selection that implements collapse + modify("extend", "forward"|"backward", "character")
 * so trimSelectionLeft/trimSelectionRight can run and terminate.
 */
function createMockSelection(doc, textNode, startOffset, endOffset) {
  const range = doc.createRange();
  range.setStart(textNode, startOffset);
  range.setEnd(textNode, endOffset);
  const len = textNode.length;
  const initialStart = { container: range.startContainer, offset: range.startOffset };
  const initialEnd = { container: range.endContainer, offset: range.endOffset };

  return {
    _range: range,
    _initialStart: initialStart,
    _initialEnd: initialEnd,
    rangeCount: 1,
    isCollapsed: startOffset === endOffset,
    getRangeAt() {
      return this._range;
    },
    removeAllRanges() {
      this._range = null;
    },
    addRange(r) {
      this._range = r;
    },
    collapse(container, offset) {
      this._range = doc.createRange();
      this._range.setStart(container, offset);
      this._range.setEnd(container, offset);
    },
    modify(type, direction, unit) {
      if (!this._range) return;
      if (type === "extend" && unit === "character") {
        const { startContainer, startOffset, endContainer, endOffset } = this._range;
        if (direction === "forward" && endContainer === textNode && endOffset < len) {
          this._range.setEnd(endContainer, endOffset + 1);
        } else if (direction === "backward" && startContainer === textNode && startOffset > 0) {
          this._range.setEnd(startContainer, startOffset);
          this._range.setStart(startContainer, startOffset - 1);
        }
        return;
      }
      if (type === "move" && this._initialStart && this._initialEnd) {
        if (direction === "backward") {
          this._range = doc.createRange();
          this._range.setStart(this._initialStart.container, this._initialStart.offset);
          this._range.setEnd(this._initialStart.container, this._initialStart.offset);
        } else if (direction === "forward") {
          this._range = doc.createRange();
          this._range.setStart(this._initialEnd.container, this._initialEnd.offset);
          this._range.setEnd(this._initialEnd.container, this._initialEnd.offset);
        }
      }
    },
    toString() {
      return this._range ? this._range.toString() : "";
    },
  };
}

describe("selection-tools", () => {
  describe("isTextNode", () => {
    it("returns true for text node", () => {
      const text = document.createTextNode("hello");
      expect(isTextNode(text)).toBe(true);
    });

    it("returns false for element node", () => {
      const el = document.createElement("div");
      expect(isTextNode(el)).toBe(false);
    });

    it("returns falsy for null/undefined", () => {
      expect(isTextNode(null)).toBeFalsy();
      expect(isTextNode(undefined)).toBeFalsy();
    });
  });

  describe("isSelectionContainsSpan", () => {
    it("returns false when selection is empty", () => {
      const span = document.createElement("span");
      span.appendChild(document.createTextNode("text"));
      const sel = window.getSelection();
      sel.removeAllRanges();
      expect(isSelectionContainsSpan(span)).toBe(false);
    });
  });

  describe("wrapWithSpan", () => {
    it("wraps text node in span with classNames and label", () => {
      const doc = document.implementation.createHTMLDocument("");
      const text = doc.createTextNode("hello");
      const span = wrapWithSpan(text, ["hl", "region"], "Label");
      expect(span.tagName).toBe("SPAN");
      expect(span.childNodes.length).toBe(1);
      expect(span.firstChild).toBe(text);
      expect(span.classList.contains("hl")).toBe(true);
      expect(span.classList.contains("region")).toBe(true);
      expect(span.getAttribute("data-label")).toBe("Label");
    });

    it("applies empty data-index when no index", () => {
      const doc = document.implementation.createHTMLDocument("");
      const text = doc.createTextNode("x");
      const span = wrapWithSpan(text, ["c"], null);
      expect(span.getAttribute("data-index")).toBe("");
    });
  });

  describe("applySpanStyles", () => {
    it("sets classNames and removes data-label when label is empty", () => {
      const span = document.createElement("span");
      span.setAttribute("data-label", "old");
      applySpanStyles(span, { classNames: ["a", "b"], label: "" });
      expect(span.className).toBe("a b");
      expect(span.hasAttribute("data-label")).toBe(false);
      expect(span.getAttribute("data-index")).toBe("");
    });

    it("sets data-label and data-index when provided", () => {
      const span = document.createElement("span");
      applySpanStyles(span, { classNames: ["c"], index: 5, label: "L" });
      expect(span.getAttribute("data-label")).toBe("L");
      expect(span.getAttribute("data-index")).toBe("5");
    });
  });

  describe("findNodesBetween", () => {
    it("returns text nodes between start and end including ends", () => {
      const doc = document.implementation.createHTMLDocument("");
      const root = doc.createElement("div");
      const t1 = doc.createTextNode("a");
      const t2 = doc.createTextNode("b");
      const t3 = doc.createTextNode("c");
      root.appendChild(t1);
      root.appendChild(t2);
      root.appendChild(t3);
      const nodes = findNodesBetween(t1, t3, root);
      expect(nodes.length).toBe(3);
      expect(nodes[0]).toBe(t1);
      expect(nodes[1]).toBe(t2);
      expect(nodes[2]).toBe(t3);
    });

    it("returns single node when start and end are same text node", () => {
      const doc = document.implementation.createHTMLDocument("");
      const root = doc.createElement("div");
      const t = doc.createTextNode("x");
      root.appendChild(t);
      expect(findNodesBetween(t, t, root)).toEqual([t]);
    });

    it("returns only nodes from start to end of tree when start is after end in document order", () => {
      const doc = document.implementation.createHTMLDocument("");
      const root = doc.createElement("div");
      const t1 = doc.createTextNode("a");
      const t2 = doc.createTextNode("b");
      root.appendChild(t1);
      root.appendChild(t2);
      const nodes = findNodesBetween(t2, t1, root);
      expect(nodes).toContain(t2);
      expect(nodes).not.toContain(t1);
    });
  });

  describe("removeRange", () => {
    it("does nothing when spans is null/undefined", () => {
      expect(() => removeRange(null)).not.toThrow();
      expect(() => removeRange(undefined)).not.toThrow();
    });

    it("replaces span with its text and joins adjacent text nodes", () => {
      const doc = document.implementation.createHTMLDocument("");
      const root = doc.createElement("div");
      const t1 = doc.createTextNode("a");
      const span = doc.createElement("span");
      span.appendChild(doc.createTextNode("b"));
      const t2 = doc.createTextNode("c");
      root.appendChild(t1);
      root.appendChild(span);
      root.appendChild(t2);
      removeRange([span]);
      expect(root.childNodes.length).toBe(1);
      expect(root.childNodes[0].textContent).toBe("abc");
    });
  });

  describe("highlightRangePart", () => {
    it("wraps substring in span with classNames", () => {
      const doc = document.implementation.createHTMLDocument("");
      const root = doc.createElement("div");
      const text = doc.createTextNode("hello");
      root.appendChild(text);
      const span = highlightRangePart(text, 1, 4, ["hl"]);
      expect(span.tagName).toBe("SPAN");
      expect(span.textContent).toBe("ell");
      expect(root.childNodes.length).toBe(3);
      expect(root.childNodes[0].textContent).toBe("h");
      expect(root.childNodes[1]).toBe(span);
      expect(root.childNodes[2].textContent).toBe("o");
    });
  });

  describe("highlightRange", () => {
    it("highlights single container range and sets label/index on last span", () => {
      const doc = document.implementation.createHTMLDocument("");
      const root = doc.createElement("div");
      const text = doc.createTextNode("hello");
      root.appendChild(text);
      const range = doc.createRange();
      range.setStart(text, 0);
      range.setEnd(text, 5);
      const highlights = highlightRange(range, { classNames: ["r"], label: "L", index: 1 });
      expect(highlights.length).toBe(1);
      expect(highlights[0].getAttribute("data-label")).toBe("L");
      expect(highlights[0].getAttribute("data-index")).toBe("1");
    });

    it("highlights range across multiple text nodes", () => {
      const doc = document.implementation.createHTMLDocument("");
      const root = doc.createElement("div");
      const t1 = doc.createTextNode("a");
      const t2 = doc.createTextNode("b");
      const t3 = doc.createTextNode("c");
      root.appendChild(t1);
      root.appendChild(t2);
      root.appendChild(t3);
      const range = doc.createRange();
      range.setStart(t1, 0);
      range.setEnd(t3, 1);
      const highlights = highlightRange(range, { classNames: ["r"], label: "X" });
      expect(highlights.length).toBe(3);
      expect(highlights[2].getAttribute("data-label")).toBe("X");
    });
  });

  describe("charsToCodePoints", () => {
    it("converts char position to code point position", () => {
      const doc = document.implementation.createHTMLDocument("");
      const text = doc.createTextNode("hello");
      const result = charsToCodePoints({ node: text, position: 3 });
      expect(result.node).toBe(text);
      expect(result.position).toBe(3);
    });

    it("counts code points for multi-byte chars", () => {
      const doc = document.implementation.createHTMLDocument("");
      const text = doc.createTextNode("café"); // é is one code point, possibly 2 UTF-16 chars
      const result = charsToCodePoints({ node: text, position: 4 });
      expect(result.position).toBe([..."café"].length);
    });
  });

  describe("fixCodePointsInRange", () => {
    it("updates range offsets to code points and returns range", () => {
      const doc = document.implementation.createHTMLDocument("");
      const root = doc.createElement("div");
      const text = doc.createTextNode("hi");
      root.appendChild(text);
      const range = doc.createRange();
      range.setStart(text, 1);
      range.setEnd(text, 2);
      const out = fixCodePointsInRange(range);
      expect(out).toBe(range);
      expect(range.startOffset).toBe(1);
      expect(range.endOffset).toBe(2);
    });
  });

  describe("rangeToGlobalOffset", () => {
    it("returns [start, end] global offsets relative to root", () => {
      const doc = document.implementation.createHTMLDocument("");
      const root = doc.createElement("div");
      const text = doc.createTextNode("hello");
      root.appendChild(text);
      const range = doc.createRange();
      range.setStart(text, 0);
      range.setEnd(text, 5);
      const [start, end] = rangeToGlobalOffset(range, root);
      expect(start).toBe(0);
      expect(end).toBe(5);
    });

    it("counts across multiple text nodes and BR", () => {
      const doc = document.implementation.createHTMLDocument("");
      const root = doc.createElement("div");
      const t1 = doc.createTextNode("ab");
      const br = doc.createElement("br");
      const t2 = doc.createTextNode("c");
      root.appendChild(t1);
      root.appendChild(br);
      root.appendChild(t2);
      const range = doc.createRange();
      range.setStart(t1, 1);
      range.setEnd(t2, 1);
      const [start, end] = rangeToGlobalOffset(range, root);
      expect(start).toBe(1);
      expect(end).toBe(4);
    });
  });

  describe("fixRange", () => {
    it("returns range unchanged when both start and end are text nodes and not at boundary", () => {
      const doc = document.implementation.createHTMLDocument("");
      const root = doc.createElement("div");
      const text = doc.createTextNode("hello");
      root.appendChild(text);
      const range = doc.createRange();
      range.setStart(text, 1);
      range.setEnd(text, 4);
      const result = fixRange(range);
      expect(result).toBe(range);
      expect(range.startContainer).toBe(text);
      expect(range.startOffset).toBe(1);
      expect(range.endOffset).toBe(4);
    });

    it("resolves element start/end containers to text nodes", () => {
      const doc = document.implementation.createHTMLDocument("");
      const root = doc.createElement("div");
      const t1 = doc.createTextNode("a");
      const t2 = doc.createTextNode("b");
      root.appendChild(t1);
      root.appendChild(t2);
      const range = doc.createRange();
      range.setStart(root, 0);
      range.setEnd(root, 1);
      const result = fixRange(range);
      expect(result).toBe(range);
      expect(range.startContainer).toBe(t1);
      expect(range.startOffset).toBe(0);
      expect(range.endContainer).toBe(t2);
      expect(range.endOffset).toBe(1);
    });

    it("returns null when start resolves to no text node", () => {
      const doc = document.implementation.createHTMLDocument("");
      const root = doc.createElement("div");
      const range = doc.createRange();
      range.setStart(root, 0);
      range.setEnd(root, 0);
      expect(fixRange(range)).toBe(null);
    });
  });

  describe("trimSelection", () => {
    it("trims leading and trailing spaces using Selection.modify(extend, character)", () => {
      const doc = document.implementation.createHTMLDocument("");
      const root = doc.createElement("div");
      const text = doc.createTextNode("  ab  ");
      root.appendChild(text);
      const sel = createMockSelection(doc, text, 0, 6);
      trimSelection(sel);
      const r = sel.getRangeAt(0);
      expect(r.startContainer).toBe(text);
      expect(r.startOffset).toBe(2);
      expect(r.endContainer).toBe(text);
      expect(r.endOffset).toBe(4);
    });

    it("leaves range unchanged when no leading/trailing space", () => {
      const doc = document.implementation.createHTMLDocument("");
      const root = doc.createElement("div");
      const text = doc.createTextNode("ab");
      root.appendChild(text);
      const sel = createMockSelection(doc, text, 0, 2);
      trimSelection(sel);
      const r = sel.getRangeAt(0);
      expect(r.startOffset).toBe(0);
      expect(r.endOffset).toBe(2);
    });
  });

  describe("applyTextGranularity", () => {
    it("returns early when selection has no modify (e.g. jsdom)", () => {
      const doc = document.implementation.createHTMLDocument("");
      const root = doc.createElement("div");
      const text = doc.createTextNode("hello");
      root.appendChild(text);
      const range = doc.createRange();
      range.setStart(text, 0);
      range.setEnd(text, 5);
      const sel = { getRangeAt: () => range, rangeCount: 1, isCollapsed: false };
      expect(() => applyTextGranularity(sel, "word")).not.toThrow();
    });

    it("returns early when granularity is null or symbol", () => {
      const doc = document.implementation.createHTMLDocument("");
      const text = doc.createTextNode("x");
      const range = doc.createRange();
      range.setStart(text, 0);
      range.setEnd(text, 1);
      const sel = { getRangeAt: () => range, rangeCount: 1 };
      applyTextGranularity(sel, null);
      applyTextGranularity(sel, "symbol");
    });

    it("handles unknown granularity (default branch)", () => {
      const doc = document.implementation.createHTMLDocument("");
      const text = doc.createTextNode("x");
      const range = doc.createRange();
      range.setStart(text, 0);
      range.setEnd(text, 1);
      const sel = { getRangeAt: () => range, rangeCount: 1, modify: () => {} };
      expect(() => applyTextGranularity(sel, "character")).not.toThrow();
    });

    it("catches when boundarySelection throws (e.g. unsupported browser)", () => {
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
      const doc = document.implementation.createHTMLDocument("");
      const text = doc.createTextNode("word");
      const range = doc.createRange();
      range.setStart(text, 0);
      range.setEnd(text, 4);
      const sel = {
        getRangeAt: () => range,
        rangeCount: 1,
        modify: () => {
          throw new Error("not supported");
        },
      };
      expect(() => applyTextGranularity(sel, "word")).not.toThrow();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("expands to word boundary via findBoundarySelection when selection has modify(move)", () => {
      const doc = document.implementation.createHTMLDocument("");
      const root = doc.createElement("div");
      const text = doc.createTextNode("hello world");
      root.appendChild(text);
      const sel = createMockSelection(doc, text, 0, 5);
      expect(() => applyTextGranularity(sel, "word")).not.toThrow();
      const r = sel.getRangeAt(0);
      expect(r).toBeDefined();
      expect(r.startContainer).toBe(text);
      expect(r.endContainer).toBe(text);
    });

    it("expands to sentence boundary via closestBoundarySelection when granularity is sentence", () => {
      const doc = document.implementation.createHTMLDocument("");
      const root = doc.createElement("div");
      const text = doc.createTextNode("First sentence. Second.");
      root.appendChild(text);
      const sel = createMockSelection(doc, text, 0, 15);
      expect(() => applyTextGranularity(sel, "sentence")).not.toThrow();
      const r = sel.getRangeAt(0);
      expect(r).toBeDefined();
    });

    it("expands to paragraph boundary when granularity is paragraph", () => {
      const doc = document.implementation.createHTMLDocument("");
      const root = doc.createElement("div");
      const text = doc.createTextNode("One paragraph.");
      root.appendChild(text);
      const sel = createMockSelection(doc, text, 0, 5);
      expect(() => applyTextGranularity(sel, "paragraph")).not.toThrow();
      const r = sel.getRangeAt(0);
      expect(r).toBeDefined();
    });
  });

  describe("highlightRangePart (re-wrap existing highlight)", () => {
    it("re-wraps when container is fully selected and parent already has highlight class", () => {
      const doc = document.implementation.createHTMLDocument("");
      const root = doc.createElement("div");
      const span = doc.createElement("span");
      span.classList.add("hl");
      const text = doc.createTextNode("x");
      span.appendChild(text);
      root.appendChild(span);
      const result = highlightRangePart(text, 0, 1, ["hl"]);
      expect(result.tagName).toBe("SPAN");
      expect(result.classList.contains("hl")).toBe(true);
      expect(result.textContent).toBe("x");
      expect(root.childNodes.length).toBe(1);
      expect(root.contains(result)).toBe(true);
    });
  });

  describe("captureSelection", () => {
    it("invokes callback with selectionText and range when selection is not collapsed (symbol granularity)", () => {
      const root = document.createElement("div");
      const text = document.createTextNode("hello");
      root.appendChild(text);
      document.body.appendChild(root);
      const range = document.createRange();
      range.setStart(text, 0);
      range.setEnd(text, 5);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      const callback = jest.fn();
      captureSelection(callback, { granularity: "symbol", window });
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback.mock.calls[0][0]).toMatchObject({ selectionText: "hello" });
      expect(callback.mock.calls[0][0].range).toBeDefined();
      sel.removeAllRanges();
      document.body.removeChild(root);
    });

    it("does not invoke callback when selection is collapsed", () => {
      const root = document.createElement("div");
      const text = document.createTextNode("x");
      root.appendChild(text);
      document.body.appendChild(root);
      const range = document.createRange();
      range.setStart(text, 0);
      range.collapse(true);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      const callback = jest.fn();
      captureSelection(callback, { window });
      expect(callback).not.toHaveBeenCalled();
      sel.removeAllRanges();
      document.body.removeChild(root);
    });

    it("calls beforeCleanup when provided", () => {
      const root = document.createElement("div");
      const text = document.createTextNode("hi");
      root.appendChild(text);
      document.body.appendChild(root);
      const range = document.createRange();
      range.setStart(text, 0);
      range.setEnd(text, 2);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      const callback = jest.fn();
      const beforeCleanup = jest.fn();
      captureSelection(callback, { granularity: "symbol", window, beforeCleanup });
      expect(callback).toHaveBeenCalledTimes(1);
      expect(beforeCleanup).toHaveBeenCalledTimes(1);
      sel.removeAllRanges();
      document.body.removeChild(root);
    });

    it("invokes callback with word granularity after trimSelection and applyTextGranularity", () => {
      const doc = document.implementation.createHTMLDocument("");
      const root = doc.createElement("div");
      const text = doc.createTextNode("hello world");
      root.appendChild(text);
      doc.body.appendChild(root);
      const sel = createMockSelection(doc, text, 0, 5);
      const win = { getSelection: () => sel };
      const callback = jest.fn();
      captureSelection(callback, { granularity: "word", window: win });
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback.mock.calls[0][0].selectionText).toBeDefined();
      expect(callback.mock.calls[0][0].range).toBeDefined();
      doc.body.removeChild(root);
    });
  });

  describe("isSelectionContainsSpan", () => {
    it("returns false when selection does not contain the span", () => {
      const root = document.createElement("div");
      const span = document.createElement("span");
      const text = document.createTextNode("one two");
      span.appendChild(text);
      root.appendChild(span);
      const otherSpan = document.createElement("span");
      otherSpan.appendChild(document.createTextNode("other"));
      root.appendChild(otherSpan);
      document.body.appendChild(root);
      const range = document.createRange();
      range.setStart(text, 0);
      range.setEnd(text, 3);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      expect(isSelectionContainsSpan(otherSpan)).toBe(false);
      sel.removeAllRanges();
      document.body.removeChild(root);
    });

    it("returns true when selection fully contains the span", () => {
      const span = document.createElement("span");
      const text = document.createTextNode("inside");
      span.appendChild(text);
      document.body.appendChild(span);
      const range = document.createRange();
      range.setStart(text, 0);
      range.setEnd(text, 6);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      expect(isSelectionContainsSpan(span)).toBe(true);
      sel.removeAllRanges();
      document.body.removeChild(span);
    });
  });
});
