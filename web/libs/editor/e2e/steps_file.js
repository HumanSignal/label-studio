/* global  performActionBegin performActionEnd */
// in this file you can append custom step methods to 'I' object

module.exports = function() {
  return actor({
    // Define custom steps here, use 'this' to access default methods of I.
    // It is recommended to place a general 'login' function here.
    _performActionBegin(name) {
      return performActionBegin(name);
    },
    _performActionEnd(name) {
      return performActionEnd(name);
    },
    /**
     * Group steps to one action for statistics
     * @param {string} name - Name of action
     * @param {function} actions - What to do
     */
    async performAction(name, action) {
      this.say(name);
      this._performActionBegin(name);
      await action();
      this._performActionEnd(name);
    },
  });
};
