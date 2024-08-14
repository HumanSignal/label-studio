class CollapseHelper {
  private get _baseRootSelector() {
    return ".ant-collapse";
  }

  private _rootSelector: string;

  constructor(rootSelector) {
    this._rootSelector = rootSelector.replace(/^\&/, this._baseRootSelector);
  }

  get root() {
    return cy.get(this._rootSelector);
  }

  get panels() {
    return this.root.find(".ant-collapse-item");
  }

  findPanel(text: string) {
    return this.panels.contains(".ant-collapse-item", text);
  }

  getPanelByIdx(idx: number) {
    return this.panels.eq(idx);
  }
}

const Collapse = new CollapseHelper("&:eq(0)");
const useCollapse = (rootSelector: string) => {
  return new CollapseHelper(rootSelector);
};

export { Collapse, useCollapse };
