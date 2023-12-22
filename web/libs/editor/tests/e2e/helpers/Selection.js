const Helper = require('@codeceptjs/helper');

const getPage = (h) => {
  return (h.Puppeteer ?? h.Playwright).page;
};

class Selection extends Helper {
  async dblClickOnWord(text, parent = '*') {
    const page = getPage(this.helpers);
    const { mouse } = page;
    const xpath = [locate(parent).toXPath(),`//text()[contains(., '${text}')]`,'[last()]'].join('');
    const point = await page.evaluate(({ xpath, text })=>{
      const textEl = document.evaluate(xpath, document, null, XPathResult.ANY_TYPE, null).iterateNext();
      const pos = textEl.wholeText.search(text);
      const range = new Range();

      range.setStart(textEl, pos);
      range.setEnd(textEl, pos+1);
      const bbox = range.getBoundingClientRect();

      return {
        x: (bbox.left + bbox.right) / 2,
        y: (bbox.top + bbox.bottom) / 2,
      };
    },{ xpath, text });

    return mouse.click(point.x, point.y, { button: 'left', clickCount: 2, delay: 50 });
  }
  async dblClickOnElement(elementLocator) {
    const page = getPage(this.helpers);
    const { mouse } = page;
    const elsXpath = locate(elementLocator).toXPath();
    const point = await page.evaluate((elsXpath)=>{
      const el = document.evaluate(elsXpath, document, null, XPathResult.ANY_TYPE, null).iterateNext();
      const bbox = el.getBoundingClientRect();

      return {
        x: (bbox.left + bbox.right) / 2,
        y: (bbox.top + bbox.bottom) / 2,
      };
    },elsXpath);

    return mouse.click(point.x, point.y, { button: 'left', clickCount: 2, delay: 50 });
  }
  async setSelection(startLocator, startOffset, endLocator, endOffset) {
    const page = getPage(this.helpers);
    const startContainerXPath = locate(startLocator).toXPath();
    const endContainerXPath = locate(endLocator).toXPath();

    await page.evaluate(({ startContainerXPath, startOffset, endContainerXPath, endOffset })=>{
      const startContainer = document.evaluate(startContainerXPath, document, null, XPathResult.ANY_TYPE, null).iterateNext();
      const endContainer = document.evaluate(endContainerXPath, document, null, XPathResult.ANY_TYPE, null).iterateNext();
      const range = new Range();

      range.setStart(startContainer, startOffset);
      range.setEnd(endContainer, endOffset);

      const selection = window.getSelection();

      selection.removeAllRanges();
      selection.addRange(range);
      const evt = new MouseEvent('mouseup');

      evt.initMouseEvent('mouseup', true, true);
      endContainer.dispatchEvent(evt);
    },{ startContainerXPath, startOffset, endContainerXPath, endOffset });
  }
}

module.exports = Selection;
