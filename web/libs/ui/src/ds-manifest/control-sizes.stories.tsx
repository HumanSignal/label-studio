import { ListIcon, SquaresFourIcon } from "@humansignal/icons";
import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "../lib/button/button";
import { Checkbox } from "../lib/checkbox/checkbox";
import { DateRangePicker } from "../lib/date-range-picker/date-range-picker";
import { DateRangePickerTrigger } from "../lib/date-range-picker/date-range-picker-trigger";
import { Input } from "../lib/input/input";
import { InputFile } from "../lib/InputFile/InputFile";
import { NumberInput } from "../lib/number-input/number-input";
import { SearchInput } from "../lib/search-input/search-input";
import { SegmentedControl } from "../lib/segmented-control/segmented-control";
import { Select } from "../lib/select/select";
import { Toggle } from "../lib/toggle/toggle";
import { Typography } from "../lib/typography/typography";
import { CONTROL_SIZE_NAMES, CONTROL_SIZES, type ControlSize } from "./control-sizes";

const meta: Meta = {
  title: "Design/Control sizes",
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "One size scale for every control that sits in a form row or a bar. A row uses one size; the size follows the surface the row is on.",
      },
    },
  },
};
export default meta;
type Story = StoryObj;

const VIEW_OPTIONS = [
  { value: "cards", label: <SquaresFourIcon />, tooltip: "Cards" },
  { value: "table", label: <ListIcon />, tooltip: "List" },
];
const MODE_OPTIONS = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
];
const DATES = { start: { year: 2026, month: 1, day: 5 }, end: { year: 2026, month: 1, day: 12 } };

const Row = ({ size }: { size: ControlSize }) => (
  <div className="flex flex-col gap-tight">
    <Typography variant="label" size="small">
      <code>{size}</code> · {CONTROL_SIZES.sizes[size].px}px
      {size === CONTROL_SIZES.default ? " · default" : ""}
    </Typography>
    <Typography variant="body" size="small" className="text-neutral-content-subtle">
      {CONTROL_SIZES.sizes[size].use_when}
    </Typography>
    <div className="flex flex-wrap items-center gap-tight" data-testid={`control-row-${size}`}>
      <Button size={size}>Button</Button>
      <div style={{ width: 120 }}>
        <Select size={size} placeholder="Select" options={["Apple", "Banana"] as any[]} />
      </div>
      <div style={{ width: 110 }}>
        <Input size={size} aria-label="Input" placeholder="Input" />
      </div>
      <div style={{ width: 96 }}>
        <NumberInput size={size} aria-label="Number" defaultValue={10} stepper="compact" />
      </div>
      <div style={{ width: 130 }}>
        <SearchInput size={size} aria-label="Search" placeholder="Search" />
      </div>
      <SegmentedControl size={size} selectedOption="day" options={MODE_OPTIONS} aria-label="Mode" />
      <SegmentedControl size={size} selectedOption="cards" options={VIEW_OPTIONS} aria-label="View" />
      <DateRangePickerTrigger size={size} selected={DATES}>
        <DateRangePicker initialDates={DATES} setAppliedDates={() => {}} />
      </DateRangePickerTrigger>
      <InputFile size={size} text="File" />
      <Checkbox ariaLabel="Checkbox" checked onChange={() => {}} />
      <Toggle aria-label="Toggle" checked onChange={() => {}} />
    </div>
  </div>
);

/** Every control at each size, on one row. Checkbox and Toggle have one size and centre in any row. */
export const AllControls: Story = {
  render: () => (
    <div className="flex flex-col gap-wide">
      <Typography variant="body" size="small">
        {CONTROL_SIZES.rule}
      </Typography>
      {CONTROL_SIZE_NAMES.map((size) => (
        <Row key={size} size={size} />
      ))}
      <div className="flex flex-col gap-tightest">
        <Typography variant="label" size="small">
          Never
        </Typography>
        {CONTROL_SIZES.never_when.map((never) => (
          <Typography key={never} variant="body" size="small" className="text-neutral-content-subtle">
            {never}
          </Typography>
        ))}
      </div>
    </div>
  ),
};
