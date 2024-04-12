const { I } = inject();

module.exports = {
  _labelSelector: '.lsf-label',
  _selectedSelector: '.lsf-label.lsf-label_selected',
  locateLabel(text) {
    return locate(this._labelSelector).withText(text);
  },
  locateSelected() {
    return locate(this._selectedSelector);
  },
  clickLabel(text) {
    I.click(this.locateLabel(text));
  },
  seeSelectedLabel(text) {
    if (text || typeof text === 'string') {
      I.seeElement(this.locateSelected().withText(text));
    } else {
      I.seeElement(this.locateSelected());
    }
  },
  dontSeeSelectedLabel(text) {
    if (text || typeof text === 'string') {
      I.dontSeeElement(this.locateSelected().withText(text));
    } else {
      I.dontSeeElement(this.locateSelected());
    }
  },
};
