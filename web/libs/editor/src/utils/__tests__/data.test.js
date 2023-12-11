/* global describe, test, expect */
import { timeFormat } from 'd3';
import { parseCSV, parseValue } from '../data';

const now = +new Date();
const dateISO = timeFormat('%Y-%m-%d %H:%M:%S');
const minute = 60 * 1000;
const data = {
  timestamp: [now, now + minute, now + minute * 2],
  cases: [123, 125, 135],
  rate: [0.01, 0.02, 0.04],
};
const dataHeadless = {
  '0': [now, now + minute, now + minute * 2],
  '1': [123, 125, 135],
  '2': [0.01, 0.02, 0.04],
};

describe('parseCSV; csv with header', () => {
  test('Numbers, commas, first letter in header uppercased, auto separator', () => {
    const csv = [
      'Timestamp,Cases,Rate',
      `${now},123,0.01`,
      `${now + minute},125,0.02`,
      `${now + minute * 2},135,0.04`,
    ].join('\n');

    expect(parseCSV(csv)).toStrictEqual([data, ['timestamp', 'cases', 'rate']]);
  });

  test('Numbers, tabs, auto separator', () => {
    const csv = [
      'Timestamp\tCases\tRate',
      `${now}\t123\t0.01`,
      `${now + minute}\t125\t0.02`,
      `${now + minute * 2}\t135\t0.04`,
    ].join('\n');

    expect(parseCSV(csv)).toStrictEqual([data, ['timestamp', 'cases', 'rate']]);
  });

  test('Numbers + text, separated by ;, auto separator', () => {
    const csv = [
      'Timestamp;Cases;Rate;Gender',
      `${now};123;0.01;M`,
      `${now + minute};125;0.02;F`,
      `${now + minute * 2};135;0.04;F`,
    ].join('\n');
    const expected = { ...data };

    expected.gender = ['M', 'F', 'F'];
    expect(parseCSV(csv)).toStrictEqual([expected, ['timestamp', 'cases', 'rate', 'gender']]);
  });

  test('Date + numbers + text, commas, auto separator', () => {
    const csv = [
      'Time;Cases;Rate;Gender',
      `${dateISO(now)},123,0.01,M`,
      `${dateISO(now + minute)};125;0.02;F`,
      `${dateISO(now + minute * 2)};135;0.04;F`,
    ].join('\n');

    expect(() => parseCSV(csv)).toThrow('You can provide correct');
  });

  test('Date + numbers + text, commas, separator given', () => {
    const csv = [
      'Time,Cases,Rate,Gender',
      `${dateISO(now)},123,0.01,M`,
      `${dateISO(now + minute)},125,0.02,F`,
      `${dateISO(now + minute * 2)},135,0.04,F`,
    ].join('\n');
    const expected = { ...data };

    expected.time = expected.timestamp.map(dateISO);
    delete expected.timestamp;
    expected.gender = ['M', 'F', 'F'];
    expect(parseCSV(csv, ',')).toStrictEqual([expected, ['time', 'cases', 'rate', 'gender']]);
  });
});

describe('parseCSV; headless csv', () => {
  test('Numbers, commas, auto separator', () => {
    const csv = [`${now},123,0.01`, `${now + minute},125,0.02`, `${now + minute * 2},135,0.04`].join('\n');

    expect(parseCSV(csv)).toStrictEqual([dataHeadless, ['0', '1', '2']]);
  });

  test('Numbers, tabs, auto separator', () => {
    const csv = [`${now}\t123\t0.01`, `${now + minute}\t125\t0.02`, `${now + minute * 2}\t135\t0.04`].join('\n');

    expect(parseCSV(csv)).toStrictEqual([dataHeadless, ['0', '1', '2']]);
  });

  test('Date + numbers + text, commas, separator given', () => {
    const csv = [
      `${dateISO(now)},123,0.01,M`,
      `${dateISO(now + minute)},125,0.02,F`,
      `${dateISO(now + minute * 2)},135,0.04,F`,
    ].join('\n');
    const expected = { ...dataHeadless };

    expected['0'] = expected['0'].map(dateISO);
    expected['3'] = ['M', 'F', 'F'];
    expect(parseCSV(csv, ',')).toStrictEqual([expected, ['0', '1', '2', '3']]);
  });

  test('Empty values', () => {
    const csv = ['123,0.01,M', '125,,F', '135,0.04,'].join('\n');
    const expected = { '0': [123, 125, 135], '1': [0.01, 0, 0.04], '2': ['M', 'F', 0] };

    expect(parseCSV(csv, ',')).toStrictEqual([expected, ['0', '1', '2']]);
  });
});

describe('parseValue', () => {
  const data = {
    html: '<a href="https://labelstud.io">Label Studio</a>',
    url: 'https://labelstud.io',
    name: 'Label Studio',
    num2str: '123',
    messages: {
      greeting: 'Hey!',
      error: 'It\'s broken.',
    },
  };

  test('Plain text', () => {
    expect(parseValue('just text', data)).toEqual('just text');
  });

  test('Variable', () => {
    expect(parseValue('$url', data)).toEqual('https://labelstud.io');
  });

  test('Alphanumeric', () => {
    expect(parseValue('$num2str', data)).toEqual('123');
  });

  test('Text with one variable', () => {
    expect(parseValue('URL: $url', data)).toEqual('URL: https://labelstud.io');
  });

  test('Text with variables', () => {
    expect(parseValue('URL of $name is $url', data)).toEqual('URL of Label Studio is https://labelstud.io');
  });

  test('Nested values', () => {
    expect(parseValue('$messages.greeting $messages.error [error]', data)).toEqual('Hey! It\'s broken. [error]');
  });
});
