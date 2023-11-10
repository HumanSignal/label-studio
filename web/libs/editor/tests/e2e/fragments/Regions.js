const AtSidebar = require('./AtSidebar');

const { I } = inject();

module.exports = {
  unselectWithHotkey() {
    // wait is necessary for "Select region after creation" cases because 
    // there's delay between region creation and ability to unselect a region
    I.wait(0.2);
    I.pressKey(['u']);
    AtSidebar.dontSeeSelectedRegion();
  },

  undoLastActionWithHotkey() {
    I.pressKey(['CommandOrControl', 'z']);
  },

  redoLastAction() {
    I.pressKey(['CommandOrControl', 'Shift' ,'z']);
  },

  //Image tools
  selectMoveTool() {
    I.pressKey('v');
  },
};
