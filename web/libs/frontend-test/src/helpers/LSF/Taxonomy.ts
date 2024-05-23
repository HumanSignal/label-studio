class TaxonomyHelper {
  private get _baseRootSelector() {
    return ".taxonomy";
  }

  public selectors = {
    root: this._baseRootSelector,
    selected: ".htx-taxonomy-selected",
    input: ".htx-taxonomy",
    dropdown: "[class^=taxonomy__dropdown]",
    item: "[class^=taxonomy__item]",
    open: '[class*="taxonomy_open--"]',
    closed: ':not([class*="taxonomy_open--"])',
  };

  private _new_selectors = {
    root: this._baseRootSelector,
    selected: ".ant-select-selector",
    input: ".htx-taxonomy",
    dropdown: ".ant-select-dropdown",
    item: ".ant-select-tree-treenode",
    open: ".ant-select-open",
    closed: ":not(.ant-select-open)",
  };

  public isNew = false;

  constructor(rootSelector, isNew = false) {
    if (isNew) this.selectors = this._new_selectors;
    this.selectors.root = rootSelector.replace(/^\&/, this._baseRootSelector);
    this.isNew = isNew;
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
    return this.isNew ? cy.get(this.selectors.dropdown) : this.root.find(this.selectors.dropdown);
  }
  findItem(text) {
    return this.dropdown.contains(this.selectors.item, text).scrollIntoView();
  }
  hasSelected(text) {
    return this.selected.contains("div", text).should("exist");
  }
  hasNoSelected(text) {
    return this.selected.contains("div", text).should("not.exist");
  }
  open() {
    this.input.filter(this.selectors.closed).click();
  }
  close() {
    this.input.filter(this.selectors.open).click();
  }
}

const Taxonomy = new TaxonomyHelper("&:eq(0)");
const useTaxonomy = (rootSelector: string, isNew = false) => {
  return new TaxonomyHelper(rootSelector, isNew);
};

export { Taxonomy, useTaxonomy };
