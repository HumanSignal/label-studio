import { IconChevronLeftSmall, IconChevronRightSmall } from "@humansignal/icons";
import { Button } from "../button/button";
import { incrementMonthByDate, isSameMonth, monthMap } from "./date-utils";
import styles from "./month-carousel.module.scss";

const buttonStyle = {
  width: 40,
  height: 40,
  boxShadow: "none",
  backgroundColor: "transparent",
  borderRadius: "24px",
  borderWidth: 0,
  borderStyle: "none",
};

type MonthCarouselProps = {
  month: number;
  year: number;
  changeMonth: ({ month, year }: { month: number; year: number }) => void;
  neighboringCalendar?: { month: number; year: number };
};

export const MonthCarousel = ({
  month,
  year,
  changeMonth,
  neighboringCalendar,
}: MonthCarouselProps) => {
  const currentMonth = new Date();
  const calendarMonth = new Date(year, month);
  const nextCalendarMonth = incrementMonthByDate(calendarMonth, 1);
  const lastCalendarMonth = incrementMonthByDate(calendarMonth, -1);
  const neighboringCalendarMonth = neighboringCalendar && new Date(neighboringCalendar.year, neighboringCalendar.month);
  const handleChangeMonth = (newMonth: Date) =>
    changeMonth({ month: newMonth.getMonth(), year: newMonth.getFullYear() });

  return (
    <div className={styles.monthCarousel}>
      <Button
        look="outlined"
        data-testid="decrement-month"
        style={buttonStyle}
        size="small"
        leading={<IconChevronLeftSmall />}
        disabled={neighboringCalendarMonth && isSameMonth(neighboringCalendarMonth, lastCalendarMonth)}
        onClick={() => handleChangeMonth(lastCalendarMonth)}
      />
      <div className={styles.label} data-testid="month-label">{`${monthMap[month]} ${year}`}</div>
      <Button
        look="outlined"
        data-testid="increment-month"
        style={buttonStyle}
        size="small"
        leading={<IconChevronRightSmall />}
        disabled={
          (neighboringCalendarMonth && isSameMonth(neighboringCalendarMonth, nextCalendarMonth)) ||
          isSameMonth(calendarMonth, currentMonth)
        }
        onClick={() => handleChangeMonth(nextCalendarMonth)}
      />
    </div>
  );
};

