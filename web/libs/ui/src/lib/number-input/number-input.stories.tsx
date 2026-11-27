import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { NumberInput } from "./number-input";

const meta: Meta<typeof NumberInput> = {
  title: "Inputs/NumberInput",
  component: NumberInput,
  args: { "aria-label": "Annotations per task", defaultValue: 3, min: 1, max: 20 },
  argTypes: {
    stepper: { control: "inline-radio", options: ["side", "compact", "none"] },
    size: { control: "inline-radio", options: ["medium", "small", "smaller"] },
  },
};
export default meta;
type Story = StoryObj<typeof NumberInput>;

const width = (Story: () => React.ReactNode) => <div style={{ width: 200 }}>{Story()}</div>;

export const Default: Story = { decorators: [width] };

/** Side buttons are the default: larger targets. Compact is for tight layouts. */
export const Steppers: Story = {
  render: () => (
    <div className="flex flex-col gap-base" style={{ width: 220 }}>
      <NumberInput aria-label="Side" defaultValue={3} min={0} />
      <NumberInput aria-label="Compact" defaultValue={15} min={0} unit="minutes" stepper="compact" />
      <NumberInput aria-label="None" defaultValue={0.25} step={0.05} precision={2} unit="$" stepper="none" />
    </div>
  ),
};

/** One column per size, each with both steppers and a unit, so the right-hand elements line up. */
export const Sizes: Story = {
  render: () => (
    <div className="flex gap-wide">
      {(["medium", "small", "smaller"] as const).map((size) => (
        <div key={size} className="flex flex-col gap-base" style={{ width: 180 }}>
          <NumberInput aria-label={`${size}, side`} size={size} defaultValue={10} />
          <NumberInput aria-label={`${size}, compact`} size={size} defaultValue={10} stepper="compact" />
          <NumberInput aria-label={`${size}, unit`} size={size} defaultValue={10} unit="%" stepper="none" />
        </div>
      ))}
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <div className="flex flex-col gap-base" style={{ width: 260 }}>
      <NumberInput label="Overlap" unit="%" defaultValue={140} min={0} max={100} error="Cannot exceed 100" />
      <NumberInput label="Disabled" defaultValue={1} disabled />
      <NumberInput label="Read-only" defaultValue={5} readOnly />
    </div>
  ),
};

export const Controlled: Story = {
  render: function ControlledNumber() {
    const [value, setValue] = useState<number | null>(20);
    return (
      <div className="flex flex-col gap-tight" style={{ width: 220 }}>
        <NumberInput aria-label="Skips" value={value} onValueChange={setValue} min={0} max={50} />
        <span>Value: {value === null ? "empty" : value}</span>
      </div>
    );
  },
};
