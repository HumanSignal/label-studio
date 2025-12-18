import { convertDateToNumbers, type DateOrDateTimeRange } from "./date-utils";

export type TimeRangeButton = {
  id: string;
  name: string;
  newRange: () => DateOrDateTimeRange;
};

enum TimeMeasurements {
  firstHour = 0,
  firstMinute = 0,
  firstDayOfWeek = 0,
  firstMonth = 0,
  lastHour = 23,
  lastMinute = 59,
  firstDayMonth = 1,
  oneWeekMinusToday = 6,
  oneWeek = 7,
  oneDay = 1,
  thirtyDaysAgo = 29, // Keep at 29 to maintain daily granularity (30 days total)
}

export const rangeSetters = (creationDate?: Date, includeTime = true): { [key: string]: TimeRangeButton } => {
  const rangeList: { [key: string]: TimeRangeButton } = {
    today: {
      id: "today",
      name: "Today",
      newRange: () => {
        const today = new Date();
        const todayByNumbers = convertDateToNumbers(today);

        return {
          start: {
            ...todayByNumbers,
            hour: includeTime ? TimeMeasurements.firstHour : undefined,
            minute: includeTime ? TimeMeasurements.firstMinute : undefined,
          },
          end: includeTime
            ? todayByNumbers
            : {
                ...todayByNumbers,
                hour: undefined,
                minute: undefined,
              },
        };
      },
    },
    yesterday: {
      id: "yesterday",
      name: "Yesterday",
      newRange: () => {
        const today = new Date();

        today.setDate(today.getDate() - TimeMeasurements.oneDay);
        const yesterday = convertDateToNumbers(today);

        return {
          start: {
            ...yesterday,
            hour: includeTime ? TimeMeasurements.firstHour : undefined,
            minute: includeTime ? TimeMeasurements.firstMinute : undefined,
          },
          end: {
            ...yesterday,
            hour: includeTime ? TimeMeasurements.lastHour : undefined,
            minute: includeTime ? TimeMeasurements.lastMinute : undefined,
          },
        };
      },
    },
    lastSeven: {
      id: "last_7_days",
      name: "Last 7 days",
      newRange: () => {
        const today = new Date();
        const todayValue = convertDateToNumbers(today);

        today.setDate(today.getDate() - TimeMeasurements.oneWeekMinusToday);
        const lastSevenDays = convertDateToNumbers(today);

        return {
          start: {
            ...lastSevenDays,
            hour: includeTime ? TimeMeasurements.firstHour : undefined,
            minute: includeTime ? TimeMeasurements.firstMinute : undefined,
          },
          end: {
            ...todayValue,
            hour: includeTime ? TimeMeasurements.lastHour : undefined,
            minute: includeTime ? TimeMeasurements.lastMinute : undefined,
          },
        };
      },
    },
    lastThirty: {
      id: "last_30_days",
      name: "Last 30 days",
      newRange: () => {
        const today = new Date();
        const todayValue = convertDateToNumbers(today);

        today.setDate(today.getDate() - TimeMeasurements.thirtyDaysAgo);
        const thirtyDaysAgo = convertDateToNumbers(today);

        return {
          start: {
            ...thirtyDaysAgo,
            hour: includeTime ? TimeMeasurements.firstHour : undefined,
            minute: includeTime ? TimeMeasurements.firstMinute : undefined,
          },
          end: {
            ...todayValue,
            hour: includeTime ? TimeMeasurements.lastHour : undefined,
            minute: includeTime ? TimeMeasurements.lastMinute : undefined,
          },
        };
      },
    },
    thisWeek: {
      id: "this_week",
      name: "This week",
      newRange: () => {
        const today = new Date();
        const day = today.getDay();
        const diff = today.getDate() - (day === TimeMeasurements.firstDayOfWeek ? TimeMeasurements.oneWeek : day);
        const endOfWeek = convertDateToNumbers(today);
        const beginningOfWeek = convertDateToNumbers(new Date(today.setDate(diff)));

        return {
          start: {
            ...beginningOfWeek,
            hour: includeTime ? TimeMeasurements.firstHour : undefined,
            minute: includeTime ? TimeMeasurements.firstMinute : undefined,
          },
          end: {
            ...endOfWeek,
            hour: includeTime ? TimeMeasurements.lastHour : undefined,
            minute: includeTime ? TimeMeasurements.lastMinute : undefined,
          },
        };
      },
    },
    thisMonth: {
      id: "this_month",
      name: "This month",
      newRange: () => {
        const today = new Date();
        const firstOfTheMonth = convertDateToNumbers(
          new Date(today.getFullYear(), today.getMonth(), TimeMeasurements.firstDayMonth),
        );
        const lastDayOfTheMonth = convertDateToNumbers(today);

        return {
          start: {
            ...firstOfTheMonth,
            hour: includeTime ? TimeMeasurements.firstHour : undefined,
            minute: includeTime ? TimeMeasurements.firstMinute : undefined,
          },
          end: {
            ...lastDayOfTheMonth,
            hour: includeTime ? TimeMeasurements.lastHour : undefined,
            minute: includeTime ? TimeMeasurements.lastMinute : undefined,
          },
        };
      },
    },
    thisYear: {
      id: "this_year",
      name: "This year",
      newRange: () => {
        const today = new Date();
        const firstOfTheYear = convertDateToNumbers(
          new Date(today.getFullYear(), TimeMeasurements.firstMonth, TimeMeasurements.firstDayMonth),
        );
        const lastDayOfTheMonth = convertDateToNumbers(today);

        return {
          start: {
            ...firstOfTheYear,
            hour: includeTime ? TimeMeasurements.firstHour : undefined,
            minute: includeTime ? TimeMeasurements.firstMinute : undefined,
          },
          end: {
            ...lastDayOfTheMonth,
            hour: includeTime ? TimeMeasurements.lastHour : undefined,
            minute: includeTime ? TimeMeasurements.lastMinute : undefined,
          },
        };
      },
    },
  };

  if (creationDate)
    rangeList.allTime = {
      id: "all_time",
      name: "All Time",
      newRange: () => {
        const today = new Date();
        const todayByNumbers = convertDateToNumbers(today);

        return {
          start: convertDateToNumbers(creationDate),
          end: todayByNumbers,
        };
      },
    };

  return rangeList;
};
