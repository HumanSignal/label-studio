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
  var finishedArray = [],
    isRip,
    isRun,
    ripCount,
    runCount;
  for (var i = 0; i < arr.length; i++) {
    isRip = arr[i] < 0;
    isRun = arr[i] > 0;
    if (isRip) {
      ripCount = Math.abs(arr[i]);
      i += 1;

      finishedArray = finishedArray.concat(arr.slice(i, i + ripCount));
      i += ripCount - 1;
    }
    if (isRun) {
      runCount = arr[i];
      i += 1;
      for (var j = 0; j < runCount; j++) {
        finishedArray.push(arr[i]);
      }
    }
  }
  return finishedArray;
}
