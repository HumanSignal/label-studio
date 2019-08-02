/**
 * Internal helper to check if parameter is a string
 * @param {*} value
 * @returns {boolean}
 */
export const isString = value => {
  return typeof value === "string" || value instanceof String;
};

/**
 * Internal helper to check if string is empty
 * @param {*} value
 * @returns {boolean}
 */
export const isStringEmpty = value => {
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
export const isStringJSON = value => {
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
export function getUrl(i, text) {
  const stringToTest = text.slice(i);
  const myRegexp = /^(https?:\/\/(?:www\.|(?!www))[^\s\.]+\.[^\s]{2,}|www\.[^\s]+\.[^\s]{2,})/g;
  const match = myRegexp.exec(stringToTest);

  return match && match.length ? match[1] : "";
}

/**
 * Convert MS to Time String
 * Example: 2000 -> 00:00:02
 * @param {number} ms
 * @returns {string}
 */
export function toTimeString(ms) {
  if (typeof ms === "number") {
    return new Date(ms).toUTCString().match(/(\d\d:\d\d:\d\d)/)[0];
  }
}
