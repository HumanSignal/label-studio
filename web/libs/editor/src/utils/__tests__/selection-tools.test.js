/**
 * Unit tests for utils/selection-tools.js (Codecov: -30% delta).
 */
import { isTextNode, isSelectionContainsSpan } from "../selection-tools";

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
});
