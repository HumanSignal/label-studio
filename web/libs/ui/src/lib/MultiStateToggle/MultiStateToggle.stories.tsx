import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { MultiStateToggle, type MultiStateToggleOption } from "./MultiStateToggle";

const meta: Meta<typeof MultiStateToggle> = {
  component: MultiStateToggle,
  title: "UI/MultiStateToggle",
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
type Story = StoryObj<typeof MultiStateToggle>;

const PROMPT_OPTIONS: MultiStateToggleOption[] = [
  { value: "points", label: "Points" },
  { value: "box", label: "Box" },
];

function Controlled({ options }: { options: MultiStateToggleOption[] }) {
  const [value, setValue] = useState(options[0]?.value ?? "");
  return <MultiStateToggle selectedOption={value} options={options} onChange={setValue} />;
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
