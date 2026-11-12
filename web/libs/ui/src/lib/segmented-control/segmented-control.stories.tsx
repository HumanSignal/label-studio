import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { SegmentedControl, type SegmentedControlOption } from "./segmented-control";

const meta: Meta<typeof SegmentedControl> = {
  component: SegmentedControl,
  title: "UI/SegmentedControl",
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

function Controlled({ options }: { options: SegmentedControlOption[] }) {
  const [value, setValue] = useState(options[0]?.value ?? "");
  return <SegmentedControl selectedOption={value} options={options} onChange={setValue} />;
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
