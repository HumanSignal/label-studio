import fs from "node:fs";
import path from "node:path";

/**
 * The Order by control is a segmented pair: the ColumnPicker trigger and the sort-direction
 * button, wrapped in a collapsed ButtonGroup. ButtonGroup collapses the pair down to a single
 * divider with sibling selectors (`button:not(:first-child)`, `button:last-child`), which only
 * hold while both halves are direct siblings.
 *
 * While no ordering is set the sort button is disabled, and Tooltip wraps disabled children in a
 * `display: contents` span. The span keeps the layout intact but breaks the sibling relationship,
 * so both halves painted their own border and kept their rounded corners — a doubled divider.
 * These tests lock in the position-independent override that leaves exactly one.
 */
describe("OrderButton.prefix.css divider", () => {
  // Comments are stripped so assertions read the selectors themselves, not the prose explaining
  // them.
  const css = fs.readFileSync(path.join(__dirname, "OrderButton.prefix.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

  /**
   * Declarations inside one rule, so a declaration moving to the other half fails instead of
   * passing on a whole-file match. The selectors here carry no nested blocks, so `[^}]*` is enough.
   * `\]\s*\{` keeps the `[data-testid^="select-trigger"] > svg` caret rule out of the trigger block.
   */
  const blockFor = (selector: string) => {
    const match = css.match(new RegExp(`${selector}\\s*\\{([^}]*)\\}`));

    if (!match) throw new Error(`No rule found for selector ${selector}`);
    return match[1];
  };

  const sortButton = blockFor('button\\[data-testid="dm-order-button"\\]');
  const trigger = blockFor('button\\[data-testid\\^="select-trigger"\\]');

  it("drops the sort button's own border so only the trigger's remains", () => {
    expect(sortButton).toMatch(/border-left:\s*none/);
  });

  it("squares the corners on both sides of the divider", () => {
    expect(sortButton).toMatch(/border-top-left-radius:\s*0/);
    expect(sortButton).toMatch(/border-bottom-left-radius:\s*0/);
    expect(trigger).toMatch(/border-top-right-radius:\s*0/);
    expect(trigger).toMatch(/border-bottom-right-radius:\s*0/);
  });

  it("leaves the outer corners of the control rounded", () => {
    // Only the two edges that meet at the divider are squared; squaring the outer edges would
    // flatten the whole control.
    expect(sortButton).not.toMatch(/border-top-right-radius/);
    expect(sortButton).not.toMatch(/border-bottom-right-radius/);
    expect(trigger).not.toMatch(/border-top-left-radius/);
    expect(trigger).not.toMatch(/border-bottom-left-radius/);
  });

  it("never hides the remaining divider", () => {
    // The pair must always read as one segmented control with a single seam. Hiding the trigger's
    // right border would leave the two halves with no divider at all while idle.
    expect(trigger).not.toMatch(/border-right-color:\s*transparent/);
    expect(trigger).not.toMatch(/border-right:\s*none/);
    expect(trigger).not.toMatch(/border-right-width:\s*0/);
  });

  it("targets the trigger with the prefix Select actually generates", () => {
    // Select builds that testid itself and appends the selected value, so the prefix is a
    // cross-library contract: if Select's default stops starting with `select-trigger`, this CSS
    // silently stops applying. Asserted against the source rather than a render, because a render
    // depends on whichever module mocks other suites left behind.
    const selectSource = fs.readFileSync(path.join(__dirname, "../../../../../ui/src/lib/select/select.tsx"), "utf8");

    expect(selectSource).toMatch(/`select-trigger\$\{/);
  });
});
