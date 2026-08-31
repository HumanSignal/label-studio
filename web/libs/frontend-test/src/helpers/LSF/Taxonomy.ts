class TaxonomyHelper {
  private get _baseRootSelector() {
    return ".taxonomy";
  }

  /**
   * Whether the fragment is operating in legacy mode.
   * NewTaxonomy (Popover + tree) is the default since the FF_TAXONOMY_ASYNC
   * flag was removed. Set isLegacy = true only when the config uses legacy="true".
   */
  public isLegacy: boolean;

  /**
   * Active selectors — set based on isLegacy in the constructor.
   */
  public selectors: {
    root: string;
    selected: string;
    input: string;
    dropdown: string;
    item: string;
    open: string;
    closed: string;
  };

  private _legacySelectors = {
    root: this._baseRootSelector,
    selected: ".htx-taxonomy-selected",
    input: ".htx-taxonomy",
    dropdown: "[class^=taxonomy__dropdown]",
    item: "[class^=taxonomy__item]",
    open: '[class*="taxonomy_open--"]',
    closed: ':not([class*="taxonomy_open--"])',
  };

  private _newSelectors = {
    root: this._baseRootSelector,
    selected: ".htx-taxonomy-trigger",
    input: ".htx-taxonomy",
    /** Portaled content; closed panels are typically unmounted by Radix. */
    dropdown: ".htx-taxonomy-dropdown",
    /** Stable across Button vs plain markup; keep `.htx-taxonomy-node-title` on the same nodes for backwards compatibility. */
    item: '[data-testid="taxonomy-tree-row-label"]',
    open: '[data-taxonomy-open="true"]',
    closed: '[data-taxonomy-open="false"]',
  };

  constructor(rootSelector: string, isLegacy = false) {
    this.isLegacy = isLegacy;
    this.selectors = isLegacy ? { ...this._legacySelectors } : { ...this._newSelectors };
    this.selectors.root = rootSelector.replace(/^&/, this._baseRootSelector);
  }

  get root() {
    return cy.get(this.selectors.root);
  }

  get selected() {
    return this.root.find(this.selectors.selected);
  }

  get input() {
    return this.root.find(this.selectors.input);
  }

  get dropdown() {
    // NewTaxonomy renders its dropdown in a portal appended to <body>
    return this.isLegacy ? this.root.find(this.selectors.dropdown) : cy.get(this.selectors.dropdown);
  }

  findItem(text: string) {
    return this.dropdown.contains(this.selectors.item, text).scrollIntoView();
  }
  /** Click a taxonomy item (uses force: true so it works when dropdown is partially covered by BottomBar). */
  clickItem(text: string) {
    return this.findItem(text).click({ force: true });
  }
  hasSelected(text: string) {
    if (this.isLegacy) {
      return this.selected.contains("div", text).should("exist");
    }
    return this.root.find(".htx-taxonomy-selection-item-label").contains(text).should("exist");
  }

  hasNoSelected(text: string) {
    if (this.isLegacy) {
      return this.selected.contains("div", text).should("not.exist");
    }
    // For NewTaxonomy, check that no selection item contains the text.
    // Use the selector within root to scope appropriately.
    return this.root.find(".htx-taxonomy-selection-item-label").should("not.contain.text", text);
  }

  open() {
    if (this.isLegacy) {
      this.input.filter(this.selectors.closed).click();
    } else {
      this.input.filter(this.selectors.closed).find(".htx-taxonomy-trigger").scrollIntoView().click({ force: true });
    }
  }

  close() {
    if (this.isLegacy) {
      this.input.filter(this.selectors.open).click();
    } else {
      // Leaf selection often closes the popover; only click the trigger when still open.
      // Use jQuery filtering here to avoid Cypress `filter()` failing on empty matches.
      this.input.then(($inputs) => {
        const $open = $inputs.filter(this.selectors.open);
        if ($open.length === 0) return;
        cy.wrap($open.eq(0)).find(".htx-taxonomy-trigger").first().scrollIntoView().click({ force: true });
      });
    }
  }
}

const Taxonomy = new TaxonomyHelper("&:eq(0)");
const useTaxonomy = (rootSelector: string, isLegacy = false) => {
  return new TaxonomyHelper(rootSelector, isLegacy);
};

export { Taxonomy, useTaxonomy };
