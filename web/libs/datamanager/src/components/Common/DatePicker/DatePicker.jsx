import { format, isMatch, isValid } from "date-fns";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { default as DP } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { cn } from "../../../utils/bem";
import { isDefined } from "../../../utils/utils";
import { Dropdown } from "@humansignal/ui";
import Input from "../Input/Input";
import "./DatePicker.global.scss";
import "./DatePicker.scss";

export const DatePicker = ({
  size,
  value,
  selectRange = false,
  showTime = false,
  dateFormat = "MM.dd.yyyy",
  timeFormat = "HH:mm",
  onChange,
}) => {
  const finalFormat = showTime ? `${dateFormat} ${timeFormat}` : dateFormat;

  /**@type {import("react").RefObject<DP>} */
  const datepickerRef = useRef();

  const dropdownRef = useRef();

  const formatDate = (date) => {
    if (!isDefined(date)) return "";

    const parsedDate = new Date(date === null ? Date.now() : date);

    if (isValid(parsedDate)) {
      return format(parsedDate, finalFormat);
    }

    return "";
  };

  const [initialStartDate, initialEndDate] = selectRange ? value : [].concat(value);

  const [realStartDate, setRealStartDate] = useState(initialStartDate ?? null);
  const [realEndDate, setRealEndDate] = useState(initialEndDate ?? null);

  const [startDate, setStartDate] = useState(formatDate(realStartDate));
  const [endDate, setEndDate] = useState(formatDate(realEndDate));

  const updateDate = (date, dateSetter, realDateSetter) => {
    if (date.length > finalFormat.length) return;

    dateSetter?.(date);

    if (isDefined(date) && isMatch(date, finalFormat) && date.length === finalFormat.length) {
      const realDate = new Date(date || null);

      if (isValid(realDate)) realDateSetter?.(realDate);
    }
  };

  const dateRange = useMemo(
    () =>
      selectRange
        ? {
            startDate: realStartDate,
            endDate: realEndDate,
          }
        : {},
    [selectRange, realStartDate, realEndDate],
  );

  useEffect(() => {
    if (isValid(realStartDate)) setStartDate(formatDate(realStartDate));
  }, [realStartDate]);

  useEffect(() => {
    if (isValid(realEndDate)) setEndDate(formatDate(realEndDate));
  }, [realEndDate]);

  useEffect(() => {
    if (selectRange) {
      onChange?.([realStartDate, realEndDate]);
    } else if (realStartDate) {
      onChange?.(realStartDate);
    }
  }, [realStartDate, realEndDate]);

  const onChangeHandler = useCallback((date) => {
    if (realStartDate !== null && realEndDate === null && selectRange) {
      setRealEndDate(date);
      dropdownRef.current?.close();
    } else {
      setRealStartDate(date);
      if (selectRange) {
        setRealEndDate(null);
      } else {
        dropdownRef.current?.close();
      }
    }
  });

  return (
    <div className={cn("datepicker")}>
      <Dropdown.Trigger
        ref={dropdownRef}
        toggle={false}
        content={
          <div className={cn("datepicker").elem("wrapper")}>
            <DP
              {...dateRange}
              ref={datepickerRef}
              selected={realStartDate}
              onChange={(date) => onChangeHandler(date)}
              onSelect={(date) => onChangeHandler(date)}
              monthsShown={2}
              selectsRange={selectRange}
              showTimeSelect={showTime}
              inline
            />
          </div>
        }
        style={{ backgroundColor: "transparent", borderRadius: "1em" }}
      >
        <div className={cn("datepicker").elem("output").mod({ range: selectRange })}>
          <Input
            size={size}
            value={startDate || ""}
            onChange={(e) => updateDate(e.target.value, setStartDate, setRealStartDate)}
          />
          {selectRange && (
            <>
              <div className={cn("datepicker").elem("separator")}>and</div>
              <Input
                size={size}
                value={endDate || ""}
                onChange={(e) => updateDate(e.target.value, setEndDate, setRealEndDate)}
              />
            </>
          )}
        </div>
      </Dropdown.Trigger>
    </div>
  );
};
