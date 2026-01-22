import { useEffect, useRef, useState } from "react";
import { useStateWithCallback } from "./use-state-with-callback";
import { Button, ButtonGroup } from "../button/button";
import { Typography } from "../typography/typography";
import {
  convertTo24HrTimeFromString,
  type DateTimeByNumbers,
  deleteWhileTypingDate,
  deleteWhileTypingTime,
  Field,
  findMeridian,
  forceFourDigitsWithColinTime,
  type FormDateValues,
  inputWithMask,
  isTwelveHour,
  isValidDate,
  isValidTime,
  Meridian,
  type Selected,
  Side,
} from "./date-utils";
import styles from "./date-time-input.module.scss";
import clsx from "clsx";

type SimpleInputProps = {
  id?: string;
  "data-testid"?: string;
  className?: string;
  value?: string;
  defaultValue?: string;
  error?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  suppressValueTracker?: boolean;
};

const SimpleInput = ({ className, error, ...props }: SimpleInputProps) => {
  return <input {...props} className={clsx(styles.inputField, className, { [styles.error]: error })} type="text" />;
};

type DateTimeInputProps = {
  timeMode: boolean;
  handleCalenderSelectionChange: (newSelected: DateTimeByNumbers, suppressFocus: boolean) => void;
  setFormValuesDate: (range: FormDateValues) => void;
  formValuesDate: FormDateValues;
  setSelectedDates: (range: Selected) => void;
  setCanApply: (side: Side, field: Field, value: boolean) => void;
  selectedDates: Selected;
  resetTime: boolean;
  setTimeReset: (argument: boolean) => void;
  side: Side;
};

export const DateTimeInput = ({
  timeMode,
  handleCalenderSelectionChange,
  setFormValuesDate,
  formValuesDate,
  setSelectedDates,
  setCanApply,
  selectedDates,
  resetTime,
  setTimeReset,
  side,
}: DateTimeInputProps) => {
  const valueSet = side === Side.start ? formValuesDate?.start : formValuesDate?.end;
  const { date } = valueSet;
  const [dateString, setDateString] = useStateWithCallback(date);
  const [timeString, setTimeString] = useStateWithCallback(formValuesDate[side].time);
  const [validDate, setValidDate] = useState(true);
  const [validTime, setValidTime] = useState(true);
  const [focusTracker, setFocusTracker] = useState({ [Field.date]: false, [Field.time]: false });
  const [meridiem, setMeridiem] = useState(
    formValuesDate?.[side]?.meridiem || findMeridian(selectedDates?.[side].hour),
  );

  const inputContainer = useRef<HTMLDivElement>(null);

  const dateInputUpdate = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, nextIndex } = deleteWhileTypingDate(e, dateString);

    setFocusTracker({ ...focusTracker, [Field.date]: true });
    setDateString(value, () => {
      if (e.target) {
        e.target.setSelectionRange(nextIndex, nextIndex);
      }
    });

    const validDate = isValidDate(String(e?.target?.value || ""));

    if (validDate) {
      const { day, month, year } = validDate;
      const timeArray = timeString.split(":").map((time) => Number.parseInt(time));

      setValidDate(true);
      handleCalenderSelectionChange(
        {
          day,
          month: month - 1,
          year,
          hour: validTime ? timeArray[0] : 0,
          minute: validTime ? timeArray[1] : 0,
        },
        true,
      );
    } else {
      setValidDate(false);
    }
  };

  const timeInputUpdate = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, nextIndex } = deleteWhileTypingTime(e, timeString);

    setFocusTracker({ ...focusTracker, [Field.time]: true });
    const isValid = isValidTime(value);
    const meridianAdjusted = convertTo24HrTimeFromString(value, meridiem);
    const convertedTime = isTwelveHour
      ? meridianAdjusted
      : value.split(":").map((time: string) => Number.parseInt(time));

    setValidTime(isValid);
    setTimeString(value, () => {
      if (e.target) {
        e.target.setSelectionRange(nextIndex, nextIndex);
      }
    });

    if (isValid) {
      selectedDates &&
        setSelectedDates({
          ...selectedDates,
          [side]: {
            ...selectedDates[side],
            hour: convertedTime[0],
            minute: convertedTime[1],
          },
        });
      setFormValuesDate({
        ...formValuesDate,
        [side]: {
          ...formValuesDate[side],
          time: value,
          meridiem,
        },
      });
    } else {
      setValidTime(false);
    }
  };

  const handleSetMeridiem = (newMeridiem: Meridian) => {
    const meridianAdjusted = convertTo24HrTimeFromString(timeString, newMeridiem);

    setMeridiem(newMeridiem);
    setFormValuesDate({
      ...formValuesDate,
      [side]: {
        ...formValuesDate[side],
        meridiem: newMeridiem,
      },
    });
    selectedDates &&
      setSelectedDates({
        ...selectedDates,
        [side]: {
          ...selectedDates[side],
          hour: meridianAdjusted[0],
          minute: meridianAdjusted[1],
        },
      });
  };

  const resetOnFocusOut = (event: FocusEvent, field: Field) => {
    const target = event.target as HTMLInputElement;
    const timeMasked = forceFourDigitsWithColinTime(target?.value || "");
    const dateMasked = inputWithMask(target?.value || "");
    const valid = field === Field.date ? isValidDate(String(dateMasked)) : isValidTime(timeMasked);

    if (field === Field.date) {
      setValidDate(!!valid);
      setDateString(dateMasked);
    } else {
      setValidTime(!!valid);
      setTimeString(timeMasked);
    }

    setCanApply(side, field, !!valid);
    setFocusTracker({ ...focusTracker, [field]: false });
  };

  useEffect(() => {
    setDateString(date);
  }, [date]);

  useEffect(() => {
    if (isValidDate(formValuesDate?.[side].date)) setValidDate(true);
    setTimeString(formValuesDate?.[side].time);
    setMeridiem(formValuesDate?.[side]?.meridiem || findMeridian(selectedDates?.[side].hour));
  }, [formValuesDate?.[side], selectedDates, side]);

  useEffect(() => {
    if (resetTime) {
      setTimeReset(false);
      setValidTime(true);
      setMeridiem(formValuesDate?.[side]?.meridiem || findMeridian(selectedDates?.[side].hour));
      setTimeString(formValuesDate?.[side].time);
    }
  }, [resetTime, formValuesDate, selectedDates, side, setTimeReset]);

  useEffect(() => {
    const startInput = inputContainer.current?.querySelector(`#${side}-input`);
    const timeInput = inputContainer.current?.querySelector(`#${side}-time-input`);

    if (startInput) {
      startInput.addEventListener("focusout", (e) => resetOnFocusOut(e as FocusEvent, Field.date));
    }
    if (timeInput) {
      timeInput.addEventListener("focusout", (e) => resetOnFocusOut(e as FocusEvent, Field.time));
    }

    return () => {
      if (startInput) {
        startInput.removeEventListener("focusout", (e) => resetOnFocusOut(e as FocusEvent, Field.date));
      }
      if (timeInput) {
        timeInput.removeEventListener("focusout", (e) => resetOnFocusOut(e as FocusEvent, Field.time));
      }
    };
  }, [side]);

  const invalidDateOutOfFocus = !validDate && !focusTracker[Field.date];
  const invalidTimeOutOfFocus = !validTime && !focusTracker[Field.time];
  const bothInvalid = invalidDateOutOfFocus && invalidTimeOutOfFocus;

  return (
    <div ref={inputContainer} className={styles.inputContainer}>
      <div className={clsx(styles.validationSwitcher, { [styles.invalid]: invalidDateOutOfFocus })}>
        <SimpleInput
          data-testid="date-input"
          id={`${side}-input`}
          className={styles.dateInput}
          error={invalidDateOutOfFocus}
          value={dateString}
          onChange={dateInputUpdate}
        />
        {invalidDateOutOfFocus && !bothInvalid && (
          <Typography variant="body" size="smaller" className={styles.errorText}>
            Select or enter a valid {side} date.
          </Typography>
        )}
        {bothInvalid && (
          <Typography variant="body" size="smaller" className={styles.errorText}>
            Select or enter a valid {side} date and time.
          </Typography>
        )}
      </div>
      {timeMode && (
        <>
          <div className={clsx(styles.validationSwitcher, { [styles.invalid]: invalidTimeOutOfFocus })}>
            <SimpleInput
              id={`${side}-time-input`}
              data-testid="time-input"
              error={invalidTimeOutOfFocus}
              value={timeString}
              onChange={timeInputUpdate}
              className={styles.timeInput}
            />
            {invalidTimeOutOfFocus && !bothInvalid && (
              <Typography variant="body" size="smaller" className={styles.errorText}>
                Enter a valid time.
              </Typography>
            )}
          </div>

          {isTwelveHour && (
            <ButtonGroup>
              <Button
                look={meridiem === Meridian.am ? "filled" : "outlined"}
                variant="neutral"
                className={clsx(styles.meridiemButton, { [styles.selected]: meridiem === Meridian.am })}
                onClick={() => handleSetMeridiem(Meridian.am)}
              >
                {Meridian.am}
              </Button>
              <Button
                look={meridiem === Meridian.pm ? "filled" : "outlined"}
                variant="neutral"
                className={clsx(styles.meridiemButton, { [styles.selected]: meridiem === Meridian.pm })}
                onClick={() => handleSetMeridiem(Meridian.pm)}
              >
                {Meridian.pm}
              </Button>
            </ButtonGroup>
          )}
        </>
      )}
    </div>
  );
};
