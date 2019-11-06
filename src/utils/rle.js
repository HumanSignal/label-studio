/**
 * Run Length Encode
 * @param {array} arr
 */
export function RLEencode(arr) {
  let finishedArray = [];
  let rip = [];
  let runCount = 0;

  for (let i = 1, lastValue = arr[0]; i <= arr.length; i++) {
    if (arr[i] !== lastValue) {
      if (runCount !== 0) {
        finishedArray.push(runCount + 1, lastValue);
      } else {
        rip.push(lastValue);
      }

      runCount = 0;
    }

    if (arr[i] === lastValue || i === arr.length) {
      if (rip.length !== 0) {
        if (rip.length) {
          finishedArray.push(-rip.length);
          finishedArray = finishedArray.concat(rip);
        }

        rip = [];
      }

      runCount++;
    }

    lastValue = arr[i];
  }

  return finishedArray;
}

/**
 * Run Length Decode
 * @param {array} arr
 */
export function RLEdecode(arr) {
  return arr;
}
