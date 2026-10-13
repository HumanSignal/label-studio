import fs from "node:fs";
import path from "node:path";
import postcss, { type Declaration, type Rule } from "postcss";
import { RESIZE_HANDLE_TAG } from "../../../../mixins/HighlightMixin";

/**
 * Text region resize handles are custom elements injected into the highlight spans and positioned
 * absolutely without top/left, so their placement at the region edges depends on the inline static position.
 */
describe("RichText.prefix.css resize handles", () => {
  const root = postcss.parse(fs.readFileSync(path.join(__dirname, "../RichText.prefix.css"), "utf8"));

  const handleRule = (() => {
    let found: Rule | undefined;

    root.walkRules((rule) => {
      if (rule.selector === RESIZE_HANDLE_TAG && (rule.parent as Rule)?.selector === ":global(.htx-highlight)") {
        found = rule;
      }
    });
    if (!found) throw new Error("No resize handle rule found");
    return found;
  })();

  const ownDeclaration = (prop: string) =>
    handleRule.nodes.find((node): node is Declaration => node.type === "decl" && node.prop === prop)?.value;

  it("styles the element HighlightMixin injects as a handle", () => {
    expect(ownDeclaration("cursor")).toBe("col-resize");
  });

  it("keeps handles inline so they sit at the region edges", () => {
    // `block` would drop both handles onto a new line below the text.
    expect(ownDeclaration("position")).toBe("absolute");
    expect(ownDeclaration("display")).toBe("inline");
  });
});
