/* global it, describe, expect, test */
import { emailFromCreatedBy, getUrl, isString, isStringEmpty, isStringJSON, toTimeString } from '../utilities';

describe('Helper function emailFromCreatedBy', () => {
  expect(emailFromCreatedBy('abc@def.com, 12')).toBe('abc@def.com');
  // empty username, not a rare case
  expect(emailFromCreatedBy(' abc@def.com, 12')).toBe('abc@def.com');
  expect(emailFromCreatedBy('usrnm abc@def.com, 12')).toBe('abc@def.com');
  // first and last name
  expect(emailFromCreatedBy('Abc Def ab.c+12@def.com.pt, 12')).toBe('ab.c+12@def.com.pt');
  // complex case
  expect(emailFromCreatedBy('Ab.C D@E.F ab.c+12@def.com.pt, 12')).toBe('ab.c+12@def.com.pt');
  // just a email, should not be a real case though
  expect(emailFromCreatedBy('ab.c+12@def.com.pt')).toBe('ab.c+12@def.com.pt');
});

/**
 * isString
 */
it('Function isString works', () => {
  expect(isString('value')).toBeTruthy();
});

/**
 * isStringEmpty
 */
describe('Helper function isStringEmpty', () => {
  test('Empty', () => {
    expect(isStringEmpty('')).toBeTruthy();
  });

  test('Not string', () => {
    expect(isStringEmpty(123)).toBeFalsy();
  });

  test('Not empty', () => {
    expect(isStringEmpty('value')).toBeFalsy();
  });
});

/**
 * isStringJSON
 */
describe('Helper function isStrinJSON', () => {
  test('JSON', () => {
    expect(isStringJSON('{"test": "value"}')).toBeTruthy();
  });

  test('String isn\'t JSON', () => {
    expect(isStringJSON('value')).toBeFalsy();
  });

  test('Number', () => {
    expect(isStringJSON(1)).toBeFalsy();
  });

  test('Null', () => {
    expect(isStringJSON(null)).toBeFalsy();
  });
});

/**
 * getUrl
 */
describe('Helper function getUrl', () => {
  test('Correct https', () => {
    expect(getUrl(0, 'https://heartex.net testing value')).toBe('https://heartex.net');
  });

  test('Correct http', () => {
    expect(getUrl(0, 'http://heartex.net testing value')).toBe('http://heartex.net');
  });

  test('Correct wwww', () => {
    expect(getUrl(0, 'www.heartex.net testing value')).toBe('www.heartex.net');
  });

  test('Not correct', () => {
    expect(getUrl(2, 'https://heartex.net testing value')).toBe('');
  });
});

/**
 * toTimeString
 */
describe('Helper function toTimeString', () => {
  test('Correct', () => {
    expect(toTimeString(5000)).toBe('00:00:05');
  });
});
