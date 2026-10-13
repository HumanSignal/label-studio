import fs from "node:fs";
import path from "node:path";

/**
 * DM view-tab titles (`.lsf-tabs-dm__item-title`) used to inherit font-size. Opening Quick View
 * loads editor CSS (`.lsf-root { font-size: 14px }`), which stays on the page after closing QV and
 * shrinks tab titles (16px → 14px). Pinning an explicit design token keeps the size stable.
 */
describe("Tabs.prefix.css item-title font size", () => {
  const css = fs.readFileSync(path.join(__dirname, "Tabs.prefix.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

  const itemTitleBlock = (() => {
    const match = css.match(/&__item-title\s*\{([^}]*)\}/);

    if (!match) throw new Error("No rule found for &__item-title");
    return match[1];
  })();

  it("pins font-size to the label-small design token so Quick View cannot change tab title size", () => {
    expect(itemTitleBlock).toMatch(/font-size:\s*var\(--font-size-label-small\)/);
  });
});
