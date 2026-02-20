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
} from "../selection-tools";

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
      expect(result.position).toBe([... "café"].length);
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
  });
});
