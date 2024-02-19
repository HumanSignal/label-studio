import { formatDistanceToNow } from 'date-fns';
import { destroy, detach } from 'mobx-state-tree';
import { toCamelCase } from 'strman';

/**
 * Internal helper to check if parameter is a string
 * @param {*} value
 * @returns {boolean}
 */
export const isString = (value: any): value is string => {
  return typeof value === 'string' || value instanceof String;
};

/**
 * Internal helper to check if string is empty
 * @param {*} value
 * @returns {boolean}
 */
export const isStringEmpty = (value: string) => {
  if (!isString(value)) {
    return false;
  }

  return value.length === 0;
};

/**
 * Internal helper to check if string is JSON
 * @param {string} value
 * @returns {boolean}
 */
export const isStringJSON = (value: string) => {
  if (isString(value)) {
    try {
      JSON.parse(value);
    } catch (e) {
      return false;
    }

    return true;
  }

  return false;
};

/**
 * Check if text is url
 * @param {*} i
 * @param {*} text
 */
export function getUrl(i: number, text: string) {
  const stringToTest = text.slice(i);
  const myRegexp = /^(https?:\/\/(?:www\.|(?!www))[^\s\.]+\.[^\s]{2,}|www\.[^\s]+\.[^\s]{2,})/g; // eslint-disable-line no-useless-escape
  const match = myRegexp.exec(stringToTest);

  return match && match.length ? match[1] : '';
}

/**
 * Check if given string is a valid url for object data
 * @param {string} str              - String to check
 * @param {boolean} [relative=true] - Whether relative urls are good or nood
 */
export function isValidObjectURL(str: string, relative = false) {
  if (typeof str !== 'string') return false;
  if (relative && str.startsWith('/')) return true;
  return /^https?:\/\//.test(str);
}

/**
 * Convert MS to Time String
 * Example: 2000 -> 00:00:02
 * @param {number} ms
 * @returns {string}
 */
export function toTimeString(ms: number) {
  if (typeof ms === 'number') {
    return new Date(ms).toUTCString().match(/(\d\d:\d\d:\d\d)/)?.[0];
  }
}

export function flatten(arr: any[]): any[] {
  return arr.reduce<any>(function(flat, toFlatten) {
    return flat.concat(Array.isArray(toFlatten) ? flatten(toFlatten) : toFlatten);
  }, []);
}

export function hashCode(str: string) {
  let hash = 0;

  if (str.length === 0) {
    return hash + '';
  }
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);

    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash + '';
}

export function atobUnicode(str: string) {
  // Going backwards: from bytestream, to percent-encoding, to original string.
  return decodeURIComponent(
    atob(str)
      .split('')
      .map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      })
      .join(''),
  );
}

/**
 * Makes string safe to use inside dangerouslySetInnerHTML
 * @param {string} unsafe
 */
export function escapeHtml(unsafe: string) {
  return (unsafe ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Compares two arrays; order matters
 * @template T
 * @param {T[]} arr1 array 1
 * @param {T[]} arr2 array 2
 */
export function isArraysEqual(arr1: any[], arr2: any[]) {
  return arr1.length === arr2.length && arr1.every((value, index) => arr2[index] === value);
}

/**
 * Convert any value to an array
 * @template T
 * @param {T} value
 * @returns {T[]}
 */
export function wrapArray(value: any[]) {
  return ([] as any[]).concat(...[value]);
}

export function delay(ms = 0) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export const isDefined = <T>(value: T | null | undefined): value is T => {
  return value !== null && value !== undefined;
};

type ClosestParentPredicate<T> = (el: T) => boolean;
type ClosestParentGetter<T> = (el: T) => T;

export function findClosestParent<T extends { parent: any }>(
  el: T,
  predicate: ClosestParentPredicate<T> = () => true,
  parentGetter: ClosestParentGetter<T> = (el) => el.parent,
) {
  while ((el = parentGetter(el))) {
    if (predicate(el)) {
      return el;
    }
  }
  return null;
}

export function clamp(x: number, min: number, max: number) {
  return Math.min(max, Math.max(min, x));
}

export const chunks = <T extends any[]>(source: T, chunkSize: number): T[][] => {
  const result = [];
  let i,j;

  for (i = 0,j = source.length; i < j; i += chunkSize) {
    result.push(source.slice(i,i + chunkSize));
  }

  return result;
};

export const userDisplayName = (user: Record<string, string> = {}) => {
  const { firstName, lastName } = user;

  return (firstName || lastName)
    ? [firstName, lastName].filter(n => !!n).join(' ').trim()
    : (user.username || user.email);
};

/**
 * This name supposed to be username, but most likely it's first_name and last_name
 * @param {string} createdBy string like "[<name> ]<email>, <id>"
 * @returns {string} email
 */
export const emailFromCreatedBy = (createdBy: string) => {
  // get the email followed by id and cut off the id
  return createdBy?.match(/([^@,\s]+@[^@,\s]+)(,\s*\d+)?$/)?.[1];
};

export const camelizeKeys = (object: any): Record<string, unknown> => {
  return Object.fromEntries(Object.entries(object).map(([key, value]) => {
    if (Object.prototype.toString.call(value) === '[object Object]') {
      return [toCamelCase(key), camelizeKeys(value)];
    } else {
      return [toCamelCase(key), value];
    }
  }));
};

export function minMax(items: number[]) {
  return items.reduce<number[]>((acc, val) => {
    acc[0] = acc[0] === undefined || val < acc[0] ? val : acc[0];
    acc[1] = acc[1] === undefined || val > acc[1] ? val : acc[1];
    return acc;
  }, []);
}

// Detects if current OS is macOS
export function isMacOS() {
  return navigator.platform.indexOf('Mac') > -1;
}

export const triggerResizeEvent = () => {
  const event = new Event('resize');

  event.initEvent('resize', false, false);
  window.dispatchEvent(event);
};

export const humanDateDiff = (date: string | number): string => {
  const fnsDate = formatDistanceToNow(new Date(date), { addSuffix: true });

  if (fnsDate === 'less than a minute ago') return 'just now';
  return fnsDate;
};

export const destroyMSTObject = (object: any) => {
  if (object) {
    detach(object);
    destroy(object);
  }
};

// fixes `observe` - it watches only the changes of primitive props of observables used,
// so pass all the required primitives to this stub and they'll be observed
export const fixMobxObserve = (..._toObserve: any[]) => {};

/**
 * Sort annotations by createdDate in place. This function mutates the input array, so don't pass original list.
 * Use the same ordering in different places to keep it consistent. Just sort to have the latest first.
 * @param {object[]} annotations
 * @returns {object[]} sorted list of annotations
 */
export const sortAnnotations = (annotations: any[]) => {
  return annotations.sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime());
};
