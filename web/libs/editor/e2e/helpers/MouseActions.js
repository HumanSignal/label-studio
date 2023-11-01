const Helper = require('@codeceptjs/helper');

const getPage = (h) => {
  return (h.Puppeteer ?? h.Playwright).page;
};

class MouseActions extends Helper {
  clickAt(x, y, buttonName = 'left') {
    const page = getPage(this.helpers);

    return page.mouse.click(x, y, { button: buttonName, delay: 80 });
  }
  dblClickAt(x, y, buttonName = 'left') {
    const page = getPage(this.helpers);

    return page.mouse.click(x, y, { button: buttonName, delay: 80, clickCount: 2 });
  }
  pressMouseDown(buttonName = 'left') {
    const page = getPage(this.helpers);

    return page.mouse.down({ button: buttonName });
  }
  pressMouseUp(buttonName = 'left') {
    const page = getPage(this.helpers);

    return page.mouse.up({ button: buttonName });
  }
  moveMouse(x, y, steps = 1) {
    const page = getPage(this.helpers);

    return page.mouse.move(x, y, { steps });
  }

  /**
   * Mouse wheel action
   * @param {{deltaY: number, deltaX: number}} deltas
   */
  mouseWheel({ deltaX = 0, deltaY = 0 }) {
    const page = getPage(this.helpers);

    return page.mouse.wheel(deltaX, deltaY);
  }

  /**
   * Drag action from point to point
   * @param {object} from
   * @param {number} from.x
   * @param {number} from.y
   * @param {object} to
   * @param {number} to.x
   * @param {number} to.y
   * @param {'left'|'right'|'middle'} [button='left']
   * @param {number} [steps=1]
   * @returns {Promise<void>}
   */
  async dragAndDropMouse(from, to, button = 'left', steps = 1) {
    const page = getPage(this.helpers);

    await page.mouse.move(from.x, from.y, { steps });
    await page.mouse.down({ button });
    await page.mouse.move(to.x, to.y, { steps });
    await page.mouse.up({ button });
  }
}

module.exports = MouseActions;
