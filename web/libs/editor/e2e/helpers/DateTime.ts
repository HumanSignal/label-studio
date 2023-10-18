/**
 * Simple date formatter
 * @param {string} value date in ISO format
 * @param {string} format combinations of y, m, d (e.g. 'ymd')
 * @returns {string} formatted date
 */
export const formatDateValue = (value: string, format: string) => {
  const [y, m, d] = value.split('-');
  let text = '';

  for (const char of format) {
    if (char === 'y') text += y;
    if (char === 'm') text += m;
    if (char === 'd') text += d;
  }
  return text;
};
