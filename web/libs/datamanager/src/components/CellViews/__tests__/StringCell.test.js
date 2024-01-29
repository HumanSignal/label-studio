/* global describe, test, expect */
import { format } from 'date-fns';
import { dateTimeFormat } from '../DateTimeCell';
import { valueToString } from '../StringCell';

describe('StringCell valueToString', () => {
  test('Undefined/Null', () => {
    expect(valueToString(undefined)).toBe("");
    expect(valueToString(null)).toBe("");
  });

  test('Boolean', () => {
    expect(valueToString(true)).toBe("true");
    expect(valueToString(false)).toBe("false");
  });

  test('Date', () => {
    const testDate = new Date();

    expect(valueToString(testDate)).toBe(format(testDate, dateTimeFormat));
  });

  test('String', () => {
    const testString = 'Hello World!';
    const testString2 = `Hello 
    
    
    World!`;

    expect(valueToString(testString)).toBe(testString);
    expect(valueToString(testString2)).toBe(testString2);
  });

  test('JSON', () => {
    const json1 = {
      a: 1,
      b: '2',
      c: null,
    };
    const jsonCircular = { b: 5 };

    jsonCircular.a = jsonCircular;

    expect(valueToString(json1)).toBe(JSON.stringify(json1));
    expect(valueToString(jsonCircular)).toBe('Error: Invalid JSON');
  });

  test('Number', () => {
    const test = 1234;

    expect(valueToString(test)).toBe(test.toString());
    expect(valueToString(0)).toBe("0");
  });
});
