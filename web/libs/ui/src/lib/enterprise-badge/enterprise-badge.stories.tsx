import type { Meta, StoryObj } from "@storybook/react";
import { EnterpriseBadge } from "./enterprise-badge";

const meta: Meta<typeof EnterpriseBadge> = {
  component: EnterpriseBadge,
  title: "UI/EnterpriseBadge",
  argTypes: {
    style: {
      control: "select",
      options: ["filled", "outline", "ghost", "solid"],
    },
    shape: {
      control: "select",
      options: ["rounded", "square"],
    },
    size: {
      control: "select",
      options: ["medium", "small"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof EnterpriseBadge>;

export const Default: Story = {
  args: {},
};

export const WithLabel: Story = {
  args: {
    children: "Enterprise",
    style: "filled",
  },
};

export const Ghost: Story = {
  args: {
    children: "Enterprise",
    style: "ghost",
  },
};

export const Outline: Story = {
  args: {
    children: "Enterprise",
    style: "outline",
  },
};

export const Solid: Story = {
  args: {
    children: "Enterprise",
    style: "solid",
  },
};

export const IconOnlyAndGhost: Story = {
  args: {
    children: "",
    style: "ghost",
  },
};

export const Small: Story = {
  args: {
    children: "Enterprise",
    size: "small",
  },
};

export const IconOnlySmall: Story = {
  args: {
    children: "",
    size: "small",
  },
};

export const Rounded: Story = {
  args: {
    children: "Enterprise",
    shape: "rounded",
  },
};

export const CustomLabel: Story = {
  args: {
    children: "Custom label",
    icon: null,
  },
};

export const AllStyles: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3 items-center">
      <EnterpriseBadge>Enterprise</EnterpriseBadge>
      <EnterpriseBadge style="outline">Enterprise</EnterpriseBadge>
      <EnterpriseBadge style="ghost">Enterprise</EnterpriseBadge>
      <EnterpriseBadge style="solid">Enterprise</EnterpriseBadge>
    </div>
  ),
};
