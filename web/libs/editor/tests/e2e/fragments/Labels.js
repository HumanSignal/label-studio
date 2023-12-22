const { I } = inject();

module.exports = {
  selectWithHotkey(labelHotkey) {
    I.pressKey(`${labelHotkey}`);
  },
};
