/**
 * Use formatTimeCallback to style the notch labels as you wish, such
 * as with more detail as the number of pixels per second increases.
 *
 * Here we format as M:SS.frac, with M suppressed for times < 1 minute,
 * and frac having 0, 1, or 2 digits as the zoom increases.
 *
 * Note that if you override the default function, you'll almost
 * certainly want to override timeInterval, primaryLabelInterval and/or
 * secondaryLabelInterval so they all work together.
 *
 * @param: seconds
 * @param: pxPerSec
 */
export const formatTimeCallback = (seconds: number, pxPerSec: number) => {
  const timeDate = new Date(seconds * 1000).toISOString();
  const startIndex = (pxPerSec >= 25 * 10) ? 14 : (seconds >= 3600 ? 11 : 14);
  const endIndex = (pxPerSec >= 25 * 10) ? 23 : 19;
  const formatted = timeDate.substring(startIndex, endIndex);

  return formatted;
  // seconds = Number(seconds);
  // const minutes = Math.floor(seconds / 60);

  // seconds = seconds % 60;

  // // fill up seconds with zeroes
  // let secondsStr = Math.round(seconds).toString();

  // if (pxPerSec >= 25 * 10) {
  //   secondsStr = seconds.toFixed(2);
  // } else if (pxPerSec >= 25 * 1) {
  //   secondsStr = seconds.toFixed(1);
  // }

  // if (minutes > 0) {
  //   if (seconds < 10) {
  //     secondsStr = "0" + secondsStr;
  //   }
  //   return `${minutes}:${secondsStr}`;
  // }
  // return secondsStr;
};

/**
 * Use timeInterval to set the period between notches, in seconds,
 * adding notches as the number of pixels per second increases.
 *
 * Note that if you override the default function, you'll almost
 * certainly want to override formatTimeCallback, primaryLabelInterval
 * and/or secondaryLabelInterval so they all work together.
 *
 * @param: pxPerSec
 */
export const timeInterval = (pxPerSec: number) => {
  let retval = 1;

  if (pxPerSec >= 25 * 100) {
    retval = 0.01;
  } else if (pxPerSec >= 25 * 40) {
    retval = 0.025;
  } else if (pxPerSec >= 25 * 10) {
    retval = 0.1;
  } else if (pxPerSec >= 25 * 4) {
    retval = 0.25;
  } else if (pxPerSec >= 25) {
    retval = 1;
  } else if (pxPerSec * 5 >= 25) {
    retval = 5;
  } else if (pxPerSec * 15 >= 25) {
    retval = 15;
  } else {
    retval = Math.ceil(0.5 / pxPerSec) * 60;
  }
  return retval;
};

/**
 * Return the cadence of notches that get labels in the primary color.
 * EG, return 2 if every 2nd notch should be labeled,
 * return 10 if every 10th notch should be labeled, etc.
 *
 * Note that if you override the default function, you'll almost
 * certainly want to override formatTimeCallback, primaryLabelInterval
 * and/or secondaryLabelInterval so they all work together.
 *
 * @param pxPerSec
 */
export const primaryLabelInterval = (pxPerSec: number) => {
  let retval = 1;

  if (pxPerSec >= 25 * 100) {
    retval = 10;
  } else if (pxPerSec >= 25 * 40) {
    retval = 4;
  } else if (pxPerSec >= 25 * 10) {
    retval = 10;
  } else if (pxPerSec >= 25 * 4) {
    retval = 4;
  } else if (pxPerSec >= 25) {
    retval = 1;
  } else if (pxPerSec * 5 >= 25) {
    retval = 5;
  } else if (pxPerSec * 15 >= 25) {
    retval = 15;
  } else {
    retval = Math.ceil(0.5 / pxPerSec) * 60;
  }
  return retval;
};

/**
 * Return the cadence of notches to get labels in the secondary color.
 * EG, return 2 if every 2nd notch should be labeled,
 * return 10 if every 10th notch should be labeled, etc.
 *
 * Secondary labels are drawn after primary labels, so if
 * you want to have labels every 10 seconds and another color labels
 * every 60 seconds, the 60 second labels should be the secondaries.
 *
 * Note that if you override the default function, you'll almost
 * certainly want to override formatTimeCallback, primaryLabelInterval
 * and/or secondaryLabelInterval so they all work together.
 *
 * @param pxPerSec
 */
export const secondaryLabelInterval = (pxPerSec: number) => {
  // draw one every 10s as an example
  return Math.floor(10 / timeInterval(pxPerSec));
};
