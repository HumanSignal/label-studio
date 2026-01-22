import { IconChevronLeft, IconChevronRight } from "@humansignal/icons";
import { Button } from "../button/button";
import { Typography } from "../typography/typography";
import { incrementMonthByDate, isSameMonth, monthMap } from "./date-utils";

type MonthCarouselProps = {
  month: number;
  year: number;
  changeMonth: ({ month, year }: { month: number; year: number }) => void;
  neighboringCalendar?: { month: number; year: number };
};

export const MonthCarousel = ({ month, year, changeMonth, neighboringCalendar }: MonthCarouselProps) => {
  const currentMonth = new Date();
  const calendarMonth = new Date(year, month);
  const nextCalendarMonth = incrementMonthByDate(calendarMonth, 1);
  const lastCalendarMonth = incrementMonthByDate(calendarMonth, -1);
  const neighboringCalendarMonth = neighboringCalendar && new Date(neighboringCalendar.year, neighboringCalendar.month);
  const handleChangeMonth = (newMonth: Date) =>
    changeMonth({ month: newMonth.getMonth(), year: newMonth.getFullYear() });

  return (
    <div className="flex justify-between items-center w-[280px] h-10">
      <Button
        look="string"
        data-testid="decrement-month"
        size="small"
        className="w-[32px]"
        leading={<IconChevronLeft />}
        disabled={neighboringCalendarMonth && isSameMonth(neighboringCalendarMonth, lastCalendarMonth)}
        onClick={() => handleChangeMonth(lastCalendarMonth)}
      />
      <Typography variant="body" size="medium" className="text-center" data-testid="month-label">
        {`${monthMap[month]} ${year}`}
      </Typography>
      <Button
        look="string"
        data-testid="increment-month"
        size="small"
        leading={<IconChevronRight />}
        className="w-[32px]"
        disabled={
          (neighboringCalendarMonth && isSameMonth(neighboringCalendarMonth, nextCalendarMonth)) ||
          isSameMonth(calendarMonth, currentMonth)
        }
        onClick={() => handleChangeMonth(nextCalendarMonth)}
      />
    </div>
  );
};
