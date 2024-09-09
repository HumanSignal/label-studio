class RankerHelper {
  private get _baseRootSelector() {
    return ".htx-ranker-column";
  }

  private _rootSelector: string;

  constructor(rootSelector) {
    this._rootSelector = rootSelector.replace(/^\&/, this._baseRootSelector);
  }

  get root() {
    return cy.get(this._rootSelector);
  }
}

const Ranker = new RankerHelper("&:eq(0)");
const useRanker = (rootSelector: string) => {
  return new RankerHelper(rootSelector);
};

export { Ranker, useRanker };
