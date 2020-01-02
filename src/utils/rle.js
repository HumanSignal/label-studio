/**
 * Run Length Encode
 * @param {array} arr
 */
export function RLEencode(arr) {
  var encoding = [];
  var prev, count, i;

  for (count = 1, prev = arr[0], i = 1; i < arr.length; i++) {
    if (arr[i] !== prev) {
      encoding.push(count, prev);
      count = 1;
      prev = arr[i];
    } else count++;
  }

  encoding.push(count, prev);

  return encoding;
}

/**
 * Run Length Decode
 * @param {array} arr
 */
export function RLEdecode(encoded) {
  let uncompressed = [];
  let test = [];

  encoded.forEach((el, ind) => {
    if (ind % 2 === 0) {
      uncompressed.push(Array.from(new Array(1 + el).join(encoded[ind + 1])));
    }
  });

  uncompressed.flat(2).forEach(el => test.push(parseInt(el)));
  return test;
}
