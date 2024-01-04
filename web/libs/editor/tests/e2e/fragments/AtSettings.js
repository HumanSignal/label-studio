const { I } = inject();

module.exports = {
  GENERAL_SETTINGS: {
    SHOW_LABELS: 'Show labels inside the regions',
    AUTO_SELECT_REGION: 'Select regions after creating',
  },
  LAYOUT_SETTINGS: {
    VERTICAL_LAYOUT: 'Move sidepanel to the bottom',
  },
  _openButtonLocator: locate('button[aria-label="Settings"]'),
  _closeButtonLocator: locate('button[aria-label="Close"]'),
  _modalLocator: locate('.ant-modal'),
  _tabLocator: locate('.ant-tabs-tab'),
  _activeTabLocator: locate('.ant-tabs-tab-active'),
  open() {
    I.click(this._openButtonLocator);
    I.seeElement(this._modalLocator);
  },
  close() {
    I.click(this._closeButtonLocator);
    I.waitToHide(this._modalLocator);
  },
  _setSettings(settings = {}) {
    for (const [setting, value] of Object.entries(settings)) {
      if (value) {
        I.dontSeeCheckboxIsChecked(setting);
        I.checkOption(setting);
        I.seeCheckboxIsChecked(setting);
      } else {
        I.seeCheckboxIsChecked(setting);
        I.uncheckOption(setting);
        I.dontSeeCheckboxIsChecked(setting);
      }
    }
  },
  goToTab(tabName) {
    I.click(this._tabLocator.withText(tabName));
    I.seeElement(this._activeTabLocator.withText(tabName));
  },
  setGeneralSettings(settings = {}) {
    this.goToTab('General');
    this._setSettings(settings);
  },
  setLayoutSettings(settings = {}) { 
    this.goToTab('Layout');
    this._setSettings(settings);
  },
};
