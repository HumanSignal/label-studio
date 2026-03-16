// editor/node_modules/@babel/runtime/helpers/esm/typeof.js
function _typeof(o) {
  "@babel/helpers - typeof";
  return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(o2) {
    return typeof o2;
  } : function(o2) {
    return o2 && "function" == typeof Symbol && o2.constructor === Symbol && o2 !== Symbol.prototype ? "symbol" : typeof o2;
  }, _typeof(o);
}

// editor/node_modules/date-fns/esm/_lib/requiredArgs/index.js
function requiredArgs(required, args) {
  if (args.length < required) {
    throw new TypeError(required + " argument" + (required > 1 ? "s" : "") + " required, but only " + args.length + " present");
  }
}

// editor/node_modules/date-fns/esm/toDate/index.js
function toDate(argument) {
  requiredArgs(1, arguments);
  var argStr = Object.prototype.toString.call(argument);
  if (argument instanceof Date || _typeof(argument) === "object" && argStr === "[object Date]") {
    return new Date(argument.getTime());
  } else if (typeof argument === "number" || argStr === "[object Number]") {
    return new Date(argument);
  } else {
    if ((typeof argument === "string" || argStr === "[object String]") && typeof console !== "undefined") {
      console.warn("Starting with v2.0.0-beta.1 date-fns doesn't accept strings as date arguments. Please use `parseISO` to parse strings. See: https://github.com/date-fns/date-fns/blob/master/docs/upgradeGuide.md#string-arguments");
      console.warn(new Error().stack);
    }
    return /* @__PURE__ */ new Date(NaN);
  }
}

// editor/node_modules/date-fns/esm/_lib/defaultOptions/index.js
var defaultOptions = {};
function getDefaultOptions() {
  return defaultOptions;
}

// editor/node_modules/date-fns/esm/_lib/getTimezoneOffsetInMilliseconds/index.js
function getTimezoneOffsetInMilliseconds(date) {
  var utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds()));
  utcDate.setUTCFullYear(date.getFullYear());
  return date.getTime() - utcDate.getTime();
}

// editor/node_modules/date-fns/esm/compareAsc/index.js
function compareAsc(dirtyDateLeft, dirtyDateRight) {
  requiredArgs(2, arguments);
  var dateLeft = toDate(dirtyDateLeft);
  var dateRight = toDate(dirtyDateRight);
  var diff = dateLeft.getTime() - dateRight.getTime();
  if (diff < 0) {
    return -1;
  } else if (diff > 0) {
    return 1;
  } else {
    return diff;
  }
}

// editor/node_modules/date-fns/esm/differenceInCalendarMonths/index.js
function differenceInCalendarMonths(dirtyDateLeft, dirtyDateRight) {
  requiredArgs(2, arguments);
  var dateLeft = toDate(dirtyDateLeft);
  var dateRight = toDate(dirtyDateRight);
  var yearDiff = dateLeft.getFullYear() - dateRight.getFullYear();
  var monthDiff = dateLeft.getMonth() - dateRight.getMonth();
  return yearDiff * 12 + monthDiff;
}

// editor/node_modules/date-fns/esm/differenceInMilliseconds/index.js
function differenceInMilliseconds(dateLeft, dateRight) {
  requiredArgs(2, arguments);
  return toDate(dateLeft).getTime() - toDate(dateRight).getTime();
}

// editor/node_modules/date-fns/esm/_lib/roundingMethods/index.js
var roundingMap = {
  ceil: Math.ceil,
  round: Math.round,
  floor: Math.floor,
  trunc: function trunc(value) {
    return value < 0 ? Math.ceil(value) : Math.floor(value);
  }
  // Math.trunc is not supported by IE
};
var defaultRoundingMethod = "trunc";
function getRoundingMethod(method) {
  return method ? roundingMap[method] : roundingMap[defaultRoundingMethod];
}

// editor/node_modules/date-fns/esm/endOfDay/index.js
function endOfDay(dirtyDate) {
  requiredArgs(1, arguments);
  var date = toDate(dirtyDate);
  date.setHours(23, 59, 59, 999);
  return date;
}

// editor/node_modules/date-fns/esm/endOfMonth/index.js
function endOfMonth(dirtyDate) {
  requiredArgs(1, arguments);
  var date = toDate(dirtyDate);
  var month = date.getMonth();
  date.setFullYear(date.getFullYear(), month + 1, 0);
  date.setHours(23, 59, 59, 999);
  return date;
}

// editor/node_modules/date-fns/esm/isLastDayOfMonth/index.js
function isLastDayOfMonth(dirtyDate) {
  requiredArgs(1, arguments);
  var date = toDate(dirtyDate);
  return endOfDay(date).getTime() === endOfMonth(date).getTime();
}

// editor/node_modules/date-fns/esm/differenceInMonths/index.js
function differenceInMonths(dirtyDateLeft, dirtyDateRight) {
  requiredArgs(2, arguments);
  var dateLeft = toDate(dirtyDateLeft);
  var dateRight = toDate(dirtyDateRight);
  var sign = compareAsc(dateLeft, dateRight);
  var difference = Math.abs(differenceInCalendarMonths(dateLeft, dateRight));
  var result;
  if (difference < 1) {
    result = 0;
  } else {
    if (dateLeft.getMonth() === 1 && dateLeft.getDate() > 27) {
      dateLeft.setDate(30);
    }
    dateLeft.setMonth(dateLeft.getMonth() - sign * difference);
    var isLastMonthNotFull = compareAsc(dateLeft, dateRight) === -sign;
    if (isLastDayOfMonth(toDate(dirtyDateLeft)) && difference === 1 && compareAsc(dirtyDateLeft, dateRight) === 1) {
      isLastMonthNotFull = false;
    }
    result = sign * (difference - Number(isLastMonthNotFull));
  }
  return result === 0 ? 0 : result;
}

// editor/node_modules/date-fns/esm/differenceInSeconds/index.js
function differenceInSeconds(dateLeft, dateRight, options) {
  requiredArgs(2, arguments);
  var diff = differenceInMilliseconds(dateLeft, dateRight) / 1e3;
  return getRoundingMethod(options === null || options === void 0 ? void 0 : options.roundingMethod)(diff);
}

// editor/node_modules/date-fns/esm/locale/en-US/_lib/formatDistance/index.js
var formatDistanceLocale = {
  lessThanXSeconds: {
    one: "less than a second",
    other: "less than {{count}} seconds"
  },
  xSeconds: {
    one: "1 second",
    other: "{{count}} seconds"
  },
  halfAMinute: "half a minute",
  lessThanXMinutes: {
    one: "less than a minute",
    other: "less than {{count}} minutes"
  },
  xMinutes: {
    one: "1 minute",
    other: "{{count}} minutes"
  },
  aboutXHours: {
    one: "about 1 hour",
    other: "about {{count}} hours"
  },
  xHours: {
    one: "1 hour",
    other: "{{count}} hours"
  },
  xDays: {
    one: "1 day",
    other: "{{count}} days"
  },
  aboutXWeeks: {
    one: "about 1 week",
    other: "about {{count}} weeks"
  },
  xWeeks: {
    one: "1 week",
    other: "{{count}} weeks"
  },
  aboutXMonths: {
    one: "about 1 month",
    other: "about {{count}} months"
  },
  xMonths: {
    one: "1 month",
    other: "{{count}} months"
  },
  aboutXYears: {
    one: "about 1 year",
    other: "about {{count}} years"
  },
  xYears: {
    one: "1 year",
    other: "{{count}} years"
  },
  overXYears: {
    one: "over 1 year",
    other: "over {{count}} years"
  },
  almostXYears: {
    one: "almost 1 year",
    other: "almost {{count}} years"
  }
};
var formatDistance = function formatDistance2(token, count, options) {
  var result;
  var tokenValue = formatDistanceLocale[token];
  if (typeof tokenValue === "string") {
    result = tokenValue;
  } else if (count === 1) {
    result = tokenValue.one;
  } else {
    result = tokenValue.other.replace("{{count}}", count.toString());
  }
  if (options !== null && options !== void 0 && options.addSuffix) {
    if (options.comparison && options.comparison > 0) {
      return "in " + result;
    } else {
      return result + " ago";
    }
  }
  return result;
};
var formatDistance_default = formatDistance;

// editor/node_modules/date-fns/esm/locale/_lib/buildFormatLongFn/index.js
function buildFormatLongFn(args) {
  return function() {
    var options = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : {};
    var width = options.width ? String(options.width) : args.defaultWidth;
    var format = args.formats[width] || args.formats[args.defaultWidth];
    return format;
  };
}

// editor/node_modules/date-fns/esm/locale/en-US/_lib/formatLong/index.js
var dateFormats = {
  full: "EEEE, MMMM do, y",
  long: "MMMM do, y",
  medium: "MMM d, y",
  short: "MM/dd/yyyy"
};
var timeFormats = {
  full: "h:mm:ss a zzzz",
  long: "h:mm:ss a z",
  medium: "h:mm:ss a",
  short: "h:mm a"
};
var dateTimeFormats = {
  full: "{{date}} 'at' {{time}}",
  long: "{{date}} 'at' {{time}}",
  medium: "{{date}}, {{time}}",
  short: "{{date}}, {{time}}"
};
var formatLong = {
  date: buildFormatLongFn({
    formats: dateFormats,
    defaultWidth: "full"
  }),
  time: buildFormatLongFn({
    formats: timeFormats,
    defaultWidth: "full"
  }),
  dateTime: buildFormatLongFn({
    formats: dateTimeFormats,
    defaultWidth: "full"
  })
};
var formatLong_default = formatLong;

// editor/node_modules/date-fns/esm/locale/en-US/_lib/formatRelative/index.js
var formatRelativeLocale = {
  lastWeek: "'last' eeee 'at' p",
  yesterday: "'yesterday at' p",
  today: "'today at' p",
  tomorrow: "'tomorrow at' p",
  nextWeek: "eeee 'at' p",
  other: "P"
};
var formatRelative = function formatRelative2(token, _date, _baseDate, _options) {
  return formatRelativeLocale[token];
};
var formatRelative_default = formatRelative;

// editor/node_modules/date-fns/esm/locale/_lib/buildLocalizeFn/index.js
function buildLocalizeFn(args) {
  return function(dirtyIndex, options) {
    var context = options !== null && options !== void 0 && options.context ? String(options.context) : "standalone";
    var valuesArray;
    if (context === "formatting" && args.formattingValues) {
      var defaultWidth = args.defaultFormattingWidth || args.defaultWidth;
      var width = options !== null && options !== void 0 && options.width ? String(options.width) : defaultWidth;
      valuesArray = args.formattingValues[width] || args.formattingValues[defaultWidth];
    } else {
      var _defaultWidth = args.defaultWidth;
      var _width = options !== null && options !== void 0 && options.width ? String(options.width) : args.defaultWidth;
      valuesArray = args.values[_width] || args.values[_defaultWidth];
    }
    var index = args.argumentCallback ? args.argumentCallback(dirtyIndex) : dirtyIndex;
    return valuesArray[index];
  };
}

// editor/node_modules/date-fns/esm/locale/en-US/_lib/localize/index.js
var eraValues = {
  narrow: ["B", "A"],
  abbreviated: ["BC", "AD"],
  wide: ["Before Christ", "Anno Domini"]
};
var quarterValues = {
  narrow: ["1", "2", "3", "4"],
  abbreviated: ["Q1", "Q2", "Q3", "Q4"],
  wide: ["1st quarter", "2nd quarter", "3rd quarter", "4th quarter"]
};
var monthValues = {
  narrow: ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"],
  abbreviated: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  wide: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
};
var dayValues = {
  narrow: ["S", "M", "T", "W", "T", "F", "S"],
  short: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
  abbreviated: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  wide: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
};
var dayPeriodValues = {
  narrow: {
    am: "a",
    pm: "p",
    midnight: "mi",
    noon: "n",
    morning: "morning",
    afternoon: "afternoon",
    evening: "evening",
    night: "night"
  },
  abbreviated: {
    am: "AM",
    pm: "PM",
    midnight: "midnight",
    noon: "noon",
    morning: "morning",
    afternoon: "afternoon",
    evening: "evening",
    night: "night"
  },
  wide: {
    am: "a.m.",
    pm: "p.m.",
    midnight: "midnight",
    noon: "noon",
    morning: "morning",
    afternoon: "afternoon",
    evening: "evening",
    night: "night"
  }
};
var formattingDayPeriodValues = {
  narrow: {
    am: "a",
    pm: "p",
    midnight: "mi",
    noon: "n",
    morning: "in the morning",
    afternoon: "in the afternoon",
    evening: "in the evening",
    night: "at night"
  },
  abbreviated: {
    am: "AM",
    pm: "PM",
    midnight: "midnight",
    noon: "noon",
    morning: "in the morning",
    afternoon: "in the afternoon",
    evening: "in the evening",
    night: "at night"
  },
  wide: {
    am: "a.m.",
    pm: "p.m.",
    midnight: "midnight",
    noon: "noon",
    morning: "in the morning",
    afternoon: "in the afternoon",
    evening: "in the evening",
    night: "at night"
  }
};
var ordinalNumber = function ordinalNumber2(dirtyNumber, _options) {
  var number2 = Number(dirtyNumber);
  var rem100 = number2 % 100;
  if (rem100 > 20 || rem100 < 10) {
    switch (rem100 % 10) {
      case 1:
        return number2 + "st";
      case 2:
        return number2 + "nd";
      case 3:
        return number2 + "rd";
    }
  }
  return number2 + "th";
};
var localize = {
  ordinalNumber,
  era: buildLocalizeFn({
    values: eraValues,
    defaultWidth: "wide"
  }),
  quarter: buildLocalizeFn({
    values: quarterValues,
    defaultWidth: "wide",
    argumentCallback: function argumentCallback(quarter) {
      return quarter - 1;
    }
  }),
  month: buildLocalizeFn({
    values: monthValues,
    defaultWidth: "wide"
  }),
  day: buildLocalizeFn({
    values: dayValues,
    defaultWidth: "wide"
  }),
  dayPeriod: buildLocalizeFn({
    values: dayPeriodValues,
    defaultWidth: "wide",
    formattingValues: formattingDayPeriodValues,
    defaultFormattingWidth: "wide"
  })
};
var localize_default = localize;

// editor/node_modules/date-fns/esm/locale/_lib/buildMatchFn/index.js
function buildMatchFn(args) {
  return function(string2) {
    var options = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
    var width = options.width;
    var matchPattern = width && args.matchPatterns[width] || args.matchPatterns[args.defaultMatchWidth];
    var matchResult = string2.match(matchPattern);
    if (!matchResult) {
      return null;
    }
    var matchedString = matchResult[0];
    var parsePatterns = width && args.parsePatterns[width] || args.parsePatterns[args.defaultParseWidth];
    var key = Array.isArray(parsePatterns) ? findIndex(parsePatterns, function(pattern) {
      return pattern.test(matchedString);
    }) : findKey(parsePatterns, function(pattern) {
      return pattern.test(matchedString);
    });
    var value;
    value = args.valueCallback ? args.valueCallback(key) : key;
    value = options.valueCallback ? options.valueCallback(value) : value;
    var rest = string2.slice(matchedString.length);
    return {
      value,
      rest
    };
  };
}
function findKey(object, predicate) {
  for (var key in object) {
    if (object.hasOwnProperty(key) && predicate(object[key])) {
      return key;
    }
  }
  return void 0;
}
function findIndex(array, predicate) {
  for (var key = 0; key < array.length; key++) {
    if (predicate(array[key])) {
      return key;
    }
  }
  return void 0;
}

// editor/node_modules/date-fns/esm/locale/_lib/buildMatchPatternFn/index.js
function buildMatchPatternFn(args) {
  return function(string2) {
    var options = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {};
    var matchResult = string2.match(args.matchPattern);
    if (!matchResult) return null;
    var matchedString = matchResult[0];
    var parseResult = string2.match(args.parsePattern);
    if (!parseResult) return null;
    var value = args.valueCallback ? args.valueCallback(parseResult[0]) : parseResult[0];
    value = options.valueCallback ? options.valueCallback(value) : value;
    var rest = string2.slice(matchedString.length);
    return {
      value,
      rest
    };
  };
}

// editor/node_modules/date-fns/esm/locale/en-US/_lib/match/index.js
var matchOrdinalNumberPattern = /^(\d+)(th|st|nd|rd)?/i;
var parseOrdinalNumberPattern = /\d+/i;
var matchEraPatterns = {
  narrow: /^(b|a)/i,
  abbreviated: /^(b\.?\s?c\.?|b\.?\s?c\.?\s?e\.?|a\.?\s?d\.?|c\.?\s?e\.?)/i,
  wide: /^(before christ|before common era|anno domini|common era)/i
};
var parseEraPatterns = {
  any: [/^b/i, /^(a|c)/i]
};
var matchQuarterPatterns = {
  narrow: /^[1234]/i,
  abbreviated: /^q[1234]/i,
  wide: /^[1234](th|st|nd|rd)? quarter/i
};
var parseQuarterPatterns = {
  any: [/1/i, /2/i, /3/i, /4/i]
};
var matchMonthPatterns = {
  narrow: /^[jfmasond]/i,
  abbreviated: /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,
  wide: /^(january|february|march|april|may|june|july|august|september|october|november|december)/i
};
var parseMonthPatterns = {
  narrow: [/^j/i, /^f/i, /^m/i, /^a/i, /^m/i, /^j/i, /^j/i, /^a/i, /^s/i, /^o/i, /^n/i, /^d/i],
  any: [/^ja/i, /^f/i, /^mar/i, /^ap/i, /^may/i, /^jun/i, /^jul/i, /^au/i, /^s/i, /^o/i, /^n/i, /^d/i]
};
var matchDayPatterns = {
  narrow: /^[smtwf]/i,
  short: /^(su|mo|tu|we|th|fr|sa)/i,
  abbreviated: /^(sun|mon|tue|wed|thu|fri|sat)/i,
  wide: /^(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/i
};
var parseDayPatterns = {
  narrow: [/^s/i, /^m/i, /^t/i, /^w/i, /^t/i, /^f/i, /^s/i],
  any: [/^su/i, /^m/i, /^tu/i, /^w/i, /^th/i, /^f/i, /^sa/i]
};
var matchDayPeriodPatterns = {
  narrow: /^(a|p|mi|n|(in the|at) (morning|afternoon|evening|night))/i,
  any: /^([ap]\.?\s?m\.?|midnight|noon|(in the|at) (morning|afternoon|evening|night))/i
};
var parseDayPeriodPatterns = {
  any: {
    am: /^a/i,
    pm: /^p/i,
    midnight: /^mi/i,
    noon: /^no/i,
    morning: /morning/i,
    afternoon: /afternoon/i,
    evening: /evening/i,
    night: /night/i
  }
};
var match = {
  ordinalNumber: buildMatchPatternFn({
    matchPattern: matchOrdinalNumberPattern,
    parsePattern: parseOrdinalNumberPattern,
    valueCallback: function valueCallback(value) {
      return parseInt(value, 10);
    }
  }),
  era: buildMatchFn({
    matchPatterns: matchEraPatterns,
    defaultMatchWidth: "wide",
    parsePatterns: parseEraPatterns,
    defaultParseWidth: "any"
  }),
  quarter: buildMatchFn({
    matchPatterns: matchQuarterPatterns,
    defaultMatchWidth: "wide",
    parsePatterns: parseQuarterPatterns,
    defaultParseWidth: "any",
    valueCallback: function valueCallback2(index) {
      return index + 1;
    }
  }),
  month: buildMatchFn({
    matchPatterns: matchMonthPatterns,
    defaultMatchWidth: "wide",
    parsePatterns: parseMonthPatterns,
    defaultParseWidth: "any"
  }),
  day: buildMatchFn({
    matchPatterns: matchDayPatterns,
    defaultMatchWidth: "wide",
    parsePatterns: parseDayPatterns,
    defaultParseWidth: "any"
  }),
  dayPeriod: buildMatchFn({
    matchPatterns: matchDayPeriodPatterns,
    defaultMatchWidth: "any",
    parsePatterns: parseDayPeriodPatterns,
    defaultParseWidth: "any"
  })
};
var match_default = match;

// editor/node_modules/date-fns/esm/locale/en-US/index.js
var locale = {
  code: "en-US",
  formatDistance: formatDistance_default,
  formatLong: formatLong_default,
  formatRelative: formatRelative_default,
  localize: localize_default,
  match: match_default,
  options: {
    weekStartsOn: 0,
    firstWeekContainsDate: 1
  }
};
var en_US_default = locale;

// editor/node_modules/date-fns/esm/_lib/defaultLocale/index.js
var defaultLocale_default = en_US_default;

// editor/node_modules/date-fns/esm/_lib/assign/index.js
function assign(target, object) {
  if (target == null) {
    throw new TypeError("assign requires that input parameter not be null or undefined");
  }
  for (var property in object) {
    if (Object.prototype.hasOwnProperty.call(object, property)) {
      ;
      target[property] = object[property];
    }
  }
  return target;
}

// editor/node_modules/date-fns/esm/_lib/cloneObject/index.js
function cloneObject(object) {
  return assign({}, object);
}

// editor/node_modules/date-fns/esm/formatDistance/index.js
var MINUTES_IN_DAY = 1440;
var MINUTES_IN_ALMOST_TWO_DAYS = 2520;
var MINUTES_IN_MONTH = 43200;
var MINUTES_IN_TWO_MONTHS = 86400;
function formatDistance3(dirtyDate, dirtyBaseDate, options) {
  var _ref, _options$locale;
  requiredArgs(2, arguments);
  var defaultOptions2 = getDefaultOptions();
  var locale2 = (_ref = (_options$locale = options === null || options === void 0 ? void 0 : options.locale) !== null && _options$locale !== void 0 ? _options$locale : defaultOptions2.locale) !== null && _ref !== void 0 ? _ref : defaultLocale_default;
  if (!locale2.formatDistance) {
    throw new RangeError("locale must contain formatDistance property");
  }
  var comparison = compareAsc(dirtyDate, dirtyBaseDate);
  if (isNaN(comparison)) {
    throw new RangeError("Invalid time value");
  }
  var localizeOptions = assign(cloneObject(options), {
    addSuffix: Boolean(options === null || options === void 0 ? void 0 : options.addSuffix),
    comparison
  });
  var dateLeft;
  var dateRight;
  if (comparison > 0) {
    dateLeft = toDate(dirtyBaseDate);
    dateRight = toDate(dirtyDate);
  } else {
    dateLeft = toDate(dirtyDate);
    dateRight = toDate(dirtyBaseDate);
  }
  var seconds = differenceInSeconds(dateRight, dateLeft);
  var offsetInSeconds = (getTimezoneOffsetInMilliseconds(dateRight) - getTimezoneOffsetInMilliseconds(dateLeft)) / 1e3;
  var minutes = Math.round((seconds - offsetInSeconds) / 60);
  var months;
  if (minutes < 2) {
    if (options !== null && options !== void 0 && options.includeSeconds) {
      if (seconds < 5) {
        return locale2.formatDistance("lessThanXSeconds", 5, localizeOptions);
      } else if (seconds < 10) {
        return locale2.formatDistance("lessThanXSeconds", 10, localizeOptions);
      } else if (seconds < 20) {
        return locale2.formatDistance("lessThanXSeconds", 20, localizeOptions);
      } else if (seconds < 40) {
        return locale2.formatDistance("halfAMinute", 0, localizeOptions);
      } else if (seconds < 60) {
        return locale2.formatDistance("lessThanXMinutes", 1, localizeOptions);
      } else {
        return locale2.formatDistance("xMinutes", 1, localizeOptions);
      }
    } else {
      if (minutes === 0) {
        return locale2.formatDistance("lessThanXMinutes", 1, localizeOptions);
      } else {
        return locale2.formatDistance("xMinutes", minutes, localizeOptions);
      }
    }
  } else if (minutes < 45) {
    return locale2.formatDistance("xMinutes", minutes, localizeOptions);
  } else if (minutes < 90) {
    return locale2.formatDistance("aboutXHours", 1, localizeOptions);
  } else if (minutes < MINUTES_IN_DAY) {
    var hours = Math.round(minutes / 60);
    return locale2.formatDistance("aboutXHours", hours, localizeOptions);
  } else if (minutes < MINUTES_IN_ALMOST_TWO_DAYS) {
    return locale2.formatDistance("xDays", 1, localizeOptions);
  } else if (minutes < MINUTES_IN_MONTH) {
    var days = Math.round(minutes / MINUTES_IN_DAY);
    return locale2.formatDistance("xDays", days, localizeOptions);
  } else if (minutes < MINUTES_IN_TWO_MONTHS) {
    months = Math.round(minutes / MINUTES_IN_MONTH);
    return locale2.formatDistance("aboutXMonths", months, localizeOptions);
  }
  months = differenceInMonths(dateRight, dateLeft);
  if (months < 12) {
    var nearestMonth = Math.round(minutes / MINUTES_IN_MONTH);
    return locale2.formatDistance("xMonths", nearestMonth, localizeOptions);
  } else {
    var monthsSinceStartOfYear = months % 12;
    var years = Math.floor(months / 12);
    if (monthsSinceStartOfYear < 3) {
      return locale2.formatDistance("aboutXYears", years, localizeOptions);
    } else if (monthsSinceStartOfYear < 9) {
      return locale2.formatDistance("overXYears", years, localizeOptions);
    } else {
      return locale2.formatDistance("almostXYears", years + 1, localizeOptions);
    }
  }
}

// editor/node_modules/date-fns/esm/formatDistanceToNow/index.js
function formatDistanceToNow(dirtyDate, options) {
  requiredArgs(1, arguments);
  return formatDistance3(dirtyDate, Date.now(), options);
}

// editor/node_modules/mobx/lib/mobx.module.js
var OBFUSCATED_ERROR = "An invariant failed, however the error is obfuscated because this is a production build.";
var EMPTY_ARRAY = [];
Object.freeze(EMPTY_ARRAY);
var EMPTY_OBJECT = {};
Object.freeze(EMPTY_OBJECT);
function getNextId() {
  return ++globalState.mobxGuid;
}
function fail2(message) {
  invariant(false, message);
  throw "X";
}
function invariant(check, message) {
  if (!check)
    throw new Error("[mobx] " + (message || OBFUSCATED_ERROR));
}
function once(func) {
  var invoked = false;
  return function() {
    if (invoked)
      return;
    invoked = true;
    return func.apply(this, arguments);
  };
}
var noop = function() {
};
function unique(list) {
  var res = [];
  list.forEach(function(item) {
    if (res.indexOf(item) === -1)
      res.push(item);
  });
  return res;
}
function isObject(value) {
  return value !== null && typeof value === "object";
}
function isPlainObject(value) {
  if (value === null || typeof value !== "object")
    return false;
  var proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}
function convertToMap(dataStructure) {
  if (isES6Map(dataStructure) || isObservableMap(dataStructure)) {
    return dataStructure;
  } else if (Array.isArray(dataStructure)) {
    return new Map(dataStructure);
  } else if (isPlainObject(dataStructure)) {
    var map = /* @__PURE__ */ new Map();
    for (var key in dataStructure) {
      map.set(key, dataStructure[key]);
    }
    return map;
  } else {
    return fail2("Cannot convert to map from '" + dataStructure + "'");
  }
}
function addHiddenProp(object, propName, value) {
  Object.defineProperty(object, propName, {
    enumerable: false,
    writable: true,
    configurable: true,
    value
  });
}
function addHiddenFinalProp(object, propName, value) {
  Object.defineProperty(object, propName, {
    enumerable: false,
    writable: false,
    configurable: true,
    value
  });
}
function isPropertyConfigurable(object, prop) {
  var descriptor = Object.getOwnPropertyDescriptor(object, prop);
  return !descriptor || descriptor.configurable !== false && descriptor.writable !== false;
}
function assertPropertyConfigurable(object, prop) {
  if (process.env.NODE_ENV !== "production" && !isPropertyConfigurable(object, prop))
    fail2("Cannot make property '" + prop.toString() + "' observable, it is not configurable and writable in the target object");
}
function createInstanceofPredicate(name, clazz) {
  var propName = "isMobX" + name;
  clazz.prototype[propName] = true;
  return function(x) {
    return isObject(x) && x[propName] === true;
  };
}
function isES6Map(thing) {
  return thing instanceof Map;
}
function isES6Set(thing) {
  return thing instanceof Set;
}
function getPlainObjectKeys(object) {
  var enumerables = /* @__PURE__ */ new Set();
  for (var key in object)
    enumerables.add(key);
  Object.getOwnPropertySymbols(object).forEach(function(k) {
    if (Object.getOwnPropertyDescriptor(object, k).enumerable)
      enumerables.add(k);
  });
  return Array.from(enumerables);
}
function stringifyKey(key) {
  if (key && key.toString)
    return key.toString();
  else
    return new String(key).toString();
}
function toPrimitive(value) {
  return value === null ? null : typeof value === "object" ? "" + value : value;
}
var ownKeys = typeof Reflect !== "undefined" && Reflect.ownKeys ? Reflect.ownKeys : Object.getOwnPropertySymbols ? function(obj) {
  return Object.getOwnPropertyNames(obj).concat(Object.getOwnPropertySymbols(obj));
} : (
  /* istanbul ignore next */
  Object.getOwnPropertyNames
);
var $mobx = /* @__PURE__ */ Symbol("mobx administration");
var Atom = (
  /** @class */
  (function() {
    function Atom2(name) {
      if (name === void 0) {
        name = "Atom@" + getNextId();
      }
      this.name = name;
      this.isPendingUnobservation = false;
      this.isBeingObserved = false;
      this.observers = /* @__PURE__ */ new Set();
      this.diffValue = 0;
      this.lastAccessedBy = 0;
      this.lowestObserverState = IDerivationState.NOT_TRACKING;
    }
    Atom2.prototype.onBecomeObserved = function() {
      if (this.onBecomeObservedListeners) {
        this.onBecomeObservedListeners.forEach(function(listener) {
          return listener();
        });
      }
    };
    Atom2.prototype.onBecomeUnobserved = function() {
      if (this.onBecomeUnobservedListeners) {
        this.onBecomeUnobservedListeners.forEach(function(listener) {
          return listener();
        });
      }
    };
    Atom2.prototype.reportObserved = function() {
      return reportObserved(this);
    };
    Atom2.prototype.reportChanged = function() {
      startBatch();
      propagateChanged(this);
      endBatch();
    };
    Atom2.prototype.toString = function() {
      return this.name;
    };
    return Atom2;
  })()
);
var isAtom = createInstanceofPredicate("Atom", Atom);
function createAtom(name, onBecomeObservedHandler, onBecomeUnobservedHandler) {
  if (onBecomeObservedHandler === void 0) {
    onBecomeObservedHandler = noop;
  }
  if (onBecomeUnobservedHandler === void 0) {
    onBecomeUnobservedHandler = noop;
  }
  var atom = new Atom(name);
  if (onBecomeObservedHandler !== noop) {
    onBecomeObserved(atom, onBecomeObservedHandler);
  }
  if (onBecomeUnobservedHandler !== noop) {
    onBecomeUnobserved(atom, onBecomeUnobservedHandler);
  }
  return atom;
}
function identityComparer(a, b) {
  return a === b;
}
function structuralComparer(a, b) {
  return deepEqual(a, b);
}
function shallowComparer(a, b) {
  return deepEqual(a, b, 1);
}
function defaultComparer(a, b) {
  return Object.is(a, b);
}
var comparer = {
  identity: identityComparer,
  structural: structuralComparer,
  default: defaultComparer,
  shallow: shallowComparer
};
var extendStatics = function(d, b) {
  extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d2, b2) {
    d2.__proto__ = b2;
  } || function(d2, b2) {
    for (var p in b2) if (b2.hasOwnProperty(p)) d2[p] = b2[p];
  };
  return extendStatics(d, b);
};
function __extends(d, b) {
  extendStatics(d, b);
  function __() {
    this.constructor = d;
  }
  d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
}
var __assign = function() {
  __assign = Object.assign || function __assign3(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
      s = arguments[i];
      for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
    }
    return t;
  };
  return __assign.apply(this, arguments);
};
function __values(o) {
  var m = typeof Symbol === "function" && o[Symbol.iterator], i = 0;
  if (m) return m.call(o);
  return {
    next: function() {
      if (o && i >= o.length) o = void 0;
      return { value: o && o[i++], done: !o };
    }
  };
}
function __read(o, n) {
  var m = typeof Symbol === "function" && o[Symbol.iterator];
  if (!m) return o;
  var i = m.call(o), r, ar = [], e;
  try {
    while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
  } catch (error) {
    e = { error };
  } finally {
    try {
      if (r && !r.done && (m = i["return"])) m.call(i);
    } finally {
      if (e) throw e.error;
    }
  }
  return ar;
}
function __spread() {
  for (var ar = [], i = 0; i < arguments.length; i++)
    ar = ar.concat(__read(arguments[i]));
  return ar;
}
var mobxDidRunLazyInitializersSymbol = /* @__PURE__ */ Symbol("mobx did run lazy initializers");
var mobxPendingDecorators = /* @__PURE__ */ Symbol("mobx pending decorators");
var enumerableDescriptorCache = {};
var nonEnumerableDescriptorCache = {};
function createPropertyInitializerDescriptor(prop, enumerable) {
  var cache = enumerable ? enumerableDescriptorCache : nonEnumerableDescriptorCache;
  return cache[prop] || (cache[prop] = {
    configurable: true,
    enumerable,
    get: function() {
      initializeInstance(this);
      return this[prop];
    },
    set: function(value) {
      initializeInstance(this);
      this[prop] = value;
    }
  });
}
function initializeInstance(target) {
  var e_1, _a2;
  if (target[mobxDidRunLazyInitializersSymbol] === true)
    return;
  var decorators = target[mobxPendingDecorators];
  if (decorators) {
    addHiddenProp(target, mobxDidRunLazyInitializersSymbol, true);
    var keys2 = __spread(Object.getOwnPropertySymbols(decorators), Object.keys(decorators));
    try {
      for (var keys_1 = __values(keys2), keys_1_1 = keys_1.next(); !keys_1_1.done; keys_1_1 = keys_1.next()) {
        var key = keys_1_1.value;
        var d = decorators[key];
        d.propertyCreator(target, d.prop, d.descriptor, d.decoratorTarget, d.decoratorArguments);
      }
    } catch (e_1_1) {
      e_1 = { error: e_1_1 };
    } finally {
      try {
        if (keys_1_1 && !keys_1_1.done && (_a2 = keys_1.return)) _a2.call(keys_1);
      } finally {
        if (e_1) throw e_1.error;
      }
    }
  }
}
function createPropDecorator(propertyInitiallyEnumerable, propertyCreator) {
  return function decoratorFactory() {
    var decoratorArguments;
    var decorator = function decorate(target, prop, descriptor, applyImmediately) {
      if (applyImmediately === true) {
        propertyCreator(target, prop, descriptor, target, decoratorArguments);
        return null;
      }
      if (process.env.NODE_ENV !== "production" && !quacksLikeADecorator(arguments))
        fail2("This function is a decorator, but it wasn't invoked like a decorator");
      if (!Object.prototype.hasOwnProperty.call(target, mobxPendingDecorators)) {
        var inheritedDecorators = target[mobxPendingDecorators];
        addHiddenProp(target, mobxPendingDecorators, __assign({}, inheritedDecorators));
      }
      target[mobxPendingDecorators][prop] = {
        prop,
        propertyCreator,
        descriptor,
        decoratorTarget: target,
        decoratorArguments
      };
      return createPropertyInitializerDescriptor(prop, propertyInitiallyEnumerable);
    };
    if (quacksLikeADecorator(arguments)) {
      decoratorArguments = EMPTY_ARRAY;
      return decorator.apply(null, arguments);
    } else {
      decoratorArguments = Array.prototype.slice.call(arguments);
      return decorator;
    }
  };
}
function quacksLikeADecorator(args) {
  return (args.length === 2 || args.length === 3) && (typeof args[1] === "string" || typeof args[1] === "symbol") || args.length === 4 && args[3] === true;
}
function deepEnhancer(v, _, name) {
  if (isObservable(v))
    return v;
  if (Array.isArray(v))
    return observable.array(v, { name });
  if (isPlainObject(v))
    return observable.object(v, void 0, { name });
  if (isES6Map(v))
    return observable.map(v, { name });
  if (isES6Set(v))
    return observable.set(v, { name });
  return v;
}
function shallowEnhancer(v, _, name) {
  if (v === void 0 || v === null)
    return v;
  if (isObservableObject(v) || isObservableArray(v) || isObservableMap(v) || isObservableSet(v))
    return v;
  if (Array.isArray(v))
    return observable.array(v, { name, deep: false });
  if (isPlainObject(v))
    return observable.object(v, void 0, { name, deep: false });
  if (isES6Map(v))
    return observable.map(v, { name, deep: false });
  if (isES6Set(v))
    return observable.set(v, { name, deep: false });
  return fail2(process.env.NODE_ENV !== "production" && "The shallow modifier / decorator can only used in combination with arrays, objects, maps and sets");
}
function referenceEnhancer(newValue) {
  return newValue;
}
function refStructEnhancer(v, oldValue, name) {
  if (process.env.NODE_ENV !== "production" && isObservable(v))
    throw "observable.struct should not be used with observable values";
  if (deepEqual(v, oldValue))
    return oldValue;
  return v;
}
function createDecoratorForEnhancer(enhancer) {
  invariant(enhancer);
  var decorator = createPropDecorator(true, function(target, propertyName, descriptor, _decoratorTarget, decoratorArgs) {
    if (process.env.NODE_ENV !== "production") {
      invariant(!descriptor || !descriptor.get, '@observable cannot be used on getter (property "' + stringifyKey(propertyName) + '"), use @computed instead.');
    }
    var initialValue = descriptor ? descriptor.initializer ? descriptor.initializer.call(target) : descriptor.value : void 0;
    asObservableObject(target).addObservableProp(propertyName, initialValue, enhancer);
  });
  var res = (
    // Extra process checks, as this happens during module initialization
    typeof process !== "undefined" && process.env && process.env.NODE_ENV !== "production" ? function observableDecorator() {
      if (arguments.length < 2)
        return fail2("Incorrect decorator invocation. @observable decorator doesn't expect any arguments");
      return decorator.apply(null, arguments);
    } : decorator
  );
  res.enhancer = enhancer;
  return res;
}
var defaultCreateObservableOptions = {
  deep: true,
  name: void 0,
  defaultDecorator: void 0,
  proxy: true
};
Object.freeze(defaultCreateObservableOptions);
function assertValidOption(key) {
  if (!/^(deep|name|equals|defaultDecorator|proxy)$/.test(key))
    fail2("invalid option for (extend)observable: " + key);
}
function asCreateObservableOptions(thing) {
  if (thing === null || thing === void 0)
    return defaultCreateObservableOptions;
  if (typeof thing === "string")
    return { name: thing, deep: true, proxy: true };
  if (process.env.NODE_ENV !== "production") {
    if (typeof thing !== "object")
      return fail2("expected options object");
    Object.keys(thing).forEach(assertValidOption);
  }
  return thing;
}
var deepDecorator = createDecoratorForEnhancer(deepEnhancer);
var shallowDecorator = createDecoratorForEnhancer(shallowEnhancer);
var refDecorator = createDecoratorForEnhancer(referenceEnhancer);
var refStructDecorator = createDecoratorForEnhancer(refStructEnhancer);
function getEnhancerFromOptions(options) {
  return options.defaultDecorator ? options.defaultDecorator.enhancer : options.deep === false ? referenceEnhancer : deepEnhancer;
}
function createObservable(v, arg2, arg3) {
  if (typeof arguments[1] === "string" || typeof arguments[1] === "symbol") {
    return deepDecorator.apply(null, arguments);
  }
  if (isObservable(v))
    return v;
  var res = isPlainObject(v) ? observable.object(v, arg2, arg3) : Array.isArray(v) ? observable.array(v, arg2) : isES6Map(v) ? observable.map(v, arg2) : isES6Set(v) ? observable.set(v, arg2) : v;
  if (res !== v)
    return res;
  fail2(process.env.NODE_ENV !== "production" && "The provided value could not be converted into an observable. If you want just create an observable reference to the object use 'observable.box(value)'");
}
var observableFactories = {
  box: function(value, options) {
    if (arguments.length > 2)
      incorrectlyUsedAsDecorator("box");
    var o = asCreateObservableOptions(options);
    return new ObservableValue(value, getEnhancerFromOptions(o), o.name, true, o.equals);
  },
  array: function(initialValues, options) {
    if (arguments.length > 2)
      incorrectlyUsedAsDecorator("array");
    var o = asCreateObservableOptions(options);
    return createObservableArray(initialValues, getEnhancerFromOptions(o), o.name);
  },
  map: function(initialValues, options) {
    if (arguments.length > 2)
      incorrectlyUsedAsDecorator("map");
    var o = asCreateObservableOptions(options);
    return new ObservableMap(initialValues, getEnhancerFromOptions(o), o.name);
  },
  set: function(initialValues, options) {
    if (arguments.length > 2)
      incorrectlyUsedAsDecorator("set");
    var o = asCreateObservableOptions(options);
    return new ObservableSet(initialValues, getEnhancerFromOptions(o), o.name);
  },
  object: function(props, decorators, options) {
    if (typeof arguments[1] === "string")
      incorrectlyUsedAsDecorator("object");
    var o = asCreateObservableOptions(options);
    if (o.proxy === false) {
      return extendObservable({}, props, decorators, o);
    } else {
      var defaultDecorator = getDefaultDecoratorFromObjectOptions(o);
      var base = extendObservable({}, void 0, void 0, o);
      var proxy = createDynamicObservableObject(base);
      extendObservableObjectWithProperties(proxy, props, decorators, defaultDecorator);
      return proxy;
    }
  },
  ref: refDecorator,
  shallow: shallowDecorator,
  deep: deepDecorator,
  struct: refStructDecorator
};
var observable = createObservable;
Object.keys(observableFactories).forEach(function(name) {
  return observable[name] = observableFactories[name];
});
function incorrectlyUsedAsDecorator(methodName) {
  fail2(
    // process.env.NODE_ENV !== "production" &&
    "Expected one or two arguments to observable." + methodName + ". Did you accidentally try to use observable." + methodName + " as decorator?"
  );
}
var computedDecorator = createPropDecorator(false, function(instance, propertyName, descriptor, decoratorTarget, decoratorArgs) {
  if (process.env.NODE_ENV !== "production") {
    invariant(descriptor && descriptor.get, "Trying to declare a computed value for unspecified getter '" + stringifyKey(propertyName) + "'");
  }
  var get = descriptor.get, set2 = descriptor.set;
  var options = decoratorArgs[0] || {};
  asObservableObject(instance).addComputedProp(instance, propertyName, __assign({
    get,
    set: set2,
    context: instance
  }, options));
});
var computedStructDecorator = computedDecorator({ equals: comparer.structural });
var computed = function computed2(arg1, arg2, arg3) {
  if (typeof arg2 === "string") {
    return computedDecorator.apply(null, arguments);
  }
  if (arg1 !== null && typeof arg1 === "object" && arguments.length === 1) {
    return computedDecorator.apply(null, arguments);
  }
  if (process.env.NODE_ENV !== "production") {
    invariant(typeof arg1 === "function", "First argument to `computed` should be an expression.");
    invariant(arguments.length < 3, "Computed takes one or two arguments if used as function");
  }
  var opts = typeof arg2 === "object" ? arg2 : {};
  opts.get = arg1;
  opts.set = typeof arg2 === "function" ? arg2 : opts.set;
  opts.name = opts.name || arg1.name || "";
  return new ComputedValue(opts);
};
computed.struct = computedStructDecorator;
var IDerivationState;
(function(IDerivationState2) {
  IDerivationState2[IDerivationState2["NOT_TRACKING"] = -1] = "NOT_TRACKING";
  IDerivationState2[IDerivationState2["UP_TO_DATE"] = 0] = "UP_TO_DATE";
  IDerivationState2[IDerivationState2["POSSIBLY_STALE"] = 1] = "POSSIBLY_STALE";
  IDerivationState2[IDerivationState2["STALE"] = 2] = "STALE";
})(IDerivationState || (IDerivationState = {}));
var TraceMode;
(function(TraceMode2) {
  TraceMode2[TraceMode2["NONE"] = 0] = "NONE";
  TraceMode2[TraceMode2["LOG"] = 1] = "LOG";
  TraceMode2[TraceMode2["BREAK"] = 2] = "BREAK";
})(TraceMode || (TraceMode = {}));
var CaughtException = (
  /** @class */
  /* @__PURE__ */ (function() {
    function CaughtException2(cause) {
      this.cause = cause;
    }
    return CaughtException2;
  })()
);
function isCaughtException(e) {
  return e instanceof CaughtException;
}
function shouldCompute(derivation) {
  switch (derivation.dependenciesState) {
    case IDerivationState.UP_TO_DATE:
      return false;
    case IDerivationState.NOT_TRACKING:
    case IDerivationState.STALE:
      return true;
    case IDerivationState.POSSIBLY_STALE: {
      var prevAllowStateReads = allowStateReadsStart(true);
      var prevUntracked = untrackedStart();
      var obs = derivation.observing, l = obs.length;
      for (var i = 0; i < l; i++) {
        var obj = obs[i];
        if (isComputedValue(obj)) {
          if (globalState.disableErrorBoundaries) {
            obj.get();
          } else {
            try {
              obj.get();
            } catch (e) {
              untrackedEnd(prevUntracked);
              allowStateReadsEnd(prevAllowStateReads);
              return true;
            }
          }
          if (derivation.dependenciesState === IDerivationState.STALE) {
            untrackedEnd(prevUntracked);
            allowStateReadsEnd(prevAllowStateReads);
            return true;
          }
        }
      }
      changeDependenciesStateTo0(derivation);
      untrackedEnd(prevUntracked);
      allowStateReadsEnd(prevAllowStateReads);
      return false;
    }
  }
}
function checkIfStateModificationsAreAllowed(atom) {
  var hasObservers = atom.observers.size > 0;
  if (globalState.computationDepth > 0 && hasObservers)
    fail2(process.env.NODE_ENV !== "production" && "Computed values are not allowed to cause side effects by changing observables that are already being observed. Tried to modify: " + atom.name);
  if (!globalState.allowStateChanges && (hasObservers || globalState.enforceActions === "strict"))
    fail2(process.env.NODE_ENV !== "production" && (globalState.enforceActions ? "Since strict-mode is enabled, changing observed observable values outside actions is not allowed. Please wrap the code in an `action` if this change is intended. Tried to modify: " : "Side effects like changing state are not allowed at this point. Are you trying to modify state from, for example, the render function of a React component? Tried to modify: ") + atom.name);
}
function checkIfStateReadsAreAllowed(observable2) {
  if (process.env.NODE_ENV !== "production" && !globalState.allowStateReads && globalState.observableRequiresReaction) {
    console.warn("[mobx] Observable " + observable2.name + " being read outside a reactive context");
  }
}
function trackDerivedFunction(derivation, f, context) {
  var prevAllowStateReads = allowStateReadsStart(true);
  changeDependenciesStateTo0(derivation);
  derivation.newObserving = new Array(derivation.observing.length + 100);
  derivation.unboundDepsCount = 0;
  derivation.runId = ++globalState.runId;
  var prevTracking = globalState.trackingDerivation;
  globalState.trackingDerivation = derivation;
  var result;
  if (globalState.disableErrorBoundaries === true) {
    result = f.call(context);
  } else {
    try {
      result = f.call(context);
    } catch (e) {
      result = new CaughtException(e);
    }
  }
  globalState.trackingDerivation = prevTracking;
  bindDependencies(derivation);
  warnAboutDerivationWithoutDependencies(derivation);
  allowStateReadsEnd(prevAllowStateReads);
  return result;
}
function warnAboutDerivationWithoutDependencies(derivation) {
  if (process.env.NODE_ENV === "production")
    return;
  if (derivation.observing.length !== 0)
    return;
  if (globalState.reactionRequiresObservable || derivation.requiresObservable) {
    console.warn("[mobx] Derivation " + derivation.name + " is created/updated without reading any observable value");
  }
}
function bindDependencies(derivation) {
  var prevObserving = derivation.observing;
  var observing = derivation.observing = derivation.newObserving;
  var lowestNewObservingDerivationState = IDerivationState.UP_TO_DATE;
  var i0 = 0, l = derivation.unboundDepsCount;
  for (var i = 0; i < l; i++) {
    var dep = observing[i];
    if (dep.diffValue === 0) {
      dep.diffValue = 1;
      if (i0 !== i)
        observing[i0] = dep;
      i0++;
    }
    if (dep.dependenciesState > lowestNewObservingDerivationState) {
      lowestNewObservingDerivationState = dep.dependenciesState;
    }
  }
  observing.length = i0;
  derivation.newObserving = null;
  l = prevObserving.length;
  while (l--) {
    var dep = prevObserving[l];
    if (dep.diffValue === 0) {
      removeObserver(dep, derivation);
    }
    dep.diffValue = 0;
  }
  while (i0--) {
    var dep = observing[i0];
    if (dep.diffValue === 1) {
      dep.diffValue = 0;
      addObserver(dep, derivation);
    }
  }
  if (lowestNewObservingDerivationState !== IDerivationState.UP_TO_DATE) {
    derivation.dependenciesState = lowestNewObservingDerivationState;
    derivation.onBecomeStale();
  }
}
function clearObserving(derivation) {
  var obs = derivation.observing;
  derivation.observing = [];
  var i = obs.length;
  while (i--)
    removeObserver(obs[i], derivation);
  derivation.dependenciesState = IDerivationState.NOT_TRACKING;
}
function untracked(action3) {
  var prev = untrackedStart();
  try {
    return action3();
  } finally {
    untrackedEnd(prev);
  }
}
function untrackedStart() {
  var prev = globalState.trackingDerivation;
  globalState.trackingDerivation = null;
  return prev;
}
function untrackedEnd(prev) {
  globalState.trackingDerivation = prev;
}
function allowStateReadsStart(allowStateReads) {
  var prev = globalState.allowStateReads;
  globalState.allowStateReads = allowStateReads;
  return prev;
}
function allowStateReadsEnd(prev) {
  globalState.allowStateReads = prev;
}
function changeDependenciesStateTo0(derivation) {
  if (derivation.dependenciesState === IDerivationState.UP_TO_DATE)
    return;
  derivation.dependenciesState = IDerivationState.UP_TO_DATE;
  var obs = derivation.observing;
  var i = obs.length;
  while (i--)
    obs[i].lowestObserverState = IDerivationState.UP_TO_DATE;
}
var currentActionId = 0;
var nextActionId = 1;
var functionNameDescriptor = Object.getOwnPropertyDescriptor(function() {
}, "name");
var isFunctionNameConfigurable = functionNameDescriptor && functionNameDescriptor.configurable;
function createAction(actionName, fn, ref) {
  if (process.env.NODE_ENV !== "production") {
    invariant(typeof fn === "function", "`action` can only be invoked on functions");
    if (typeof actionName !== "string" || !actionName)
      fail2("actions should have valid names, got: '" + actionName + "'");
  }
  var res = function() {
    return executeAction(actionName, fn, ref || this, arguments);
  };
  res.isMobxAction = true;
  if (process.env.NODE_ENV !== "production") {
    if (isFunctionNameConfigurable) {
      Object.defineProperty(res, "name", { value: actionName });
    }
  }
  return res;
}
function executeAction(actionName, fn, scope, args) {
  var runInfo = _startAction(actionName, scope, args);
  try {
    return fn.apply(scope, args);
  } catch (err) {
    runInfo.error = err;
    throw err;
  } finally {
    _endAction(runInfo);
  }
}
function _startAction(actionName, scope, args) {
  var notifySpy = isSpyEnabled() && !!actionName;
  var startTime = 0;
  if (notifySpy && process.env.NODE_ENV !== "production") {
    startTime = Date.now();
    var l = args && args.length || 0;
    var flattendArgs = new Array(l);
    if (l > 0)
      for (var i = 0; i < l; i++)
        flattendArgs[i] = args[i];
    spyReportStart({
      type: "action",
      name: actionName,
      object: scope,
      arguments: flattendArgs
    });
  }
  var prevDerivation = untrackedStart();
  startBatch();
  var prevAllowStateChanges = allowStateChangesStart(true);
  var prevAllowStateReads = allowStateReadsStart(true);
  var runInfo = {
    prevDerivation,
    prevAllowStateChanges,
    prevAllowStateReads,
    notifySpy,
    startTime,
    actionId: nextActionId++,
    parentActionId: currentActionId
  };
  currentActionId = runInfo.actionId;
  return runInfo;
}
function _endAction(runInfo) {
  if (currentActionId !== runInfo.actionId) {
    fail2("invalid action stack. did you forget to finish an action?");
  }
  currentActionId = runInfo.parentActionId;
  if (runInfo.error !== void 0) {
    globalState.suppressReactionErrors = true;
  }
  allowStateChangesEnd(runInfo.prevAllowStateChanges);
  allowStateReadsEnd(runInfo.prevAllowStateReads);
  endBatch();
  untrackedEnd(runInfo.prevDerivation);
  if (runInfo.notifySpy && process.env.NODE_ENV !== "production") {
    spyReportEnd({ time: Date.now() - runInfo.startTime });
  }
  globalState.suppressReactionErrors = false;
}
function allowStateChangesStart(allowStateChanges) {
  var prev = globalState.allowStateChanges;
  globalState.allowStateChanges = allowStateChanges;
  return prev;
}
function allowStateChangesEnd(prev) {
  globalState.allowStateChanges = prev;
}
function allowStateChangesInsideComputed(func) {
  var prev = globalState.computationDepth;
  globalState.computationDepth = 0;
  var res;
  try {
    res = func();
  } finally {
    globalState.computationDepth = prev;
  }
  return res;
}
var ObservableValue = (
  /** @class */
  (function(_super) {
    __extends(ObservableValue2, _super);
    function ObservableValue2(value, enhancer, name, notifySpy, equals) {
      if (name === void 0) {
        name = "ObservableValue@" + getNextId();
      }
      if (notifySpy === void 0) {
        notifySpy = true;
      }
      if (equals === void 0) {
        equals = comparer.default;
      }
      var _this = _super.call(this, name) || this;
      _this.enhancer = enhancer;
      _this.name = name;
      _this.equals = equals;
      _this.hasUnreportedChange = false;
      _this.value = enhancer(value, void 0, name);
      if (notifySpy && isSpyEnabled() && process.env.NODE_ENV !== "production") {
        spyReport({ type: "create", name: _this.name, newValue: "" + _this.value });
      }
      return _this;
    }
    ObservableValue2.prototype.dehanceValue = function(value) {
      if (this.dehancer !== void 0)
        return this.dehancer(value);
      return value;
    };
    ObservableValue2.prototype.set = function(newValue) {
      var oldValue = this.value;
      newValue = this.prepareNewValue(newValue);
      if (newValue !== globalState.UNCHANGED) {
        var notifySpy = isSpyEnabled();
        if (notifySpy && process.env.NODE_ENV !== "production") {
          spyReportStart({
            type: "update",
            name: this.name,
            newValue,
            oldValue
          });
        }
        this.setNewValue(newValue);
        if (notifySpy && process.env.NODE_ENV !== "production")
          spyReportEnd();
      }
    };
    ObservableValue2.prototype.prepareNewValue = function(newValue) {
      checkIfStateModificationsAreAllowed(this);
      if (hasInterceptors(this)) {
        var change = interceptChange(this, {
          object: this,
          type: "update",
          newValue
        });
        if (!change)
          return globalState.UNCHANGED;
        newValue = change.newValue;
      }
      newValue = this.enhancer(newValue, this.value, this.name);
      return this.equals(this.value, newValue) ? globalState.UNCHANGED : newValue;
    };
    ObservableValue2.prototype.setNewValue = function(newValue) {
      var oldValue = this.value;
      this.value = newValue;
      this.reportChanged();
      if (hasListeners(this)) {
        notifyListeners(this, {
          type: "update",
          object: this,
          newValue,
          oldValue
        });
      }
    };
    ObservableValue2.prototype.get = function() {
      this.reportObserved();
      return this.dehanceValue(this.value);
    };
    ObservableValue2.prototype.intercept = function(handler) {
      return registerInterceptor(this, handler);
    };
    ObservableValue2.prototype.observe = function(listener, fireImmediately) {
      if (fireImmediately)
        listener({
          object: this,
          type: "update",
          newValue: this.value,
          oldValue: void 0
        });
      return registerListener(this, listener);
    };
    ObservableValue2.prototype.toJSON = function() {
      return this.get();
    };
    ObservableValue2.prototype.toString = function() {
      return this.name + "[" + this.value + "]";
    };
    ObservableValue2.prototype.valueOf = function() {
      return toPrimitive(this.get());
    };
    ObservableValue2.prototype[Symbol.toPrimitive] = function() {
      return this.valueOf();
    };
    return ObservableValue2;
  })(Atom)
);
var isObservableValue = createInstanceofPredicate("ObservableValue", ObservableValue);
var ComputedValue = (
  /** @class */
  (function() {
    function ComputedValue2(options) {
      this.dependenciesState = IDerivationState.NOT_TRACKING;
      this.observing = [];
      this.newObserving = null;
      this.isBeingObserved = false;
      this.isPendingUnobservation = false;
      this.observers = /* @__PURE__ */ new Set();
      this.diffValue = 0;
      this.runId = 0;
      this.lastAccessedBy = 0;
      this.lowestObserverState = IDerivationState.UP_TO_DATE;
      this.unboundDepsCount = 0;
      this.__mapid = "#" + getNextId();
      this.value = new CaughtException(null);
      this.isComputing = false;
      this.isRunningSetter = false;
      this.isTracing = TraceMode.NONE;
      invariant(options.get, "missing option for computed: get");
      this.derivation = options.get;
      this.name = options.name || "ComputedValue@" + getNextId();
      if (options.set)
        this.setter = createAction(this.name + "-setter", options.set);
      this.equals = options.equals || (options.compareStructural || options.struct ? comparer.structural : comparer.default);
      this.scope = options.context;
      this.requiresReaction = !!options.requiresReaction;
      this.keepAlive = !!options.keepAlive;
    }
    ComputedValue2.prototype.onBecomeStale = function() {
      propagateMaybeChanged(this);
    };
    ComputedValue2.prototype.onBecomeObserved = function() {
      if (this.onBecomeObservedListeners) {
        this.onBecomeObservedListeners.forEach(function(listener) {
          return listener();
        });
      }
    };
    ComputedValue2.prototype.onBecomeUnobserved = function() {
      if (this.onBecomeUnobservedListeners) {
        this.onBecomeUnobservedListeners.forEach(function(listener) {
          return listener();
        });
      }
    };
    ComputedValue2.prototype.get = function() {
      if (this.isComputing)
        fail2("Cycle detected in computation " + this.name + ": " + this.derivation);
      if (globalState.inBatch === 0 && this.observers.size === 0 && !this.keepAlive) {
        if (shouldCompute(this)) {
          this.warnAboutUntrackedRead();
          startBatch();
          this.value = this.computeValue(false);
          endBatch();
        }
      } else {
        reportObserved(this);
        if (shouldCompute(this)) {
          if (this.trackAndCompute())
            propagateChangeConfirmed(this);
        }
      }
      var result = this.value;
      if (isCaughtException(result))
        throw result.cause;
      return result;
    };
    ComputedValue2.prototype.peek = function() {
      var res = this.computeValue(false);
      if (isCaughtException(res))
        throw res.cause;
      return res;
    };
    ComputedValue2.prototype.set = function(value) {
      if (this.setter) {
        invariant(!this.isRunningSetter, "The setter of computed value '" + this.name + "' is trying to update itself. Did you intend to update an _observable_ value, instead of the computed property?");
        this.isRunningSetter = true;
        try {
          this.setter.call(this.scope, value);
        } finally {
          this.isRunningSetter = false;
        }
      } else
        invariant(false, process.env.NODE_ENV !== "production" && "[ComputedValue '" + this.name + "'] It is not possible to assign a new value to a computed value.");
    };
    ComputedValue2.prototype.trackAndCompute = function() {
      if (isSpyEnabled() && process.env.NODE_ENV !== "production") {
        spyReport({
          object: this.scope,
          type: "compute",
          name: this.name
        });
      }
      var oldValue = this.value;
      var wasSuspended = (
        /* see #1208 */
        this.dependenciesState === IDerivationState.NOT_TRACKING
      );
      var newValue = this.computeValue(true);
      var changed = wasSuspended || isCaughtException(oldValue) || isCaughtException(newValue) || !this.equals(oldValue, newValue);
      if (changed) {
        this.value = newValue;
      }
      return changed;
    };
    ComputedValue2.prototype.computeValue = function(track) {
      this.isComputing = true;
      globalState.computationDepth++;
      var res;
      if (track) {
        res = trackDerivedFunction(this, this.derivation, this.scope);
      } else {
        if (globalState.disableErrorBoundaries === true) {
          res = this.derivation.call(this.scope);
        } else {
          try {
            res = this.derivation.call(this.scope);
          } catch (e) {
            res = new CaughtException(e);
          }
        }
      }
      globalState.computationDepth--;
      this.isComputing = false;
      return res;
    };
    ComputedValue2.prototype.suspend = function() {
      if (!this.keepAlive) {
        clearObserving(this);
        this.value = void 0;
      }
    };
    ComputedValue2.prototype.observe = function(listener, fireImmediately) {
      var _this = this;
      var firstTime = true;
      var prevValue = void 0;
      return autorun(function() {
        var newValue = _this.get();
        if (!firstTime || fireImmediately) {
          var prevU = untrackedStart();
          listener({
            type: "update",
            object: _this,
            newValue,
            oldValue: prevValue
          });
          untrackedEnd(prevU);
        }
        firstTime = false;
        prevValue = newValue;
      });
    };
    ComputedValue2.prototype.warnAboutUntrackedRead = function() {
      if (process.env.NODE_ENV === "production")
        return;
      if (this.requiresReaction === true) {
        fail2("[mobx] Computed value " + this.name + " is read outside a reactive context");
      }
      if (this.isTracing !== TraceMode.NONE) {
        console.log("[mobx.trace] '" + this.name + "' is being read outside a reactive context. Doing a full recompute");
      }
      if (globalState.computedRequiresReaction) {
        console.warn("[mobx] Computed value " + this.name + " is being read outside a reactive context. Doing a full recompute");
      }
    };
    ComputedValue2.prototype.toJSON = function() {
      return this.get();
    };
    ComputedValue2.prototype.toString = function() {
      return this.name + "[" + this.derivation.toString() + "]";
    };
    ComputedValue2.prototype.valueOf = function() {
      return toPrimitive(this.get());
    };
    ComputedValue2.prototype[Symbol.toPrimitive] = function() {
      return this.valueOf();
    };
    return ComputedValue2;
  })()
);
var isComputedValue = createInstanceofPredicate("ComputedValue", ComputedValue);
var MobXGlobals = (
  /** @class */
  /* @__PURE__ */ (function() {
    function MobXGlobals2() {
      this.version = 5;
      this.UNCHANGED = {};
      this.trackingDerivation = null;
      this.computationDepth = 0;
      this.runId = 0;
      this.mobxGuid = 0;
      this.inBatch = 0;
      this.pendingUnobservations = [];
      this.pendingReactions = [];
      this.isRunningReactions = false;
      this.allowStateChanges = true;
      this.allowStateReads = true;
      this.enforceActions = false;
      this.spyListeners = [];
      this.globalReactionErrorHandlers = [];
      this.computedRequiresReaction = false;
      this.reactionRequiresObservable = false;
      this.observableRequiresReaction = false;
      this.computedConfigurable = false;
      this.disableErrorBoundaries = false;
      this.suppressReactionErrors = false;
    }
    return MobXGlobals2;
  })()
);
var mockGlobal = {};
function getGlobal() {
  if (typeof window !== "undefined") {
    return window;
  }
  if (typeof global !== "undefined") {
    return global;
  }
  if (typeof self !== "undefined") {
    return self;
  }
  return mockGlobal;
}
var canMergeGlobalState = true;
var isolateCalled = false;
var globalState = (function() {
  var global2 = getGlobal();
  if (global2.__mobxInstanceCount > 0 && !global2.__mobxGlobals)
    canMergeGlobalState = false;
  if (global2.__mobxGlobals && global2.__mobxGlobals.version !== new MobXGlobals().version)
    canMergeGlobalState = false;
  if (!canMergeGlobalState) {
    setTimeout(function() {
      if (!isolateCalled) {
        fail2("There are multiple, different versions of MobX active. Make sure MobX is loaded only once or use `configure({ isolateGlobalState: true })`");
      }
    }, 1);
    return new MobXGlobals();
  } else if (global2.__mobxGlobals) {
    global2.__mobxInstanceCount += 1;
    if (!global2.__mobxGlobals.UNCHANGED)
      global2.__mobxGlobals.UNCHANGED = {};
    return global2.__mobxGlobals;
  } else {
    global2.__mobxInstanceCount = 1;
    return global2.__mobxGlobals = new MobXGlobals();
  }
})();
function addObserver(observable2, node) {
  observable2.observers.add(node);
  if (observable2.lowestObserverState > node.dependenciesState)
    observable2.lowestObserverState = node.dependenciesState;
}
function removeObserver(observable2, node) {
  observable2.observers.delete(node);
  if (observable2.observers.size === 0) {
    queueForUnobservation(observable2);
  }
}
function queueForUnobservation(observable2) {
  if (observable2.isPendingUnobservation === false) {
    observable2.isPendingUnobservation = true;
    globalState.pendingUnobservations.push(observable2);
  }
}
function startBatch() {
  globalState.inBatch++;
}
function endBatch() {
  if (--globalState.inBatch === 0) {
    runReactions();
    var list = globalState.pendingUnobservations;
    for (var i = 0; i < list.length; i++) {
      var observable2 = list[i];
      observable2.isPendingUnobservation = false;
      if (observable2.observers.size === 0) {
        if (observable2.isBeingObserved) {
          observable2.isBeingObserved = false;
          observable2.onBecomeUnobserved();
        }
        if (observable2 instanceof ComputedValue) {
          observable2.suspend();
        }
      }
    }
    globalState.pendingUnobservations = [];
  }
}
function reportObserved(observable2) {
  checkIfStateReadsAreAllowed(observable2);
  var derivation = globalState.trackingDerivation;
  if (derivation !== null) {
    if (derivation.runId !== observable2.lastAccessedBy) {
      observable2.lastAccessedBy = derivation.runId;
      derivation.newObserving[derivation.unboundDepsCount++] = observable2;
      if (!observable2.isBeingObserved) {
        observable2.isBeingObserved = true;
        observable2.onBecomeObserved();
      }
    }
    return true;
  } else if (observable2.observers.size === 0 && globalState.inBatch > 0) {
    queueForUnobservation(observable2);
  }
  return false;
}
function propagateChanged(observable2) {
  if (observable2.lowestObserverState === IDerivationState.STALE)
    return;
  observable2.lowestObserverState = IDerivationState.STALE;
  observable2.observers.forEach(function(d) {
    if (d.dependenciesState === IDerivationState.UP_TO_DATE) {
      if (d.isTracing !== TraceMode.NONE) {
        logTraceInfo(d, observable2);
      }
      d.onBecomeStale();
    }
    d.dependenciesState = IDerivationState.STALE;
  });
}
function propagateChangeConfirmed(observable2) {
  if (observable2.lowestObserverState === IDerivationState.STALE)
    return;
  observable2.lowestObserverState = IDerivationState.STALE;
  observable2.observers.forEach(function(d) {
    if (d.dependenciesState === IDerivationState.POSSIBLY_STALE)
      d.dependenciesState = IDerivationState.STALE;
    else if (d.dependenciesState === IDerivationState.UP_TO_DATE)
      observable2.lowestObserverState = IDerivationState.UP_TO_DATE;
  });
}
function propagateMaybeChanged(observable2) {
  if (observable2.lowestObserverState !== IDerivationState.UP_TO_DATE)
    return;
  observable2.lowestObserverState = IDerivationState.POSSIBLY_STALE;
  observable2.observers.forEach(function(d) {
    if (d.dependenciesState === IDerivationState.UP_TO_DATE) {
      d.dependenciesState = IDerivationState.POSSIBLY_STALE;
      if (d.isTracing !== TraceMode.NONE) {
        logTraceInfo(d, observable2);
      }
      d.onBecomeStale();
    }
  });
}
function logTraceInfo(derivation, observable2) {
  console.log("[mobx.trace] '" + derivation.name + "' is invalidated due to a change in: '" + observable2.name + "'");
  if (derivation.isTracing === TraceMode.BREAK) {
    var lines = [];
    printDepTree(getDependencyTree(derivation), lines, 1);
    new Function("debugger;\n/*\nTracing '" + derivation.name + "'\n\nYou are entering this break point because derivation '" + derivation.name + "' is being traced and '" + observable2.name + "' is now forcing it to update.\nJust follow the stacktrace you should now see in the devtools to see precisely what piece of your code is causing this update\nThe stackframe you are looking for is at least ~6-8 stack-frames up.\n\n" + (derivation instanceof ComputedValue ? derivation.derivation.toString().replace(/[*]\//g, "/") : "") + "\n\nThe dependencies for this derivation are:\n\n" + lines.join("\n") + "\n*/\n    ")();
  }
}
function printDepTree(tree, lines, depth) {
  if (lines.length >= 1e3) {
    lines.push("(and many more)");
    return;
  }
  lines.push("" + new Array(depth).join("	") + tree.name);
  if (tree.dependencies)
    tree.dependencies.forEach(function(child) {
      return printDepTree(child, lines, depth + 1);
    });
}
var Reaction = (
  /** @class */
  (function() {
    function Reaction2(name, onInvalidate, errorHandler, requiresObservable) {
      if (name === void 0) {
        name = "Reaction@" + getNextId();
      }
      if (requiresObservable === void 0) {
        requiresObservable = false;
      }
      this.name = name;
      this.onInvalidate = onInvalidate;
      this.errorHandler = errorHandler;
      this.requiresObservable = requiresObservable;
      this.observing = [];
      this.newObserving = [];
      this.dependenciesState = IDerivationState.NOT_TRACKING;
      this.diffValue = 0;
      this.runId = 0;
      this.unboundDepsCount = 0;
      this.__mapid = "#" + getNextId();
      this.isDisposed = false;
      this._isScheduled = false;
      this._isTrackPending = false;
      this._isRunning = false;
      this.isTracing = TraceMode.NONE;
    }
    Reaction2.prototype.onBecomeStale = function() {
      this.schedule();
    };
    Reaction2.prototype.schedule = function() {
      if (!this._isScheduled) {
        this._isScheduled = true;
        globalState.pendingReactions.push(this);
        runReactions();
      }
    };
    Reaction2.prototype.isScheduled = function() {
      return this._isScheduled;
    };
    Reaction2.prototype.runReaction = function() {
      if (!this.isDisposed) {
        startBatch();
        this._isScheduled = false;
        if (shouldCompute(this)) {
          this._isTrackPending = true;
          try {
            this.onInvalidate();
            if (this._isTrackPending && isSpyEnabled() && process.env.NODE_ENV !== "production") {
              spyReport({
                name: this.name,
                type: "scheduled-reaction"
              });
            }
          } catch (e) {
            this.reportExceptionInDerivation(e);
          }
        }
        endBatch();
      }
    };
    Reaction2.prototype.track = function(fn) {
      if (this.isDisposed) {
        return;
      }
      startBatch();
      var notify = isSpyEnabled();
      var startTime;
      if (notify && process.env.NODE_ENV !== "production") {
        startTime = Date.now();
        spyReportStart({
          name: this.name,
          type: "reaction"
        });
      }
      this._isRunning = true;
      var result = trackDerivedFunction(this, fn, void 0);
      this._isRunning = false;
      this._isTrackPending = false;
      if (this.isDisposed) {
        clearObserving(this);
      }
      if (isCaughtException(result))
        this.reportExceptionInDerivation(result.cause);
      if (notify && process.env.NODE_ENV !== "production") {
        spyReportEnd({
          time: Date.now() - startTime
        });
      }
      endBatch();
    };
    Reaction2.prototype.reportExceptionInDerivation = function(error) {
      var _this = this;
      if (this.errorHandler) {
        this.errorHandler(error, this);
        return;
      }
      if (globalState.disableErrorBoundaries)
        throw error;
      var message = "[mobx] Encountered an uncaught exception that was thrown by a reaction or observer component, in: '" + this + "'";
      if (globalState.suppressReactionErrors) {
        console.warn("[mobx] (error in reaction '" + this.name + "' suppressed, fix error of causing action below)");
      } else {
        console.error(message, error);
      }
      if (isSpyEnabled()) {
        spyReport({
          type: "error",
          name: this.name,
          message,
          error: "" + error
        });
      }
      globalState.globalReactionErrorHandlers.forEach(function(f) {
        return f(error, _this);
      });
    };
    Reaction2.prototype.dispose = function() {
      if (!this.isDisposed) {
        this.isDisposed = true;
        if (!this._isRunning) {
          startBatch();
          clearObserving(this);
          endBatch();
        }
      }
    };
    Reaction2.prototype.getDisposer = function() {
      var r = this.dispose.bind(this);
      r[$mobx] = this;
      return r;
    };
    Reaction2.prototype.toString = function() {
      return "Reaction[" + this.name + "]";
    };
    Reaction2.prototype.trace = function(enterBreakPoint) {
      if (enterBreakPoint === void 0) {
        enterBreakPoint = false;
      }
      trace(this, enterBreakPoint);
    };
    return Reaction2;
  })()
);
var MAX_REACTION_ITERATIONS = 100;
var reactionScheduler = function(f) {
  return f();
};
function runReactions() {
  if (globalState.inBatch > 0 || globalState.isRunningReactions)
    return;
  reactionScheduler(runReactionsHelper);
}
function runReactionsHelper() {
  globalState.isRunningReactions = true;
  var allReactions = globalState.pendingReactions;
  var iterations = 0;
  while (allReactions.length > 0) {
    if (++iterations === MAX_REACTION_ITERATIONS) {
      console.error("Reaction doesn't converge to a stable state after " + MAX_REACTION_ITERATIONS + " iterations." + (" Probably there is a cycle in the reactive function: " + allReactions[0]));
      allReactions.splice(0);
    }
    var remainingReactions = allReactions.splice(0);
    for (var i = 0, l = remainingReactions.length; i < l; i++)
      remainingReactions[i].runReaction();
  }
  globalState.isRunningReactions = false;
}
var isReaction = createInstanceofPredicate("Reaction", Reaction);
function isSpyEnabled() {
  return process.env.NODE_ENV !== "production" && !!globalState.spyListeners.length;
}
function spyReport(event) {
  if (process.env.NODE_ENV === "production")
    return;
  if (!globalState.spyListeners.length)
    return;
  var listeners = globalState.spyListeners;
  for (var i = 0, l = listeners.length; i < l; i++)
    listeners[i](event);
}
function spyReportStart(event) {
  if (process.env.NODE_ENV === "production")
    return;
  var change = __assign(__assign({}, event), { spyReportStart: true });
  spyReport(change);
}
var END_EVENT = { spyReportEnd: true };
function spyReportEnd(change) {
  if (process.env.NODE_ENV === "production")
    return;
  if (change)
    spyReport(__assign(__assign({}, change), { spyReportEnd: true }));
  else
    spyReport(END_EVENT);
}
function spy(listener) {
  if (process.env.NODE_ENV === "production") {
    console.warn("[mobx.spy] Is a no-op in production builds");
    return function() {
    };
  } else {
    globalState.spyListeners.push(listener);
    return once(function() {
      globalState.spyListeners = globalState.spyListeners.filter(function(l) {
        return l !== listener;
      });
    });
  }
}
function dontReassignFields() {
  fail2(process.env.NODE_ENV !== "production" && "@action fields are not reassignable");
}
function namedActionDecorator(name) {
  return function(target, prop, descriptor) {
    if (descriptor) {
      if (process.env.NODE_ENV !== "production" && descriptor.get !== void 0) {
        return fail2("@action cannot be used with getters");
      }
      if (descriptor.value) {
        return {
          value: createAction(name, descriptor.value),
          enumerable: false,
          configurable: true,
          writable: true
          // for typescript, this must be writable, otherwise it cannot inherit :/ (see inheritable actions test)
        };
      }
      var initializer_1 = descriptor.initializer;
      return {
        enumerable: false,
        configurable: true,
        writable: true,
        initializer: function() {
          return createAction(name, initializer_1.call(this));
        }
      };
    }
    return actionFieldDecorator(name).apply(this, arguments);
  };
}
function actionFieldDecorator(name) {
  return function(target, prop, descriptor) {
    Object.defineProperty(target, prop, {
      configurable: true,
      enumerable: false,
      get: function() {
        return void 0;
      },
      set: function(value) {
        addHiddenProp(this, prop, action(name, value));
      }
    });
  };
}
function boundActionDecorator(target, propertyName, descriptor, applyToInstance) {
  if (applyToInstance === true) {
    defineBoundAction(target, propertyName, descriptor.value);
    return null;
  }
  if (descriptor) {
    return {
      configurable: true,
      enumerable: false,
      get: function() {
        defineBoundAction(this, propertyName, descriptor.value || descriptor.initializer.call(this));
        return this[propertyName];
      },
      set: dontReassignFields
    };
  }
  return {
    enumerable: false,
    configurable: true,
    set: function(v) {
      defineBoundAction(this, propertyName, v);
    },
    get: function() {
      return void 0;
    }
  };
}
var action = function action2(arg1, arg2, arg3, arg4) {
  if (arguments.length === 1 && typeof arg1 === "function")
    return createAction(arg1.name || "<unnamed action>", arg1);
  if (arguments.length === 2 && typeof arg2 === "function")
    return createAction(arg1, arg2);
  if (arguments.length === 1 && typeof arg1 === "string")
    return namedActionDecorator(arg1);
  if (arg4 === true) {
    addHiddenProp(arg1, arg2, createAction(arg1.name || arg2, arg3.value, this));
  } else {
    return namedActionDecorator(arg2).apply(null, arguments);
  }
};
action.bound = boundActionDecorator;
function isAction(thing) {
  return typeof thing === "function" && thing.isMobxAction === true;
}
function defineBoundAction(target, propertyName, fn) {
  addHiddenProp(target, propertyName, createAction(propertyName, fn.bind(target)));
}
function autorun(view, opts) {
  if (opts === void 0) {
    opts = EMPTY_OBJECT;
  }
  if (process.env.NODE_ENV !== "production") {
    invariant(typeof view === "function", "Autorun expects a function as first argument");
    invariant(isAction(view) === false, "Autorun does not accept actions since actions are untrackable");
  }
  var name = opts && opts.name || view.name || "Autorun@" + getNextId();
  var runSync = !opts.scheduler && !opts.delay;
  var reaction2;
  if (runSync) {
    reaction2 = new Reaction(name, function() {
      this.track(reactionRunner);
    }, opts.onError, opts.requiresObservable);
  } else {
    var scheduler_1 = createSchedulerFromOptions(opts);
    var isScheduled_1 = false;
    reaction2 = new Reaction(name, function() {
      if (!isScheduled_1) {
        isScheduled_1 = true;
        scheduler_1(function() {
          isScheduled_1 = false;
          if (!reaction2.isDisposed)
            reaction2.track(reactionRunner);
        });
      }
    }, opts.onError, opts.requiresObservable);
  }
  function reactionRunner() {
    view(reaction2);
  }
  reaction2.schedule();
  return reaction2.getDisposer();
}
var run = function(f) {
  return f();
};
function createSchedulerFromOptions(opts) {
  return opts.scheduler ? opts.scheduler : opts.delay ? function(f) {
    return setTimeout(f, opts.delay);
  } : run;
}
function reaction(expression, effect, opts) {
  if (opts === void 0) {
    opts = EMPTY_OBJECT;
  }
  if (process.env.NODE_ENV !== "production") {
    invariant(typeof expression === "function", "First argument to reaction should be a function");
    invariant(typeof opts === "object", "Third argument of reactions should be an object");
  }
  var name = opts.name || "Reaction@" + getNextId();
  var effectAction = action(name, opts.onError ? wrapErrorHandler(opts.onError, effect) : effect);
  var runSync = !opts.scheduler && !opts.delay;
  var scheduler = createSchedulerFromOptions(opts);
  var firstTime = true;
  var isScheduled = false;
  var value;
  var equals = opts.compareStructural ? comparer.structural : opts.equals || comparer.default;
  var r = new Reaction(name, function() {
    if (firstTime || runSync) {
      reactionRunner();
    } else if (!isScheduled) {
      isScheduled = true;
      scheduler(reactionRunner);
    }
  }, opts.onError, opts.requiresObservable);
  function reactionRunner() {
    isScheduled = false;
    if (r.isDisposed)
      return;
    var changed = false;
    r.track(function() {
      var nextValue = expression(r);
      changed = firstTime || !equals(value, nextValue);
      value = nextValue;
    });
    if (firstTime && opts.fireImmediately)
      effectAction(value, r);
    if (!firstTime && changed === true)
      effectAction(value, r);
    if (firstTime)
      firstTime = false;
  }
  r.schedule();
  return r.getDisposer();
}
function wrapErrorHandler(errorHandler, baseFn) {
  return function() {
    try {
      return baseFn.apply(this, arguments);
    } catch (e) {
      errorHandler.call(this, e);
    }
  };
}
function onBecomeObserved(thing, arg2, arg3) {
  return interceptHook("onBecomeObserved", thing, arg2, arg3);
}
function onBecomeUnobserved(thing, arg2, arg3) {
  return interceptHook("onBecomeUnobserved", thing, arg2, arg3);
}
function interceptHook(hook, thing, arg2, arg3) {
  var atom = typeof arg3 === "function" ? getAtom(thing, arg2) : getAtom(thing);
  var cb = typeof arg3 === "function" ? arg3 : arg2;
  var listenersKey = hook + "Listeners";
  if (atom[listenersKey]) {
    atom[listenersKey].add(cb);
  } else {
    atom[listenersKey] = /* @__PURE__ */ new Set([cb]);
  }
  var orig = atom[hook];
  if (typeof orig !== "function")
    return fail2(process.env.NODE_ENV !== "production" && "Not an atom that can be (un)observed");
  return function() {
    var hookListeners = atom[listenersKey];
    if (hookListeners) {
      hookListeners.delete(cb);
      if (hookListeners.size === 0) {
        delete atom[listenersKey];
      }
    }
  };
}
function extendObservable(target, properties, decorators, options) {
  if (process.env.NODE_ENV !== "production") {
    invariant(arguments.length >= 2 && arguments.length <= 4, "'extendObservable' expected 2-4 arguments");
    invariant(typeof target === "object", "'extendObservable' expects an object as first argument");
    invariant(!isObservableMap(target), "'extendObservable' should not be used on maps, use map.merge instead");
  }
  options = asCreateObservableOptions(options);
  var defaultDecorator = getDefaultDecoratorFromObjectOptions(options);
  initializeInstance(target);
  asObservableObject(target, options.name, defaultDecorator.enhancer);
  if (properties)
    extendObservableObjectWithProperties(target, properties, decorators, defaultDecorator);
  return target;
}
function getDefaultDecoratorFromObjectOptions(options) {
  return options.defaultDecorator || (options.deep === false ? refDecorator : deepDecorator);
}
function extendObservableObjectWithProperties(target, properties, decorators, defaultDecorator) {
  var e_1, _a2, e_2, _b;
  if (process.env.NODE_ENV !== "production") {
    invariant(!isObservable(properties), "Extending an object with another observable (object) is not supported. Please construct an explicit propertymap, using `toJS` if need. See issue #540");
    if (decorators) {
      var keys2 = getPlainObjectKeys(decorators);
      try {
        for (var keys_1 = __values(keys2), keys_1_1 = keys_1.next(); !keys_1_1.done; keys_1_1 = keys_1.next()) {
          var key = keys_1_1.value;
          if (!(key in properties))
            fail2("Trying to declare a decorator for unspecified property '" + stringifyKey(key) + "'");
        }
      } catch (e_1_1) {
        e_1 = { error: e_1_1 };
      } finally {
        try {
          if (keys_1_1 && !keys_1_1.done && (_a2 = keys_1.return)) _a2.call(keys_1);
        } finally {
          if (e_1) throw e_1.error;
        }
      }
    }
  }
  startBatch();
  try {
    var keys2 = ownKeys(properties);
    try {
      for (var keys_2 = __values(keys2), keys_2_1 = keys_2.next(); !keys_2_1.done; keys_2_1 = keys_2.next()) {
        var key = keys_2_1.value;
        var descriptor = Object.getOwnPropertyDescriptor(properties, key);
        if (process.env.NODE_ENV !== "production") {
          if (!isPlainObject(properties))
            fail2("'extendObservable' only accepts plain objects as second argument");
          if (isComputed(descriptor.value))
            fail2("Passing a 'computed' as initial property value is no longer supported by extendObservable. Use a getter or decorator instead");
        }
        var decorator = decorators && key in decorators ? decorators[key] : descriptor.get ? computedDecorator : defaultDecorator;
        if (process.env.NODE_ENV !== "production" && typeof decorator !== "function")
          fail2("Not a valid decorator for '" + stringifyKey(key) + "', got: " + decorator);
        var resultDescriptor = decorator(target, key, descriptor, true);
        if (resultDescriptor)
          Object.defineProperty(target, key, resultDescriptor);
      }
    } catch (e_2_1) {
      e_2 = { error: e_2_1 };
    } finally {
      try {
        if (keys_2_1 && !keys_2_1.done && (_b = keys_2.return)) _b.call(keys_2);
      } finally {
        if (e_2) throw e_2.error;
      }
    }
  } finally {
    endBatch();
  }
}
function getDependencyTree(thing, property) {
  return nodeToDependencyTree(getAtom(thing, property));
}
function nodeToDependencyTree(node) {
  var result = {
    name: node.name
  };
  if (node.observing && node.observing.length > 0)
    result.dependencies = unique(node.observing).map(nodeToDependencyTree);
  return result;
}
function FlowCancellationError() {
  this.message = "FLOW_CANCELLED";
}
FlowCancellationError.prototype = Object.create(Error.prototype);
function interceptReads(thing, propOrHandler, handler) {
  var target;
  if (isObservableMap(thing) || isObservableArray(thing) || isObservableValue(thing)) {
    target = getAdministration(thing);
  } else if (isObservableObject(thing)) {
    if (typeof propOrHandler !== "string")
      return fail2(process.env.NODE_ENV !== "production" && "InterceptReads can only be used with a specific property, not with an object in general");
    target = getAdministration(thing, propOrHandler);
  } else {
    return fail2(process.env.NODE_ENV !== "production" && "Expected observable map, object or array as first array");
  }
  if (target.dehancer !== void 0)
    return fail2(process.env.NODE_ENV !== "production" && "An intercept reader was already established");
  target.dehancer = typeof propOrHandler === "function" ? propOrHandler : handler;
  return function() {
    target.dehancer = void 0;
  };
}
function intercept(thing, propOrHandler, handler) {
  if (typeof handler === "function")
    return interceptProperty(thing, propOrHandler, handler);
  else
    return interceptInterceptable(thing, propOrHandler);
}
function interceptInterceptable(thing, handler) {
  return getAdministration(thing).intercept(handler);
}
function interceptProperty(thing, property, handler) {
  return getAdministration(thing, property).intercept(handler);
}
function _isComputed(value, property) {
  if (value === null || value === void 0)
    return false;
  if (property !== void 0) {
    if (isObservableObject(value) === false)
      return false;
    if (!value[$mobx].values.has(property))
      return false;
    var atom = getAtom(value, property);
    return isComputedValue(atom);
  }
  return isComputedValue(value);
}
function isComputed(value) {
  if (arguments.length > 1)
    return fail2(process.env.NODE_ENV !== "production" && "isComputed expects only 1 argument. Use isObservableProp to inspect the observability of a property");
  return _isComputed(value);
}
function isComputedProp(value, propName) {
  if (typeof propName !== "string")
    return fail2(process.env.NODE_ENV !== "production" && "isComputed expected a property name as second argument");
  return _isComputed(value, propName);
}
function _isObservable(value, property) {
  if (value === null || value === void 0)
    return false;
  if (property !== void 0) {
    if (process.env.NODE_ENV !== "production" && (isObservableMap(value) || isObservableArray(value)))
      return fail2("isObservable(object, propertyName) is not supported for arrays and maps. Use map.has or array.length instead.");
    if (isObservableObject(value)) {
      return value[$mobx].values.has(property);
    }
    return false;
  }
  return isObservableObject(value) || !!value[$mobx] || isAtom(value) || isReaction(value) || isComputedValue(value);
}
function isObservable(value) {
  if (arguments.length !== 1)
    fail2(process.env.NODE_ENV !== "production" && "isObservable expects only 1 argument. Use isObservableProp to inspect the observability of a property");
  return _isObservable(value);
}
function keys(obj) {
  if (isObservableObject(obj)) {
    return obj[$mobx].getKeys();
  }
  if (isObservableMap(obj)) {
    return Array.from(obj.keys());
  }
  if (isObservableSet(obj)) {
    return Array.from(obj.keys());
  }
  if (isObservableArray(obj)) {
    return obj.map(function(_, index) {
      return index;
    });
  }
  return fail2(process.env.NODE_ENV !== "production" && "'keys()' can only be used on observable objects, arrays, sets and maps");
}
function values(obj) {
  if (isObservableObject(obj)) {
    return keys(obj).map(function(key) {
      return obj[key];
    });
  }
  if (isObservableMap(obj)) {
    return keys(obj).map(function(key) {
      return obj.get(key);
    });
  }
  if (isObservableSet(obj)) {
    return Array.from(obj.values());
  }
  if (isObservableArray(obj)) {
    return obj.slice();
  }
  return fail2(process.env.NODE_ENV !== "production" && "'values()' can only be used on observable objects, arrays, sets and maps");
}
function entries(obj) {
  if (isObservableObject(obj)) {
    return keys(obj).map(function(key) {
      return [key, obj[key]];
    });
  }
  if (isObservableMap(obj)) {
    return keys(obj).map(function(key) {
      return [key, obj.get(key)];
    });
  }
  if (isObservableSet(obj)) {
    return Array.from(obj.entries());
  }
  if (isObservableArray(obj)) {
    return obj.map(function(key, index) {
      return [index, key];
    });
  }
  return fail2(process.env.NODE_ENV !== "production" && "'entries()' can only be used on observable objects, arrays and maps");
}
function set(obj, key, value) {
  if (arguments.length === 2 && !isObservableSet(obj)) {
    startBatch();
    var values_1 = key;
    try {
      for (var key_1 in values_1)
        set(obj, key_1, values_1[key_1]);
    } finally {
      endBatch();
    }
    return;
  }
  if (isObservableObject(obj)) {
    var adm = obj[$mobx];
    var existingObservable = adm.values.get(key);
    if (existingObservable) {
      adm.write(key, value);
    } else {
      adm.addObservableProp(key, value, adm.defaultEnhancer);
    }
  } else if (isObservableMap(obj)) {
    obj.set(key, value);
  } else if (isObservableSet(obj)) {
    obj.add(key);
  } else if (isObservableArray(obj)) {
    if (typeof key !== "number")
      key = parseInt(key, 10);
    invariant(key >= 0, "Not a valid index: '" + key + "'");
    startBatch();
    if (key >= obj.length)
      obj.length = key + 1;
    obj[key] = value;
    endBatch();
  } else {
    return fail2(process.env.NODE_ENV !== "production" && "'set()' can only be used on observable objects, arrays and maps");
  }
}
function observe(thing, propOrCb, cbOrFire, fireImmediately) {
  if (typeof cbOrFire === "function")
    return observeObservableProperty(thing, propOrCb, cbOrFire, fireImmediately);
  else
    return observeObservable(thing, propOrCb, cbOrFire);
}
function observeObservable(thing, listener, fireImmediately) {
  return getAdministration(thing).observe(listener, fireImmediately);
}
function observeObservableProperty(thing, property, listener, fireImmediately) {
  return getAdministration(thing, property).observe(listener, fireImmediately);
}
function trace() {
  var args = [];
  for (var _i = 0; _i < arguments.length; _i++) {
    args[_i] = arguments[_i];
  }
  var enterBreakPoint = false;
  if (typeof args[args.length - 1] === "boolean")
    enterBreakPoint = args.pop();
  var derivation = getAtomFromArgs(args);
  if (!derivation) {
    return fail2(process.env.NODE_ENV !== "production" && "'trace(break?)' can only be used inside a tracked computed value or a Reaction. Consider passing in the computed value or reaction explicitly");
  }
  if (derivation.isTracing === TraceMode.NONE) {
    console.log("[mobx.trace] '" + derivation.name + "' tracing enabled");
  }
  derivation.isTracing = enterBreakPoint ? TraceMode.BREAK : TraceMode.LOG;
}
function getAtomFromArgs(args) {
  switch (args.length) {
    case 0:
      return globalState.trackingDerivation;
    case 1:
      return getAtom(args[0]);
    case 2:
      return getAtom(args[0], args[1]);
  }
}
function transaction(action3, thisArg) {
  if (thisArg === void 0) {
    thisArg = void 0;
  }
  startBatch();
  try {
    return action3.apply(thisArg);
  } finally {
    endBatch();
  }
}
function getAdm(target) {
  return target[$mobx];
}
function isPropertyKey(val) {
  return typeof val === "string" || typeof val === "number" || typeof val === "symbol";
}
var objectProxyTraps = {
  has: function(target, name) {
    if (name === $mobx || name === "constructor" || name === mobxDidRunLazyInitializersSymbol)
      return true;
    var adm = getAdm(target);
    if (isPropertyKey(name))
      return adm.has(name);
    return name in target;
  },
  get: function(target, name) {
    if (name === $mobx || name === "constructor" || name === mobxDidRunLazyInitializersSymbol)
      return target[name];
    var adm = getAdm(target);
    var observable2 = adm.values.get(name);
    if (observable2 instanceof Atom) {
      var result = observable2.get();
      if (result === void 0) {
        adm.has(name);
      }
      return result;
    }
    if (isPropertyKey(name))
      adm.has(name);
    return target[name];
  },
  set: function(target, name, value) {
    if (!isPropertyKey(name))
      return false;
    set(target, name, value);
    return true;
  },
  deleteProperty: function(target, name) {
    if (!isPropertyKey(name))
      return false;
    var adm = getAdm(target);
    adm.remove(name);
    return true;
  },
  ownKeys: function(target) {
    var adm = getAdm(target);
    adm.keysAtom.reportObserved();
    return Reflect.ownKeys(target);
  },
  preventExtensions: function(target) {
    fail2("Dynamic observable objects cannot be frozen");
    return false;
  }
};
function createDynamicObservableObject(base) {
  var proxy = new Proxy(base, objectProxyTraps);
  base[$mobx].proxy = proxy;
  return proxy;
}
function hasInterceptors(interceptable) {
  return interceptable.interceptors !== void 0 && interceptable.interceptors.length > 0;
}
function registerInterceptor(interceptable, handler) {
  var interceptors = interceptable.interceptors || (interceptable.interceptors = []);
  interceptors.push(handler);
  return once(function() {
    var idx = interceptors.indexOf(handler);
    if (idx !== -1)
      interceptors.splice(idx, 1);
  });
}
function interceptChange(interceptable, change) {
  var prevU = untrackedStart();
  try {
    var interceptors = __spread(interceptable.interceptors || []);
    for (var i = 0, l = interceptors.length; i < l; i++) {
      change = interceptors[i](change);
      invariant(!change || change.type, "Intercept handlers should return nothing or a change object");
      if (!change)
        break;
    }
    return change;
  } finally {
    untrackedEnd(prevU);
  }
}
function hasListeners(listenable) {
  return listenable.changeListeners !== void 0 && listenable.changeListeners.length > 0;
}
function registerListener(listenable, handler) {
  var listeners = listenable.changeListeners || (listenable.changeListeners = []);
  listeners.push(handler);
  return once(function() {
    var idx = listeners.indexOf(handler);
    if (idx !== -1)
      listeners.splice(idx, 1);
  });
}
function notifyListeners(listenable, change) {
  var prevU = untrackedStart();
  var listeners = listenable.changeListeners;
  if (!listeners)
    return;
  listeners = listeners.slice();
  for (var i = 0, l = listeners.length; i < l; i++) {
    listeners[i](change);
  }
  untrackedEnd(prevU);
}
var MAX_SPLICE_SIZE = 1e4;
var arrayTraps = {
  get: function(target, name) {
    if (name === $mobx)
      return target[$mobx];
    if (name === "length")
      return target[$mobx].getArrayLength();
    if (typeof name === "number") {
      return arrayExtensions.get.call(target, name);
    }
    if (typeof name === "string" && !isNaN(name)) {
      return arrayExtensions.get.call(target, parseInt(name));
    }
    if (arrayExtensions.hasOwnProperty(name)) {
      return arrayExtensions[name];
    }
    return target[name];
  },
  set: function(target, name, value) {
    if (name === "length") {
      target[$mobx].setArrayLength(value);
    }
    if (typeof name === "number") {
      arrayExtensions.set.call(target, name, value);
    }
    if (typeof name === "symbol" || isNaN(name)) {
      target[name] = value;
    } else {
      arrayExtensions.set.call(target, parseInt(name), value);
    }
    return true;
  },
  preventExtensions: function(target) {
    fail2("Observable arrays cannot be frozen");
    return false;
  }
};
function createObservableArray(initialValues, enhancer, name, owned) {
  if (name === void 0) {
    name = "ObservableArray@" + getNextId();
  }
  if (owned === void 0) {
    owned = false;
  }
  var adm = new ObservableArrayAdministration(name, enhancer, owned);
  addHiddenFinalProp(adm.values, $mobx, adm);
  var proxy = new Proxy(adm.values, arrayTraps);
  adm.proxy = proxy;
  if (initialValues && initialValues.length) {
    var prev = allowStateChangesStart(true);
    adm.spliceWithArray(0, 0, initialValues);
    allowStateChangesEnd(prev);
  }
  return proxy;
}
var ObservableArrayAdministration = (
  /** @class */
  (function() {
    function ObservableArrayAdministration2(name, enhancer, owned) {
      this.owned = owned;
      this.values = [];
      this.proxy = void 0;
      this.lastKnownLength = 0;
      this.atom = new Atom(name || "ObservableArray@" + getNextId());
      this.enhancer = function(newV, oldV) {
        return enhancer(newV, oldV, name + "[..]");
      };
    }
    ObservableArrayAdministration2.prototype.dehanceValue = function(value) {
      if (this.dehancer !== void 0)
        return this.dehancer(value);
      return value;
    };
    ObservableArrayAdministration2.prototype.dehanceValues = function(values2) {
      if (this.dehancer !== void 0 && values2.length > 0)
        return values2.map(this.dehancer);
      return values2;
    };
    ObservableArrayAdministration2.prototype.intercept = function(handler) {
      return registerInterceptor(this, handler);
    };
    ObservableArrayAdministration2.prototype.observe = function(listener, fireImmediately) {
      if (fireImmediately === void 0) {
        fireImmediately = false;
      }
      if (fireImmediately) {
        listener({
          object: this.proxy,
          type: "splice",
          index: 0,
          added: this.values.slice(),
          addedCount: this.values.length,
          removed: [],
          removedCount: 0
        });
      }
      return registerListener(this, listener);
    };
    ObservableArrayAdministration2.prototype.getArrayLength = function() {
      this.atom.reportObserved();
      return this.values.length;
    };
    ObservableArrayAdministration2.prototype.setArrayLength = function(newLength) {
      if (typeof newLength !== "number" || newLength < 0)
        throw new Error("[mobx.array] Out of range: " + newLength);
      var currentLength = this.values.length;
      if (newLength === currentLength)
        return;
      else if (newLength > currentLength) {
        var newItems = new Array(newLength - currentLength);
        for (var i = 0; i < newLength - currentLength; i++)
          newItems[i] = void 0;
        this.spliceWithArray(currentLength, 0, newItems);
      } else
        this.spliceWithArray(newLength, currentLength - newLength);
    };
    ObservableArrayAdministration2.prototype.updateArrayLength = function(oldLength, delta) {
      if (oldLength !== this.lastKnownLength)
        throw new Error("[mobx] Modification exception: the internal structure of an observable array was changed.");
      this.lastKnownLength += delta;
    };
    ObservableArrayAdministration2.prototype.spliceWithArray = function(index, deleteCount, newItems) {
      var _this = this;
      checkIfStateModificationsAreAllowed(this.atom);
      var length = this.values.length;
      if (index === void 0)
        index = 0;
      else if (index > length)
        index = length;
      else if (index < 0)
        index = Math.max(0, length + index);
      if (arguments.length === 1)
        deleteCount = length - index;
      else if (deleteCount === void 0 || deleteCount === null)
        deleteCount = 0;
      else
        deleteCount = Math.max(0, Math.min(deleteCount, length - index));
      if (newItems === void 0)
        newItems = EMPTY_ARRAY;
      if (hasInterceptors(this)) {
        var change = interceptChange(this, {
          object: this.proxy,
          type: "splice",
          index,
          removedCount: deleteCount,
          added: newItems
        });
        if (!change)
          return EMPTY_ARRAY;
        deleteCount = change.removedCount;
        newItems = change.added;
      }
      newItems = newItems.length === 0 ? newItems : newItems.map(function(v) {
        return _this.enhancer(v, void 0);
      });
      if (process.env.NODE_ENV !== "production") {
        var lengthDelta = newItems.length - deleteCount;
        this.updateArrayLength(length, lengthDelta);
      }
      var res = this.spliceItemsIntoValues(index, deleteCount, newItems);
      if (deleteCount !== 0 || newItems.length !== 0)
        this.notifyArraySplice(index, newItems, res);
      return this.dehanceValues(res);
    };
    ObservableArrayAdministration2.prototype.spliceItemsIntoValues = function(index, deleteCount, newItems) {
      var _a2;
      if (newItems.length < MAX_SPLICE_SIZE) {
        return (_a2 = this.values).splice.apply(_a2, __spread([index, deleteCount], newItems));
      } else {
        var res = this.values.slice(index, index + deleteCount);
        this.values = this.values.slice(0, index).concat(newItems, this.values.slice(index + deleteCount));
        return res;
      }
    };
    ObservableArrayAdministration2.prototype.notifyArrayChildUpdate = function(index, newValue, oldValue) {
      var notifySpy = !this.owned && isSpyEnabled();
      var notify = hasListeners(this);
      var change = notify || notifySpy ? {
        object: this.proxy,
        type: "update",
        index,
        newValue,
        oldValue
      } : null;
      if (notifySpy && process.env.NODE_ENV !== "production")
        spyReportStart(__assign(__assign({}, change), { name: this.atom.name }));
      this.atom.reportChanged();
      if (notify)
        notifyListeners(this, change);
      if (notifySpy && process.env.NODE_ENV !== "production")
        spyReportEnd();
    };
    ObservableArrayAdministration2.prototype.notifyArraySplice = function(index, added, removed) {
      var notifySpy = !this.owned && isSpyEnabled();
      var notify = hasListeners(this);
      var change = notify || notifySpy ? {
        object: this.proxy,
        type: "splice",
        index,
        removed,
        added,
        removedCount: removed.length,
        addedCount: added.length
      } : null;
      if (notifySpy && process.env.NODE_ENV !== "production")
        spyReportStart(__assign(__assign({}, change), { name: this.atom.name }));
      this.atom.reportChanged();
      if (notify)
        notifyListeners(this, change);
      if (notifySpy && process.env.NODE_ENV !== "production")
        spyReportEnd();
    };
    return ObservableArrayAdministration2;
  })()
);
var arrayExtensions = {
  intercept: function(handler) {
    return this[$mobx].intercept(handler);
  },
  observe: function(listener, fireImmediately) {
    if (fireImmediately === void 0) {
      fireImmediately = false;
    }
    var adm = this[$mobx];
    return adm.observe(listener, fireImmediately);
  },
  clear: function() {
    return this.splice(0);
  },
  replace: function(newItems) {
    var adm = this[$mobx];
    return adm.spliceWithArray(0, adm.values.length, newItems);
  },
  /**
   * Converts this array back to a (shallow) javascript structure.
   * For a deep clone use mobx.toJS
   */
  toJS: function() {
    return this.slice();
  },
  toJSON: function() {
    return this.toJS();
  },
  /*
   * functions that do alter the internal structure of the array, (based on lib.es6.d.ts)
   * since these functions alter the inner structure of the array, the have side effects.
   * Because the have side effects, they should not be used in computed function,
   * and for that reason the do not call dependencyState.notifyObserved
   */
  splice: function(index, deleteCount) {
    var newItems = [];
    for (var _i = 2; _i < arguments.length; _i++) {
      newItems[_i - 2] = arguments[_i];
    }
    var adm = this[$mobx];
    switch (arguments.length) {
      case 0:
        return [];
      case 1:
        return adm.spliceWithArray(index);
      case 2:
        return adm.spliceWithArray(index, deleteCount);
    }
    return adm.spliceWithArray(index, deleteCount, newItems);
  },
  spliceWithArray: function(index, deleteCount, newItems) {
    var adm = this[$mobx];
    return adm.spliceWithArray(index, deleteCount, newItems);
  },
  push: function() {
    var items = [];
    for (var _i = 0; _i < arguments.length; _i++) {
      items[_i] = arguments[_i];
    }
    var adm = this[$mobx];
    adm.spliceWithArray(adm.values.length, 0, items);
    return adm.values.length;
  },
  pop: function() {
    return this.splice(Math.max(this[$mobx].values.length - 1, 0), 1)[0];
  },
  shift: function() {
    return this.splice(0, 1)[0];
  },
  unshift: function() {
    var items = [];
    for (var _i = 0; _i < arguments.length; _i++) {
      items[_i] = arguments[_i];
    }
    var adm = this[$mobx];
    adm.spliceWithArray(0, 0, items);
    return adm.values.length;
  },
  reverse: function() {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[mobx] `observableArray.reverse()` will not update the array in place. Use `observableArray.slice().reverse()` to suppress this warning and perform the operation on a copy, or `observableArray.replace(observableArray.slice().reverse())` to reverse & update in place");
    }
    var clone = this.slice();
    return clone.reverse.apply(clone, arguments);
  },
  sort: function(compareFn) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[mobx] `observableArray.sort()` will not update the array in place. Use `observableArray.slice().sort()` to suppress this warning and perform the operation on a copy, or `observableArray.replace(observableArray.slice().sort())` to sort & update in place");
    }
    var clone = this.slice();
    return clone.sort.apply(clone, arguments);
  },
  remove: function(value) {
    var adm = this[$mobx];
    var idx = adm.dehanceValues(adm.values).indexOf(value);
    if (idx > -1) {
      this.splice(idx, 1);
      return true;
    }
    return false;
  },
  get: function(index) {
    var adm = this[$mobx];
    if (adm) {
      if (index < adm.values.length) {
        adm.atom.reportObserved();
        return adm.dehanceValue(adm.values[index]);
      }
      console.warn("[mobx.array] Attempt to read an array index (" + index + ") that is out of bounds (" + adm.values.length + "). Please check length first. Out of bound indices will not be tracked by MobX");
    }
    return void 0;
  },
  set: function(index, newValue) {
    var adm = this[$mobx];
    var values2 = adm.values;
    if (index < values2.length) {
      checkIfStateModificationsAreAllowed(adm.atom);
      var oldValue = values2[index];
      if (hasInterceptors(adm)) {
        var change = interceptChange(adm, {
          type: "update",
          object: adm.proxy,
          index,
          newValue
        });
        if (!change)
          return;
        newValue = change.newValue;
      }
      newValue = adm.enhancer(newValue, oldValue);
      var changed = newValue !== oldValue;
      if (changed) {
        values2[index] = newValue;
        adm.notifyArrayChildUpdate(index, newValue, oldValue);
      }
    } else if (index === values2.length) {
      adm.spliceWithArray(index, 0, [newValue]);
    } else {
      throw new Error("[mobx.array] Index out of bounds, " + index + " is larger than " + values2.length);
    }
  }
};
[
  "concat",
  "flat",
  "includes",
  "indexOf",
  "join",
  "lastIndexOf",
  "slice",
  "toString",
  "toLocaleString"
].forEach(function(funcName) {
  if (typeof Array.prototype[funcName] !== "function") {
    return;
  }
  arrayExtensions[funcName] = function() {
    var adm = this[$mobx];
    adm.atom.reportObserved();
    var dehancedValues = adm.dehanceValues(adm.values);
    return dehancedValues[funcName].apply(dehancedValues, arguments);
  };
});
["every", "filter", "find", "findIndex", "flatMap", "forEach", "map", "some"].forEach(function(funcName) {
  if (typeof Array.prototype[funcName] !== "function") {
    return;
  }
  arrayExtensions[funcName] = function(callback, thisArg) {
    var _this = this;
    var adm = this[$mobx];
    adm.atom.reportObserved();
    var dehancedValues = adm.dehanceValues(adm.values);
    return dehancedValues[funcName](function(element, index) {
      return callback.call(thisArg, element, index, _this);
    }, thisArg);
  };
});
["reduce", "reduceRight"].forEach(function(funcName) {
  arrayExtensions[funcName] = function() {
    var _this = this;
    var adm = this[$mobx];
    adm.atom.reportObserved();
    var callback = arguments[0];
    arguments[0] = function(accumulator, currentValue, index) {
      currentValue = adm.dehanceValue(currentValue);
      return callback(accumulator, currentValue, index, _this);
    };
    return adm.values[funcName].apply(adm.values, arguments);
  };
});
var isObservableArrayAdministration = createInstanceofPredicate("ObservableArrayAdministration", ObservableArrayAdministration);
function isObservableArray(thing) {
  return isObject(thing) && isObservableArrayAdministration(thing[$mobx]);
}
var _a;
var ObservableMapMarker = {};
var ObservableMap = (
  /** @class */
  (function() {
    function ObservableMap2(initialData, enhancer, name) {
      if (enhancer === void 0) {
        enhancer = deepEnhancer;
      }
      if (name === void 0) {
        name = "ObservableMap@" + getNextId();
      }
      this.enhancer = enhancer;
      this.name = name;
      this[_a] = ObservableMapMarker;
      this._keysAtom = createAtom(this.name + ".keys()");
      this[Symbol.toStringTag] = "Map";
      if (typeof Map !== "function") {
        throw new Error("mobx.map requires Map polyfill for the current browser. Check babel-polyfill or core-js/es6/map.js");
      }
      this._data = /* @__PURE__ */ new Map();
      this._hasMap = /* @__PURE__ */ new Map();
      this.merge(initialData);
    }
    ObservableMap2.prototype._has = function(key) {
      return this._data.has(key);
    };
    ObservableMap2.prototype.has = function(key) {
      var _this = this;
      if (!globalState.trackingDerivation)
        return this._has(key);
      var entry = this._hasMap.get(key);
      if (!entry) {
        var newEntry = entry = new ObservableValue(this._has(key), referenceEnhancer, this.name + "." + stringifyKey(key) + "?", false);
        this._hasMap.set(key, newEntry);
        onBecomeUnobserved(newEntry, function() {
          return _this._hasMap.delete(key);
        });
      }
      return entry.get();
    };
    ObservableMap2.prototype.set = function(key, value) {
      var hasKey = this._has(key);
      if (hasInterceptors(this)) {
        var change = interceptChange(this, {
          type: hasKey ? "update" : "add",
          object: this,
          newValue: value,
          name: key
        });
        if (!change)
          return this;
        value = change.newValue;
      }
      if (hasKey) {
        this._updateValue(key, value);
      } else {
        this._addValue(key, value);
      }
      return this;
    };
    ObservableMap2.prototype.delete = function(key) {
      var _this = this;
      checkIfStateModificationsAreAllowed(this._keysAtom);
      if (hasInterceptors(this)) {
        var change = interceptChange(this, {
          type: "delete",
          object: this,
          name: key
        });
        if (!change)
          return false;
      }
      if (this._has(key)) {
        var notifySpy = isSpyEnabled();
        var notify = hasListeners(this);
        var change = notify || notifySpy ? {
          type: "delete",
          object: this,
          oldValue: this._data.get(key).value,
          name: key
        } : null;
        if (notifySpy && process.env.NODE_ENV !== "production")
          spyReportStart(__assign(__assign({}, change), { name: this.name, key }));
        transaction(function() {
          _this._keysAtom.reportChanged();
          _this._updateHasMapEntry(key, false);
          var observable2 = _this._data.get(key);
          observable2.setNewValue(void 0);
          _this._data.delete(key);
        });
        if (notify)
          notifyListeners(this, change);
        if (notifySpy && process.env.NODE_ENV !== "production")
          spyReportEnd();
        return true;
      }
      return false;
    };
    ObservableMap2.prototype._updateHasMapEntry = function(key, value) {
      var entry = this._hasMap.get(key);
      if (entry) {
        entry.setNewValue(value);
      }
    };
    ObservableMap2.prototype._updateValue = function(key, newValue) {
      var observable2 = this._data.get(key);
      newValue = observable2.prepareNewValue(newValue);
      if (newValue !== globalState.UNCHANGED) {
        var notifySpy = isSpyEnabled();
        var notify = hasListeners(this);
        var change = notify || notifySpy ? {
          type: "update",
          object: this,
          oldValue: observable2.value,
          name: key,
          newValue
        } : null;
        if (notifySpy && process.env.NODE_ENV !== "production")
          spyReportStart(__assign(__assign({}, change), { name: this.name, key }));
        observable2.setNewValue(newValue);
        if (notify)
          notifyListeners(this, change);
        if (notifySpy && process.env.NODE_ENV !== "production")
          spyReportEnd();
      }
    };
    ObservableMap2.prototype._addValue = function(key, newValue) {
      var _this = this;
      checkIfStateModificationsAreAllowed(this._keysAtom);
      transaction(function() {
        var observable2 = new ObservableValue(newValue, _this.enhancer, _this.name + "." + stringifyKey(key), false);
        _this._data.set(key, observable2);
        newValue = observable2.value;
        _this._updateHasMapEntry(key, true);
        _this._keysAtom.reportChanged();
      });
      var notifySpy = isSpyEnabled();
      var notify = hasListeners(this);
      var change = notify || notifySpy ? {
        type: "add",
        object: this,
        name: key,
        newValue
      } : null;
      if (notifySpy && process.env.NODE_ENV !== "production")
        spyReportStart(__assign(__assign({}, change), { name: this.name, key }));
      if (notify)
        notifyListeners(this, change);
      if (notifySpy && process.env.NODE_ENV !== "production")
        spyReportEnd();
    };
    ObservableMap2.prototype.get = function(key) {
      if (this.has(key))
        return this.dehanceValue(this._data.get(key).get());
      return this.dehanceValue(void 0);
    };
    ObservableMap2.prototype.dehanceValue = function(value) {
      if (this.dehancer !== void 0) {
        return this.dehancer(value);
      }
      return value;
    };
    ObservableMap2.prototype.keys = function() {
      this._keysAtom.reportObserved();
      return this._data.keys();
    };
    ObservableMap2.prototype.values = function() {
      var self2 = this;
      var keys2 = this.keys();
      return makeIterable({
        next: function() {
          var _b = keys2.next(), done = _b.done, value = _b.value;
          return {
            done,
            value: done ? void 0 : self2.get(value)
          };
        }
      });
    };
    ObservableMap2.prototype.entries = function() {
      var self2 = this;
      var keys2 = this.keys();
      return makeIterable({
        next: function() {
          var _b = keys2.next(), done = _b.done, value = _b.value;
          return {
            done,
            value: done ? void 0 : [value, self2.get(value)]
          };
        }
      });
    };
    ObservableMap2.prototype[_a = $mobx, Symbol.iterator] = function() {
      return this.entries();
    };
    ObservableMap2.prototype.forEach = function(callback, thisArg) {
      var e_1, _b;
      try {
        for (var _c = __values(this), _d = _c.next(); !_d.done; _d = _c.next()) {
          var _e = __read(_d.value, 2), key = _e[0], value = _e[1];
          callback.call(thisArg, value, key, this);
        }
      } catch (e_1_1) {
        e_1 = { error: e_1_1 };
      } finally {
        try {
          if (_d && !_d.done && (_b = _c.return)) _b.call(_c);
        } finally {
          if (e_1) throw e_1.error;
        }
      }
    };
    ObservableMap2.prototype.merge = function(other) {
      var _this = this;
      if (isObservableMap(other)) {
        other = other.toJS();
      }
      transaction(function() {
        var prev = allowStateChangesStart(true);
        try {
          if (isPlainObject(other))
            getPlainObjectKeys(other).forEach(function(key) {
              return _this.set(key, other[key]);
            });
          else if (Array.isArray(other))
            other.forEach(function(_b) {
              var _c = __read(_b, 2), key = _c[0], value = _c[1];
              return _this.set(key, value);
            });
          else if (isES6Map(other)) {
            if (other.constructor !== Map)
              fail2("Cannot initialize from classes that inherit from Map: " + other.constructor.name);
            other.forEach(function(value, key) {
              return _this.set(key, value);
            });
          } else if (other !== null && other !== void 0)
            fail2("Cannot initialize map from " + other);
        } finally {
          allowStateChangesEnd(prev);
        }
      });
      return this;
    };
    ObservableMap2.prototype.clear = function() {
      var _this = this;
      transaction(function() {
        untracked(function() {
          var e_2, _b;
          try {
            for (var _c = __values(_this.keys()), _d = _c.next(); !_d.done; _d = _c.next()) {
              var key = _d.value;
              _this.delete(key);
            }
          } catch (e_2_1) {
            e_2 = { error: e_2_1 };
          } finally {
            try {
              if (_d && !_d.done && (_b = _c.return)) _b.call(_c);
            } finally {
              if (e_2) throw e_2.error;
            }
          }
        });
      });
    };
    ObservableMap2.prototype.replace = function(values2) {
      var _this = this;
      transaction(function() {
        var e_3, _b, e_4, _c;
        var replacementMap = convertToMap(values2);
        var orderedData = /* @__PURE__ */ new Map();
        var keysReportChangedCalled = false;
        try {
          for (var _d = __values(_this._data.keys()), _e = _d.next(); !_e.done; _e = _d.next()) {
            var key = _e.value;
            if (!replacementMap.has(key)) {
              var deleted = _this.delete(key);
              if (deleted) {
                keysReportChangedCalled = true;
              } else {
                var value = _this._data.get(key);
                orderedData.set(key, value);
              }
            }
          }
        } catch (e_3_1) {
          e_3 = { error: e_3_1 };
        } finally {
          try {
            if (_e && !_e.done && (_b = _d.return)) _b.call(_d);
          } finally {
            if (e_3) throw e_3.error;
          }
        }
        try {
          for (var _f = __values(replacementMap.entries()), _g = _f.next(); !_g.done; _g = _f.next()) {
            var _h = __read(_g.value, 2), key = _h[0], value = _h[1];
            var keyExisted = _this._data.has(key);
            _this.set(key, value);
            if (_this._data.has(key)) {
              var value_1 = _this._data.get(key);
              orderedData.set(key, value_1);
              if (!keyExisted) {
                keysReportChangedCalled = true;
              }
            }
          }
        } catch (e_4_1) {
          e_4 = { error: e_4_1 };
        } finally {
          try {
            if (_g && !_g.done && (_c = _f.return)) _c.call(_f);
          } finally {
            if (e_4) throw e_4.error;
          }
        }
        if (!keysReportChangedCalled) {
          if (_this._data.size !== orderedData.size) {
            _this._keysAtom.reportChanged();
          } else {
            var iter1 = _this._data.keys();
            var iter2 = orderedData.keys();
            var next1 = iter1.next();
            var next2 = iter2.next();
            while (!next1.done) {
              if (next1.value !== next2.value) {
                _this._keysAtom.reportChanged();
                break;
              }
              next1 = iter1.next();
              next2 = iter2.next();
            }
          }
        }
        _this._data = orderedData;
      });
      return this;
    };
    Object.defineProperty(ObservableMap2.prototype, "size", {
      get: function() {
        this._keysAtom.reportObserved();
        return this._data.size;
      },
      enumerable: true,
      configurable: true
    });
    ObservableMap2.prototype.toPOJO = function() {
      var e_5, _b;
      var res = {};
      try {
        for (var _c = __values(this), _d = _c.next(); !_d.done; _d = _c.next()) {
          var _e = __read(_d.value, 2), key = _e[0], value = _e[1];
          res[typeof key === "symbol" ? key : stringifyKey(key)] = value;
        }
      } catch (e_5_1) {
        e_5 = { error: e_5_1 };
      } finally {
        try {
          if (_d && !_d.done && (_b = _c.return)) _b.call(_c);
        } finally {
          if (e_5) throw e_5.error;
        }
      }
      return res;
    };
    ObservableMap2.prototype.toJS = function() {
      return new Map(this);
    };
    ObservableMap2.prototype.toJSON = function() {
      return this.toPOJO();
    };
    ObservableMap2.prototype.toString = function() {
      var _this = this;
      return this.name + "[{ " + Array.from(this.keys()).map(function(key) {
        return stringifyKey(key) + ": " + ("" + _this.get(key));
      }).join(", ") + " }]";
    };
    ObservableMap2.prototype.observe = function(listener, fireImmediately) {
      process.env.NODE_ENV !== "production" && invariant(fireImmediately !== true, "`observe` doesn't support fireImmediately=true in combination with maps.");
      return registerListener(this, listener);
    };
    ObservableMap2.prototype.intercept = function(handler) {
      return registerInterceptor(this, handler);
    };
    return ObservableMap2;
  })()
);
var isObservableMap = createInstanceofPredicate("ObservableMap", ObservableMap);
var _a$1;
var ObservableSetMarker = {};
var ObservableSet = (
  /** @class */
  (function() {
    function ObservableSet2(initialData, enhancer, name) {
      if (enhancer === void 0) {
        enhancer = deepEnhancer;
      }
      if (name === void 0) {
        name = "ObservableSet@" + getNextId();
      }
      this.name = name;
      this[_a$1] = ObservableSetMarker;
      this._data = /* @__PURE__ */ new Set();
      this._atom = createAtom(this.name);
      this[Symbol.toStringTag] = "Set";
      if (typeof Set !== "function") {
        throw new Error("mobx.set requires Set polyfill for the current browser. Check babel-polyfill or core-js/es6/set.js");
      }
      this.enhancer = function(newV, oldV) {
        return enhancer(newV, oldV, name);
      };
      if (initialData) {
        this.replace(initialData);
      }
    }
    ObservableSet2.prototype.dehanceValue = function(value) {
      if (this.dehancer !== void 0) {
        return this.dehancer(value);
      }
      return value;
    };
    ObservableSet2.prototype.clear = function() {
      var _this = this;
      transaction(function() {
        untracked(function() {
          var e_1, _b;
          try {
            for (var _c = __values(_this._data.values()), _d = _c.next(); !_d.done; _d = _c.next()) {
              var value = _d.value;
              _this.delete(value);
            }
          } catch (e_1_1) {
            e_1 = { error: e_1_1 };
          } finally {
            try {
              if (_d && !_d.done && (_b = _c.return)) _b.call(_c);
            } finally {
              if (e_1) throw e_1.error;
            }
          }
        });
      });
    };
    ObservableSet2.prototype.forEach = function(callbackFn, thisArg) {
      var e_2, _b;
      try {
        for (var _c = __values(this), _d = _c.next(); !_d.done; _d = _c.next()) {
          var value = _d.value;
          callbackFn.call(thisArg, value, value, this);
        }
      } catch (e_2_1) {
        e_2 = { error: e_2_1 };
      } finally {
        try {
          if (_d && !_d.done && (_b = _c.return)) _b.call(_c);
        } finally {
          if (e_2) throw e_2.error;
        }
      }
    };
    Object.defineProperty(ObservableSet2.prototype, "size", {
      get: function() {
        this._atom.reportObserved();
        return this._data.size;
      },
      enumerable: true,
      configurable: true
    });
    ObservableSet2.prototype.add = function(value) {
      var _this = this;
      checkIfStateModificationsAreAllowed(this._atom);
      if (hasInterceptors(this)) {
        var change = interceptChange(this, {
          type: "add",
          object: this,
          newValue: value
        });
        if (!change)
          return this;
      }
      if (!this.has(value)) {
        transaction(function() {
          _this._data.add(_this.enhancer(value, void 0));
          _this._atom.reportChanged();
        });
        var notifySpy = isSpyEnabled();
        var notify = hasListeners(this);
        var change = notify || notifySpy ? {
          type: "add",
          object: this,
          newValue: value
        } : null;
        if (notifySpy && process.env.NODE_ENV !== "production")
          spyReportStart(change);
        if (notify)
          notifyListeners(this, change);
        if (notifySpy && process.env.NODE_ENV !== "production")
          spyReportEnd();
      }
      return this;
    };
    ObservableSet2.prototype.delete = function(value) {
      var _this = this;
      if (hasInterceptors(this)) {
        var change = interceptChange(this, {
          type: "delete",
          object: this,
          oldValue: value
        });
        if (!change)
          return false;
      }
      if (this.has(value)) {
        var notifySpy = isSpyEnabled();
        var notify = hasListeners(this);
        var change = notify || notifySpy ? {
          type: "delete",
          object: this,
          oldValue: value
        } : null;
        if (notifySpy && process.env.NODE_ENV !== "production")
          spyReportStart(__assign(__assign({}, change), { name: this.name }));
        transaction(function() {
          _this._atom.reportChanged();
          _this._data.delete(value);
        });
        if (notify)
          notifyListeners(this, change);
        if (notifySpy && process.env.NODE_ENV !== "production")
          spyReportEnd();
        return true;
      }
      return false;
    };
    ObservableSet2.prototype.has = function(value) {
      this._atom.reportObserved();
      return this._data.has(this.dehanceValue(value));
    };
    ObservableSet2.prototype.entries = function() {
      var nextIndex = 0;
      var keys2 = Array.from(this.keys());
      var values2 = Array.from(this.values());
      return makeIterable({
        next: function() {
          var index = nextIndex;
          nextIndex += 1;
          return index < values2.length ? { value: [keys2[index], values2[index]], done: false } : { done: true };
        }
      });
    };
    ObservableSet2.prototype.keys = function() {
      return this.values();
    };
    ObservableSet2.prototype.values = function() {
      this._atom.reportObserved();
      var self2 = this;
      var nextIndex = 0;
      var observableValues = Array.from(this._data.values());
      return makeIterable({
        next: function() {
          return nextIndex < observableValues.length ? { value: self2.dehanceValue(observableValues[nextIndex++]), done: false } : { done: true };
        }
      });
    };
    ObservableSet2.prototype.replace = function(other) {
      var _this = this;
      if (isObservableSet(other)) {
        other = other.toJS();
      }
      transaction(function() {
        var prev = allowStateChangesStart(true);
        try {
          if (Array.isArray(other)) {
            _this.clear();
            other.forEach(function(value) {
              return _this.add(value);
            });
          } else if (isES6Set(other)) {
            _this.clear();
            other.forEach(function(value) {
              return _this.add(value);
            });
          } else if (other !== null && other !== void 0) {
            fail2("Cannot initialize set from " + other);
          }
        } finally {
          allowStateChangesEnd(prev);
        }
      });
      return this;
    };
    ObservableSet2.prototype.observe = function(listener, fireImmediately) {
      process.env.NODE_ENV !== "production" && invariant(fireImmediately !== true, "`observe` doesn't support fireImmediately=true in combination with sets.");
      return registerListener(this, listener);
    };
    ObservableSet2.prototype.intercept = function(handler) {
      return registerInterceptor(this, handler);
    };
    ObservableSet2.prototype.toJS = function() {
      return new Set(this);
    };
    ObservableSet2.prototype.toString = function() {
      return this.name + "[ " + Array.from(this).join(", ") + " ]";
    };
    ObservableSet2.prototype[_a$1 = $mobx, Symbol.iterator] = function() {
      return this.values();
    };
    return ObservableSet2;
  })()
);
var isObservableSet = createInstanceofPredicate("ObservableSet", ObservableSet);
var ObservableObjectAdministration = (
  /** @class */
  (function() {
    function ObservableObjectAdministration2(target, values2, name, defaultEnhancer) {
      if (values2 === void 0) {
        values2 = /* @__PURE__ */ new Map();
      }
      this.target = target;
      this.values = values2;
      this.name = name;
      this.defaultEnhancer = defaultEnhancer;
      this.keysAtom = new Atom(name + ".keys");
    }
    ObservableObjectAdministration2.prototype.read = function(key) {
      return this.values.get(key).get();
    };
    ObservableObjectAdministration2.prototype.write = function(key, newValue) {
      var instance = this.target;
      var observable2 = this.values.get(key);
      if (observable2 instanceof ComputedValue) {
        observable2.set(newValue);
        return;
      }
      if (hasInterceptors(this)) {
        var change = interceptChange(this, {
          type: "update",
          object: this.proxy || instance,
          name: key,
          newValue
        });
        if (!change)
          return;
        newValue = change.newValue;
      }
      newValue = observable2.prepareNewValue(newValue);
      if (newValue !== globalState.UNCHANGED) {
        var notify = hasListeners(this);
        var notifySpy = isSpyEnabled();
        var change = notify || notifySpy ? {
          type: "update",
          object: this.proxy || instance,
          oldValue: observable2.value,
          name: key,
          newValue
        } : null;
        if (notifySpy && process.env.NODE_ENV !== "production")
          spyReportStart(__assign(__assign({}, change), { name: this.name, key }));
        observable2.setNewValue(newValue);
        if (notify)
          notifyListeners(this, change);
        if (notifySpy && process.env.NODE_ENV !== "production")
          spyReportEnd();
      }
    };
    ObservableObjectAdministration2.prototype.has = function(key) {
      var map = this.pendingKeys || (this.pendingKeys = /* @__PURE__ */ new Map());
      var entry = map.get(key);
      if (entry)
        return entry.get();
      else {
        var exists = !!this.values.get(key);
        entry = new ObservableValue(exists, referenceEnhancer, this.name + "." + stringifyKey(key) + "?", false);
        map.set(key, entry);
        return entry.get();
      }
    };
    ObservableObjectAdministration2.prototype.addObservableProp = function(propName, newValue, enhancer) {
      if (enhancer === void 0) {
        enhancer = this.defaultEnhancer;
      }
      var target = this.target;
      assertPropertyConfigurable(target, propName);
      if (hasInterceptors(this)) {
        var change = interceptChange(this, {
          object: this.proxy || target,
          name: propName,
          type: "add",
          newValue
        });
        if (!change)
          return;
        newValue = change.newValue;
      }
      var observable2 = new ObservableValue(newValue, enhancer, this.name + "." + stringifyKey(propName), false);
      this.values.set(propName, observable2);
      newValue = observable2.value;
      Object.defineProperty(target, propName, generateObservablePropConfig(propName));
      this.notifyPropertyAddition(propName, newValue);
    };
    ObservableObjectAdministration2.prototype.addComputedProp = function(propertyOwner, propName, options) {
      var target = this.target;
      options.name = options.name || this.name + "." + stringifyKey(propName);
      this.values.set(propName, new ComputedValue(options));
      if (propertyOwner === target || isPropertyConfigurable(propertyOwner, propName))
        Object.defineProperty(propertyOwner, propName, generateComputedPropConfig(propName));
    };
    ObservableObjectAdministration2.prototype.remove = function(key) {
      if (!this.values.has(key))
        return;
      var target = this.target;
      if (hasInterceptors(this)) {
        var change = interceptChange(this, {
          object: this.proxy || target,
          name: key,
          type: "remove"
        });
        if (!change)
          return;
      }
      try {
        startBatch();
        var notify = hasListeners(this);
        var notifySpy = isSpyEnabled();
        var oldObservable = this.values.get(key);
        var oldValue = oldObservable && oldObservable.get();
        oldObservable && oldObservable.set(void 0);
        this.keysAtom.reportChanged();
        this.values.delete(key);
        if (this.pendingKeys) {
          var entry = this.pendingKeys.get(key);
          if (entry)
            entry.set(false);
        }
        delete this.target[key];
        var change = notify || notifySpy ? {
          type: "remove",
          object: this.proxy || target,
          oldValue,
          name: key
        } : null;
        if (notifySpy && process.env.NODE_ENV !== "production")
          spyReportStart(__assign(__assign({}, change), { name: this.name, key }));
        if (notify)
          notifyListeners(this, change);
        if (notifySpy && process.env.NODE_ENV !== "production")
          spyReportEnd();
      } finally {
        endBatch();
      }
    };
    ObservableObjectAdministration2.prototype.illegalAccess = function(owner, propName) {
      console.warn("Property '" + propName + "' of '" + owner + "' was accessed through the prototype chain. Use 'decorate' instead to declare the prop or access it statically through it's owner");
    };
    ObservableObjectAdministration2.prototype.observe = function(callback, fireImmediately) {
      process.env.NODE_ENV !== "production" && invariant(fireImmediately !== true, "`observe` doesn't support the fire immediately property for observable objects.");
      return registerListener(this, callback);
    };
    ObservableObjectAdministration2.prototype.intercept = function(handler) {
      return registerInterceptor(this, handler);
    };
    ObservableObjectAdministration2.prototype.notifyPropertyAddition = function(key, newValue) {
      var notify = hasListeners(this);
      var notifySpy = isSpyEnabled();
      var change = notify || notifySpy ? {
        type: "add",
        object: this.proxy || this.target,
        name: key,
        newValue
      } : null;
      if (notifySpy && process.env.NODE_ENV !== "production")
        spyReportStart(__assign(__assign({}, change), { name: this.name, key }));
      if (notify)
        notifyListeners(this, change);
      if (notifySpy && process.env.NODE_ENV !== "production")
        spyReportEnd();
      if (this.pendingKeys) {
        var entry = this.pendingKeys.get(key);
        if (entry)
          entry.set(true);
      }
      this.keysAtom.reportChanged();
    };
    ObservableObjectAdministration2.prototype.getKeys = function() {
      var e_1, _a2;
      this.keysAtom.reportObserved();
      var res = [];
      try {
        for (var _b = __values(this.values), _c = _b.next(); !_c.done; _c = _b.next()) {
          var _d = __read(_c.value, 2), key = _d[0], value = _d[1];
          if (value instanceof ObservableValue)
            res.push(key);
        }
      } catch (e_1_1) {
        e_1 = { error: e_1_1 };
      } finally {
        try {
          if (_c && !_c.done && (_a2 = _b.return)) _a2.call(_b);
        } finally {
          if (e_1) throw e_1.error;
        }
      }
      return res;
    };
    return ObservableObjectAdministration2;
  })()
);
function asObservableObject(target, name, defaultEnhancer) {
  if (name === void 0) {
    name = "";
  }
  if (defaultEnhancer === void 0) {
    defaultEnhancer = deepEnhancer;
  }
  if (Object.prototype.hasOwnProperty.call(target, $mobx))
    return target[$mobx];
  process.env.NODE_ENV !== "production" && invariant(Object.isExtensible(target), "Cannot make the designated object observable; it is not extensible");
  if (!isPlainObject(target))
    name = (target.constructor.name || "ObservableObject") + "@" + getNextId();
  if (!name)
    name = "ObservableObject@" + getNextId();
  var adm = new ObservableObjectAdministration(target, /* @__PURE__ */ new Map(), stringifyKey(name), defaultEnhancer);
  addHiddenProp(target, $mobx, adm);
  return adm;
}
var observablePropertyConfigs = /* @__PURE__ */ Object.create(null);
var computedPropertyConfigs = /* @__PURE__ */ Object.create(null);
function generateObservablePropConfig(propName) {
  return observablePropertyConfigs[propName] || (observablePropertyConfigs[propName] = {
    configurable: true,
    enumerable: true,
    get: function() {
      return this[$mobx].read(propName);
    },
    set: function(v) {
      this[$mobx].write(propName, v);
    }
  });
}
function getAdministrationForComputedPropOwner(owner) {
  var adm = owner[$mobx];
  if (!adm) {
    initializeInstance(owner);
    return owner[$mobx];
  }
  return adm;
}
function generateComputedPropConfig(propName) {
  return computedPropertyConfigs[propName] || (computedPropertyConfigs[propName] = {
    configurable: globalState.computedConfigurable,
    enumerable: false,
    get: function() {
      return getAdministrationForComputedPropOwner(this).read(propName);
    },
    set: function(v) {
      getAdministrationForComputedPropOwner(this).write(propName, v);
    }
  });
}
var isObservableObjectAdministration = createInstanceofPredicate("ObservableObjectAdministration", ObservableObjectAdministration);
function isObservableObject(thing) {
  if (isObject(thing)) {
    initializeInstance(thing);
    return isObservableObjectAdministration(thing[$mobx]);
  }
  return false;
}
function getAtom(thing, property) {
  if (typeof thing === "object" && thing !== null) {
    if (isObservableArray(thing)) {
      if (property !== void 0)
        fail2(process.env.NODE_ENV !== "production" && "It is not possible to get index atoms from arrays");
      return thing[$mobx].atom;
    }
    if (isObservableSet(thing)) {
      return thing[$mobx];
    }
    if (isObservableMap(thing)) {
      var anyThing = thing;
      if (property === void 0)
        return anyThing._keysAtom;
      var observable2 = anyThing._data.get(property) || anyThing._hasMap.get(property);
      if (!observable2)
        fail2(process.env.NODE_ENV !== "production" && "the entry '" + property + "' does not exist in the observable map '" + getDebugName(thing) + "'");
      return observable2;
    }
    initializeInstance(thing);
    if (property && !thing[$mobx])
      thing[property];
    if (isObservableObject(thing)) {
      if (!property)
        return fail2(process.env.NODE_ENV !== "production" && "please specify a property");
      var observable2 = thing[$mobx].values.get(property);
      if (!observable2)
        fail2(process.env.NODE_ENV !== "production" && "no observable property '" + property + "' found on the observable object '" + getDebugName(thing) + "'");
      return observable2;
    }
    if (isAtom(thing) || isComputedValue(thing) || isReaction(thing)) {
      return thing;
    }
  } else if (typeof thing === "function") {
    if (isReaction(thing[$mobx])) {
      return thing[$mobx];
    }
  }
  return fail2(process.env.NODE_ENV !== "production" && "Cannot obtain atom from " + thing);
}
function getAdministration(thing, property) {
  if (!thing)
    fail2("Expecting some object");
  if (property !== void 0)
    return getAdministration(getAtom(thing, property));
  if (isAtom(thing) || isComputedValue(thing) || isReaction(thing))
    return thing;
  if (isObservableMap(thing) || isObservableSet(thing))
    return thing;
  initializeInstance(thing);
  if (thing[$mobx])
    return thing[$mobx];
  fail2(process.env.NODE_ENV !== "production" && "Cannot obtain administration from " + thing);
}
function getDebugName(thing, property) {
  var named;
  if (property !== void 0)
    named = getAtom(thing, property);
  else if (isObservableObject(thing) || isObservableMap(thing) || isObservableSet(thing))
    named = getAdministration(thing);
  else
    named = getAtom(thing);
  return named.name;
}
var toString = Object.prototype.toString;
function deepEqual(a, b, depth) {
  if (depth === void 0) {
    depth = -1;
  }
  return eq(a, b, depth);
}
function eq(a, b, depth, aStack, bStack) {
  if (a === b)
    return a !== 0 || 1 / a === 1 / b;
  if (a == null || b == null)
    return false;
  if (a !== a)
    return b !== b;
  var type = typeof a;
  if (type !== "function" && type !== "object" && typeof b != "object")
    return false;
  var className = toString.call(a);
  if (className !== toString.call(b))
    return false;
  switch (className) {
    // Strings, numbers, regular expressions, dates, and booleans are compared by value.
    case "[object RegExp]":
    // RegExps are coerced to strings for comparison (Note: '' + /a/i === '/a/i')
    case "[object String]":
      return "" + a === "" + b;
    case "[object Number]":
      if (+a !== +a)
        return +b !== +b;
      return +a === 0 ? 1 / +a === 1 / b : +a === +b;
    case "[object Date]":
    case "[object Boolean]":
      return +a === +b;
    case "[object Symbol]":
      return typeof Symbol !== "undefined" && Symbol.valueOf.call(a) === Symbol.valueOf.call(b);
    case "[object Map]":
    case "[object Set]":
      if (depth >= 0) {
        depth++;
      }
      break;
  }
  a = unwrap(a);
  b = unwrap(b);
  var areArrays = className === "[object Array]";
  if (!areArrays) {
    if (typeof a != "object" || typeof b != "object")
      return false;
    var aCtor = a.constructor, bCtor = b.constructor;
    if (aCtor !== bCtor && !(typeof aCtor === "function" && aCtor instanceof aCtor && typeof bCtor === "function" && bCtor instanceof bCtor) && ("constructor" in a && "constructor" in b)) {
      return false;
    }
  }
  if (depth === 0) {
    return false;
  } else if (depth < 0) {
    depth = -1;
  }
  aStack = aStack || [];
  bStack = bStack || [];
  var length = aStack.length;
  while (length--) {
    if (aStack[length] === a)
      return bStack[length] === b;
  }
  aStack.push(a);
  bStack.push(b);
  if (areArrays) {
    length = a.length;
    if (length !== b.length)
      return false;
    while (length--) {
      if (!eq(a[length], b[length], depth - 1, aStack, bStack))
        return false;
    }
  } else {
    var keys2 = Object.keys(a);
    var key = void 0;
    length = keys2.length;
    if (Object.keys(b).length !== length)
      return false;
    while (length--) {
      key = keys2[length];
      if (!(has$1(b, key) && eq(a[key], b[key], depth - 1, aStack, bStack)))
        return false;
    }
  }
  aStack.pop();
  bStack.pop();
  return true;
}
function unwrap(a) {
  if (isObservableArray(a))
    return a.slice();
  if (isES6Map(a) || isObservableMap(a))
    return Array.from(a.entries());
  if (isES6Set(a) || isObservableSet(a))
    return Array.from(a.entries());
  return a;
}
function has$1(a, key) {
  return Object.prototype.hasOwnProperty.call(a, key);
}
function makeIterable(iterator) {
  iterator[Symbol.iterator] = getSelf;
  return iterator;
}
function getSelf() {
  return this;
}
if (typeof Proxy === "undefined" || typeof Symbol === "undefined") {
  throw new Error("[mobx] MobX 5+ requires Proxy and Symbol objects. If your environment doesn't support Symbol or Proxy objects, please downgrade to MobX 4. For React Native Android, consider upgrading JSCore.");
}
try {
  process.env.NODE_ENV;
} catch (e) {
  g = getGlobal();
  if (typeof process === "undefined")
    g.process = {};
  g.process.env = {};
}
var g;
(function() {
  function testCodeMinification() {
  }
  if (testCodeMinification.name !== "testCodeMinification" && process.env.NODE_ENV !== "production" && typeof process !== "undefined" && process.env.IGNORE_MOBX_MINIFY_WARNING !== "true") {
    var varName = ["process", "env", "NODE_ENV"].join(".");
    console.warn("[mobx] you are running a minified build, but '" + varName + "' was not set to 'production' in your bundler. This results in an unnecessarily large and slow bundle");
  }
})();
if (typeof __MOBX_DEVTOOLS_GLOBAL_HOOK__ === "object") {
  __MOBX_DEVTOOLS_GLOBAL_HOOK__.injectMobx({
    spy,
    extras: {
      getDebugName
    },
    $mobx
  });
}

// editor/node_modules/mobx-state-tree/dist/mobx-state-tree.module.js
var livelinessChecking = "warn";
function getLivelinessChecking() {
  return livelinessChecking;
}
var Hook;
(function(Hook2) {
  Hook2["afterCreate"] = "afterCreate";
  Hook2["afterAttach"] = "afterAttach";
  Hook2["afterCreationFinalization"] = "afterCreationFinalization";
  Hook2["beforeDetach"] = "beforeDetach";
  Hook2["beforeDestroy"] = "beforeDestroy";
})(Hook || (Hook = {}));
var extendStatics2 = function(d, b) {
  extendStatics2 = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d2, b2) {
    d2.__proto__ = b2;
  } || function(d2, b2) {
    for (var p in b2) if (b2.hasOwnProperty(p)) d2[p] = b2[p];
  };
  return extendStatics2(d, b);
};
function __extends2(d, b) {
  extendStatics2(d, b);
  function __() {
    this.constructor = d;
  }
  d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
}
var __assign2 = function() {
  __assign2 = Object.assign || function __assign3(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
      s = arguments[i];
      for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
    }
    return t;
  };
  return __assign2.apply(this, arguments);
};
function __rest(s, e) {
  var t = {};
  for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
    t[p] = s[p];
  if (s != null && typeof Object.getOwnPropertySymbols === "function")
    for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
      if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
        t[p[i]] = s[p[i]];
    }
  return t;
}
function __decorate(decorators, target, key, desc) {
  var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
  if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
  else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
  return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function __values2(o) {
  var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
  if (m) return m.call(o);
  if (o && typeof o.length === "number") return {
    next: function() {
      if (o && i >= o.length) o = void 0;
      return { value: o && o[i++], done: !o };
    }
  };
  throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
}
function __read2(o, n) {
  var m = typeof Symbol === "function" && o[Symbol.iterator];
  if (!m) return o;
  var i = m.call(o), r, ar = [], e;
  try {
    while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
  } catch (error) {
    e = { error };
  } finally {
    try {
      if (r && !r.done && (m = i["return"])) m.call(i);
    } finally {
      if (e) throw e.error;
    }
  }
  return ar;
}
function __spread2() {
  for (var ar = [], i = 0; i < arguments.length; i++)
    ar = ar.concat(__read2(arguments[i]));
  return ar;
}
function getType(object) {
  assertIsStateTreeNode(object, 1);
  return getStateTreeNode(object).type;
}
function applyPatch(target, patch) {
  assertIsStateTreeNode(target, 1);
  assertArg(patch, function(p) {
    return typeof p === "object";
  }, "object or array", 2);
  getStateTreeNode(target).applyPatches(asArray(patch));
}
function getSnapshot(target, applyPostProcess) {
  if (applyPostProcess === void 0) {
    applyPostProcess = true;
  }
  assertIsStateTreeNode(target, 1);
  var node = getStateTreeNode(target);
  if (applyPostProcess)
    return node.snapshot;
  return freeze(node.type.getSnapshot(node, false));
}
function getRoot(target) {
  assertIsStateTreeNode(target, 1);
  return getStateTreeNode(target).root.storedValue;
}
function getPath(target) {
  assertIsStateTreeNode(target, 1);
  return getStateTreeNode(target).path;
}
function getIdentifier(target) {
  assertIsStateTreeNode(target, 1);
  return getStateTreeNode(target).identifier;
}
function detach(target) {
  assertIsStateTreeNode(target, 1);
  getStateTreeNode(target).detach();
  return target;
}
function destroy(target) {
  assertIsStateTreeNode(target, 1);
  var node = getStateTreeNode(target);
  if (node.isRoot)
    node.die();
  else
    node.parent.removeChild(node.subpath);
}
var BaseNode = (
  /** @class */
  (function() {
    function BaseNode2(type, parent, subpath, environment) {
      this.type = type;
      this.environment = environment;
      this._state = NodeLifeCycle.INITIALIZING;
      this.environment = environment;
      this.baseSetParent(parent, subpath);
    }
    Object.defineProperty(BaseNode2.prototype, "subpath", {
      get: function() {
        return this._subpath;
      },
      enumerable: false,
      configurable: true
    });
    Object.defineProperty(BaseNode2.prototype, "subpathUponDeath", {
      get: function() {
        return this._subpathUponDeath;
      },
      enumerable: false,
      configurable: true
    });
    Object.defineProperty(BaseNode2.prototype, "pathUponDeath", {
      get: function() {
        return this._pathUponDeath;
      },
      enumerable: false,
      configurable: true
    });
    Object.defineProperty(BaseNode2.prototype, "value", {
      get: function() {
        return this.type.getValue(this);
      },
      enumerable: false,
      configurable: true
    });
    Object.defineProperty(BaseNode2.prototype, "state", {
      get: function() {
        return this._state;
      },
      set: function(val) {
        var wasAlive = this.isAlive;
        this._state = val;
        var isAlive = this.isAlive;
        if (this.aliveAtom && wasAlive !== isAlive) {
          this.aliveAtom.reportChanged();
        }
      },
      enumerable: false,
      configurable: true
    });
    BaseNode2.prototype.fireInternalHook = function(name) {
      if (this._hookSubscribers) {
        this._hookSubscribers.emit(name, this, name);
      }
    };
    BaseNode2.prototype.registerHook = function(hook, hookHandler) {
      if (!this._hookSubscribers) {
        this._hookSubscribers = new EventHandlers();
      }
      return this._hookSubscribers.register(hook, hookHandler);
    };
    Object.defineProperty(BaseNode2.prototype, "parent", {
      get: function() {
        return this._parent;
      },
      enumerable: false,
      configurable: true
    });
    BaseNode2.prototype.baseSetParent = function(parent, subpath) {
      this._parent = parent;
      this._subpath = subpath;
      this._escapedSubpath = void 0;
      if (this.pathAtom) {
        this.pathAtom.reportChanged();
      }
    };
    Object.defineProperty(BaseNode2.prototype, "path", {
      /*
       * Returns (escaped) path representation as string
       */
      get: function() {
        return this.getEscapedPath(true);
      },
      enumerable: false,
      configurable: true
    });
    BaseNode2.prototype.getEscapedPath = function(reportObserved2) {
      if (reportObserved2) {
        if (!this.pathAtom) {
          this.pathAtom = createAtom("path");
        }
        this.pathAtom.reportObserved();
      }
      if (!this.parent)
        return "";
      if (this._escapedSubpath === void 0) {
        this._escapedSubpath = !this._subpath ? "" : escapeJsonPath(this._subpath);
      }
      return this.parent.getEscapedPath(reportObserved2) + "/" + this._escapedSubpath;
    };
    Object.defineProperty(BaseNode2.prototype, "isRoot", {
      get: function() {
        return this.parent === null;
      },
      enumerable: false,
      configurable: true
    });
    Object.defineProperty(BaseNode2.prototype, "isAlive", {
      get: function() {
        return this.state !== NodeLifeCycle.DEAD;
      },
      enumerable: false,
      configurable: true
    });
    Object.defineProperty(BaseNode2.prototype, "isDetaching", {
      get: function() {
        return this.state === NodeLifeCycle.DETACHING;
      },
      enumerable: false,
      configurable: true
    });
    Object.defineProperty(BaseNode2.prototype, "observableIsAlive", {
      get: function() {
        if (!this.aliveAtom) {
          this.aliveAtom = createAtom("alive");
        }
        this.aliveAtom.reportObserved();
        return this.isAlive;
      },
      enumerable: false,
      configurable: true
    });
    BaseNode2.prototype.baseFinalizeCreation = function(whenFinalized) {
      if (devMode()) {
        if (!this.isAlive) {
          throw fail("assertion failed: cannot finalize the creation of a node that is already dead");
        }
      }
      if (this.state === NodeLifeCycle.CREATED) {
        if (this.parent) {
          if (this.parent.state !== NodeLifeCycle.FINALIZED) {
            return;
          }
          this.fireHook(Hook.afterAttach);
        }
        this.state = NodeLifeCycle.FINALIZED;
        if (whenFinalized) {
          whenFinalized();
        }
      }
    };
    BaseNode2.prototype.baseFinalizeDeath = function() {
      if (this._hookSubscribers) {
        this._hookSubscribers.clearAll();
      }
      this._subpathUponDeath = this._subpath;
      this._pathUponDeath = this.getEscapedPath(false);
      this.baseSetParent(null, "");
      this.state = NodeLifeCycle.DEAD;
    };
    BaseNode2.prototype.baseAboutToDie = function() {
      this.fireHook(Hook.beforeDestroy);
    };
    return BaseNode2;
  })()
);
var ScalarNode = (
  /** @class */
  (function(_super) {
    __extends2(ScalarNode2, _super);
    function ScalarNode2(simpleType, parent, subpath, environment, initialSnapshot) {
      var _this = _super.call(this, simpleType, parent, subpath, environment) || this;
      try {
        _this.storedValue = simpleType.createNewInstance(initialSnapshot);
      } catch (e) {
        _this.state = NodeLifeCycle.DEAD;
        throw e;
      }
      _this.state = NodeLifeCycle.CREATED;
      _this.finalizeCreation();
      return _this;
    }
    Object.defineProperty(ScalarNode2.prototype, "root", {
      get: function() {
        if (!this.parent)
          throw fail$1("This scalar node is not part of a tree");
        return this.parent.root;
      },
      enumerable: false,
      configurable: true
    });
    ScalarNode2.prototype.setParent = function(newParent, subpath) {
      var parentChanged = this.parent !== newParent;
      var subpathChanged = this.subpath !== subpath;
      if (!parentChanged && !subpathChanged) {
        return;
      }
      if (devMode()) {
        if (!subpath) {
          throw fail$1("assertion failed: subpath expected");
        }
        if (!newParent) {
          throw fail$1("assertion failed: parent expected");
        }
        if (parentChanged) {
          throw fail$1("assertion failed: scalar nodes cannot change their parent");
        }
      }
      this.environment = void 0;
      this.baseSetParent(this.parent, subpath);
    };
    Object.defineProperty(ScalarNode2.prototype, "snapshot", {
      get: function() {
        return freeze(this.getSnapshot());
      },
      enumerable: false,
      configurable: true
    });
    ScalarNode2.prototype.getSnapshot = function() {
      return this.type.getSnapshot(this);
    };
    ScalarNode2.prototype.toString = function() {
      var path = (this.isAlive ? this.path : this.pathUponDeath) || "<root>";
      return this.type.name + "@" + path + (this.isAlive ? "" : " [dead]");
    };
    ScalarNode2.prototype.die = function() {
      if (!this.isAlive || this.state === NodeLifeCycle.DETACHING)
        return;
      this.aboutToDie();
      this.finalizeDeath();
    };
    ScalarNode2.prototype.finalizeCreation = function() {
      this.baseFinalizeCreation();
    };
    ScalarNode2.prototype.aboutToDie = function() {
      this.baseAboutToDie();
    };
    ScalarNode2.prototype.finalizeDeath = function() {
      this.baseFinalizeDeath();
    };
    ScalarNode2.prototype.fireHook = function(name) {
      this.fireInternalHook(name);
    };
    __decorate([
      action
    ], ScalarNode2.prototype, "die", null);
    return ScalarNode2;
  })(BaseNode)
);
var nextNodeId = 1;
var snapshotReactionOptions = {
  onError: function(e) {
    throw e;
  }
};
var ObjectNode = (
  /** @class */
  (function(_super) {
    __extends2(ObjectNode2, _super);
    function ObjectNode2(complexType, parent, subpath, environment, initialValue) {
      var _this = _super.call(this, complexType, parent, subpath, environment) || this;
      _this.nodeId = ++nextNodeId;
      _this.isProtectionEnabled = true;
      _this._autoUnbox = true;
      _this._isRunningAction = false;
      _this._hasSnapshotReaction = false;
      _this._observableInstanceState = 0;
      _this._cachedInitialSnapshotCreated = false;
      _this.unbox = _this.unbox.bind(_this);
      _this._initialSnapshot = freeze(initialValue);
      _this.identifierAttribute = complexType.identifierAttribute;
      if (!parent) {
        _this.identifierCache = new IdentifierCache();
      }
      _this._childNodes = complexType.initializeChildNodes(_this, _this._initialSnapshot);
      _this.identifier = null;
      _this.unnormalizedIdentifier = null;
      if (_this.identifierAttribute && _this._initialSnapshot) {
        var id = _this._initialSnapshot[_this.identifierAttribute];
        if (id === void 0) {
          var childNode = _this._childNodes[_this.identifierAttribute];
          if (childNode) {
            id = childNode.value;
          }
        }
        if (typeof id !== "string" && typeof id !== "number") {
          throw fail$1("Instance identifier '" + _this.identifierAttribute + "' for type '" + _this.type.name + "' must be a string or a number");
        }
        _this.identifier = normalizeIdentifier(id);
        _this.unnormalizedIdentifier = id;
      }
      if (!parent) {
        _this.identifierCache.addNodeToCache(_this);
      } else {
        parent.root.identifierCache.addNodeToCache(_this);
      }
      return _this;
    }
    ObjectNode2.prototype.applyPatches = function(patches) {
      this.createObservableInstanceIfNeeded();
      this._applyPatches(patches);
    };
    ObjectNode2.prototype.applySnapshot = function(snapshot) {
      this.createObservableInstanceIfNeeded();
      this._applySnapshot(snapshot);
    };
    ObjectNode2.prototype.createObservableInstanceIfNeeded = function() {
      if (this._observableInstanceState === 0) {
        this.createObservableInstance();
      }
    };
    ObjectNode2.prototype.createObservableInstance = function() {
      var e_1, _a2;
      if (devMode()) {
        if (this.state !== NodeLifeCycle.INITIALIZING) {
          throw fail$1("assertion failed: the creation of the observable instance must be done on the initializing phase");
        }
      }
      this._observableInstanceState = 1;
      var parentChain = [];
      var parent = this.parent;
      while (parent && parent._observableInstanceState === 0) {
        parentChain.unshift(parent);
        parent = parent.parent;
      }
      try {
        for (var parentChain_1 = __values2(parentChain), parentChain_1_1 = parentChain_1.next(); !parentChain_1_1.done; parentChain_1_1 = parentChain_1.next()) {
          var p = parentChain_1_1.value;
          p.createObservableInstanceIfNeeded();
        }
      } catch (e_1_1) {
        e_1 = { error: e_1_1 };
      } finally {
        try {
          if (parentChain_1_1 && !parentChain_1_1.done && (_a2 = parentChain_1.return)) _a2.call(parentChain_1);
        } finally {
          if (e_1) throw e_1.error;
        }
      }
      var type = this.type;
      try {
        this.storedValue = type.createNewInstance(this._childNodes);
        this.preboot();
        this._isRunningAction = true;
        type.finalizeNewInstance(this, this.storedValue);
      } catch (e) {
        this.state = NodeLifeCycle.DEAD;
        throw e;
      } finally {
        this._isRunningAction = false;
      }
      this._observableInstanceState = 2;
      invalidateComputed(this, "snapshot");
      if (this.isRoot)
        this._addSnapshotReaction();
      this._childNodes = EMPTY_OBJECT2;
      this.state = NodeLifeCycle.CREATED;
      this.fireHook(Hook.afterCreate);
      this.finalizeCreation();
    };
    Object.defineProperty(ObjectNode2.prototype, "root", {
      get: function() {
        var parent = this.parent;
        return parent ? parent.root : this;
      },
      enumerable: false,
      configurable: true
    });
    ObjectNode2.prototype.clearParent = function() {
      if (!this.parent)
        return;
      this.fireHook(Hook.beforeDetach);
      var previousState = this.state;
      this.state = NodeLifeCycle.DETACHING;
      var root = this.root;
      var newEnv = root.environment;
      var newIdCache = root.identifierCache.splitCache(this);
      try {
        this.parent.removeChild(this.subpath);
        this.baseSetParent(null, "");
        this.environment = newEnv;
        this.identifierCache = newIdCache;
      } finally {
        this.state = previousState;
      }
    };
    ObjectNode2.prototype.setParent = function(newParent, subpath) {
      var parentChanged = newParent !== this.parent;
      var subpathChanged = subpath !== this.subpath;
      if (!parentChanged && !subpathChanged) {
        return;
      }
      if (devMode()) {
        if (!subpath) {
          throw fail$1("assertion failed: subpath expected");
        }
        if (!newParent) {
          throw fail$1("assertion failed: new parent expected");
        }
        if (this.parent && parentChanged) {
          throw fail$1("A node cannot exists twice in the state tree. Failed to add " + this + " to path '" + newParent.path + "/" + subpath + "'.");
        }
        if (!this.parent && newParent.root === this) {
          throw fail$1("A state tree is not allowed to contain itself. Cannot assign " + this + " to path '" + newParent.path + "/" + subpath + "'");
        }
        if (!this.parent && !!this.environment && this.environment !== newParent.root.environment) {
          throw fail$1("A state tree cannot be made part of another state tree as long as their environments are different.");
        }
      }
      if (parentChanged) {
        this.environment = void 0;
        newParent.root.identifierCache.mergeCache(this);
        this.baseSetParent(newParent, subpath);
        this.fireHook(Hook.afterAttach);
      } else if (subpathChanged) {
        this.baseSetParent(this.parent, subpath);
      }
    };
    ObjectNode2.prototype.fireHook = function(name) {
      var _this = this;
      this.fireInternalHook(name);
      var fn = this.storedValue && typeof this.storedValue === "object" && this.storedValue[name];
      if (typeof fn === "function") {
        if (allowStateChangesInsideComputed) {
          allowStateChangesInsideComputed(function() {
            fn.apply(_this.storedValue);
          });
        } else {
          fn.apply(this.storedValue);
        }
      }
    };
    Object.defineProperty(ObjectNode2.prototype, "snapshot", {
      // advantage of using computed for a snapshot is that nicely respects transactions etc.
      get: function() {
        return freeze(this.getSnapshot());
      },
      enumerable: false,
      configurable: true
    });
    ObjectNode2.prototype.getSnapshot = function() {
      if (!this.isAlive)
        return this._snapshotUponDeath;
      return this._observableInstanceState === 2 ? this._getActualSnapshot() : this._getCachedInitialSnapshot();
    };
    ObjectNode2.prototype._getActualSnapshot = function() {
      return this.type.getSnapshot(this);
    };
    ObjectNode2.prototype._getCachedInitialSnapshot = function() {
      if (!this._cachedInitialSnapshotCreated) {
        var type = this.type;
        var childNodes = this._childNodes;
        var snapshot = this._initialSnapshot;
        this._cachedInitialSnapshot = type.processInitialSnapshot(childNodes, snapshot);
        this._cachedInitialSnapshotCreated = true;
      }
      return this._cachedInitialSnapshot;
    };
    ObjectNode2.prototype.isRunningAction = function() {
      if (this._isRunningAction)
        return true;
      if (this.isRoot)
        return false;
      return this.parent.isRunningAction();
    };
    ObjectNode2.prototype.assertAlive = function(context) {
      var livelinessChecking2 = getLivelinessChecking();
      if (!this.isAlive && livelinessChecking2 !== "ignore") {
        var error = this._getAssertAliveError(context);
        switch (livelinessChecking2) {
          case "error":
            throw fail$1(error);
          case "warn":
            warnError(error);
        }
      }
    };
    ObjectNode2.prototype._getAssertAliveError = function(context) {
      var escapedPath = this.getEscapedPath(false) || this.pathUponDeath || "";
      var subpath = context.subpath && escapeJsonPath(context.subpath) || "";
      var actionContext = context.actionContext || getCurrentActionContext();
      if (actionContext && actionContext.type !== "action" && actionContext.parentActionEvent) {
        actionContext = actionContext.parentActionEvent;
      }
      var actionFullPath = "";
      if (actionContext && actionContext.name != null) {
        var actionPath = actionContext && actionContext.context && getPath(actionContext.context) || escapedPath;
        actionFullPath = actionPath + "." + actionContext.name + "()";
      }
      return "You are trying to read or write to an object that is no longer part of a state tree. (Object type: '" + this.type.name + "', Path upon death: '" + escapedPath + "', Subpath: '" + subpath + "', Action: '" + actionFullPath + "'). Either detach nodes first, or don't use objects after removing / replacing them in the tree.";
    };
    ObjectNode2.prototype.getChildNode = function(subpath) {
      this.assertAlive({
        subpath
      });
      this._autoUnbox = false;
      try {
        return this._observableInstanceState === 2 ? this.type.getChildNode(this, subpath) : this._childNodes[subpath];
      } finally {
        this._autoUnbox = true;
      }
    };
    ObjectNode2.prototype.getChildren = function() {
      this.assertAlive(EMPTY_OBJECT2);
      this._autoUnbox = false;
      try {
        return this._observableInstanceState === 2 ? this.type.getChildren(this) : convertChildNodesToArray(this._childNodes);
      } finally {
        this._autoUnbox = true;
      }
    };
    ObjectNode2.prototype.getChildType = function(propertyName) {
      return this.type.getChildType(propertyName);
    };
    Object.defineProperty(ObjectNode2.prototype, "isProtected", {
      get: function() {
        return this.root.isProtectionEnabled;
      },
      enumerable: false,
      configurable: true
    });
    ObjectNode2.prototype.assertWritable = function(context) {
      this.assertAlive(context);
      if (!this.isRunningAction() && this.isProtected) {
        throw fail$1("Cannot modify '" + this + "', the object is protected and can only be modified by using an action.");
      }
    };
    ObjectNode2.prototype.removeChild = function(subpath) {
      this.type.removeChild(this, subpath);
    };
    ObjectNode2.prototype.unbox = function(childNode) {
      if (!childNode)
        return childNode;
      this.assertAlive({
        subpath: childNode.subpath || childNode.subpathUponDeath
      });
      return this._autoUnbox ? childNode.value : childNode;
    };
    ObjectNode2.prototype.toString = function() {
      var path = (this.isAlive ? this.path : this.pathUponDeath) || "<root>";
      var identifier2 = this.identifier ? "(id: " + this.identifier + ")" : "";
      return this.type.name + "@" + path + identifier2 + (this.isAlive ? "" : " [dead]");
    };
    ObjectNode2.prototype.finalizeCreation = function() {
      var _this = this;
      this.baseFinalizeCreation(function() {
        var e_2, _a2;
        try {
          for (var _b = __values2(_this.getChildren()), _c = _b.next(); !_c.done; _c = _b.next()) {
            var child = _c.value;
            child.finalizeCreation();
          }
        } catch (e_2_1) {
          e_2 = { error: e_2_1 };
        } finally {
          try {
            if (_c && !_c.done && (_a2 = _b.return)) _a2.call(_b);
          } finally {
            if (e_2) throw e_2.error;
          }
        }
        _this.fireInternalHook(Hook.afterCreationFinalization);
      });
    };
    ObjectNode2.prototype.detach = function() {
      if (!this.isAlive)
        throw fail$1("Error while detaching, node is not alive.");
      this.clearParent();
    };
    ObjectNode2.prototype.preboot = function() {
      var self2 = this;
      this._applyPatches = createActionInvoker(this.storedValue, "@APPLY_PATCHES", function(patches) {
        patches.forEach(function(patch) {
          var parts = splitJsonPath(patch.path);
          var node = resolveNodeByPathParts(self2, parts.slice(0, -1));
          node.applyPatchLocally(parts[parts.length - 1], patch);
        });
      });
      this._applySnapshot = createActionInvoker(this.storedValue, "@APPLY_SNAPSHOT", function(snapshot) {
        if (snapshot === self2.snapshot)
          return;
        return self2.type.applySnapshot(self2, snapshot);
      });
      addHiddenFinalProp2(this.storedValue, "$treenode", this);
      addHiddenFinalProp2(this.storedValue, "toJSON", toJSON);
    };
    ObjectNode2.prototype.die = function() {
      if (!this.isAlive || this.state === NodeLifeCycle.DETACHING)
        return;
      this.aboutToDie();
      this.finalizeDeath();
    };
    ObjectNode2.prototype.aboutToDie = function() {
      if (this._observableInstanceState === 0) {
        return;
      }
      this.getChildren().forEach(function(node) {
        node.aboutToDie();
      });
      this.baseAboutToDie();
      this._internalEventsEmit(
        "dispose"
        /* Dispose */
      );
      this._internalEventsClear(
        "dispose"
        /* Dispose */
      );
    };
    ObjectNode2.prototype.finalizeDeath = function() {
      this.getChildren().forEach(function(node) {
        node.finalizeDeath();
      });
      this.root.identifierCache.notifyDied(this);
      var snapshot = this.snapshot;
      this._snapshotUponDeath = snapshot;
      this._internalEventsClearAll();
      this.baseFinalizeDeath();
    };
    ObjectNode2.prototype.onSnapshot = function(onChange) {
      this._addSnapshotReaction();
      return this._internalEventsRegister("snapshot", onChange);
    };
    ObjectNode2.prototype.emitSnapshot = function(snapshot) {
      this._internalEventsEmit("snapshot", snapshot);
    };
    ObjectNode2.prototype.onPatch = function(handler) {
      return this._internalEventsRegister("patch", handler);
    };
    ObjectNode2.prototype.emitPatch = function(basePatch, source) {
      if (this._internalEventsHasSubscribers(
        "patch"
        /* Patch */
      )) {
        var localizedPatch = extend({}, basePatch, {
          path: source.path.substr(this.path.length) + "/" + basePatch.path
          // calculate the relative path of the patch
        });
        var _a2 = __read2(splitPatch(localizedPatch), 2), patch = _a2[0], reversePatch = _a2[1];
        this._internalEventsEmit("patch", patch, reversePatch);
      }
      if (this.parent)
        this.parent.emitPatch(basePatch, source);
    };
    ObjectNode2.prototype.hasDisposer = function(disposer) {
      return this._internalEventsHas("dispose", disposer);
    };
    ObjectNode2.prototype.addDisposer = function(disposer) {
      if (!this.hasDisposer(disposer)) {
        this._internalEventsRegister("dispose", disposer, true);
        return;
      }
      throw fail$1("cannot add a disposer when it is already registered for execution");
    };
    ObjectNode2.prototype.removeDisposer = function(disposer) {
      if (!this._internalEventsHas("dispose", disposer)) {
        throw fail$1("cannot remove a disposer which was never registered for execution");
      }
      this._internalEventsUnregister("dispose", disposer);
    };
    ObjectNode2.prototype.removeMiddleware = function(middleware) {
      if (this.middlewares) {
        var index = this.middlewares.indexOf(middleware);
        if (index >= 0) {
          this.middlewares.splice(index, 1);
        }
      }
    };
    ObjectNode2.prototype.addMiddleWare = function(handler, includeHooks) {
      var _this = this;
      if (includeHooks === void 0) {
        includeHooks = true;
      }
      var middleware = { handler, includeHooks };
      if (!this.middlewares)
        this.middlewares = [middleware];
      else
        this.middlewares.push(middleware);
      return function() {
        _this.removeMiddleware(middleware);
      };
    };
    ObjectNode2.prototype.applyPatchLocally = function(subpath, patch) {
      this.assertWritable({
        subpath
      });
      this.createObservableInstanceIfNeeded();
      this.type.applyPatchLocally(this, subpath, patch);
    };
    ObjectNode2.prototype._addSnapshotReaction = function() {
      var _this = this;
      if (!this._hasSnapshotReaction) {
        var snapshotDisposer = reaction(function() {
          return _this.snapshot;
        }, function(snapshot) {
          return _this.emitSnapshot(snapshot);
        }, snapshotReactionOptions);
        this.addDisposer(snapshotDisposer);
        this._hasSnapshotReaction = true;
      }
    };
    ObjectNode2.prototype._internalEventsHasSubscribers = function(event) {
      return !!this._internalEvents && this._internalEvents.hasSubscribers(event);
    };
    ObjectNode2.prototype._internalEventsRegister = function(event, eventHandler, atTheBeginning) {
      if (atTheBeginning === void 0) {
        atTheBeginning = false;
      }
      if (!this._internalEvents) {
        this._internalEvents = new EventHandlers();
      }
      return this._internalEvents.register(event, eventHandler, atTheBeginning);
    };
    ObjectNode2.prototype._internalEventsHas = function(event, eventHandler) {
      return !!this._internalEvents && this._internalEvents.has(event, eventHandler);
    };
    ObjectNode2.prototype._internalEventsUnregister = function(event, eventHandler) {
      if (this._internalEvents) {
        this._internalEvents.unregister(event, eventHandler);
      }
    };
    ObjectNode2.prototype._internalEventsEmit = function(event) {
      var _a2;
      var args = [];
      for (var _i = 1; _i < arguments.length; _i++) {
        args[_i - 1] = arguments[_i];
      }
      if (this._internalEvents) {
        (_a2 = this._internalEvents).emit.apply(_a2, __spread2([event], args));
      }
    };
    ObjectNode2.prototype._internalEventsClear = function(event) {
      if (this._internalEvents) {
        this._internalEvents.clear(event);
      }
    };
    ObjectNode2.prototype._internalEventsClearAll = function() {
      if (this._internalEvents) {
        this._internalEvents.clearAll();
      }
    };
    __decorate([
      action
    ], ObjectNode2.prototype, "createObservableInstance", null);
    __decorate([
      computed
    ], ObjectNode2.prototype, "snapshot", null);
    __decorate([
      action
    ], ObjectNode2.prototype, "detach", null);
    __decorate([
      action
    ], ObjectNode2.prototype, "die", null);
    return ObjectNode2;
  })(BaseNode)
);
var TypeFlags;
(function(TypeFlags2) {
  TypeFlags2[TypeFlags2["String"] = 1] = "String";
  TypeFlags2[TypeFlags2["Number"] = 2] = "Number";
  TypeFlags2[TypeFlags2["Boolean"] = 4] = "Boolean";
  TypeFlags2[TypeFlags2["Date"] = 8] = "Date";
  TypeFlags2[TypeFlags2["Literal"] = 16] = "Literal";
  TypeFlags2[TypeFlags2["Array"] = 32] = "Array";
  TypeFlags2[TypeFlags2["Map"] = 64] = "Map";
  TypeFlags2[TypeFlags2["Object"] = 128] = "Object";
  TypeFlags2[TypeFlags2["Frozen"] = 256] = "Frozen";
  TypeFlags2[TypeFlags2["Optional"] = 512] = "Optional";
  TypeFlags2[TypeFlags2["Reference"] = 1024] = "Reference";
  TypeFlags2[TypeFlags2["Identifier"] = 2048] = "Identifier";
  TypeFlags2[TypeFlags2["Late"] = 4096] = "Late";
  TypeFlags2[TypeFlags2["Refinement"] = 8192] = "Refinement";
  TypeFlags2[TypeFlags2["Union"] = 16384] = "Union";
  TypeFlags2[TypeFlags2["Null"] = 32768] = "Null";
  TypeFlags2[TypeFlags2["Undefined"] = 65536] = "Undefined";
  TypeFlags2[TypeFlags2["Integer"] = 131072] = "Integer";
  TypeFlags2[TypeFlags2["Custom"] = 262144] = "Custom";
  TypeFlags2[TypeFlags2["SnapshotProcessor"] = 524288] = "SnapshotProcessor";
})(TypeFlags || (TypeFlags = {}));
var cannotDetermineSubtype = "cannotDetermine";
var BaseType = (
  /** @class */
  (function() {
    function BaseType2(name) {
      this.isType = true;
      this.name = name;
    }
    BaseType2.prototype.create = function(snapshot, environment) {
      typecheckInternal(this, snapshot);
      return this.instantiate(null, "", environment, snapshot).value;
    };
    BaseType2.prototype.getSnapshot = function(node, applyPostProcess) {
      throw fail$1("unimplemented method");
    };
    BaseType2.prototype.isAssignableFrom = function(type) {
      return type === this;
    };
    BaseType2.prototype.validate = function(value, context) {
      var node = getStateTreeNodeSafe(value);
      if (node) {
        var valueType = getType(value);
        return this.isAssignableFrom(valueType) ? typeCheckSuccess() : typeCheckFailure(context, value);
      }
      return this.isValidSnapshot(value, context);
    };
    BaseType2.prototype.is = function(thing) {
      return this.validate(thing, [{ path: "", type: this }]).length === 0;
    };
    Object.defineProperty(BaseType2.prototype, "Type", {
      get: function() {
        throw fail$1("Factory.Type should not be actually called. It is just a Type signature that can be used at compile time with Typescript, by using `typeof type.Type`");
      },
      enumerable: false,
      configurable: true
    });
    Object.defineProperty(BaseType2.prototype, "TypeWithoutSTN", {
      get: function() {
        throw fail$1("Factory.TypeWithoutSTN should not be actually called. It is just a Type signature that can be used at compile time with Typescript, by using `typeof type.TypeWithoutSTN`");
      },
      enumerable: false,
      configurable: true
    });
    Object.defineProperty(BaseType2.prototype, "SnapshotType", {
      get: function() {
        throw fail$1("Factory.SnapshotType should not be actually called. It is just a Type signature that can be used at compile time with Typescript, by using `typeof type.SnapshotType`");
      },
      enumerable: false,
      configurable: true
    });
    Object.defineProperty(BaseType2.prototype, "CreationType", {
      get: function() {
        throw fail$1("Factory.CreationType should not be actually called. It is just a Type signature that can be used at compile time with Typescript, by using `typeof type.CreationType`");
      },
      enumerable: false,
      configurable: true
    });
    __decorate([
      action
    ], BaseType2.prototype, "create", null);
    return BaseType2;
  })()
);
var ComplexType = (
  /** @class */
  (function(_super) {
    __extends2(ComplexType2, _super);
    function ComplexType2(name) {
      return _super.call(this, name) || this;
    }
    ComplexType2.prototype.create = function(snapshot, environment) {
      if (snapshot === void 0) {
        snapshot = this.getDefaultSnapshot();
      }
      return _super.prototype.create.call(this, snapshot, environment);
    };
    ComplexType2.prototype.getValue = function(node) {
      node.createObservableInstanceIfNeeded();
      return node.storedValue;
    };
    ComplexType2.prototype.tryToReconcileNode = function(current, newValue) {
      if (current.isDetaching)
        return false;
      if (current.snapshot === newValue) {
        return true;
      }
      if (isStateTreeNode(newValue) && getStateTreeNode(newValue) === current) {
        return true;
      }
      if (current.type === this && isMutable(newValue) && !isStateTreeNode(newValue) && (!current.identifierAttribute || current.identifier === normalizeIdentifier(newValue[current.identifierAttribute]))) {
        current.applySnapshot(newValue);
        return true;
      }
      return false;
    };
    ComplexType2.prototype.reconcile = function(current, newValue, parent, subpath) {
      var nodeReconciled = this.tryToReconcileNode(current, newValue);
      if (nodeReconciled) {
        current.setParent(parent, subpath);
        return current;
      }
      current.die();
      if (isStateTreeNode(newValue) && this.isAssignableFrom(getType(newValue))) {
        var newNode = getStateTreeNode(newValue);
        newNode.setParent(parent, subpath);
        return newNode;
      }
      return this.instantiate(parent, subpath, void 0, newValue);
    };
    ComplexType2.prototype.getSubTypes = function() {
      return null;
    };
    __decorate([
      action
    ], ComplexType2.prototype, "create", null);
    return ComplexType2;
  })(BaseType)
);
var SimpleType = (
  /** @class */
  (function(_super) {
    __extends2(SimpleType2, _super);
    function SimpleType2() {
      return _super !== null && _super.apply(this, arguments) || this;
    }
    SimpleType2.prototype.createNewInstance = function(snapshot) {
      return snapshot;
    };
    SimpleType2.prototype.getValue = function(node) {
      return node.storedValue;
    };
    SimpleType2.prototype.getSnapshot = function(node) {
      return node.storedValue;
    };
    SimpleType2.prototype.reconcile = function(current, newValue, parent, subpath) {
      if (!current.isDetaching && current.type === this && current.storedValue === newValue) {
        return current;
      }
      var res = this.instantiate(parent, subpath, void 0, newValue);
      current.die();
      return res;
    };
    SimpleType2.prototype.getSubTypes = function() {
      return null;
    };
    return SimpleType2;
  })(BaseType)
);
function isType(value) {
  return typeof value === "object" && value && value.isType === true;
}
function assertIsType(type, argNumber) {
  assertArg(type, isType, "mobx-state-tree type", argNumber);
}
var RunningAction = (
  /** @class */
  (function() {
    function RunningAction2(hooks, call) {
      this.hooks = hooks;
      this.call = call;
      this.flowsPending = 0;
      this.running = true;
      if (hooks) {
        hooks.onStart(call);
      }
    }
    RunningAction2.prototype.finish = function(error) {
      if (this.running) {
        this.running = false;
        if (this.hooks) {
          this.hooks.onFinish(this.call, error);
        }
      }
    };
    RunningAction2.prototype.incFlowsPending = function() {
      this.flowsPending++;
    };
    RunningAction2.prototype.decFlowsPending = function() {
      this.flowsPending--;
    };
    Object.defineProperty(RunningAction2.prototype, "hasFlowsPending", {
      get: function() {
        return this.flowsPending > 0;
      },
      enumerable: false,
      configurable: true
    });
    return RunningAction2;
  })()
);
var nextActionId2 = 1;
var currentActionContext;
function getCurrentActionContext() {
  return currentActionContext;
}
function getNextActionId() {
  return nextActionId2++;
}
function runWithActionContext(context, fn) {
  var node = getStateTreeNode(context.context);
  if (context.type === "action") {
    node.assertAlive({
      actionContext: context
    });
  }
  var baseIsRunningAction = node._isRunningAction;
  node._isRunningAction = true;
  var previousContext = currentActionContext;
  currentActionContext = context;
  try {
    return runMiddleWares(node, context, fn);
  } finally {
    currentActionContext = previousContext;
    node._isRunningAction = baseIsRunningAction;
  }
}
function getParentActionContext(parentContext) {
  if (!parentContext)
    return void 0;
  if (parentContext.type === "action")
    return parentContext;
  return parentContext.parentActionEvent;
}
function createActionInvoker(target, name, fn) {
  var res = function() {
    var id = getNextActionId();
    var parentContext = currentActionContext;
    var parentActionContext = getParentActionContext(parentContext);
    return runWithActionContext({
      type: "action",
      name,
      id,
      args: argsToArray(arguments),
      context: target,
      tree: getRoot(target),
      rootId: parentContext ? parentContext.rootId : id,
      parentId: parentContext ? parentContext.id : 0,
      allParentIds: parentContext ? __spread2(parentContext.allParentIds, [parentContext.id]) : [],
      parentEvent: parentContext,
      parentActionEvent: parentActionContext
    }, fn);
  };
  res._isMSTAction = true;
  return res;
}
var CollectedMiddlewares = (
  /** @class */
  (function() {
    function CollectedMiddlewares2(node, fn) {
      this.arrayIndex = 0;
      this.inArrayIndex = 0;
      this.middlewares = [];
      if (fn.$mst_middleware) {
        this.middlewares.push(fn.$mst_middleware);
      }
      var n = node;
      while (n) {
        if (n.middlewares)
          this.middlewares.push(n.middlewares);
        n = n.parent;
      }
    }
    Object.defineProperty(CollectedMiddlewares2.prototype, "isEmpty", {
      get: function() {
        return this.middlewares.length <= 0;
      },
      enumerable: false,
      configurable: true
    });
    CollectedMiddlewares2.prototype.getNextMiddleware = function() {
      var array = this.middlewares[this.arrayIndex];
      if (!array)
        return void 0;
      var item = array[this.inArrayIndex++];
      if (!item) {
        this.arrayIndex++;
        this.inArrayIndex = 0;
        return this.getNextMiddleware();
      }
      return item;
    };
    return CollectedMiddlewares2;
  })()
);
function runMiddleWares(node, baseCall, originalFn) {
  var middlewares = new CollectedMiddlewares(node, originalFn);
  if (middlewares.isEmpty)
    return action(originalFn).apply(null, baseCall.args);
  var result = null;
  function runNextMiddleware(call) {
    var middleware = middlewares.getNextMiddleware();
    var handler = middleware && middleware.handler;
    if (!handler) {
      return action(originalFn).apply(null, call.args);
    }
    if (!middleware.includeHooks && Hook[call.name]) {
      return runNextMiddleware(call);
    }
    var nextInvoked = false;
    function next(call2, callback) {
      nextInvoked = true;
      result = runNextMiddleware(call2);
      if (callback) {
        result = callback(result);
      }
    }
    var abortInvoked = false;
    function abort(value) {
      abortInvoked = true;
      result = value;
    }
    handler(call, next, abort);
    if (devMode()) {
      if (!nextInvoked && !abortInvoked) {
        var node2 = getStateTreeNode(call.tree);
        throw fail$1("Neither the next() nor the abort() callback within the middleware " + handler.name + ' for the action: "' + call.name + '" on the node: ' + node2.type.name + " was invoked.");
      } else if (nextInvoked && abortInvoked) {
        var node2 = getStateTreeNode(call.tree);
        throw fail$1("The next() and abort() callback within the middleware " + handler.name + ' for the action: "' + call.name + '" on the node: ' + node2.type.name + " were invoked.");
      }
    }
    return result;
  }
  return runNextMiddleware(baseCall);
}
function safeStringify(value) {
  try {
    return JSON.stringify(value);
  } catch (e) {
    return "<Unserializable: " + e + ">";
  }
}
function prettyPrintValue(value) {
  return typeof value === "function" ? "<function" + (value.name ? " " + value.name : "") + ">" : isStateTreeNode(value) ? "<" + value + ">" : "`" + safeStringify(value) + "`";
}
function shortenPrintValue(valueInString) {
  return valueInString.length < 280 ? valueInString : valueInString.substring(0, 272) + "......" + valueInString.substring(valueInString.length - 8);
}
function toErrorString(error) {
  var value = error.value;
  var type = error.context[error.context.length - 1].type;
  var fullPath = error.context.map(function(_a2) {
    var path = _a2.path;
    return path;
  }).filter(function(path) {
    return path.length > 0;
  }).join("/");
  var pathPrefix = fullPath.length > 0 ? 'at path "/' + fullPath + '" ' : "";
  var currentTypename = isStateTreeNode(value) ? "value of type " + getStateTreeNode(value).type.name + ":" : isPrimitive(value) ? "value" : "snapshot";
  var isSnapshotCompatible = type && isStateTreeNode(value) && type.is(getStateTreeNode(value).snapshot);
  return "" + pathPrefix + currentTypename + " " + prettyPrintValue(value) + " is not assignable " + (type ? "to type: `" + type.name + "`" : "") + (error.message ? " (" + error.message + ")" : "") + (type ? isPrimitiveType(type) || isPrimitive(value) ? "." : ", expected an instance of `" + type.name + "` or a snapshot like `" + type.describe() + "` instead." + (isSnapshotCompatible ? " (Note that a snapshot of the provided value is compatible with the targeted type)" : "") : ".");
}
function getContextForPath(context, path, type) {
  return context.concat([{ path, type }]);
}
function typeCheckSuccess() {
  return EMPTY_ARRAY2;
}
function typeCheckFailure(context, value, message) {
  return [{ context, value, message }];
}
function flattenTypeErrors(errors) {
  return errors.reduce(function(a, i) {
    return a.concat(i);
  }, []);
}
function typecheckInternal(type, value) {
  if (isTypeCheckingEnabled()) {
    typecheck(type, value);
  }
}
function typecheck(type, value) {
  var errors = type.validate(value, [{ path: "", type }]);
  if (errors.length > 0) {
    throw fail$1(validationErrorsToString(type, value, errors));
  }
}
function validationErrorsToString(type, value, errors) {
  if (errors.length === 0) {
    return void 0;
  }
  return "Error while converting " + shortenPrintValue(prettyPrintValue(value)) + " to `" + type.name + "`:\n\n    " + errors.map(toErrorString).join("\n    ");
}
var identifierCacheId = 0;
var IdentifierCache = (
  /** @class */
  (function() {
    function IdentifierCache2() {
      this.cacheId = identifierCacheId++;
      this.cache = observable.map();
      this.lastCacheModificationPerId = observable.map();
    }
    IdentifierCache2.prototype.updateLastCacheModificationPerId = function(identifier2) {
      var lcm = this.lastCacheModificationPerId.get(identifier2);
      this.lastCacheModificationPerId.set(identifier2, lcm === void 0 ? 1 : lcm + 1);
    };
    IdentifierCache2.prototype.getLastCacheModificationPerId = function(identifier2) {
      var modificationId = this.lastCacheModificationPerId.get(identifier2) || 0;
      return this.cacheId + "-" + modificationId;
    };
    IdentifierCache2.prototype.addNodeToCache = function(node, lastCacheUpdate) {
      if (lastCacheUpdate === void 0) {
        lastCacheUpdate = true;
      }
      if (node.identifierAttribute) {
        var identifier2 = node.identifier;
        if (!this.cache.has(identifier2)) {
          this.cache.set(identifier2, observable.array([], mobxShallow));
        }
        var set2 = this.cache.get(identifier2);
        if (set2.indexOf(node) !== -1)
          throw fail$1("Already registered");
        set2.push(node);
        if (lastCacheUpdate) {
          this.updateLastCacheModificationPerId(identifier2);
        }
      }
    };
    IdentifierCache2.prototype.mergeCache = function(node) {
      var _this = this;
      values(node.identifierCache.cache).forEach(function(nodes) {
        return nodes.forEach(function(child) {
          _this.addNodeToCache(child);
        });
      });
    };
    IdentifierCache2.prototype.notifyDied = function(node) {
      if (node.identifierAttribute) {
        var id = node.identifier;
        var set2 = this.cache.get(id);
        if (set2) {
          set2.remove(node);
          if (!set2.length) {
            this.cache.delete(id);
          }
          this.updateLastCacheModificationPerId(node.identifier);
        }
      }
    };
    IdentifierCache2.prototype.splitCache = function(node) {
      var _this = this;
      var res = new IdentifierCache2();
      var basePath = node.path;
      entries(this.cache).forEach(function(_a2) {
        var _b = __read2(_a2, 2), id = _b[0], nodes = _b[1];
        var modified = false;
        for (var i = nodes.length - 1; i >= 0; i--) {
          if (nodes[i].path.indexOf(basePath) === 0) {
            res.addNodeToCache(nodes[i], false);
            nodes.splice(i, 1);
            modified = true;
          }
        }
        if (modified) {
          _this.updateLastCacheModificationPerId(id);
        }
      });
      return res;
    };
    IdentifierCache2.prototype.has = function(type, identifier2) {
      var set2 = this.cache.get(identifier2);
      if (!set2)
        return false;
      return set2.some(function(candidate) {
        return type.isAssignableFrom(candidate.type);
      });
    };
    IdentifierCache2.prototype.resolve = function(type, identifier2) {
      var set2 = this.cache.get(identifier2);
      if (!set2)
        return null;
      var matches = set2.filter(function(candidate) {
        return type.isAssignableFrom(candidate.type);
      });
      switch (matches.length) {
        case 0:
          return null;
        case 1:
          return matches[0];
        default:
          throw fail$1("Cannot resolve a reference to type '" + type.name + "' with id: '" + identifier2 + "' unambigously, there are multiple candidates: " + matches.map(function(n) {
            return n.path;
          }).join(", "));
      }
    };
    return IdentifierCache2;
  })()
);
function createObjectNode(type, parent, subpath, environment, initialValue) {
  var existingNode = getStateTreeNodeSafe(initialValue);
  if (existingNode) {
    if (existingNode.parent) {
      throw fail$1("Cannot add an object to a state tree if it is already part of the same or another state tree. Tried to assign an object to '" + (parent ? parent.path : "") + "/" + subpath + "', but it lives already at '" + existingNode.path + "'");
    }
    if (parent) {
      existingNode.setParent(parent, subpath);
    }
    return existingNode;
  }
  return new ObjectNode(type, parent, subpath, environment, initialValue);
}
function createScalarNode(type, parent, subpath, environment, initialValue) {
  return new ScalarNode(type, parent, subpath, environment, initialValue);
}
function isNode(value) {
  return value instanceof ScalarNode || value instanceof ObjectNode;
}
var NodeLifeCycle;
(function(NodeLifeCycle2) {
  NodeLifeCycle2[NodeLifeCycle2["INITIALIZING"] = 0] = "INITIALIZING";
  NodeLifeCycle2[NodeLifeCycle2["CREATED"] = 1] = "CREATED";
  NodeLifeCycle2[NodeLifeCycle2["FINALIZED"] = 2] = "FINALIZED";
  NodeLifeCycle2[NodeLifeCycle2["DETACHING"] = 3] = "DETACHING";
  NodeLifeCycle2[NodeLifeCycle2["DEAD"] = 4] = "DEAD";
})(NodeLifeCycle || (NodeLifeCycle = {}));
function isStateTreeNode(value) {
  return !!(value && value.$treenode);
}
function assertIsStateTreeNode(value, argNumber) {
  assertArg(value, isStateTreeNode, "mobx-state-tree node", argNumber);
}
function getStateTreeNode(value) {
  if (!isStateTreeNode(value)) {
    throw fail$1("Value " + value + " is no MST Node");
  }
  return value.$treenode;
}
function getStateTreeNodeSafe(value) {
  return value && value.$treenode || null;
}
function toJSON() {
  return getStateTreeNode(this).snapshot;
}
function resolveNodeByPathParts(base, pathParts, failIfResolveFails) {
  if (failIfResolveFails === void 0) {
    failIfResolveFails = true;
  }
  var current = base;
  for (var i = 0; i < pathParts.length; i++) {
    var part = pathParts[i];
    if (part === "..") {
      current = current.parent;
      if (current)
        continue;
    } else if (part === ".") {
      continue;
    } else if (current) {
      if (current instanceof ScalarNode) {
        try {
          var value = current.value;
          if (isStateTreeNode(value)) {
            current = getStateTreeNode(value);
          }
        } catch (e) {
          if (!failIfResolveFails) {
            return void 0;
          }
          throw e;
        }
      }
      if (current instanceof ObjectNode) {
        var subType = current.getChildType(part);
        if (subType) {
          current = current.getChildNode(part);
          if (current)
            continue;
        }
      }
    }
    if (failIfResolveFails)
      throw fail$1("Could not resolve '" + part + "' in path '" + (joinJsonPath(pathParts.slice(0, i)) || "/") + "' while resolving '" + joinJsonPath(pathParts) + "'");
    else
      return void 0;
  }
  return current;
}
function convertChildNodesToArray(childNodes) {
  if (!childNodes)
    return EMPTY_ARRAY2;
  var keys2 = Object.keys(childNodes);
  if (!keys2.length)
    return EMPTY_ARRAY2;
  var result = new Array(keys2.length);
  keys2.forEach(function(key, index) {
    result[index] = childNodes[key];
  });
  return result;
}
var EMPTY_ARRAY2 = Object.freeze([]);
var EMPTY_OBJECT2 = Object.freeze({});
var mobxShallow = typeof $mobx === "string" ? { deep: false } : { deep: false, proxy: false };
Object.freeze(mobxShallow);
function fail$1(message) {
  if (message === void 0) {
    message = "Illegal state";
  }
  return new Error("[mobx-state-tree] " + message);
}
function identity(_) {
  return _;
}
var isInteger = Number.isInteger || function(value) {
  return typeof value === "number" && isFinite(value) && Math.floor(value) === value;
};
function isArray(val) {
  return Array.isArray(val) || isObservableArray(val);
}
function asArray(val) {
  if (!val)
    return EMPTY_ARRAY2;
  if (isArray(val))
    return val;
  return [val];
}
function extend(a) {
  var b = [];
  for (var _i = 1; _i < arguments.length; _i++) {
    b[_i - 1] = arguments[_i];
  }
  for (var i = 0; i < b.length; i++) {
    var current = b[i];
    for (var key in current)
      a[key] = current[key];
  }
  return a;
}
function isPlainObject2(value) {
  if (value === null || typeof value !== "object")
    return false;
  var proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}
function isMutable(value) {
  return value !== null && typeof value === "object" && !(value instanceof Date) && !(value instanceof RegExp);
}
function isPrimitive(value, includeDate) {
  if (includeDate === void 0) {
    includeDate = true;
  }
  if (value === null || value === void 0)
    return true;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || includeDate && value instanceof Date)
    return true;
  return false;
}
function freeze(value) {
  if (!devMode())
    return value;
  return isPrimitive(value) || isObservableArray(value) ? value : Object.freeze(value);
}
function deepFreeze(value) {
  if (!devMode())
    return value;
  freeze(value);
  if (isPlainObject2(value)) {
    Object.keys(value).forEach(function(propKey) {
      if (!isPrimitive(value[propKey]) && !Object.isFrozen(value[propKey])) {
        deepFreeze(value[propKey]);
      }
    });
  }
  return value;
}
function isSerializable(value) {
  return typeof value !== "function";
}
function addHiddenFinalProp2(object, propName, value) {
  Object.defineProperty(object, propName, {
    enumerable: false,
    writable: false,
    configurable: true,
    value
  });
}
function addHiddenWritableProp(object, propName, value) {
  Object.defineProperty(object, propName, {
    enumerable: false,
    writable: true,
    configurable: true,
    value
  });
}
var EventHandler = (
  /** @class */
  (function() {
    function EventHandler2() {
      this.handlers = [];
    }
    Object.defineProperty(EventHandler2.prototype, "hasSubscribers", {
      get: function() {
        return this.handlers.length > 0;
      },
      enumerable: false,
      configurable: true
    });
    EventHandler2.prototype.register = function(fn, atTheBeginning) {
      var _this = this;
      if (atTheBeginning === void 0) {
        atTheBeginning = false;
      }
      if (atTheBeginning) {
        this.handlers.unshift(fn);
      } else {
        this.handlers.push(fn);
      }
      return function() {
        _this.unregister(fn);
      };
    };
    EventHandler2.prototype.has = function(fn) {
      return this.handlers.indexOf(fn) >= 0;
    };
    EventHandler2.prototype.unregister = function(fn) {
      var index = this.handlers.indexOf(fn);
      if (index >= 0) {
        this.handlers.splice(index, 1);
      }
    };
    EventHandler2.prototype.clear = function() {
      this.handlers.length = 0;
    };
    EventHandler2.prototype.emit = function() {
      var args = [];
      for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
      }
      var handlers = this.handlers.slice();
      handlers.forEach(function(f) {
        return f.apply(void 0, __spread2(args));
      });
    };
    return EventHandler2;
  })()
);
var EventHandlers = (
  /** @class */
  (function() {
    function EventHandlers2() {
    }
    EventHandlers2.prototype.hasSubscribers = function(event) {
      var handler = this.eventHandlers && this.eventHandlers[event];
      return !!handler && handler.hasSubscribers;
    };
    EventHandlers2.prototype.register = function(event, fn, atTheBeginning) {
      if (atTheBeginning === void 0) {
        atTheBeginning = false;
      }
      if (!this.eventHandlers) {
        this.eventHandlers = {};
      }
      var handler = this.eventHandlers[event];
      if (!handler) {
        handler = this.eventHandlers[event] = new EventHandler();
      }
      return handler.register(fn, atTheBeginning);
    };
    EventHandlers2.prototype.has = function(event, fn) {
      var handler = this.eventHandlers && this.eventHandlers[event];
      return !!handler && handler.has(fn);
    };
    EventHandlers2.prototype.unregister = function(event, fn) {
      var handler = this.eventHandlers && this.eventHandlers[event];
      if (handler) {
        handler.unregister(fn);
      }
    };
    EventHandlers2.prototype.clear = function(event) {
      if (this.eventHandlers) {
        delete this.eventHandlers[event];
      }
    };
    EventHandlers2.prototype.clearAll = function() {
      this.eventHandlers = void 0;
    };
    EventHandlers2.prototype.emit = function(event) {
      var _a2;
      var args = [];
      for (var _i = 1; _i < arguments.length; _i++) {
        args[_i - 1] = arguments[_i];
      }
      var handler = this.eventHandlers && this.eventHandlers[event];
      if (handler) {
        (_a2 = handler).emit.apply(_a2, __spread2(args));
      }
    };
    return EventHandlers2;
  })()
);
function argsToArray(args) {
  var res = new Array(args.length);
  for (var i = 0; i < args.length; i++)
    res[i] = args[i];
  return res;
}
function invalidateComputed(target, propName) {
  var atom = getAtom(target, propName);
  atom.trackAndCompute();
}
function stringStartsWith(str, beginning) {
  return str.indexOf(beginning) === 0;
}
var deprecated = function(id, message) {
  if (!devMode())
    return;
  if (deprecated.ids && !deprecated.ids.hasOwnProperty(id)) {
    warnError("Deprecation warning: " + message);
  }
  if (deprecated.ids)
    deprecated.ids[id] = true;
};
deprecated.ids = {};
function warnError(msg) {
  console.warn(new Error("[mobx-state-tree] " + msg));
}
function isTypeCheckingEnabled() {
  return devMode() || typeof process !== "undefined" && process.env && process.env.ENABLE_TYPE_CHECK === "true";
}
function devMode() {
  return process.env.NODE_ENV !== "production";
}
function assertArg(value, fn, typeName, argNumber) {
  if (devMode()) {
    if (!fn(value)) {
      throw fail$1("expected " + typeName + " as argument " + asArray(argNumber).join(" or ") + ", got " + value + " instead");
    }
  }
}
function assertIsString(value, argNumber, canBeEmpty) {
  if (canBeEmpty === void 0) {
    canBeEmpty = true;
  }
  assertArg(value, function(s) {
    return typeof s === "string";
  }, "string", argNumber);
  if (!canBeEmpty) {
    assertArg(value, function(s) {
      return s !== "";
    }, "not empty string", argNumber);
  }
}
function splitPatch(patch) {
  if (!("oldValue" in patch))
    throw fail$1("Patches without `oldValue` field cannot be inversed");
  return [stripPatch(patch), invertPatch(patch)];
}
function stripPatch(patch) {
  switch (patch.op) {
    case "add":
      return { op: "add", path: patch.path, value: patch.value };
    case "remove":
      return { op: "remove", path: patch.path };
    case "replace":
      return { op: "replace", path: patch.path, value: patch.value };
  }
}
function invertPatch(patch) {
  switch (patch.op) {
    case "add":
      return {
        op: "remove",
        path: patch.path
      };
    case "remove":
      return {
        op: "add",
        path: patch.path,
        value: patch.oldValue
      };
    case "replace":
      return {
        op: "replace",
        path: patch.path,
        value: patch.oldValue
      };
  }
}
function isNumber(x) {
  return typeof x === "number";
}
function escapeJsonPath(path) {
  if (isNumber(path) === true) {
    return "" + path;
  }
  if (path.indexOf("/") === -1 && path.indexOf("~") === -1)
    return path;
  return path.replace(/~/g, "~0").replace(/\//g, "~1");
}
function unescapeJsonPath(path) {
  return path.replace(/~1/g, "/").replace(/~0/g, "~");
}
function joinJsonPath(path) {
  if (path.length === 0)
    return "";
  var getPathStr = function(p) {
    return p.map(escapeJsonPath).join("/");
  };
  if (path[0] === "." || path[0] === "..") {
    return getPathStr(path);
  } else {
    return "/" + getPathStr(path);
  }
}
function splitJsonPath(path) {
  var parts = path.split("/").map(unescapeJsonPath);
  var valid = path === "" || path === "." || path === ".." || stringStartsWith(path, "/") || stringStartsWith(path, "./") || stringStartsWith(path, "../");
  if (!valid) {
    throw fail$1("a json path must be either rooted, empty or relative, but got '" + path + "'");
  }
  if (parts[0] === "") {
    parts.shift();
  }
  return parts;
}
var SnapshotProcessor = (
  /** @class */
  (function(_super) {
    __extends2(SnapshotProcessor2, _super);
    function SnapshotProcessor2(_subtype, _processors, name) {
      var _this = _super.call(this, name || _subtype.name) || this;
      _this._subtype = _subtype;
      _this._processors = _processors;
      return _this;
    }
    Object.defineProperty(SnapshotProcessor2.prototype, "flags", {
      get: function() {
        return this._subtype.flags | TypeFlags.SnapshotProcessor;
      },
      enumerable: false,
      configurable: true
    });
    SnapshotProcessor2.prototype.describe = function() {
      return "snapshotProcessor(" + this._subtype.describe() + ")";
    };
    SnapshotProcessor2.prototype.preProcessSnapshot = function(sn) {
      if (this._processors.preProcessor) {
        return this._processors.preProcessor.call(null, sn);
      }
      return sn;
    };
    SnapshotProcessor2.prototype.postProcessSnapshot = function(sn) {
      if (this._processors.postProcessor) {
        return this._processors.postProcessor.call(null, sn);
      }
      return sn;
    };
    SnapshotProcessor2.prototype._fixNode = function(node) {
      var _this = this;
      proxyNodeTypeMethods(node.type, this, "isAssignableFrom", "create");
      var oldGetSnapshot = node.getSnapshot;
      node.getSnapshot = function() {
        return _this.postProcessSnapshot(oldGetSnapshot.call(node));
      };
    };
    SnapshotProcessor2.prototype.instantiate = function(parent, subpath, environment, initialValue) {
      var processedInitialValue = isStateTreeNode(initialValue) ? initialValue : this.preProcessSnapshot(initialValue);
      var node = this._subtype.instantiate(parent, subpath, environment, processedInitialValue);
      this._fixNode(node);
      return node;
    };
    SnapshotProcessor2.prototype.reconcile = function(current, newValue, parent, subpath) {
      var node = this._subtype.reconcile(current, isStateTreeNode(newValue) ? newValue : this.preProcessSnapshot(newValue), parent, subpath);
      if (node !== current) {
        this._fixNode(node);
      }
      return node;
    };
    SnapshotProcessor2.prototype.getSnapshot = function(node, applyPostProcess) {
      if (applyPostProcess === void 0) {
        applyPostProcess = true;
      }
      var sn = this._subtype.getSnapshot(node);
      return applyPostProcess ? this.postProcessSnapshot(sn) : sn;
    };
    SnapshotProcessor2.prototype.isValidSnapshot = function(value, context) {
      var processedSn = this.preProcessSnapshot(value);
      return this._subtype.validate(processedSn, context);
    };
    SnapshotProcessor2.prototype.getSubTypes = function() {
      return this._subtype;
    };
    SnapshotProcessor2.prototype.is = function(thing) {
      var value = isType(thing) ? this._subtype : isStateTreeNode(thing) ? getSnapshot(thing, false) : this.preProcessSnapshot(thing);
      return this._subtype.validate(value, [{ path: "", type: this._subtype }]).length === 0;
    };
    return SnapshotProcessor2;
  })(BaseType)
);
function proxyNodeTypeMethods(nodeType, snapshotProcessorType) {
  var e_1, _a2;
  var methods = [];
  for (var _i = 2; _i < arguments.length; _i++) {
    methods[_i - 2] = arguments[_i];
  }
  try {
    for (var methods_1 = __values2(methods), methods_1_1 = methods_1.next(); !methods_1_1.done; methods_1_1 = methods_1.next()) {
      var method = methods_1_1.value;
      nodeType[method] = snapshotProcessorType[method].bind(snapshotProcessorType);
    }
  } catch (e_1_1) {
    e_1 = { error: e_1_1 };
  } finally {
    try {
      if (methods_1_1 && !methods_1_1.done && (_a2 = methods_1.return)) _a2.call(methods_1);
    } finally {
      if (e_1) throw e_1.error;
    }
  }
}
var needsIdentifierError = "Map.put can only be used to store complex values that have an identifier type attribute";
function tryCollectModelTypes(type, modelTypes) {
  var e_1, _a2;
  var subtypes = type.getSubTypes();
  if (subtypes === cannotDetermineSubtype) {
    return false;
  }
  if (subtypes) {
    var subtypesArray = asArray(subtypes);
    try {
      for (var subtypesArray_1 = __values2(subtypesArray), subtypesArray_1_1 = subtypesArray_1.next(); !subtypesArray_1_1.done; subtypesArray_1_1 = subtypesArray_1.next()) {
        var subtype = subtypesArray_1_1.value;
        if (!tryCollectModelTypes(subtype, modelTypes))
          return false;
      }
    } catch (e_1_1) {
      e_1 = { error: e_1_1 };
    } finally {
      try {
        if (subtypesArray_1_1 && !subtypesArray_1_1.done && (_a2 = subtypesArray_1.return)) _a2.call(subtypesArray_1);
      } finally {
        if (e_1) throw e_1.error;
      }
    }
  }
  if (type instanceof ModelType) {
    modelTypes.push(type);
  }
  return true;
}
var MapIdentifierMode;
(function(MapIdentifierMode2) {
  MapIdentifierMode2[MapIdentifierMode2["UNKNOWN"] = 0] = "UNKNOWN";
  MapIdentifierMode2[MapIdentifierMode2["YES"] = 1] = "YES";
  MapIdentifierMode2[MapIdentifierMode2["NO"] = 2] = "NO";
})(MapIdentifierMode || (MapIdentifierMode = {}));
var MSTMap = (
  /** @class */
  (function(_super) {
    __extends2(MSTMap2, _super);
    function MSTMap2(initialData) {
      return _super.call(this, initialData, observable.ref.enhancer) || this;
    }
    MSTMap2.prototype.get = function(key) {
      return _super.prototype.get.call(this, "" + key);
    };
    MSTMap2.prototype.has = function(key) {
      return _super.prototype.has.call(this, "" + key);
    };
    MSTMap2.prototype.delete = function(key) {
      return _super.prototype.delete.call(this, "" + key);
    };
    MSTMap2.prototype.set = function(key, value) {
      return _super.prototype.set.call(this, "" + key, value);
    };
    MSTMap2.prototype.put = function(value) {
      if (!value)
        throw fail$1("Map.put cannot be used to set empty values");
      if (isStateTreeNode(value)) {
        var node = getStateTreeNode(value);
        if (devMode()) {
          if (!node.identifierAttribute) {
            throw fail$1(needsIdentifierError);
          }
        }
        if (node.identifier === null) {
          throw fail$1(needsIdentifierError);
        }
        this.set(node.identifier, value);
        return value;
      } else if (!isMutable(value)) {
        throw fail$1("Map.put can only be used to store complex values");
      } else {
        var mapNode = getStateTreeNode(this);
        var mapType = mapNode.type;
        if (mapType.identifierMode !== MapIdentifierMode.YES) {
          throw fail$1(needsIdentifierError);
        }
        var idAttr = mapType.mapIdentifierAttribute;
        var id = value[idAttr];
        if (!isValidIdentifier(id)) {
          var newNode = this.put(mapType.getChildType().create(value, mapNode.environment));
          return this.put(getSnapshot(newNode));
        }
        var key = normalizeIdentifier(id);
        this.set(key, value);
        return this.get(key);
      }
    };
    return MSTMap2;
  })(ObservableMap)
);
var MapType = (
  /** @class */
  (function(_super) {
    __extends2(MapType2, _super);
    function MapType2(name, _subType, hookInitializers) {
      if (hookInitializers === void 0) {
        hookInitializers = [];
      }
      var _this = _super.call(this, name) || this;
      _this._subType = _subType;
      _this.identifierMode = MapIdentifierMode.UNKNOWN;
      _this.mapIdentifierAttribute = void 0;
      _this.flags = TypeFlags.Map;
      _this.hookInitializers = [];
      _this._determineIdentifierMode();
      _this.hookInitializers = hookInitializers;
      return _this;
    }
    MapType2.prototype.hooks = function(hooks) {
      var hookInitializers = this.hookInitializers.length > 0 ? this.hookInitializers.concat(hooks) : [hooks];
      return new MapType2(this.name, this._subType, hookInitializers);
    };
    MapType2.prototype.instantiate = function(parent, subpath, environment, initialValue) {
      this._determineIdentifierMode();
      return createObjectNode(this, parent, subpath, environment, initialValue);
    };
    MapType2.prototype._determineIdentifierMode = function() {
      if (this.identifierMode !== MapIdentifierMode.UNKNOWN) {
        return;
      }
      var modelTypes = [];
      if (tryCollectModelTypes(this._subType, modelTypes)) {
        var identifierAttribute_1 = void 0;
        modelTypes.forEach(function(type) {
          if (type.identifierAttribute) {
            if (identifierAttribute_1 && identifierAttribute_1 !== type.identifierAttribute) {
              throw fail$1("The objects in a map should all have the same identifier attribute, expected '" + identifierAttribute_1 + "', but child of type '" + type.name + "' declared attribute '" + type.identifierAttribute + "' as identifier");
            }
            identifierAttribute_1 = type.identifierAttribute;
          }
        });
        if (identifierAttribute_1) {
          this.identifierMode = MapIdentifierMode.YES;
          this.mapIdentifierAttribute = identifierAttribute_1;
        } else {
          this.identifierMode = MapIdentifierMode.NO;
        }
      }
    };
    MapType2.prototype.initializeChildNodes = function(objNode, initialSnapshot) {
      if (initialSnapshot === void 0) {
        initialSnapshot = {};
      }
      var subType = objNode.type._subType;
      var result = {};
      Object.keys(initialSnapshot).forEach(function(name) {
        result[name] = subType.instantiate(objNode, name, void 0, initialSnapshot[name]);
      });
      return result;
    };
    MapType2.prototype.createNewInstance = function(childNodes) {
      return new MSTMap(childNodes);
    };
    MapType2.prototype.finalizeNewInstance = function(node, instance) {
      interceptReads(instance, node.unbox);
      var type = node.type;
      type.hookInitializers.forEach(function(initializer) {
        var hooks = initializer(instance);
        Object.keys(hooks).forEach(function(name) {
          var hook = hooks[name];
          var actionInvoker = createActionInvoker(instance, name, hook);
          (!devMode() ? addHiddenFinalProp2 : addHiddenWritableProp)(instance, name, actionInvoker);
        });
      });
      intercept(instance, this.willChange);
      observe(instance, this.didChange);
    };
    MapType2.prototype.describe = function() {
      return "Map<string, " + this._subType.describe() + ">";
    };
    MapType2.prototype.getChildren = function(node) {
      return values(node.storedValue);
    };
    MapType2.prototype.getChildNode = function(node, key) {
      var childNode = node.storedValue.get("" + key);
      if (!childNode)
        throw fail$1("Not a child " + key);
      return childNode;
    };
    MapType2.prototype.willChange = function(change) {
      var node = getStateTreeNode(change.object);
      var key = change.name;
      node.assertWritable({ subpath: key });
      var mapType = node.type;
      var subType = mapType._subType;
      switch (change.type) {
        case "update":
          {
            var newValue = change.newValue;
            var oldValue = change.object.get(key);
            if (newValue === oldValue)
              return null;
            typecheckInternal(subType, newValue);
            change.newValue = subType.reconcile(node.getChildNode(key), change.newValue, node, key);
            mapType.processIdentifier(key, change.newValue);
          }
          break;
        case "add":
          {
            typecheckInternal(subType, change.newValue);
            change.newValue = subType.instantiate(node, key, void 0, change.newValue);
            mapType.processIdentifier(key, change.newValue);
          }
          break;
      }
      return change;
    };
    MapType2.prototype.processIdentifier = function(expected, node) {
      if (this.identifierMode === MapIdentifierMode.YES && node instanceof ObjectNode) {
        var identifier2 = node.identifier;
        if (identifier2 !== expected)
          throw fail$1("A map of objects containing an identifier should always store the object under their own identifier. Trying to store key '" + identifier2 + "', but expected: '" + expected + "'");
      }
    };
    MapType2.prototype.getSnapshot = function(node) {
      var res = {};
      node.getChildren().forEach(function(childNode) {
        res[childNode.subpath] = childNode.snapshot;
      });
      return res;
    };
    MapType2.prototype.processInitialSnapshot = function(childNodes) {
      var processed = {};
      Object.keys(childNodes).forEach(function(key) {
        processed[key] = childNodes[key].getSnapshot();
      });
      return processed;
    };
    MapType2.prototype.didChange = function(change) {
      var node = getStateTreeNode(change.object);
      switch (change.type) {
        case "update":
          return void node.emitPatch({
            op: "replace",
            path: escapeJsonPath(change.name),
            value: change.newValue.snapshot,
            oldValue: change.oldValue ? change.oldValue.snapshot : void 0
          }, node);
        case "add":
          return void node.emitPatch({
            op: "add",
            path: escapeJsonPath(change.name),
            value: change.newValue.snapshot,
            oldValue: void 0
          }, node);
        case "delete":
          var oldSnapshot = change.oldValue.snapshot;
          change.oldValue.die();
          return void node.emitPatch({
            op: "remove",
            path: escapeJsonPath(change.name),
            oldValue: oldSnapshot
          }, node);
      }
    };
    MapType2.prototype.applyPatchLocally = function(node, subpath, patch) {
      var target = node.storedValue;
      switch (patch.op) {
        case "add":
        case "replace":
          target.set(subpath, patch.value);
          break;
        case "remove":
          target.delete(subpath);
          break;
      }
    };
    MapType2.prototype.applySnapshot = function(node, snapshot) {
      typecheckInternal(this, snapshot);
      var target = node.storedValue;
      var currentKeys = {};
      Array.from(target.keys()).forEach(function(key2) {
        currentKeys[key2] = false;
      });
      if (snapshot) {
        for (var key in snapshot) {
          target.set(key, snapshot[key]);
          currentKeys["" + key] = true;
        }
      }
      Object.keys(currentKeys).forEach(function(key2) {
        if (currentKeys[key2] === false)
          target.delete(key2);
      });
    };
    MapType2.prototype.getChildType = function() {
      return this._subType;
    };
    MapType2.prototype.isValidSnapshot = function(value, context) {
      var _this = this;
      if (!isPlainObject2(value)) {
        return typeCheckFailure(context, value, "Value is not a plain object");
      }
      return flattenTypeErrors(Object.keys(value).map(function(path) {
        return _this._subType.validate(value[path], getContextForPath(context, path, _this._subType));
      }));
    };
    MapType2.prototype.getDefaultSnapshot = function() {
      return EMPTY_OBJECT2;
    };
    MapType2.prototype.removeChild = function(node, subpath) {
      node.storedValue.delete(subpath);
    };
    __decorate([
      action
    ], MapType2.prototype, "applySnapshot", null);
    return MapType2;
  })(ComplexType)
);
var ArrayType = (
  /** @class */
  (function(_super) {
    __extends2(ArrayType2, _super);
    function ArrayType2(name, _subType, hookInitializers) {
      if (hookInitializers === void 0) {
        hookInitializers = [];
      }
      var _this = _super.call(this, name) || this;
      _this._subType = _subType;
      _this.flags = TypeFlags.Array;
      _this.hookInitializers = [];
      _this.hookInitializers = hookInitializers;
      return _this;
    }
    ArrayType2.prototype.hooks = function(hooks) {
      var hookInitializers = this.hookInitializers.length > 0 ? this.hookInitializers.concat(hooks) : [hooks];
      return new ArrayType2(this.name, this._subType, hookInitializers);
    };
    ArrayType2.prototype.instantiate = function(parent, subpath, environment, initialValue) {
      return createObjectNode(this, parent, subpath, environment, initialValue);
    };
    ArrayType2.prototype.initializeChildNodes = function(objNode, snapshot) {
      if (snapshot === void 0) {
        snapshot = [];
      }
      var subType = objNode.type._subType;
      var result = {};
      snapshot.forEach(function(item, index) {
        var subpath = "" + index;
        result[subpath] = subType.instantiate(objNode, subpath, void 0, item);
      });
      return result;
    };
    ArrayType2.prototype.createNewInstance = function(childNodes) {
      return observable.array(convertChildNodesToArray(childNodes), mobxShallow);
    };
    ArrayType2.prototype.finalizeNewInstance = function(node, instance) {
      getAdministration(instance).dehancer = node.unbox;
      var type = node.type;
      type.hookInitializers.forEach(function(initializer) {
        var hooks = initializer(instance);
        Object.keys(hooks).forEach(function(name) {
          var hook = hooks[name];
          var actionInvoker = createActionInvoker(instance, name, hook);
          (!devMode() ? addHiddenFinalProp2 : addHiddenWritableProp)(instance, name, actionInvoker);
        });
      });
      intercept(instance, this.willChange);
      observe(instance, this.didChange);
    };
    ArrayType2.prototype.describe = function() {
      return this._subType.describe() + "[]";
    };
    ArrayType2.prototype.getChildren = function(node) {
      return node.storedValue.slice();
    };
    ArrayType2.prototype.getChildNode = function(node, key) {
      var index = Number(key);
      if (index < node.storedValue.length)
        return node.storedValue[index];
      throw fail$1("Not a child: " + key);
    };
    ArrayType2.prototype.willChange = function(change) {
      var node = getStateTreeNode(change.object);
      node.assertWritable({ subpath: "" + change.index });
      var subType = node.type._subType;
      var childNodes = node.getChildren();
      switch (change.type) {
        case "update":
          {
            if (change.newValue === change.object[change.index])
              return null;
            var updatedNodes = reconcileArrayChildren(node, subType, [childNodes[change.index]], [change.newValue], [change.index]);
            if (!updatedNodes) {
              return null;
            }
            change.newValue = updatedNodes[0];
          }
          break;
        case "splice":
          {
            var index_1 = change.index, removedCount = change.removedCount, added = change.added;
            var addedNodes = reconcileArrayChildren(node, subType, childNodes.slice(index_1, index_1 + removedCount), added, added.map(function(_, i2) {
              return index_1 + i2;
            }));
            if (!addedNodes) {
              return null;
            }
            change.added = addedNodes;
            for (var i = index_1 + removedCount; i < childNodes.length; i++) {
              childNodes[i].setParent(node, "" + (i + added.length - removedCount));
            }
          }
          break;
      }
      return change;
    };
    ArrayType2.prototype.getSnapshot = function(node) {
      return node.getChildren().map(function(childNode) {
        return childNode.snapshot;
      });
    };
    ArrayType2.prototype.processInitialSnapshot = function(childNodes) {
      var processed = [];
      Object.keys(childNodes).forEach(function(key) {
        processed.push(childNodes[key].getSnapshot());
      });
      return processed;
    };
    ArrayType2.prototype.didChange = function(change) {
      var node = getStateTreeNode(change.object);
      switch (change.type) {
        case "update":
          return void node.emitPatch({
            op: "replace",
            path: "" + change.index,
            value: change.newValue.snapshot,
            oldValue: change.oldValue ? change.oldValue.snapshot : void 0
          }, node);
        case "splice":
          for (var i = change.removedCount - 1; i >= 0; i--)
            node.emitPatch({
              op: "remove",
              path: "" + (change.index + i),
              oldValue: change.removed[i].snapshot
            }, node);
          for (var i = 0; i < change.addedCount; i++)
            node.emitPatch({
              op: "add",
              path: "" + (change.index + i),
              value: node.getChildNode("" + (change.index + i)).snapshot,
              oldValue: void 0
            }, node);
          return;
      }
    };
    ArrayType2.prototype.applyPatchLocally = function(node, subpath, patch) {
      var target = node.storedValue;
      var index = subpath === "-" ? target.length : Number(subpath);
      switch (patch.op) {
        case "replace":
          target[index] = patch.value;
          break;
        case "add":
          target.splice(index, 0, patch.value);
          break;
        case "remove":
          target.splice(index, 1);
          break;
      }
    };
    ArrayType2.prototype.applySnapshot = function(node, snapshot) {
      typecheckInternal(this, snapshot);
      var target = node.storedValue;
      target.replace(snapshot);
    };
    ArrayType2.prototype.getChildType = function() {
      return this._subType;
    };
    ArrayType2.prototype.isValidSnapshot = function(value, context) {
      var _this = this;
      if (!isArray(value)) {
        return typeCheckFailure(context, value, "Value is not an array");
      }
      return flattenTypeErrors(value.map(function(item, index) {
        return _this._subType.validate(item, getContextForPath(context, "" + index, _this._subType));
      }));
    };
    ArrayType2.prototype.getDefaultSnapshot = function() {
      return EMPTY_ARRAY2;
    };
    ArrayType2.prototype.removeChild = function(node, subpath) {
      node.storedValue.splice(Number(subpath), 1);
    };
    __decorate([
      action
    ], ArrayType2.prototype, "applySnapshot", null);
    return ArrayType2;
  })(ComplexType)
);
function reconcileArrayChildren(parent, childType, oldNodes, newValues, newPaths) {
  var nothingChanged = true;
  for (var i = 0; ; i++) {
    var hasNewNode = i <= newValues.length - 1;
    var oldNode = oldNodes[i];
    var newValue = hasNewNode ? newValues[i] : void 0;
    var newPath = "" + newPaths[i];
    if (isNode(newValue))
      newValue = newValue.storedValue;
    if (!oldNode && !hasNewNode) {
      break;
    } else if (!hasNewNode) {
      nothingChanged = false;
      oldNodes.splice(i, 1);
      if (oldNode instanceof ObjectNode) {
        oldNode.createObservableInstanceIfNeeded();
      }
      oldNode.die();
      i--;
    } else if (!oldNode) {
      if (isStateTreeNode(newValue) && getStateTreeNode(newValue).parent === parent) {
        throw fail$1("Cannot add an object to a state tree if it is already part of the same or another state tree. Tried to assign an object to '" + parent.path + "/" + newPath + "', but it lives already at '" + getStateTreeNode(newValue).path + "'");
      }
      nothingChanged = false;
      var newNode = valueAsNode(childType, parent, newPath, newValue);
      oldNodes.splice(i, 0, newNode);
    } else if (areSame(oldNode, newValue)) {
      oldNodes[i] = valueAsNode(childType, parent, newPath, newValue, oldNode);
    } else {
      var oldMatch = void 0;
      for (var j = i; j < oldNodes.length; j++) {
        if (areSame(oldNodes[j], newValue)) {
          oldMatch = oldNodes.splice(j, 1)[0];
          break;
        }
      }
      nothingChanged = false;
      var newNode = valueAsNode(childType, parent, newPath, newValue, oldMatch);
      oldNodes.splice(i, 0, newNode);
    }
  }
  return nothingChanged ? null : oldNodes;
}
function valueAsNode(childType, parent, subpath, newValue, oldNode) {
  typecheckInternal(childType, newValue);
  function getNewNode() {
    if (isStateTreeNode(newValue)) {
      var childNode = getStateTreeNode(newValue);
      childNode.assertAlive(EMPTY_OBJECT2);
      if (childNode.parent !== null && childNode.parent === parent) {
        childNode.setParent(parent, subpath);
        return childNode;
      }
    }
    if (oldNode) {
      return childType.reconcile(oldNode, newValue, parent, subpath);
    }
    return childType.instantiate(parent, subpath, void 0, newValue);
  }
  var newNode = getNewNode();
  if (oldNode && oldNode !== newNode) {
    if (oldNode instanceof ObjectNode) {
      oldNode.createObservableInstanceIfNeeded();
    }
    oldNode.die();
  }
  return newNode;
}
function areSame(oldNode, newValue) {
  if (!oldNode.isAlive) {
    return false;
  }
  if (isStateTreeNode(newValue)) {
    var newNode = getStateTreeNode(newValue);
    return newNode.isAlive && newNode === oldNode;
  }
  if (oldNode.snapshot === newValue) {
    return true;
  }
  return oldNode instanceof ObjectNode && oldNode.identifier !== null && oldNode.identifierAttribute && isPlainObject2(newValue) && oldNode.identifier === normalizeIdentifier(newValue[oldNode.identifierAttribute]) && oldNode.type.is(newValue);
}
var PRE_PROCESS_SNAPSHOT = "preProcessSnapshot";
var POST_PROCESS_SNAPSHOT = "postProcessSnapshot";
function objectTypeToString() {
  return getStateTreeNode(this).toString();
}
var defaultObjectOptions = {
  name: "AnonymousModel",
  properties: {},
  initializers: EMPTY_ARRAY2
};
function toPropertiesObject(declaredProps) {
  return Object.keys(declaredProps).reduce(function(props, key) {
    var _a2, _b, _c;
    if (key in Hook)
      throw fail$1("Hook '" + key + "' was defined as property. Hooks should be defined as part of the actions");
    var descriptor = Object.getOwnPropertyDescriptor(props, key);
    if ("get" in descriptor) {
      throw fail$1("Getters are not supported as properties. Please use views instead");
    }
    var value = descriptor.value;
    if (value === null || value === void 0) {
      throw fail$1("The default value of an attribute cannot be null or undefined as the type cannot be inferred. Did you mean `types.maybe(someType)`?");
    } else if (isPrimitive(value)) {
      return Object.assign({}, props, (_a2 = {}, _a2[key] = optional(getPrimitiveFactoryFromValue(value), value), _a2));
    } else if (value instanceof MapType) {
      return Object.assign({}, props, (_b = {}, _b[key] = optional(value, {}), _b));
    } else if (value instanceof ArrayType) {
      return Object.assign({}, props, (_c = {}, _c[key] = optional(value, []), _c));
    } else if (isType(value)) {
      return props;
    } else if (devMode() && typeof value === "function") {
      throw fail$1("Invalid type definition for property '" + key + "', it looks like you passed a function. Did you forget to invoke it, or did you intend to declare a view / action?");
    } else if (devMode() && typeof value === "object") {
      throw fail$1("Invalid type definition for property '" + key + "', it looks like you passed an object. Try passing another model type or a types.frozen.");
    } else {
      throw fail$1("Invalid type definition for property '" + key + "', cannot infer a type from a value like '" + value + "' (" + typeof value + ")");
    }
  }, declaredProps);
}
var ModelType = (
  /** @class */
  (function(_super) {
    __extends2(ModelType2, _super);
    function ModelType2(opts) {
      var _this = _super.call(this, opts.name || defaultObjectOptions.name) || this;
      _this.flags = TypeFlags.Object;
      _this.named = function(name) {
        return _this.cloneAndEnhance({ name });
      };
      _this.props = function(properties) {
        return _this.cloneAndEnhance({ properties });
      };
      _this.preProcessSnapshot = function(preProcessor) {
        var currentPreprocessor = _this.preProcessor;
        if (!currentPreprocessor)
          return _this.cloneAndEnhance({ preProcessor });
        else
          return _this.cloneAndEnhance({
            preProcessor: function(snapshot) {
              return currentPreprocessor(preProcessor(snapshot));
            }
          });
      };
      _this.postProcessSnapshot = function(postProcessor) {
        var currentPostprocessor = _this.postProcessor;
        if (!currentPostprocessor)
          return _this.cloneAndEnhance({ postProcessor });
        else
          return _this.cloneAndEnhance({
            postProcessor: function(snapshot) {
              return postProcessor(currentPostprocessor(snapshot));
            }
          });
      };
      Object.assign(_this, defaultObjectOptions, opts);
      _this.properties = toPropertiesObject(_this.properties);
      freeze(_this.properties);
      _this.propertyNames = Object.keys(_this.properties);
      _this.identifierAttribute = _this._getIdentifierAttribute();
      return _this;
    }
    ModelType2.prototype._getIdentifierAttribute = function() {
      var identifierAttribute = void 0;
      this.forAllProps(function(propName, propType) {
        if (propType.flags & TypeFlags.Identifier) {
          if (identifierAttribute)
            throw fail$1("Cannot define property '" + propName + "' as object identifier, property '" + identifierAttribute + "' is already defined as identifier property");
          identifierAttribute = propName;
        }
      });
      return identifierAttribute;
    };
    ModelType2.prototype.cloneAndEnhance = function(opts) {
      return new ModelType2({
        name: opts.name || this.name,
        properties: Object.assign({}, this.properties, opts.properties),
        initializers: this.initializers.concat(opts.initializers || []),
        preProcessor: opts.preProcessor || this.preProcessor,
        postProcessor: opts.postProcessor || this.postProcessor
      });
    };
    ModelType2.prototype.actions = function(fn) {
      var _this = this;
      var actionInitializer = function(self2) {
        _this.instantiateActions(self2, fn(self2));
        return self2;
      };
      return this.cloneAndEnhance({ initializers: [actionInitializer] });
    };
    ModelType2.prototype.instantiateActions = function(self2, actions) {
      if (!isPlainObject2(actions))
        throw fail$1("actions initializer should return a plain object containing actions");
      Object.keys(actions).forEach(function(name) {
        if (name === PRE_PROCESS_SNAPSHOT)
          throw fail$1("Cannot define action '" + PRE_PROCESS_SNAPSHOT + "', it should be defined using 'type.preProcessSnapshot(fn)' instead");
        if (name === POST_PROCESS_SNAPSHOT)
          throw fail$1("Cannot define action '" + POST_PROCESS_SNAPSHOT + "', it should be defined using 'type.postProcessSnapshot(fn)' instead");
        var action22 = actions[name];
        var baseAction = self2[name];
        if (name in Hook && baseAction) {
          var specializedAction_1 = action22;
          action22 = function() {
            baseAction.apply(null, arguments);
            specializedAction_1.apply(null, arguments);
          };
        }
        var middlewares = action22.$mst_middleware;
        var boundAction = action22.bind(actions);
        boundAction.$mst_middleware = middlewares;
        var actionInvoker = createActionInvoker(self2, name, boundAction);
        actions[name] = actionInvoker;
        (!devMode() ? addHiddenFinalProp2 : addHiddenWritableProp)(self2, name, actionInvoker);
      });
    };
    ModelType2.prototype.volatile = function(fn) {
      var _this = this;
      if (typeof fn !== "function") {
        throw fail$1("You passed an " + typeof fn + " to volatile state as an argument, when function is expected");
      }
      var stateInitializer = function(self2) {
        _this.instantiateVolatileState(self2, fn(self2));
        return self2;
      };
      return this.cloneAndEnhance({ initializers: [stateInitializer] });
    };
    ModelType2.prototype.instantiateVolatileState = function(self2, state) {
      if (!isPlainObject2(state))
        throw fail$1("volatile state initializer should return a plain object containing state");
      set(self2, state);
    };
    ModelType2.prototype.extend = function(fn) {
      var _this = this;
      var initializer = function(self2) {
        var _a2 = fn(self2), actions = _a2.actions, views = _a2.views, state = _a2.state, rest = __rest(_a2, ["actions", "views", "state"]);
        for (var key in rest)
          throw fail$1("The `extend` function should return an object with a subset of the fields 'actions', 'views' and 'state'. Found invalid key '" + key + "'");
        if (state)
          _this.instantiateVolatileState(self2, state);
        if (views)
          _this.instantiateViews(self2, views);
        if (actions)
          _this.instantiateActions(self2, actions);
        return self2;
      };
      return this.cloneAndEnhance({ initializers: [initializer] });
    };
    ModelType2.prototype.views = function(fn) {
      var _this = this;
      var viewInitializer = function(self2) {
        _this.instantiateViews(self2, fn(self2));
        return self2;
      };
      return this.cloneAndEnhance({ initializers: [viewInitializer] });
    };
    ModelType2.prototype.instantiateViews = function(self2, views) {
      if (!isPlainObject2(views))
        throw fail$1("views initializer should return a plain object containing views");
      Object.keys(views).forEach(function(key) {
        var descriptor = Object.getOwnPropertyDescriptor(views, key);
        if ("get" in descriptor) {
          if (isComputedProp(self2, key)) {
            var computedValue = getAdministration(self2, key);
            computedValue.derivation = descriptor.get;
            computedValue.scope = self2;
            if (descriptor.set)
              computedValue.setter = action(computedValue.name + "-setter", descriptor.set);
          } else {
            computed(self2, key, descriptor, true);
          }
        } else if (typeof descriptor.value === "function") {
          (!devMode() ? addHiddenFinalProp2 : addHiddenWritableProp)(self2, key, descriptor.value);
        } else {
          throw fail$1("A view member should either be a function or getter based property");
        }
      });
    };
    ModelType2.prototype.instantiate = function(parent, subpath, environment, initialValue) {
      var value = isStateTreeNode(initialValue) ? initialValue : this.applySnapshotPreProcessor(initialValue);
      return createObjectNode(this, parent, subpath, environment, value);
    };
    ModelType2.prototype.initializeChildNodes = function(objNode, initialSnapshot) {
      if (initialSnapshot === void 0) {
        initialSnapshot = {};
      }
      var type = objNode.type;
      var result = {};
      type.forAllProps(function(name, childType) {
        result[name] = childType.instantiate(objNode, name, void 0, initialSnapshot[name]);
      });
      return result;
    };
    ModelType2.prototype.createNewInstance = function(childNodes) {
      return observable.object(childNodes, EMPTY_OBJECT2, mobxShallow);
    };
    ModelType2.prototype.finalizeNewInstance = function(node, instance) {
      addHiddenFinalProp2(instance, "toString", objectTypeToString);
      this.forAllProps(function(name) {
        interceptReads(instance, name, node.unbox);
      });
      this.initializers.reduce(function(self2, fn) {
        return fn(self2);
      }, instance);
      intercept(instance, this.willChange);
      observe(instance, this.didChange);
    };
    ModelType2.prototype.willChange = function(chg) {
      var change = chg;
      var node = getStateTreeNode(change.object);
      var subpath = change.name;
      node.assertWritable({ subpath });
      var childType = node.type.properties[subpath];
      if (childType) {
        typecheckInternal(childType, change.newValue);
        change.newValue = childType.reconcile(node.getChildNode(subpath), change.newValue, node, subpath);
      }
      return change;
    };
    ModelType2.prototype.didChange = function(chg) {
      var change = chg;
      var childNode = getStateTreeNode(change.object);
      var childType = childNode.type.properties[change.name];
      if (!childType) {
        return;
      }
      var oldChildValue = change.oldValue ? change.oldValue.snapshot : void 0;
      childNode.emitPatch({
        op: "replace",
        path: escapeJsonPath(change.name),
        value: change.newValue.snapshot,
        oldValue: oldChildValue
      }, childNode);
    };
    ModelType2.prototype.getChildren = function(node) {
      var _this = this;
      var res = [];
      this.forAllProps(function(name) {
        res.push(_this.getChildNode(node, name));
      });
      return res;
    };
    ModelType2.prototype.getChildNode = function(node, key) {
      if (!(key in this.properties))
        throw fail$1("Not a value property: " + key);
      var childNode = getAdministration(node.storedValue, key).value;
      if (!childNode)
        throw fail$1("Node not available for property " + key);
      return childNode;
    };
    ModelType2.prototype.getSnapshot = function(node, applyPostProcess) {
      var _this = this;
      if (applyPostProcess === void 0) {
        applyPostProcess = true;
      }
      var res = {};
      this.forAllProps(function(name, type) {
        getAtom(node.storedValue, name).reportObserved();
        res[name] = _this.getChildNode(node, name).snapshot;
      });
      if (applyPostProcess) {
        return this.applySnapshotPostProcessor(res);
      }
      return res;
    };
    ModelType2.prototype.processInitialSnapshot = function(childNodes) {
      var processed = {};
      Object.keys(childNodes).forEach(function(key) {
        processed[key] = childNodes[key].getSnapshot();
      });
      return this.applySnapshotPostProcessor(processed);
    };
    ModelType2.prototype.applyPatchLocally = function(node, subpath, patch) {
      if (!(patch.op === "replace" || patch.op === "add")) {
        throw fail$1("object does not support operation " + patch.op);
      }
      node.storedValue[subpath] = patch.value;
    };
    ModelType2.prototype.applySnapshot = function(node, snapshot) {
      var preProcessedSnapshot = this.applySnapshotPreProcessor(snapshot);
      typecheckInternal(this, preProcessedSnapshot);
      this.forAllProps(function(name) {
        node.storedValue[name] = preProcessedSnapshot[name];
      });
    };
    ModelType2.prototype.applySnapshotPreProcessor = function(snapshot) {
      var processor = this.preProcessor;
      return processor ? processor.call(null, snapshot) : snapshot;
    };
    ModelType2.prototype.applySnapshotPostProcessor = function(snapshot) {
      var postProcessor = this.postProcessor;
      if (postProcessor)
        return postProcessor.call(null, snapshot);
      return snapshot;
    };
    ModelType2.prototype.getChildType = function(propertyName) {
      assertIsString(propertyName, 1);
      return this.properties[propertyName];
    };
    ModelType2.prototype.isValidSnapshot = function(value, context) {
      var _this = this;
      var snapshot = this.applySnapshotPreProcessor(value);
      if (!isPlainObject2(snapshot)) {
        return typeCheckFailure(context, snapshot, "Value is not a plain object");
      }
      return flattenTypeErrors(this.propertyNames.map(function(key) {
        return _this.properties[key].validate(snapshot[key], getContextForPath(context, key, _this.properties[key]));
      }));
    };
    ModelType2.prototype.forAllProps = function(fn) {
      var _this = this;
      this.propertyNames.forEach(function(key) {
        return fn(key, _this.properties[key]);
      });
    };
    ModelType2.prototype.describe = function() {
      var _this = this;
      return "{ " + this.propertyNames.map(function(key) {
        return key + ": " + _this.properties[key].describe();
      }).join("; ") + " }";
    };
    ModelType2.prototype.getDefaultSnapshot = function() {
      return EMPTY_OBJECT2;
    };
    ModelType2.prototype.removeChild = function(node, subpath) {
      node.storedValue[subpath] = void 0;
    };
    __decorate([
      action
    ], ModelType2.prototype, "applySnapshot", null);
    return ModelType2;
  })(ComplexType)
);
function isModelType(type) {
  return isType(type) && (type.flags & TypeFlags.Object) > 0;
}
var CoreType = (
  /** @class */
  (function(_super) {
    __extends2(CoreType2, _super);
    function CoreType2(name, flags, checker, initializer) {
      if (initializer === void 0) {
        initializer = identity;
      }
      var _this = _super.call(this, name) || this;
      _this.flags = flags;
      _this.checker = checker;
      _this.initializer = initializer;
      _this.flags = flags;
      return _this;
    }
    CoreType2.prototype.describe = function() {
      return this.name;
    };
    CoreType2.prototype.instantiate = function(parent, subpath, environment, initialValue) {
      return createScalarNode(this, parent, subpath, environment, initialValue);
    };
    CoreType2.prototype.createNewInstance = function(snapshot) {
      return this.initializer(snapshot);
    };
    CoreType2.prototype.isValidSnapshot = function(value, context) {
      if (isPrimitive(value) && this.checker(value)) {
        return typeCheckSuccess();
      }
      var typeName = this.name === "Date" ? "Date or a unix milliseconds timestamp" : this.name;
      return typeCheckFailure(context, value, "Value is not a " + typeName);
    };
    return CoreType2;
  })(SimpleType)
);
var string = new CoreType("string", TypeFlags.String, function(v) {
  return typeof v === "string";
});
var number = new CoreType("number", TypeFlags.Number, function(v) {
  return typeof v === "number";
});
var integer = new CoreType("integer", TypeFlags.Integer, function(v) {
  return isInteger(v);
});
var boolean = new CoreType("boolean", TypeFlags.Boolean, function(v) {
  return typeof v === "boolean";
});
var nullType = new CoreType("null", TypeFlags.Null, function(v) {
  return v === null;
});
var undefinedType = new CoreType("undefined", TypeFlags.Undefined, function(v) {
  return v === void 0;
});
var _DatePrimitive = new CoreType("Date", TypeFlags.Date, function(v) {
  return typeof v === "number" || v instanceof Date;
}, function(v) {
  return v instanceof Date ? v : new Date(v);
});
_DatePrimitive.getSnapshot = function(node) {
  return node.storedValue.getTime();
};
var DatePrimitive = _DatePrimitive;
function getPrimitiveFactoryFromValue(value) {
  switch (typeof value) {
    case "string":
      return string;
    case "number":
      return number;
    // In the future, isInteger(value) ? integer : number would be interesting, but would be too breaking for now
    case "boolean":
      return boolean;
    case "object":
      if (value instanceof Date)
        return DatePrimitive;
  }
  throw fail$1("Cannot determine primitive type from value " + value);
}
function isPrimitiveType(type) {
  return isType(type) && (type.flags & (TypeFlags.String | TypeFlags.Number | TypeFlags.Integer | TypeFlags.Boolean | TypeFlags.Date)) > 0;
}
var Literal = (
  /** @class */
  (function(_super) {
    __extends2(Literal2, _super);
    function Literal2(value) {
      var _this = _super.call(this, JSON.stringify(value)) || this;
      _this.flags = TypeFlags.Literal;
      _this.value = value;
      return _this;
    }
    Literal2.prototype.instantiate = function(parent, subpath, environment, initialValue) {
      return createScalarNode(this, parent, subpath, environment, initialValue);
    };
    Literal2.prototype.describe = function() {
      return JSON.stringify(this.value);
    };
    Literal2.prototype.isValidSnapshot = function(value, context) {
      if (isPrimitive(value) && value === this.value) {
        return typeCheckSuccess();
      }
      return typeCheckFailure(context, value, "Value is not a literal " + JSON.stringify(this.value));
    };
    return Literal2;
  })(SimpleType)
);
var Refinement = (
  /** @class */
  (function(_super) {
    __extends2(Refinement2, _super);
    function Refinement2(name, _subtype, _predicate, _message) {
      var _this = _super.call(this, name) || this;
      _this._subtype = _subtype;
      _this._predicate = _predicate;
      _this._message = _message;
      return _this;
    }
    Object.defineProperty(Refinement2.prototype, "flags", {
      get: function() {
        return this._subtype.flags | TypeFlags.Refinement;
      },
      enumerable: false,
      configurable: true
    });
    Refinement2.prototype.describe = function() {
      return this.name;
    };
    Refinement2.prototype.instantiate = function(parent, subpath, environment, initialValue) {
      return this._subtype.instantiate(parent, subpath, environment, initialValue);
    };
    Refinement2.prototype.isAssignableFrom = function(type) {
      return this._subtype.isAssignableFrom(type);
    };
    Refinement2.prototype.isValidSnapshot = function(value, context) {
      var subtypeErrors = this._subtype.validate(value, context);
      if (subtypeErrors.length > 0)
        return subtypeErrors;
      var snapshot = isStateTreeNode(value) ? getStateTreeNode(value).snapshot : value;
      if (!this._predicate(snapshot)) {
        return typeCheckFailure(context, value, this._message(value));
      }
      return typeCheckSuccess();
    };
    Refinement2.prototype.reconcile = function(current, newValue, parent, subpath) {
      return this._subtype.reconcile(current, newValue, parent, subpath);
    };
    Refinement2.prototype.getSubTypes = function() {
      return this._subtype;
    };
    return Refinement2;
  })(BaseType)
);
var Union = (
  /** @class */
  (function(_super) {
    __extends2(Union2, _super);
    function Union2(name, _types, options) {
      var _this = _super.call(this, name) || this;
      _this._types = _types;
      _this._eager = true;
      options = __assign2({ eager: true, dispatcher: void 0 }, options);
      _this._dispatcher = options.dispatcher;
      if (!options.eager)
        _this._eager = false;
      return _this;
    }
    Object.defineProperty(Union2.prototype, "flags", {
      get: function() {
        var result = TypeFlags.Union;
        this._types.forEach(function(type) {
          result |= type.flags;
        });
        return result;
      },
      enumerable: false,
      configurable: true
    });
    Union2.prototype.isAssignableFrom = function(type) {
      return this._types.some(function(subType) {
        return subType.isAssignableFrom(type);
      });
    };
    Union2.prototype.describe = function() {
      return "(" + this._types.map(function(factory) {
        return factory.describe();
      }).join(" | ") + ")";
    };
    Union2.prototype.instantiate = function(parent, subpath, environment, initialValue) {
      var type = this.determineType(initialValue, void 0);
      if (!type)
        throw fail$1("No matching type for union " + this.describe());
      return type.instantiate(parent, subpath, environment, initialValue);
    };
    Union2.prototype.reconcile = function(current, newValue, parent, subpath) {
      var type = this.determineType(newValue, current.type);
      if (!type)
        throw fail$1("No matching type for union " + this.describe());
      return type.reconcile(current, newValue, parent, subpath);
    };
    Union2.prototype.determineType = function(value, reconcileCurrentType) {
      if (this._dispatcher) {
        return this._dispatcher(value);
      }
      if (reconcileCurrentType) {
        if (reconcileCurrentType.is(value)) {
          return reconcileCurrentType;
        }
        return this._types.filter(function(t) {
          return t !== reconcileCurrentType;
        }).find(function(type) {
          return type.is(value);
        });
      } else {
        return this._types.find(function(type) {
          return type.is(value);
        });
      }
    };
    Union2.prototype.isValidSnapshot = function(value, context) {
      if (this._dispatcher) {
        return this._dispatcher(value).validate(value, context);
      }
      var allErrors = [];
      var applicableTypes = 0;
      for (var i = 0; i < this._types.length; i++) {
        var type = this._types[i];
        var errors = type.validate(value, context);
        if (errors.length === 0) {
          if (this._eager)
            return typeCheckSuccess();
          else
            applicableTypes++;
        } else {
          allErrors.push(errors);
        }
      }
      if (applicableTypes === 1)
        return typeCheckSuccess();
      return typeCheckFailure(context, value, "No type is applicable for the union").concat(flattenTypeErrors(allErrors));
    };
    Union2.prototype.getSubTypes = function() {
      return this._types;
    };
    return Union2;
  })(BaseType)
);
var OptionalValue = (
  /** @class */
  (function(_super) {
    __extends2(OptionalValue2, _super);
    function OptionalValue2(_subtype, _defaultValue, optionalValues) {
      var _this = _super.call(this, _subtype.name) || this;
      _this._subtype = _subtype;
      _this._defaultValue = _defaultValue;
      _this.optionalValues = optionalValues;
      return _this;
    }
    Object.defineProperty(OptionalValue2.prototype, "flags", {
      get: function() {
        return this._subtype.flags | TypeFlags.Optional;
      },
      enumerable: false,
      configurable: true
    });
    OptionalValue2.prototype.describe = function() {
      return this._subtype.describe() + "?";
    };
    OptionalValue2.prototype.instantiate = function(parent, subpath, environment, initialValue) {
      if (this.optionalValues.indexOf(initialValue) >= 0) {
        var defaultInstanceOrSnapshot = this.getDefaultInstanceOrSnapshot();
        return this._subtype.instantiate(parent, subpath, environment, defaultInstanceOrSnapshot);
      }
      return this._subtype.instantiate(parent, subpath, environment, initialValue);
    };
    OptionalValue2.prototype.reconcile = function(current, newValue, parent, subpath) {
      return this._subtype.reconcile(current, this.optionalValues.indexOf(newValue) < 0 && this._subtype.is(newValue) ? newValue : this.getDefaultInstanceOrSnapshot(), parent, subpath);
    };
    OptionalValue2.prototype.getDefaultInstanceOrSnapshot = function() {
      var defaultInstanceOrSnapshot = typeof this._defaultValue === "function" ? this._defaultValue() : this._defaultValue;
      if (typeof this._defaultValue === "function") {
        typecheckInternal(this, defaultInstanceOrSnapshot);
      }
      return defaultInstanceOrSnapshot;
    };
    OptionalValue2.prototype.isValidSnapshot = function(value, context) {
      if (this.optionalValues.indexOf(value) >= 0) {
        return typeCheckSuccess();
      }
      return this._subtype.validate(value, context);
    };
    OptionalValue2.prototype.isAssignableFrom = function(type) {
      return this._subtype.isAssignableFrom(type);
    };
    OptionalValue2.prototype.getSubTypes = function() {
      return this._subtype;
    };
    return OptionalValue2;
  })(BaseType)
);
function checkOptionalPreconditions(type, defaultValueOrFunction) {
  if (typeof defaultValueOrFunction !== "function" && isStateTreeNode(defaultValueOrFunction)) {
    throw fail$1("default value cannot be an instance, pass a snapshot or a function that creates an instance/snapshot instead");
  }
  assertIsType(type, 1);
  if (devMode()) {
    if (typeof defaultValueOrFunction !== "function") {
      typecheckInternal(type, defaultValueOrFunction);
    }
  }
}
function optional(type, defaultValueOrFunction, optionalValues) {
  checkOptionalPreconditions(type, defaultValueOrFunction);
  return new OptionalValue(type, defaultValueOrFunction, optionalValues ? optionalValues : undefinedAsOptionalValues);
}
var undefinedAsOptionalValues = [void 0];
var optionalUndefinedType = optional(undefinedType, void 0);
var optionalNullType = optional(nullType, null);
var Late = (
  /** @class */
  (function(_super) {
    __extends2(Late2, _super);
    function Late2(name, _definition) {
      var _this = _super.call(this, name) || this;
      _this._definition = _definition;
      return _this;
    }
    Object.defineProperty(Late2.prototype, "flags", {
      get: function() {
        return (this._subType ? this._subType.flags : 0) | TypeFlags.Late;
      },
      enumerable: false,
      configurable: true
    });
    Late2.prototype.getSubType = function(mustSucceed) {
      if (!this._subType) {
        var t = void 0;
        try {
          t = this._definition();
        } catch (e) {
          if (e instanceof ReferenceError)
            t = void 0;
          else
            throw e;
        }
        if (mustSucceed && t === void 0)
          throw fail$1("Late type seems to be used too early, the definition (still) returns undefined");
        if (t) {
          if (devMode() && !isType(t))
            throw fail$1("Failed to determine subtype, make sure types.late returns a type definition.");
          this._subType = t;
        }
      }
      return this._subType;
    };
    Late2.prototype.instantiate = function(parent, subpath, environment, initialValue) {
      return this.getSubType(true).instantiate(parent, subpath, environment, initialValue);
    };
    Late2.prototype.reconcile = function(current, newValue, parent, subpath) {
      return this.getSubType(true).reconcile(current, newValue, parent, subpath);
    };
    Late2.prototype.describe = function() {
      var t = this.getSubType(false);
      return t ? t.name : "<uknown late type>";
    };
    Late2.prototype.isValidSnapshot = function(value, context) {
      var t = this.getSubType(false);
      if (!t) {
        return typeCheckSuccess();
      }
      return t.validate(value, context);
    };
    Late2.prototype.isAssignableFrom = function(type) {
      var t = this.getSubType(false);
      return t ? t.isAssignableFrom(type) : false;
    };
    Late2.prototype.getSubTypes = function() {
      var subtype = this.getSubType(false);
      return subtype ? subtype : cannotDetermineSubtype;
    };
    return Late2;
  })(BaseType)
);
var Frozen = (
  /** @class */
  (function(_super) {
    __extends2(Frozen2, _super);
    function Frozen2(subType) {
      var _this = _super.call(this, subType ? "frozen(" + subType.name + ")" : "frozen") || this;
      _this.subType = subType;
      _this.flags = TypeFlags.Frozen;
      return _this;
    }
    Frozen2.prototype.describe = function() {
      return "<any immutable value>";
    };
    Frozen2.prototype.instantiate = function(parent, subpath, environment, value) {
      return createScalarNode(this, parent, subpath, environment, deepFreeze(value));
    };
    Frozen2.prototype.isValidSnapshot = function(value, context) {
      if (!isSerializable(value)) {
        return typeCheckFailure(context, value, "Value is not serializable and cannot be frozen");
      }
      if (this.subType)
        return this.subType.validate(value, context);
      return typeCheckSuccess();
    };
    return Frozen2;
  })(SimpleType)
);
var untypedFrozenInstance = new Frozen();
function getInvalidationCause(hook) {
  switch (hook) {
    case Hook.beforeDestroy:
      return "destroy";
    case Hook.beforeDetach:
      return "detach";
    default:
      return void 0;
  }
}
var StoredReference = (
  /** @class */
  (function() {
    function StoredReference2(value, targetType) {
      this.targetType = targetType;
      if (isValidIdentifier(value)) {
        this.identifier = value;
      } else if (isStateTreeNode(value)) {
        var targetNode = getStateTreeNode(value);
        if (!targetNode.identifierAttribute)
          throw fail$1("Can only store references with a defined identifier attribute.");
        var id = targetNode.unnormalizedIdentifier;
        if (id === null || id === void 0) {
          throw fail$1("Can only store references to tree nodes with a defined identifier.");
        }
        this.identifier = id;
      } else {
        throw fail$1("Can only store references to tree nodes or identifiers, got: '" + value + "'");
      }
    }
    StoredReference2.prototype.updateResolvedReference = function(node) {
      var normalizedId = normalizeIdentifier(this.identifier);
      var root = node.root;
      var lastCacheModification = root.identifierCache.getLastCacheModificationPerId(normalizedId);
      if (!this.resolvedReference || this.resolvedReference.lastCacheModification !== lastCacheModification) {
        var targetType = this.targetType;
        var target = root.identifierCache.resolve(targetType, normalizedId);
        if (!target) {
          throw new InvalidReferenceError("[mobx-state-tree] Failed to resolve reference '" + this.identifier + "' to type '" + this.targetType.name + "' (from node: " + node.path + ")");
        }
        this.resolvedReference = {
          node: target,
          lastCacheModification
        };
      }
    };
    Object.defineProperty(StoredReference2.prototype, "resolvedValue", {
      get: function() {
        this.updateResolvedReference(this.node);
        return this.resolvedReference.node.value;
      },
      enumerable: false,
      configurable: true
    });
    return StoredReference2;
  })()
);
var InvalidReferenceError = (
  /** @class */
  (function(_super) {
    __extends2(InvalidReferenceError2, _super);
    function InvalidReferenceError2(m) {
      var _this = _super.call(this, m) || this;
      Object.setPrototypeOf(_this, InvalidReferenceError2.prototype);
      return _this;
    }
    return InvalidReferenceError2;
  })(Error)
);
var BaseReferenceType = (
  /** @class */
  (function(_super) {
    __extends2(BaseReferenceType2, _super);
    function BaseReferenceType2(targetType, onInvalidated) {
      var _this = _super.call(this, "reference(" + targetType.name + ")") || this;
      _this.targetType = targetType;
      _this.onInvalidated = onInvalidated;
      _this.flags = TypeFlags.Reference;
      return _this;
    }
    BaseReferenceType2.prototype.describe = function() {
      return this.name;
    };
    BaseReferenceType2.prototype.isAssignableFrom = function(type) {
      return this.targetType.isAssignableFrom(type);
    };
    BaseReferenceType2.prototype.isValidSnapshot = function(value, context) {
      return isValidIdentifier(value) ? typeCheckSuccess() : typeCheckFailure(context, value, "Value is not a valid identifier, which is a string or a number");
    };
    BaseReferenceType2.prototype.fireInvalidated = function(cause, storedRefNode, referenceId, refTargetNode) {
      var storedRefParentNode = storedRefNode.parent;
      if (!storedRefParentNode || !storedRefParentNode.isAlive) {
        return;
      }
      var storedRefParentValue = storedRefParentNode.storedValue;
      if (!storedRefParentValue) {
        return;
      }
      this.onInvalidated({
        cause,
        parent: storedRefParentValue,
        invalidTarget: refTargetNode ? refTargetNode.storedValue : void 0,
        invalidId: referenceId,
        replaceRef: function(newRef) {
          applyPatch(storedRefNode.root.storedValue, {
            op: "replace",
            value: newRef,
            path: storedRefNode.path
          });
        },
        removeRef: function() {
          if (isModelType(storedRefParentNode.type)) {
            this.replaceRef(void 0);
          } else {
            applyPatch(storedRefNode.root.storedValue, {
              op: "remove",
              path: storedRefNode.path
            });
          }
        }
      });
    };
    BaseReferenceType2.prototype.addTargetNodeWatcher = function(storedRefNode, referenceId) {
      var _this = this;
      var refTargetValue = this.getValue(storedRefNode);
      if (!refTargetValue) {
        return void 0;
      }
      var refTargetNode = getStateTreeNode(refTargetValue);
      var hookHandler = function(_, refTargetNodeHook) {
        var cause = getInvalidationCause(refTargetNodeHook);
        if (!cause) {
          return;
        }
        _this.fireInvalidated(cause, storedRefNode, referenceId, refTargetNode);
      };
      var refTargetDetachHookDisposer = refTargetNode.registerHook(Hook.beforeDetach, hookHandler);
      var refTargetDestroyHookDisposer = refTargetNode.registerHook(Hook.beforeDestroy, hookHandler);
      return function() {
        refTargetDetachHookDisposer();
        refTargetDestroyHookDisposer();
      };
    };
    BaseReferenceType2.prototype.watchTargetNodeForInvalidations = function(storedRefNode, identifier2, customGetSet) {
      var _this = this;
      if (!this.onInvalidated) {
        return;
      }
      var onRefTargetDestroyedHookDisposer;
      storedRefNode.registerHook(Hook.beforeDestroy, function() {
        if (onRefTargetDestroyedHookDisposer) {
          onRefTargetDestroyedHookDisposer();
        }
      });
      var startWatching = function(sync) {
        if (onRefTargetDestroyedHookDisposer) {
          onRefTargetDestroyedHookDisposer();
        }
        var storedRefParentNode = storedRefNode.parent;
        var storedRefParentValue = storedRefParentNode && storedRefParentNode.storedValue;
        if (storedRefParentNode && storedRefParentNode.isAlive && storedRefParentValue) {
          var refTargetNodeExists = void 0;
          if (customGetSet) {
            refTargetNodeExists = !!customGetSet.get(identifier2, storedRefParentValue);
          } else {
            refTargetNodeExists = storedRefNode.root.identifierCache.has(_this.targetType, normalizeIdentifier(identifier2));
          }
          if (!refTargetNodeExists) {
            if (!sync) {
              _this.fireInvalidated("invalidSnapshotReference", storedRefNode, identifier2, null);
            }
          } else {
            onRefTargetDestroyedHookDisposer = _this.addTargetNodeWatcher(storedRefNode, identifier2);
          }
        }
      };
      if (storedRefNode.state === NodeLifeCycle.FINALIZED) {
        startWatching(true);
      } else {
        if (!storedRefNode.isRoot) {
          storedRefNode.root.registerHook(Hook.afterCreationFinalization, function() {
            if (storedRefNode.parent) {
              storedRefNode.parent.createObservableInstanceIfNeeded();
            }
          });
        }
        storedRefNode.registerHook(Hook.afterAttach, function() {
          startWatching(false);
        });
      }
    };
    return BaseReferenceType2;
  })(SimpleType)
);
var IdentifierReferenceType = (
  /** @class */
  (function(_super) {
    __extends2(IdentifierReferenceType2, _super);
    function IdentifierReferenceType2(targetType, onInvalidated) {
      return _super.call(this, targetType, onInvalidated) || this;
    }
    IdentifierReferenceType2.prototype.getValue = function(storedRefNode) {
      if (!storedRefNode.isAlive)
        return void 0;
      var storedRef = storedRefNode.storedValue;
      return storedRef.resolvedValue;
    };
    IdentifierReferenceType2.prototype.getSnapshot = function(storedRefNode) {
      var ref = storedRefNode.storedValue;
      return ref.identifier;
    };
    IdentifierReferenceType2.prototype.instantiate = function(parent, subpath, environment, initialValue) {
      var identifier2 = isStateTreeNode(initialValue) ? getIdentifier(initialValue) : initialValue;
      var storedRef = new StoredReference(initialValue, this.targetType);
      var storedRefNode = createScalarNode(this, parent, subpath, environment, storedRef);
      storedRef.node = storedRefNode;
      this.watchTargetNodeForInvalidations(storedRefNode, identifier2, void 0);
      return storedRefNode;
    };
    IdentifierReferenceType2.prototype.reconcile = function(current, newValue, parent, subpath) {
      if (!current.isDetaching && current.type === this) {
        var compareByValue = isStateTreeNode(newValue);
        var ref = current.storedValue;
        if (!compareByValue && ref.identifier === newValue || compareByValue && ref.resolvedValue === newValue) {
          current.setParent(parent, subpath);
          return current;
        }
      }
      var newNode = this.instantiate(parent, subpath, void 0, newValue);
      current.die();
      return newNode;
    };
    return IdentifierReferenceType2;
  })(BaseReferenceType)
);
var CustomReferenceType = (
  /** @class */
  (function(_super) {
    __extends2(CustomReferenceType2, _super);
    function CustomReferenceType2(targetType, options, onInvalidated) {
      var _this = _super.call(this, targetType, onInvalidated) || this;
      _this.options = options;
      return _this;
    }
    CustomReferenceType2.prototype.getValue = function(storedRefNode) {
      if (!storedRefNode.isAlive)
        return void 0;
      var referencedNode = this.options.get(storedRefNode.storedValue, storedRefNode.parent ? storedRefNode.parent.storedValue : null);
      return referencedNode;
    };
    CustomReferenceType2.prototype.getSnapshot = function(storedRefNode) {
      return storedRefNode.storedValue;
    };
    CustomReferenceType2.prototype.instantiate = function(parent, subpath, environment, newValue) {
      var identifier2 = isStateTreeNode(newValue) ? this.options.set(newValue, parent ? parent.storedValue : null) : newValue;
      var storedRefNode = createScalarNode(this, parent, subpath, environment, identifier2);
      this.watchTargetNodeForInvalidations(storedRefNode, identifier2, this.options);
      return storedRefNode;
    };
    CustomReferenceType2.prototype.reconcile = function(current, newValue, parent, subpath) {
      var newIdentifier = isStateTreeNode(newValue) ? this.options.set(newValue, current ? current.storedValue : null) : newValue;
      if (!current.isDetaching && current.type === this && current.storedValue === newIdentifier) {
        current.setParent(parent, subpath);
        return current;
      }
      var newNode = this.instantiate(parent, subpath, void 0, newIdentifier);
      current.die();
      return newNode;
    };
    return CustomReferenceType2;
  })(BaseReferenceType)
);
var BaseIdentifierType = (
  /** @class */
  (function(_super) {
    __extends2(BaseIdentifierType2, _super);
    function BaseIdentifierType2(name, validType) {
      var _this = _super.call(this, name) || this;
      _this.validType = validType;
      _this.flags = TypeFlags.Identifier;
      return _this;
    }
    BaseIdentifierType2.prototype.instantiate = function(parent, subpath, environment, initialValue) {
      if (!parent || !(parent.type instanceof ModelType))
        throw fail$1("Identifier types can only be instantiated as direct child of a model type");
      return createScalarNode(this, parent, subpath, environment, initialValue);
    };
    BaseIdentifierType2.prototype.reconcile = function(current, newValue, parent, subpath) {
      if (current.storedValue !== newValue)
        throw fail$1("Tried to change identifier from '" + current.storedValue + "' to '" + newValue + "'. Changing identifiers is not allowed.");
      current.setParent(parent, subpath);
      return current;
    };
    BaseIdentifierType2.prototype.isValidSnapshot = function(value, context) {
      if (typeof value !== this.validType) {
        return typeCheckFailure(context, value, "Value is not a valid " + this.describe() + ", expected a " + this.validType);
      }
      return typeCheckSuccess();
    };
    return BaseIdentifierType2;
  })(SimpleType)
);
var IdentifierType = (
  /** @class */
  (function(_super) {
    __extends2(IdentifierType2, _super);
    function IdentifierType2() {
      var _this = _super.call(this, "identifier", "string") || this;
      _this.flags = TypeFlags.Identifier;
      return _this;
    }
    IdentifierType2.prototype.describe = function() {
      return "identifier";
    };
    return IdentifierType2;
  })(BaseIdentifierType)
);
var IdentifierNumberType = (
  /** @class */
  (function(_super) {
    __extends2(IdentifierNumberType2, _super);
    function IdentifierNumberType2() {
      return _super.call(this, "identifierNumber", "number") || this;
    }
    IdentifierNumberType2.prototype.getSnapshot = function(node) {
      return node.storedValue;
    };
    IdentifierNumberType2.prototype.describe = function() {
      return "identifierNumber";
    };
    return IdentifierNumberType2;
  })(BaseIdentifierType)
);
var identifier = new IdentifierType();
var identifierNumber = new IdentifierNumberType();
function normalizeIdentifier(id) {
  return "" + id;
}
function isValidIdentifier(id) {
  return typeof id === "string" || typeof id === "number";
}
var CustomType = (
  /** @class */
  (function(_super) {
    __extends2(CustomType2, _super);
    function CustomType2(options) {
      var _this = _super.call(this, options.name) || this;
      _this.options = options;
      _this.flags = TypeFlags.Custom;
      return _this;
    }
    CustomType2.prototype.describe = function() {
      return this.name;
    };
    CustomType2.prototype.isValidSnapshot = function(value, context) {
      if (this.options.isTargetType(value))
        return typeCheckSuccess();
      var typeError = this.options.getValidationMessage(value);
      if (typeError) {
        return typeCheckFailure(context, value, "Invalid value for type '" + this.name + "': " + typeError);
      }
      return typeCheckSuccess();
    };
    CustomType2.prototype.getSnapshot = function(node) {
      return this.options.toSnapshot(node.storedValue);
    };
    CustomType2.prototype.instantiate = function(parent, subpath, environment, initialValue) {
      var valueToStore = this.options.isTargetType(initialValue) ? initialValue : this.options.fromSnapshot(initialValue, parent && parent.root.environment);
      return createScalarNode(this, parent, subpath, environment, valueToStore);
    };
    CustomType2.prototype.reconcile = function(current, value, parent, subpath) {
      var isSnapshot = !this.options.isTargetType(value);
      if (!current.isDetaching) {
        var unchanged = current.type === this && (isSnapshot ? value === current.snapshot : value === current.storedValue);
        if (unchanged) {
          current.setParent(parent, subpath);
          return current;
        }
      }
      var valueToStore = isSnapshot ? this.options.fromSnapshot(value, parent.root.environment) : value;
      var newNode = this.instantiate(parent, subpath, void 0, valueToStore);
      current.die();
      return newNode;
    };
    return CustomType2;
  })(SimpleType)
);

// ../node_modules/es-toolkit/dist/compat/util/toString.mjs
function toString2(value) {
  if (value == null) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(toString2).join(",");
  }
  const result = String(value);
  if (result === "0" && Object.is(Number(value), -0)) {
    return "-0";
  }
  return result;
}

// ../node_modules/es-toolkit/dist/string/capitalize.mjs
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// ../node_modules/es-toolkit/dist/string/deburr.mjs
var deburrMap = /* @__PURE__ */ new Map([
  ["\xC6", "Ae"],
  ["\xD0", "D"],
  ["\xD8", "O"],
  ["\xDE", "Th"],
  ["\xDF", "ss"],
  ["\xE6", "ae"],
  ["\xF0", "d"],
  ["\xF8", "o"],
  ["\xFE", "th"],
  ["\u0110", "D"],
  ["\u0111", "d"],
  ["\u0126", "H"],
  ["\u0127", "h"],
  ["\u0131", "i"],
  ["\u0132", "IJ"],
  ["\u0133", "ij"],
  ["\u0138", "k"],
  ["\u013F", "L"],
  ["\u0140", "l"],
  ["\u0141", "L"],
  ["\u0142", "l"],
  ["\u0149", "'n"],
  ["\u014A", "N"],
  ["\u014B", "n"],
  ["\u0152", "Oe"],
  ["\u0153", "oe"],
  ["\u0166", "T"],
  ["\u0167", "t"],
  ["\u017F", "s"]
]);
function deburr(str) {
  str = str.normalize("NFD");
  let result = "";
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char >= "\u0300" && char <= "\u036F" || char >= "\uFE20" && char <= "\uFE23") {
      continue;
    }
    result += deburrMap.get(char) ?? char;
  }
  return result;
}

// ../node_modules/es-toolkit/dist/compat/string/deburr.mjs
function deburr2(str) {
  return deburr(toString2(str));
}

// ../node_modules/es-toolkit/dist/string/words.mjs
var CASE_SPLIT_PATTERN = /\p{Lu}?\p{Ll}+|[0-9]+|\p{Lu}+(?!\p{Ll})|\p{Emoji_Presentation}|\p{Extended_Pictographic}|\p{L}+/gu;
function words(str) {
  return Array.from(str.match(CASE_SPLIT_PATTERN) ?? []);
}

// ../node_modules/es-toolkit/dist/string/camelCase.mjs
function camelCase(str) {
  const words$1 = words(str);
  if (words$1.length === 0) {
    return "";
  }
  const [first, ...rest] = words$1;
  return `${first.toLowerCase()}${rest.map((word) => capitalize(word)).join("")}`;
}

// ../node_modules/es-toolkit/dist/compat/_internal/normalizeForCase.mjs
function normalizeForCase(str) {
  if (typeof str !== "string") {
    str = toString2(str);
  }
  return str.replace(/['\u2019]/g, "");
}

// ../node_modules/es-toolkit/dist/compat/string/camelCase.mjs
function camelCase2(str) {
  return camelCase(normalizeForCase(deburr2(str)));
}

// ../node_modules/es-toolkit/dist/string/snakeCase.mjs
function snakeCase(str) {
  const words$1 = words(str);
  return words$1.map((word) => word.toLowerCase()).join("_");
}

// ../node_modules/es-toolkit/dist/compat/string/snakeCase.mjs
function snakeCase2(str) {
  return snakeCase(normalizeForCase(deburr2(str)));
}

// editor/src/utils/utilities.ts
var isString = (value) => {
  return typeof value === "string" || value instanceof String;
};
var isStringEmpty = (value) => {
  if (!isString(value)) {
    return false;
  }
  return value.length === 0;
};
var isStringJSON = (value) => {
  if (isString(value)) {
    try {
      JSON.parse(value);
    } catch (e) {
      return false;
    }
    return true;
  }
  return false;
};
function getUrl(i, text) {
  const stringToTest = text.slice(i);
  const myRegexp = /^(https?:\/\/(?:www\.|(?!www))[^\s.]+\.[^\s]{2,}|www\.[^\s]+\.[^\s]{2,})/g;
  const match2 = myRegexp.exec(stringToTest);
  return match2 && match2.length ? match2[1] : "";
}
function isValidObjectURL(str, relative = false) {
  if (typeof str !== "string") return false;
  if (relative && str.startsWith("/")) return true;
  return /^https?:\/\//.test(str);
}
function toTimeString(ms) {
  if (typeof ms === "number") {
    return new Date(ms).toUTCString().match(/(\d\d:\d\d:\d\d)/)?.[0];
  }
}
function flatten(arr) {
  return arr.reduce(
    (flat, toFlatten) => flat.concat(Array.isArray(toFlatten) ? flatten(toFlatten) : toFlatten),
    []
  );
}
function hashCode(str) {
  let hash = 0;
  if (str.length === 0) {
    return `${hash}`;
  }
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `${hash}`;
}
function atobUnicode(str) {
  return decodeURIComponent(
    atob(str).split("").map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`).join("")
  );
}
function escapeHtml(unsafe) {
  return (unsafe ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function isArraysEqual(arr1, arr2) {
  return arr1.length === arr2.length && arr1.every((value, index) => arr2[index] === value);
}
function wrapArray(value) {
  return [].concat(...[value]);
}
function toArray(arg) {
  return (Array.isArray(arg) ? arg : [arg]).filter((v) => v !== void 0);
}
function delay(ms = 0) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
var isDefined = (value) => {
  return value !== null && value !== void 0;
};
function findClosestParent(el, predicate = () => true, parentGetter = (el2) => el2.parent) {
  while (el = parentGetter(el)) {
    if (predicate(el)) {
      return el;
    }
  }
  return null;
}
function clamp(x, min, max) {
  return Math.min(max, Math.max(min, x));
}
var chunks = (source, chunkSize) => {
  const result = [];
  let i;
  let j;
  for (i = 0, j = source.length; i < j; i += chunkSize) {
    result.push(source.slice(i, i + chunkSize));
  }
  return result;
};
var emailFromCreatedBy = (createdBy) => {
  return createdBy?.match(/([^@,\s]+@[^@,\s]+)(,\s*\d+)?$/)?.[1];
};
var camelizeKeys = (object) => {
  return Object.fromEntries(
    Object.entries(object).map(([key, value]) => {
      if (Object.prototype.toString.call(value) === "[object Object]") {
        return [camelCase2(key), camelizeKeys(value)];
      }
      return [camelCase2(key), value];
    })
  );
};
var snakeizeKeys = (object) => {
  return Object.fromEntries(
    Object.entries(object).map(([key, value]) => {
      if (Object.prototype.toString.call(value) === "[object Object]") {
        return [snakeCase2(key), snakeizeKeys(value)];
      }
      return [snakeCase2(key), value];
    })
  );
};
function minMax(items) {
  return items.reduce((acc, val) => {
    acc[0] = acc[0] === void 0 || val < acc[0] ? val : acc[0];
    acc[1] = acc[1] === void 0 || val > acc[1] ? val : acc[1];
    return acc;
  }, []);
}
function isMacOS() {
  return navigator.platform.indexOf("Mac") > -1;
}
var triggerResizeEvent = () => {
  const event = new Event("resize");
  event.initEvent("resize", false, false);
  window.dispatchEvent(event);
};
var humanDateDiff = (date) => {
  const fnsDate = formatDistanceToNow(new Date(date), { addSuffix: true });
  if (fnsDate === "less than a minute ago") return "just now";
  return fnsDate;
};
var destroyMSTObject = (object) => {
  if (object) {
    detach(object);
    destroy(object);
  }
};
var fixMobxObserve = (..._toObserve) => {
};
var sortAnnotations = (annotations) => {
  return annotations.sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime());
};
export {
  atobUnicode,
  camelizeKeys,
  chunks,
  clamp,
  delay,
  destroyMSTObject,
  emailFromCreatedBy,
  escapeHtml,
  findClosestParent,
  fixMobxObserve,
  flatten,
  getUrl,
  hashCode,
  humanDateDiff,
  isArraysEqual,
  isDefined,
  isMacOS,
  isString,
  isStringEmpty,
  isStringJSON,
  isValidObjectURL,
  minMax,
  snakeizeKeys,
  sortAnnotations,
  toArray,
  toTimeString,
  triggerResizeEvent,
  wrapArray
};
/*! Bundled license information:

mobx/lib/mobx.module.js:
  (*! *****************************************************************************
  Copyright (c) Microsoft Corporation. All rights reserved.
  Licensed under the Apache License, Version 2.0 (the "License"); you may not use
  this file except in compliance with the License. You may obtain a copy of the
  License at http://www.apache.org/licenses/LICENSE-2.0
  
  THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
  KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
  WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
  MERCHANTABLITY OR NON-INFRINGEMENT.
  
  See the Apache Version 2.0 License for specific language governing permissions
  and limitations under the License.
  ***************************************************************************** *)

mobx-state-tree/dist/mobx-state-tree.module.js:
  (*! *****************************************************************************
  Copyright (c) Microsoft Corporation.
  
  Permission to use, copy, modify, and/or distribute this software for any
  purpose with or without fee is hereby granted.
  
  THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
  REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
  AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
  INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
  LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
  OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
  PERFORMANCE OF THIS SOFTWARE.
  ***************************************************************************** *)
*/
