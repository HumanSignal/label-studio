import { format, isMatch, isValid } from "date-fns";
import { enUS, zhCN } from "date-fns/locale";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { default as DP } from "react-datepicker";
import { registerLocale } from "react-datepicker";
import i18next from "i18next";
import "react-datepicker/dist/react-datepicker.css";

registerLocale("ls-en", enUS);
registerLocale("ls-zh-cn", zhCN);

import { cn } from "../../../utils/bem";
import { isDefined } from "../../../utils/utils";
import { Dropdown } from "@humansignal/ui";
import Input from "../Input/Input";
import "./DatePicker.global.prefix.css";
import "./DatePicker.prefix.css";

export const DatePicker = ({
  size,
  value,
  selectRange = false,
  showTime = false,
  dateFormat = "MM.dd.yyyy",
  timeFormat = "HH:mm",
  onChange,
  disabled = false,
}) => {
  const finalFormat = showTime ? `${dateFormat} ${timeFormat}` : dateFormat;
  const currentLocale = i18next.language?.startsWith("zh") ? "ls-zh-cn" : "ls-en";

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
    if (disabled) return;
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
    if (disabled) return;
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
    <div className={cn("datepicker").mod({ disabled }).toClassName()}>
      <Dropdown.Trigger
        ref={dropdownRef}
        toggle={false}
        disabled={disabled}
        content={
          <div className={cn("datepicker").elem("wrapper").toClassName()}>
            <DP
              {...dateRange}
              ref={datepickerRef}
              selected={realStartDate}
              onChange={(date) => onChangeHandler(date)}
              onSelect={(date) => onChangeHandler(date)}
              monthsShown={2}
              selectsRange={selectRange}
              showTimeSelect={showTime}
              locale={currentLocale}
              inline
            />
          </div>
        }
        style={{ backgroundColor: "transparent", borderRadius: "1em" }}
      >
        <div className={cn("datepicker").elem("output").mod({ range: selectRange }).toClassName()}>
          <Input
            size={size}
            value={startDate || ""}
            disabled={disabled}
            onChange={(e) => updateDate(e.target.value, setStartDate, setRealStartDate)}
          />
          {selectRange && (
            <>
              <div className={cn("datepicker").elem("separator").toClassName()}>and</div>
              <Input
                size={size}
                value={endDate || ""}
                disabled={disabled}
                onChange={(e) => updateDate(e.target.value, setEndDate, setRealEndDate)}
              />
            </>
          )}
        </div>
      </Dropdown.Trigger>
    </div>
  );
};
