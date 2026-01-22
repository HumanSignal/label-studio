import { createRef, memo, useEffect, useState } from "react";
import {
  type DateOrDateTimeByNumbers,
  type DateOrDateTimeRange,
  type Day,
  dayLabels,
  getAllDaysInMonth,
  mapSelected,
  type SelectedMap,
} from "./date-utils";
import styles from "./calendar-picker.module.scss";
import clsx from "clsx";

type CalendarPickerProps = {
  month: number;
  year: number;
  selectedDates?: DateOrDateTimeRange;
  dayClickCallback?: ({ day, month, year }: DateOrDateTimeByNumbers) => void;
};

export const CalendarPicker = memo(({ month, year, selectedDates, dayClickCallback }: CalendarPickerProps) => {
  const [calendarDates, setCalendarDates] = useState<Day[][]>();
  const [selectedDatesMap, setSelectedDatesMap] = useState<SelectedMap[][] | undefined>();
  const today = new Date();
  const dateToday = new Date().getDate();
  const currentMonth = month === today.getMonth() && year === today.getFullYear();
  const calendarRef = createRef<HTMLDivElement>();

  useEffect(() => {
    setCalendarDates(getAllDaysInMonth(month, year));
  }, [month, year, selectedDates]);

  useEffect(() => {
    if (calendarDates && selectedDates) setSelectedDatesMap(mapSelected(selectedDates, calendarDates, month, year));
    else setSelectedDatesMap(undefined);
  }, [calendarDates, selectedDates, month, year]);

  useEffect(() => {
    calendarRef.current?.addEventListener("click", handleDayClick);
    return () => {
      calendarRef.current?.removeEventListener("click", handleDayClick);
    };
  }, [calendarRef]);

  const handleDayClick = (e: { target: any }) => {
    if (e.target.id === "month_wrapper" || e.target.querySelectorAll("div").length > 1) return;

    const day = Number.parseInt(e.target.textContent);

    day && dayClickCallback && dayClickCallback({ day, month, year });
  };

  const DayLabels = () => (
    <div className={styles.daysWeek}>
      {dayLabels.map((day, index) => (
        <div key={`label-${month}-${day}-${index}`} className={styles.labels}>
          {day}
        </div>
      ))}
    </div>
  );

  const Week = ({ week, weekIndex }: { week: Day[]; weekIndex: number }) => (
    <>
      {week.map((day, dayIndex) => {
        const { selectionStart, selectionEnd, selected } = selectedDatesMap?.[weekIndex]?.[dayIndex] ?? {};

        const futureDate = !!(currentMonth && day && day > dateToday);
        const isToday = !!(currentMonth && day === dateToday);
        const firstDaySelectedMonth = day && selected && !calendarDates?.[weekIndex]?.[dayIndex - 1];
        const lastDaySelectedMonth = day && selected && !calendarDates?.[weekIndex]?.[dayIndex + 1];
        const roundWeekStart = day && selected && dayIndex === 0;
        const roundWeekEnd = day && selected && dayIndex === 6;

        return (
          <div
            key={`${month}-${day ?? `null${dayIndex}`}`}
            className={clsx(styles.day, {
              [styles.rangeStart]: selectionStart || roundWeekStart || firstDaySelectedMonth,
              [styles.rangeEnd]: selectionEnd || roundWeekEnd || lastDaySelectedMonth,
              [styles.inRange]: day && selected,
              [styles.disabled]: futureDate,
            })}
          >
            <div
              className={clsx(styles.highlight, {
                [styles.today]: isToday,
                [styles.inRange]: day && selected,
                [styles.disabled]: futureDate || !day,
                [styles.selected]: selectionStart || selectionEnd,
              })}
            >
              {day}
            </div>
          </div>
        );
      })}
    </>
  );

  const Calendar = () => (
    <div id="month_wrapper" ref={calendarRef} className={styles.monthWrapper}>
      {calendarDates &&
        calendarDates.map((week, index) => (
          <div key={`${week}-${month}`} className={styles.week}>
            <Week week={week} weekIndex={index} />
          </div>
        ))}
    </div>
  );

  return (
    <div className={styles.monthCalendar}>
      <DayLabels />
      <Calendar />
    </div>
  );
});
