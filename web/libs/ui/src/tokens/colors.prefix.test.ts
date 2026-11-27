import fs from "node:fs";
import path from "node:path";
import postcss, { type Declaration, type Rule } from "postcss";

/**
 * Native form controls (number spinners, date/time pickers, select popups, scrollbars) only follow the
 * app theme when the CSS `color-scheme` property says so. Declaring it on the dark theme root makes every
 * control adapt instead of patching one input type at a time.
 */
describe("colors.prefix.css color-scheme", () => {
  const root = postcss.parse(fs.readFileSync(path.join(__dirname, "colors.prefix.css"), "utf8"));

  const findRule = (selector: string, parent: postcss.Container = root) => {
    let found: Rule | undefined;

    parent.each((node) => {
      if (node.type === "rule" && node.selector === selector) found = node;
    });
    if (!found) throw new Error(`No rule found for ${selector}`);
    return found;
  };

  const ownDeclaration = (rule: Rule, prop: string) =>
    rule.nodes.find((node): node is Declaration => node.type === "decl" && node.prop === prop)?.value;

  const darkTheme = findRule('[data-color-scheme="dark"]');

  it("puts the whole dark theme on the dark color scheme so native controls adapt", () => {
    expect(ownDeclaration(darkTheme, "color-scheme")).toBe("dark");
  });

  it("keeps iframes on the normal color scheme so embedded documents stay transparent", () => {
    expect(ownDeclaration(findRule("& iframe", darkTheme), "color-scheme")).toBe("normal");
  });
});
