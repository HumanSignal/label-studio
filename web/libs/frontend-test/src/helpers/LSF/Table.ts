class TableHelper {
  private get _baseRootSelector() {
    return ".ant-table-wrapper";
  }

  private _rootSelector: string;

  constructor(rootSelector) {
    this._rootSelector = rootSelector.replace(/^\&/, this._baseRootSelector);
  }

  get root() {
    return cy.get(this._rootSelector);
  }
}

const Table = new TableHelper("&:eq(0)");
const useTable = (rootSelector: string) => {
  return new TableHelper(rootSelector);
};

export { Table, useTable };
