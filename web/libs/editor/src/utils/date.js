function checkISO(value) {
  const regExpISO = /\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z)/;

  return regExpISO.test(value);
}

/**
 * Helper function to convert ms -> HHMMSS
 * @param {number} ms
 * @returns {string}
 */
export function msToHMS(ms) {
  // 1- Convert to seconds:
  let seconds = ms / 1000;
  // 2- Extract hours:
  const hours = parseInt(seconds / 3600); // 3,600 seconds in 1 hour

  seconds = seconds % 3600; // seconds remaining after extracting hours
  // 3- Extract minutes:
  const minutes = parseInt(seconds / 60); // 60 seconds in 1 minute
  // 4- Keep only seconds not extracted to minutes:
  

  seconds = Math.floor(seconds); // % 60;

  return hours + ':' + minutes + ':' + seconds;
}

/**
 * Helper function to pretty date
 */
export function prettyDate(time) {
  if (typeof time !== 'string' && !(time instanceof Date) && !checkISO(time)) return;

  const date = new Date(time),
    diff = (new Date().getTime() - date.getTime()) / 1000,
    day_diff = Math.floor(diff / 86400);

  if (isNaN(day_diff) || day_diff < 0) return;

  return (
    (day_diff === 0 &&
      ((diff < 60 && 'just now') ||
        (diff < 120 && '1 minute ago') ||
        (diff < 3600 && Math.floor(diff / 60) + ' minutes ago') ||
        (diff < 7200 && '1 hour ago') ||
        (diff < 86400 && Math.floor(diff / 3600) + ' hours ago'))) ||
    (day_diff === 1 && 'Yesterday') ||
    (day_diff < 7 && day_diff + ' days ago') ||
    (day_diff < 31 && Math.ceil(day_diff / 7) + ' weeks ago') ||
    day_diff + ' days ago'
  );
}

export function toISODateString(date) {
  date = date || new Date();

  const tzOffest = date.getTimezoneOffset() * 60000;
  const localISOTime = new Date(date.getTime() - tzOffest).toISOString().slice(0, -1);

  return localISOTime;
}

/**
 * Helper function to get current timezone
 */
export function currentISODate() {
  return toISODateString();
}
