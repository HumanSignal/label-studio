import { render } from "@testing-library/react";
import { LegacyCodeEditor } from "./legacy-code-editor";

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

const schemaInfo = {
  View: {
    name: "View",
    description: "Container",
    attrs: {
      style: { name: "style", description: "CSS style", type: "string", required: false, default: "" },
      visibleWhen: { name: "visibleWhen", description: "Visibility", type: ["region-selected"], required: false },
    },
    children: ["Text"],
  },
  Text: { name: "Text", description: "Text object", attrs: {}, children: [] },
};

const getEditor = (container: HTMLElement) => (container.querySelector(".CodeMirror") as any).CodeMirror;

describe("LegacyCodeEditor XML config hint", () => {
  it("registers the schema-aware hint for the xml mode", () => {
    const { container } = render(<LegacyCodeEditor value="<View >" options={{ mode: "xml" }} />);
    const cm = getEditor(container);
    cm.setCursor({ line: 0, ch: 6 });

    const hints = cm.getHelpers(cm.getCursor(), "hint");

    expect(hints).toHaveLength(1);
    expect(hints[0](cm, { schemaInfo }).list.map((item: { text: string }) => item.text)).toEqual([
      "style",
      "visibleWhen",
    ]);
  });

  it("suggests child tags from the schema after `<`", () => {
    const { container } = render(<LegacyCodeEditor value="<View><</View>" options={{ mode: "xml" }} />);
    const cm = getEditor(container);
    cm.setCursor({ line: 0, ch: 7 });

    const [hint] = cm.getHelpers(cm.getCursor(), "hint");

    expect(hint(cm, { schemaInfo }).list.map((item: { text: string }) => item.text)).toEqual(["<Text", "</View>"]);
  });
});
