/* global describe, test, expect, it */
import { colorToRGBA, convertToRGBA, hexToRGBA, stringToColor } from '../colors';

const defaultRGBA = 'rgba(255, 255, 255, 0.1)';
const defaultHEX = {
  short: '#fff',
  long: '#ffffff',
  alpha: 0.1,
};
const randomString = {
  str: 'white',
  value: '#29ccbd',
};

describe('Helper function hexToRGBA', () => {
  test('3 dig', () => {
    expect(hexToRGBA(defaultHEX.short, defaultHEX.alpha)).toBe(defaultRGBA);
  });

  test('6 dig', () => {
    expect(hexToRGBA(defaultHEX.long, defaultHEX.alpha)).toBe(defaultRGBA);
  });
});

describe('Helper function convertToRGBA', () => {
  test('Convert to RGBA, color', () => {
    expect(convertToRGBA(randomString.str, defaultHEX.alpha)).toBe(defaultRGBA);
  });

  test('Convert to RGBA, HEX', () => {
    expect(convertToRGBA(defaultHEX.short, defaultHEX.alpha)).toBe(defaultRGBA);
    expect(convertToRGBA(defaultHEX.long, defaultHEX.alpha)).toBe(defaultRGBA);
  });
});

describe('Helper function colorToRGBA', () => {
  test('Good', () => {
    expect(colorToRGBA(randomString.str, defaultHEX.alpha)).toBe(defaultRGBA);
  });

  test('Undefind', () => {
    expect(colorToRGBA(undefined, defaultHEX.alpha)).toBeUndefined();
  });

  test('Random string', () => {
    expect(colorToRGBA('RANDOM', defaultHEX.alpha)).toBe('rgba(0, 0, 0, 0.1)');
  });
});

it('Helper function stringToColor', () => {
  expect(stringToColor(randomString.str)).toBe(randomString.value);
});
