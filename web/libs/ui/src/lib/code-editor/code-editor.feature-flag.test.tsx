import { render, screen } from "@testing-library/react";
import { ff } from "@humansignal/core";
import type { Mock } from "bun:test";
import * as cm6Module from "./cm6-code-editor";
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

  if (typeof Element !== "undefined" && !Element.prototype.getClientRects) {
    Element.prototype.getClientRects = function () {
      return [
        {
          x: 0,
          y: 0,
          width: 0,
          height: 0,
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          toJSON: () => ({}),
        } as DOMRect,
      ] as unknown as DOMRectList;
    };
  }
});

describe("CodeEditor feature flag", () => {
  beforeEach(() => {
    spyOn(cm6Module, "Cm6CodeEditor").mockImplementation((props: { value?: string }) => (
      <div data-testid="cm6-code-editor" data-value={typeof props.value === "string" ? props.value : ""} />
    ));
  });

  it("renders legacy CM5 path when flag is off", () => {
    spyOn(ff, "isActive").mockReturnValue(false);

    render(<CodeEditor />);

    expect(screen.getByTestId("legacy-code-editor")).toBeTruthy();
    expect(ff.isActive as Mock<any>).toHaveBeenCalledWith(ff.FF_FIT_2007_VIRTUALIZED_JSON_EDITOR);
  });

  it("renders CM6 shim when flag is on", () => {
    spyOn(ff, "isActive").mockReturnValue(true);

    render(<CodeEditor />);

    expect(screen.getByTestId("cm6-code-editor")).toBeTruthy();
    expect(ff.isActive as Mock<any>).toHaveBeenCalledWith(ff.FF_FIT_2007_VIRTUALIZED_JSON_EDITOR);
  });

  it("forwards value prop to CM6 without controlled flag (CM5 UnControlled compat)", () => {
    spyOn(ff, "isActive").mockReturnValue(true);

    render(
      <CodeEditor
        value="<View><Text name='text' value='$text'/></View>"
        options={{ mode: "xml", lineNumbers: true }}
      />,
    );

    const editor = screen.getByTestId("cm6-code-editor");
    expect(editor.getAttribute("data-value")).toContain("<View>");
  });
});
