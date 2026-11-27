/** Stub for keymaster (keyboard shortcuts) in tests - no-op bindings */
function keymaster() {}
keymaster.setScope = function () {};
keymaster.getScope = function () {
  return "default";
};
keymaster.deleteScope = function () {};
keymaster.filter = function () {};
keymaster.isPressed = function () {
  return false;
};
keymaster.noConflict = function () {
  return keymaster;
};
module.exports = keymaster;
