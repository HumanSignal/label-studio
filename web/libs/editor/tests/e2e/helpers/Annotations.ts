import Helper from '@codeceptjs/helper';

class Annotations extends Helper {

  get _playwright() {
    return this.helpers.Playwright;
  }

  _locateButton(text) {
    return locate('button').withText(text);
  }

  async _clickButton(text) {
    const buttonLocator = this._locateButton(text);

    await this._playwright.waitForEnabled(buttonLocator, 10);
    await this._playwright.click(buttonLocator);
  }

  async submitAnnotation() {
    await this._clickButton('Submit');
  }

  async updateAnnotation() {
    await this._clickButton('Update');
  }

  async seeAnnotationSubmitted() {
    await this._playwright.dontSeeElement(this._locateButton('Submit'));
    await this._playwright.seeElement(this._locateButton('Update'));
  }
}

module.exports = Annotations;
