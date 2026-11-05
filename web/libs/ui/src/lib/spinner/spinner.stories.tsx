import type { Meta, StoryObj } from "@storybook/react";
import { Spinner } from "./spinner";

const meta: Meta<typeof Spinner> = {
  component: Spinner,
  title: "UI/Spinner",
  argTypes: {
    size: { control: "number" },
    stopped: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof Spinner>;

export const Default: Story = {
  args: {},
};

export const Small: Story = {
  args: { size: 16 },
};

export const Stopped: Story = {
  args: { stopped: true },
};
