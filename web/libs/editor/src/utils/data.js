import { escapeHtml, isString } from './utilities';
import get from 'lodash.get';

/**
 * Simple way to retrieve linked data in `value` param from task
 * Works only for prefixed values ($image); non-prefixed values left as is
 * It's possible to add some text which will be left untouched; that's useful for
 * visual Text tags to display some additional info ("Title: $title")
 * @param {string} value param
 * @param {object} task
 */
export const parseValue = (value, task) => {
  const reVar = /\$[\w[\].{}]+/ig;

  if (!value) return '';

  // value can refer to structures, not only texts, so just replace wouldn't be enough
  if (value.match(reVar)?.[0] === value) {
    return get(task, value.substr(1)) ?? '';
  }

  return value.replace(reVar, (v) => get(task, v.substr(1) ?? ''));
};

/**
 * Parse CSV
 * Accepts only numbers as a data
 * Returns hash with names (or indexed hash for headless csv) as a keys
 * and arrays of numbers as a values
 * @param {string} text
 * @returns {{ [string]: number[] }}
 */
export const parseCSV = (text, separator = 'auto') => {
  // @todo iterate over newlines for better performance
  const lines = text.split('\n');
  let names;

  if (separator !== 'auto' && !lines[0].includes(separator)) {
    throw new Error([`Cannot find provided separator "${separator}".`, `Row 1: ${lines[0]}`].join('\n'));
  }

  // detect separator (2nd line is definitely with data)
  if (separator === 'auto' && lines.length > 1) {
    const candidates = lines[1].trim().match(/[,;\s\t]/g);

    if (!candidates.length) throw new Error('No separators found');
    if (candidates.some(c => c !== candidates[0])) {
      const list = Array.from(new Set(candidates))
        .map(escapeHtml)
        .map(s => `"${s}"`)
        .join(', ');

      throw new Error(
        [
          `More than one possible separator found: ${list}`,
          'You can provide correct one with <Timeseries sep=",">',
        ].join('\n'),
      );
    }
    separator = candidates[0];
    if (lines[0].split(separator).length !== lines[1].split(separator).length)
      throw new Error(
        [
          'Different amount of elements in rows.',
          `Row 1: ${lines[0]}`,
          `Row 2: ${lines[1]}`,
          `Guessed separator: ${separator}`,
          'You can provide correct one with <Timeseries sep=",">',
        ].join('\n'),
      );
  }

  const re = new RegExp(
    [
      '"(""|[^"]+)*"', // quoted text with possible quoted quotes inside it ("not a ""value""")
      `[^"${separator}]+`, // usual value, no quotes, between separators
      `(?=${separator}(${separator}|$))`, // empty value in the middle or at the end of string
      `^(?=${separator})`, // empty value at the start of the string
    ].join('|'),
    'g',
  );
  const split = text => text.trim().match(re);

  // detect header; if it is omitted, use indices as a header names
  names = split(lines[0]);
  const secondLine = split(lines[1]);
  // assume that we have at least one column with numbers
  // and name of this column is not number :)
  // so we have different types for values in first and second rows

  if (!names.every((n, i) => isNaN(n) === isNaN(secondLine[i]))) {
    lines.shift();
    names = names.map(n => n.toLowerCase());
  } else {
    names = names.map((_, i) => String(i));
  }

  const result = {};

  for (const name of names) result[name] = [];

  if (names.length !== split(lines[0]).length) {
    throw new Error(
      [
        'Column names count differs from data columns count.',
        `Columns: ${names.join(', ')};`,
        `Data: ${lines[0]};`,
        `Separator: "${separator}".`,
      ].join('\n'),
    );
  }

  let row;
  let i;

  for (const line of lines) {
    // skip empty lines including the last line
    if (!line.trim()) continue;
    row = split(line);
    for (i = 0; i < row.length; i++) {
      const val = +row[i];

      result[names[i]].push(isNaN(val) ? row[i] : val);
    }
  }

  return [result, names];
};

/**
 * Internal helper to check if string is JSON
 * @param {string} value
 * @returns {object|false}
 */
export const tryToParseJSON = value => {
  if (isString(value) && value[0] === '{') {
    try {
      return JSON.parse(value);
    } catch (e) {
      // somthing went wrong
    }
  }

  return false;
};

/**
 * Parse value type
 * Accept value type as a parameter
 * Returns type, seperator and options object by analyzing valueType
 */
export const parseTypeAndOption = valueType => {
  const [, type, sep] = valueType.match(/^(\w+)(.)?/) ?? [];
  const options = {};

  if (sep) {
    const pairs = valueType.split(sep).slice(1);

    pairs.forEach(pair => {
      const [k, v] = pair.split('=', 2);

      options[k] = v ?? true; // options without values are `true`
    });
  }

  return { type, sep, options };
};
