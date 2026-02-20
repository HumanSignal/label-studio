const { I } = inject();

const SETTING_TO_PROP = {
  "Show labels inside the regions": "showLabels",
  "Select regions after creating": "selectAfterCreate",
};

module.exports = {
  GENERAL_SETTINGS: {
    SHOW_LABELS: "Show labels inside the regions",
    AUTO_SELECT_REGION: "Select regions after creating",
  },
  LAYOUT_SETTINGS: {
    VERTICAL_LAYOUT: "Move sidepanel to the bottom",
  },
  _openButtonLocator: locate('button[aria-label="Settings"]'),
  _closeButtonLocator: locate('button[aria-label="Close"]'),
  _modalLocator: locate(".ant-modal"),
  _tabLocator: locate(".ant-tabs-tab"),
  _activeTabLocator: locate(".ant-tabs-tab-active"),
  open() {
    I.click(this._openButtonLocator);
    I.seeElement(this._modalLocator);
    I.waitTicks(3);
  },
  close() {
    I.click(this._closeButtonLocator);
    I.waitToHide(this._modalLocator);
    I.waitTicks(3);
  },
  setGeneralSettings(settings = {}) {
    const toggles = {};

    for (const [settingLabel, value] of Object.entries(settings)) {
      const prop = SETTING_TO_PROP[settingLabel];

      if (!prop) throw new Error(`Unknown setting: "${settingLabel}"`);
      toggles[prop] = value;
    }
    I.executeScript((toggles) => {
      const settings = window.Htx.settings;

      for (const [prop, desired] of Object.entries(toggles)) {
        if (Boolean(settings[prop]) !== Boolean(desired)) {
          const eventName = "toggle" + prop.charAt(0).toUpperCase() + prop.slice(1);

          settings[eventName]();
        }
      }
    }, toggles);
  },
  setLayoutSettings(settings = {}) {
    if (settings[this.LAYOUT_SETTINGS.VERTICAL_LAYOUT] !== undefined) {
      I.executeScript((shouldBeBottom) => {
        const isBottom = window.Htx.settings.bottomSidePanel;

        if (Boolean(isBottom) !== Boolean(shouldBeBottom)) {
          window.Htx.settings.toggleBottomSP();
        }
      }, settings[this.LAYOUT_SETTINGS.VERTICAL_LAYOUT]);
    }
  },
};
