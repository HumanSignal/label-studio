import type { ReactNode, ComponentPropsWithoutRef } from "react";
import { DropdownTrigger } from "../dropdown/dropdown-trigger";
import { Typography } from "../typography/typography";
import { IconCalendar } from "@humansignal/icons";
import type { DateOrDateTimeRange } from "./date-utils";
import { formatDateString } from "./date-utils";
import { cnm } from "../../utils/utils";

type DateRangePickerTriggerProps = {
  /**
   * Selected date range or null for "Any time"
   */
  selected: DateOrDateTimeRange | null;
  /**
   * Content to render in the dropdown (typically DateRangePicker component)
   */
  children: ReactNode;
  /**
   * Optional function to customize the label display.
   * Receives the formatted date strings or null, and returns a ReactNode.
   * If not provided, uses default formatting.
   */
  formatLabel?: (dates: { fromString: string; toString: string } | null) => ReactNode;
} & Omit<ComponentPropsWithoutRef<typeof DropdownTrigger>, "children" | "content">;

const dateStrings = (dateRange: DateOrDateTimeRange | null): { fromString: string; toString: string } | null => {
  if (!dateRange) {
    return null;
  }

  // Check if both start and end exist and have required properties
  if (
    !dateRange.start ||
    !dateRange.end ||
    dateRange.start.day === undefined ||
    dateRange.start.month === undefined ||
    dateRange.start.year === undefined ||
    dateRange.end.day === undefined ||
    dateRange.end.month === undefined ||
    dateRange.end.year === undefined
  ) {
    return null;
  }

  try {
    return {
      fromString: formatDateString({
        date: dateRange.start,
        useTime: dateRange.start.hour !== undefined,
        showMeridian: true,
      }),
      toString: formatDateString({
        date: dateRange.end,
        useTime: dateRange.end.hour !== undefined,
        showMeridian: true,
      }),
    };
  } catch {
    return null;
  }
};

export const DateRangePickerTrigger = ({
  selected,
  children,
  formatLabel,
  disabled,
  dataTestId,
  inline = false,
  ...dropdownTriggerProps
}: DateRangePickerTriggerProps) => {
  const appliedDatesString = dateStrings(selected);

  const defaultLabel = appliedDatesString ? (
    <div className="flex items-center gap-tight">
      <Typography variant="body" size="small" className="text-neutral-content-subtler">
        {appliedDatesString.fromString}
      </Typography>
      <Typography variant="body" size="small" className="text-neutral-content-subtlest">
        to
      </Typography>
      <Typography variant="body" size="small" className="text-neutral-content-subtler">
        {appliedDatesString.toString}
      </Typography>
    </div>
  ) : (
    <Typography variant="body" size="small" className="text-neutral-content-subtler">
      Any time
    </Typography>
  );

  const label = formatLabel ? formatLabel(appliedDatesString) : defaultLabel;

  return (
    <DropdownTrigger {...dropdownTriggerProps} disabled={disabled} content={children} inline={inline}>
      <div
        className={cnm(
          "flex items-center gap-tight py-tight px-base h-10 border border-neutral-border rounded-smaller cursor-pointer",
          "hover:border-neutral-border-bold",
          disabled && "opacity-50 cursor-not-allowed",
        )}
        data-testid={dataTestId}
      >
        {label}
        <IconCalendar height={18} width={18} className="text-neutral-content-subtlest shrink-0" />
      </div>
    </DropdownTrigger>
  );
};
