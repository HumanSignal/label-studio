class TaxonomyHelper {
  private get _baseRootSelector() {
    return ".taxonomy";
  }

  /**
   * Whether the fragment is operating in legacy mode.
   * NewTaxonomy (Ant Design TreeSelect) is the default since the FF_TAXONOMY_ASYNC
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
    // .ant-select-selector is the clickable area showing selected items
    selected: ".ant-select-selector",
    // .htx-taxonomy is the className set on TreeSelect
    input: ".htx-taxonomy",
    // .htx-taxonomy-dropdown is the popupClassName set on TreeSelect (portal)
    dropdown: ".htx-taxonomy-dropdown",
    // Ant Design tree node inside the dropdown portal
    item: ".ant-select-tree-treenode",
    open: ".ant-select-open",
    closed: ":not(.ant-select-open)",
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
    if (this.isLegacy) {
      return this.dropdown.contains(this.selectors.item, text).scrollIntoView();
    }
    // In rc-tree-select with treeCheckable, both onSelect (clicking title) and
    // onCheck (clicking checkbox) map to the same onInternalSelect handler.
    // So clicking the title text triggers selection just like clicking the checkbox.
    // Returning the title element also makes .trigger("mouseover") work for tooltips,
    // since Ant Design's <Tooltip> wraps the title content in NewTaxonomy.
    return this.dropdown.contains(".ant-select-tree-title", text);
  }
  /** Click a taxonomy item (uses force: true so it works when dropdown is partially covered by BottomBar). */
  clickItem(text: string) {
    return this.findItem(text).click({ force: true });
  }
  hasSelected(text: string) {
    if (this.isLegacy) {
      return this.selected.contains("div", text).should("exist");
    }
    // NewTaxonomy: selected items are rendered as
    //   <span class="ant-select-selection-item">
    //     <span class="ant-select-selection-item-content">Choice 1</span>
    //   </span>
    return this.root.find(".ant-select-selection-item-content").contains(text).should("exist");
  }

  hasNoSelected(text: string) {
    if (this.isLegacy) {
      return this.selected.contains("div", text).should("not.exist");
    }
    // For NewTaxonomy, check that no selection item contains the text.
    // Use the selector within root to scope appropriately.
    return this.root.find(".ant-select-selection-item-content").should("not.contain.text", text);
  }

  open() {
    if (this.isLegacy) {
      this.input.filter(this.selectors.closed).click();
    } else {
      // Must click .ant-select-selector (not the outer .htx-taxonomy wrapper)
      // because Ant Design TreeSelect's open/close handler lives on the selector.
      // force:true is needed because a previously-closed taxonomy's dropdown portal
      // (containing a search input) can linger in the DOM and overlap the selector.
      this.input.filter(this.selectors.closed).find(".ant-select-selector").scrollIntoView().click({ force: true });
    }
  }

  close() {
    if (this.isLegacy) {
      this.input.filter(this.selectors.open).click();
    } else {
      this.input.filter(this.selectors.open).find(".ant-select-selector").scrollIntoView().click({ force: true });
    }
  }
}

const Taxonomy = new TaxonomyHelper("&:eq(0)");
const useTaxonomy = (rootSelector: string, isLegacy = false) => {
  return new TaxonomyHelper(rootSelector, isLegacy);
};

export { Taxonomy, useTaxonomy };
