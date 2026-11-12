import type { Meta, StoryObj } from "@storybook/react";
import { SPINNER_SIZES, Spinner } from "./spinner";

const meta: Meta<typeof Spinner> = {
  component: Spinner,
  title: "UI/Spinner",
  argTypes: {
    size: { control: "select", options: Object.keys(SPINNER_SIZES), table: { defaultValue: { summary: "medium" } } },
    stopped: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof Spinner>;

export const Default: Story = {
  args: {},
};

export const Small: Story = {
  args: { size: "smaller" },
};

export const Stopped: Story = {
  args: { stopped: true },
};
