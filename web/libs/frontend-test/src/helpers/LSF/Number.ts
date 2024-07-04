class NumberHelper {
  private get _baseRootSelector() {
    return ".lsf-number";
  }

  private _rootSelector: string;

  constructor(rootSelector) {
    this._rootSelector = rootSelector.replace(/^\&/, this._baseRootSelector);
  }

  get root() {
    return cy.get(this._rootSelector);
  }

  get input() {
    return this.root.find('[type="number"]');
  }

  type(text: string) {
    this.input.type(text);
  }

  hasValue(value: string) {
    this.input.should("have.value", value);
  }
}

const Number = new NumberHelper("&:eq(0)");
const useNumber = (rootSelector: string) => {
  return new NumberHelper(rootSelector);
};

export { Number, useNumber };
