/** Stub for CSS / CSS module imports in tests. Any key returns itself (e.g. styles.foo → "foo"). */
module.exports = new Proxy(
  {},
  {
    get(_, key) {
      return key;
    },
  },
);
