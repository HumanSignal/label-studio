export type Day = number | null;

export enum Side {
  start = "start",
  end = "end",
}

export enum Field {
  date = "date",
  time = "time",
}

export enum Meridian {
  am = "AM",
  pm = "PM",
}

export type DateByNumbers = {
  day: number;
  month: number;
  year: number;
};
export interface DateTimeByNumbers extends DateByNumbers {
  hour: number;
  minute: number;
}
export interface DateOrDateTimeByNumbers extends DateByNumbers {
  hour?: number;
  minute?: number;
}

export type DateTimeRange = { start: DateTimeByNumbers; end: DateTimeByNumbers };
export type DateOrDateTimeRange = { start: DateOrDateTimeByNumbers; end: DateOrDateTimeByNumbers };
export type IncompleteRange = { start?: DateOrDateTimeByNumbers; end?: DateOrDateTimeByNumbers };
export type FormDateValues = { start: FormDateTimeValue; end: FormDateTimeValue };
export type FormDateTimeValue = { date: string; time: string; meridiem?: Meridian };
export type FormTimeValues = { hours: number; minutes: number };
export type Selected = DateTimeRange | undefined;
export type SelectedMap = { selected: boolean; selectionStart: boolean; selectionEnd: boolean };
export const oneUnixDay = 60 * 60 * 24 * 1000;
export const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];
export const monthMap = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
export const monthAbbreviations = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const isTwelveHour = new Date().toLocaleTimeString().match(/a\.?m|p\.?m/i);

export const getAllDaysInMonth = (month: number, year: number) => {
  const date = new Date(year, month, 1);

  const dates: Day[][] = [[]];
  const firstDayInMonth = new Date(date).getDay();
  let week = 0;

  if (firstDayInMonth > 0) dates[0].push(...Array.from({ length: firstDayInMonth }, () => null));

  while (date.getMonth() === month) {
    const newDate = new Date(date);

    dates[week].push(newDate.getDate());
    date.setDate(date.getDate() + 1);
    if (newDate.getDay() === 6 && date.getMonth() === month) {
      week++;
      dates.push([]);
    }
  }
  const lastWeekOfMonth = dates[week];
  const lastDayOfMonth: Day = lastWeekOfMonth[lastWeekOfMonth.length - 1];

  if (lastDayOfMonth && lastDayOfMonth < 6) dates[week].push(...Array.from({ length: 6 - lastDayOfMonth }, () => null));

  return dates;
};

export const mapSelected = (
  selectedRange: DateOrDateTimeRange,
  monthMap: Day[][],
  calendarMonth: number,
  calendarYear: number,
) => {
  const sameMonth =
    selectedRange.start.year === selectedRange.end.year && selectedRange.start.month === selectedRange.end.month;
  const startEndEqual = JSON.stringify(selectedRange.start) === JSON.stringify(selectedRange.end);
  const inCalendarStart = selectedRange.start.year === calendarYear && selectedRange.start.month === calendarMonth;
  const inCalendarEnd = selectedRange.end.year === calendarYear && selectedRange.end.month === calendarMonth;
  const startDate = new Date(selectedRange.start.year, selectedRange.start.month, selectedRange.start.day);
  const endDate = new Date(selectedRange.end.year, selectedRange.end.month, selectedRange.end.day);

  const firstDayOfMonth = new Date(calendarYear, calendarMonth, 1);
  const lastDayOfMonth = new Date(calendarYear, calendarMonth + 1, 0);

  const wholeMonthSelected = startDate < firstDayOfMonth && endDate > lastDayOfMonth;

  return monthMap.map((week) =>
    week.map((day) => {
      const selectionStart = inCalendarStart && day === selectedRange.start.day;
      const selectionEnd = inCalendarEnd && day === selectedRange.end.day;
      const started = day && inCalendarStart && day >= selectedRange.start.day;
      const ended = day && inCalendarEnd && day <= selectedRange.end.day;
      const selected = (!startEndEqual && !!(sameMonth ? started && ended : started || ended)) || wholeMonthSelected;

      return {
        selected,
        selectionStart,
        selectionEnd,
      };
    }),
  );
};

export const incrementMonth = ({
  month,
  year,
  changeValue,
}: {
  month: number;
  year: number;
  changeValue: number;
}) => {
  const newDate = new Date(year, month, 1);

  newDate.setMonth(newDate.getMonth() + changeValue);
  return { month: newDate.getMonth(), year: newDate.getFullYear() };
};

export const incrementMonthByDate = (date: Date, changeValue: number) =>
  new Date(date.getFullYear(), date.getMonth() + changeValue, 1);

export const compareRangeEquivalencyByNumber = (
  dates1: Selected | DateOrDateTimeRange,
  dates2: Selected | DateOrDateTimeRange,
) =>
  dates1?.start.month === dates2?.start.month &&
  dates1?.start.year === dates2?.start.year &&
  dates1?.start.day === dates2?.start.day &&
  dates1?.end.month === dates2?.end.month &&
  dates1?.end.year === dates2?.end.year &&
  dates1?.end.day === dates2?.end.day;

export const isSameMonth = (dateOne: Date, dateTwo: Date) =>
  dateOne.getFullYear() === dateTwo.getFullYear() && dateOne.getMonth() === dateTwo.getMonth();

export const isSameMonthByNumbers = ({
  start,
  end,
}: {
  start: DateTimeByNumbers;
  end: DateTimeByNumbers;
}) => isSameMonth(new Date(start.year, start.month), new Date(end.year, end.month));

export const calculateDisplayMonthsFromSelection = (dates: {
  start: DateOrDateTimeByNumbers;
  end: DateOrDateTimeByNumbers;
}) => {
  const currentMonth = new Date();
  const startDate = new Date(dates.start.year, dates.start.month);
  const endDate = new Date(dates.end.year, dates.end.month);
  const sameMonth = isSameMonth(startDate, endDate);
  const endIsThisMonth = isSameMonth(endDate, currentMonth);

  if (sameMonth && (currentMonth <= endDate || endIsThisMonth))
    return {
      ...dates,
      start: incrementMonth({ ...dates.start, changeValue: -1 }),
    };
  if (sameMonth)
    return {
      ...dates,
      end: incrementMonth({ ...dates.end, changeValue: 1 }),
    };
  return dates;
};

export const isCorrectOrder = (range: IncompleteRange) => {
  return (
    range.start &&
    range.end &&
    new Date(range.start.year, range.start.month, range.start.day, range.start.hour || 0, range.start.minute || 0) <
      new Date(range.end.year, range.end.month, range.end.day, range.start.hour || 0, range.start.minute || 0)
  );
};

export const normalizeSelection = (
  selectedDates: IncompleteRange,
  newSelected: DateOrDateTimeByNumbers,
  oldSelected: DateTimeRange | undefined,
): DateOrDateTimeRange => {
  const mergedDates: IncompleteRange = {
    start: oldSelected?.start ? { ...oldSelected.start, ...selectedDates.start } : selectedDates.start,
    end: oldSelected?.end ? { ...oldSelected.end, ...selectedDates.end } : selectedDates.end,
  };

  const firstSelectionState = { start: newSelected, end: newSelected };
  const normalizedSelection = { ...firstSelectionState, ...mergedDates };
  const startDate = new Date(
    normalizedSelection.start.year,
    normalizedSelection.start.month,
    normalizedSelection.start.day,
    normalizedSelection.start.hour || 0,
    normalizedSelection.start.minute || 0,
  );
  const endDate = new Date(
    normalizedSelection.end.year,
    normalizedSelection.end.month,
    normalizedSelection.end.day,
    normalizedSelection.start.hour || 0,
    normalizedSelection.start.minute || 0,
  );
  const newSelectedDate = new Date(
    newSelected.year,
    newSelected.month,
    newSelected.day,
    newSelected.hour || 0,
    newSelected.minute || 0,
  );

  if (newSelectedDate < startDate) {
    normalizedSelection.start = { ...oldSelected?.start, ...newSelected };
    normalizedSelection.end = oldSelected?.end || normalizedSelection.end;
  } else if (newSelectedDate > endDate) {
    normalizedSelection.start = oldSelected?.start || normalizedSelection.start;
    normalizedSelection.end = { ...oldSelected?.end, ...newSelected };
  }

  return normalizedSelection;
};

export const zeroFill = (number: number): string => {
  const value = [...`${number}`.split("")];

  if (value.length === 1) value.unshift("0");
  return value.join("");
};

export const dateToString = (date: DateOrDateTimeByNumbers) =>
  `${date.year}-${zeroFill(date.month + 1)}-${zeroFill(date.day)}`;

export const formatDateByNumbers = (selectedDates: DateOrDateTimeRange) => {
  const startHour = selectedDates.start.hour ?? 0;
  const startMinute = selectedDates.start.minute ?? 0;
  const endHour = selectedDates.end.hour ?? 23;
  const endMinute = selectedDates.end.minute ?? 59;

  const timeStart = isTwelveHour
    ? convertTo12HourStringFromNumber(startHour, startMinute)
    : `${zeroFill(startHour ?? 0)}:${zeroFill(startMinute ?? 0)}`;
  const timeEnd = isTwelveHour
    ? convertTo12HourStringFromNumber(endHour, endMinute)
    : `${zeroFill(endHour ?? 0)}:${zeroFill(endMinute ?? 0)}`;
  const startMeridian = findMeridian(startHour);
  const endMeridian = findMeridian(endHour);

  return {
    start: { date: dateToString(selectedDates.start), time: timeStart, meridiem: startMeridian },
    end: { date: dateToString(selectedDates.end), time: timeEnd, meridiem: endMeridian },
  };
};

export const findMeridian = (hour?: number) => (hour && hour >= 12 ? Meridian.pm : Meridian.am);

export const isValidDate = (string: string): false | DateByNumbers => {
  const params: string[] = string.split(/[.\-/]/);
  const year = Number.parseInt(params[0], 10);
  const month = Number.parseInt(params[1], 10);
  const day = Number.parseInt(params[2], 10);
  const hasWrongNumberOfCharacters = params[0]?.length !== 4 || params[1]?.length !== 2 || params[2]?.length !== 2;
  const incorrectRangeForDate = year < 1000 || year > 3000 || month === 0 || month > 12;
  const isFutureDate = new Date(`${year}-${month}-${day}`) > new Date();
  const monthLength = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const isLeapYear = year % 400 === 0 || (year % 100 !== 0 && year % 4 === 0);

  if (isLeapYear) monthLength[1] = 29;
  if (
    params.length > 3 ||
    incorrectRangeForDate ||
    hasWrongNumberOfCharacters ||
    isFutureDate ||
    !(day > 0 && day <= monthLength[month - 1])
  )
    return false;

  return { year, month, day };
};

export const getNumberOfDaysBetweenDates = (dates: Selected) => {
  if (dates) {
    const one_day = 1000 * 60 * 60 * 24;
    const startDate = new Date(dates.start.year, dates.start.month, dates.start.day);
    const endDate = new Date(dates.end.year, dates.end.month, dates.end.day + 1);

    return Math.round((endDate.getTime() - startDate.getTime()) / one_day);
  }
  return 0;
};

export const getNumberOfDaysBetweenDatesToDisplay = (dates: Selected) => {
  const numberOfDays = getNumberOfDaysBetweenDates(dates);
  const display = { value: numberOfDays, text: "days selected" };

  if (numberOfDays === 1) display.text = "day selected";

  return display;
};

export const convertDateToNumbers = (date: Date) => ({
  day: date.getDate(),
  month: date.getMonth(),
  year: date.getFullYear(),
  hour: date.getHours(),
  minute: date.getMinutes(),
});

export const convertNumbersToDate = (dateTime: DateTimeByNumbers) => {
  const newDate = new Date(dateTime.year, dateTime.month, dateTime.day, dateTime.hour, dateTime.minute);
  const timeZoneOffset = newDate.getTimezoneOffset() * 60000;

  return new Date(newDate.getTime() - timeZoneOffset);
};

export const inputWithMask = (digits: string) => {
  const mask = [
    ["0", "0"],
    ["0", "0"],
    ["0", "0", "0", "0"],
  ];

  const digitArrayClean = digits
    .split(/[.\-/]/)
    .reverse()
    .map((characterArray) => characterArray.split("").reverse());
  let maskedInput = "";

  if (digits.length === 0) return "yyyy-mm-dd";
  mask.forEach((characterArray: string[], arrayIndex: number) => {
    characterArray.forEach((character: string, characterIndex: number) => {
      maskedInput += digitArrayClean?.[arrayIndex]?.[characterIndex] || character;
    });
    if (arrayIndex !== 2) maskedInput += "-";
  });

  return maskedInput.split("").reverse().join("");
};

export const zeroStringFill = (string: string, reverse: boolean) => {
  const characterArray = string.split("");
  const zeros = Array.from({ length: 2 - characterArray.length }, () => "0");

  if (reverse) return [...characterArray, ...zeros];
  return [...zeros, ...characterArray];
};

export const forceFourDigitsWithColinTime = (digits: string) => {
  const digitsArray = digits.split(":");

  if (digitsArray.length > 1)
    return digitsArray.map((digit, index) => zeroStringFill(digit, !!index).join("")).join(":");
  const cleanDigits = digits.replace(/[^0-9]/g, "");

  switch (cleanDigits.length) {
    case 0:
      return "00:00";
    case 1:
      return `0${cleanDigits}:00`;
    case 2:
      return `${cleanDigits}:00`;
    case 3:
      return `${cleanDigits.slice(0, 2)}:${cleanDigits.slice(2, 3)}0`;
    default:
      return cleanDigits
        .split("")
        .reverse()
        .map((digit, index) => `${digit}${index === 2 ? ":" : ""}`)
        .reverse()
        .join("");
  }
};

const convertTo12HourStringFromNumber = (hour: number, minute: number, showMeridian?: boolean): string => {
  const meridian = hour >= 12 ? "PM" : "AM";

  hour = hour === 0 || hour === 12 ? 12 : hour % 12;
  return `${hour}:${zeroFill(minute)}${showMeridian ? ` ${meridian}` : ""}`;
};

export const formatDateString = ({
  date,
  useTime,
  showMeridian,
}: {
  date: DateOrDateTimeByNumbers;
  useTime: boolean;
  showMeridian?: boolean;
}) => {
  const month = monthAbbreviations[date.month];
  const day = date.day;
  const year = date.year;
  const hoursNumber = date.hour || 0;
  const time = isTwelveHour
    ? convertTo12HourStringFromNumber(hoursNumber, date.minute || 0, showMeridian)
    : `${hoursNumber}:${zeroFill(date.minute || 0)}`;

  if (useTime) return `${month} ${day}, ${year} ${time}`;
  return `${month} ${day}, ${year}`;
};

export const removeTimeFromRange = (range: DateOrDateTimeRange) => {
  delete range.start.hour;
  delete range.start.minute;
  delete range.end.hour;
  delete range.end.minute;
  return range;
};

export const fillTime = (range: DateOrDateTimeRange): DateTimeRange => {
  const start = {
    ...range.start,
    hour: typeof range.start.hour !== "number" ? 0 : range.start.hour,
    minute: typeof range.start.minute !== "number" ? 0 : range.start.minute,
  } as DateTimeByNumbers;
  const end = {
    ...range.end,
    hour: typeof range.end.hour !== "number" ? 23 : range.end.hour,
    minute: typeof range.end.minute !== "number" ? 59 : range.end.minute,
  } as DateTimeByNumbers;

  return { start, end };
};

export const convertTo12Hr = (hour: number, newMeridiem?: Meridian) => {
  if (!newMeridiem) return hour;
  if (newMeridiem === Meridian.pm) {
    if (hour === 12) return 0;
    return hour + 12;
  }
  if (newMeridiem === Meridian.am) {
    if (hour === 0) return 12;
    return hour - 12;
  }
  return hour;
};

export const convertTo24HrTimeFromString = (value: string, newMeridiem: Meridian) => {
  const timeArray = value.split(":");

  return [convertTo24Hr(Number.parseInt(timeArray[0]), newMeridiem), Number.parseInt(timeArray[1])];
};

const convertTo24Hr = (hour: number, meridiem: Meridian) => {
  if (meridiem === Meridian.am && hour === 12) {
    return 0;
  }
  if (meridiem === Meridian.pm && hour !== 12) {
    hour += 12;
  }
  return hour;
};

export const apiDateStringFormat = (date: DateOrDateTimeByNumbers) => {
  const { month, day, year, hour, minute } = date;
  // Create date in local timezone - the browser converts this to UTC via toISOString()
  // Backend receives UTC and interprets it correctly via astimezone(tz)
  const newDate = new Date(year, month, day, hour || 0, minute || 0);

  return newDate.toISOString();
};

export const isValidTime = (time: string) => {
  const twentyFourHourTime = /^(2[0-3]|[01][0-9]):[0-5][0-9]$/;
  const twelveHourTime = /^(1[0-2]|0?[1-9]):[0-5][0-9]$/;

  return isTwelveHour ? twelveHourTime.test(time) : twentyFourHourTime.test(time);
};

export const deleteWhileTypingTime = (event: any, timeString: string) => {
  const { selectionStart, selectionEnd } = event.target;
  let value = event.target.value;
  const selectionCharacter = value.at(selectionStart);
  const isColon = selectionCharacter === ":";
  const isDeleteAction = value.length < timeString.length;
  const characterCountHours = value.split(":")[0]?.length || 0;
  const oneCharacterStartHourPositionOne = selectionStart === 1 && characterCountHours <= 2;
  const oneCharacterStartHourPositionTwo = selectionStart === 2 && characterCountHours <= 2;
  let nextIndex = isColon && !isDeleteAction && !oneCharacterStartHourPositionTwo ? selectionStart + 1 : selectionStart;
  const singleSelection = selectionStart === selectionEnd;
  const hasColin = value.includes(":");

  if (!isDeleteAction && !oneCharacterStartHourPositionOne && !oneCharacterStartHourPositionTwo && singleSelection) {
    if (isColon) {
      value = value.replace(":", "");
      value = `${value.slice(0, selectionStart - 1)}:${value.slice(selectionStart - 1)}`;
    } else value = value.slice(0, nextIndex) + value.slice(nextIndex + 1);
  }
  if (!hasColin && value.length > 2) {
    nextIndex++;
    value = `${value.slice(0, 2)}:${value.slice(2)}`;
  }
  if ((!isDeleteAction && hasColin && value.split(":")[1]?.length > 2) || (!hasColin && value.length > 4))
    value = value.slice(0, value.length - 2) + value.slice(value.length - 1);
  return { value, nextIndex };
};

export const deleteWhileTypingDate = (event: any, dateString: string) => {
  const { selectionStart, selectionEnd } = event.target;
  let value = event.target.value;

  const sliceAtSelection = value.slice(0, selectionStart);
  const selectionCharacter = value.at(selectionStart);
  const isSpecialCharacter = selectionCharacter?.match(/[^\w]/g);
  const deletedBeforeSpecialCharacter = !!isSpecialCharacter && selectionStart === 1;
  const isDeleteAction = value.length < dateString.length;
  const singleSelection = selectionStart === selectionEnd;
  const characterArray = value.split(/[^\w]/g);
  const characterCounts = [4, 2, 2];
  const currentSection = sliceAtSelection.split(/[^\w]/g).length - 1;
  const sectionLength = characterArray[currentSection].length - 1;
  const underCharacterForSection = sectionLength < characterCounts[currentSection];
  const slicedAndSplit = sliceAtSelection.split(/[^\w]/g);
  const isOverCharacterLimitForSection =
    slicedAndSplit[slicedAndSplit.length - 1].length > characterCounts[currentSection];

  const nextIndex =
    (isSpecialCharacter && !isDeleteAction && !underCharacterForSection) || isOverCharacterLimitForSection
      ? selectionStart + 1
      : selectionStart;

  if (!isDeleteAction && !underCharacterForSection && !deletedBeforeSpecialCharacter && singleSelection) {
    if (isSpecialCharacter) value = value.slice(0, selectionStart) + value.slice(selectionStart + 2);
    if (isOverCharacterLimitForSection)
      value = `${value.slice(0, selectionStart - 1)}-${value.slice(selectionStart - 1)}`;
    else value = value.slice(0, selectionStart) + value.slice(selectionStart + 1);
  }
  if (value.replace(/[^0-9]/g, "").length > 8) value = value.slice(0, value.length - 3) + value.slice(value.length - 1);

  return { value, nextIndex };
};

export const dateForceTime = (date: DateOrDateTimeByNumbers, side: Side) => {
  const hour = date.hour !== undefined ? date.hour : side === Side.start ? 0 : 23;
  const minute = date.minute !== undefined ? date.minute : side === Side.start ? 0 : 59;

  // Create date in local timezone - browser converts to UTC via toISOString()
  // Backend receives UTC and interprets it correctly via astimezone(tz)
  return new Date(date.year, date.month, date.day, hour, minute);
};

export const dateWithoutTime = ({ day, month, year }: { day: number; month: number; year: number }) => {
  return { day, month, year };
};
