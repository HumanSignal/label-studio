const { I } = inject();

class Taxonomy {
  rootBase = '//div[contains(concat(" ", @class, " "), " taxonomy ")]'; // [./child::*[class*="taxonomy--"]]
  input = '[class*="taxonomy--"]';
  selectedList = '[class*="taxonomy__selected"]';
  item = '[class*="taxonomy__item"]';
  group = '[class*="taxonomy__grouping"]';
  search = '[class*="taxonomy__search"]';
  newItemField = '[name="taxonomy__add"]';
  itemActions = '[class*="taxonomy__extra_actions"]';

  constructor(config = {}) {
    if (config.index) {
      this.root = `.${this.rootBase}${[config.index]}`;
    } else if (config.selector) {
      this.root = `${config.selector}${this.rootBase}`;
    } else {
      this.root = `.${this.rootBase}`;
    }
  }

  locateTaxonomy() {
    return locate(this.root);
  }

  locate(locator) {
    return locator ? locate(locator).inside(this.locateTaxonomy()) : this.locateTaxonomy();
  }

  locateInput() {
    return this.locate(this.input);
  }

  locateItemByText(itemText) {
    return this.locate(this.item).withDescendant(`.//label[text()='${itemText}']`);
  }

  locateSelectedByText(itemText) {
    return this.locate(this.selectedList).find('./div').withDescendant(`.//*[text()='${itemText}']`);
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

  toggleGroupWithText(text) {
    I.click(this.locate(this.group).inside(this.locateItemByText(text)));
  }

  fillSearch(text) {
    I.fillField(this.locate(this.search), text);
  }

  seeItemByText(itemText) {
    I.seeElement(this.locateItemByText(itemText));
  }

  dontSeeItemByText(itemText) {
    I.dontSeeElement(this.locateItemByText(itemText));
  }

  seeCheckedItemByText(itemText) {
    I.seeElement(this.locateItemByText(itemText).withDescendant('.//input[@checked]'));
  }

  dontSeeCheckedItemByText(itemText) {
    I.dontSeeElement(this.locateItemByText(itemText).withDescendant('.//input[@checked]'));
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

  clickItemByText(itemText) {
    this.clickItem(this.locateItemByText(itemText));
  }

  clickAdd() {
    I.click(this.locate('button').withText('Add'));
  }

  fillNewItem(value) {
    I.fillField(this.locate(this.newItemField), value);
    I.pressKey('Enter');
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
    I.click(locate('.ant-dropdown-menu-item').withText('Add Inside'));
  }

  clickDelete() {
    I.click(locate('.ant-dropdown-menu-item').withText('Delete'));
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
