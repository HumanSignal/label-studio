/**
 * String utility functions — exact ports of lodash string functions.
 * Uses lodash's exact word-splitting regex and deburr logic.
 */

// ─────────────────────────────────────────────────────────────────────────────
// deburr — exact port of lodash/deburr
// ─────────────────────────────────────────────────────────────────────────────

/** Used to map Latin Unicode letters to basic Latin letters. */
const deburredLetters: Record<string, string> = {
  // Latin-1 Supplement block.
  "\xc0": "A", "\xc1": "A", "\xc2": "A", "\xc3": "A", "\xc4": "A", "\xc5": "A",
  "\xe0": "a", "\xe1": "a", "\xe2": "a", "\xe3": "a", "\xe4": "a", "\xe5": "a",
  "\xc7": "C", "\xe7": "c",
  "\xd0": "D", "\xf0": "d",
  "\xc8": "E", "\xc9": "E", "\xca": "E", "\xcb": "E",
  "\xe8": "e", "\xe9": "e", "\xea": "e", "\xeb": "e",
  "\xcc": "I", "\xcd": "I", "\xce": "I", "\xcf": "I",
  "\xec": "i", "\xed": "i", "\xee": "i", "\xef": "i",
  "\xd1": "N", "\xf1": "n",
  "\xd2": "O", "\xd3": "O", "\xd4": "O", "\xd5": "O", "\xd6": "O", "\xd8": "O",
  "\xf2": "o", "\xf3": "o", "\xf4": "o", "\xf5": "o", "\xf6": "o", "\xf8": "o",
  "\xd9": "U", "\xda": "U", "\xdb": "U", "\xdc": "U",
  "\xf9": "u", "\xfa": "u", "\xfb": "u", "\xfc": "u",
  "\xdd": "Y", "\xfd": "y", "\xff": "y",
  "\xc6": "Ae", "\xe6": "ae",
  "\xde": "Th", "\xfe": "th",
  "\xdf": "ss",
  // Latin Extended-A block.
  "\u0100": "A", "\u0102": "A", "\u0104": "A",
  "\u0101": "a", "\u0103": "a", "\u0105": "a",
  "\u0106": "C", "\u0108": "C", "\u010a": "C", "\u010c": "C",
  "\u0107": "c", "\u0109": "c", "\u010b": "c", "\u010d": "c",
  "\u010e": "D", "\u0110": "D", "\u010f": "d", "\u0111": "d",
  "\u0112": "E", "\u0114": "E", "\u0116": "E", "\u0118": "E", "\u011a": "E",
  "\u0113": "e", "\u0115": "e", "\u0117": "e", "\u0119": "e", "\u011b": "e",
  "\u011c": "G", "\u011e": "G", "\u0120": "G", "\u0122": "G",
  "\u011d": "g", "\u011f": "g", "\u0121": "g", "\u0123": "g",
  "\u0124": "H", "\u0126": "H", "\u0125": "h", "\u0127": "h",
  "\u0128": "I", "\u012a": "I", "\u012c": "I", "\u012e": "I", "\u0130": "I",
  "\u0129": "i", "\u012b": "i", "\u012d": "i", "\u012f": "i", "\u0131": "i",
  "\u0134": "J", "\u0135": "j",
  "\u0136": "K", "\u0137": "k", "\u0138": "k",
  "\u0139": "L", "\u013b": "L", "\u013d": "L", "\u013f": "L", "\u0141": "L",
  "\u013a": "l", "\u013c": "l", "\u013e": "l", "\u0140": "l", "\u0142": "l",
  "\u0143": "N", "\u0145": "N", "\u0147": "N", "\u014a": "N",
  "\u0144": "n", "\u0146": "n", "\u0148": "n", "\u014b": "n",
  "\u014c": "O", "\u014e": "O", "\u0150": "O",
  "\u014d": "o", "\u014f": "o", "\u0151": "o",
  "\u0154": "R", "\u0156": "R", "\u0158": "R",
  "\u0155": "r", "\u0157": "r", "\u0159": "r",
  "\u015a": "S", "\u015c": "S", "\u015e": "S", "\u0160": "S",
  "\u015b": "s", "\u015d": "s", "\u015f": "s", "\u0161": "s",
  "\u0162": "T", "\u0164": "T", "\u0166": "T",
  "\u0163": "t", "\u0165": "t", "\u0167": "t",
  "\u0168": "U", "\u016a": "U", "\u016c": "U", "\u016e": "U", "\u0170": "U", "\u0172": "U",
  "\u0169": "u", "\u016b": "u", "\u016d": "u", "\u016f": "u", "\u0171": "u", "\u0173": "u",
  "\u0174": "W", "\u0175": "w",
  "\u0176": "Y", "\u0177": "y", "\u0178": "Y",
  "\u0179": "Z", "\u017b": "Z", "\u017d": "Z",
  "\u017a": "z", "\u017c": "z", "\u017e": "z",
  "\u0132": "IJ", "\u0133": "ij",
  "\u0152": "Oe", "\u0153": "oe",
  "\u0149": "'n", "\u017f": "s",
};

/** Used to match Latin Unicode letters (excluding mathematical operators). */
const reLatin = /[\xc0-\xd6\xd8-\xf6\xf8-\xff\u0100-\u017f]/g;

/** Used to match combining diacritical marks. */
const rsComboMarksRange = "\\u0300-\\u036f";
const reComboHalfMarksRange = "\\ufe20-\\ufe2f";
const rsComboSymbolsRange = "\\u20d0-\\u20ff";
const rsComboRange = rsComboMarksRange + reComboHalfMarksRange + rsComboSymbolsRange;
const reComboMark = new RegExp("[" + rsComboRange + "]", "g");

function deburr(string: string): string {
  return string
    .replace(reLatin, (letter) => deburredLetters[letter] || letter)
    .replace(reComboMark, "");
}

// ─────────────────────────────────────────────────────────────────────────────
// words — exact port of lodash/words
// ─────────────────────────────────────────────────────────────────────────────

/** Used to detect strings that need the unicode regex for word splitting. */
const reHasUnicodeWord = /[a-z][A-Z]|[A-Z]{2}[a-z]|[0-9][a-zA-Z]|[a-zA-Z][0-9]|[^a-zA-Z0-9 ]/;

/** Used to match words composed of alphanumeric characters (ASCII path). */
const reAsciiWord = /[^\x00-\x2f\x3a-\x40\x5b-\x60\x7b-\x7f]+/g;

/** Used to compose unicode character classes for word splitting. */
const rsAstralRange = "\\ud800-\\udfff";
const rsDingbatRange = "\\u2700-\\u27bf";
const rsLowerRange = "a-z\\xdf-\\xf6\\xf8-\\xff";
const rsMathOpRange = "\\xac\\xb1\\xd7\\xf7";
const rsNonCharRange = "\\x00-\\x2f\\x3a-\\x40\\x5b-\\x60\\x7b-\\xbf";
const rsPunctuationRange = "\\u2000-\\u206f";
const rsSpaceRange =
  " \\t\\x0b\\f\\xa0\\ufeff\\n\\r\\u2028\\u2029\\u1680\\u180e\\u2000\\u2001\\u2002\\u2003\\u2004\\u2005\\u2006\\u2007\\u2008\\u2009\\u200a\\u202f\\u205f\\u3000";
const rsUpperRange = "A-Z\\xc0-\\xd6\\xd8-\\xde";
const rsVarRange = "\\ufe0e\\ufe0f";
const rsBreakRange = rsMathOpRange + rsNonCharRange + rsPunctuationRange + rsSpaceRange;

const rsApos = "['\u2019]";
const rsBreak = "[" + rsBreakRange + "]";
const rsCombo = "[" + rsComboRange + "]";
const rsDigits = "\\d+";
const rsDingbat = "[" + rsDingbatRange + "]";
const rsLower = "[" + rsLowerRange + "]";
const rsMisc = "[^" + rsAstralRange + rsBreakRange + rsDigits + rsDingbatRange + rsLowerRange + rsUpperRange + "]";
const rsFitz = "\\ud83c[\\udffb-\\udfff]";
const rsModifier = "(?:" + rsCombo + "|" + rsFitz + ")";
const rsNonAstral = "[^" + rsAstralRange + "]";
const rsRegional = "(?:\\ud83c[\\udde6-\\uddff]){2}";
const rsSurrPair = "[\\ud800-\\udbff][\\udc00-\\udfff]";
const rsUpper = "[" + rsUpperRange + "]";
const rsZWJ = "\\u200d";

const rsMiscLower = "(?:" + rsLower + "|" + rsMisc + ")";
const rsMiscUpper = "(?:" + rsUpper + "|" + rsMisc + ")";
const rsOptContrLower = "(?:" + rsApos + "(?:d|ll|m|re|s|t|ve))?";
const rsOptContrUpper = "(?:" + rsApos + "(?:D|LL|M|RE|S|T|VE))?";
const reOptMod = rsModifier + "?";
const rsOptVar = "[" + rsVarRange + "]?";
const rsOptJoin =
  "(?:" + rsZWJ + "(?:" + [rsNonAstral, rsRegional, rsSurrPair].join("|") + ")" + rsOptVar + reOptMod + ")*";
const rsOrdLower = "\\d*(?:1st|2nd|3rd|(?![123])\\dth)(?=\\b|[A-Z_])";
const rsOrdUpper = "\\d*(?:1ST|2ND|3RD|(?![123])\\dTH)(?=\\b|[a-z_])";
const rsSeq = rsOptVar + reOptMod + rsOptJoin;
const rsEmoji = "(?:" + [rsDingbat, rsRegional, rsSurrPair].join("|") + ")" + rsSeq;

/** Used to match complex or compound words — exact copy of lodash's reUnicodeWord. */
const reUnicodeWord = new RegExp(
  [
    rsUpper + "?" + rsLower + "+" + rsOptContrLower + "(?=" + [rsBreak, rsUpper, "$"].join("|") + ")",
    rsMiscUpper + "+" + rsOptContrUpper + "(?=" + [rsBreak, rsUpper + rsMiscLower, "$"].join("|") + ")",
    rsUpper + "?" + rsMiscLower + "+" + rsOptContrLower,
    rsUpper + "+" + rsOptContrUpper,
    rsOrdUpper,
    rsOrdLower,
    rsDigits,
    rsEmoji,
  ].join("|"),
  "g",
);

function asciiWords(string: string): string[] {
  return string.match(reAsciiWord) || [];
}

function unicodeWords(string: string): string[] {
  return string.match(reUnicodeWord) || [];
}

function words(string: string): string[] {
  return reHasUnicodeWord.test(string) ? unicodeWords(string) : asciiWords(string);
}

// ─────────────────────────────────────────────────────────────────────────────
// createCompounder — exact port of lodash/_createCompounder
// ─────────────────────────────────────────────────────────────────────────────

const reApos = new RegExp(rsApos, "g");

function createCompounder(
  callback: (result: string, word: string, index: number) => string,
): (string: string) => string {
  return function (string: string): string {
    const wordArray = words(deburr(String(string)).replace(reApos, ""));
    let result = "";
    for (let i = 0; i < wordArray.length; i++) {
      result = callback(result, wordArray[i], i);
    }
    return result;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// upperFirst — exact port of lodash/upperFirst
// ─────────────────────────────────────────────────────────────────────────────

function upperFirst(string: string): string {
  if (!string) return string;
  return string.charAt(0).toUpperCase() + string.slice(1);
}

// ─────────────────────────────────────────────────────────────────────────────
// Exported string functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Converts `string` to camelCase. Exact port of lodash/camelCase.
 */
export const camelCase: (str: string) => string = createCompounder(
  (result, word, index) => {
    word = word.toLowerCase();
    return result + (index ? upperFirst(word) : word);
  },
);

/**
 * Converts `string` to snake_case. Exact port of lodash/snakeCase.
 */
export const snakeCase: (str: string) => string = createCompounder(
  (result, word, index) => result + (index ? "_" : "") + word.toLowerCase(),
);

/**
 * Converts `string` to kebab-case. Exact port of lodash/kebabCase.
 */
export const kebabCase: (str: string) => string = createCompounder(
  (result, word, index) => result + (index ? "-" : "") + word.toLowerCase(),
);

/**
 * Converts the first character of `string` to upper case and the remaining
 * to lower case. Exact port of lodash/capitalize.
 */
export function capitalize(string: string): string {
  return upperFirst(String(string).toLowerCase());
}

/**
 * Converts `string` to start case. Exact port of lodash/startCase.
 */
export const startCase: (str: string) => string = createCompounder(
  (result, word, index) => result + (index ? " " : "") + upperFirst(word),
);

/**
 * Converts `string` to PascalCase (StudlyCase).
 * This is camelCase with the first letter capitalized.
 */
export const toStudlyCaps = (str: string): string => {
  const cc = camelCase(str);
  return cc.charAt(0).toUpperCase() + cc.slice(1);
};
