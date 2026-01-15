import type { Meta, StoryObj } from "@storybook/react";
import { EnterpriseBadge } from "./enterprise-badge";

const meta: Meta<typeof EnterpriseBadge> = {
  component: EnterpriseBadge,
  title: "UI/EnterpriseBadge",
  argTypes: {
    filled: { control: "boolean" },
    compact: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof EnterpriseBadge>;

export const Default: Story = {
  args: {},
};

export const Filled: Story = {
  args: {
    filled: true,
  },
};

export const Compact: Story = {
  args: {
    compact: true,
  },
};

export const CompactFilled: Story = {
  args: {
    compact: true,
    filled: true,
  },
};
