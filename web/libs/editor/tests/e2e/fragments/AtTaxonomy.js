const { I } = inject();

class Taxonomy {
  rootBase = '//div[contains(concat(" ", @class, " "), " taxonomy ")]';

  // The clickable input area — .htx-taxonomy works for both old and new components
  input = ".htx-taxonomy";

  // NewTaxonomy (Ant Design TreeSelect) renders its dropdown in a portal
  dropdown = ".htx-taxonomy-dropdown";

  // Ant Design tree node selectors (inside the dropdown portal)
  treeNode = ".ant-select-tree-treenode";
  treeSwitcher = ".ant-select-tree-switcher";
  treeTitle = ".ant-select-tree-title";
  treeCheckbox = ".ant-select-tree-checkbox";

  // Search input in dropdown (NewTaxonomy)
  search = '[data-testid="taxonomy-search"]';

  // Legacy (old Taxonomy) selectors — CSS module classes
  legacyItem = '[class*="taxonomy__item"]';
  legacyGroup = '[class*="taxonomy__grouping"]';
  legacySearch = '[class*="taxonomy__search"]';
  legacySelectedList = '[class*="taxonomy__selected"]';
  newItemField = '[name="taxonomy__add"]';
  itemActions = '[class*="taxonomy__extra_actions"]';

  /**
   * Whether the fragment is operating in legacy mode.
   * Set to true when the config uses legacy="true" on <Taxonomy>.
   * Call setLegacy(true) at the start of such tests.
   */
  _legacy = false;

  /**
   * Dynamic properties that change with legacy mode.
   * Initialized to NewTaxonomy values (the default).
   * Updated by setLegacy().
   *
   * Using explicit properties instead of getters to avoid potential
   * issues with CodeceptJS's module injection system.
   */
  item = ".ant-select-tree-treenode";
  group = ".ant-select-tree-switcher";
  selectedList = ".ant-select-selection-overflow";

  constructor(config = {}) {
    if (config.index) {
      this.root = `.${this.rootBase}${[config.index]}`;
    } else if (config.selector) {
      this.root = `${config.selector}${this.rootBase}`;
    } else {
      this.root = `.${this.rootBase}`;
    }
  }

  /**
   * Switch between NewTaxonomy and legacy Taxonomy selectors.
   * Call setLegacy(true) at the start of tests that use legacy="true" in config.
   */
  setLegacy(value) {
    this._legacy = !!value;
    // Update dynamic properties
    this.item = this._legacy ? this.legacyItem : this.treeNode;
    this.group = this._legacy ? this.legacyGroup : this.treeSwitcher;
    this.selectedList = this._legacy ? this.legacySelectedList : ".ant-select-selection-overflow";
  }

  locateTaxonomy() {
    return locate(this.root);
  }

  /**
   * Locate an element inside the taxonomy root wrapper.
   */
  locate(locator) {
    return locator ? locate(locator).inside(this.locateTaxonomy()) : this.locateTaxonomy();
  }

  /**
   * Locate an element inside the Ant Design dropdown portal.
   * NewTaxonomy renders tree items in a portal appended to <body>.
   */
  locateInDropdown(locator) {
    return locate(locator).inside(locate(this.dropdown));
  }

  locateInput() {
    return this.locate(this.input);
  }

  /**
   * Locate a tree item by its visible text.
   *
   * - NewTaxonomy: items are .ant-select-tree-treenode in a portal dropdown.
   *   Uses exact text match (normalize-space(.)='text') to avoid substring issues
   *   (e.g. "Four" matching "Four to seven" with contains()).
   * - Legacy: items have CSS module class taxonomy__item inside the root
   */
  locateItemByText(itemText) {
    if (this._legacy) {
      return this.locate(this.legacyItem).withDescendant(`.//label[text()='${itemText}']`);
    }
    // Exact text match via XPath to prevent substring matching (e.g. "Four" in "Four to seven")
    const exactTitleXpath = `.//*[contains(concat(' ', normalize-space(@class), ' '), ' ant-select-tree-title ')][normalize-space(.)='${itemText}']`;
    return this.locateInDropdown(this.treeNode).withDescendant(exactTitleXpath);
  }

  /**
   * Locate a selected value tag.
   *
   * - NewTaxonomy: .ant-select-selection-item with text in .ant-select-selection-item-content
   * - Legacy: div inside .htx-taxonomy-selected with text in span
   */
  locateSelectedByText(itemText) {
    if (this._legacy) {
      return this.locate(this.legacySelectedList).find("./div").withDescendant(`.//*[text()='${itemText}']`);
    }
    return this.locate(".ant-select-selection-item").withDescendant(
      locate(".ant-select-selection-item-content").withText(itemText),
    );
  }

  locateActions(itemLocator) {
    let actionsLocator = this.locate(this.itemActions);

    if (itemLocator) {
      actionsLocator = actionsLocator.inside(itemLocator);
    }
    return actionsLocator;
  }

  seeTaxonomy() {
    I.seeElement(this.locateInput());
  }

  dontSeeTaxonomy() {
    I.dontSeeElement(this.locateInput());
  }

  clickTaxonomy() {
    I.click(this.locateInput());
  }

  /**
   * Expand or collapse a group (parent node) in the tree.
   *
   * - NewTaxonomy: clicks the .ant-select-tree-switcher inside the treenode
   * - Legacy: clicks the taxonomy__grouping element inside the item
   */
  toggleGroupWithText(text) {
    if (this._legacy) {
      I.click(this.locate(this.legacyGroup).inside(this.locateItemByText(text)));
    } else {
      I.click(locate(this.treeSwitcher).inside(this.locateItemByText(text)));
    }
  }

  fillSearch(text) {
    if (this._legacy) {
      I.fillField(this.locate(this.legacySearch), text);
    } else {
      I.fillField(this.locateInDropdown(this.search), text);
    }
  }

  seeItemByText(itemText) {
    I.seeElement(this.locateItemByText(itemText));
  }

  dontSeeItemByText(itemText) {
    I.dontSeeElement(this.locateItemByText(itemText));
  }

  /**
   * Assert that a tree item is checked.
   *
   * - NewTaxonomy: .ant-select-tree-checkbox-checked inside the treenode
   * - Legacy: input[checked] inside the item
   */
  seeCheckedItemByText(itemText) {
    if (this._legacy) {
      I.seeElement(this.locateItemByText(itemText).withDescendant(".//input[@checked]"));
    } else {
      I.seeElement(this.locateItemByText(itemText).withDescendant(".ant-select-tree-checkbox-checked"));
    }
  }

  dontSeeCheckedItemByText(itemText) {
    if (this._legacy) {
      I.dontSeeElement(this.locateItemByText(itemText).withDescendant(".//input[@checked]"));
    } else {
      I.dontSeeElement(this.locateItemByText(itemText).withDescendant(".ant-select-tree-checkbox-checked"));
    }
  }

  seeSelectedValues(selectedValues) {
    if (!Array.isArray(selectedValues)) {
      selectedValues = [selectedValues];
    }
    for (const value of selectedValues) {
      I.seeElement(this.locateSelectedByText(value));
    }
  }

  dontSeeSelectedValues(selectedValues) {
    if (!Array.isArray(selectedValues)) {
      selectedValues = [selectedValues];
    }
    for (const value of selectedValues) {
      I.dontSeeElement(this.locateSelectedByText(value));
    }
  }

  clickItem(itemLocator) {
    I.click(itemLocator);
  }

  /**
   * Click a tree item to toggle its selection.
   *
   * - NewTaxonomy: rc-tree-select maps both onCheck (checkbox click) and onSelect
   *   (content-wrapper click) to the same onInternalSelect handler. Clicking the
   *   title text is the most reliable approach — the click bubbles to the content
   *   wrapper which fires onSelectorClick → onInternalSelect → onChange.
   *   We use an exact-match XPath for the title to avoid "Four" matching "Four to seven".
   * - Legacy: clicking the item element (which contains the checkbox) works.
   */
  clickItemByText(itemText) {
    if (this._legacy) {
      this.clickItem(this.locateItemByText(itemText));
    } else {
      // Click the title text directly — bubbles to the content wrapper's onSelectorClick
      const exactTitleXpath = `.//*[contains(concat(' ', normalize-space(@class), ' '), ' ant-select-tree-title ')][normalize-space(.)='${itemText}']`;
      I.click(locate(exactTitleXpath).inside(locate(this.dropdown)));
    }
  }

  // ----- Legacy-only methods (require legacy="true" in config) -----

  clickAdd() {
    I.click(this.locate("button").withText("Add"));
  }

  fillNewItem(value) {
    I.fillField(this.locate(this.newItemField), value);
    I.pressKey("Enter");
  }

  addNewItem(value) {
    this.clickAdd();
    this.fillNewItem(value);
  }

  addItemInside(value, itemLocator) {
    this.expandItemMenu(itemLocator);
    this.clickAddInside();
    this.fillNewItem(value);
  }

  deleteItem(itemLocator) {
    this.expandItemMenu(itemLocator);
    this.clickDelete();
  }

  expandItemMenu(itemLocator) {
    const toggleLocator = this.locateActions(itemLocator);

    I.moveCursorTo(toggleLocator, 5, 5);
    I.click(toggleLocator);
  }

  clickAddInside() {
    I.click(locate(".ant-dropdown-menu-item").withText("Add Inside"));
  }

  clickDelete() {
    I.click(locate(".ant-dropdown-menu-item").withText("Delete"));
  }
}

module.exports = new Taxonomy();
/**
 * Create AtTaxonomy with specific root selector
 * @param {number} index - can be selector or just an index
 * @returns {AtTaxonomy}
 */
module.exports.useTaxonomyAt = (index) => {
  return new Taxonomy({ index });
};
/**
 * Create AtTaxonomy with specific root selector
 * @param {string} selector - selector of an ancestor element
 * @returns {AtTaxonomy}
 */
module.exports.useTaxonomyInside = (selector) => {
  return new Taxonomy({ selector });
};
