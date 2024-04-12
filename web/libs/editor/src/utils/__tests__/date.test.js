/* global describe, test, expect */
import { msToHMS, prettyDate } from '../date';

describe('Helper function prettyDate', () => {
  test('Undefined', () => {
    expect(prettyDate(undefined)).toBeUndefined();
    expect(prettyDate(null)).toBeUndefined();
    expect(prettyDate(123)).toBeUndefined();
  });

  test('Yesterday', () => {
    const testing = new Date();
    const resultDate = new Date(testing.setDate(testing.getDate() - 1));

    expect(prettyDate(resultDate.toISOString())).toBe('Yesterday');
  });

  test('2 days ago', () => {
    const testing = new Date();
    const resultDate = new Date(testing.setDate(testing.getDate() - 2));

    expect(prettyDate(resultDate.toISOString())).toBe('2 days ago');
  });

  test('2 weeks ago', () => {
    const testing = new Date();
    const resultDate = new Date(testing.setDate(testing.getDate() - 14));

    expect(prettyDate(resultDate.toISOString())).toBe('2 weeks ago');
  });

  test('100 days ago', () => {
    const testing = new Date();
    const resultDate = new Date(testing.setDate(testing.getDate() - 100));

    expect(prettyDate(resultDate.toISOString())).toBe('100 days ago');
  });
});

describe('Helper function msToHMS', () => {
  test('Correct', () => {
    expect(msToHMS(10000)).toBe('0:0:10');
  });
});
