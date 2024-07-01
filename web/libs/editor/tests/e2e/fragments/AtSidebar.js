const { I } = inject();

module.exports = {
  _sideBarLocator: locate(".lsf-sidebar-tabs"),
  _regionGroupButton: locate(".lsf-radio-group__button"),
  _regionsCounterLocator: locate(".lsf-panel-tabs__counter"),
  _regionLocator: locate(".lsf-tree-treenode"),
  _hiddenRegionLocator: locate(".lsf-tree-treenode.lsf-tree__node_hidden"),
  _regionSelectedLocator: locate(".lsf-tree-treenode-selected"),
  _regionUnselectedLocator: locate(".lsf-tree-treenode:not(.lsf-tree-treenode-selected)"),
  _selectedRegionsLocator: locate(".lsf-detailed-region"),
  seeRegions(count) {
    I.seeElement(this._regionsCounterLocator.withText(`${count}`));
  },
  seeRelations(count) {
    I.see(`Relations (${count})`, this._sideBarLocator);
  },
  dontSeeRelations() {
    I.dontSee("Relations", this._sideBarLocator);
  },
  seeSelectedRegion(text = undefined) {
    if (text) {
      I.seeElement(this._regionSelectedLocator.withText(text));
    } else {
      I.seeElement(this._selectedRegionsLocator);
    }
  },
  dontSeeSelectedRegion() {
    I.dontSeeElement(this._selectedRegionsLocator);
  },
  locate(locator) {
    return locate(this._sideBarLocator).find(locator);
  },
  locateSelectedRegion(locator) {
    return locate(this._regionSelectedLocator).find(locator);
  },
  see(text) {
    I.see(text, this._sideBarLocator);
  },
  dontSee(text) {
    I.dontSee(text, this._sideBarLocator);
  },
  seeElement(locator) {
    I.seeElement(this.locate(locator));
  },
  clickRegion(text) {
    I.click(this._regionLocator.withText(`${text}`));
  },
  hideRegion(text) {
    I.click(this._regionLocator.withText(`${text}`).find(".lsf-outliner-item__control_type_visibility"));
  },
  showRegion(text) {
    I.click(this._hiddenRegionLocator.withText(`${text}`).find(".lsf-outliner-item__control_type_visibility"));
  },
  selectTool(tool) {
    I.click(`[aria-label=${tool}-tool]`);
  },
};
