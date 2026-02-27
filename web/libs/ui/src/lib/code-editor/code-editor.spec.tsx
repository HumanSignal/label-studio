import { render } from "@testing-library/react";

import CodeEditor from "./code-editor";

// CodeMirror uses Range.prototype.getBoundingClientRect, which jsdom does not provide.
beforeAll(() => {
  if (typeof Range !== "undefined" && !Range.prototype.getBoundingClientRect) {
    Range.prototype.getBoundingClientRect = function () {
      const rect = this.getClientRects?.();
      if (rect?.[0]) return rect[0];
      return {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        toJSON: () => ({}),
      } as DOMRect;
    };
  }
});

describe("CodeEditor", () => {
  it("should render successfully", () => {
    const { baseElement } = render(<CodeEditor />);
    expect(baseElement).toBeTruthy();
  });
});
