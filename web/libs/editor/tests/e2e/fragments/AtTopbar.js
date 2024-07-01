const { I } = inject();

module.exports = {
  _topbarLocator: locate({ css: ".lsf-topbar" }),
  _bottombarLocator: locate({ css: ".lsf-bottombar" }),
  _annotationsList: locate({ css: ".lsf-annotations-carousel" }),
  _annotationsListItemSelector: ".lsf-annotation-button",
  _annotationContextMenuLocator: ".lsf-annotation-button__contextMenu",
  seeAnnotationAt(index = 0) {
    I.seeElement(this._annotationsList.find(this._annotationsListItemSelector).at(index));
  },
  selectAnnotationAt(index = 0) {
    I.click(this._annotationsList.find(this._annotationsListItemSelector).at(index));
  },
  see(text) {
    I.see(text, ["Submit", "Update"].includes(text) ? this._bottombarLocator : this._topbarLocator);
  },
  dontSee(text) {
    I.dontSee(text, ["Submit", "Update"].includes(text) ? this._bottombarLocator : this._topbarLocator);
  },
  seeElement(locator) {
    I.seeElement(this.locate(locator));
  },
  clickText(text) {
    I.click(this._topbarLocator.withText(`${text}`));
  },
  clickAria(label) {
    I.click(this.locate(this._annotationContextMenuLocator));
    I.click(`[aria-label="${label}"]`, this._topbarLocator);
  },
  click(locator) {
    I.click(this.locate(locator));
  },
  locate(locator) {
    return this._topbarLocator.find(locator);
  },
};
