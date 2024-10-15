class RatingHelper {
  private get _baseRootSelector() {
    return ".ant-rate";
  }

  private _rootSelector: string;

  constructor(rootSelector) {
    this._rootSelector = rootSelector.replace(/^\&/, this._baseRootSelector);
  }

  get root() {
    return cy.get(this._rootSelector);
  }

  get rates() {
    return this.root.find('[role="radio"]');
  }

  setValue(value: number) {
    this.rates.eq(value - 1).click();
  }

  hasValue(value: number) {
    this.rates.filter('[aria-checked="true"]').should("have.lengthOf", value);
  }
}

const Rating = new RatingHelper("&:eq(0)");
const useRating = (rootSelector: string) => {
  return new RatingHelper(rootSelector);
};

export { Rating, useRating };
