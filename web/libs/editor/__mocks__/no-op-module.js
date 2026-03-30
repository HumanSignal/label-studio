/**
 * Universal no-op stub for modules that need to be silenced in tests
 * (keymaster, react-konva-utils, etc.). Works as both a default export
 * (callable function) and a namespace with arbitrary named exports.
 */
const noop = () => {};
const handler = {
  get(_, key) {
    if (key === "__esModule") return true;
    if (key === "default") return proxy;
    return noop;
  },
  apply() {},
};
const proxy = new Proxy(noop, handler);
module.exports = proxy;
module.exports.default = proxy;
