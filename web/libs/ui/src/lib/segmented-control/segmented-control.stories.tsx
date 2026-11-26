import type { Meta, StoryObj } from "@storybook/react";
import { ListIcon, SquaresFourIcon } from "@humansignal/icons";
import { useState } from "react";
import { SegmentedControl, type SegmentedControlOption } from "./segmented-control";

const meta: Meta<typeof SegmentedControl> = {
  component: SegmentedControl,
  title: "Inputs/SegmentedControl",
  parameters: {
    docs: {
      description: {
        component:
          "Segmented control for switching between a small set of mutually-exclusive options. All options are always visible; the selected one is highlighted.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof SegmentedControl>;

const PROMPT_OPTIONS: SegmentedControlOption[] = [
  { value: "points", label: "Points" },
  { value: "box", label: "Box" },
];

function Controlled({ options, size }: { options: SegmentedControlOption[]; size?: "medium" | "small" | "smaller" }) {
  const [value, setValue] = useState(options[0]?.value ?? "");
  return <SegmentedControl selectedOption={value} options={options} onChange={setValue} size={size} />;
}

export const TwoOptions: Story = {
  render: () => <Controlled options={PROMPT_OPTIONS} />,
};

export const ThreeOptions: Story = {
  render: () => (
    <Controlled
      options={[
        { value: "day", label: "Day" },
        { value: "week", label: "Week" },
        { value: "month", label: "Month" },
      ]}
    />
  ),
};

/** An option can be unavailable on its own; the arrow keys skip it. */
export const DisabledOption: Story = {
  render: () => (
    <Controlled
      options={[
        { value: "day", label: "Day" },
        { value: "week", label: "Week", disabled: true },
        { value: "month", label: "Month" },
      ]}
    />
  ),
};

/** Icon-only options take a `tooltip`, which is also their accessible name. */
export const IconOptions: Story = {
  render: () => (
    <Controlled
      options={[
        { value: "cards", label: <SquaresFourIcon />, tooltip: "Switch to Cards View" },
        { value: "table", label: <ListIcon />, tooltip: "Switch to List View" },
      ]}
    />
  ),
};

const ICON_OPTIONS: SegmentedControlOption[] = [
  { value: "cards", label: <SquaresFourIcon />, tooltip: "Switch to Cards View" },
  { value: "table", label: <ListIcon />, tooltip: "Switch to List View" },
];

/**
 * `medium` 40px, `small` 32px, `smaller` 24px: the same heights as every other control. The height
 * comes from the size alone, so a control with icon-only options is as tall as one with text.
 */
export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col gap-base">
      {(["medium", "small", "smaller"] as const).map((size) => (
        <div key={size} className="flex items-center gap-base">
          <Controlled size={size} options={PROMPT_OPTIONS} />
          <Controlled size={size} options={ICON_OPTIONS} />
        </div>
      ))}
    </div>
  ),
};
