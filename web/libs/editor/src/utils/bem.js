// core/src/lib/utils/bem.tsx
var CSS_PREFIX = process.env.CSS_PREFIX ?? "ls-";
var SPACE_REGEX = /\s+/;
var prefixClass = (cls) => cls.startsWith(CSS_PREFIX) || CSS_PREFIX === "" ? cls : `${CSS_PREFIX}${cls}`;
var getMixString = (m) => {
  if (m === null || m === void 0) return "";
  if (typeof m === "string") return m.trim();
  if (Array.isArray(m)) {
    return m.map((item) => getMixString(item)).filter(Boolean).join(" ");
  }
  return m.toClassName();
};
var appendMixClasses = (result, mix) => {
  if (mix.length === 1) {
    const mixStr = getMixString(mix[0]);
    if (!mixStr) return result;
    if (!SPACE_REGEX.test(mixStr)) {
      return `${result} ${prefixClass(mixStr)}`;
    }
    const classes = mixStr.split(SPACE_REGEX);
    const seen2 = /* @__PURE__ */ new Set();
    for (const cls of classes) {
      if (cls && !seen2.has(cls)) {
        seen2.add(cls);
        result += ` ${prefixClass(cls)}`;
      }
    }
    return result;
  }
  const seen = /* @__PURE__ */ new Set();
  for (const m of mix) {
    const mixStr = getMixString(m);
    if (!mixStr) continue;
    if (!SPACE_REGEX.test(mixStr)) {
      if (!seen.has(mixStr)) {
        seen.add(mixStr);
        result += ` ${prefixClass(mixStr)}`;
      }
      continue;
    }
    const classes = mixStr.split(SPACE_REGEX);
    for (const cls of classes) {
      if (cls && !seen.has(cls)) {
        seen.add(cls);
        result += ` ${prefixClass(cls)}`;
      }
    }
  }
  return result;
};
var cnProto = {
  elem(name) {
    return createCN(this._block, name, this._mod, this._mix);
  },
  mod(newMod = {}) {
    const merged = this._mod ? { ...this._mod, ...newMod } : newMod;
    return createCN(this._block, this._elem, merged, this._mix);
  },
  mix(...newMix) {
    return createCN(this._block, this._elem, this._mod, newMix);
  },
  select() {
    const selector = `.${this.toString().replace(SPACE_REGEX, ".")}`;
    return document.querySelector(selector);
  },
  closest(root) {
    const selector = `.${this.toString().replace(SPACE_REGEX, ".")}`;
    return root.closest(selector);
  },
  toString() {
    if (this._cached !== null) return this._cached;
    const base = this._elem ? `${this._block}__${this._elem}` : this._block;
    let result = prefixClass(base);
    const mod = this._mod;
    if (mod) {
      for (const key in mod) {
        const value = mod[key];
        if (value === null || value === void 0 || value === false) continue;
        result += value === true ? ` ${prefixClass(`${base}_${key}`)}` : ` ${prefixClass(`${base}_${key}_${value}`)}`;
      }
    }
    const mix = this._mix;
    if (mix && mix.length > 0) {
      result = appendMixClasses(result, mix);
    }
    this._cached = result;
    return result;
  },
  toClassName() {
    return this.toString();
  }
};
var createCN = (block, elem, mod, mix) => {
  const instance = Object.create(cnProto);
  instance._block = block;
  instance._elem = elem;
  instance._mod = mod;
  instance._mix = mix;
  instance._cached = null;
  return instance;
};
var cnb = (block, options = {}) => {
  const mix = options.mix ? Array.isArray(options.mix) ? options.mix : [options.mix] : void 0;
  return createCN(block, options.elem, options.mod, mix);
};
export {
  cnb as cn
};
