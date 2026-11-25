import { CalendarBlankIcon } from "@humansignal/icons";
import { useState, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { type ControlSize, controlIconWeight } from "../../ds-manifest/control-sizes";
import { cnm } from "../../utils/utils";
import { DropdownTrigger } from "../dropdown/dropdown-trigger";
import { Typography } from "../typography/typography";
import type { DateOrDateTimeRange } from "./date-utils";
import { formatDateString } from "./date-utils";

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
  /**
   * Optional class name applied to the clickable trigger surface.
   */
  className?: string;
  size?: ControlSize;
  /**
   * When true, the caller owns height/padding (e.g. FilterShell value trigger).
   * Decorative class names do not imply custom chrome.
   */
  ownChrome?: boolean;
  /**
   * Props spread onto the clickable trigger surface (same pattern as Select `triggerProps`).
   * Pass `id` here for FilterShell name-as-label / htmlFor wiring.
   */
  triggerProps?: ComponentPropsWithoutRef<"div">;
} & Omit<ComponentPropsWithoutRef<typeof DropdownTrigger>, "children" | "content" | "className" | "id">;

/** Height, padding and label size per control size: 40, 32, 24px, as Button, Select and Input. */
/** The control icon rule: text a text inset from the edge, the calendar a padding from it. */
const TRIGGER_SIZES: Record<ControlSize, { frame: string; text: "small" | "smaller"; icon: number }> = {
  medium: { frame: "h-1000 pl-base pr-tight gap-tight", text: "small", icon: 20 },
  small: { frame: "h-800 pl-tight pr-tight gap-tight", text: "small", icon: 16 },
  smaller: { frame: "h-600 pl-tight pr-tight gap-tighter", text: "smaller", icon: 12 },
};

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
  className,
  size = "medium",
  ownChrome = false,
  triggerProps,
  onToggle,
  ...dropdownTriggerProps
}: DateRangePickerTriggerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const appliedDatesString = dateStrings(selected);

  const defaultLabel = appliedDatesString ? (
    <div className="flex items-center gap-tight">
      <Typography variant="body" size={TRIGGER_SIZES[size].text} className="text-neutral-content-subtler">
        {appliedDatesString.fromString}
      </Typography>
      <Typography variant="body" size={TRIGGER_SIZES[size].text} className="text-neutral-content-subtlest">
        to
      </Typography>
      <Typography variant="body" size={TRIGGER_SIZES[size].text} className="text-neutral-content-subtler">
        {appliedDatesString.toString}
      </Typography>
    </div>
  ) : (
    <Typography variant="body" size={TRIGGER_SIZES[size].text} className="text-neutral-content-subtler">
      Any time
    </Typography>
  );

  const label = formatLabel ? formatLabel(appliedDatesString) : defaultLabel;

  return (
    <DropdownTrigger
      {...dropdownTriggerProps}
      disabled={disabled}
      content={children}
      inline={inline}
      onToggle={(open) => {
        setIsOpen(open);
        onToggle?.(open);
      }}
    >
      <div
        tabIndex={disabled ? undefined : 0}
        role="button"
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-disabled={disabled || undefined}
        className={cnm(
          "flex items-center cursor-pointer",
          ownChrome && "gap-tight",
          "hover:border-neutral-border-bold",
          // FilterShell supplies its own value-trigger chrome: shape, border and height. Leaving the
          // standalone border/radius utilities on would tie with `.filterShellValueTrigger` and, in a
          // build that loads Tailwind last, win over the flush-left / round-right pill shape.
          !ownChrome && "border border-neutral-border rounded-small box-border",
          !ownChrome && TRIGGER_SIZES[size].frame,
          disabled && "opacity-50 cursor-not-allowed",
          className,
        )}
        data-size={ownChrome ? undefined : size}
        data-testid={dataTestId}
        {...triggerProps}
      >
        <span className="min-w-0 truncate">{label}</span>
        <CalendarBlankIcon
          size={TRIGGER_SIZES[size].icon}
          weight={controlIconWeight(size)}
          className="text-neutral-content-subtlest shrink-0"
        />
      </div>
    </DropdownTrigger>
  );
};
