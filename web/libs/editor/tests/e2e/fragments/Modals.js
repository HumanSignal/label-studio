const { I } = inject();

module.exports = {
  seeWarning(text) {
    I.seeElement('.ant-modal');
    I.see('Warning');
    I.see(text);
    I.see('OK');
  },
  dontSeeWarning(text) {
    I.dontSeeElement('.ant-modal');
    I.dontSee('Warning');
    I.dontSee(text);
  },
  closeWarning() {
    I.click('OK');
    I.waitToHide('.ant-modal');
  },
};