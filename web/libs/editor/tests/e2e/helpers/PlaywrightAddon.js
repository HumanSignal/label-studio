const Helper = require('@codeceptjs/helper');
const ElementNotFound = require('codeceptjs/lib/helper/errors/ElementNotFound');

function assertElementExists(res, locator, prefix, suffix) {
  if (!res || res.length === 0) {
    throw new ElementNotFound(locator, prefix, suffix);
  }
}

class PlaywrightAddon extends Helper {
  /**
   * Grab CSS property for given locator with pseudo element
   * Resumes test execution, so **should be used inside an async function with `await`** operator.
   * If more than one element is found - value of first element is returned.
   *
   * ```js
   * const value = await I.grabCssPropertyFromPseudo('h3', 'font-weight', 'after');
   * ```
   *
   * @param {CodeceptJS.LocatorOrString} locator element located by CSS|XPath|strict locator.
   * @param {string} cssProperty CSS property name.
   * @param {string} pseudoElement Pseudo element name.
   * @returns {Promise<string>} CSS value
   */
  async grabCssPropertyFromPseudo(locator, cssProperty, pseudoElement) {
    const cssValues = await this.grabCssPropertyFromAllPseudo(locator, cssProperty, pseudoElement);

    assertElementExists(cssValues, locator);
    this.helpers.Playwright.debugSection('CSS', cssValues[0]);
    return cssValues[0];
  }

  /**
   * Grab array of CSS properties for given locator with pseudo element
   * Resumes test execution, so **should be used inside an async function with `await`** operator.
   *
   * ```js
   * const values = await I.grabCssPropertyFromAllPseudo('h3', 'font-weight', 'after');
   * ```
   *
   * @param {CodeceptJS.LocatorOrString} locator element located by CSS|XPath|strict locator.
   * @param {string} cssProperty CSS property name.
   * @param {string} pseudoElement Pseudo element name.
   * @returns {Promise<string[]>} CSS value
   */
  async grabCssPropertyFromAllPseudo(locator, cssProperty, pseudoElement) {
    const els = await this.helpers.Playwright._locate(locator);

    this.helpers.Playwright.debug(`Matched ${els.length} elements`);
    return await Promise.all(els.map(el => el.$eval('xpath=.', (el, {
      cssProperty,
      pseudoElement,
    }) => getComputedStyle(el, pseudoElement).getPropertyValue(cssProperty), { cssProperty, pseudoElement })));
  }
}

module.exports = PlaywrightAddon;
