import { useEffect, useRef, useState } from "react";
import { useDropdown } from "../dropdown";
import {
  calculateDisplayMonthsFromSelection,
  convertDateToNumbers,
  type DateOrDateTimeByNumbers,
  type DateOrDateTimeRange,
  type DateTimeRange,
  Field,
  fillTime,
  formatDateByNumbers,
  formatDateString,
  type FormDateValues,
  getNumberOfDaysBetweenDatesToDisplay,
  incrementMonth,
  normalizeSelection,
  removeTimeFromRange,
  type Selected,
  Side,
} from "./date-utils";
import { MonthCarousel } from "./month-carousel";
import { CalendarPicker } from "./calendar-picker";
import { Toggle } from "../toggle/toggle";
import { Button } from "../button/button";
import { Space } from "../space/space";
import { Sidebar } from "./sidebar";
import { DateTimeInput } from "./date-time-input";
import { Typography } from "../typography/typography";
import styles from "./date-range-picker.module.scss";

const today = new Date();
const month = today.getMonth();
const year = today.getFullYear();

type VisibleCalendars = {
  month: number;
  year: number;
};

const defaultValue: { start: VisibleCalendars; end: VisibleCalendars } = {
  start: incrementMonth({ month, year, changeValue: -1 }),
  end: {
    month,
    year,
  },
};

const todayNumbers = convertDateToNumbers(today);
const todayFormValues = formatDateByNumbers({
  start: todayNumbers,
  end: todayNumbers,
});

const dateInputIds = ["#start-input", "#end-input"];
let canApply = {
  [Side.start]: { [Field.date]: true, [Field.time]: true },
  [Side.end]: { [Field.date]: true, [Field.time]: true },
};

type DateRangePickerProps = {
  /**
   * Initial date range to display in the picker.
   * If the dates include `hour` and `minute` properties, time mode will be enabled by default.
   */
  initialDates: DateOrDateTimeRange;
  /**
   * Callback invoked when the user applies a date range selection.
   * @param selected - The selected date range (with or without time depending on time mode)
   * @param datesString - Formatted date strings for display purposes
   */
  setAppliedDates: (selected: DateOrDateTimeRange, datesString: { fromString: string; toString: string }) => void;
  /**
   * Optional creation date used to enable the "All Time" preset option in the sidebar.
   * When provided, an "All Time" button will appear that selects a range from the creation date to today.
   * This is useful for filtering data from when an entity (e.g., project, organization) was created.
   * @example
   * ```tsx
   * <DateRangePicker
   *   creationDate={new Date(project.created_at)}
   *   initialDates={dateRange}
   *   setAppliedDates={handleDates}
   * />
   * ```
   */
  creationDate?: Date;
  /**
   * Optional callback invoked when a floating range preset (e.g., "Last 7 days", "All Time") is selected.
   * This allows the parent component to track which preset is currently active.
   * @param key - The key of the selected preset (e.g., "lastSeven", "allTime"), or undefined if custom dates are selected
   */
  setFloatingNowRange?: (key: string | undefined) => void;
  /**
   * Optional key of the currently active floating range preset.
   * When provided, the corresponding preset button in the sidebar will be highlighted.
   */
  floatingRangeKey?: string;
  /**
   * Whether the picker is displayed in standalone mode (not inside a dropdown).
   * When `true`, a border will be applied to the picker container.
   * @default false
   */
  standalone?: boolean;
  /**
   * Optional callback invoked when the Clear button is clicked.
   * When provided, a Clear button will appear in the footer to set dates to null.
   */
  onClear?: () => void;
  /**
   * Whether there is currently a date selection (not null).
   * Used to enable/disable the Clear button.
   * @default true
   */
  hasSelection?: boolean;
};

export const DateRangePicker = ({
  creationDate,
  initialDates,
  setAppliedDates,
  setFloatingNowRange,
  floatingRangeKey: initialFloatingRangeKey,
  standalone = false,
  onClear,
  hasSelection = true,
}: DateRangePickerProps) => {
  const initialDatesWithTime = fillTime(initialDates);
  const initialFormDates = formatDateByNumbers(initialDatesWithTime);
  const [selectedDates, setSelectedDates] = useState<Selected>(initialDatesWithTime);
  const [visibleCalendars, setVisibleCalendars] = useState(
    initialDates ? calculateDisplayMonthsFromSelection(initialDatesWithTime) : defaultValue,
  );
  const [formValuesDate, setFormValuesDate] = useState<FormDateValues>(
    initialDates ? { ...initialFormDates } : todayFormValues,
  );
  const hasInitialTime = initialDates?.start.hour !== undefined;
  const [timeMode, setTimeMode] = useState<boolean>(hasInitialTime);
  const timeModeChanged = hasInitialTime !== timeMode;
  const dateChanged = JSON.stringify(initialFormDates) !== JSON.stringify(formValuesDate);
  const validDates = Object.values(canApply).every((side) => Object.values(side).every((field) => field));
  const [resetTime, setTimeReset] = useState<boolean>(false);
  const [startOrEnd, setStartOrEnd] = useState<0 | 1 | undefined>();
  const [floatingRangeKey, setFloatingRangeKey] = useState<string | undefined>(initialFloatingRangeKey);
  const dropdown = useDropdown();
  const inputsRef = useRef<HTMLDivElement>(null);

  const updateFocusToggle = (select?: 0 | 1) => {
    const inputs = dateInputIds.map((id) => inputsRef.current?.querySelector(id));

    const input = inputs?.[select === undefined ? 1 : select];

    (input as HTMLInputElement)?.focus();
  };

  const handleCalenderSelectionChange = (newSelected: DateOrDateTimeByNumbers, suppressFocusSwitch?: boolean) => {
    const selectionSelection = startOrEnd ? { end: newSelected } : { start: newSelected };
    const newSelectedState = { ...selectedDates, ...selectionSelection };
    const newSelectedNormalized = normalizeSelection(newSelectedState, newSelected, selectedDates);

    handleDateSelection(newSelectedNormalized);
    !suppressFocusSwitch && updateFocusToggle();
    setFloatingRangeKey(undefined);
  };

  const handleDateSelection = (range: DateOrDateTimeRange) => {
    setFormValuesDate({ ...formatDateByNumbers(range as DateTimeRange) });
    const mergedWithExisting = selectedDates
      ? {
          start: { ...selectedDates.start, ...range.start },
          end: { ...selectedDates.end, ...range.end },
        }
      : (range as Selected);

    setSelectedDates(mergedWithExisting);
    const selectedMonths = calculateDisplayMonthsFromSelection(range);

    setVisibleCalendars(selectedMonths);
  };

  const changeMonth = ({ month, year }: { month: number; year: number }, calendar: number) => {
    const changedCalendar = calendar === 0 ? { start: { month, year } } : { end: { month, year } };

    setVisibleCalendars({ ...visibleCalendars, ...changedCalendar });
  };

  const handleDateFromSidebar = (range: DateOrDateTimeRange, key: string) => {
    setStartOrEnd(0);
    handleDateSelection(range);
    setFloatingRangeKey(key);
  };

  const handleApply = () => {
    if (!selectedDates || !validDates) return;
    const { start: startDate, end: endDate } = selectedDates;
    const fromString = formatDateString({ date: startDate, useTime: timeMode, showMeridian: true });
    const toString = formatDateString({ date: endDate, useTime: timeMode, showMeridian: true });
    const selectedModeAdjusted = timeMode ? selectedDates : removeTimeFromRange(selectedDates);

    setAppliedDates(selectedModeAdjusted, { fromString, toString });
    setFloatingNowRange && setFloatingNowRange(floatingRangeKey);
    dropdown?.close();
  };

  const focusListener = () => {
    dateInputIds.forEach((id, index) => {
      const input = inputsRef.current?.querySelector(id);

      input?.addEventListener("focus", () => setStartOrEnd(index as 1 | 0));
    });
    setTimeout(() => updateFocusToggle(0), 30);
  };

  useEffect(() => {
    if (inputsRef.current && startOrEnd === undefined) {
      focusListener();
      return focusListener();
    }
  }, [inputsRef, startOrEnd]);

  const handleSetCanApply = (side: Side, field: Field, value: boolean) => {
    canApply = { ...canApply, [side]: { ...canApply[side], [field]: value } };
  };

  const { value: numberOfDaysValue, text: numberOfDaysText } = getNumberOfDaysBetweenDatesToDisplay(selectedDates);

  return (
    <div className={`${styles.datePickerCalendar} ${standalone ? styles.standalone : ""}`}>
      <div className={styles.top}>
        <div className={styles.sidebar}>
          <Sidebar
            floatingRangeKey={floatingRangeKey}
            creationDate={creationDate}
            setDates={handleDateFromSidebar}
            selectedDates={selectedDates}
          />
        </div>
        <div className={styles.mainContentWrapper}>
          <div className={styles.inputsWrapper} ref={inputsRef}>
            <DateTimeInput
              timeMode={timeMode}
              handleCalenderSelectionChange={handleCalenderSelectionChange}
              setFormValuesDate={setFormValuesDate}
              formValuesDate={formValuesDate}
              setSelectedDates={setSelectedDates}
              selectedDates={selectedDates}
              setCanApply={handleSetCanApply}
              resetTime={resetTime}
              setTimeReset={setTimeReset}
              side={Side.start}
            />
            <Typography variant="body" size="medium" className="text-neutral-content-subtler text-center">
              to
            </Typography>
            <DateTimeInput
              timeMode={timeMode}
              handleCalenderSelectionChange={handleCalenderSelectionChange}
              setFormValuesDate={setFormValuesDate}
              formValuesDate={formValuesDate}
              setSelectedDates={setSelectedDates}
              selectedDates={selectedDates}
              setCanApply={handleSetCanApply}
              resetTime={resetTime}
              setTimeReset={setTimeReset}
              side={Side.end}
            />
          </div>
          <div className={styles.calendarsWrapper}>
            <div className={styles.calendarContainer}>
              <MonthCarousel
                month={visibleCalendars.start.month}
                year={visibleCalendars.start.year}
                changeMonth={(props) => changeMonth(props, 0)}
                neighboringCalendar={visibleCalendars.end}
              />
              <CalendarPicker
                month={visibleCalendars.start.month}
                year={visibleCalendars.start.year}
                selectedDates={selectedDates}
                dayClickCallback={handleCalenderSelectionChange}
              />
            </div>
            <div className={styles.calendarContainer}>
              <MonthCarousel
                month={visibleCalendars.end.month}
                year={visibleCalendars.end.year}
                changeMonth={(props) => changeMonth(props, 1)}
                neighboringCalendar={visibleCalendars.start}
              />
              <CalendarPicker
                month={visibleCalendars.end.month}
                year={visibleCalendars.end.year}
                selectedDates={selectedDates}
                dayClickCallback={handleCalenderSelectionChange}
              />
            </div>
          </div>
        </div>
      </div>
      <div className={styles.footer}>
        <div className={styles.daysSelected} data-testid="days-selected">
          <Typography variant="body" size="medium">
            {numberOfDaysValue}
          </Typography>{" "}
          <Typography variant="body" size="medium" className="text-neutral-content-subtler">
            {numberOfDaysText}
          </Typography>
        </div>
        <Space align="end">
          <div className={styles.timeToggle}>
            <Toggle data-testid="time-toggle" checked={timeMode} onChange={() => setTimeMode(!timeMode)} />
            <Typography variant="body" size="medium">
              Include time
            </Typography>
          </div>
          {onClear && (
            <Button
              aria-label="Clear date selection"
              variant="negative"
              look="outlined"
              className="clear"
              disabled={!hasSelection}
              onClick={() => {
                onClear();
                dropdown?.close();
              }}
            >
              Clear
            </Button>
          )}
          <Button
            aria-label="Reset date"
            variant="negative"
            look="outlined"
            className="reset"
            disabled={!dateChanged}
            onClick={() => {
              setTimeReset(true);
              if (initialDates) handleDateSelection(initialDates);
              else {
                setSelectedDates(initialDates);
                setFormValuesDate(todayFormValues);
              }
            }}
          >
            Reset
          </Button>
          <Button aria-label="Close date picker" look="outlined" className="cancel" onClick={() => dropdown?.close()}>
            Cancel
          </Button>
          <Button
            aria-label="Apply date"
            className="apply"
            disabled={!((dateChanged || timeModeChanged) && validDates)}
            onClick={handleApply}
          >
            Apply Range
          </Button>
        </Space>
      </div>
    </div>
  );
};
