/**
 * Exact ports of lodash utility functions.
 * These replicate lodash behavior precisely to ensure drop-in compatibility.
 */

import { debounce } from "./debounce";

// ─────────────────────────────────────────────────────────────────────────────
// throttle — exact port of lodash/throttle
// ─────────────────────────────────────────────────────────────────────────────

function isObject(value: unknown): value is Record<string, unknown> {
  const type = typeof value;
  return value != null && (type === "object" || type === "function");
}

/**
 * Creates a throttled function that only invokes `func` at most once per
 * every `wait` milliseconds. Exact port of lodash/throttle.
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait?: number,
  options?: { leading?: boolean; trailing?: boolean },
): ((...args: Parameters<T>) => ReturnType<T> | undefined) & { cancel: () => void; flush: () => ReturnType<T> | undefined } {
  let leading = true;
  let trailing = true;

  if (typeof func !== "function") {
    throw new TypeError("Expected a function");
  }
  if (isObject(options)) {
    leading = "leading" in options ? !!options.leading : leading;
    trailing = "trailing" in options ? !!options.trailing : trailing;
  }
  return debounce(func, wait, {
    leading,
    maxWait: wait,
    trailing,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// clamp — exact port of lodash/clamp
// ─────────────────────────────────────────────────────────────────────────────

function baseClamp(number: number, lower: number | undefined, upper: number | undefined): number {
  if (number === number) {
    if (upper !== undefined) {
      number = number <= upper ? number : upper;
    }
    if (lower !== undefined) {
      number = number >= lower ? number : lower;
    }
  }
  return number;
}

/**
 * Clamps `number` within the inclusive `lower` and `upper` bounds.
 * Exact port of lodash/clamp.
 */
export function clamp(number: number, lower?: number, upper?: number): number {
  if (upper === undefined) {
    upper = lower;
    lower = undefined;
  }
  if (upper !== undefined) {
    upper = Number(upper);
    upper = upper === upper ? upper : 0;
  }
  if (lower !== undefined) {
    lower = Number(lower);
    lower = lower === lower ? lower : 0;
  }
  return baseClamp(Number(number), lower, upper);
}

// ─────────────────────────────────────────────────────────────────────────────
// get — exact port of lodash/get
// ─────────────────────────────────────────────────────────────────────────────

/** Used to match property names within property paths. */
const rePropName =
  /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g;

/** Used to match backslashes in property paths. */
const reEscapeChar = /\\(\\)?/g;

/** Used to detect property names vs paths. */
const reIsDeepProp = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/;
const reIsPlainProp = /^\w*$/;

function isKey(value: unknown, object?: unknown): boolean {
  if (Array.isArray(value)) {
    return false;
  }
  const type = typeof value;
  if (type === "number" || type === "symbol" || type === "boolean" || value == null) {
    return true;
  }
  const strValue = String(value);
  return (
    reIsPlainProp.test(strValue) ||
    !reIsDeepProp.test(strValue) ||
    (object != null && strValue in Object(object))
  );
}

function stringToPath(string: string): string[] {
  const result: string[] = [];
  if (string.charCodeAt(0) === 46 /* . */) {
    result.push("");
  }
  string.replace(rePropName, (match: string, number?: string, quote?: string, subString?: string) => {
    result.push(quote ? (subString as string).replace(reEscapeChar, "$1") : number || match);
    return match;
  });
  return result;
}

function castPath(value: unknown, object?: unknown): string[] {
  if (Array.isArray(value)) {
    return value;
  }
  return isKey(value, object) ? [value as string] : stringToPath(String(value));
}

function toKey(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  const result = String(value);
  return result === "0" && 1 / (value as number) === -(1 / 0) ? "-0" : result;
}

/**
 * Gets the value at `path` of `object`. If the resolved value is `undefined`,
 * the `defaultValue` is returned in its place. Exact port of lodash/get.
 */
export function get(object: unknown, path: string | string[], defaultValue?: unknown): unknown {
  const castPathResult = castPath(path, object);
  let index = 0;
  const length = castPathResult.length;

  let current: any = object;
  while (current != null && index < length) {
    current = current[toKey(castPathResult[index++])];
  }
  const result = index && index === length ? current : undefined;
  return result === undefined ? defaultValue : result;
}

// ─────────────────────────────────────────────────────────────────────────────
// isMatch — exact port of lodash/isMatch
// Uses deep partial comparison via baseIsEqual logic.
// ─────────────────────────────────────────────────────────────────────────────

function isStrictComparable(value: unknown): boolean {
  return value === value && !isObject(value);
}

type MatchDatum = [string, unknown, boolean];

function getMatchData(object: Record<string, unknown>): MatchDatum[] {
  const keys = Object.keys(object);
  let length = keys.length;
  const result: MatchDatum[] = new Array(length);

  while (length--) {
    const key = keys[length];
    const value = object[key];
    result[length] = [key, value, isStrictComparable(value)];
  }
  return result;
}

/**
 * Deep partial equality check matching lodash/baseIsEqual with PARTIAL flag.
 */
function baseIsEqualDeep(objValue: unknown, srcValue: unknown, seen?: Map<unknown, unknown>): boolean {
  // Same reference
  if (objValue === srcValue) return true;

  // Null/undefined checks
  if (objValue == null || srcValue == null) return objValue === srcValue;

  // Primitive type checks
  if (typeof objValue !== "object" && typeof srcValue !== "object") return objValue === srcValue;

  // NaN check
  if (objValue !== objValue && srcValue !== srcValue) return true;

  // Circular reference tracking
  if (!seen) seen = new Map();
  if (seen.has(srcValue)) return seen.get(srcValue) === objValue;
  seen.set(srcValue, objValue);

  // Array comparison (partial: srcValue elements must match)
  if (Array.isArray(srcValue)) {
    if (!Array.isArray(objValue)) return false;
    if (srcValue.length > objValue.length) return false;
    for (let i = 0; i < srcValue.length; i++) {
      if (!baseIsEqualDeep(objValue[i], srcValue[i], seen)) return false;
    }
    return true;
  }

  if (Array.isArray(objValue)) return false;

  // Object comparison (partial: only keys in srcValue matter)
  const srcKeys = Object.keys(srcValue as Record<string, unknown>);
  for (const key of srcKeys) {
    if (
      !baseIsEqualDeep(
        (objValue as Record<string, unknown>)[key],
        (srcValue as Record<string, unknown>)[key],
        seen,
      )
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Performs a partial deep comparison between `object` and `source` to
 * determine if `object` contains equivalent property values.
 * Exact port of lodash/isMatch.
 */
export function isMatch(object: unknown, source: unknown): boolean {
  if (object === source) return true;

  if (object == null || !isObject(source)) return false;

  const matchData = getMatchData(source as Record<string, unknown>);
  let length = matchData.length;

  // Quick bail: check all strict-comparable values first
  const obj = Object(object) as Record<string, unknown>;
  let index = length;
  while (index--) {
    const data = matchData[index];
    if (data[2] ? data[1] !== obj[data[0]] : !(data[0] in obj)) {
      return false;
    }
  }

  // Deep comparison for non-strict values
  while (++index < length) {
    const data = matchData[index];
    const key = data[0];
    const srcValue = data[1];
    const objValue = obj[key];

    if (data[2]) {
      if (objValue === undefined && !(key in obj)) {
        return false;
      }
    } else {
      if (!baseIsEqualDeep(objValue, srcValue)) {
        return false;
      }
    }
  }

  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// uniqBy — exact port of lodash/uniqBy
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a duplicate-free version of an array using `iteratee` to produce
 * the criterion by which uniqueness is computed. Exact port of lodash/uniqBy.
 */
export function uniqBy<T>(array: T[], iteratee: ((value: T) => unknown) | keyof T | string): T[] {
  if (!array || !array.length) return [];

  const seen = new Set<unknown>();
  const result: T[] = [];

  for (const value of array) {
    const computed =
      typeof iteratee === "function" ? iteratee(value) : (value as Record<string, unknown>)[iteratee as string];

    if (!seen.has(computed)) {
      seen.add(computed);
      result.push(value);
    }
  }

  return result;
}
