import keymaster from "keymaster";

let _hotkeys_map = {};

/**
 * Add key
 * @param {*} key
 * @param {*} func
 */
function addKey(key, func) {
  if (_hotkeys_map[key]) return;

  _hotkeys_map[key] = true;
  keymaster(key, "main", func);
}

/**
 * Unbund all hotkeys
 */
function unbindAll() {
  for (let key of Object.keys(_hotkeys_map)) keymaster.unbind(key);

  _hotkeys_map = {};
}

/**
 * Set scope of hotkeys
 * @param {*} scope
 */
function setScope(scope) {
  keymaster.setScope(scope);
}

/**
 * Create combination
 */
function makeComb() {
  let prefix = null;
  let st = "1234567890qwertasdfgzxcvbyuiophjklnm";
  let combs = st.split("");

  for (var i = 0; i <= combs.length; i++) {
    let comb;
    if (prefix) comb = prefix + "+" + combs[i];
    else comb = combs[i];

    if (!_hotkeys_map.hasOwnProperty(comb)) return comb;
  }

  return null;
}

export default { addKey, unbindAll, makeComb, setScope };
