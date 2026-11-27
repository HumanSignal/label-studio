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

/**
 * HyperText task HTML keeps inline style, so `position:fixed` markup could cover the whole app as an invisible click
 * target (INT-30729). The inline HyperText container contains it and scrolls its own overflow so wide tables stay
 * reachable. <Text> escapes its data and draws resize handles 7px outside the line box, so it keeps no containment.
 */
describe("RichText.prefix.css inline container", () => {
  const root = postcss.parse(fs.readFileSync(path.join(__dirname, "../RichText.prefix.css"), "utf8"));

  const declaration = (selector: string, prop: string) => {
    let value: string | undefined;

    root.walkRules((rule) => {
      if (rule.selector === selector && (rule.parent as Rule)?.selector === ".richtext") {
        value = rule.nodes.find((node): node is Declaration => node.type === "decl" && node.prop === prop)?.value;
      }
    });
    return value;
  };

  it("keeps fixed-position HyperText markup inside the text pane", () => {
    expect(declaration("&__container_hypertext", "contain")).toBe("paint");
    expect(declaration("&__container_hypertext", "isolation")).toBe("isolate");
  });

  it("scrolls HyperText content wider than the pane instead of clipping it", () => {
    expect(declaration("&__container_hypertext", "overflow")).toBe("auto");
  });

  it("leaves the shared container uncontained so <Text> resize handles are not clipped", () => {
    expect(declaration("&__container", "overflow")).toBe("unset");
    expect(declaration("&__container", "contain")).toBeUndefined();
    expect(declaration("&__container", "isolation")).toBeUndefined();
  });
});
