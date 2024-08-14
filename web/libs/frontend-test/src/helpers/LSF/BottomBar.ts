class BottomBarHelper {
  private get _baseRootSelector() {
    return ".lsf-bottombar";
  }

  private _rootSelector: string;
  private _controlsSelector = ".lsf-controls";

  constructor(rootSelector) {
    this._rootSelector = rootSelector.replace(/^\&/, this._baseRootSelector);
  }

  get root() {
    return cy.get(this._rootSelector);
  }

  get controls() {
    return this.root.find(this._controlsSelector);
  }

  get controlButtons() {
    return this.controls.find("button");
  }
}

const BottomBar = new BottomBarHelper("&:eq(0)");
const useBottomBar = (rootSelector: string) => {
  return new BottomBarHelper(rootSelector);
};

export { BottomBar, useBottomBar };
