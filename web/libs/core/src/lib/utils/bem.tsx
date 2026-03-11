/**
 * BEM (Block Element Modifier) utility for creating CSS class names
 *
 * This utility provides a flexible way to create BEM-style CSS class names
 * with support for blocks, elements, modifiers, and mixing.
 *
 * Usage:
 *   import { cnb as cn } from "@humansignal/core/lib/utils/bem";
 *   cn("block").elem("element").mod({ active: true }).toClassName()
 *   // → "ls-block__element ls-block__element_active"
 */

type CNMod = Record<string, string | boolean | number | null | undefined>;
type CNMix = string | CN | undefined | null;

/** Type alias for HTML element tag names */
export type CNTagName = keyof JSX.IntrinsicElements;

export type CN = {
  /** Create an element within the block */
  elem(name: string): CN;
  /** Add modifier(s) to the block or element */
  mod(mod?: CNMod): CN;
  /** Mix in additional class names (supports strings, CN objects, and arrays) */
  mix(...mix: (CNMix | CNMix[])[]): CN;
  /** Find the first element in the document matching this BEM selector */
  select(): Element | null;
  /** Find the closest ancestor matching this BEM selector */
  closest(root: Element): Element | null;
  /** Convert to class name string */
  toString(): string;
  /** Convert to class name string (alias for toString) */
  toClassName(): string;
};

const CSS_PREFIX = process.env.CSS_PREFIX ?? "ls-";
const SPACE_REGEX = /\s+/;

// Prefix a class name - inlined check for performance
const prefixClass = (cls: string): string =>
  cls.startsWith(CSS_PREFIX) || CSS_PREFIX === "" ? cls : `${CSS_PREFIX}${cls}`;

// Get string value from a mix item - handles strings, CN objects, and arrays
const getMixString = (m: CNMix | CNMix[]): string => {
  if (m === null || m === undefined) return "";
  if (typeof m === "string") return m.trim();
  // Handle arrays passed to mix (e.g., .mix(["class1", "class2"]))
  if (Array.isArray(m)) {
    return m
      .map((item) => getMixString(item))
      .filter(Boolean)
      .join(" ");
  }
  // CN object
  return m.toClassName();
};

// Process mix classes and append to result - handles deduplication
const appendMixClasses = (result: string, mix: (CNMix | CNMix[])[]): string => {
  // For small mixes, avoid Set overhead when possible
  if (mix.length === 1) {
    const mixStr = getMixString(mix[0]);
    if (!mixStr) return result;

    // Fast path: no spaces means single class (no dedup needed)
    if (!SPACE_REGEX.test(mixStr)) {
      return `${result} ${prefixClass(mixStr)}`;
    }

    // Has spaces - split and dedupe
    const classes = mixStr.split(SPACE_REGEX);
    const seen = new Set<string>();
    for (const cls of classes) {
      if (cls && !seen.has(cls)) {
        seen.add(cls);
        result += ` ${prefixClass(cls)}`;
      }
    }
    return result;
  }

  // Multiple mixes - use Set for deduplication
  const seen = new Set<string>();
  for (const m of mix) {
    const mixStr = getMixString(m);
    if (!mixStr) continue;

    // Fast path for single class (no spaces)
    if (!SPACE_REGEX.test(mixStr)) {
      if (!seen.has(mixStr)) {
        seen.add(mixStr);
        result += ` ${prefixClass(mixStr)}`;
      }
      continue;
    }

    // Has spaces - split and dedupe
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

// Shared prototype for CN instances - methods are created once
const cnProto = {
  elem(this: CNInstance, name: string): CN {
    return createCN(this._block, name, this._mod, this._mix);
  },

  mod(this: CNInstance, newMod: CNMod = {}): CN {
    const merged = this._mod ? { ...this._mod, ...newMod } : newMod;
    return createCN(this._block, this._elem, merged, this._mix);
  },

  mix(this: CNInstance, ...newMix: (CNMix | CNMix[])[]): CN {
    return createCN(this._block, this._elem, this._mod, newMix);
  },

  select(this: CNInstance): Element | null {
    const selector = `.${this.toString().replace(SPACE_REGEX, ".")}`;
    return document.querySelector(selector);
  },

  closest(this: CNInstance, root: Element): Element | null {
    const selector = `.${this.toString().replace(SPACE_REGEX, ".")}`;
    return root.closest(selector);
  },

  toString(this: CNInstance): string {
    if (this._cached !== null) return this._cached;

    // Build base class
    const base = this._elem ? `${this._block}__${this._elem}` : this._block;
    let result = prefixClass(base);

    // Add modifiers
    const mod = this._mod;
    if (mod) {
      for (const key in mod) {
        const value = mod[key];
        if (value === null || value === undefined || value === false) continue;
        result += value === true ? ` ${prefixClass(`${base}_${key}`)}` : ` ${prefixClass(`${base}_${key}_${value}`)}`;
      }
    }

    // Add mixes
    const mix = this._mix;
    if (mix && mix.length > 0) {
      result = appendMixClasses(result, mix);
    }

    this._cached = result;
    return result;
  },

  toClassName(this: CNInstance): string {
    return this.toString();
  },
};

// Internal instance type with private fields
type CNInstance = CN & {
  _block: string;
  _elem: string | undefined;
  _mod: CNMod | undefined;
  _mix: (CNMix | CNMix[])[] | undefined;
  _cached: string | null;
};

// Factory function - creates minimal object, methods come from prototype
const createCN = (block: string, elem?: string, mod?: CNMod, mix?: (CNMix | CNMix[])[]): CN => {
  const instance = Object.create(cnProto) as CNInstance;
  instance._block = block;
  instance._elem = elem;
  instance._mod = mod;
  instance._mix = mix;
  instance._cached = null;
  return instance;
};

// Public API: cn(block, options?)
const cnb = (
  block: string,
  options: { elem?: string; mix?: CNMix | CNMix[] | (CNMix | CNMix[])[]; mod?: CNMod } = {},
): CN => {
  const mix = options.mix ? (Array.isArray(options.mix) ? options.mix : [options.mix]) : undefined;
  return createCN(block, options.elem, options.mod, mix as (CNMix | CNMix[])[] | undefined);
};

export { cnb };
