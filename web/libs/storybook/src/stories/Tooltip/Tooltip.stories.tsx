import type { Meta, StoryObj } from "@storybook/react";
import { Tooltip } from "../../components/Tooltip/Tooltip";

const meta: Meta<typeof Tooltip> = {
  component: Tooltip,
  tags: ["autodocs"],
  argTypes: {
    onChange: {
      control: false,
    },
    value: {
      control: false,
    },
    format: {
      control: {
        type: "select",
      },
    },
    validate: {
      control: false,
    },
  },
};

export default meta;
type Story = StoryObj<typeof Tooltip>;

export const Default: Story = {
  argTypes: meta.argTypes,
};
