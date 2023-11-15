const { I } = inject();

module.exports = {
  async getElementPosition(elementSelector) {
    const pos = await I.executeScript((selector) => {
      const elem = document.querySelector(selector);
      const pos = elem?.getBoundingClientRect();

      return pos ? {
        x: pos.x,
        y: pos.y,
        width: pos.width,
        height: pos.height,
      } : null;
    }, elementSelector);

    return pos;
  },
};
